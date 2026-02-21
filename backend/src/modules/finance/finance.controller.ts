import { Controller, Post, Body } from '@nestjs/common';
import { FinanceService } from './finance.service';
import { AddFuelDto } from './dto/add-fuel.dto';
import { Permission } from '../../common/decorators/permission.decorator';

@Controller('finance')
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Post('fuel')
  @Permission('finance', 'create')
  async addFuelLog(@Body() addFuelDto: AddFuelDto) {
    return this.financeService.addFuelLog(addFuelDto);
  }
}
