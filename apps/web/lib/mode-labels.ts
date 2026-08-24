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
