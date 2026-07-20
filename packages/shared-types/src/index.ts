/**
 * Types partagés front <-> back.
 * Reflète le lexique métier univoque du dossier (§4.2) : Trip, Segment, Mode.
 */

/** Mode : un moyen de transport (cf. facteurs d'émission §4.7). */
export enum TransportMode {
  Walk = 'walk',
  Bike = 'bike',
  ElectricBike = 'electric_bike',
  Scooter = 'scooter',
  Metro = 'metro',
  Tram = 'tram',
  Bus = 'bus',
  RegionalTrain = 'regional_train',
  CarSolo = 'car_solo',
  Carpool = 'carpool',
}

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