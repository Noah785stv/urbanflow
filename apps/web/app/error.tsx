'use client';

import { useEffect } from 'react';
import { Button } from '../components/ui/button';
import { LinkButton } from '../components/ui/link-button';

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Frontière d'erreur générique (§B.5) — Next.js impose un composant client
 * recevant `error`/`reset`. Journalisation console uniquement : pas de
 * service de suivi d'erreurs réel dans ce projet (rien à inventer ici).
 */
export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="font-mono text-sm font-medium uppercase tracking-[0.08em] text-alert-600">
        Une erreur est survenue
      </p>
      <h1 className="text-[26px] font-semibold leading-[31px] text-ink-900">
        Quelque chose s&rsquo;est mal passé
      </h1>
      <p className="max-w-md text-ink-600">
        Cette page a rencontré un problème inattendu. Vous pouvez réessayer, ou revenir à
        l&rsquo;accueil.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button type="button" onClick={reset}>
          Réessayer
        </Button>
        <LinkButton href="/" variant="secondary">
          Retour à l&rsquo;accueil
        </LinkButton>
      </div>
    </main>
  );
}
