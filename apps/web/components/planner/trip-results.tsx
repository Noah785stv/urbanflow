'use client';

import type { PlannedJourney } from '@urbanflow/shared-types';
import { useMemo, useState } from 'react';
import { Button } from '../ui/button';
import { TripResultCard, type ConfirmTripStatus } from './trip-result-card';

interface TripResultsProps {
  journeys: PlannedJourney[];
  stale: boolean;
  selectedIndex: number | null;
  onSelect: (index: number) => void;
  confirmStatus?: ConfirmTripStatus;
  confirmError?: string | null;
  onConfirm?: () => void;
}

type SortCriterion = 'duration' | 'co2' | 'cost';

const SORT_OPTIONS: { value: SortCriterion; label: string }[] = [
  { value: 'duration', label: 'Durée' },
  { value: 'co2', label: 'CO₂' },
  { value: 'cost', label: 'Coût' },
];

/**
 * Valeur de tri par critère — toujours croissant (meilleur en premier),
 * cohérent avec la sémantique des labels existants (§8 : « le plus
 * rapide »/« le plus écologique »/« le moins cher » désignent tous une
 * valeur minimale). Un coût inconnu (`null`, §5.3) est trié en dernier
 * plutôt que traité comme 0 -- ce n'est pas gratuit, juste non estimé.
 */
function sortValue(journey: PlannedJourney, criterion: SortCriterion): number {
  switch (criterion) {
    case 'duration':
      return journey.durationSeconds;
    case 'co2':
      return journey.co2Grams;
    case 'cost':
      return journey.estimatedCostCents ?? Number.POSITIVE_INFINITY;
  }
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
export function TripResults({
  journeys,
  stale,
  selectedIndex,
  onSelect,
  confirmStatus,
  confirmError,
  onConfirm,
}: TripResultsProps) {
  const [sortBy, setSortBy] = useState<SortCriterion>('duration');

  // Trie une copie associant chaque trajet à son index d'origine : `onSelect`
  // et `selectedIndex` (portés par le parent) référencent toujours la
  // position dans `journeys`, jamais l'ordre d'affichage -- la sélection
  // reste donc correcte quel que soit le tri choisi.
  const sortedEntries = useMemo(
    () =>
      journeys
        .map((journey, originalIndex) => ({ journey, originalIndex }))
        .sort((a, b) => sortValue(a.journey, sortBy) - sortValue(b.journey, sortBy)),
    [journeys, sortBy],
  );

  return (
    <section aria-labelledby="results-heading" className="flex flex-col gap-3">
      <h2 id="results-heading" className="text-[20px] font-semibold leading-[26px] text-ink-900">
        Itinéraires
      </h2>

      <p role="status" className="text-sm text-ink-600">
        {announcementFor(journeys, stale)}
      </p>

      {stale && journeys.length > 0 && (
        <p className="rounded border border-amber-600 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          ⚠ Ces résultats peuvent être obsolètes (source de données temporairement indisponible).
        </p>
      )}

      {journeys.length > 1 && (
        <fieldset className="flex flex-col gap-1">
          <legend className="text-sm text-ink-600">Trier par</legend>
          <div className="flex gap-2" role="radiogroup" aria-label="Critère de tri des itinéraires">
            {SORT_OPTIONS.map((option) => (
              <Button
                key={option.value}
                type="button"
                variant="secondary"
                aria-pressed={sortBy === option.value}
                onClick={() => setSortBy(option.value)}
                className={`text-sm ${sortBy === option.value ? 'border-brand-blue-700 bg-brand-blue-50' : ''}`}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </fieldset>
      )}

      {journeys.length > 0 && (
        <ol className="flex flex-col gap-3">
          {sortedEntries.map(({ journey, originalIndex }) => (
            <TripResultCard
              key={`${journey.departureAt}-${originalIndex}`}
              journey={journey}
              isSelected={selectedIndex === originalIndex}
              onSelect={() => onSelect(originalIndex)}
              confirmStatus={selectedIndex === originalIndex ? confirmStatus : undefined}
              confirmError={selectedIndex === originalIndex ? confirmError : undefined}
              onConfirm={selectedIndex === originalIndex ? onConfirm : undefined}
            />
          ))}
        </ol>
      )}
    </section>
  );
}
