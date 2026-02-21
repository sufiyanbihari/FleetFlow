import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(private configService: ConfigService) {
    const isDev = configService.get<string>('NODE_ENV') === 'development';
    const connectionString = configService.get<string>('DATABASE_URL');

    let adapter;
    if (connectionString) {
      const pool = new Pool({ connectionString });
      adapter = new PrismaPg(pool);
    }

    super({
      adapter,
      log: isDev ? ['query', 'info', 'warn', 'error'] : ['error'],
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
