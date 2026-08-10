import { Type } from 'class-transformer';
import {
  IsLatitude,
  IsLongitude,
  IsNumber,
  IsOptional,
  Max,
  Min,
} from 'class-validator';

// §8 : le rayon est borné pour éviter les requêtes abusives.
export const MIN_RADIUS_METERS = 50;
export const MAX_RADIUS_METERS = 2000;
export const DEFAULT_RADIUS_METERS = 500;

export class StationsNearbyQueryDto {
  @Type(() => Number)
  @IsLatitude()
  lat!: number;

  @Type(() => Number)
  @IsLongitude()
  lng!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(MIN_RADIUS_METERS)
  @Max(MAX_RADIUS_METERS)
  radius: number = DEFAULT_RADIUS_METERS;
}
