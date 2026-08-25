import type { Metadata } from 'next';
import { LegalPage, LegalSection } from '../../components/layout/legal-page';

export const metadata: Metadata = {
  title: 'À propos — UrbanFlow Mobility',
};

export default function AProposPage() {
  return (
    <LegalPage title="À propos">
      <LegalSection title="Notre mission">
        <p>
          UrbanFlow Mobility aide à comparer, en un seul endroit, les façons de se déplacer dans une
          métropole — marche, vélo, transports en commun, voiture — et à voir concrètement ce que
          chaque choix représente en émissions de CO₂. L&rsquo;objectif : favoriser le report vers
          des modes de déplacement plus sobres, sans imposer de renoncement.
        </p>
      </LegalSection>

      <LegalSection title="Le contexte du projet">
        <p>
          UrbanFlow Mobility est développé dans le cadre d&rsquo;un projet de certification
          professionnelle (Titre 6 Concepteur Développeur de Solutions Digitales, RNCP 36146). Le
          service est modélisé sur la métropole de Rennes (environ 470 000 habitants) à titre
          d&rsquo;exemple.
        </p>
      </LegalSection>

      <LegalSection title="Note de transparence">
        <p>
          Ceci est un service <strong>fictif</strong>, réalisé à des fins pédagogiques et de
          démonstration technique. Il n&rsquo;est ni exploité commercialement ni affilié à Rennes
          Métropole ou à un opérateur de transport réel. Les mentions légales et la politique de
          confidentialité sont illustratives : elles décrivent fidèlement le fonctionnement
          technique réel de l&rsquo;application, mais n&rsquo;ont pas de valeur juridique.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
