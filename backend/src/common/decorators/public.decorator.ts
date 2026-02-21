import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Apply this to any route handler or controller to skip JwtAuthGuard.
 * Example: @Public() on POST /auth/login
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
