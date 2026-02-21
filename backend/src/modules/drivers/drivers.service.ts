import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DriversService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.driver.findMany({
      select: {
        id: true,
        name: true,
        licenseNumber: true,
        licenseCategory: true,
        licenseExpiry: true,
        status: true,
        safetyScore: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
