import { Departure, TransportMode } from '@urbanflow/shared-types';
import { ProviderRegistry } from './providers/provider-registry.service';
import { StopsService } from './stops.service';

function buildDeparture(overrides: Partial<Departure> = {}): Departure {
  return {
    stopId: 'stop-1',
    line: '1',
    direction: 'Centre',
    mode: TransportMode.Bus,
    scheduledAt: '2026-01-01T10:00:00Z',
    updatedAt: '2026-01-01T09:59:00Z',
    stale: false,
    ...overrides,
  };
}

describe('StopsService', () => {
  it('agrège et trie par horaire les départs de tous les providers transit', async () => {
    const providerA = {
      getDepartures: jest
        .fn()
        .mockResolvedValue([
          buildDeparture({ scheduledAt: '2026-01-01T10:05:00Z', line: 'B' }),
        ]),
    };
    const providerB = {
      getDepartures: jest
        .fn()
        .mockResolvedValue([
          buildDeparture({ scheduledAt: '2026-01-01T10:00:00Z', line: 'A' }),
        ]),
    };
    const providerRegistry = {
      getTransitProviders: jest.fn().mockReturnValue([providerA, providerB]),
    };
    const service = new StopsService(
      providerRegistry as unknown as ProviderRegistry,
    );

    const result = await service.getDepartures('stop-1');

    expect(result.map((departure) => departure.line)).toEqual(['A', 'B']);
    expect(providerA.getDepartures).toHaveBeenCalledWith('stop-1');
    expect(providerB.getDepartures).toHaveBeenCalledWith('stop-1');
  });

  it("renvoie un tableau vide si aucun provider transit n'est enregistré", async () => {
    const providerRegistry = {
      getTransitProviders: jest.fn().mockReturnValue([]),
    };
    const service = new StopsService(
      providerRegistry as unknown as ProviderRegistry,
    );

    await expect(service.getDepartures('stop-1')).resolves.toEqual([]);
  });
});
