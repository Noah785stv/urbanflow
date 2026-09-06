import type { TransportMode } from '@urbanflow/shared-types';
import { apiRequest } from './api-client';
import type { AuthTokens } from './token-store';

/**
 * Formes vérifiées directement dans `apps/api/src/modules/{auth,user}` (§3
 * F2-web-planner.md) — pas devinées. `role` reprend les valeurs de
 * `UserRole` (apps/api), non exporté en `shared-types` : union locale.
 */
export interface CurrentUser {
  id: string;
  email: string;
  emailVerified: boolean;
  role: 'citizen' | 'premium' | 'admin';
  createdAt: string;
  mobilityProfile: {
    preferredModes: string[];
    constraints: { pmr: boolean; personalBike: boolean };
    transportSubscriptions: string[];
    geolocationConsent: boolean;
    geolocationConsentAt: string | null;
    hasHomeLocation: boolean;
    hasWorkLocation: boolean;
  };
}

/**
 * Corps de `PATCH /users/me` (`update-mobility-profile.dto.ts`), réduit aux
 * champs affichables par la page Profil : domicile/travail sont exclus ici
 * (leur valeur n'est jamais renvoyée en clair par `GET /users/me` — chiffrés,
 * §5.3 privacy-by-design — donc rien à pré-remplir dans un formulaire).
 * `constraints` doit toujours porter les deux champs (le DTO les valide
 * ensemble, pas de patch partiel de l'objet).
 */
export interface UpdateProfilePayload {
  preferredModes?: TransportMode[];
  constraints?: { pmr: boolean; personalBike: boolean };
  transportSubscriptions?: string[];
}

export function register(email: string, password: string): Promise<{ id: string; email: string }> {
  return apiRequest('/auth/register', { method: 'POST', body: { email, password } });
}

export function verifyEmail(token: string): Promise<null> {
  return apiRequest('/auth/verify-email', { method: 'POST', body: { token } });
}

export function login(email: string, password: string): Promise<AuthTokens> {
  return apiRequest('/auth/login', { method: 'POST', body: { email, password } });
}

export function logout(): Promise<null> {
  return apiRequest('/auth/logout', { method: 'POST' });
}

export function getMe(): Promise<CurrentUser> {
  return apiRequest('/users/me');
}

export function updateProfile(payload: UpdateProfilePayload): Promise<CurrentUser> {
  return apiRequest('/users/me', { method: 'PATCH', body: payload });
}

/** Suppression immédiate et définitive (§5.4 RGPD, `user.service.ts`) — pas de délai. */
export function deleteAccount(): Promise<null> {
  return apiRequest('/users/me', { method: 'DELETE' });
}
