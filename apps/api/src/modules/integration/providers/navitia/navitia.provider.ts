import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Departure,
  JourneyOption,
  JourneyQuery,
  JourneySection,
  TransportMode,
} from '@urbanflow/shared-types';
import { firstValueFrom } from 'rxjs';
import { DegradedCacheService } from '../../../../common/cache/degraded-cache.service';
import { RoutingProvider, TransitProvider } from '../provider.interfaces';
import {
  NavitiaDeparture,
  NavitiaDeparturesResponse,
  NavitiaJourneysResponse,
  NavitiaSection,
} from './navitia.types';

const DEPARTURES_FRESHNESS_MS = 60_000;
const DEPARTURES_FALLBACK_TTL_SECONDS = 60 * 60;

// Correspondance mode Navitia -> TransportMode (§6). Navitia utilise des
// libellés différents selon le contexte (`physical_mode` capitalisé pour le
// transport en commun, `mode` en minuscules pour les sections piétonnes/vélo
// du routing) — comparaison insensible à la casse. À confirmer/enrichir
// contre la doc Navitia à jour et la nomenclature réelle du réseau STAR.
const NAVITIA_MODE_MAP: Record<string, TransportMode> = {
  bus: TransportMode.Bus,
  car: TransportMode.Bus,
  metro: TransportMode.Metro,
  tramway: TransportMode.Tram,
  tram: TransportMode.Tram,
  rapidtransit: TransportMode.RegionalTrain,
  localtrain: TransportMode.RegionalTrain,
  train: TransportMode.RegionalTrain,
  bicycle: TransportMode.Bike,
  bicyclerental: TransportMode.Bike,
  bss: TransportMode.Bike,
  walking: TransportMode.Walk,
};

function toTransportMode(navitiaMode: string | undefined): TransportMode {
  if (!navitiaMode) {
    return TransportMode.Bus;
  }
  return NAVITIA_MODE_MAP[navitiaMode.toLowerCase()] ?? TransportMode.Bus;
}

/** Navitia : "YYYYMMDDTHHmmss" (UTC) -> ISO 8601. */
function parseNavitiaDateTime(value: string): string {
  const match = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})$/.exec(value);
  if (!match) {
    throw new Error(`Date Navitia invalide : "${value}"`);
  }
  const [, year, month, day, hour, minute, second] = match;
  return `${year}-${month}-${day}T${hour}:${minute}:${second}Z`;
}

/** ISO 8601 -> Navitia "YYYYMMDDTHHmmss" (UTC). */
function toNavitiaDateTime(iso: string): string {
  const date = new Date(iso);
  const pad = (value: number): string => String(value).padStart(2, '0');
  return (
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}`
  );
}

/**
 * Provider Navitia (§6) — prochains passages (`getDepartures`, exposé par F3)
 * et calcul d'itinéraire (`getJourneys`, brique routing brute consommée par
 * F2 — aucun endpoint F3 ne l'expose directement, §2).
 */
@Injectable()
export class NavitiaProvider implements TransitProvider, RoutingProvider {
  readonly id = 'navitia';
  readonly modes: TransportMode[] = [
    TransportMode.Bus,
    TransportMode.Metro,
    TransportMode.Tram,
    TransportMode.RegionalTrain,
  ];

  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly coverage: string;

  constructor(
    private readonly httpService: HttpService,
    configService: ConfigService,
    private readonly cache: DegradedCacheService,
  ) {
    this.baseUrl = configService.getOrThrow<string>('NAVITIA_BASE_URL');
    this.apiKey = configService.getOrThrow<string>('NAVITIA_API_KEY');
    this.coverage = configService.getOrThrow<string>('NAVITIA_COVERAGE');
  }

  async isAvailable(): Promise<boolean> {
    try {
      await firstValueFrom(
        this.httpService.get(
          `${this.baseUrl}/coverage/${this.coverage}`,
          this.requestConfig(),
        ),
      );
      return true;
    } catch {
      return false;
    }
  }

  async getDepartures(stopId: string): Promise<Departure[]> {
    const result = await this.cache.getOrRefresh(
      `departures:${stopId}`,
      () => this.fetchDepartures(stopId),
      {
        freshnessMs: DEPARTURES_FRESHNESS_MS,
        fallbackTtlSeconds: DEPARTURES_FALLBACK_TTL_SECONDS,
      },
    );

    const updatedAt = result.updatedAt ?? new Date().toISOString();
    return (result.data ?? []).map((raw) =>
      this.toDeparture(raw, stopId, updatedAt, result.stale),
    );
  }

  async getJourneys(query: JourneyQuery): Promise<JourneyOption[]> {
    const params: Record<string, string> = {
      from: `${query.origin.longitude};${query.origin.latitude}`,
      to: `${query.destination.longitude};${query.destination.latitude}`,
    };
    if (query.datetime) {
      params.datetime = toNavitiaDateTime(query.datetime);
    }

    const response = await firstValueFrom(
      this.httpService.get<NavitiaJourneysResponse>(
        `${this.baseUrl}/coverage/${this.coverage}/journeys`,
        { ...this.requestConfig(), params },
      ),
    );

    return response.data.journeys.map((journey) => ({
      departureAt: parseNavitiaDateTime(journey.departure_date_time),
      arrivalAt: parseNavitiaDateTime(journey.arrival_date_time),
      durationSeconds: journey.duration,
      sections: journey.sections.map((section) => this.toSection(section)),
    }));
  }

  private async fetchDepartures(stopId: string): Promise<NavitiaDeparture[]> {
    const response = await firstValueFrom(
      this.httpService.get<NavitiaDeparturesResponse>(
        `${this.baseUrl}/coverage/${this.coverage}/stop_points/${stopId}/departures`,
        this.requestConfig(),
      ),
    );
    return response.data.departures;
  }

  private toDeparture(
    raw: NavitiaDeparture,
    stopId: string,
    updatedAt: string,
    stale: boolean,
  ): Departure {
    return {
      stopId,
      line: raw.display_informations.label ?? '',
      direction: raw.display_informations.direction ?? '',
      mode: toTransportMode(raw.display_informations.physical_mode),
      scheduledAt: parseNavitiaDateTime(raw.stop_date_time.departure_date_time),
      updatedAt,
      stale,
    };
  }

  private toSection(section: NavitiaSection): JourneySection {
    return {
      mode: toTransportMode(
        section.display_informations?.physical_mode ?? section.mode,
      ),
      durationSeconds: section.duration,
      // Navitia expose la distance dans les propriétés GeoJSON par tronçon ;
      // à affiner en F2 avec un échantillon réel de réponse (§14).
      distanceMeters: 0,
    };
  }

  private requestConfig(): { headers: Record<string, string> } {
    // Convention Navitia : la clé API est transmise telle quelle dans
    // l'en-tête Authorization (à confirmer contre la doc à jour — §14).
    return { headers: { Authorization: this.apiKey } };
  }
}
