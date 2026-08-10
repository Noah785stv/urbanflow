import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Station as SharedStation,
  StationStatus,
} from '@urbanflow/shared-types';
import { Repository } from 'typeorm';
import { Station } from './entities/station.entity';
import { ProviderRegistry } from './providers/provider-registry.service';

export interface StationNearbyResult {
  station: SharedStation;
  distanceMeters: number;
  status: StationStatus | null;
}

function toSharedStation(entity: Station): SharedStation {
  return {
    id: entity.id,
    provider: entity.provider,
    externalId: entity.externalId,
    name: entity.name,
    stationType: entity.stationType,
    location: {
      latitude: entity.location.coordinates[1],
      longitude: entity.location.coordinates[0],
    },
    capacity: entity.capacity,
  };
}

/** Service Stations (§4.1, §8) — proximité PostGIS enrichie du statut temps réel. */
@Injectable()
export class StationsService {
  constructor(
    @InjectRepository(Station)
    private readonly stationRepository: Repository<Station>,
    private readonly providerRegistry: ProviderRegistry,
  ) {}

  async findNearby(
    lat: number,
    lng: number,
    radiusMeters: number,
  ): Promise<StationNearbyResult[]> {
    const { entities, raw } = await this.stationRepository
      .createQueryBuilder('station')
      .addSelect(
        'ST_Distance(station.location, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography)',
        'distance',
      )
      .where(
        'ST_DWithin(station.location, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography, :radius)',
      )
      .setParameters({ lat, lng, radius: radiusMeters })
      .orderBy('distance', 'ASC')
      .getRawAndEntities<{ distance: string }>();

    if (entities.length === 0) {
      return [];
    }

    const externalIds = [
      ...new Set(entities.map((station) => station.externalId)),
    ];
    const statuses = await this.collectStatuses(externalIds);

    return entities.map((station, index) => {
      const status = statuses.find(
        (candidate) =>
          candidate.provider === station.provider &&
          candidate.externalId === station.externalId,
      );

      // getRawAndEntities() garantit le même ordre/longueur entre `raw` et `entities`.
      const distance = raw[index]?.distance ?? '0';

      return {
        station: toSharedStation(station),
        distanceMeters: Number(distance),
        status: status ?? null,
      };
    });
  }

  private async collectStatuses(
    externalIds: string[],
  ): Promise<StationStatus[]> {
    const providers = this.providerRegistry.getSharedMobilityProviders();
    const results = await Promise.all(
      providers.map((provider) => provider.getStationStatus(externalIds)),
    );
    return results.flat();
  }
}
