import type { CarbonLogSummary } from '@urbanflow/shared-types';
import { formatCo2 } from '../../lib/format';

interface SummaryCardsProps {
  summary: CarbonLogSummary;
}

const tripCount = (summary: CarbonLogSummary): number =>
  summary.monthly.reduce((total, month) => total + month.tripCount, 0);

/** Cartes de résumé (§7) : CO₂ cumulé, économies vs voiture solo, nombre de trajets. */
export function SummaryCards({ summary }: SummaryCardsProps) {
  return (
    <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div className="rounded border border-zinc-300 bg-white p-4">
        <dt className="text-sm text-zinc-700">CO₂ cumulé (12 mois)</dt>
        <dd className="mt-1 text-2xl font-bold text-zinc-900">
          {formatCo2(summary.totalCo2Grams)}
        </dd>
      </div>
      <div className="rounded border border-green-700 bg-green-50 p-4">
        <dt className="text-sm text-green-900">Économisé vs voiture solo</dt>
        <dd className="mt-1 text-2xl font-bold text-green-900">
          {formatCo2(summary.totalSavedGrams)}
        </dd>
      </div>
      <div className="rounded border border-zinc-300 bg-white p-4">
        <dt className="text-sm text-zinc-700">Trajets confirmés</dt>
        <dd className="mt-1 text-2xl font-bold text-zinc-900">{tripCount(summary)}</dd>
      </div>
    </dl>
  );
}
