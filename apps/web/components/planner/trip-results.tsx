'use client';

import type { PlannedJourney } from '@urbanflow/shared-types';
import { TripResultCard } from './trip-result-card';

interface TripResultsProps {
  journeys: PlannedJourney[];
  stale: boolean;
  selectedIndex: number | null;
  onSelect: (index: number) => void;
}

function announcementFor(journeys: PlannedJourney[], stale: boolean): string {
  if (journeys.length > 0) {
    const suffix = journeys.length > 1 ? 's' : '';
    const staleNote = stale ? ' (données possiblement obsolètes)' : '';
    return `${journeys.length} itinéraire${suffix} trouvé${suffix}${staleNote}.`;
  }
  if (stale) {
    return 'Service de calcul d’itinéraire temporairement indisponible. Réessayez dans quelques instants.';
  }
  return 'Aucun itinéraire trouvé pour ce trajet.';
}

/** Liste sémantique des résultats (§8) — région live pour annoncer le calcul (§11). */
export function TripResults({ journeys, stale, selectedIndex, onSelect }: TripResultsProps) {
  return (
    <section aria-labelledby="results-heading" className="flex flex-col gap-3">
      <h2 id="results-heading" className="text-lg font-bold text-zinc-900">
        Itinéraires
      </h2>

      <p role="status" className="text-sm text-zinc-700">
        {announcementFor(journeys, stale)}
      </p>

      {stale && journeys.length > 0 && (
        <p className="rounded border border-amber-600 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          ⚠ Ces résultats peuvent être obsolètes (source de données temporairement indisponible).
        </p>
      )}

      {journeys.length > 0 && (
        <ol className="flex flex-col gap-3">
          {journeys.map((journey, index) => (
            <TripResultCard
              key={`${journey.departureAt}-${index}`}
              journey={journey}
              isSelected={selectedIndex === index}
              onSelect={() => onSelect(index)}
            />
          ))}
        </ol>
      )}
    </section>
  );
}
