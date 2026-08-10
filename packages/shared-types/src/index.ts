/**
 * Types partagés front <-> back.
 * Reflète le lexique métier univoque du dossier (§4.2) : Trip, Segment, Mode.
 */

/**
 * Mode : un moyen de transport (cf. facteurs d'émission §4.7).
 *
 * Objet const plutôt qu'`enum` TypeScript : `shared-types` est consommé comme
 * source `.ts` brute (pas de build, cf. `package.json`), y compris par `node`
 * exécutant du JS déjà compilé (`start:prod`) via le "type-stripping" natif
 * de Node — qui n'effuille que les syntaxes TS effaçables. `enum` génère du
 * code runtime et n'en fait pas partie ; ce pattern (objet + type dérivé) si.
 */
export const TransportMode = {
  Walk: 'walk',
  Bike: 'bike',
  ElectricBike: 'electric_bike',
  Scooter: 'scooter',
  Metro: 'metro',
  Tram: 'tram',
  Bus: 'bus',
  RegionalTrain: 'regional_train',
  CarSolo: 'car_solo',
  Carpool: 'carpool',
} as const;

export type TransportMode = (typeof TransportMode)[keyof typeof TransportMode];

/** Point géographique en WGS84. */
export interface Coordinates {
  latitude: number;
  longitude: number;
}

/** Segment : portion d'un Trip effectuée sur un seul Mode. */
export interface Segment {
  mode: TransportMode;
  distanceKm: number;
  co2Grams: number;
}

/** Trip : déplacement complet d'un point A à un point B. */
export interface Trip {
  origin: Coordinates;
  destination: Coordinates;
  segments: Segment[];
  totalDistanceKm: number;
  totalCo2Grams: number;
}

/**
 * Type de station (§4.1, F3). Objet const plutôt qu'`enum` TypeScript — même
 * contrainte que `TransportMode` (voir CLAUDE.md : `shared-types` n'a pas
 * d'étape de build, seules les constructions TS effaçables sont autorisées).
 */
export const StationType = {
  Bike: 'bike',
  Scooter: 'scooter',
  Dock: 'dock',
  TransitStop: 'transit_stop',
} as const;

export type StationType = (typeof StationType)[keyof typeof StationType];

/** Station : point d'accès physique, vélo/trottinette partagé ou arrêt (§4.1). */
export interface Station {
  id: string;
  provider: string;
  externalId: string;
  name: string;
  stationType: StationType;
  location: Coordinates;
  capacity: number | null;
}

/**
 * Statut temps réel d'une station partagée (§4.2). Jamais persisté (Redis
 * uniquement). `stale: true` signale une donnée servie en mode dégradé
 * (§7) — la source n'a pas pu être rafraîchie mais une dernière valeur
 * connue est disponible.
 */
export interface StationStatus {
  provider: string;
  externalId: string;
  bikesAvailable: number;
  docksAvailable: number;
  updatedAt: string;
  stale: boolean;
}

/** Prochain passage à un arrêt de transport en commun (§8). */
export interface Departure {
  stopId: string;
  line: string;
  direction: string;
  mode: TransportMode;
  scheduledAt: string;
  updatedAt: string;
  stale: boolean;
}

/** Requête de calcul d'itinéraire, consommée par le RoutingProvider (F2). */
export interface JourneyQuery {
  origin: Coordinates;
  destination: Coordinates;
  datetime?: string;
}

/** Section d'un itinéraire : portion effectuée sur un seul Mode. */
export interface JourneySection {
  mode: TransportMode;
  durationSeconds: number;
  distanceMeters: number;
}

/** Option d'itinéraire retournée par `RoutingProvider.getJourneys` (consommée par F2). */
export interface JourneyOption {
  departureAt: string;
  arrivalAt: string;
  durationSeconds: number;
  sections: JourneySection[];
}
