import type { PlannedJourney, PlanTripRequest } from '@urbanflow/shared-types';
import { apiRequest } from './api-client';

/**
 * `PlanTripResult` (apps/api/src/modules/trip/trip-planner.service.ts)
 * n'est pas exporté par `@urbanflow/shared-types` — retypé ici depuis la
 * lecture du service, pas deviné (§3 F2-web-planner.md).
 */
export interface PlanTripResponse {
  journeys: PlannedJourney[];
  stale: boolean;
  updatedAt: string | null;
}

export function planTrip(request: PlanTripRequest): Promise<PlanTripResponse> {
  return apiRequest('/trips/plan', { method: 'POST', body: request });
}
