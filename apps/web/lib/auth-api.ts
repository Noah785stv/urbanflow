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
