import type { Metadata } from 'next';
import { LegalPage, LegalSection } from '../../components/layout/legal-page';

export const metadata: Metadata = {
  title: 'Mentions légales — UrbanFlow Mobility',
};

export default function MentionsLegalesPage() {
  return (
    <LegalPage
      title="Mentions légales"
      intro="Service illustratif, développé dans le cadre d'un projet de certification (Titre 6 CDSD) modélisé sur la métropole de Rennes. Les informations ci-dessous sont fictives."
    >
      <LegalSection title="Éditeur">
        <p>
          UrbanFlow Mobility — service fictif modélisé sur Rennes Métropole, à des fins pédagogiques
          et de démonstration.
          <br />
          Directeur de la publication : l&rsquo;auteur du projet.
        </p>
      </LegalSection>

      <LegalSection title="Hébergement">
        <p>
          Application front (PWA Next.js) hébergée par Vercel Inc., 440 N Barranca Ave #4133,
          Covina, CA 91723, États-Unis.
        </p>
      </LegalSection>

      <LegalSection title="Contact">
        <p>
          <a href="mailto:contact@urbanflow-mobility.fr">contact@urbanflow-mobility.fr</a> (adresse
          illustrative).
        </p>
      </LegalSection>
    </LegalPage>
  );
}
