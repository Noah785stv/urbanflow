import { StationType } from '@urbanflow/shared-types';
import { Repository } from 'typeorm';
import { Station } from './entities/station.entity';
import { ProviderRegistry } from './providers/provider-registry.service';
import { StationsService } from './stations.service';

function buildStation(overrides: Partial<Station> = {}): Station {
  return {
    id: 'station-id',
    tenantId: 'tenant-id',
    provider: 'gbfs:test',
    externalId: '101',
    name: 'Station',
    stationType: StationType.Dock,
    location: { type: 'Point', coordinates: [-1.6778, 48.1173] },
    capacity: 10,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('StationsService', () => {
  let queryBuilder: {
    addSelect: jest.Mock;
    where: jest.Mock;
    setParameters: jest.Mock;
    orderBy: jest.Mock;
    getRawAndEntities: jest.Mock;
  };
  let stationRepository: { createQueryBuilder: jest.Mock };
  let providerRegistry: { getSharedMobilityProviders: jest.Mock };
  let service: StationsService;

  beforeEach(() => {
    queryBuilder = {
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      setParameters: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getRawAndEntities: jest.fn(),
    };
    stationRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    };
    providerRegistry = {
      getSharedMobilityProviders: jest.fn().mockReturnValue([]),
    };

    service = new StationsService(
      stationRepository as unknown as Repository<Station>,
      providerRegistry as unknown as ProviderRegistry,
    );
  });

  it('convertit la localisation GeoJSON en Coordinates et la distance en nombre', async () => {
    queryBuilder.getRawAndEntities.mockResolvedValue({
      entities: [buildStation()],
      raw: [{ distance: '123.45' }],
    });

    const result = await service.findNearby(48.1173, -1.6778, 500);

    expect(result).toEqual([
      {
        station: {
          id: 'station-id',
          provider: 'gbfs:test',
          externalId: '101',
          name: 'Station',
          stationType: 'dock',
          location: { latitude: 48.1173, longitude: -1.6778 },
          capacity: 10,
        },
        distanceMeters: 123.45,
        status: null,
      },
    ]);
  });

  it("ne requête pas les providers si aucune station n'est trouvée", async () => {
    queryBuilder.getRawAndEntities.mockResolvedValue({ entities: [], raw: [] });

    const result = await service.findNearby(48.1173, -1.6778, 500);

    expect(result).toEqual([]);
    expect(providerRegistry.getSharedMobilityProviders).not.toHaveBeenCalled();
  });

  it('associe le statut à la bonne station via (provider, externalId)', async () => {
    queryBuilder.getRawAndEntities.mockResolvedValue({
      entities: [
        buildStation({ externalId: '101' }),
        buildStation({ externalId: '102', id: 'other' }),
      ],
      raw: [{ distance: '10' }, { distance: '20' }],
    });
    providerRegistry.getSharedMobilityProviders.mockReturnValue([
      {
        getStationStatus: jest.fn().mockResolvedValue([
          {
            provider: 'gbfs:test',
            externalId: '101',
            bikesAvailable: 3,
            docksAvailable: 7,
            updatedAt: 'now',
            stale: false,
          },
        ]),
      },
    ]);

    const result = await service.findNearby(48.1173, -1.6778, 500);

    expect(result[0]?.status).toEqual(
      expect.objectContaining({ externalId: '101', bikesAvailable: 3 }),
    );
    expect(result[1]?.status).toBeNull();
  });

  it('interroge tous les providers de mobilité partagée enregistrés avec les externalIds trouvés', async () => {
    queryBuilder.getRawAndEntities.mockResolvedValue({
      entities: [buildStation()],
      raw: [{ distance: '0' }],
    });
    const provider = { getStationStatus: jest.fn().mockResolvedValue([]) };
    providerRegistry.getSharedMobilityProviders.mockReturnValue([provider]);

    await service.findNearby(48.1173, -1.6778, 500);

    expect(provider.getStationStatus).toHaveBeenCalledWith(['101']);
  });
});
