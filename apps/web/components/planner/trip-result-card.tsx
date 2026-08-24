'use client';

import type { PlannedJourney } from '@urbanflow/shared-types';
import { useId } from 'react';
import { formatCo2, formatCost, formatDistance, formatDuration } from '../../lib/format';
import { JOURNEY_LABEL_TEXT, MODE_LABELS } from '../../lib/mode-labels';
import { SECONDARY_BUTTON_CLASS } from '../../lib/styles';

interface TripResultCardProps {
  journey: PlannedJourney;
  isSelected: boolean;
  onSelect: () => void;
}

/**
 * Une carte par option (§8). La sélection est portée par le texte du bouton
 * ET la mise en valeur du cadre — jamais par la couleur seule (§11 AA).
 */
export function TripResultCard({ journey, isSelected, onSelect }: TripResultCardProps) {
  const summaryId = useId();

  return (
    <li
      className={`rounded border p-4 ${
        isSelected ? 'border-blue-700 bg-blue-50' : 'border-zinc-300 bg-white'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          {journey.labels.map((label) => (
            <span
              key={label}
              className="rounded-full bg-blue-700 px-2 py-0.5 text-xs font-semibold text-white"
            >
              {JOURNEY_LABEL_TEXT[label]}
            </span>
          ))}
        </div>
        <button
          type="button"
          onClick={onSelect}
          aria-pressed={isSelected}
          aria-describedby={summaryId}
          className={`${SECONDARY_BUTTON_CLASS} text-sm`}
        >
          {isSelected ? '✓ Sélectionné' : 'Sélectionner'}
        </button>
      </div>

      <dl id={summaryId} className="mt-3 grid grid-cols-3 gap-2 text-sm">
        <div>
          <dt className="text-zinc-700">Durée</dt>
          <dd className="font-semibold text-zinc-900">{formatDuration(journey.durationSeconds)}</dd>
        </div>
        <div>
          <dt className="text-zinc-700">CO₂</dt>
          <dd className="font-semibold text-zinc-900">{formatCo2(journey.co2Grams)}</dd>
        </div>
        <div>
          <dt className="text-zinc-700">Coût</dt>
          <dd className="font-semibold text-zinc-900">{formatCost(journey.estimatedCostCents)}</dd>
        </div>
      </dl>

      <ol className="mt-3 flex flex-wrap items-center gap-x-1 gap-y-1 text-sm text-zinc-700">
        {journey.sections.map((section, index) => (
          <li key={`${section.mode}-${index}`} className="flex items-center gap-1">
            {index > 0 && <span aria-hidden="true">→</span>}
            <span>
              {MODE_LABELS[section.mode]} ({formatDuration(section.durationSeconds)},{' '}
              {formatDistance(section.distanceMeters)})
            </span>
          </li>
        ))}
      </ol>
    </li>
  );
}
