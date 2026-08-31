import type { StationNearbyResult } from '@urbanflow/shared-types';
import { apiRequest } from './api-client';

export interface FindNearbyStationsParams {
  lat: number;
  lng: number;
  radius: number;
}

/** `GET /stations/nearby` (§3 web-gbfs-stations.md) — tableau trié par distance croissante. */
export function findNearbyStations(
  params: FindNearbyStationsParams,
): Promise<StationNearbyResult[]> {
  return apiRequest(`/stations/nearby?lat=${params.lat}&lng=${params.lng}&radius=${params.radius}`);
}
