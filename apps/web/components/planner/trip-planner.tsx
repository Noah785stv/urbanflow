'use client';

import type { Coordinates, PlannedJourney } from '@urbanflow/shared-types';
import dynamic from 'next/dynamic';
import { useState } from 'react';
import { ApiError } from '../../lib/api-client';
import { getCurrentPosition, RENNES_CENTER } from '../../lib/geolocation';
import { readLastPlan, writeLastPlan } from '../../lib/last-plan-cache';
import {
  ERROR_TEXT_CLASS,
  HINT_TEXT_CLASS,
  PRIMARY_BUTTON_CLASS,
  SECONDARY_BUTTON_CLASS,
} from '../../lib/styles';
import { planTrip } from '../../lib/trip-api';
import { CoordinateFields } from './coordinate-fields';
import { TripResults } from './trip-results';

const TripMap = dynamic(() => import('./trip-map'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full min-h-[320px] w-full items-center justify-center rounded border border-zinc-300 bg-zinc-100 text-zinc-700">
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

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 md:p-6">
      <h1 className="text-2xl font-bold text-zinc-900">Planifier un trajet</h1>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => {
                void handleUseMyPosition();
              }}
              disabled={geoStatus === 'loading'}
              className={SECONDARY_BUTTON_CLASS}
            >
              {geoStatus === 'loading' ? 'Localisation…' : 'Utiliser ma position'}
            </button>
            {accuracyMeters !== null && (
              <span className={HINT_TEXT_CLASS}>Précision : ±{Math.round(accuracyMeters)} m</span>
            )}
          </div>
          {geoMessage && <p className={ERROR_TEXT_CLASS}>{geoMessage}</p>}

          <fieldset className="flex flex-col gap-1">
            <legend className={HINT_TEXT_CLASS}>Clic sur la carte : définir…</legend>
            <div className="flex gap-2" role="radiogroup" aria-label="Cible du clic sur la carte">
              <button
                type="button"
                aria-pressed={clickTarget === 'origin'}
                onClick={() => setClickTarget('origin')}
                className={`${SECONDARY_BUTTON_CLASS} text-sm ${clickTarget === 'origin' ? 'border-blue-700 bg-blue-50' : ''}`}
              >
                Origine
              </button>
              <button
                type="button"
                aria-pressed={clickTarget === 'destination'}
                onClick={() => setClickTarget('destination')}
                className={`${SECONDARY_BUTTON_CLASS} text-sm ${clickTarget === 'destination' ? 'border-blue-700 bg-blue-50' : ''}`}
              >
                Destination
              </button>
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
            <p id="calculate-hint" className={HINT_TEXT_CLASS}>
              Renseignez une origine et une destination pour calculer un itinéraire.
            </p>
          )}

          <button
            type="submit"
            disabled={!canSubmit}
            aria-describedby={!canSubmit ? 'calculate-hint' : undefined}
            className={PRIMARY_BUTTON_CLASS}
          >
            {isPlanning ? 'Calcul en cours…' : 'Calculer'}
          </button>

          {planError && <p className={ERROR_TEXT_CLASS}>{planError}</p>}
          {isOffline && (
            <p className="text-sm text-amber-900">
              Hors-ligne : affichage du dernier trajet calculé avec succès.
            </p>
          )}

          <div className="h-80 md:h-[28rem]">
            <TripMap origin={origin} destination={destination} onMapClick={handleMapClick} />
          </div>
        </form>

        <TripResults
          journeys={journeys}
          stale={stale}
          selectedIndex={selectedIndex}
          onSelect={setSelectedIndex}
        />
      </div>
    </div>
  );
}
