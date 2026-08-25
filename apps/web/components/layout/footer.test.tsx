import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Footer } from './footer';

describe('Footer', () => {
  it('expose les trois liens attendus dans une navigation nommée (§B.1)', () => {
    render(<Footer />);

    const nav = screen.getByRole('navigation', { name: 'Pied de page' });
    expect(nav.querySelector('a[href="/a-propos"]')).toHaveTextContent('À propos');
    expect(nav.querySelector('a[href="/confidentialite"]')).toHaveTextContent(
      'Politique de confidentialité',
    );
    expect(nav.querySelector('a[href="/mentions-legales"]')).toHaveTextContent('Mentions légales');
  });
});
