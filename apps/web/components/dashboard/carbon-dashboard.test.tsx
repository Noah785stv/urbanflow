import type { CarbonLogSummary } from '@urbanflow/shared-types';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../lib/api-client';
import { CarbonDashboard } from './carbon-dashboard';

const getCarbonLogSummary = vi.fn();
const listCarbonLogs = vi.fn();

vi.mock('../../lib/carbon-api', () => ({
  getCarbonLogSummary: () => getCarbonLogSummary(),
  listCarbonLogs: (...args: unknown[]) => listCarbonLogs(...args),
}));

const summary: CarbonLogSummary = {
  totalCo2Grams: 839,
  totalSavedGrams: 340,
  monthly: [{ month: '2026-08', co2Grams: 339, savedGrams: 240, tripCount: 1 }],
};

describe('CarbonDashboard', () => {
  beforeEach(() => {
    getCarbonLogSummary.mockReset();
    listCarbonLogs.mockReset();
    listCarbonLogs.mockResolvedValue({ items: [], total: 0, page: 1, limit: 10 });
  });

  it('affiche le résumé, le graphe et les trajets récents une fois chargé', async () => {
    getCarbonLogSummary.mockResolvedValueOnce(summary);
    render(<CarbonDashboard />);

    expect(await screen.findByText('839 g CO2e')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Historique mensuel' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Trajets récents' })).toBeInTheDocument();
  });

  it("affiche un message d'erreur si le résumé ne charge pas, sans planter", async () => {
    getCarbonLogSummary.mockRejectedValueOnce(new ApiError(500, 'Service indisponible.'));
    render(<CarbonDashboard />);

    expect(await screen.findByText('Service indisponible.')).toBeInTheDocument();
  });
});
