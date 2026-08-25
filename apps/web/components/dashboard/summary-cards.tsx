import type { CarbonLogSummary } from '@urbanflow/shared-types';
import { formatCo2 } from '../../lib/format';
import { Card } from '../ui/card';

interface SummaryCardsProps {
  summary: CarbonLogSummary;
}

const tripCount = (summary: CarbonLogSummary): number =>
  summary.monthly.reduce((total, month) => total + month.tripCount, 0);

/** Cartes de résumé (§7) : CO₂ cumulé, économies vs voiture solo, nombre de trajets. */
export function SummaryCards({ summary }: SummaryCardsProps) {
  return (
    <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <Card>
        <dt className="text-sm text-ink-600">CO₂ cumulé (12 mois)</dt>
        <dd className="mt-1 font-mono text-[34px] font-semibold leading-[39px] text-ink-900">
          {formatCo2(summary.totalCo2Grams)}
        </dd>
      </Card>
      <div className="rounded-card border border-brand-green-700 bg-brand-green-50 p-4">
        <dt className="text-sm text-brand-green-900">Économisé vs voiture solo</dt>
        <dd className="mt-1 font-mono text-[34px] font-semibold leading-[39px] text-brand-green-900">
          {formatCo2(summary.totalSavedGrams)}
        </dd>
      </div>
      <Card>
        <dt className="text-sm text-ink-600">Trajets confirmés</dt>
        <dd className="mt-1 font-mono text-[34px] font-semibold leading-[39px] text-ink-900">
          {tripCount(summary)}
        </dd>
      </Card>
    </dl>
  );
}
