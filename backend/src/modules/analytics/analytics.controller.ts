import { Controller, Get, Param } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { Permission } from '../../common/decorators/permission.decorator';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  /** GET /analytics/dashboard — Full KPI payload (fleet counts, utilization, efficiency) */
  @Get('dashboard')
  @Permission('analytics', 'view')
  getDashboard() {
    return this.analyticsService.getDashboardKPIs();
  }

  /** GET /analytics/utilization — Current vehicle utilization rate */
  @Get('utilization')
  @Permission('analytics', 'view')
  getUtilizationRate() {
    return this.analyticsService.getUtilizationRate();
  }

  /** GET /analytics/fleet-efficiency — Fleet-wide km/L (last 30 days) */
  @Get('fleet-efficiency')
  @Permission('analytics', 'view')
  getFleetEfficiency() {
    return this.analyticsService.getFleetEfficiency();
  }

  /** GET /analytics/trips-per-day — Completed trips grouped by date (last 30 days) */
  @Get('trips-per-day')
  @Permission('analytics', 'view')
  getTripsPerDay() {
    return this.analyticsService.getTripsPerDay();
  }

  /** GET /analytics/fuel-trend — Fuel liters grouped by date (last 30 days) */
  @Get('fuel-trend')
  @Permission('analytics', 'view')
  getFuelTrend() {
    return this.analyticsService.getFuelTrend();
  }

  /** GET /analytics/fleet-roi — ROI for all vehicles, sorted descending */
  @Get('fleet-roi')
  @Permission('analytics', 'view')
  getFleetROI() {
    return this.analyticsService.getFleetROISummary();
  }

  /** GET /analytics/vehicle/:vehicleId/roi — Detailed ROI for a single vehicle */
  @Get('vehicle/:vehicleId/roi')
  @Permission('analytics', 'view')
  getVehicleROI(@Param('vehicleId') vehicleId: string) {
    return this.analyticsService.getVehicleROI(vehicleId);
  }

  /** GET /analytics/vehicle/:vehicleId/fuel-efficiency — km/L for a single vehicle */
  @Get('vehicle/:vehicleId/fuel-efficiency')
  @Permission('analytics', 'view')
  getFuelEfficiency(@Param('vehicleId') vehicleId: string) {
    return this.analyticsService.getFuelEfficiency(vehicleId);
  }
}
