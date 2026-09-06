import type { CurrentUser } from '../../lib/auth-api';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../lib/api-client';
import { ProfilePage } from './profile-page';

const push = vi.fn();
const logout = vi.fn();
const getMe = vi.fn();
const updateProfile = vi.fn();
const deleteAccount = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

vi.mock('../../contexts/auth-context', () => ({
  useAuth: () => ({ logout }),
}));

vi.mock('../../lib/auth-api', () => ({
  getMe: () => getMe(),
  updateProfile: (payload: unknown) => updateProfile(payload),
  deleteAccount: () => deleteAccount(),
}));

const baseUser: CurrentUser = {
  id: 'user-1',
  email: 'jane@example.com',
  emailVerified: true,
  role: 'citizen',
  createdAt: '2026-01-15T00:00:00.000Z',
  mobilityProfile: {
    preferredModes: ['bus', 'bike'],
    constraints: { pmr: false, personalBike: true },
    transportSubscriptions: ['STAR Illico'],
    geolocationConsent: false,
    geolocationConsentAt: null,
    hasHomeLocation: false,
    hasWorkLocation: false,
  },
};

describe('ProfilePage', () => {
  beforeEach(() => {
    push.mockClear();
    logout.mockClear();
    getMe.mockReset();
    updateProfile.mockReset();
    deleteAccount.mockReset();
  });

  it('affiche les informations du compte et pré-coche les préférences existantes', async () => {
    getMe.mockResolvedValueOnce(baseUser);
    render(<ProfilePage />);

    expect(await screen.findByText('jane@example.com')).toBeInTheDocument();
    expect(screen.getByText('E-mail vérifié')).toBeInTheDocument();
    expect(screen.getByText('Citoyen')).toBeInTheDocument();

    expect(screen.getByRole('checkbox', { name: 'Bus' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Vélo' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Métro' })).not.toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Vélo personnel' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Personne à mobilité réduite' })).not.toBeChecked();
    expect(screen.getByLabelText('Abonnements transport')).toHaveValue('STAR Illico');
  });

  it("affiche un message d'erreur si le chargement échoue, sans planter", async () => {
    getMe.mockRejectedValueOnce(new ApiError(500, 'Service indisponible.'));
    render(<ProfilePage />);

    expect(await screen.findByText('Service indisponible.')).toBeInTheDocument();
  });

  it('soumet les préférences modifiées via PATCH et affiche la confirmation', async () => {
    getMe.mockResolvedValueOnce(baseUser);
    updateProfile.mockResolvedValueOnce({
      ...baseUser,
      mobilityProfile: {
        ...baseUser.mobilityProfile,
        preferredModes: ['bus', 'bike', 'metro'],
      },
    });
    const user = userEvent.setup();
    render(<ProfilePage />);

    await screen.findByText('jane@example.com');
    await user.click(screen.getByRole('checkbox', { name: 'Métro' }));
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    await waitFor(() => {
      expect(updateProfile).toHaveBeenCalledWith({
        preferredModes: ['bus', 'bike', 'metro'],
        constraints: { pmr: false, personalBike: true },
        transportSubscriptions: ['STAR Illico'],
      });
    });
    expect(await screen.findByText('✓ Préférences enregistrées.')).toBeInTheDocument();
  });

  it('affiche une erreur si la sauvegarde échoue', async () => {
    getMe.mockResolvedValueOnce(baseUser);
    updateProfile.mockRejectedValueOnce(new ApiError(400, 'Requête invalide.'));
    const user = userEvent.setup();
    render(<ProfilePage />);

    await screen.findByText('jane@example.com');
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    expect(await screen.findByText('Requête invalide.')).toBeInTheDocument();
  });

  it('déconnexion : appelle logout puis redirige vers /login', async () => {
    getMe.mockResolvedValueOnce(baseUser);
    logout.mockResolvedValueOnce(undefined);
    const user = userEvent.setup();
    render(<ProfilePage />);

    await screen.findByText('jane@example.com');
    await user.click(screen.getByRole('button', { name: 'Se déconnecter' }));

    await waitFor(() => expect(logout).toHaveBeenCalled());
    expect(push).toHaveBeenCalledWith('/login');
  });

  it('suppression de compte : exige une confirmation explicite avant d’appeler DELETE', async () => {
    getMe.mockResolvedValueOnce(baseUser);
    deleteAccount.mockResolvedValueOnce(null);
    logout.mockResolvedValueOnce(undefined);
    const user = userEvent.setup();
    render(<ProfilePage />);

    await screen.findByText('jane@example.com');
    await user.click(screen.getByRole('button', { name: 'Supprimer mon compte' }));

    expect(deleteAccount).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('définitive et immédiate');

    await user.click(screen.getByRole('button', { name: 'Confirmer la suppression' }));

    await waitFor(() => expect(deleteAccount).toHaveBeenCalled());
    expect(logout).toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith('/login');
  });

  it('suppression de compte : "Annuler" revient à l’état initial sans appeler DELETE', async () => {
    getMe.mockResolvedValueOnce(baseUser);
    const user = userEvent.setup();
    render(<ProfilePage />);

    await screen.findByText('jane@example.com');
    await user.click(screen.getByRole('button', { name: 'Supprimer mon compte' }));
    await user.click(screen.getByRole('button', { name: 'Annuler' }));

    expect(deleteAccount).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Supprimer mon compte' })).toBeInTheDocument();
  });
});
