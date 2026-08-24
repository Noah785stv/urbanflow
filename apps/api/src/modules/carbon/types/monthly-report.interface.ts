import { ModeBreakdownEntry } from '@urbanflow/shared-types';

/**
 * Agrégats d'un mois pour le bilan PDF (F4 §8). Type interne à l'API : le
 * PDF est le seul format d'échange de ce endpoint, pas de JSON équivalent à
 * partager avec le front (à la différence de `CarbonLogSummary`, F4 §7).
 */
export interface MonthlyReport {
  /** Format `YYYY-MM`. */
  month: string;
  co2Grams: number;
  savedGrams: number;
  tripCount: number;
  modeBreakdown: ModeBreakdownEntry[];
}
