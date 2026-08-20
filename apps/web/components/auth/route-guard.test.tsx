import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RouteGuard } from './route-guard';

const replace = vi.fn();
let isAuthenticated = false;

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
}));

vi.mock('../../contexts/auth-context', () => ({
  useAuth: () => ({ isAuthenticated }),
}));

describe('RouteGuard', () => {
  beforeEach(() => {
    replace.mockClear();
    isAuthenticated = false;
  });

  it('redirige vers /login et masque le contenu si non authentifié (§5, §13)', () => {
    render(
      <RouteGuard>
        <p>Contenu protégé</p>
      </RouteGuard>,
    );

    expect(replace).toHaveBeenCalledWith('/login');
    expect(screen.queryByText('Contenu protégé')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Redirection vers la connexion');
  });

  it('affiche le contenu sans redirection si authentifié', () => {
    isAuthenticated = true;

    render(
      <RouteGuard>
        <p>Contenu protégé</p>
      </RouteGuard>,
    );

    expect(replace).not.toHaveBeenCalled();
    expect(screen.getByText('Contenu protégé')).toBeInTheDocument();
  });
});
