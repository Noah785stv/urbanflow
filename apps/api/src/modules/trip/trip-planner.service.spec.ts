import { JourneyOption, TransportMode } from '@urbanflow/shared-types';
import { DegradedCacheService } from '../../common/cache/degraded-cache.service';
import { CarbonEstimatorService } from '../carbon/carbon-estimator.service';
import { ProviderRegistry } from '../integration/providers/provider-registry.service';
import { FareEstimator } from './fare-estimator.service';
import { TripPlannerService } from './trip-planner.service';

function journey(durationSeconds: number, mode: TransportMode): JourneyOption {
  return {
    departureAt: '2026-08-17T08:00:00+02:00',
    arrivalAt: '2026-08-17T08:30:00+02:00',
    durationSeconds,
    sections: [{ mode, durationSeconds, distanceMeters: 1000 }],
  };
}

describe('TripPlannerService', () => {
  let providerRegistry: { getRoutingProviders: jest.Mock };
  let carbonEstimator: { estimateGrams: jest.Mock };
  let fareEstimator: { estimateCents: jest.Mock };
  let cache: { getOrRefresh: jest.Mock };
  let routingProvider: { getJourneys: jest.Mock };
  let service: TripPlannerService;

  beforeEach(() => {
    routingProvider = { getJourneys: jest.fn() };
    providerRegistry = {
      getRoutingProviders: jest.fn().mockReturnValue([routingProvider]),
    };
    carbonEstimator = { estimateGrams: jest.fn() };
    fareEstimator = { estimateCents: jest.fn() };
    cache = {
      getOrRefresh: jest.fn(
        async (_key: string, fetcher: () => Promise<unknown>) => ({
          data: await fetcher(),
          stale: false,
          updatedAt: '2026-01-01T00:00:00.000Z',
        }),
      ),
    };

    service = new TripPlannerService(
      providerRegistry as unknown as ProviderRegistry,
      carbonEstimator as unknown as CarbonEstimatorService,
      fareEstimator as unknown as FareEstimator,
      cache as unknown as DegradedCacheService,
    );
  });

  const baseRequest = {
    from: { latitude: 48.1173, longitude: -1.6778 },
    to: { latitude: 48.1257, longitude: -1.7075 },
  };

  it('enrichit, classe et cumule les labels en cas d’égalité (§5.1)', async () => {
    routingProvider.getJourneys.mockResolvedValue([
      journey(1000, TransportMode.Bus), // fastest
      journey(1500, TransportMode.Metro), // greenest + cheapest
      journey(2000, TransportMode.CarSolo), // ni l'un ni l'autre, coût non estimable
    ]);
    carbonEstimator.estimateGrams
      .mockReturnValueOnce(500)
      .mockReturnValueOnce(100)
      .mockReturnValueOnce(800);
    fareEstimator.estimateCents
      .mockReturnValueOnce(300)
      .mockReturnValueOnce(200)
      .mockReturnValueOnce(null);

    const result = await service.plan(baseRequest);

    expect(result.stale).toBe(false);
    expect(result.journeys).toHaveLength(3);
    expect(result.journeys[0]).toMatchObject({ labels: ['fastest'] });
    expect(result.journeys[1]).toMatchObject({
      labels: ['greenest', 'cheapest'],
    });
    expect(result.journeys[2]).toMatchObject({ labels: [] });
  });

  it('n’attribue jamais cheapest si aucune option n’a de coût estimable', async () => {
    routingProvider.getJourneys.mockResolvedValue([
      journey(1000, TransportMode.ElectricBike),
      journey(2000, TransportMode.Carpool),
    ]);
    carbonEstimator.estimateGrams
      .mockReturnValueOnce(50)
      .mockReturnValueOnce(80);
    fareEstimator.estimateCents.mockReturnValue(null);

    const result = await service.plan(baseRequest);

    expect(result.journeys.every((j) => j.estimatedCostCents === null)).toBe(
      true,
    );
    expect(result.journeys.some((j) => j.labels.includes('cheapest'))).toBe(
      false,
    );
  });

  it('exclut les itinéraires portant un mode de excludeModes (§5.5)', async () => {
    routingProvider.getJourneys.mockResolvedValue([
      journey(1000, TransportMode.CarSolo),
      journey(1500, TransportMode.Bus),
    ]);
    carbonEstimator.estimateGrams.mockReturnValue(0);
    fareEstimator.estimateCents.mockReturnValue(0);

    const result = await service.plan({
      ...baseRequest,
      excludeModes: [TransportMode.CarSolo],
    });

    expect(result.journeys).toHaveLength(1);
    expect(result.journeys[0]?.sections[0]?.mode).toBe(TransportMode.Bus);
  });

  it('ne renvoie aucune option sans en inventer si le provider n’en renvoie aucune', async () => {
    routingProvider.getJourneys.mockResolvedValue([]);

    const result = await service.plan(baseRequest);

    expect(result.journeys).toEqual([]);
  });

  it('la fonction de récupération échoue si aucun RoutingProvider n’est enregistré (déclenche le mode dégradé)', async () => {
    providerRegistry.getRoutingProviders.mockReturnValue([]);

    await expect(service.plan(baseRequest)).rejects.toThrow(
      'Aucun RoutingProvider enregistré',
    );
  });

  it('propage l’échec du provider pour déclencher le mode dégradé (§7)', async () => {
    routingProvider.getJourneys.mockRejectedValue(
      new Error('OTP indisponible'),
    );

    await expect(service.plan(baseRequest)).rejects.toThrow('OTP indisponible');
  });

  it('mappe un résultat dégradé du cache vers une réponse vide signalée stale', async () => {
    cache.getOrRefresh.mockResolvedValue({
      data: null,
      stale: true,
      updatedAt: null,
    });

    const result = await service.plan(baseRequest);

    expect(result).toEqual({ journeys: [], stale: true, updatedAt: null });
  });

  it('dérive la clé de cache de origin/destination/departureAt arrondi/filtres (§5.4)', async () => {
    routingProvider.getJourneys.mockResolvedValue([]);

    await service.plan({
      ...baseRequest,
      departureAt: '2026-08-17T08:03:00+02:00',
      excludeModes: [TransportMode.CarSolo, TransportMode.Bike],
      accessibleOnly: true,
    });

    const [key] = cache.getOrRefresh.mock.calls[0] as [string];
    expect(key).toBe(
      'trip-plan:48.1173,-1.6778:48.1257,-1.7075:2026-08-17T06:00:00.000Z:bike,car_solo:pmr',
    );
  });
});
