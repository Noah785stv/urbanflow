import type { JourneySection } from '@urbanflow/shared-types';
import { TransportMode } from '@urbanflow/shared-types';
import { describe, expect, it } from 'vitest';
import { decodeSections } from './decode-geometry';

// Polyligne réelle capturée sur l'instance OTP locale (réseau STAR, Rennes) —
// tronçon marche de la fixture backend `test/fixtures/otp/journeys.json`,
// 28 points attendus (champ `length` renvoyé par OTP pour ce tronçon).
const REAL_WALK_GEOMETRY = 'cbwdH|rlIAMbAMPAB?DAB?d@ElBSNA?G?ENELDHL@JTJj@RT@l@ANB^EAu@@KDMBQTJVC';

function section(mode: TransportMode, geometry?: string): JourneySection {
  return { mode, durationSeconds: 60, distanceMeters: 100, geometry };
}

describe('decodeSections', () => {
  it('décode une polyligne réelle en points [lat, lon] plausibles pour Rennes', () => {
    const [decoded] = decodeSections([section(TransportMode.Walk, REAL_WALK_GEOMETRY)]);

    expect(decoded).toBeDefined();
    expect(decoded?.mode).toBe(TransportMode.Walk);
    expect(decoded?.positions).toHaveLength(28);

    const [firstLat, firstLon] = decoded!.positions[0]!;
    expect(firstLat).toBeGreaterThan(48);
    expect(firstLat).toBeLessThan(49);
    expect(firstLon).toBeGreaterThan(-2);
    expect(firstLon).toBeLessThan(-1);
  });

  it('omet silencieusement un tronçon sans géométrie, sans planter (§6)', () => {
    const result = decodeSections([
      section(TransportMode.Walk, REAL_WALK_GEOMETRY),
      section(TransportMode.Bus, undefined),
    ]);

    expect(result).toHaveLength(1);
    expect(result[0]?.mode).toBe(TransportMode.Walk);
  });

  it('renvoie un tableau vide si aucun tronçon n’a de géométrie', () => {
    const result = decodeSections([section(TransportMode.Walk), section(TransportMode.Bus)]);

    expect(result).toEqual([]);
  });

  it('renvoie un tableau vide pour une liste de sections vide', () => {
    expect(decodeSections([])).toEqual([]);
  });
});
