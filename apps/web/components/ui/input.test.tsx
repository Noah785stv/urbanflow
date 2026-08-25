import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Input } from './input';

describe('Input', () => {
  it('associe le label au champ (accessible par son libellé)', () => {
    render(<Input id="email" label="E-mail" value="" onChange={vi.fn()} />);

    expect(screen.getByLabelText('E-mail')).toBeInTheDocument();
  });

  it('état par défaut : bordure Line 200, pas d’aria-invalid', () => {
    render(<Input id="email" label="E-mail" value="" onChange={vi.fn()} />);

    const input = screen.getByLabelText('E-mail');
    expect(input.className).toContain('border-line-200');
    expect(input).not.toHaveAttribute('aria-invalid');
  });

  it('état erreur : bordure Alert 600, message texte associé via aria-describedby (§4)', () => {
    render(
      <Input
        id="email"
        label="E-mail"
        value="not-an-email"
        onChange={vi.fn()}
        error="Format attendu : nom@domaine.fr"
      />,
    );

    const input = screen.getByLabelText('E-mail');
    expect(input.className).toContain('border-alert-600');
    expect(input).toHaveAttribute('aria-invalid', 'true');

    const message = screen.getByRole('alert');
    expect(message).toHaveTextContent('Format attendu : nom@domaine.fr');
    expect(input.getAttribute('aria-describedby')).toBe(message.id);
  });

  it('affiche un message d’aide quand fourni sans erreur', () => {
    render(
      <Input
        id="password"
        label="Mot de passe"
        value=""
        onChange={vi.fn()}
        hint="Au moins 12 caractères."
      />,
    );

    expect(screen.getByText('Au moins 12 caractères.')).toBeInTheDocument();
  });

  it('état désactivé : fond Surface 50, non modifiable', () => {
    render(
      <Input id="email" label="E-mail" value="jane@example.com" onChange={vi.fn()} disabled />,
    );

    const input = screen.getByLabelText('E-mail');
    expect(input).toBeDisabled();
    expect(input.className).toContain('disabled:bg-surface-50');
  });

  it('cible tactile ≥ 52 px et focus visible 3 px noir décalé de 2 px (§5)', () => {
    render(<Input id="email" label="E-mail" value="" onChange={vi.fn()} />);

    const input = screen.getByLabelText('E-mail');
    expect(input.className).toContain('min-h-[52px]');
    expect(input.className).toContain('focus-visible:ring-[3px]');
    expect(input.className).toContain('focus-visible:ring-offset-2');
  });

  it('accepte la saisie utilisateur normalement (pas de logique ajoutée)', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Input id="email" label="E-mail" value="" onChange={onChange} />);

    await user.type(screen.getByLabelText('E-mail'), 'a');
    expect(onChange).toHaveBeenCalled();
  });
});
