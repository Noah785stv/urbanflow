import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import {
  StationStatus,
  StationType,
  TransportMode,
} from '@urbanflow/shared-types';
import { firstValueFrom } from 'rxjs';
import { Repository } from 'typeorm';
import { DegradedCacheService } from '../../../../common/cache/degraded-cache.service';
import { DEFAULT_TENANT_ID } from '../../../../common/constants/tenant.constants';
import { Station } from '../../entities/station.entity';
import { SharedMobilityProvider } from '../provider.interfaces';
import {
  GbfsDiscoveryResponse,
  GbfsStationInformationResponse,
  GbfsStationStatus,
  GbfsStationStatusResponse,
} from './gbfs.types';

// §4.2 : fenêtre de fraîcheur ≤ 60 s ; TTL Redis plus long, filet de secours en cas de panne.
const STATUS_FRESHNESS_MS = 60_000;
const STATUS_FALLBACK_TTL_SECONDS = 60 * 60;

/**
 * Provider GBFS (§6) — mobilité partagée (vélos/trottinettes en libre-service
 * sur stations physiques). `syncStations` persiste l'inventaire (rarement
 * modifié) en PostGIS ; `getStationStatus` sert les disponibilités (volatiles)
 * via le wrapper de cache dégradé, jamais persistées (§4.2).
 *
 * Simplification assumée : les stations GBFS `station_information` sont
 * toutes typées `StationType.Dock` (station physique de dépôt/retrait,
 * vélos ou trottinettes) — GBFS ne distingue le véhicule qu'au niveau de
 * `vehicle_types.json`, hors périmètre de ce premier incrément.
 */
@Injectable()
export class GbfsProvider implements SharedMobilityProvider {
  readonly id = 'gbfs';
  readonly modes: TransportMode[] = [TransportMode.Bike, TransportMode.Scooter];

  private readonly logger = new Logger(GbfsProvider.name);
  private readonly feedUrls: string[];

  constructor(
    private readonly httpService: HttpService,
    configService: ConfigService,
    private readonly cache: DegradedCacheService,
    @InjectRepository(Station)
    private readonly stationRepository: Repository<Station>,
  ) {
    this.feedUrls = JSON.parse(
      configService.getOrThrow<string>('GBFS_FEED_URLS'),
    ) as string[];
  }

  async isAvailable(): Promise<boolean> {
    if (this.feedUrls.length === 0) {
      return false;
    }
    try {
      await Promise.all(this.feedUrls.map((url) => this.discoverFeeds(url)));
      return true;
    } catch {
      return false;
    }
  }

  async syncStations(): Promise<void> {
    await Promise.all(
      this.feedUrls.map((discoveryUrl) => this.syncOperator(discoveryUrl)),
    );
  }

  async getStationStatus(externalIds: string[]): Promise<StationStatus[]> {
    const results: StationStatus[] = [];

    for (const discoveryUrl of this.feedUrls) {
      const providerId = this.providerIdFor(discoveryUrl);
      const result = await this.cache.getOrRefresh(
        `station-status:${providerId}:batch`,
        () => this.fetchStationStatus(discoveryUrl),
        {
          freshnessMs: STATUS_FRESHNESS_MS,
          fallbackTtlSeconds: STATUS_FALLBACK_TTL_SECONDS,
        },
      );

      const updatedAt = result.updatedAt ?? new Date().toISOString();
      for (const status of result.data ?? []) {
        if (externalIds.includes(status.station_id)) {
          results.push({
            provider: providerId,
            externalId: status.station_id,
            bikesAvailable: status.num_bikes_available,
            docksAvailable: status.num_docks_available,
            updatedAt,
            stale: result.stale,
          });
        }
      }
    }

    return results;
  }

  private async syncOperator(discoveryUrl: string): Promise<void> {
    const providerId = this.providerIdFor(discoveryUrl);
    try {
      const feeds = await this.discoverFeeds(discoveryUrl);
      const informationUrl = feeds.get('station_information');
      if (!informationUrl) {
        this.logger.warn(
          `Flux "station_information" absent pour ${providerId}.`,
        );
        return;
      }

      const response = await firstValueFrom(
        this.httpService.get<GbfsStationInformationResponse>(informationUrl),
      );

      await Promise.all(
        response.data.data.stations.map((raw) =>
          this.stationRepository.upsert(
            {
              tenantId: DEFAULT_TENANT_ID,
              provider: providerId,
              externalId: raw.station_id,
              name: raw.name,
              stationType: StationType.Dock,
              location: { type: 'Point', coordinates: [raw.lon, raw.lat] },
              capacity: raw.capacity ?? null,
            },
            ['provider', 'externalId'],
          ),
        ),
      );
    } catch (error) {
      // §4.6 : la panne d'un opérateur ne doit jamais bloquer les autres.
      const reason = error instanceof Error ? error.message : 'erreur inconnue';
      this.logger.warn(
        `Synchronisation GBFS échouée pour ${providerId} (${reason}).`,
      );
    }
  }

  private async fetchStationStatus(
    discoveryUrl: string,
  ): Promise<GbfsStationStatus[]> {
    const feeds = await this.discoverFeeds(discoveryUrl);
    const statusUrl = feeds.get('station_status');
    if (!statusUrl) {
      throw new Error('Flux "station_status" absent.');
    }

    const response = await firstValueFrom(
      this.httpService.get<GbfsStationStatusResponse>(statusUrl),
    );
    return response.data.data.stations;
  }

  /**
   * Découverte GBFS à 2 sauts (gbfs.json → sous-flux). §9 A10 : les URLs de
   * sous-flux retournées par l'opérateur doivent appartenir au même hôte que
   * l'URL de découverte configurée — jamais un hôte arbitraire.
   */
  private async discoverFeeds(
    discoveryUrl: string,
  ): Promise<Map<string, string>> {
    const response = await firstValueFrom(
      this.httpService.get<GbfsDiscoveryResponse>(discoveryUrl),
    );
    const allowedHost = new URL(discoveryUrl).host;
    const feeds = new Map<string, string>();

    for (const language of Object.values(response.data.data)) {
      for (const feed of language.feeds) {
        const feedHost = new URL(feed.url).host;
        if (feedHost !== allowedHost) {
          throw new Error(
            `Flux GBFS refusé : hôte "${feedHost}" hors liste blanche (attendu "${allowedHost}").`,
          );
        }
        feeds.set(feed.name, feed.url);
      }
    }

    return feeds;
  }

  private providerIdFor(discoveryUrl: string): string {
    return `gbfs:${new URL(discoveryUrl).hostname}`;
  }
}
