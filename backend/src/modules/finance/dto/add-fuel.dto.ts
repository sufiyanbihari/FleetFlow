import {
  IsNumber,
  IsNotEmpty,
  Min,
  IsUUID,
  IsOptional,
  IsDateString,
} from 'class-validator';

export class AddFuelDto {
  @IsUUID()
  @IsNotEmpty()
  vehicleId: string;

  @IsUUID()
  @IsOptional()
  tripId?: string;

  @IsNumber()
  @Min(0.01)
  liters: number;

  @IsNumber()
  @Min(0)
  cost: number;

  @IsDateString()
  date: string;
}
