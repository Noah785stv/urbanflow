import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ModeChip } from './mode-chip';

describe('ModeChip', () => {
  it('affiche le libellé texte, jamais uniquement la couleur (WCAG 1.4.1, §2)', () => {
    render(<ModeChip color="#5B3B9E" initial="M" label="Métro" />);

    expect(screen.getByText('Métro')).toBeInTheDocument();
  });

  it('le carré coloré est décoratif (aria-hidden) : le libellé porte l’information', () => {
    const { container } = render(<ModeChip color="#5B3B9E" initial="M" label="Métro" />);

    const square = container.querySelector('[aria-hidden="true"]');
    expect(square).toHaveTextContent('M');
    expect(square).toHaveStyle({ backgroundColor: '#5B3B9E' });
  });
});
