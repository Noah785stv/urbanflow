import { TransportMode } from '@urbanflow/shared-types';

/**
 * Token DI du barème de coût (§5.3, §12) : `FareEstimator` ne connaît que ce
 * token, jamais les montants en dur — facilite le remplacement par des tarifs
 * réels d'opérateur sans toucher au service ni à ses tests.
 */
export const FARE_CONFIG = Symbol('FARE_CONFIG');

export interface FareConfig {
  /** Ticket TC unique (§5.3) : couvre tout le tronçon transport en commun du trajet, quel que soit le nombre de correspondances. */
  transitFlatCents: number;
  scooterUnlockCents: number;
  scooterPerMinuteCents: number;
  carSoloPerKmCents: number;
}

/**
 * Barème indicatif (§5.3 : « point le plus faible en données »), PAS les
 * tarifs réels des opérateurs — à affiner. Ordres de grandeur réseau STAR
 * (Rennes) pour un ticket unité et des trajets vélo/trottinette/voiture
 * courants.
 */
export const DEFAULT_FARE_CONFIG: FareConfig = {
  transitFlatCents: 180,
  scooterUnlockCents: 100,
  scooterPerMinuteCents: 15,
  carSoloPerKmCents: 30,
};

/** Modes tarifés par un ticket TC unique, une seule fois par trajet (§5.3). */
export const TRANSIT_MODES: TransportMode[] = [
  TransportMode.Bus,
  TransportMode.Metro,
  TransportMode.Tram,
  TransportMode.RegionalTrain,
];

/** Modes gratuits (§5.3). */
export const FREE_MODES: TransportMode[] = [
  TransportMode.Walk,
  TransportMode.Bike,
];
