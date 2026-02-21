import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { UsersService } from '../../users/users.service';
import { JwtPayload } from '../auth.service';

// Extracts the access token from HttpOnly cookies, falling back to Authorization header.
const accessTokenExtractor = (req: Request): string | null => {
  const rawCookie = req.headers?.cookie;
  if (!rawCookie) return null;

  const tokenCookie = rawCookie
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith('access_token='));

  if (!tokenCookie) return null;
  const [, value] = tokenCookie.split('=');
  return value ? decodeURIComponent(value) : null;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        accessTokenExtractor,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey:
        configService.get<string>('JWT_SECRET') ?? 'fallback-dev-secret',
    });
  }

  async validate(payload: JwtPayload) {
    // Hydrate user from DB — ensures revoked users are blocked on next request
    const user = await this.usersService.findById(payload.sub);
    if (!user) return null; // returning null causes 401
    return { id: user.id, role: user.role, email: user.email };
  }
}
