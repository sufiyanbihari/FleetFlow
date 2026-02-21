import { IsNumber, IsNotEmpty, Min } from 'class-validator';

export class CompleteTripDto {
  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  endOdometer: number;

  @IsNumber()
  @Min(0)
  revenue: number;
}
