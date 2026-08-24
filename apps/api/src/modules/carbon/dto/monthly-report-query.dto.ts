import { Matches } from 'class-validator';

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

/** Requête `GET /carbon-logs/report` (F4 §8) — bilan PDF d'un mois donné. */
export class MonthlyReportQueryDto {
  @Matches(MONTH_PATTERN, { message: 'month doit être au format YYYY-MM' })
  month!: string;
}
