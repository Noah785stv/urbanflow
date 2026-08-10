import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of } from 'rxjs';
import { Repository } from 'typeorm';
import { DegradedCacheService } from '../../../../common/cache/degraded-cache.service';
import { Station } from '../../entities/station.entity';
import { GbfsProvider } from './gbfs.provider';

function loadFixture<T>(name: string): T {
  const filePath = join(__dirname, '../../../../../test/fixtures/gbfs', name);
  return JSON.parse(readFileSync(filePath, 'utf-8')) as T;
}

const DISCOVERY_URL = 'https://gbfs.exemple.tld/gbfs.json';

describe('GbfsProvider', () => {
  let httpGet: jest.Mock;
  let stationRepository: { upsert: jest.Mock };
  let cache: { getOrRefresh: jest.Mock };
  let provider: GbfsProvider;

  function buildProvider(feedUrls: string[]): GbfsProvider {
    const configService = {
      getOrThrow: jest.fn().mockReturnValue(JSON.stringify(feedUrls)),
    } as unknown as ConfigService;

    return new GbfsProvider(
      { get: httpGet } as unknown as HttpService,
      configService,
      cache as unknown as DegradedCacheService,
      stationRepository as unknown as Repository<Station>,
    );
  }

  beforeEach(() => {
    httpGet = jest.fn((url: string) => {
      if (url === DISCOVERY_URL) {
        return of({ data: loadFixture('gbfs.json') });
      }
      if (url.endsWith('station_information.json')) {
        return of({ data: loadFixture('station_information.json') });
      }
      if (url.endsWith('station_status.json')) {
        return of({ data: loadFixture('station_status.json') });
      }
      throw new Error(`URL non mockée : ${url}`);
    });

    stationRepository = { upsert: jest.fn().mockResolvedValue(undefined) };
    cache = {
      getOrRefresh: jest.fn(
        async (_key: string, fetcher: () => Promise<unknown>) => ({
          data: await fetcher(),
          stale: false,
          updatedAt: '2026-01-01T00:00:00.000Z',
        }),
      ),
    };

    provider = buildProvider([DISCOVERY_URL]);
  });

  describe('syncStations', () => {
    it('upsert chaque station avec un point GeoJSON [lon, lat] et le bon provider', async () => {
      await provider.syncStations();

      expect(stationRepository.upsert).toHaveBeenCalledTimes(2);
      expect(stationRepository.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: 'gbfs:gbfs.exemple.tld',
          externalId: '101',
          name: 'République',
          stationType: 'dock',
          location: { type: 'Point', coordinates: [-1.6794, 48.1147] },
          capacity: 20,
        }),
        ['provider', 'externalId'],
      );
    });

    it("la panne d'un opérateur ne bloque pas la synchronisation des autres (§4.6)", async () => {
      httpGet.mockImplementation(() => {
        throw new Error('DNS échoué');
      });

      await expect(provider.syncStations()).resolves.toBeUndefined();
      expect(stationRepository.upsert).not.toHaveBeenCalled();
    });
  });

  describe('getStationStatus', () => {
    it('retourne les statuts demandés, enrichis de la fraîcheur du cache', async () => {
      const result = await provider.getStationStatus(['101']);

      expect(result).toEqual([
        {
          provider: 'gbfs:gbfs.exemple.tld',
          externalId: '101',
          bikesAvailable: 5,
          docksAvailable: 15,
          updatedAt: '2026-01-01T00:00:00.000Z',
          stale: false,
        },
      ]);
    });

    it('ignore les identifiants non demandés', async () => {
      const result = await provider.getStationStatus(['999']);

      expect(result).toEqual([]);
    });

    it('propage stale:true quand le cache dégradé sert une dernière valeur connue', async () => {
      cache.getOrRefresh.mockResolvedValue({
        data: loadFixture<{ data: { stations: unknown[] } }>(
          'station_status.json',
        ).data.stations,
        stale: true,
        updatedAt: '2025-12-31T23:00:00.000Z',
      });

      const result = await provider.getStationStatus(['102']);

      expect(result).toEqual([
        expect.objectContaining({
          externalId: '102',
          stale: true,
          updatedAt: '2025-12-31T23:00:00.000Z',
        }),
      ]);
    });
  });

  describe('isAvailable', () => {
    it('vrai si tous les flux configurés répondent', async () => {
      await expect(provider.isAvailable()).resolves.toBe(true);
    });

    it('faux si aucun flux GBFS configuré', async () => {
      const emptyProvider = buildProvider([]);

      await expect(emptyProvider.isAvailable()).resolves.toBe(false);
    });

    it('faux si la découverte échoue', async () => {
      httpGet.mockImplementation(() => {
        throw new Error('DNS échoué');
      });

      await expect(provider.isAvailable()).resolves.toBe(false);
    });
  });

  describe('sécurité — liste blanche des hôtes (§9 A10)', () => {
    it("rejette un sous-flux dont l'hôte diffère de celui de la découverte", async () => {
      httpGet.mockImplementation((url: string) => {
        if (url === DISCOVERY_URL) {
          return of({
            data: {
              data: {
                en: {
                  feeds: [
                    {
                      name: 'station_information',
                      url: 'https://hote-pirate.tld/station_information.json',
                    },
                  ],
                },
              },
            },
          });
        }
        throw new Error(`URL non mockée : ${url}`);
      });

      await provider.syncStations();

      expect(stationRepository.upsert).not.toHaveBeenCalled();
    });
  });
});
