import {
  IsString,
  IsNumber,
  IsNotEmpty,
  Min,
  IsUUID,
  IsDateString,
} from 'class-validator';

export class CreateMaintenanceDto {
  @IsUUID()
  @IsNotEmpty()
  vehicleId: string;

  @IsString()
  @IsNotEmpty()
  type: string;

  @IsNumber()
  @Min(0)
  cost: number;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsDateString()
  serviceDate: string;
}
