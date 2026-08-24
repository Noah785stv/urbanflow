'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import * as authApi from '../lib/auth-api';
import type { CurrentUser } from '../lib/auth-api';
import { getTokens, setTokens, subscribe } from '../lib/token-store';

interface AuthContextValue {
  user: CurrentUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Contexte d'auth (§9) : jetons en mémoire via `token-store`, jamais
 * persistés. Conséquence assumée : `isAuthenticated` démarre toujours à
 * `false` au chargement — rien à restaurer après un rechargement de page.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(() => getTokens() !== null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(
    () =>
      subscribe(() => {
        const authenticated = getTokens() !== null;
        setIsAuthenticated(authenticated);
        if (!authenticated) {
          setUser(null);
        }
      }),
    [],
  );

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const tokens = await authApi.login(email, password);
      setTokens(tokens);
      const me = await authApi.getMe();
      setUser(me);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // La déconnexion locale doit réussir même si l'appel serveur échoue
      // (cohérent §4.6 : ne jamais bloquer sur une source externe).
    } finally {
      setTokens(null);
      setUser(null);
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, isAuthenticated, isLoading, login, logout }),
    [user, isAuthenticated, isLoading, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth doit être utilisé sous AuthProvider.');
  }
  return context;
}
