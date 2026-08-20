import type { PlanTripResponse } from './trip-api';

const STORAGE_KEY = 'urbanflow:last-plan';

/**
 * §10 : « mise en cache de la dernière réponse de plan » pour un
 * fonctionnement dégradé hors-ligne basique. `POST /trips/plan` n'est pas
 * cachable par le service worker (Cache API/Serwist ne gèrent que les GET) :
 * ce cache applicatif est le mécanisme réel derrière cette exigence. Données
 * non sensibles (pas de jeton) — `localStorage` est un choix délibérément
 * différent du stockage des jetons (§9), pas une entorse à la même règle.
 */
export function readLastPlan(): PlanTripResponse | null {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PlanTripResponse) : null;
  } catch {
    return null;
  }
}

export function writeLastPlan(plan: PlanTripResponse): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(plan));
  } catch {
    // Quota dépassé ou stockage indisponible (navigation privée) : dégrade
    // silencieusement, ce n'est qu'un confort hors-ligne (§4.6-like).
  }
}
