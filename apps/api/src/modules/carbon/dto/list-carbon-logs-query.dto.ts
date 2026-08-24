import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export const MIN_PAGE = 1;
export const MIN_LIMIT = 1;
export const MAX_LIMIT = 100;
export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 20;

/** Requête `GET /carbon-logs` (F4 §7) — pagination ; fenêtre 12 mois glissants appliquée par le service. */
export class ListCarbonLogsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(MIN_PAGE)
  page: number = DEFAULT_PAGE;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(MIN_LIMIT)
  @Max(MAX_LIMIT)
  limit: number = DEFAULT_LIMIT;
}
