import { IsString, IsNumber, IsNotEmpty, Min, IsUUID } from 'class-validator';

export class CreateTripDto {
  @IsUUID()
  @IsNotEmpty()
  vehicleId: string;

  @IsUUID()
  @IsNotEmpty()
  driverId: string;

  @IsNumber()
  @Min(0)
  cargoWeight: number;

  @IsString()
  @IsNotEmpty()
  origin: string;

  @IsString()
  @IsNotEmpty()
  destination: string;

  @IsNumber()
  @Min(0)
  startOdometer: number;
}
