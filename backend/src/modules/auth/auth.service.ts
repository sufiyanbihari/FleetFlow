import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UserRole } from '@prisma/client';
import { UsersService } from '../users/users.service';
import { AuditService } from '../audit/audit.service';

export interface JwtPayload {
  sub: string;
  role: UserRole;
  email: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
  ) {}

  // ─── Login ────────────────────────────────────────────────────────────────

  async login(
    email: string,
    password: string,
    meta: { ipAddress?: string; userAgent?: string },
  ): Promise<{ tokens: TokenPair; user: { id: string; role: UserRole } }> {
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      // Fire-and-forget audit — never block the response path
      void this.auditService.log({
        action: 'LOGIN_FAILED',
        resource: 'auth',
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        metadata: { reason: 'User not found', email },
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);

    if (!passwordMatch) {
      void this.auditService.log({
        userId: user.id,
        userRole: user.role,
        action: 'LOGIN_FAILED',
        resource: 'auth',
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        metadata: { reason: 'Password mismatch' },
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.issueTokenPair(user.id, user.role, user.email);

    void this.auditService.log({
      userId: user.id,
      userRole: user.role,
      action: 'LOGIN_SUCCESS',
      resource: 'auth',
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    this.logger.log(`User ${user.id} authenticated successfully`);
    return { tokens, user: { id: user.id, role: user.role } };
  }

  // ─── Refresh Token Rotation ──────────────────────────────────────────────

  async refresh(
    userId: string,
    incomingRefreshToken: string,
  ): Promise<TokenPair> {
    const user = await this.usersService.findById(userId);
    if (!user?.refreshTokenHash) {
      throw new ForbiddenException('Access denied — no active session');
    }

    const tokenMatch = await bcrypt.compare(
      incomingRefreshToken,
      user.refreshTokenHash,
    );
    if (!tokenMatch) {
      // Token reuse detected — clear session (force re-login)
      await this.usersService.updateRefreshTokenHash(userId, null);
      void this.auditService.log({
        userId,
        userRole: user.role,
        action: 'REFRESH_TOKEN_REUSE_DETECTED',
        resource: 'auth',
        metadata: { reason: 'Possible token theft — session cleared' },
      });
      throw new ForbiddenException(
        'Refresh token reuse detected — session terminated',
      );
    }

    const tokens = await this.issueTokenPair(user.id, user.role, user.email);
    return tokens;
  }

  // ─── Logout ─────────────────────────────────────────────────────────────────

  async logout(userId: string): Promise<void> {
    await this.usersService.updateRefreshTokenHash(userId, null);
    this.logger.log(`User ${userId} logged out — session cleared`);
  }

  // ─── Private: Issue + Store Token Pair ──────────────────────────────────────

  private async issueTokenPair(
    userId: string,
    role: UserRole,
    email: string,
  ): Promise<TokenPair> {
    const payload: JwtPayload = { sub: userId, role, email };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: '15m',
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: '7d',
      }),
    ]);

    // Store hashed refresh token — never store plaintext
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    await this.usersService.updateRefreshTokenHash(userId, refreshTokenHash);

    return { accessToken, refreshToken };
  }
}
