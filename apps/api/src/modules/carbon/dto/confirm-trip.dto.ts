import { TransportMode } from '@urbanflow/shared-types';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsISO8601,
  IsOptional,
  IsPositive,
  ValidateNested,
} from 'class-validator';

class ConfirmTripSectionDto {
  @IsEnum(TransportMode)
  mode!: TransportMode;

  @IsPositive()
  distanceMeters!: number;
}

/**
 * DTO de `POST /carbon-logs` (F4 §6). Volontairement minimal : ni origine ni
 * destination (minimisation RGPD, §4.2) — seulement de quoi recalculer le
 * CO₂ côté serveur. `co2Grams` n'est jamais accepté ici : le client ne
 * transmet jamais d'empreinte, seulement la distance par tronçon.
 */
export class ConfirmTripDto {
  @IsOptional()
  @IsISO8601()
  loggedAt?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ConfirmTripSectionDto)
  sections!: ConfirmTripSectionDto[];
}
