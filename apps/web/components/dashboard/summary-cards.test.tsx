import type { CarbonLogSummary } from '@urbanflow/shared-types';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SummaryCards } from './summary-cards';

const summary: CarbonLogSummary = {
  totalCo2Grams: 1839,
  totalSavedGrams: 3400,
  monthly: [
    { month: '2026-07', co2Grams: 1500, savedGrams: 3160, tripCount: 2 },
    { month: '2026-08', co2Grams: 339, savedGrams: 240, tripCount: 1 },
  ],
};

describe('SummaryCards', () => {
  it('affiche le CO2 cumulé, les économies et le nombre total de trajets', () => {
    render(<SummaryCards summary={summary} />);

    expect(screen.getByText('1.8 kg CO2e')).toBeInTheDocument();
    expect(screen.getByText('3.4 kg CO2e')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });
});
