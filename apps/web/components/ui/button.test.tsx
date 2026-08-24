import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Button } from './button';

describe('Button', () => {
  it('rend un bouton primaire par défaut (fond Blue 700, texte blanc)', () => {
    render(<Button>Valider</Button>);

    const button = screen.getByRole('button', { name: 'Valider' });
    expect(button.className).toContain('bg-brand-blue-700');
    expect(button.className).toContain('text-white');
  });

  it('rend un bouton secondaire (bordure + texte Blue 700, fond transparent)', () => {
    render(<Button variant="secondary">Annuler</Button>);

    const button = screen.getByRole('button', { name: 'Annuler' });
    expect(button.className).toContain('border-brand-blue-700');
    expect(button.className).toContain('text-brand-blue-700');
    expect(button.className).not.toContain('bg-brand-blue-700');
  });

  it('appelle onClick au clic', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Envoyer</Button>);

    await user.click(screen.getByRole('button', { name: 'Envoyer' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('désactivé : aria-disabled plutôt que l’attribut natif, reste focusable, neutralise le clic (§4)', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Envoyer
      </Button>,
    );

    const button = screen.getByRole('button', { name: 'Envoyer' });
    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(button).not.toHaveAttribute('disabled');

    button.focus();
    expect(button).toHaveFocus();

    await user.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('cible tactile ≥ 52 px et focus visible 3 px noir décalé de 2 px (§5)', () => {
    render(<Button>Valider</Button>);

    const button = screen.getByRole('button', { name: 'Valider' });
    expect(button.className).toContain('min-h-[52px]');
    expect(button.className).toContain('focus-visible:ring-[3px]');
    expect(button.className).toContain('focus-visible:ring-offset-2');
    expect(button.className).toContain('focus-visible:ring-[#000]');
  });

  it('accepte une className additionnelle sans écraser les classes de base', () => {
    render(<Button className="w-full">Valider</Button>);

    const button = screen.getByRole('button', { name: 'Valider' });
    expect(button.className).toContain('w-full');
    expect(button.className).toContain('bg-brand-blue-700');
  });
});
