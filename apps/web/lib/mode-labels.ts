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

/**
 * Initiale par mode (design-system.md §2 : la couleur ne porte jamais seule
 * l'info, cf. `ModeChip`). Métro/Bus/Vélo/Marche reprennent exactement les
 * initiales de la doc (M/B/V/P) ; les 6 autres modes, non couverts par le
 * design system, sont un choix raisonnable non officiel.
 */
export const MODE_INITIALS: Record<TransportMode, string> = {
  [TransportMode.Walk]: 'P',
  [TransportMode.Bike]: 'V',
  [TransportMode.ElectricBike]: 'E',
  [TransportMode.Scooter]: 'S',
  [TransportMode.Metro]: 'M',
  [TransportMode.Tram]: 'T',
  [TransportMode.Bus]: 'B',
  [TransportMode.RegionalTrain]: 'R',
  [TransportMode.CarSolo]: 'C',
  [TransportMode.Carpool]: 'Co',
};

/**
 * Couleur du tracé par mode sur la carte (F2-geometry §6) et des `ModeChip`
 * (design-system.md §2). Seuls 4 modes sur 10 sont couverts par le design
 * system (Métro/Bus/Vélo/Marche, valeurs reprises exactement) — les 6
 * autres (VAE, trottinette, tram, TER, voiture solo, covoiturage) gardent
 * leurs couleurs F2-geometry existantes, faute de valeur officielle : mieux
 * vaut le signaler que d'inventer des teintes qui auraient l'air sanctionnées.
 */
export const MODE_COLORS: Record<TransportMode, string> = {
  [TransportMode.Walk]: '#0E6E86',
  [TransportMode.Bike]: '#0F7A54',
  [TransportMode.ElectricBike]: '#15803d',
  [TransportMode.Scooter]: '#f59e0b',
  [TransportMode.Metro]: '#5B3B9E',
  [TransportMode.Tram]: '#0891b2',
  [TransportMode.Bus]: '#B24A05',
  [TransportMode.RegionalTrain]: '#be123c',
  [TransportMode.CarSolo]: '#4b5563',
  [TransportMode.Carpool]: '#0d9488',
};
