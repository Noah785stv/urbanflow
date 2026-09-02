import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
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
  OtpHealthResponse,
  OtpItinerary,
  OtpLeg,
  OtpPlanConnectionResponse,
  OtpStopDeparturesResponse,
  OtpStoptime,
} from './otp.types';

const GTFS_GRAPHQL_PATH = '/otp/gtfs/v1';

const DEPARTURES_FRESHNESS_MS = 60_000;
const DEPARTURES_FALLBACK_TTL_SECONDS = 60 * 60;
const MAX_DEPARTURES = 10;
const MAX_ITINERARIES = 5;

/**
 * `stoptimesWithoutPatterns` (prochains passages à un arrêt, tous horaires
 * confondus). Le décalage temps réel est déjà répercuté sur
 * `realtimeDeparture` par OTP ; `serviceDay` sert d'ancrage epoch au décompte
 * en secondes de `scheduledDeparture`/`realtimeDeparture`.
 */
const OTP_STOP_DEPARTURES_QUERY = `
  query StopDepartures($stopId: String!, $numberOfDepartures: Int!) {
    stop(id: $stopId) {
      stoptimesWithoutPatterns(
        numberOfDepartures: $numberOfDepartures
        omitCanceled: true
      ) {
        scheduledDeparture
        realtimeDeparture
        realtime
        realtimeState
        serviceDay
        headsign
        trip {
          route {
            shortName
            mode
          }
        }
      }
    }
  }
`;

/**
 * `planConnection` (Relay-style : `edges { node } }`) — seul point d'entrée
 * de calcul d'itinéraire sur ce schéma ; le champ `plan` historique n'existe
 * pas. `start`/`end` sont des `OffsetDateTime` directement exploitables.
 */
const OTP_PLAN_CONNECTION_QUERY = `
  query PlanJourneys(
    $originLat: CoordinateValue!
    $originLon: CoordinateValue!
    $destinationLat: CoordinateValue!
    $destinationLon: CoordinateValue!
    $dateTime: PlanDateTimeInput
    $first: Int!
  ) {
    planConnection(
      origin: { location: { coordinate: { latitude: $originLat, longitude: $originLon } } }
      destination: { location: { coordinate: { latitude: $destinationLat, longitude: $destinationLon } } }
      dateTime: $dateTime
      first: $first
    ) {
      edges {
        node {
          start
          end
          duration
          legs {
            mode
            duration
            distance
            headsign
            route {
              shortName
            }
            from {
              name
            }
            to {
              name
            }
            legGeometry {
              points
            }
          }
        }
      }
    }
  }
`;

/**
 * Correspondance modes OTP (enums GraphQL `Mode` pour les tronçons
 * d'itinéraire, `TransitMode` pour les lignes de transport en commun — les
 * deux se recoupent sur les valeurs utilisées ici) vers le lexique métier
 * `TransportMode` (§4.2). Repli sur `Bus` pour tout mode non couvert par le
 * réseau STAR (avion, ferry, taxi...).
 */
const OTP_MODE_MAP: Record<string, TransportMode> = {
  WALK: TransportMode.Walk,
  BICYCLE: TransportMode.Bike,
  SCOOTER: TransportMode.Scooter,
  CARPOOL: TransportMode.Carpool,
  CAR: TransportMode.CarSolo,
  BUS: TransportMode.Bus,
  TROLLEYBUS: TransportMode.Bus,
  COACH: TransportMode.Bus,
  SUBWAY: TransportMode.Metro,
  TRAM: TransportMode.Tram,
  CABLE_CAR: TransportMode.Tram,
  GONDOLA: TransportMode.Tram,
  FUNICULAR: TransportMode.Tram,
  MONORAIL: TransportMode.Tram,
  RAIL: TransportMode.RegionalTrain,
};

/**
 * Provider OpenTripPlanner (ADR-005) — auto-hébergé, remplace Navitia (accès
 * gratuit fermé). Implémente à la fois `TransitProvider` (prochains passages,
 * exposé par F3) et `RoutingProvider` (calcul d'itinéraire, brique brute
 * consommée par F2, §2) via l'API GTFS GraphQL d'OTP.
 */
@Injectable()
export class OtpProvider implements TransitProvider, RoutingProvider {
  readonly id = 'otp';
  readonly modes: TransportMode[] = [
    TransportMode.Bus,
    TransportMode.Metro,
    TransportMode.Tram,
    TransportMode.RegionalTrain,
  ];

  private readonly logger = new Logger(OtpProvider.name);
  private readonly baseUrl: string;

  constructor(
    private readonly httpService: HttpService,
    configService: ConfigService,
    private readonly cache: DegradedCacheService,
  ) {
    this.baseUrl = configService.getOrThrow<string>('OTP_BASE_URL');
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await firstValueFrom(
        this.httpService.post<OtpHealthResponse>(
          `${this.baseUrl}${GTFS_GRAPHQL_PATH}`,
          { query: '{ feeds { feedId } }' },
        ),
      );
      return !response.data.errors?.length;
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
    const variables = {
      originLat: query.origin.latitude,
      originLon: query.origin.longitude,
      destinationLat: query.destination.latitude,
      destinationLon: query.destination.longitude,
      dateTime: query.datetime ? { earliestDeparture: query.datetime } : null,
      first: MAX_ITINERARIES,
    };

    const response = await firstValueFrom(
      this.httpService.post<OtpPlanConnectionResponse>(
        `${this.baseUrl}${GTFS_GRAPHQL_PATH}`,
        { query: OTP_PLAN_CONNECTION_QUERY, variables },
      ),
    );

    const body = response.data;
    if (body.errors?.length) {
      throw new Error(
        `OTP GraphQL: ${body.errors.map((e) => e.message).join('; ')}`,
      );
    }

    const edges = body.data?.planConnection.edges ?? [];
    return edges.map(({ node }) => this.mapItinerary(node));
  }

  private async fetchDepartures(stopId: string): Promise<OtpStoptime[]> {
    const response = await firstValueFrom(
      this.httpService.post<OtpStopDeparturesResponse>(
        `${this.baseUrl}${GTFS_GRAPHQL_PATH}`,
        {
          query: OTP_STOP_DEPARTURES_QUERY,
          variables: { stopId, numberOfDepartures: MAX_DEPARTURES },
        },
      ),
    );

    const body = response.data;
    if (body.errors?.length) {
      throw new Error(
        `OTP GraphQL: ${body.errors.map((e) => e.message).join('; ')}`,
      );
    }

    return body.data?.stop?.stoptimesWithoutPatterns ?? [];
  }

  private toDeparture(
    raw: OtpStoptime,
    stopId: string,
    updatedAt: string,
    stale: boolean,
  ): Departure {
    const departureSeconds = raw.realtimeDeparture ?? raw.scheduledDeparture;
    return {
      stopId,
      line: raw.trip?.route.shortName ?? '',
      direction: raw.headsign ?? '',
      mode: this.mapMode(raw.trip?.route.mode ?? undefined),
      scheduledAt: new Date(
        (raw.serviceDay + departureSeconds) * 1000,
      ).toISOString(),
      updatedAt,
      stale,
    };
  }

  private mapItinerary(itinerary: OtpItinerary): JourneyOption {
    return {
      departureAt: itinerary.start,
      arrivalAt: itinerary.end,
      durationSeconds: itinerary.duration,
      sections: itinerary.legs.map((leg) => this.mapLeg(leg)),
    };
  }

  /**
   * `route` n'est renseigné par OTP que pour un tronçon en transport en
   * commun (vérifié par introspection live — `null` pour la marche/le
   * vélo). C'est le signal utilisé pour exposer ligne/direction/arrêts :
   * `from`/`to` existent toujours côté OTP, mais valent "Origin"/
   * "Destination" (placeholders, pas des arrêts réels) sur un tronçon à
   * pied — ne jamais les exposer dans ce cas (détail itinéraire).
   */
  private mapLeg(leg: OtpLeg): JourneySection {
    const isTransit = Boolean(leg.route);
    return {
      mode: this.mapMode(leg.mode),
      durationSeconds: leg.duration,
      distanceMeters: Math.round(leg.distance),
      geometry: leg.legGeometry?.points ?? undefined,
      line: isTransit ? (leg.route?.shortName ?? undefined) : undefined,
      headsign: isTransit ? (leg.headsign ?? undefined) : undefined,
      fromStopName: isTransit ? leg.from?.name : undefined,
      toStopName: isTransit ? leg.to?.name : undefined,
    };
  }

  private mapMode(otpMode: string | undefined): TransportMode {
    if (!otpMode) {
      return TransportMode.Bus;
    }
    const mode = OTP_MODE_MAP[otpMode];
    if (!mode) {
      this.logger.warn(`Mode OTP non mappé « ${otpMode} » → repli sur Bus`);
      return TransportMode.Bus;
    }
    return mode;
  }
}
