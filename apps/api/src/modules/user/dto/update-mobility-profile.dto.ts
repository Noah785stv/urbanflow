import { TransportMode } from '@urbanflow/shared-types';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

class MobilityConstraintsDto {
  @IsBoolean()
  pmr!: boolean;

  @IsBoolean()
  personalBike!: boolean;
}

/** Point domicile/travail transmis en clair par le client, chiffré avant stockage (§4.3). */
class LocationDto {
  @IsLatitude()
  latitude!: number;

  @IsLongitude()
  longitude!: number;
}

/** DTO de mise à jour du profil de mobilité (§5.3). Tous les champs sont optionnels (PATCH). */
export class UpdateMobilityProfileDto {
  @IsOptional()
  @IsArray()
  @IsEnum(TransportMode, { each: true })
  preferredModes?: TransportMode[];

  @IsOptional()
  @ValidateNested()
  @Type(() => MobilityConstraintsDto)
  constraints?: MobilityConstraintsDto;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  transportSubscriptions?: string[];

  // Doit être fourni (à true) avant ou en même temps que homeLocation/workLocation (§5.3).
  @IsOptional()
  @IsBoolean()
  geolocationConsent?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => LocationDto)
  homeLocation?: LocationDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => LocationDto)
  workLocation?: LocationDto;
}
