import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { OnEvent } from '@nestjs/event-emitter';
import { Logger, OnModuleInit } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@WebSocketGateway({
  cors: {
    // In production, restrict to your actual frontend origin
    origin: process.env['FRONTEND_URL'] ?? 'http://localhost:3001',
    credentials: true,
  },
})
export class FleetGateway implements OnModuleInit {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(FleetGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  onModuleInit() {
    // Validate JWT on every socket connection attempt
    this.server.use((socket: Socket, next) => {
      try {
        const token =
          (socket.handshake.auth as Record<string, string>)?.['token'] ??
          socket.handshake.headers?.['authorization']?.split(' ')[1];

        if (!token) {
          this.logger.warn(
            `Socket rejected — no token provided [${socket.id}]`,
          );
          return next(new Error('Authentication required'));
        }

        const payload = this.jwtService.verify<{ sub: string; role: string }>(
          token,
          { secret: this.configService.get<string>('JWT_SECRET') },
        );

        // Attach user context to socket for downstream use
        socket.data = { userId: payload.sub, role: payload.role };
        this.logger.log(
          `Socket connected: user=${payload.sub} role=${payload.role}`,
        );
        return next();
      } catch {
        this.logger.warn(
          `Socket rejected — invalid/expired token [${socket.id}]`,
        );
        return next(new Error('Invalid or expired token'));
      }
    });
  }

  // ── Trip Lifecycle Events ──────────────────────────────────────────────────

  @OnEvent('trip.dispatched')
  handleTripDispatched(payload: { id: string; [key: string]: unknown }) {
    this.logger.log(`Broadcasting trip.dispatched: ${payload.id}`);
    this.server.emit('trip.dispatched', payload);
  }

  @OnEvent('trip.completed')
  handleTripCompleted(payload: { id: string; [key: string]: unknown }) {
    this.logger.log(`Broadcasting trip.completed: ${payload.id}`);
    this.server.emit('trip.completed', payload);
  }

  @OnEvent('trip.cancelled')
  handleTripCancelled(payload: { id: string; [key: string]: unknown }) {
    this.logger.log(`Broadcasting trip.cancelled: ${payload.id}`);
    this.server.emit('trip.cancelled', payload);
  }

  // ── Maintenance & Vehicle Events ───────────────────────────────────────────

  @OnEvent('vehicle.updated')
  handleVehicleUpdated(payload: { id: string; [key: string]: unknown }) {
    this.server.emit('vehicle.updated', payload);
  }

  @OnEvent('maintenance.started')
  handleMaintenanceStarted(payload: {
    vehicleId: string;
    [key: string]: unknown;
  }) {
    this.server.emit('maintenance.started', payload);
  }

  @OnEvent('maintenance.completed')
  handleMaintenanceCompleted(payload: {
    vehicleId: string;
    [key: string]: unknown;
  }) {
    this.server.emit('maintenance.completed', payload);
  }

  // ── Fuel & Driver Events ───────────────────────────────────────────────────

  @OnEvent('fuel.logged')
  handleFuelLogged(payload: { vehicleId: string; [key: string]: unknown }) {
    this.server.emit('fuel.logged', payload);
  }

  @OnEvent('driver.suspended')
  handleDriverSuspended(payload: { id: string; [key: string]: unknown }) {
    this.server.emit('driver.suspended', payload);
  }
}
