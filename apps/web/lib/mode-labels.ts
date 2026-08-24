import type { JourneyLabel } from '@urbanflow/shared-types';
import { TransportMode } from '@urbanflow/shared-types';

export const MODE_LABELS: Record<TransportMode, string> = {
  [TransportMode.Walk]: 'Marche',
  [TransportMode.Bike]: 'Vélo',
  [TransportMode.ElectricBike]: 'Vélo électrique',
  [TransportMode.Scooter]: 'Trottinette',
  [TransportMode.Metro]: 'Métro',
  [TransportMode.Tram]: 'Tram',
  [TransportMode.Bus]: 'Bus',
  [TransportMode.RegionalTrain]: 'TER',
  [TransportMode.CarSolo]: 'Voiture (solo)',
  [TransportMode.Carpool]: 'Covoiturage',
};

export const JOURNEY_LABEL_TEXT: Record<JourneyLabel, string> = {
  fastest: 'Le plus rapide',
  greenest: 'Le plus écologique',
  cheapest: 'Le moins cher',
};

/** Couleur du tracé par mode sur la carte (F2-geometry §6) — transport en commun visuellement distinct de marche/vélo. */
export const MODE_COLORS: Record<TransportMode, string> = {
  [TransportMode.Walk]: '#71717a',
  [TransportMode.Bike]: '#16a34a',
  [TransportMode.ElectricBike]: '#15803d',
  [TransportMode.Scooter]: '#f59e0b',
  [TransportMode.Metro]: '#7c3aed',
  [TransportMode.Tram]: '#0891b2',
  [TransportMode.Bus]: '#ea580c',
  [TransportMode.RegionalTrain]: '#be123c',
  [TransportMode.CarSolo]: '#4b5563',
  [TransportMode.Carpool]: '#0d9488',
};
