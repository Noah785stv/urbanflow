import { JourneySection, TransportMode } from '@urbanflow/shared-types';
import { CarbonEstimatorService } from './carbon-estimator.service';
import { DEFAULT_EMISSION_FACTORS } from './emission-factors.constants';

function section(
  mode: TransportMode,
  distanceMeters: number,
  durationSeconds = 0,
): JourneySection {
  return { mode, distanceMeters, durationSeconds };
}

describe('CarbonEstimatorService', () => {
  const service = new CarbonEstimatorService(DEFAULT_EMISSION_FACTORS);

  it('renvoie 0 pour un trajet sans section', () => {
    expect(service.estimateGrams([])).toBe(0);
  });

  it.each(Object.values(TransportMode))(
    'applique le facteur ADEME du mode %s pour 10 km',
    (mode) => {
      const expected = Math.round(10 * DEFAULT_EMISSION_FACTORS[mode]);
      expect(service.estimateGrams([section(mode, 10_000)])).toBe(expected);
    },
  );

  it('marche et vélo ont un facteur nul (§4.7.3)', () => {
    expect(
      service.estimateGrams([
        section(TransportMode.Walk, 5_000),
        section(TransportMode.Bike, 5_000),
      ]),
    ).toBe(0);
  });

  it('somme les émissions d’un trajet multimodal (§4.7.3 : Σ distance × facteur)', () => {
    const sections = [
      section(TransportMode.Walk, 500), // 0
      section(TransportMode.Metro, 3_000), // 0.003 * 4 * 1000 = 12
      section(TransportMode.Bus, 2_000), // 0.002 * 113 * 1000 = 226
    ];

    expect(service.estimateGrams(sections)).toBe(12 + 226);
  });

  it('arrondit le total au gramme près', () => {
    // 1.234 km * 193 gCO2e/km = 238.162 -> 238
    expect(service.estimateGrams([section(TransportMode.CarSolo, 1_234)])).toBe(
      238,
    );
  });
});
