export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

type Listener = () => void;

/**
 * Jetons en mémoire uniquement (module JS, pas de `localStorage`/cookie) —
 * choix assumé de F2-web-planner.md §9 : le durcissement (cookies httpOnly)
 * est un incrément ultérieur. Conséquence directe : un rechargement de page
 * perd la session, il n'y a rien à restaurer par conception.
 *
 * Singleton hors React pour que `apiClient` (simple fonction, pas un hook)
 * puisse lire/écrire les jetons de façon synchrone ; `AuthProvider` s'y
 * abonne via `subscribe` pour répercuter les changements dans le rendu.
 */
let tokens: AuthTokens | null = null;
const listeners = new Set<Listener>();

export function getTokens(): AuthTokens | null {
  return tokens;
}

export function setTokens(next: AuthTokens | null): void {
  tokens = next;
  listeners.forEach((listener) => listener());
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
