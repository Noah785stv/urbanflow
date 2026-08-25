import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LinkButton } from './link-button';

describe('LinkButton', () => {
  it('rend un lien de navigation (pas un bouton) vers la cible donnée', () => {
    render(<LinkButton href="/">Retour à l&rsquo;accueil</LinkButton>);

    const link = screen.getByRole('link', { name: /Retour à l.accueil/ });
    expect(link).toHaveAttribute('href', '/');
  });
});
