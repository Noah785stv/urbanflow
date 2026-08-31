import { describe, expect, it } from 'vitest';
import { formatStationAvailability } from './format';

describe('formatStationAvailability', () => {
  it('retourne un message explicite quand le statut est `null` (§7 web-gbfs-stations.md)', () => {
    expect(formatStationAvailability(null)).toBe('Disponibilité indisponible.');
  });

  it('accorde singulier/pluriel vélo(s) et place(s)', () => {
    expect(
      formatStationAvailability({
        bikesAvailable: 1,
        docksAvailable: 1,
        updatedAt: '2026-08-31T10:00:00.000Z',
        stale: false,
      }),
    ).toBe('1 vélo disponible · 1 place');

    expect(
      formatStationAvailability({
        bikesAvailable: 4,
        docksAvailable: 16,
        updatedAt: '2026-08-31T10:00:00.000Z',
        stale: false,
      }),
    ).toBe('4 vélos disponibles · 16 places');
  });

  it('signale les données obsolètes (`stale: true`) avec l’heure de dernière mise à jour', () => {
    expect(
      formatStationAvailability({
        bikesAvailable: 2,
        docksAvailable: 5,
        updatedAt: '2026-08-31T10:00:00.000Z',
        stale: true,
      }),
    ).toMatch(/^2 vélos disponibles · 5 places \(dernière mise à jour à \d{2}:\d{2}\)$/);
  });
});
