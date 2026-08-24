import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../lib/api-client';
import { LoginForm } from './login-form';

const push = vi.fn();
const login = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

vi.mock('../../contexts/auth-context', () => ({
  useAuth: () => ({ login, isLoading: false }),
}));

describe('LoginForm', () => {
  beforeEach(() => {
    push.mockClear();
    login.mockClear();
  });

  it('soumet e-mail/mot de passe et redirige vers / en cas de succès', async () => {
    login.mockResolvedValueOnce(undefined);
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByLabelText('E-mail'), 'jane@example.com');
    await user.type(screen.getByLabelText('Mot de passe'), 'un-mot-de-passe');
    await user.click(screen.getByRole('button', { name: 'Se connecter' }));

    expect(login).toHaveBeenCalledWith('jane@example.com', 'un-mot-de-passe');
    expect(push).toHaveBeenCalledWith('/');
  });

  it('affiche le message d’erreur de l’API sans rediriger (§5.2 : message générique)', async () => {
    login.mockRejectedValueOnce(new ApiError(401, 'Identifiants invalides.'));
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByLabelText('E-mail'), 'jane@example.com');
    await user.type(screen.getByLabelText('Mot de passe'), 'mauvais-mdp');
    await user.click(screen.getByRole('button', { name: 'Se connecter' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Identifiants invalides.');
    expect(push).not.toHaveBeenCalled();
  });
});
