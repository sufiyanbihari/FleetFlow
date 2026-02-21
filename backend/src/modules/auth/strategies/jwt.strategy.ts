import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';
import { JwtPayload } from '../auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
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
