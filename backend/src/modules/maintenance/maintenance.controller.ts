import { Controller, Post, Body, Param, Patch } from '@nestjs/common';
import { MaintenanceService } from './maintenance.service';
import { CreateMaintenanceDto } from './dto/create-maintenance.dto';
import { Permission } from '../../common/decorators/permission.decorator';

@Controller('maintenance')
export class MaintenanceController {
  constructor(private readonly maintenanceService: MaintenanceService) {}

  @Post('start')
  @Permission('maintenance', 'create')
  async startMaintenance(@Body() createMaintenanceDto: CreateMaintenanceDto) {
    return this.maintenanceService.createMaintenanceLog(createMaintenanceDto);
  }

  @Patch(':vehicleId/complete')
  @Permission('maintenance', 'complete')
  async completeMaintenance(@Param('vehicleId') vehicleId: string) {
    return this.maintenanceService.completeMaintenance(vehicleId);
  }
}
