'use client';

import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { useAuth } from '../../contexts/auth-context';

/** Une route protégée non authentifiée redirige vers /login (§5, §13). */
export function RouteGuard({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) {
    return (
      <p role="status" className="p-6 text-center text-ink-600">
        Redirection vers la connexion…
      </p>
    );
  }

  return children;
}
