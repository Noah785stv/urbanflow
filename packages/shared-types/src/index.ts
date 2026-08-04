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