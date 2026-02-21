import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class VehiclesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const vehicles = await this.prisma.vehicle.findMany({
      select: {
        id: true,
        name: true,
        model: true,
        licensePlate: true,
        status: true,
        createdAt: true,
        odometer: true,
        maxCapacityKg: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Normalize to the shape the frontend expects (make/model/year placeholders where not stored)
    return vehicles.map((v) => ({
      id: v.id,
      make: v.name,
      model: v.model,
      year: v.createdAt.getFullYear(),
      licensePlate: v.licensePlate,
      status: v.status,
      vin: v.id.slice(0, 8),
      odometer: v.odometer,
      maxCapacityKg: v.maxCapacityKg,
    }));
  }
}
