import type { Metadata } from 'next';
import { LinkButton } from '../../components/ui/link-button';

export const metadata: Metadata = {
  title: 'Accès refusé — UrbanFlow Mobility',
};

/**
 * 403 (§B.5) — stylée et prête pour un futur contrôle d'accès par rôle.
 * Aucune route de l'app n'est aujourd'hui restreinte par rôle (`RouteGuard`
 * ne vérifie que l'authentification, pas `UserRole`) : cette page n'a donc
 * pas encore de déclencheur réel, elle existe pour le jour où une route
 * `premium`/`admin` en aura besoin — pas de faux contrôle d'accès inventé
 * pour la câbler artificiellement.
 */
export default function ForbiddenPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="font-mono text-sm font-medium uppercase tracking-[0.08em] text-ink-600">
        Erreur 403
      </p>
      <h1 className="text-[26px] font-semibold leading-[31px] text-ink-900">Accès refusé</h1>
      <p className="max-w-md text-ink-600">
        Vous n&rsquo;avez pas les droits nécessaires pour accéder à cette page.
      </p>
      <LinkButton href="/">Retour à l&rsquo;accueil</LinkButton>
    </main>
  );
}
