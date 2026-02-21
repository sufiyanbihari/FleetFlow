import {
  Injectable,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CreateMaintenanceDto } from './dto/create-maintenance.dto';
import * as crypto from 'crypto';

@Injectable()
export class MaintenanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async createMaintenanceLog(dto: CreateMaintenanceDto) {
    const vehicleLockKey = `lock:vehicle:${dto.vehicleId}`;
    const vehicleLockToken = crypto.randomUUID();
    const lockTtl = 10;

    try {
      const vehicleLocked = await this.redis.acquireLock(
        vehicleLockKey,
        vehicleLockToken,
        lockTtl,
      );
      if (!vehicleLocked) {
        throw new ConflictException(
          'Vehicle is currently locked by another process',
        );
      }

      // Run the transaction — no side effects inside
      const { log, vehicleId } = await this.prisma.$transaction(async (tx) => {
        const vehicle = await tx.vehicle.findUnique({
          where: { id: dto.vehicleId },
        });
        if (!vehicle) throw new NotFoundException('Vehicle not found');

        if (vehicle.status === 'RETIRED') {
          throw new BadRequestException('Cannot maintain a retired vehicle');
        }
        if (vehicle.status === 'ON_TRIP') {
          throw new BadRequestException(
            'Cannot start maintenance while vehicle is on a trip',
          );
        }

        const newLog = await tx.maintenanceLog.create({
          data: {
            vehicleId: vehicle.id,
            type: dto.type,
            cost: dto.cost,
            description: dto.description,
            serviceDate: new Date(dto.serviceDate),
          },
        });

        await tx.vehicle.update({
          where: { id: vehicle.id },
          data: { status: 'IN_SHOP' },
        });

        return { log: newLog, vehicleId: vehicle.id };
      });

      // ✅ Post-commit: invalidate cache and emit event
      await Promise.all([
        this.redis.del('cache:v1:analytics:dashboard'),
        this.redis.del('cache:v1:analytics:utilization'),
        this.redis.del('cache:v1:analytics:fleet-roi'),
        this.redis.del(`cache:v1:analytics:vehicle:${vehicleId}`),
      ]);

      this.eventEmitter.emit('maintenance.started', {
        id: log.id,
        vehicleId,
        status: 'IN_SHOP',
        timestamp: new Date(),
      });

      return log;
    } finally {
      await this.redis.releaseLock(vehicleLockKey, vehicleLockToken);
    }
  }

  async completeMaintenance(vehicleId: string) {
    const vehicleLockKey = `lock:vehicle:${vehicleId}`;
    const vehicleLockToken = crypto.randomUUID();
    const lockTtl = 10;

    try {
      const vehicleLocked = await this.redis.acquireLock(
        vehicleLockKey,
        vehicleLockToken,
        lockTtl,
      );
      if (!vehicleLocked) {
        throw new ConflictException(
          'Vehicle is currently locked by another process',
        );
      }

      // Run the transaction — no side effects inside
      const updatedVehicle = await this.prisma.$transaction(async (tx) => {
        const vehicle = await tx.vehicle.findUnique({
          where: { id: vehicleId },
        });
        if (!vehicle) throw new NotFoundException('Vehicle not found');

        if (vehicle.status !== 'IN_SHOP') {
          throw new BadRequestException('Vehicle is not in the shop');
        }

        return tx.vehicle.update({
          where: { id: vehicleId },
          data: { status: 'AVAILABLE' },
        });
      });

      // ✅ Post-commit: invalidate cache and emit event
      await Promise.all([
        this.redis.del('cache:v1:analytics:dashboard'),
        this.redis.del('cache:v1:analytics:fleet-roi'),
        this.redis.del(`cache:v1:analytics:vehicle:${vehicleId}`),
      ]);

      this.eventEmitter.emit('maintenance.completed', {
        vehicleId: updatedVehicle.id,
        status: 'AVAILABLE',
        timestamp: new Date(),
      });

      return updatedVehicle;
    } finally {
      await this.redis.releaseLock(vehicleLockKey, vehicleLockToken);
    }
  }
}
