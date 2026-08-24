import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RankingBadge } from './ranking-badge';

describe('RankingBadge', () => {
  it('le plus rapide : fond Blue 50, texte Blue 700', () => {
    render(<RankingBadge variant="fastest">Le plus rapide</RankingBadge>);

    const badge = screen.getByText('Le plus rapide');
    expect(badge.className).toContain('bg-brand-blue-50');
    expect(badge.className).toContain('text-brand-blue-700');
  });

  it('le plus écologique : fond Green 50, texte Green 700', () => {
    render(<RankingBadge variant="greenest">Le plus écologique</RankingBadge>);

    const badge = screen.getByText('Le plus écologique');
    expect(badge.className).toContain('bg-brand-green-50');
    expect(badge.className).toContain('text-brand-green-700');
  });

  it('le moins cher : neutre (Surface 50 / Ink 900)', () => {
    render(<RankingBadge variant="cheapest">Le moins cher</RankingBadge>);

    const badge = screen.getByText('Le moins cher');
    expect(badge.className).toContain('bg-surface-50');
    expect(badge.className).toContain('text-ink-900');
  });

  it('perturbation : alerte (Alert 600), §4', () => {
    render(<RankingBadge variant="disruption">Perturbation</RankingBadge>);

    const badge = screen.getByText('Perturbation');
    expect(badge.className).toContain('text-alert-600');
    expect(badge.className).toContain('border-alert-600');
  });
});
