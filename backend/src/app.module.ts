import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { VehiclesModule } from './modules/vehicles/vehicles.module';
import { DriversModule } from './modules/drivers/drivers.module';
import { TripsModule } from './modules/trips/trips.module';
import { MaintenanceModule } from './modules/maintenance/maintenance.module';
import { FinanceModule } from './modules/finance/finance.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { AuditModule } from './modules/audit/audit.module';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { EventsModule } from './modules/events/events.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    EventEmitterModule.forRoot(),

    // Rate limiting — 3-tier strategy (in-memory; Redis-backed upgrade path documented)
    ThrottlerModule.forRoot({
      throttlers: [
        { name: 'short', ttl: 1000, limit: 10 }, // 10 req/sec
        { name: 'medium', ttl: 10_000, limit: 30 }, // 30 req/10s
        { name: 'long', ttl: 60_000, limit: 100 }, // 100 req/min
      ],
    }),

    EventsModule,
    AuthModule,
    UsersModule,
    VehiclesModule,
    DriversModule,
    TripsModule,
    MaintenanceModule,
    FinanceModule,
    AnalyticsModule,
    AuditModule,
    PrismaModule,
    RedisModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Global JWT auth — all routes require a valid token unless @Public()
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    // Global RBAC/ABAC — enforced after JWT auth
    { provide: APP_GUARD, useClass: RolesGuard },
    // Global rate limiter — applied after auth
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
