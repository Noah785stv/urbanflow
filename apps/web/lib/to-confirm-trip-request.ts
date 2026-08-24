import type { ConfirmTripRequest, PlannedJourney } from '@urbanflow/shared-types';

/**
 * `POST /carbon-logs` a une whitelist stricte : `durationSeconds` et
 * `geometry` (présents sur `JourneySection`, F2/F2-geometry) sont rejetés en
 * 400 s'ils sont envoyés (F4-carbon.md §6). Destructuration explicite plutôt
 * qu'un spread — ne laisse passer que ce que l'API accepte, y compris si
 * `JourneySection` gagne un futur champ.
 */
export function toConfirmTripRequest(journey: PlannedJourney): ConfirmTripRequest {
  return {
    sections: journey.sections.map(({ mode, distanceMeters }) => ({ mode, distanceMeters })),
  };
}
