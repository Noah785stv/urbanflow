import {
  Departure,
  JourneyOption,
  JourneyQuery,
  StationStatus,
  TransportMode,
} from '@urbanflow/shared-types';

/**
 * Contrat commun à tout provider de transport (§5 — abstraction
 * `TransportProvider`). Les interfaces ci-dessous sont **ségréguées**
 * (principe ISP) : un provider n'implémente que ce qu'il sait faire. Ajouter
 * un opérateur = implémenter l'interface adéquate et l'enregistrer dans
 * `IntegrationModule` (token `TRANSPORT_PROVIDERS`), sans toucher au cœur
 * (`ProviderRegistry`, contrôleurs).
 */
export interface TransportProvider {
  readonly id: string;
  readonly modes: TransportMode[];
  isAvailable(): Promise<boolean>;
}

/** Provider de mobilité partagée (vélos/trottinettes) — GBFS. */
export interface SharedMobilityProvider extends TransportProvider {
  syncStations(): Promise<void>;
  getStationStatus(externalIds: string[]): Promise<StationStatus[]>;
}

/** Provider de transport en commun — prochains passages à un arrêt. */
export interface TransitProvider extends TransportProvider {
  getDepartures(stopId: string): Promise<Departure[]>;
}

/** Provider de calcul d'itinéraire — brique routing consommée par F2. */
export interface RoutingProvider extends TransportProvider {
  getJourneys(query: JourneyQuery): Promise<JourneyOption[]>;
}

export function isSharedMobilityProvider(
  provider: TransportProvider,
): provider is SharedMobilityProvider {
  return (
    typeof (provider as Partial<SharedMobilityProvider>).syncStations ===
    'function'
  );
}

export function isTransitProvider(
  provider: TransportProvider,
): provider is TransitProvider {
  return (
    typeof (provider as Partial<TransitProvider>).getDepartures === 'function'
  );
}

export function isRoutingProvider(
  provider: TransportProvider,
): provider is RoutingProvider {
  return (
    typeof (provider as Partial<RoutingProvider>).getJourneys === 'function'
  );
}
