import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Card } from './card';

describe('Card', () => {
  it('état repos : bordure 1 px Line 200, rayon 14 px, fond blanc', () => {
    render(<Card>Contenu</Card>);

    const card = screen.getByText('Contenu');
    expect(card.className).toContain('border-line-200');
    expect(card.className).toContain('bg-surface-0');
    expect(card.className).toContain('rounded-card');
    expect(card.className).not.toContain('border-2');
  });

  it('état sélectionné : bordure 2 px Blue 500, fond teinté Blue 50 (§4)', () => {
    render(<Card selected>Contenu</Card>);

    const card = screen.getByText('Contenu');
    expect(card.className).toContain('border-2');
    expect(card.className).toContain('border-brand-blue-500');
    expect(card.className).toContain('bg-brand-blue-50');
  });

  it('transmet les props HTML natives (ex. onClick, role)', () => {
    render(
      <Card role="group" aria-label="Option">
        Contenu
      </Card>,
    );

    expect(screen.getByRole('group', { name: 'Option' })).toBeInTheDocument();
  });
});
