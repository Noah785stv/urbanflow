import type { ReactNode } from 'react';

interface LegalPageProps {
  title: string;
  intro?: string;
  children: ReactNode;
}

/**
 * Coquille partagée par les pages illustratives (§B.2-B.4
 * web-geocoding-and-pages.md) : même typographie que le reste de l'app
 * (Titre-1 §3 design-system.md), pour éviter de dupliquer trois fois le
 * même conteneur.
 */
export function LegalPage({ title, intro, children }: LegalPageProps) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 md:p-6">
      <h1 className="text-[26px] font-semibold leading-[31px] text-ink-900">{title}</h1>
      {intro && <p className="text-ink-600">{intro}</p>}
      <div className="flex flex-col gap-6">{children}</div>
    </div>
  );
}

interface LegalSectionProps {
  title: string;
  children: ReactNode;
}

export function LegalSection({ title, children }: LegalSectionProps) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-[20px] font-semibold leading-[26px] text-ink-900">{title}</h2>
      <div className="flex flex-col gap-3 text-ink-900 [&_a]:text-brand-blue-700 [&_a]:underline [&_li]:ml-5 [&_li]:list-disc [&_p]:leading-relaxed">
        {children}
      </div>
    </section>
  );
}
