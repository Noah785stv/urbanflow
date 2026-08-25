import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ErrorPage from './error';

describe('ErrorPage', () => {
  it('affiche un message clair et un bouton réessayer qui appelle `reset` (§B.5)', async () => {
    const reset = vi.fn();
    const user = userEvent.setup();
    render(<ErrorPage error={new Error('boom')} reset={reset} />);

    expect(
      screen.getByRole('heading', { name: 'Quelque chose s’est mal passé' }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Réessayer' }));
    expect(reset).toHaveBeenCalledTimes(1);

    expect(screen.getByRole('link', { name: /Retour à l.accueil/ })).toHaveAttribute('href', '/');
  });
});
