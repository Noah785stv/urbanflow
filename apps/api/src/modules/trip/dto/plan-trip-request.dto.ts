import { TransportMode } from '@urbanflow/shared-types';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsISO8601,
  IsLatitude,
  IsLongitude,
  IsOptional,
  ValidateNested,
} from 'class-validator';

class CoordinatesDto {
  @IsLatitude()
  latitude!: number;

  @IsLongitude()
  longitude!: number;
}

/** DTO de `POST /trips/plan` (§4, §7 A03 : coordonnées bornées, date ISO valide). */
export class PlanTripRequestDto {
  @ValidateNested()
  @Type(() => CoordinatesDto)
  from!: CoordinatesDto;

  @ValidateNested()
  @Type(() => CoordinatesDto)
  to!: CoordinatesDto;

  @IsOptional()
  @IsISO8601()
  departureAt?: string;

  @IsOptional()
  @IsArray()
  @IsEnum(TransportMode, { each: true })
  excludeModes?: TransportMode[];

  // Contrainte PMR (§5.5) — accueillie par l'API ; non encore appliquée au tri
  // (données d'accessibilité non exposées par le RoutingProvider actuel, voir
  // F2-planner.md §12).
  @IsOptional()
  @IsBoolean()
  accessibleOnly?: boolean;
}
