import type { Coordinates } from '@urbanflow/shared-types';
import type { PlanTripResponse } from './trip-api';

const STORAGE_KEY = 'urbanflow:last-plan';

/**
 * Snapshot complet du dernier trajet calculé — origine/destination
 * (coordonnées + libellé adresse saisi) et la réponse de `POST /trips/plan`.
 * Sert deux usages distincts (§10, C1 puis durcissement session) :
 *
 * 1. Mode dégradé hors-ligne (usage d'origine) : `readLastPlan()` resert
 *    la dernière réponse connue si une nouvelle recherche échoue en réseau.
 * 2. Restauration après rechargement de page : les jetons ne vivant qu'en
 *    mémoire JS (§9), un refresh déconnecte systématiquement l'utilisateur
 *    — `TripPlanner` relit ce cache au montage pour repeupler le formulaire
 *    et réafficher les résultats une fois reconnecté, plutôt qu'un
 *    formulaire vide.
 *
 * Données non sensibles au sens de §9 (aucun jeton) mais plus identifiantes
 * qu'un simple score CO2 (une adresse précise) — accepté en connaissance de
 * cause : jamais transmis, écrasé au prochain trajet calculé, pas de TTL
 * explicite (même compromis que le cache pré-existant).
 */
export interface StoredPlan {
  origin: Coordinates;
  originLabel: string;
  destination: Coordinates;
  destinationLabel: string;
  plan: PlanTripResponse;
}

// Cache la dernière valeur parsée, indexée sur la chaîne brute lue en
// dernier : `TripPlanner` consomme `readLastPlan` comme snapshot de
// `useSyncExternalStore`, qui exige une référence stable tant que la valeur
// sous-jacente n'a pas changé (sinon : re-rendu en boucle, `JSON.parse`
// produisant un nouvel objet à chaque appel).
let cachedRaw: string | null = null;
let cachedParsed: StoredPlan | null = null;

/**
 * Vérifie la forme minimale attendue avant de faire confiance à la valeur
 * lue -- une entrée écrite par une version antérieure de ce cache (avant
 * l'ajout d'origine/destination, quand seul `PlanTripResponse` y était
 * stocké tel quel) ne doit jamais faire planter la restauration : elle est
 * simplement traitée comme absente.
 */
function isStoredPlan(value: unknown): value is StoredPlan {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const candidate = value as Partial<StoredPlan>;
  return (
    Boolean(candidate.origin) &&
    typeof candidate.originLabel === 'string' &&
    Boolean(candidate.destination) &&
    typeof candidate.destinationLabel === 'string' &&
    candidate.plan !== undefined &&
    Array.isArray(candidate.plan.journeys)
  );
}

export function readLastPlan(): StoredPlan | null {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === cachedRaw) {
      return cachedParsed;
    }
    cachedRaw = raw;
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    cachedParsed = isStoredPlan(parsed) ? parsed : null;
    return cachedParsed;
  } catch {
    cachedRaw = null;
    cachedParsed = null;
    return null;
  }
}

export function writeLastPlan(stored: StoredPlan): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  } catch {
    // Quota dépassé ou stockage indisponible (navigation privée) : dégrade
    // silencieusement, ce n'est qu'un confort hors-ligne/reprise (§4.6-like).
  }
}

/**
 * Appelé à la déconnexion (`AuthProvider.logout`) : la clé n'est pas
 * rattachée à un utilisateur -- sans ça, sur un poste partagé, la personne
 * suivante qui se connecte verrait le dernier trajet de la précédente
 * restauré. Ne couvre pas la fermeture d'onglet sans déconnexion explicite,
 * mais l'exposition y reste la même paire d'adresses (jamais un jeton).
 */
export function clearLastPlan(): void {
  if (typeof window === 'undefined') {
    return;
  }
  cachedRaw = null;
  cachedParsed = null;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Stockage indisponible : rien de plus à faire, cohérent avec les autres
    // dégradations silencieuses de ce module.
  }
}
