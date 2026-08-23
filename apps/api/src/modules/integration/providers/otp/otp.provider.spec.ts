import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { TransportMode } from '@urbanflow/shared-types';
import { of } from 'rxjs';
import { DegradedCacheService } from '../../../../common/cache/degraded-cache.service';
import { OtpProvider } from './otp.provider';

function loadFixture<T>(name: string): T {
  const filePath = join(__dirname, '../../../../../test/fixtures/otp', name);
  return JSON.parse(readFileSync(filePath, 'utf-8')) as T;
}

describe('OtpProvider', () => {
  let httpPost: jest.Mock;
  let cache: { getOrRefresh: jest.Mock };
  let provider: OtpProvider;

  beforeEach(() => {
    httpPost = jest.fn();
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
      getOrThrow: jest.fn().mockReturnValue('http://127.0.0.1:8081'),
    } as unknown as ConfigService;

    provider = new OtpProvider(
      { post: httpPost } as unknown as HttpService,
      configService,
      cache as unknown as DegradedCacheService,
    );
  });

  describe('getDepartures', () => {
    it('convertit les stoptimes OTP en Departure normalisés (fixture réelle, arrêt « Hôtel Dieu »)', async () => {
      httpPost.mockReturnValue(of({ data: loadFixture('departures.json') }));

      const result = await provider.getDepartures('1:6-1027');

      expect(result).toEqual([
        {
          stopId: '1:6-1027',
          line: 'C3',
          direction: 'Henri Fréville',
          mode: TransportMode.Bus,
          scheduledAt: '2026-08-15T06:20:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
          stale: false,
        },
        {
          stopId: '1:6-1027',
          line: '12',
          direction: 'La Poterie',
          mode: TransportMode.Bus,
          scheduledAt: '2026-08-15T06:24:00.000Z',
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

      const result = await provider.getDepartures('1:6-1027');

      expect(result).toEqual([]);
      expect(httpPost).not.toHaveBeenCalled();
    });

    it('renvoie une liste vide pour un arrêt inconnu (stop: null, sans erreur GraphQL)', async () => {
      httpPost.mockReturnValue(of({ data: { data: { stop: null } } }));

      const result = await provider.getDepartures('inconnu');

      expect(result).toEqual([]);
    });
  });

  describe('getJourneys', () => {
    it('convertit un planConnection OTP en JourneyOption (fixture réelle, réseau STAR)', async () => {
      httpPost.mockReturnValue(of({ data: loadFixture('journeys.json') }));

      const result = await provider.getJourneys({
        origin: { latitude: 48.1173, longitude: -1.6778 },
        destination: { latitude: 48.1257, longitude: -1.7075 },
      });

      expect(result).toEqual([
        {
          departureAt: '2026-08-17T08:04:45+02:00',
          arrivalAt: '2026-08-17T08:26:08+02:00',
          durationSeconds: 1283,
          sections: [
            {
              mode: TransportMode.Walk,
              durationSeconds: 75,
              distanceMeters: 79,
              geometry: 'c|tdHfufIMZ?J?J?HDd@B`A@\\@FG@',
            },
            {
              mode: TransportMode.Bus,
              durationSeconds: 930,
              distanceMeters: 5357,
              geometry:
                'a|tdHr{fIXvJ?\\QBcAG{@O{A]C?gBi@c@Gm@?a@Ho@Ty@l@k@jAmAlCcBrC}@pAORq@r@c@f@wA`B]XQDK@uBt@K@g@RAMOwDCe@YwIgAIW@ODKJ]Ne@P{B|@eK|DgBl@[JqB\\Y?oA^oIdCsAVmLvBYVAECEACC?G?C@CBABAF@FkEt@sDt@wCh@}Cl@e@He@?AKAGAGAECECCCCCCEACAE?G@CBEBEDCDADADAFAF?F?F@F@DBF@DBBBDBBD@B@F?B?F\\Fl@DbAZhHJjAJb@CBCDCDCDAFAH?L@F@DBJFHHDD@B?NnALr@^`Cl@lEEDEDCFCDELCL?HAD@J@PDJDJDHDBLHDBH@H@HAFAHEHEBEDEBGf@Tr@Jl@LdAb@?L?D@J@DBFDDBBB@D@HABABCFGBIZTZd@dAvAAF?F?FBD@DDBBBD?DAFGlCtEDNTlAgAb@?@KFwBtCqCzDe@r@`AjC@DPd@^ZPTHTP`Cz@|NDNhArA\\b@ZNrDdAtBj@dAXb@Cx@O\\GNfCj@xBtC|Kx@zCFPJJHFNDNAhCU',
            },
            {
              mode: TransportMode.Walk,
              durationSeconds: 278,
              distanceMeters: 350,
              geometry:
                'cbwdH|rlIAMbAMPAB?DAB?d@ElBSNA?G?ENELDHL@JTJj@RT@l@ANB^EAu@@KDMBQTJVC',
            },
          ],
        },
      ]);
    });

    it('n’échoue pas et omet `geometry` si legGeometry est absent (§4)', async () => {
      httpPost.mockReturnValue(
        of({
          data: {
            data: {
              planConnection: {
                edges: [
                  {
                    node: {
                      start: '2026-08-17T08:00:00+02:00',
                      end: '2026-08-17T08:10:00+02:00',
                      duration: 600,
                      legs: [{ mode: 'WALK', duration: 600, distance: 800 }],
                    },
                  },
                ],
              },
            },
          },
        }),
      );

      const result = await provider.getJourneys({
        origin: { latitude: 48.1173, longitude: -1.6778 },
        destination: { latitude: 48.1257, longitude: -1.7075 },
      });

      expect(result[0]?.sections[0]?.geometry).toBeUndefined();
    });

    it('distanceMeters est non nul (le bug Navitia distanceMeters=0 est résolu, ADR-005)', async () => {
      httpPost.mockReturnValue(of({ data: loadFixture('journeys.json') }));

      const result = await provider.getJourneys({
        origin: { latitude: 48.1173, longitude: -1.6778 },
        destination: { latitude: 48.1257, longitude: -1.7075 },
      });

      expect(result).toHaveLength(1);
      expect(
        result[0]?.sections.every((section) => section.distanceMeters > 0),
      ).toBe(true);
    });

    it('transmet origine/destination/dateTime au format GraphQL attendu par planConnection', async () => {
      httpPost.mockReturnValue(
        of({ data: { data: { planConnection: { edges: [] } } } }),
      );

      await provider.getJourneys({
        origin: { latitude: 48.1173, longitude: -1.6778 },
        destination: { latitude: 48.1257, longitude: -1.7075 },
        datetime: '2026-08-17T08:00:00+02:00',
      });

      const [, body] = httpPost.mock.calls[0] as [
        string,
        { query: string; variables: Record<string, unknown> },
      ];
      expect(body.variables).toEqual({
        originLat: 48.1173,
        originLon: -1.6778,
        destinationLat: 48.1257,
        destinationLon: -1.7075,
        dateTime: { earliestDeparture: '2026-08-17T08:00:00+02:00' },
        first: 5,
      });
    });

    it('propage une erreur GraphQL (pour déclencher le mode dégradé en amont)', async () => {
      httpPost.mockReturnValue(of({ data: { errors: [{ message: 'boom' }] } }));

      await expect(
        provider.getJourneys({
          origin: { latitude: 48.1, longitude: -1.67 },
          destination: { latitude: 48.11, longitude: -1.64 },
        }),
      ).rejects.toThrow('boom');
    });
  });

  describe('isAvailable', () => {
    it('vrai si OTP répond sans erreur GraphQL', async () => {
      httpPost.mockReturnValue(
        of({ data: { data: { feeds: [{ feedId: '1' }] } } }),
      );

      await expect(provider.isAvailable()).resolves.toBe(true);
    });

    it('faux si OTP est injoignable', async () => {
      httpPost.mockImplementation(() => {
        throw new Error('timeout');
      });

      await expect(provider.isAvailable()).resolves.toBe(false);
    });
  });
});
