import { TransportMode } from '@urbanflow/shared-types';
import { beforeEach, describe, expect, it } from 'vitest';
import { readLastPlan, writeLastPlan, type StoredPlan } from './last-plan-cache';

const STORED: StoredPlan = {
  origin: { latitude: 48.1173, longitude: -1.6778 },
  originLabel: 'Place de la Mairie, 35000 Rennes',
  destination: { latitude: 48.1032, longitude: -1.6726 },
  destinationLabel: 'Gare de Rennes, 35000 Rennes',
  plan: {
    journeys: [
      {
        departureAt: '2026-08-17T08:00:00+02:00',
        arrivalAt: '2026-08-17T08:16:00+02:00',
        durationSeconds: 960,
        sections: [{ mode: TransportMode.Bus, durationSeconds: 960, distanceMeters: 3000 }],
        co2Grams: 339,
        estimatedCostCents: 180,
        labels: ['fastest'],
      },
    ],
    stale: false,
    updatedAt: '2026-08-17T08:16:00.000Z',
  },
};

describe('last-plan-cache', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("renvoie null si rien n'a encore été écrit", () => {
    expect(readLastPlan()).toBeNull();
  });

  it('restitue exactement ce qui a été écrit (origine, destination, plan)', () => {
    writeLastPlan(STORED);
    expect(readLastPlan()).toEqual(STORED);
  });

  it('un second appel écrase le précédent (pas d’historique)', () => {
    writeLastPlan(STORED);
    const updated: StoredPlan = { ...STORED, originLabel: 'Nouvelle origine' };
    writeLastPlan(updated);
    expect(readLastPlan()).toEqual(updated);
  });

  it('renvoie null plutôt que de planter sur du JSON corrompu (quota/édition manuelle)', () => {
    window.localStorage.setItem('urbanflow:last-plan', '{ceci n’est pas du JSON');
    expect(readLastPlan()).toBeNull();
  });
});
