import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { describe, expect, it, vi } from 'vitest';
import ErrorPage from './error';

function seriousOrCritical(results: axe.AxeResults) {
  return results.violations.filter(
    (violation) => violation.impact === 'critical' || violation.impact === 'serious',
  );
}

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

  it("n'a aucune violation axe-core critical/serious (§14) — page inatteignable par navigation, testée en jsdom faute de déclencheur e2e", async () => {
    const { container } = render(<ErrorPage error={new Error('boom')} reset={vi.fn()} />);

    const results = await axe.run(container);

    expect(seriousOrCritical(results)).toEqual([]);
  });
});
