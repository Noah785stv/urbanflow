import type { CarbonLogPage } from '@urbanflow/shared-types';
import { TransportMode } from '@urbanflow/shared-types';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RecentLogs } from './recent-logs';

const listCarbonLogs = vi.fn();

vi.mock('../../lib/carbon-api', () => ({
  listCarbonLogs: (...args: unknown[]) => listCarbonLogs(...args),
}));

function buildPage(overrides: Partial<CarbonLogPage> = {}): CarbonLogPage {
  return {
    items: [
      {
        id: 'log-1',
        loggedAt: '2026-08-17T08:00:00.000Z',
        co2Grams: 339,
        distanceMeters: 3000,
        referenceCo2Grams: 579,
        savedGrams: 240,
        modeBreakdown: [{ mode: TransportMode.Bus, distanceMeters: 3000, co2Grams: 339 }],
        createdAt: '2026-08-17T08:01:00.000Z',
      },
    ],
    total: 1,
    page: 1,
    limit: 10,
    ...overrides,
  };
}

describe('RecentLogs', () => {
  beforeEach(() => {
    listCarbonLogs.mockReset();
  });

  it('affiche les trajets confirmés avec leur décomposition par mode', async () => {
    listCarbonLogs.mockResolvedValueOnce(buildPage());
    render(<RecentLogs />);

    expect(await screen.findByText(/Bus \(3.0 km\)/)).toBeInTheDocument();
    expect(listCarbonLogs).toHaveBeenCalledWith(1, 10);
  });

  it("affiche un message quand aucun trajet n'est confirmé", async () => {
    listCarbonLogs.mockResolvedValueOnce(buildPage({ items: [], total: 0 }));
    render(<RecentLogs />);

    expect(await screen.findByText('Aucun trajet confirmé pour le moment.')).toBeInTheDocument();
  });

  it("n'affiche la pagination que si plus d'une page existe", async () => {
    listCarbonLogs.mockResolvedValueOnce(buildPage({ total: 1 }));
    render(<RecentLogs />);

    await screen.findByText(/Bus/);
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  });

  it('charge la page suivante au clic sur « Suivant »', async () => {
    listCarbonLogs.mockResolvedValueOnce(buildPage({ total: 25, page: 1 }));
    const user = userEvent.setup();
    render(<RecentLogs />);

    await screen.findByText(/Bus/);
    listCarbonLogs.mockResolvedValueOnce(buildPage({ total: 25, page: 2 }));

    await user.click(screen.getByRole('button', { name: 'Suivant' }));

    await waitFor(() => expect(listCarbonLogs).toHaveBeenCalledWith(2, 10));
  });
});
