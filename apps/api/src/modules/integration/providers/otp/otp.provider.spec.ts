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
        origin: { latitude: 48.1247, longitude: -1.6853 },
        destination: { latitude: 48.0917, longitude: -1.6423 },
      });

      expect(result).toEqual([
        {
          departureAt: '2026-09-02T12:14:23+02:00',
          arrivalAt: '2026-09-02T12:53:44+02:00',
          durationSeconds: 2361,
          sections: [
            {
              mode: TransportMode.Walk,
              durationSeconds: 812,
              distanceMeters: 915,
              geometry:
                'ijvdHbdhIh@jELlAFLHx@@F?D?BBNEf@RJFDL@`@D@?J?@EBCL?lBJJJDCB?D?l@BJ?D@?n@It@Cl@A\\D^?L@BKdICjAEdCD?xAFB?nDNBPQjDAzA?R@r@LA',
            },
            {
              mode: TransportMode.Metro,
              durationSeconds: 858,
              distanceMeters: 7207,
              geometry:
                'uvudHnviICsA?[?W?UB_@HmBF{@Ho@Hg@Je@Le@Na@P_@R_@R[V[PQNMPMTOf@YxDkBVMTOVSZ[X]Vc@LWP_@r@aBp@}AL[L_@L_@L_@Nq@Py@rByKTcAJg@Lc@L_@Pe@Rc@Ta@V]RYTUVWlAcAVUX[RSNSPYdAgBl@_AR[PURUTQZSVMVKVGZG\\Ch@AtKQj@C~@E`@AxA?bEA^@d@Bh@FhAR^F`@B^@PAVCPEPEPGPGVMNMZURUX]PWN[Re@Ne@Ja@FWDWLy@J}@zAkMFg@Fa@Fc@FYPq@Po@Tm@JUPa@NYR[zA_Cz@qAT[RWNQVSNMVOXMVKXGRCRCPAR?T@^DRDRFPFRHPJPJNNPNNNLPX`@Tb@Rd@JVHXJf@Lj@Hl@ZvBHb@H^Jf@HVN`@N\\Tb@V`@X\\ZX\\TPJPH^L^HRBR@^?RAPAl@K`AS|@Qb@IVGZMtAi@`@Od@Mb@Gj@I~Fk@zCSrAKTAN?R@L@^DpC`@f@D\\BtLNf@BnADh@BbEDf@@N?PCNCNINKLMJQHQDMDKBOBQBO@Q@e@@mG?uALcZVqk@@}A?g@?_@?]AWEm@Gk@EUE]Kc@Og@oCmJKa@I[Mk@Ik@E]AUEm@Ae@?o@@iBBcFBiAP{JB}APoc@',
              line: 'a',
              headsign: 'La Poterie',
              fromStopName: 'Pontchaillou',
              toStopName: 'La Poterie',
            },
            {
              mode: TransportMode.Walk,
              durationSeconds: 691,
              distanceMeters: 671,
              geometry:
                'qaodHfe`IA?@[@@?C@C@CPY@C@E?EAA?C?GAAAA?@A?AD?D?D?B?D??EAKAMCIAG?A??C?S@GDg@GA?@CYuCNGEASCCg@?gADAOa@?eA?G@E?G@G?mABqADg@FUD[FG?AOE@A?E@g@?C@G?E??U@aA?YAOEIEGi@y@We@AA',
            },
          ],
        },
      ]);
    });

    it('n’expose ligne/direction/arrêts que sur un tronçon en transport en commun (route non nul)', async () => {
      httpPost.mockReturnValue(of({ data: loadFixture('journeys.json') }));

      const result = await provider.getJourneys({
        origin: { latitude: 48.1247, longitude: -1.6853 },
        destination: { latitude: 48.0917, longitude: -1.6423 },
      });

      const [walkToStop, transit, walkFromStop] = result[0]?.sections ?? [];
      expect(transit).toMatchObject({
        line: 'a',
        headsign: 'La Poterie',
        fromStopName: 'Pontchaillou',
        toStopName: 'La Poterie',
      });
      // Les tronçons à pied n'ont ni ligne ni arrêt réel -- OTP y renseigne
      // `from`/`to` avec des placeholders ("Origin"/"Destination"), jamais
      // exposés côté client (piège explicitement écarté, cf. otp.provider.ts).
      for (const walkLeg of [walkToStop, walkFromStop]) {
        expect(walkLeg?.line).toBeUndefined();
        expect(walkLeg?.headsign).toBeUndefined();
        expect(walkLeg?.fromStopName).toBeUndefined();
        expect(walkLeg?.toStopName).toBeUndefined();
      }
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
                      legs: [
                        {
                          mode: 'WALK',
                          duration: 600,
                          distance: 800,
                          headsign: null,
                          route: null,
                          from: { name: 'Origin' },
                          to: { name: 'Destination' },
                        },
                      ],
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
