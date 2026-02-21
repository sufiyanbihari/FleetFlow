import { Test, TestingModule } from '@nestjs/testing';
import { TripsService } from './trips.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConflictException } from '@nestjs/common';

/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */

describe('TripsService (Concurrency & Locks)', () => {
  let service: TripsService;
  let redisService: jest.Mocked<RedisService>;

  beforeEach(async () => {
    // Mock the dependencies
    const mockPrisma = {
      $transaction: jest.fn().mockImplementation((cb) => cb(mockPrisma)),
      vehicle: { findUnique: jest.fn(), update: jest.fn() },
      driver: { findUnique: jest.fn(), update: jest.fn() },
      trip: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    };

    const mockRedis = {
      acquireLock: jest.fn(),
      releaseLock: jest.fn(),
      del: jest.fn(),
      get: jest.fn(),
      set: jest.fn(),
    };

    const mockEventEmitter = {
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TripsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<TripsService>(TripsService);
    redisService = module.get(RedisService);
  });

  describe('createTrip', () => {
    const mockDto = {
      vehicleId: 'v123',
      driverId: 'd123',
      cargoWeight: 1000,
      origin: 'A',
      destination: 'B',
      startOdometer: 500,
    };

    it('should throw ConflictException if vehicle lock fails', async () => {
      // Simulate failure on the very first lock acquisition (vehicle)
      redisService.acquireLock.mockResolvedValueOnce(false);

      await expect(service.createTrip(mockDto)).rejects.toThrow(
        new ConflictException('Vehicle is currently locked by another process'),
      );

      // Verify driver lock was NEVER attempted
      expect(redisService.acquireLock).toHaveBeenCalledTimes(1);
    });

    it('should throw ConflictException if driver lock fails and release vehicle lock safely', async () => {
      // Simulate success on vehicle lock, failure on driver lock
      redisService.acquireLock
        .mockResolvedValueOnce(true) // Vehicle success
        .mockResolvedValueOnce(false); // Driver fail

      await expect(service.createTrip(mockDto)).rejects.toThrow(
        new ConflictException('Driver is currently locked by another process'),
      );

      // Verify that releaseLock is called twice in the finally block for safety
      expect(redisService.releaseLock).toHaveBeenCalledTimes(2);
    });
  });
});
