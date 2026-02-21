import { IsEnum } from 'class-validator';

export enum TripStatusUpdate {
  DISPATCHED = 'DISPATCHED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export class UpdateTripStatusDto {
  @IsEnum(TripStatusUpdate)
  status!: TripStatusUpdate;
}