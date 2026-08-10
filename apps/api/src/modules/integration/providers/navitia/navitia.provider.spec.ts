import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { TransportMode } from '@urbanflow/shared-types';
import { of } from 'rxjs';
import { DegradedCacheService } from '../../../../common/cache/degraded-cache.service';
import { NavitiaProvider } from './navitia.provider';

function loadFixture<T>(name: string): T {
  const filePath = join(
    __dirname,
    '../../../../../test/fixtures/navitia',
    name,
  );
  return JSON.parse(readFileSync(filePath, 'utf-8')) as T;
}

describe('NavitiaProvider', () => {
  let httpGet: jest.Mock;
  let cache: { getOrRefresh: jest.Mock };
  let provider: NavitiaProvider;

  beforeEach(() => {
    httpGet = jest.fn();
    cache = {
      getOrRefresh: jest.fn(
        async (_key: string, fetcher: () => Promise<unknown>) => ({
          data: await fetcher(),
          stale: false,
          updatedAt: '2026-01-01T00:00:00.000Z',
        }),
      ),
    };

    const configService = {
      getOrThrow: jest.fn((key: string) => {
        const values: Record<string, string> = {
          NAVITIA_BASE_URL: 'https://api.navitia.io/v1',
          NAVITIA_API_KEY: 'test-key',
          NAVITIA_COVERAGE: 'fr-idf',
        };
        return values[key];
      }),
    } as unknown as ConfigService;

    provider = new NavitiaProvider(
      { get: httpGet } as unknown as HttpService,
      configService,
      cache as unknown as DegradedCacheService,
    );
  });

  describe('getDepartures', () => {
    it('convertit les passages Navitia en Departure normalisés', async () => {
      httpGet.mockReturnValue(of({ data: loadFixture('departures.json') }));

      const result = await provider.getDepartures('stop_point:123');

      expect(result).toEqual([
        {
          stopId: 'stop_point:123',
          line: 'C1',
          direction: 'Centre-ville',
          mode: TransportMode.Bus,
          scheduledAt: '2026-08-10T14:30:00Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
          stale: false,
        },
        {
          stopId: 'stop_point:123',
          line: 'T1',
          direction: 'La Poterie',
          mode: TransportMode.Tram,
          scheduledAt: '2026-08-10T14:35:00Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
          stale: false,
        },
      ]);
    });

    it('passe par le cache dégradé : réponse vide signalée si la source est en panne (§7)', async () => {
      cache.getOrRefresh.mockResolvedValue({
        data: null,
        stale: true,
        updatedAt: null,
      });

      const result = await provider.getDepartures('stop_point:123');

      expect(result).toEqual([]);
      expect(httpGet).not.toHaveBeenCalled();
    });
  });

  describe('getJourneys', () => {
    it('convertit les itinéraires Navitia en JourneyOption normalisés', async () => {
      httpGet.mockReturnValue(of({ data: loadFixture('journeys.json') }));

      const result = await provider.getJourneys({
        origin: { latitude: 48.1147, longitude: -1.6794 },
        destination: { latitude: 48.1036, longitude: -1.6726 },
      });

      expect(result).toEqual([
        {
          departureAt: '2026-08-10T14:30:00Z',
          arrivalAt: '2026-08-10T14:55:00Z',
          durationSeconds: 1500,
          sections: [
            {
              mode: TransportMode.Walk,
              durationSeconds: 300,
              distanceMeters: 0,
            },
            {
              mode: TransportMode.Tram,
              durationSeconds: 1200,
              distanceMeters: 0,
            },
          ],
        },
      ]);
    });

    it('transmet origine/destination au format Navitia (lon;lat)', async () => {
      httpGet.mockReturnValue(of({ data: { journeys: [] } }));

      await provider.getJourneys({
        origin: { latitude: 48.1147, longitude: -1.6794 },
        destination: { latitude: 48.1036, longitude: -1.6726 },
      });

      const [url, config] = httpGet.mock.calls[0] as [
        string,
        { params: Record<string, string> },
      ];
      expect(url).toContain('/journeys');
      expect(config.params.from).toBe('-1.6794;48.1147');
      expect(config.params.to).toBe('-1.6726;48.1036');
    });
  });

  describe('isAvailable', () => {
    it('vrai si la couverture Navitia répond', async () => {
      httpGet.mockReturnValue(of({ data: {} }));

      await expect(provider.isAvailable()).resolves.toBe(true);
    });

    it('faux si Navitia est injoignable', async () => {
      httpGet.mockImplementation(() => {
        throw new Error('timeout');
      });

      await expect(provider.isAvailable()).resolves.toBe(false);
    });
  });
});
