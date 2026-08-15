import { JourneySection, TransportMode } from '@urbanflow/shared-types';
import { DEFAULT_FARE_CONFIG } from './fare.constants';
import { FareEstimator } from './fare-estimator.service';

function section(
  mode: TransportMode,
  distanceMeters: number,
  durationSeconds: number,
): JourneySection {
  return { mode, distanceMeters, durationSeconds };
}

describe('FareEstimator', () => {
  const estimator = new FareEstimator(DEFAULT_FARE_CONFIG);

  it('renvoie 0 pour un trajet 100% marche/vélo (modes gratuits)', () => {
    const sections = [
      section(TransportMode.Walk, 500, 400),
      section(TransportMode.Bike, 2_000, 500),
    ];

    expect(estimator.estimateCents(sections)).toBe(0);
  });

  it('facture un ticket TC unique même avec plusieurs sections de transport en commun', () => {
    const sections = [
      section(TransportMode.Walk, 200, 150),
      section(TransportMode.Bus, 3_000, 600),
      section(TransportMode.Metro, 2_000, 300),
    ];

    expect(estimator.estimateCents(sections)).toBe(
      DEFAULT_FARE_CONFIG.transitFlatCents,
    );
  });

  it('trottinette : déblocage + coût à la minute', () => {
    const sections = [section(TransportMode.Scooter, 1_500, 300)]; // 5 minutes

    const expected =
      DEFAULT_FARE_CONFIG.scooterUnlockCents +
      5 * DEFAULT_FARE_CONFIG.scooterPerMinuteCents;
    expect(estimator.estimateCents(sections)).toBe(expected);
  });

  it('voiture solo : coût au kilomètre', () => {
    const sections = [section(TransportMode.CarSolo, 10_000, 900)]; // 10 km

    expect(estimator.estimateCents(sections)).toBe(
      10 * DEFAULT_FARE_CONFIG.carSoloPerKmCents,
    );
  });

  it('cumule les composantes d’un trajet multimodal', () => {
    const sections = [
      section(TransportMode.Walk, 300, 240),
      section(TransportMode.Bus, 4_000, 700),
    ];

    expect(estimator.estimateCents(sections)).toBe(
      DEFAULT_FARE_CONFIG.transitFlatCents,
    );
  });

  it.each([TransportMode.ElectricBike, TransportMode.Carpool])(
    'renvoie null pour un trajet incluant le mode hors barème %s (§5.3)',
    (mode) => {
      const sections = [
        section(TransportMode.Walk, 200, 150),
        section(mode, 2_000, 300),
      ];

      expect(estimator.estimateCents(sections)).toBeNull();
    },
  );

  it('arrondit le total au centime près', () => {
    // 1.5 minute * 15 = 22.5 + 100 = 122.5 -> 123 (arrondi)
    const sections = [section(TransportMode.Scooter, 300, 90)];

    expect(estimator.estimateCents(sections)).toBe(123);
  });
});
