import type { MonthlyCarbonBreakdown } from '@urbanflow/shared-types';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MonthlyChart } from './monthly-chart';

const monthly: MonthlyCarbonBreakdown[] = [
  { month: '2026-07', co2Grams: 1500, savedGrams: 3160, tripCount: 2 },
  { month: '2026-08', co2Grams: 339, savedGrams: 240, tripCount: 1 },
];

describe('MonthlyChart', () => {
  it('affiche un message quand aucune donnée mensuelle', () => {
    render(<MonthlyChart monthly={[]} />);

    expect(screen.getByText(/Aucune donnée mensuelle/)).toBeInTheDocument();
  });

  it('le SVG est décoratif (aria-hidden) : la donnée réelle vit dans la table (§8)', () => {
    const { container } = render(<MonthlyChart monthly={monthly} />);

    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('la table porte exactement les mêmes données que le graphe, pour chaque mois', () => {
    render(<MonthlyChart monthly={monthly} />);

    const table = screen.getByRole('table');
    const rows = screen.getAllByRole('row').slice(1); // exclut l'en-tête
    expect(rows).toHaveLength(2);

    expect(table).toHaveTextContent('1.5 kg CO2e');
    expect(table).toHaveTextContent('3.2 kg CO2e');
    expect(table).toHaveTextContent('339 g CO2e');
    expect(table).toHaveTextContent('240 g CO2e');
  });

  it('propose un export PDF par mois dans la table', () => {
    render(<MonthlyChart monthly={monthly} />);

    expect(
      screen.getByRole('button', { name: /Exporter le bilan de 2026-07/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Exporter le bilan de 2026-08/ }),
    ).toBeInTheDocument();
  });
});
