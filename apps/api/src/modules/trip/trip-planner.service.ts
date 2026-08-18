import { Injectable } from '@nestjs/common';
import {
  Coordinates,
  JourneyLabel,
  JourneyOption,
  PlannedJourney,
  PlanTripRequest,
} from '@urbanflow/shared-types';
import { DegradedCacheService } from '../../common/cache/degraded-cache.service';
import { CarbonEstimatorService } from '../carbon/carbon-estimator.service';
import { ProviderRegistry } from '../integration/providers/provider-registry.service';
import { FareEstimator } from './fare-estimator.service';

// §5.4 : plan indicatif, pas un flux temps réel seconde par seconde — fenêtre
// large réutilisant le wrapper de cache dégradé de F3.
const PLAN_FRESHNESS_MS = 60_000;
const PLAN_FALLBACK_TTL_SECONDS = 10 * 60;
// Arrondi de `departureAt` dans la clé de cache : deux requêtes à quelques
// secondes d'écart partagent le même plan plutôt que de le recalculer (§5.4).
const CACHE_BUCKET_MS = 5 * 60_000;

export interface PlanTripResult {
  journeys: PlannedJourney[];
  stale: boolean;
  updatedAt: string | null;
}

/**
 * Orchestrateur du planificateur (§5) : `RoutingProvider.getJourneys` (F3) →
 * enrichissement carbone/coût → filtres → classement/étiquetage. Le mode
 * dégradé et le cache sont gérés ici, pas dans le provider (`getJourneys`
 * n'est pas caché côté F3 — voir F3-integration.md).
 */
@Injectable()
export class TripPlannerService {
  constructor(
    private readonly providerRegistry: ProviderRegistry,
    private readonly carbonEstimator: CarbonEstimatorService,
    private readonly fareEstimator: FareEstimator,
    private readonly cache: DegradedCacheService,
  ) {}

  async plan(request: PlanTripRequest): Promise<PlanTripResult> {
    const result = await this.cache.getOrRefresh(
      this.buildCacheKey(request),
      () => this.fetchAndEnrich(request),
      {
        freshnessMs: PLAN_FRESHNESS_MS,
        fallbackTtlSeconds: PLAN_FALLBACK_TTL_SECONDS,
      },
    );

    return {
      journeys: result.data ?? [],
      stale: result.stale,
      updatedAt: result.updatedAt,
    };
  }

  private async fetchAndEnrich(
    request: PlanTripRequest,
  ): Promise<PlannedJourney[]> {
    const [provider] = this.providerRegistry.getRoutingProviders();
    if (!provider) {
      throw new Error(
        'Aucun RoutingProvider enregistré (§5, F3-integration.md).',
      );
    }

    const journeys = await provider.getJourneys({
      origin: request.from,
      destination: request.to,
      datetime: request.departureAt,
    });

    const filtered = this.applyFilters(journeys, request);
    const enriched = filtered.map((journey) => this.enrich(journey));
    return this.labelJourneys(enriched);
  }

  private applyFilters(
    journeys: JourneyOption[],
    request: PlanTripRequest,
  ): JourneyOption[] {
    if (!request.excludeModes || request.excludeModes.length === 0) {
      return journeys;
    }

    const excluded = new Set(request.excludeModes);
    return journeys.filter((journey) =>
      journey.sections.every((section) => !excluded.has(section.mode)),
    );
  }

  private enrich(journey: JourneyOption): PlannedJourney {
    return {
      ...journey,
      co2Grams: this.carbonEstimator.estimateGrams(journey.sections),
      estimatedCostCents: this.fareEstimator.estimateCents(journey.sections),
      labels: [],
    };
  }

  /** Étiquette fastest/greenest/cheapest (§5.1) — un itinéraire peut cumuler plusieurs labels en cas d'égalité. */
  private labelJourneys(journeys: PlannedJourney[]): PlannedJourney[] {
    if (journeys.length === 0) {
      return journeys;
    }

    const fastest = Math.min(...journeys.map((j) => j.durationSeconds));
    const greenest = Math.min(...journeys.map((j) => j.co2Grams));
    const estimableCosts = journeys
      .map((j) => j.estimatedCostCents)
      .filter((cost): cost is number => cost !== null);
    const cheapest =
      estimableCosts.length > 0 ? Math.min(...estimableCosts) : null;

    return journeys.map((journey) => {
      const labels: JourneyLabel[] = [];
      if (journey.durationSeconds === fastest) {
        labels.push('fastest');
      }
      if (journey.co2Grams === greenest) {
        labels.push('greenest');
      }
      if (cheapest !== null && journey.estimatedCostCents === cheapest) {
        labels.push('cheapest');
      }
      return { ...journey, labels };
    });
  }

  private buildCacheKey(request: PlanTripRequest): string {
    const excludeModes = [...(request.excludeModes ?? [])].sort().join(',');
    return [
      'trip-plan',
      this.coordinateKey(request.from),
      this.coordinateKey(request.to),
      this.roundDepartureAt(request.departureAt),
      excludeModes,
      request.accessibleOnly ? 'pmr' : 'std',
    ].join(':');
  }

  private coordinateKey(coordinates: Coordinates): string {
    return `${coordinates.latitude.toFixed(4)},${coordinates.longitude.toFixed(4)}`;
  }

  private roundDepartureAt(departureAt?: string): string {
    const date = departureAt ? new Date(departureAt) : new Date();
    const rounded =
      Math.floor(date.getTime() / CACHE_BUCKET_MS) * CACHE_BUCKET_MS;
    return new Date(rounded).toISOString();
  }
}
