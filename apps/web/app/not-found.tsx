import type { Metadata } from 'next';
import { LinkButton } from '../components/ui/link-button';

export const metadata: Metadata = {
  title: 'Page introuvable — UrbanFlow Mobility',
};

/** 404 (§B.5 web-geocoding-and-pages.md) — capte toute route non trouvée. */
export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="font-mono text-sm font-medium uppercase tracking-[0.08em] text-ink-600">
        Erreur 404
      </p>
      <h1 className="text-[26px] font-semibold leading-[31px] text-ink-900">Page introuvable</h1>
      <p className="max-w-md text-ink-600">
        La page que vous cherchez n&rsquo;existe pas ou a été déplacée.
      </p>
      <LinkButton href="/">Retour à l&rsquo;accueil</LinkButton>
    </main>
  );
}
