'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/auth-context';
import { SECONDARY_BUTTON_CLASS } from '../../lib/styles';

/** Bouton de déconnexion (§5.3), affiché uniquement une fois authentifié. */
export function AppHeader() {
  const { isAuthenticated, user, logout } = useAuth();
  const router = useRouter();

  if (!isAuthenticated) {
    return null;
  }

  async function handleLogout() {
    await logout();
    router.push('/login');
  }

  return (
    <header className="flex items-center justify-between border-b border-zinc-300 bg-white px-4 py-3">
      <span className="font-semibold text-zinc-900">UrbanFlow Mobility</span>
      <div className="flex items-center gap-3">
        {user && <span className="text-sm text-zinc-700">{user.email}</span>}
        <button
          type="button"
          onClick={() => {
            void handleLogout();
          }}
          className={SECONDARY_BUTTON_CLASS}
        >
          Se déconnecter
        </button>
      </div>
    </header>
  );
}
