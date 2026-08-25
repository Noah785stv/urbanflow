import type { PlannedJourney } from '@urbanflow/shared-types';
import { TransportMode } from '@urbanflow/shared-types';
import { describe, expect, it } from 'vitest';
import { toConfirmTripRequest } from './to-confirm-trip-request';

const journey: PlannedJourney = {
  departureAt: '2026-08-17T08:00:00+02:00',
  arrivalAt: '2026-08-17T08:16:00+02:00',
  durationSeconds: 960,
  sections: [
    {
      mode: TransportMode.Walk,
      durationSeconds: 300,
      distanceMeters: 400,
      geometry: 'c|tdHfufIMZ?J',
    },
    { mode: TransportMode.Bus, durationSeconds: 660, distanceMeters: 3000 },
  ],
  co2Grams: 339,
  estimatedCostCents: 180,
  labels: ['fastest', 'cheapest'],
};

describe('toConfirmTripRequest', () => {
  it('ne conserve que { mode, distanceMeters } par tronçon (whitelist stricte, §6)', () => {
    const result = toConfirmTripRequest(journey);

    expect(result).toEqual({
      sections: [
        { mode: TransportMode.Walk, distanceMeters: 400 },
        { mode: TransportMode.Bus, distanceMeters: 3000 },
      ],
    });
  });

  it('ne fuite ni durationSeconds ni geometry (les clés interdites sont absentes, pas juste ignorées)', () => {
    const result = toConfirmTripRequest(journey);

    for (const section of result.sections) {
      expect(section).not.toHaveProperty('durationSeconds');
      expect(section).not.toHaveProperty('geometry');
      expect(Object.keys(section).sort()).toEqual(['distanceMeters', 'mode']);
    }
  });

  it("n'envoie pas loggedAt (défaut serveur = maintenant, §6)", () => {
    const result = toConfirmTripRequest(journey);

    expect(result).not.toHaveProperty('loggedAt');
  });

  it('gère un trajet à tronçon unique', () => {
    const singleSection: PlannedJourney = {
      ...journey,
      sections: [{ mode: TransportMode.CarSolo, durationSeconds: 1800, distanceMeters: 8000 }],
    };

    expect(toConfirmTripRequest(singleSection)).toEqual({
      sections: [{ mode: TransportMode.CarSolo, distanceMeters: 8000 }],
    });
  });
});
