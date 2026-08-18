import { TransportMode } from '@urbanflow/shared-types';

/**
 * Token DI des facteurs d'émission (§12 F2-planner.md) : `CarbonEstimatorService`
 * ne connaît que ce token, jamais la table en dur. F4 pourra fournir une
 * implémentation versionnée en base (`emission_factor`, `valid_from`) sans
 * changer le service ni son test.
 */
export const EMISSION_FACTORS = Symbol('EMISSION_FACTORS');

export type EmissionFactorTable = Record<TransportMode, number>;

/**
 * Facteurs d'émission ADEME (gCO2e/km, §4.7.3, §5.2). Utilisés en dur pour une
 * estimation à la volée en F2 ; F4 les rendra versionnés par date (`valid_from`)
 * sans que l'historique existant ne soit altéré (CLAUDE.md — Modèle de données).
 */
export const DEFAULT_EMISSION_FACTORS: EmissionFactorTable = {
  [TransportMode.Walk]: 0,
  [TransportMode.Bike]: 0,
  [TransportMode.ElectricBike]: 11,
  [TransportMode.Scooter]: 28,
  [TransportMode.Metro]: 4,
  [TransportMode.Tram]: 4,
  [TransportMode.Bus]: 113,
  [TransportMode.RegionalTrain]: 25,
  [TransportMode.CarSolo]: 193,
  [TransportMode.Carpool]: 64,
};
