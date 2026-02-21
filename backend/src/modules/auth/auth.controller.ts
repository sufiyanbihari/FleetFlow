import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { IsEmail, IsString, MinLength } from 'class-validator';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { Public } from '../../common/decorators/public.decorator';
import { UserRole } from '../../common/enums/user-role.enum';

class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /** POST /auth/login — issues access + refresh tokens */
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: LoginDto, @Req() req: Request) {
    const meta = {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    };
    return this.authService.login(body.email, body.password, meta);
  }

  /** POST /auth/refresh — rotates refresh token, issues new pair */
  @UseGuards(AuthGuard('jwt-refresh'))
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req()
    req: Request & {
      user: { id: string; role: UserRole; refreshToken: string };
    },
  ) {
    return this.authService.refresh(req.user.id, req.user.refreshToken);
  }

  /** POST /auth/logout — clears refresh token hash */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: Request & { user?: { id?: string } }) {
    if (req.user?.id) {
      await this.authService.logout(req.user.id);
    }
    return { message: 'Logged out successfully' };
  }

  /**
   * GET /auth/me — returns the authenticated user's identity.
   * Never exposes the hierarchy map or permission list.
   */
  @Get('me')
  getProfile(
    @Req() req: Request & { user?: { id?: string; role?: UserRole } },
  ) {
    if (!req.user?.id || !req.user.role) {
      return { id: null, role: null };
    }
    return { id: req.user.id, role: req.user.role };
  }
}
