'use client';

import type { PlannedJourney } from '@urbanflow/shared-types';
import { useId } from 'react';
import { formatCo2, formatCost, formatDistance, formatDuration } from '../../lib/format';
import { JOURNEY_LABEL_TEXT, MODE_COLORS, MODE_INITIALS, MODE_LABELS } from '../../lib/mode-labels';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { ModeChip } from '../ui/mode-chip';
import { RankingBadge } from '../ui/ranking-badge';

export type ConfirmTripStatus = 'idle' | 'pending' | 'success' | 'error';

interface TripResultCardProps {
  journey: PlannedJourney;
  isSelected: boolean;
  onSelect: () => void;
  /** Confirmation du trajet (F4-web-dashboard §6) — n'a de sens que si `isSelected`. */
  confirmStatus?: ConfirmTripStatus;
  confirmError?: string | null;
  onConfirm?: () => void;
}

/**
 * Une carte par option (§8). La sélection est portée par le texte du bouton
 * ET la mise en valeur du cadre — jamais par la couleur seule (§11 AA).
 */
export function TripResultCard({
  journey,
  isSelected,
  onSelect,
  confirmStatus = 'idle',
  confirmError = null,
  onConfirm,
}: TripResultCardProps) {
  const summaryId = useId();

  return (
    <li>
      <Card selected={isSelected}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            {journey.labels.map((label) => (
              <RankingBadge key={label} variant={label}>
                {JOURNEY_LABEL_TEXT[label]}
              </RankingBadge>
            ))}
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={onSelect}
            aria-pressed={isSelected}
            aria-describedby={summaryId}
            className="text-sm"
          >
            {isSelected ? '✓ Sélectionné' : 'Sélectionner'}
          </Button>
        </div>

        <dl id={summaryId} className="mt-3 grid grid-cols-3 gap-2 text-sm">
          <div>
            <dt className="text-ink-600">Durée</dt>
            <dd className="font-mono font-medium text-ink-900">
              {formatDuration(journey.durationSeconds)}
            </dd>
          </div>
          <div>
            <dt className="text-ink-600">CO₂</dt>
            <dd className="font-mono font-medium text-ink-900">{formatCo2(journey.co2Grams)}</dd>
          </div>
          <div>
            <dt className="text-ink-600">Coût</dt>
            <dd className="font-mono font-medium text-ink-900">
              {formatCost(journey.estimatedCostCents)}
            </dd>
          </div>
        </dl>

        <ol className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-ink-600">
          {journey.sections.map((section, index) => (
            <li key={`${section.mode}-${index}`} className="flex items-center gap-1">
              {index > 0 && (
                <span aria-hidden="true" className="mr-2">
                  →
                </span>
              )}
              <ModeChip
                color={MODE_COLORS[section.mode]}
                initial={MODE_INITIALS[section.mode]}
                label={MODE_LABELS[section.mode]}
              />
              <span className="font-mono">
                ({formatDuration(section.durationSeconds)}, {formatDistance(section.distanceMeters)}
                )
              </span>
            </li>
          ))}
        </ol>

        {isSelected && (
          <div className="mt-3 border-t border-line-200 pt-3">
            <p className="text-sm font-semibold text-ink-900">Détail de l’itinéraire</p>
            <ol className="mt-2 flex flex-col gap-1 text-sm text-ink-900">
              {journey.sections.map((section, index) => (
                <li key={`detail-${section.mode}-${index}`}>
                  {section.line ? (
                    <>
                      <span className="font-semibold">
                        {MODE_LABELS[section.mode]} {section.line}
                      </span>
                      {section.headsign && <> direction {section.headsign}</>}
                      {section.fromStopName && section.toStopName && (
                        <>
                          {' '}
                          — de {section.fromStopName} à {section.toStopName}
                        </>
                      )}{' '}
                      ({formatDuration(section.durationSeconds)})
                    </>
                  ) : (
                    <>
                      {MODE_LABELS[section.mode]} ({formatDuration(section.durationSeconds)},{' '}
                      {formatDistance(section.distanceMeters)})
                    </>
                  )}
                </li>
              ))}
            </ol>
          </div>
        )}

        {isSelected && onConfirm && (
          <div className="mt-3 border-t border-line-200 pt-3">
            {confirmStatus === 'success' ? (
              <p role="status" className="text-sm font-medium text-brand-green-700">
                ✓ Trajet enregistré dans votre tableau de bord carbone.
              </p>
            ) : (
              <>
                <Button
                  type="button"
                  onClick={onConfirm}
                  disabled={confirmStatus === 'pending'}
                  className="text-sm"
                >
                  {confirmStatus === 'pending' ? 'Enregistrement…' : 'Enregistrer ce trajet'}
                </Button>
                {confirmStatus === 'error' && confirmError && (
                  <p className="mt-2 text-sm font-medium text-alert-600">{confirmError}</p>
                )}
              </>
            )}
          </div>
        )}
      </Card>
    </li>
  );
}
