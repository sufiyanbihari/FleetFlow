import {
  Injectable,
  ConflictException,
  ForbiddenException,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CreateTripDto } from './dto/create-trip.dto';
import { CompleteTripDto } from './dto/complete-trip.dto';
import * as crypto from 'crypto';

@Injectable()
export class TripsService {
  private readonly logger = new Logger(TripsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async createTrip(dto: CreateTripDto) {
    const vehicleLockKey = `lock:vehicle:${dto.vehicleId}`;
    const driverLockKey = `lock:driver:${dto.driverId}`;
    const vehicleLockToken = crypto.randomUUID();
    const driverLockToken = crypto.randomUUID();
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

      const driverLocked = await this.redis.acquireLock(
        driverLockKey,
        driverLockToken,
        lockTtl,
      );
      if (!driverLocked) {
        throw new ConflictException(
          'Driver is currently locked by another process',
        );
      }

      // Run the transaction — no side effects inside
      const trip = await this.prisma.$transaction(async (tx) => {
        const vehicle = await tx.vehicle.findUnique({
          where: { id: dto.vehicleId },
        });
        if (!vehicle) throw new NotFoundException('Vehicle not found');

        const driver = await tx.driver.findUnique({
          where: { id: dto.driverId },
        });
        if (!driver) throw new NotFoundException('Driver not found');

        if (vehicle.status !== 'AVAILABLE') {
          throw new BadRequestException(
            'Vehicle is not available for dispatch',
          );
        }

        if (driver.status !== 'ON_DUTY') {
          throw new BadRequestException('Driver is not on duty');
        }

        if (vehicle.maxCapacityKg && dto.cargoWeight > vehicle.maxCapacityKg) {
          throw new BadRequestException(
            'Cargo weight exceeds vehicle max capacity',
          );
        }

        if (driver.licenseExpiry < new Date()) {
          await tx.driver.update({
            where: { id: driver.id },
            data: { status: 'SUSPENDED' },
          });
          // Emit license suspension event outside transaction below
          throw new ForbiddenException(
            'Driver license has expired. Status updated to SUSPENDED.',
          );
        }

        const newTrip = await tx.trip.create({
          data: {
            vehicleId: vehicle.id,
            driverId: driver.id,
            cargoWeight: dto.cargoWeight,
            origin: dto.origin,
            destination: dto.destination,
            startOdometer: dto.startOdometer,
            status: 'DISPATCHED',
          },
        });

        await tx.vehicle.update({
          where: { id: vehicle.id },
          data: { status: 'ON_TRIP' },
        });

        await tx.driver.update({
          where: { id: driver.id },
          data: { status: 'ON_TRIP' },
        });

        return { trip: newTrip, vehicleId: vehicle.id, driverId: driver.id };
      });

      // ✅ Post-commit: invalidate cache and emit events AFTER transaction succeeds
      await this.redis.del('cache:v1:analytics:dashboard');
      await this.redis.del('cache:v1:analytics:utilization');

      this.eventEmitter.emit('trip.dispatched', {
        id: trip.trip.id,
        vehicleId: trip.vehicleId,
        driverId: trip.driverId,
        status: 'DISPATCHED',
        timestamp: new Date(),
      });

      this.logger.log(`Trip dispatched: ${trip.trip.id}`);
      return trip.trip;
    } finally {
      await this.redis.releaseLock(driverLockKey, driverLockToken);
      await this.redis.releaseLock(vehicleLockKey, vehicleLockToken);
    }
  }

  async completeTrip(
    id: string,
    dto: CompleteTripDto,
    requestingUser: { id: string; role: string },
  ) {
    const trip = await this.prisma.trip.findUnique({ where: { id } });
    if (!trip) throw new NotFoundException('Trip not found');

    // ── PBAC Ownership Check ──
    // MANAGER+ can complete any trip (supervisor override).
    // DISPATCHER may only complete a trip if they are the assigned driver.
    const managerTiers = ['SUPER_ADMIN', 'MANAGER'];
    const isManager = managerTiers.includes(requestingUser.role);
    if (!isManager && trip.driverId !== requestingUser.id) {
      this.logger.warn(
        `Ownership denial: User ${requestingUser.id} tried to complete trip ${id} owned by driver ${trip.driverId}`,
      );
      throw new ForbiddenException(
        'You are not the assigned driver for this trip',
      );
    }

    const vehicleLockKey = `lock:vehicle:${trip.vehicleId}`;
    const driverLockKey = `lock:driver:${trip.driverId}`;
    const vehicleLockToken = crypto.randomUUID();
    const driverLockToken = crypto.randomUUID();
    const lockTtl = 10;

    try {
      const vehicleLocked = await this.redis.acquireLock(
        vehicleLockKey,
        vehicleLockToken,
        lockTtl,
      );
      if (!vehicleLocked) throw new ConflictException('Vehicle locked');

      const driverLocked = await this.redis.acquireLock(
        driverLockKey,
        driverLockToken,
        lockTtl,
      );
      if (!driverLocked) throw new ConflictException('Driver locked');

      // Run the transaction — no side effects inside
      const updatedTrip = await this.prisma.$transaction(async (tx) => {
        const currentTrip = await tx.trip.findUnique({ where: { id } });
        if (currentTrip?.status !== 'DISPATCHED') {
          throw new BadRequestException(
            'Only DISPATCHED trips can be completed',
          );
        }

        const completed = await tx.trip.update({
          where: { id },
          data: {
            status: 'COMPLETED',
            endOdometer: dto.endOdometer,
            distanceKm: dto.endOdometer - currentTrip.startOdometer,
            revenue: dto.revenue,
            completedAt: new Date(),
          },
        });

        await tx.vehicle.update({
          where: { id: trip.vehicleId },
          data: { status: 'AVAILABLE', odometer: dto.endOdometer },
        });

        await tx.driver.update({
          where: { id: trip.driverId },
          data: { status: 'ON_DUTY' },
        });

        return completed;
      });

      // ✅ Post-commit: invalidate analytics caches and emit event
      await Promise.all([
        this.redis.del('cache:v1:analytics:dashboard'),
        this.redis.del('cache:v1:analytics:utilization'),
        this.redis.del('cache:v1:analytics:trips-per-day'),
        this.redis.del('cache:v1:analytics:fleet-roi'),
        this.redis.del('cache:v1:analytics:fleet-efficiency'),
        this.redis.del(`cache:v1:analytics:vehicle:${trip.vehicleId}`),
      ]);

      this.eventEmitter.emit('trip.completed', {
        id: trip.id,
        vehicleId: trip.vehicleId,
        driverId: trip.driverId,
        status: 'COMPLETED',
        timestamp: new Date(),
      });

      this.logger.log(`Trip completed: ${id}`);
      return updatedTrip;
    } finally {
      await this.redis.releaseLock(driverLockKey, driverLockToken);
      await this.redis.releaseLock(vehicleLockKey, vehicleLockToken);
    }
  }

  async cancelTrip(id: string) {
    const trip = await this.prisma.trip.findUnique({ where: { id } });
    if (!trip) throw new NotFoundException('Trip not found');

    const vehicleLockKey = `lock:vehicle:${trip.vehicleId}`;
    const driverLockKey = `lock:driver:${trip.driverId}`;
    const vehicleLockToken = crypto.randomUUID();
    const driverLockToken = crypto.randomUUID();
    const lockTtl = 10;

    try {
      const vehicleLocked = await this.redis.acquireLock(
        vehicleLockKey,
        vehicleLockToken,
        lockTtl,
      );
      if (!vehicleLocked) throw new ConflictException('Vehicle locked');

      const driverLocked = await this.redis.acquireLock(
        driverLockKey,
        driverLockToken,
        lockTtl,
      );
      if (!driverLocked) throw new ConflictException('Driver locked');

      // Run the transaction — no side effects inside
      const cancelledTrip = await this.prisma.$transaction(async (tx) => {
        const currentTrip = await tx.trip.findUnique({ where: { id } });
        if (currentTrip?.status !== 'DISPATCHED') {
          throw new BadRequestException(
            'Only DISPATCHED trips can be cancelled',
          );
        }

        const cancelled = await tx.trip.update({
          where: { id },
          data: { status: 'CANCELLED' },
        });

        await tx.vehicle.update({
          where: { id: trip.vehicleId },
          data: { status: 'AVAILABLE' },
        });

        await tx.driver.update({
          where: { id: trip.driverId },
          data: { status: 'ON_DUTY' },
        });

        return cancelled;
      });

      // ✅ Post-commit: invalidate cache and emit event
      await Promise.all([
        this.redis.del('cache:v1:analytics:dashboard'),
        this.redis.del('cache:v1:analytics:utilization'),
      ]);

      this.eventEmitter.emit('trip.cancelled', {
        id: trip.id,
        status: 'CANCELLED',
        timestamp: new Date(),
      });

      this.logger.log(`Trip cancelled: ${id}`);
      return cancelledTrip;
    } finally {
      await this.redis.releaseLock(driverLockKey, driverLockToken);
      await this.redis.releaseLock(vehicleLockKey, vehicleLockToken);
    }
  }
}
