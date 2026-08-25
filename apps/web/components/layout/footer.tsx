import Link from 'next/link';
import { FOCUS_RING } from '../ui/tokens';

const FOOTER_LINK_CLASS = `rounded px-1 text-ink-600 underline hover:text-ink-900 ${FOCUS_RING}`;

/**
 * Pied de page (§B.1 web-geocoding-and-pages.md) — sur **toutes** les pages,
 * y compris non authentifiées (contrairement à `AppHeader`) : posé dans le
 * layout racine, donc aussi présent sur 404/erreur/403.
 */
export function Footer() {
  return (
    <footer className="border-t border-line-200 bg-surface-0 px-4 py-6 text-sm">
      <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-3 text-center sm:flex-row sm:justify-between sm:text-left">
        <p className="text-ink-600">
          UrbanFlow Mobility — planifier autrement, mesurer l&rsquo;impact.
        </p>
        <nav
          aria-label="Pied de page"
          className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2"
        >
          <Link href="/a-propos" className={FOOTER_LINK_CLASS}>
            À propos
          </Link>
          <Link href="/confidentialite" className={FOOTER_LINK_CLASS}>
            Politique de confidentialité
          </Link>
          <Link href="/mentions-legales" className={FOOTER_LINK_CLASS}>
            Mentions légales
          </Link>
        </nav>
      </div>
    </footer>
  );
}
