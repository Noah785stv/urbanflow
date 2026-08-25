import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Hors connexion — UrbanFlow Mobility',
};

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-[26px] font-semibold leading-[31px] text-ink-900">
        Vous êtes hors connexion
      </h1>
      <p className="max-w-md text-ink-600">
        Cette page n’a pas pu être chargée car vous n’avez pas de connexion réseau. Le planificateur
        affiche le dernier trajet calculé avec succès s’il est disponible.
      </p>
    </main>
  );
}
