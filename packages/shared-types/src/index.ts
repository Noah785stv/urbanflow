/**
 * Types partagés front <-> back.
 * Reflète le lexique métier univoque du dossier (§4.2) : Trip, Segment, Mode.
 * Les types `Trip`/`Segment` d'origine (scaffolding pré-F2) ont été retirés,
 * non utilisés : le vocabulaire `Trip`/`Segment` du dossier est aujourd'hui
 * porté par `JourneyOption`/`PlannedJourney`/`JourneySection` (F2) et
 * `CarbonLog`/`ModeBreakdownEntry` (F4).
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

/**
 * Résultat de `GET /stations/nearby` (§4.1, §8) — une station enrichie de sa
 * distance et de son statut temps réel. Composite backend-only jusqu'ici
 * (`stations.service.ts`) ; ajouté ici pour que le front ne le redéfinisse
 * pas de son côté (Lot GBFS, `docs/specs/web-gbfs-stations.md` §4).
 */
export interface StationNearbyResult {
  station: Station;
  distanceMeters: number;
  status: StationStatus | null;
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
  /**
   * Polyligne encodée (format Google, précision 5) du tracé du tronçon
   * (F2-geometry §3-4). Transportée encodée jusqu'au front pour sobriété du
   * payload — décodée côté client, jamais côté serveur. Optionnelle : un
   * tronçon sans géométrie connue ne doit jamais faire échouer le calcul
   * carbone, le coût ou le classement, qui n'en dépendent pas.
   */
  geometry?: string;
}

/** Option d'itinéraire retournée par `RoutingProvider.getJourneys` (consommée par F2). */
export interface JourneyOption {
  departureAt: string;
  arrivalAt: string;
  durationSeconds: number;
  sections: JourneySection[];
}

/** Étiquette de classement d'un itinéraire planifié (F2, §5.1). */
export type JourneyLabel = 'fastest' | 'greenest' | 'cheapest';

/**
 * `JourneyOption` enrichi par F2 (empreinte carbone, coût indicatif, étiquettes).
 * `estimatedCostCents` vaut `null` quand un mode du trajet n'est pas estimable
 * (§5.3) — l'option n'est alors pas éligible au label `cheapest`.
 */
export interface PlannedJourney extends JourneyOption {
  co2Grams: number;
  estimatedCostCents: number | null;
  labels: JourneyLabel[];
}

/** Corps de la requête `POST /trips/plan` (F2, §4). */
export interface PlanTripRequest {
  from: Coordinates;
  to: Coordinates;
  /** ISO 8601 ; défaut = maintenant. */
  departureAt?: string;
  excludeModes?: TransportMode[];
  /** Contrainte PMR (§5.5) — accueillie par l'API ; non encore appliquée au tri (voir F2-planner.md §12). */
  accessibleOnly?: boolean;
}

/** Empreinte d'un mode au sein d'un `CarbonLog` (F4, §4.2). */
export interface ModeBreakdownEntry {
  mode: TransportMode;
  distanceMeters: number;
  co2Grams: number;
}

/**
 * `CarbonLog` : empreinte d'un trajet confirmé (F4, §4.2). Minimisé par
 * conception (RGPD) — ni origine ni destination, seulement l'agrégat par
 * mode. `userId`/`tenantId` ne sont jamais exposés : la liste est toujours
 * filtrée sur l'utilisateur courant côté serveur.
 */
export interface CarbonLog {
  id: string;
  loggedAt: string;
  co2Grams: number;
  distanceMeters: number;
  referenceCo2Grams: number;
  savedGrams: number;
  modeBreakdown: ModeBreakdownEntry[];
  createdAt: string;
}

/** Corps de la requête `POST /carbon-logs` (F4, §6) — confirmation d'un trajet. */
export interface ConfirmTripRequest {
  /** ISO 8601 ; défaut = maintenant. */
  loggedAt?: string;
  sections: Array<{ mode: TransportMode; distanceMeters: number }>;
}

/** Page de résultats paginée de `GET /carbon-logs` (F4, §7). */
export interface CarbonLogPage {
  items: CarbonLog[];
  total: number;
  page: number;
  limit: number;
}

/** Agrégat d'un mois pour le tableau de bord (F4, §7). */
export interface MonthlyCarbonBreakdown {
  /** Format `YYYY-MM`. */
  month: string;
  co2Grams: number;
  savedGrams: number;
  tripCount: number;
}

/** Réponse de `GET /carbon-logs/summary` (F4, §7). */
export interface CarbonLogSummary {
  totalCo2Grams: number;
  totalSavedGrams: number;
  monthly: MonthlyCarbonBreakdown[];
}
