'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/auth-context';
import { Button } from '../ui/button';
import { FOCUS_RING } from '../ui/tokens';

const NAV_LINK_CLASS = `rounded px-2 py-1 text-sm font-medium text-ink-900 hover:bg-surface-50 ${FOCUS_RING}`;

/** Navigation + déconnexion (§5.3, F4-web-dashboard §5.3), affichées uniquement une fois authentifié. */
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
    <header className="flex items-center justify-between border-b border-line-200 bg-surface-0 px-4 py-3">
      <div className="flex items-center gap-4">
        <span className="font-semibold text-ink-900">UrbanFlow Mobility</span>
        <nav aria-label="Navigation principale" className="flex items-center gap-2">
          <Link href="/" className={NAV_LINK_CLASS}>
            Planifier
          </Link>
          <Link href="/dashboard" className={NAV_LINK_CLASS}>
            Tableau de bord
          </Link>
        </nav>
      </div>
      <div className="flex items-center gap-3">
        {user && <span className="text-sm text-ink-600">{user.email}</span>}
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            void handleLogout();
          }}
          className="text-sm"
        >
          Se déconnecter
        </Button>
      </div>
    </header>
  );
}
