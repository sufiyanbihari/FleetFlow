import { Injectable, NotFoundException } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { Prisma } from '@prisma/client';

// ─── Raw query result types ───────────────────────────────────────────────────
interface RawDateCount {
  date: string;
  count: bigint;
}

interface RawDateLiters {
  date: string;
  liters: number;
}

interface RawVehicleSum {
  vehicle_id: string;
  total: number;
}

// ─── Public response types ────────────────────────────────────────────────────
export interface TripsPerDayEntry {
  date: string;
  count: number;
}

export interface FuelTrendEntry {
  date: string;
  liters: number;
}

export interface VehicleROISummaryEntry {
  vehicleId: string;
  roi: number;
}

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  // ─── Private compute helpers (no cache — called inside cached methods) ───────

  private async computeUtilization() {
    const [onTrip, total] = await Promise.all([
      this.prisma.vehicle.count({ where: { status: 'ON_TRIP' } }),
      this.prisma.vehicle.count(),
    ]);
    const utilizationRate =
      total === 0 ? 0 : Number(((onTrip / total) * 100).toFixed(2));
    return { onTrip, total, utilizationRate };
  }

  private async computeFleetEfficiency() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [distanceResult, fuelResult] = await Promise.all([
      this.prisma.trip.aggregate({
        where: { status: 'COMPLETED', completedAt: { gte: thirtyDaysAgo } },
        _sum: { distanceKm: true },
      }),
      this.prisma.fuelLog.aggregate({
        where: { date: { gte: thirtyDaysAgo } },
        _sum: { liters: true },
      }),
    ]);

    const totalDistance = distanceResult._sum.distanceKm ?? 0;
    const totalLiters = fuelResult._sum.liters ?? 0;

    if (totalLiters === 0) return null;
    return Number((totalDistance / totalLiters).toFixed(2));
  }

  // ─── Dashboard KPIs ───────────────────────────────────────────────────────────

  async getDashboardKPIs() {
    const cacheKey = 'cache:v1:analytics:dashboard';
    const cached = await this.redis.get(cacheKey);
    if (cached) return cached;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // All independent — run in parallel
    const [
      vehicleMetrics,
      driverMetrics,
      tripsTodayResult,
      utilization,
      fleetEfficiency,
    ] = await Promise.all([
      this.prisma.vehicle.groupBy({ by: ['status'], _count: { id: true } }),
      this.prisma.driver.groupBy({ by: ['status'], _count: { id: true } }),
      this.prisma.trip.aggregate({
        where: { createdAt: { gte: today } },
        _count: { id: true },
      }),
      this.computeUtilization(),
      this.computeFleetEfficiency(),
    ]);

    const activeFleetCount = vehicleMetrics.reduce(
      (sum, m) => sum + m._count.id,
      0,
    );
    const availableVehicles =
      vehicleMetrics.find((m) => m.status === 'AVAILABLE')?._count.id ?? 0;
    const driversOnDuty =
      driverMetrics.find((m) => m.status === 'ON_DUTY')?._count.id ?? 0;

    const kpis = {
      activeFleetCount,
      availableVehicles,
      driversOnDuty,
      tripsToday: tripsTodayResult._count.id,
      utilizationRate: utilization.utilizationRate,
      vehiclesOnTrip: utilization.onTrip,
      fleetEfficiencyKmPerLiter: fleetEfficiency,
      calculatedAt: new Date().toISOString(),
    };

    await this.redis.set(cacheKey, kpis, 60);
    return kpis;
  }

  // ─── Utilization Rate ─────────────────────────────────────────────────────────

  async getUtilizationRate() {
    const cacheKey = 'cache:v1:analytics:utilization';
    const cached = await this.redis.get(cacheKey);
    if (cached) return cached;

    const result = await this.computeUtilization();
    await this.redis.set(cacheKey, result, 60);
    return result;
  }

  // ─── Fleet Efficiency (last 30 days) ─────────────────────────────────────────

  async getFleetEfficiency() {
    const cacheKey = 'cache:v1:analytics:fleet-efficiency';
    const cached = await this.redis.get(cacheKey);
    if (cached !== null) return cached;

    const result = await this.computeFleetEfficiency();
    await this.redis.set(cacheKey, result, 60);
    return result;
  }

  // ─── Trips Per Day (last 30 days) ────────────────────────────────────────────

  async getTripsPerDay(): Promise<TripsPerDayEntry[]> {
    const cacheKey = 'cache:v1:analytics:trips-per-day';
    const cached = await this.redis.get(cacheKey);
    if (cached) return cached as TripsPerDayEntry[];

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const rows = await this.prisma.$queryRaw<RawDateCount[]>`
      SELECT
        TO_CHAR("createdAt"::date, 'YYYY-MM-DD') AS date,
        COUNT(*) AS count
      FROM "Trip"
      WHERE "status" = 'COMPLETED'
        AND "createdAt" >= ${thirtyDaysAgo}
      GROUP BY "createdAt"::date
      ORDER BY "createdAt"::date ASC
    `;

    const result: TripsPerDayEntry[] = rows.map((r) => ({
      date: r.date,
      count: Number(r.count),
    }));

    await this.redis.set(cacheKey, result, 60);
    return result;
  }

  // ─── Fuel Trend (last 30 days) ───────────────────────────────────────────────

  async getFuelTrend(): Promise<FuelTrendEntry[]> {
    const cacheKey = 'cache:v1:analytics:fuel-trend';
    const cached = await this.redis.get(cacheKey);
    if (cached) return cached as FuelTrendEntry[];

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const rows = await this.prisma.$queryRaw<RawDateLiters[]>`
      SELECT
        TO_CHAR("date"::date, 'YYYY-MM-DD') AS date,
        ROUND(CAST(SUM("liters") AS numeric), 2) AS liters
      FROM "FuelLog"
      WHERE "date" >= ${thirtyDaysAgo}
      GROUP BY "date"::date
      ORDER BY "date"::date ASC
    `;

    const result: FuelTrendEntry[] = rows.map((r) => ({
      date: r.date,
      liters: Number(r.liters),
    }));

    await this.redis.set(cacheKey, result, 60);
    return result;
  }

  // ─── Fleet ROI Summary — 3 queries only ──────────────────────────────────────

  async getFleetROISummary(): Promise<VehicleROISummaryEntry[]> {
    const cacheKey = 'cache:v1:analytics:fleet-roi';
    const cached = await this.redis.get(cacheKey);
    if (cached) return cached as VehicleROISummaryEntry[];

    // 3 grouped aggregations in parallel — O(1) queries regardless of fleet size
    const [vehicles, revenueRows, fuelRows, maintenanceRows] =
      await Promise.all([
        this.prisma.vehicle.findMany({
          select: { id: true, acquisitionCost: true },
        }),
        this.prisma.$queryRaw<RawVehicleSum[]>`
        SELECT "vehicleId" AS vehicle_id, COALESCE(SUM("revenue"), 0) AS total
        FROM "Trip"
        WHERE "status" = 'COMPLETED'
        GROUP BY "vehicleId"
      `,
        this.prisma.$queryRaw<RawVehicleSum[]>`
        SELECT "vehicleId" AS vehicle_id, COALESCE(SUM("cost"), 0) AS total
        FROM "FuelLog"
        GROUP BY "vehicleId"
      `,
        this.prisma.$queryRaw<RawVehicleSum[]>`
        SELECT "vehicleId" AS vehicle_id, COALESCE(SUM("cost"), 0) AS total
        FROM "MaintenanceLog"
        GROUP BY "vehicleId"
      `,
      ]);

    // Build lookup maps for O(1) merge
    const revenueMap = new Map(
      revenueRows.map((r) => [r.vehicle_id, Number(r.total)]),
    );
    const fuelMap = new Map(
      fuelRows.map((r) => [r.vehicle_id, Number(r.total)]),
    );
    const maintenanceMap = new Map(
      maintenanceRows.map((r) => [r.vehicle_id, Number(r.total)]),
    );

    const summary: VehicleROISummaryEntry[] = vehicles
      .map((v) => {
        const revenue = revenueMap.get(v.id) ?? 0;
        const fuel = fuelMap.get(v.id) ?? 0;
        const maintenance = maintenanceMap.get(v.id) ?? 0;
        const netProfit = revenue - fuel - maintenance;
        const roi =
          v.acquisitionCost === 0
            ? 0
            : Number(((netProfit / v.acquisitionCost) * 100).toFixed(2));
        return { vehicleId: v.id, roi };
      })
      .sort((a, b) => b.roi - a.roi);

    await this.redis.set(cacheKey, summary, 120); // 2-min TTL — expensive computation
    return summary;
  }

  // ─── Per-Vehicle ROI ──────────────────────────────────────────────────────────

  async getVehicleROI(vehicleId: string) {
    const cacheKey = `cache:v1:analytics:vehicle:${vehicleId}:roi`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return cached;

    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: vehicleId },
    });
    if (!vehicle) throw new NotFoundException('Vehicle not found');

    const [tripStats, maintenanceStats, fuelStats] = await Promise.all([
      this.prisma.trip.aggregate({
        where: { vehicleId, status: 'COMPLETED' },
        _sum: { revenue: true },
      }),
      this.prisma.maintenanceLog.aggregate({
        where: { vehicleId },
        _sum: { cost: true },
      }),
      this.prisma.fuelLog.aggregate({
        where: { vehicleId },
        _sum: { cost: true },
      }),
    ]);

    const totalRevenue = tripStats._sum.revenue ?? 0;
    const totalMaintenanceCost = maintenanceStats._sum.cost ?? 0;
    const totalFuelCost = fuelStats._sum.cost ?? 0;
    const netProfit = totalRevenue - (totalFuelCost + totalMaintenanceCost);
    const roi =
      vehicle.acquisitionCost === 0
        ? 0
        : Number(((netProfit / vehicle.acquisitionCost) * 100).toFixed(2));

    const result = {
      vehicleId,
      acquisitionCost: vehicle.acquisitionCost,
      totalRevenue,
      totalMaintenanceCost,
      totalFuelCost,
      netProfit,
      roi,
    };

    await this.redis.set(cacheKey, result, 60);
    return result;
  }

  // ─── Per-Vehicle Fuel Efficiency ─────────────────────────────────────────────

  async getFuelEfficiency(vehicleId: string) {
    const cacheKey = `cache:v1:analytics:vehicle:${vehicleId}:fuel`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return cached;

    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: vehicleId },
    });
    if (!vehicle) throw new NotFoundException('Vehicle not found');

    const [tripStats, fuelStats] = await Promise.all([
      this.prisma.trip.aggregate({
        where: { vehicleId, status: 'COMPLETED' },
        _sum: { distanceKm: true },
      }),
      this.prisma.fuelLog.aggregate({
        where: { vehicleId },
        _sum: { liters: true },
      }),
    ]);

    const totalDistance = tripStats._sum.distanceKm ?? 0;
    const totalLiters = fuelStats._sum.liters ?? 0;

    let efficiencyKmPerLiter: number | null = null;
    if (totalLiters > 0 && totalDistance > 0) {
      efficiencyKmPerLiter = Number((totalDistance / totalLiters).toFixed(2));
    } else if (totalLiters > 0) {
      efficiencyKmPerLiter = 0;
    }

    const result = {
      vehicleId,
      totalDistanceKm: totalDistance,
      totalFuelLiters: totalLiters,
      efficiencyKmPerLiter,
    };
    await this.redis.set(cacheKey, result, 60);
    return result;
  }

  // ─── Event-Driven Cache Invalidation (fires after transaction commits) ────────

  @OnEvent('trip.completed')
  async onTripCompleted(payload: { vehicleId: string }) {
    await Promise.all([
      this.redis.del('cache:v1:analytics:dashboard'),
      this.redis.del('cache:v1:analytics:utilization'),
      this.redis.del('cache:v1:analytics:trips-per-day'),
      this.redis.del('cache:v1:analytics:fleet-roi'),
      this.redis.del('cache:v1:analytics:fleet-efficiency'),
      this.redis.del(`cache:v1:analytics:vehicle:${payload.vehicleId}:roi`),
      this.redis.del(`cache:v1:analytics:vehicle:${payload.vehicleId}:fuel`),
    ]);
  }

  @OnEvent('fuel.logged')
  async onFuelLogged(payload: { vehicleId: string }) {
    await Promise.all([
      this.redis.del('cache:v1:analytics:dashboard'),
      this.redis.del('cache:v1:analytics:fuel-trend'),
      this.redis.del('cache:v1:analytics:fleet-roi'),
      this.redis.del('cache:v1:analytics:fleet-efficiency'),
      this.redis.del(`cache:v1:analytics:vehicle:${payload.vehicleId}:roi`),
      this.redis.del(`cache:v1:analytics:vehicle:${payload.vehicleId}:fuel`),
    ]);
  }

  @OnEvent('maintenance.completed')
  async onMaintenanceCompleted(payload: { vehicleId: string }) {
    await Promise.all([
      this.redis.del('cache:v1:analytics:dashboard'),
      this.redis.del('cache:v1:analytics:fleet-roi'),
      this.redis.del(`cache:v1:analytics:vehicle:${payload.vehicleId}:roi`),
    ]);
  }

  // Unused Prisma type reference suppressor
  private _prismaRef?: Prisma.VehicleWhereInput;
}
