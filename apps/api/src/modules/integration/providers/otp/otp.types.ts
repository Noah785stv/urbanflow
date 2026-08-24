/**
 * Formes brutes des réponses GraphQL de l'API GTFS d'OpenTripPlanner (OTP),
 * vérifiées par introspection live contre l'instance auto-hébergée (ADR-005 —
 * remplace Navitia, dont l'accès gratuit est fermé). Le point d'entrée réel
 * est `planConnection` (Relay-style, pagination par curseur) : le champ
 * `plan` historique n'existe pas sur ce schéma.
 */

export interface OtpRoute {
  shortName: string | null;
  /** Enum `TransitMode` (sous-ensemble de `Mode` réservé aux lignes de transport en commun). */
  mode: string | null;
}

export interface OtpTrip {
  route: OtpRoute;
}

export interface OtpStoptime {
  /** Secondes écoulées depuis minuit du `serviceDay`, horaire théorique. */
  scheduledDeparture: number;
  /** Identique à `scheduledDeparture` en l'absence de donnée temps réel. */
  realtimeDeparture: number | null;
  realtime: boolean;
  realtimeState: string;
  /** Epoch secondes (UTC) du début du jour de service — sert d'ancrage à `scheduledDeparture`. */
  serviceDay: number;
  headsign: string | null;
  trip: OtpTrip | null;
}

export interface OtpStopDeparturesResponse {
  data?: {
    stop: { stoptimesWithoutPatterns: OtpStoptime[] } | null;
  };
  errors?: Array<{ message: string }>;
}

/** `Geometry` (F2-geometry §5) : `points` est une polyligne encodée (format Google, précision 5), pas un tableau de coordonnées. */
export interface OtpGeometry {
  points: string | null;
  length: number | null;
}

export interface OtpLeg {
  /** Enum `Mode` (WALK, BICYCLE, BUS, SUBWAY, TRAM, RAIL, ...). */
  mode: string;
  duration: number; // secondes
  distance: number; // mètres — toujours renseigné (contrairement au bug distanceMeters=0 de Navitia)
  legGeometry: OtpGeometry | null;
}

export interface OtpItinerary {
  /** OffsetDateTime ISO 8601 (ex. "2026-08-17T08:04:45+02:00"). */
  start: string;
  end: string;
  duration: number; // secondes
  legs: OtpLeg[];
}

export interface OtpPlanConnectionResponse {
  data?: {
    planConnection: { edges: Array<{ node: OtpItinerary }> };
  };
  errors?: Array<{ message: string }>;
}

export interface OtpHealthResponse {
  data?: { feeds?: Array<{ feedId: string }> };
  errors?: Array<{ message: string }>;
}
