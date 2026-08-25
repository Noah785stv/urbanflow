import type {
  CarbonLog,
  CarbonLogPage,
  CarbonLogSummary,
  ConfirmTripRequest,
} from '@urbanflow/shared-types';
import { apiRequest, apiRequestBlob } from './api-client';

export function confirmTrip(request: ConfirmTripRequest): Promise<CarbonLog> {
  return apiRequest('/carbon-logs', { method: 'POST', body: request });
}

export function getCarbonLogSummary(): Promise<CarbonLogSummary> {
  return apiRequest('/carbon-logs/summary');
}

export function listCarbonLogs(page: number, limit: number): Promise<CarbonLogPage> {
  return apiRequest(`/carbon-logs?page=${page}&limit=${limit}`);
}

/** `month` au format `YYYY-MM` (F4-carbon.md §8). */
export function downloadMonthlyReport(month: string): Promise<Blob> {
  return apiRequestBlob(`/carbon-logs/report?month=${month}`);
}
