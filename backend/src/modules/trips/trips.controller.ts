import { Controller, Post, Body, Param, Patch, Req } from '@nestjs/common';
import { Request } from 'express';
import { TripsService } from './trips.service';
import { CreateTripDto } from './dto/create-trip.dto';
import { CompleteTripDto } from './dto/complete-trip.dto';
import { Permission } from '../../common/decorators/permission.decorator';
import { UserRole } from '../../common/enums/user-role.enum';

@Controller('trips')
export class TripsController {
  constructor(private readonly tripsService: TripsService) {}

  @Post('dispatch')
  @Permission('trips', 'create')
  async dispatchTrip(@Body() createTripDto: CreateTripDto) {
    return this.tripsService.createTrip(createTripDto);
  }

  @Patch(':id/complete')
  @Permission('trips', 'complete')
  async completeTrip(
    @Param('id') id: string,
    @Body() completeTripDto: CompleteTripDto,
    @Req() req: Request & { user?: { id?: string; role?: UserRole } },
  ) {
    return this.tripsService.completeTrip(id, completeTripDto, {
      id: req.user?.id ?? '',
      role: req.user?.role ?? '',
    });
  }

  @Patch(':id/cancel')
  @Permission('trips', 'cancel')
  async cancelTrip(@Param('id') id: string) {
    return this.tripsService.cancelTrip(id);
  }
}
