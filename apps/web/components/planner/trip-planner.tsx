'use client';

import type { Coordinates, PlannedJourney } from '@urbanflow/shared-types';
import dynamic from 'next/dynamic';
import { useMemo, useState } from 'react';
import { ApiError } from '../../lib/api-client';
import { confirmTrip } from '../../lib/carbon-api';
import { getCurrentPosition, RENNES_CENTER } from '../../lib/geolocation';
import { readLastPlan, writeLastPlan } from '../../lib/last-plan-cache';
import { toConfirmTripRequest } from '../../lib/to-confirm-trip-request';
import { planTrip } from '../../lib/trip-api';
import { Button } from '../ui/button';
import { CoordinateFields } from './coordinate-fields';
import type { ConfirmTripStatus } from './trip-result-card';
import { TripResults } from './trip-results';

const TripMap = dynamic(() => import('./trip-map'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full min-h-[320px] w-full items-center justify-center rounded border border-line-200 bg-surface-50 text-ink-600">
      Chargement de la carte…
    </div>
  ),
});

type ClickTarget = 'origin' | 'destination';
type GeoStatus = 'idle' | 'loading' | 'error';

export function TripPlanner() {
  const [origin, setOrigin] = useState<Coordinates | null>(null);
  const [destination, setDestination] = useState<Coordinates | null>(null);
  const [accuracyMeters, setAccuracyMeters] = useState<number | null>(null);
  const [clickTarget, setClickTarget] = useState<ClickTarget>('origin');
  const [geoStatus, setGeoStatus] = useState<GeoStatus>('idle');
  const [geoMessage, setGeoMessage] = useState<string | null>(null);

  const [isPlanning, setIsPlanning] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);
  const [journeys, setJourneys] = useState<PlannedJourney[]>([]);
  const [stale, setStale] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isOffline, setIsOffline] = useState(false);

  const [confirmStatus, setConfirmStatus] = useState<ConfirmTripStatus>('idle');
  const [confirmError, setConfirmError] = useState<string | null>(null);

  function handleSelect(index: number) {
    setSelectedIndex(index);
    setConfirmStatus('idle');
    setConfirmError(null);
  }

  async function handleUseMyPosition() {
    setGeoStatus('loading');
    setGeoMessage(null);
    try {
      const position = await getCurrentPosition();
      setOrigin({ latitude: position.latitude, longitude: position.longitude });
      setAccuracyMeters(position.accuracyMeters);
      setClickTarget('destination');
      setGeoStatus('idle');
    } catch (error) {
      setGeoStatus('error');
      setGeoMessage(error instanceof Error ? error.message : 'Géolocalisation indisponible.');
      // Repli explicite (§6) : centre métropole, jamais imposé silencieusement.
      setOrigin((current) => current ?? RENNES_CENTER);
      setAccuracyMeters(null);
    }
  }

  function handleMapClick(coordinates: Coordinates) {
    if (clickTarget === 'origin') {
      setOrigin(coordinates);
      setAccuracyMeters(null);
      setClickTarget('destination');
    } else {
      setDestination(coordinates);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!origin || !destination) {
      return;
    }

    setIsPlanning(true);
    setPlanError(null);
    setSelectedIndex(null);
    setIsOffline(false);
    setConfirmStatus('idle');
    setConfirmError(null);

    try {
      const result = await planTrip({ from: origin, to: destination });
      setJourneys(result.journeys);
      setStale(result.stale);
      writeLastPlan(result);
    } catch (error) {
      const lastPlan = readLastPlan();
      if (lastPlan) {
        setJourneys(lastPlan.journeys);
        setStale(true);
        setIsOffline(true);
      } else {
        setJourneys([]);
        setStale(false);
        setPlanError(
          error instanceof ApiError
            ? error.message
            : 'Calcul impossible pour le moment. Réessayez.',
        );
      }
    } finally {
      setIsPlanning(false);
    }
  }

  const canSubmit = Boolean(origin && destination) && !isPlanning;
  const selectedJourney = useMemo(
    () => (selectedIndex !== null ? (journeys[selectedIndex] ?? null) : null),
    [journeys, selectedIndex],
  );

  async function handleConfirmTrip() {
    if (!selectedJourney) {
      return;
    }

    setConfirmStatus('pending');
    setConfirmError(null);

    try {
      await confirmTrip(toConfirmTripRequest(selectedJourney));
      setConfirmStatus('success');
    } catch (error) {
      setConfirmStatus('error');
      setConfirmError(
        error instanceof ApiError ? error.message : 'Enregistrement impossible pour le moment.',
      );
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 md:p-6">
      <h1 className="text-[26px] font-semibold leading-[31px] text-ink-900">Planifier un trajet</h1>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                void handleUseMyPosition();
              }}
              disabled={geoStatus === 'loading'}
            >
              {geoStatus === 'loading' ? 'Localisation…' : 'Utiliser ma position'}
            </Button>
            {accuracyMeters !== null && (
              <span className="text-sm text-ink-600">
                Précision : ±{Math.round(accuracyMeters)} m
              </span>
            )}
          </div>
          {geoMessage && <p className="text-sm font-medium text-alert-600">{geoMessage}</p>}

          <fieldset className="flex flex-col gap-1">
            <legend className="text-sm text-ink-600">Clic sur la carte : définir…</legend>
            <div className="flex gap-2" role="radiogroup" aria-label="Cible du clic sur la carte">
              <Button
                type="button"
                variant="secondary"
                aria-pressed={clickTarget === 'origin'}
                onClick={() => setClickTarget('origin')}
                className={`text-sm ${clickTarget === 'origin' ? 'border-brand-blue-700 bg-brand-blue-50' : ''}`}
              >
                Origine
              </Button>
              <Button
                type="button"
                variant="secondary"
                aria-pressed={clickTarget === 'destination'}
                onClick={() => setClickTarget('destination')}
                className={`text-sm ${clickTarget === 'destination' ? 'border-brand-blue-700 bg-brand-blue-50' : ''}`}
              >
                Destination
              </Button>
            </div>
          </fieldset>

          <CoordinateFields
            legend="Origine"
            idPrefix="origin"
            value={origin}
            onChange={(coordinates) => {
              setOrigin(coordinates);
              setAccuracyMeters(null);
            }}
          />
          <CoordinateFields
            legend="Destination"
            idPrefix="destination"
            value={destination}
            onChange={setDestination}
          />

          {!canSubmit && !isPlanning && (
            <p id="calculate-hint" className="text-sm text-ink-600">
              Renseignez une origine et une destination pour calculer un itinéraire.
            </p>
          )}

          <Button
            type="submit"
            disabled={!canSubmit}
            aria-describedby={!canSubmit ? 'calculate-hint' : undefined}
          >
            {isPlanning ? 'Calcul en cours…' : 'Calculer'}
          </Button>

          {planError && <p className="text-sm font-medium text-alert-600">{planError}</p>}
          {isOffline && (
            <p className="text-sm text-amber-900">
              Hors-ligne : affichage du dernier trajet calculé avec succès.
            </p>
          )}

          <div className="h-80 md:h-[28rem]">
            <TripMap
              origin={origin}
              destination={destination}
              onMapClick={handleMapClick}
              selectedJourney={selectedJourney}
            />
          </div>
        </form>

        <TripResults
          journeys={journeys}
          stale={stale}
          selectedIndex={selectedIndex}
          onSelect={handleSelect}
          confirmStatus={confirmStatus}
          confirmError={confirmError}
          onConfirm={() => {
            void handleConfirmTrip();
          }}
        />
      </div>
    </div>
  );
}
