import { Injectable, ForbiddenException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { UsersService } from '../../users/users.service';
import { JwtPayload } from '../auth.service';

// Extracts the refresh token from HttpOnly cookies, falling back to Authorization header.
const refreshTokenExtractor = (req: Request): string | null => {
  const rawCookie = req.headers?.cookie;
  if (!rawCookie) return null;

  const tokenCookie = rawCookie
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith('refresh_token='));

  if (!tokenCookie) return null;
  const [, value] = tokenCookie.split('=');
  return value ? decodeURIComponent(value) : null;
};

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(
    configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        refreshTokenExtractor,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey:
        configService.get<string>('JWT_REFRESH_SECRET') ??
        'fallback-refresh-secret',
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: JwtPayload) {
    const refreshToken =
      refreshTokenExtractor(req) ?? req.headers.authorization?.split(' ')[1];
    if (!refreshToken) throw new ForbiddenException('Refresh token missing');
    const user = await this.usersService.findById(payload.sub);
    if (!user?.refreshTokenHash)
      throw new ForbiddenException('No active session');
    return { id: user.id, role: user.role, email: user.email, refreshToken };
  }
}
