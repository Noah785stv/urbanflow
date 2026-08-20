import type { PlannedJourney } from '@urbanflow/shared-types';
import { TransportMode } from '@urbanflow/shared-types';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TripResultCard } from './trip-result-card';

const journey: PlannedJourney = {
  departureAt: '2026-08-17T08:00:00+02:00',
  arrivalAt: '2026-08-17T08:16:00+02:00',
  durationSeconds: 960,
  sections: [
    { mode: TransportMode.Walk, durationSeconds: 300, distanceMeters: 400 },
    { mode: TransportMode.Bus, durationSeconds: 660, distanceMeters: 3000 },
  ],
  co2Grams: 339,
  estimatedCostCents: 180,
  labels: ['fastest', 'cheapest'],
};

describe('TripResultCard', () => {
  it('affiche les labels, la durée, le CO2 et le coût', () => {
    render(<TripResultCard journey={journey} isSelected={false} onSelect={vi.fn()} />);

    expect(screen.getByText('Le plus rapide')).toBeInTheDocument();
    expect(screen.getByText('Le moins cher')).toBeInTheDocument();
    expect(screen.getByText('16 min')).toBeInTheDocument();
    expect(screen.getByText('339 g CO2e')).toBeInTheDocument();
    expect(screen.getByText('1,80 €')).toBeInTheDocument();
  });

  it('affiche « estimation indisponible » quand le coût est null (§5.3)', () => {
    render(
      <TripResultCard
        journey={{ ...journey, estimatedCostCents: null, labels: [] }}
        isSelected={false}
        onSelect={vi.fn()}
      />,
    );

    expect(screen.getByText('estimation indisponible')).toBeInTheDocument();
  });

  it('appelle onSelect et reflète la sélection via aria-pressed (pas seulement la couleur)', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const { rerender } = render(
      <TripResultCard journey={journey} isSelected={false} onSelect={onSelect} />,
    );

    const button = screen.getByRole('button', { name: 'Sélectionner' });
    expect(button).toHaveAttribute('aria-pressed', 'false');

    await user.click(button);
    expect(onSelect).toHaveBeenCalledTimes(1);

    rerender(<TripResultCard journey={journey} isSelected onSelect={onSelect} />);
    expect(screen.getByRole('button', { name: '✓ Sélectionné' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('décompose les sections avec mode, durée et distance', () => {
    render(<TripResultCard journey={journey} isSelected={false} onSelect={vi.fn()} />);

    expect(screen.getByText(/Marche \(5 min, 400 m\)/)).toBeInTheDocument();
    expect(screen.getByText(/Bus \(11 min, 3.0 km\)/)).toBeInTheDocument();
  });
});
