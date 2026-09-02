'use client';

import type { Coordinates, PlannedJourney } from '@urbanflow/shared-types';
import dynamic from 'next/dynamic';
import { useMemo, useState, useSyncExternalStore } from 'react';
import { ApiError } from '../../lib/api-client';
import { confirmTrip } from '../../lib/carbon-api';
import { formatCoordinatesLabel, reverseGeocode } from '../../lib/geocoding-api';
import { getCurrentPosition, RENNES_CENTER } from '../../lib/geolocation';
import { readLastPlan, writeLastPlan } from '../../lib/last-plan-cache';
import { toConfirmTripRequest } from '../../lib/to-confirm-trip-request';
import { planTrip } from '../../lib/trip-api';
import { Button } from '../ui/button';
import { AddressAutocomplete } from './address-autocomplete';
import { MapPlaceholder } from './map-placeholder';
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

// Pas de mise à jour "live" à écouter (le cache n'est modifié que par cette
// page elle-même, jamais en arrière-plan) -- `useSyncExternalStore` n'a
// besoin que du repli serveur pour la sûreté d'hydratation.
function noopSubscribe(): () => void {
  return () => {};
}

/**
 * Résout une adresse lisible pour des coordonnées obtenues hors saisie
 * (géoloc, clic carte) — jamais bloquant : l'appelant affiche déjà les
 * coordonnées brutes en repli avant que cette résolution n'aboutisse, et en
 * cas d'échec du géocodage inversé (réseau, ou IGN sans résultat proche).
 */
async function resolveAddressLabel(
  coordinates: Coordinates,
  setLabel: (label: string) => void,
): Promise<void> {
  try {
    const label = await reverseGeocode(coordinates);
    setLabel(label ?? formatCoordinatesLabel(coordinates));
  } catch {
    setLabel(formatCoordinatesLabel(coordinates));
  }
}

export function TripPlanner() {
  const [origin, setOrigin] = useState<Coordinates | null>(null);
  const [originLabel, setOriginLabel] = useState('');
  const [destination, setDestination] = useState<Coordinates | null>(null);
  const [destinationLabel, setDestinationLabel] = useState('');
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

  // §C5 (éco-conception) : la carte (chunk Leaflet + tuiles OSM) ne se
  // monte qu'au premier besoin réel -- jamais remis à `false` une fois monté.
  const [mapRequested, setMapRequested] = useState(false);
  function requestMap() {
    setMapRequested(true);
  }

  // Restauration après rechargement (§9) : les jetons ne vivant qu'en
  // mémoire, un refresh déconnecte systématiquement -- au retour sur cette
  // page (après reconnexion), on repeuple le formulaire et les résultats
  // depuis le dernier trajet plutôt que de repartir d'un état vide.
  // `useSyncExternalStore` (repli serveur `null`), pas un `useEffect` : le
  // rendu serveur ne peut pas lire `localStorage`, ce repli garantit que le
  // premier rendu client correspond exactement au HTML serveur (pas de
  // mismatch d'hydratation) sans jamais appeler `setState` dans un effet.
  const storedPlan = useSyncExternalStore(noopSubscribe, readLastPlan, () => null);
  // « Ajuster un état quand une prop/valeur externe change » (pattern
  // documenté par React, react.dev/learn/you-might-not-need-an-effect) :
  // comparer à la valeur du rendu précédent via du state, pas une ref (les
  // refs ne peuvent pas être lues pendant le rendu sous cette config lint).
  // `storedPlan` ne change de référence qu'au tout premier rendu après
  // hydratation (repli serveur `null` → valeur réelle) ou après un nouveau
  // `writeLastPlan` (soumission réussie) -- dans ce second cas, ré-appliquer
  // est sans effet, ce sont déjà les valeurs affichées.
  const [appliedPlan, setAppliedPlan] = useState(storedPlan);
  if (storedPlan !== appliedPlan) {
    setAppliedPlan(storedPlan);
    if (storedPlan) {
      setOrigin(storedPlan.origin);
      setOriginLabel(storedPlan.originLabel);
      setDestination(storedPlan.destination);
      setDestinationLabel(storedPlan.destinationLabel);
      setJourneys(storedPlan.plan.journeys);
      setStale(storedPlan.plan.stale);
      setMapRequested(true);
    }
  }

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
      const coordinates = { latitude: position.latitude, longitude: position.longitude };
      setOrigin(coordinates);
      // Adresse lisible affichée dès que le géocodage inversé aboutit ;
      // les coordonnées brutes servent de repli immédiat pendant la résolution.
      setOriginLabel(formatCoordinatesLabel(coordinates));
      setAccuracyMeters(position.accuracyMeters);
      setClickTarget('destination');
      setGeoStatus('idle');
      void resolveAddressLabel(coordinates, setOriginLabel);
    } catch (error) {
      setGeoStatus('error');
      setGeoMessage(error instanceof Error ? error.message : 'Géolocalisation indisponible.');
      setAccuracyMeters(null);
      // Repli explicite (§6) : centre métropole, jamais imposé silencieusement
      // — uniquement si aucune origine n'était déjà posée.
      if (!origin) {
        setOrigin(RENNES_CENTER);
        setOriginLabel(formatCoordinatesLabel(RENNES_CENTER));
        void resolveAddressLabel(RENNES_CENTER, setOriginLabel);
      }
    }
  }

  function handleMapClick(coordinates: Coordinates) {
    if (clickTarget === 'origin') {
      setOrigin(coordinates);
      setOriginLabel(formatCoordinatesLabel(coordinates));
      setAccuracyMeters(null);
      setClickTarget('destination');
      void resolveAddressLabel(coordinates, setOriginLabel);
    } else {
      setDestination(coordinates);
      setDestinationLabel(formatCoordinatesLabel(coordinates));
      void resolveAddressLabel(coordinates, setDestinationLabel);
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
      writeLastPlan({ origin, originLabel, destination, destinationLabel, plan: result });
    } catch (error) {
      const stored = readLastPlan();
      if (stored) {
        setJourneys(stored.plan.journeys);
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

          <AddressAutocomplete
            id="origin"
            label="Origine"
            addressLabel={originLabel}
            onFocus={requestMap}
            onSelect={(coordinates, label) => {
              setOrigin(coordinates);
              setOriginLabel(label);
              setAccuracyMeters(null);
            }}
          />
          <AddressAutocomplete
            id="destination"
            label="Destination"
            addressLabel={destinationLabel}
            onFocus={requestMap}
            onSelect={(coordinates, label) => {
              setDestination(coordinates);
              setDestinationLabel(label);
            }}
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
            {mapRequested ? (
              <TripMap
                origin={origin}
                destination={destination}
                onMapClick={handleMapClick}
                selectedJourney={selectedJourney}
              />
            ) : (
              <MapPlaceholder onShow={requestMap} />
            )}
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
