import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AddFuelDto } from './dto/add-fuel.dto';

@Injectable()
export class FinanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async addFuelLog(dto: AddFuelDto) {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: dto.vehicleId },
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    if (vehicle.status === 'RETIRED') {
      throw new BadRequestException('Cannot add fuel log to a retired vehicle');
    }

    if (dto.tripId) {
      const trip = await this.prisma.trip.findUnique({
        where: { id: dto.tripId },
      });
      if (!trip) {
        throw new NotFoundException('Trip not found');
      }
    }

    const log = await this.prisma.fuelLog.create({
      data: {
        vehicleId: dto.vehicleId,
        tripId: dto.tripId || null,
        liters: dto.liters,
        cost: dto.cost,
        date: new Date(dto.date),
      },
    });

    // Cache Invalidation
    await this.redis.del(`cache:v1:analytics:vehicle:${vehicle.id}`);

    this.eventEmitter.emit('fuel.logged', {
      id: log.id,
      vehicleId: log.vehicleId,
      liters: log.liters,
      cost: log.cost,
      timestamp: new Date(),
    });

    return log;
  }
}
