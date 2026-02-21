import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { IoAdapter } from '@nestjs/platform-socket.io';
import helmet from 'helmet';
import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  // Enable CORS with strict origin verification (part of CSRF defense)
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  });

  // Security Headers
  app.use(helmet());

  // Input Size Limiting to prevent DoS via large payloads
  app.use(express.json({ limit: '100kb' }));
  app.use(express.urlencoded({ extended: true, limit: '100kb' }));

  app.enableShutdownHooks();

  // 1. Centralized Exception Handling
  app.useGlobalFilters(new GlobalExceptionFilter());

  // 3. Strict DTO Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Mount the Socket.IO handler over the standard express HTTP adapter
  app.useWebSocketAdapter(new IoAdapter(app));

  await app.listen(process.env.PORT ?? 5000);
}
bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
