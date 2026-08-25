import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage, LegalSection } from '../../components/layout/legal-page';

export const metadata: Metadata = {
  title: 'Politique de confidentialité — UrbanFlow Mobility',
};

export default function ConfidentialitePage() {
  return (
    <LegalPage
      title="Politique de confidentialité"
      intro="UrbanFlow Mobility est un service illustratif, développé dans le cadre d'un projet de certification (Titre 6 CDSD), modélisé sur la métropole de Rennes. Cette page décrit fidèlement les données que l'application traite réellement — ce n'est pas un document juridique validé."
    >
      <LegalSection title="Les données que nous traitons">
        <ul>
          <li>
            <strong>Compte</strong> : adresse e-mail et mot de passe. Le mot de passe n&rsquo;est
            jamais stocké en clair : il est haché avec bcrypt (facteur de coût 12) avant
            enregistrement, et jamais renvoyé par l&rsquo;API.
          </li>
          <li>
            <strong>Profil de mobilité</strong> : modes de transport préférés, contraintes (personne
            à mobilité réduite, vélo personnel), abonnements de transport déclarés.
          </li>
          <li>
            <strong>Domicile et lieu de travail</strong> (facultatifs) : chiffrés en AES-256-GCM au
            niveau applicatif avant d&rsquo;être stockés — ni requêtés ni exploitables tels quels en
            base, et jamais utilisés pour de la recherche géographique de proximité (contrairement
            aux arrêts de transport, qui ne sont pas des données personnelles).
          </li>
          <li>
            <strong>Géolocalisation</strong> : uniquement avec votre consentement explicite,
            désactivé par défaut. Le consentement (et sa date) est enregistré ; le renseignement du
            domicile/travail est bloqué tant qu&rsquo;il n&rsquo;a pas été donné.
          </li>
          <li>
            <strong>Bilans carbone</strong> : lorsque vous confirmez un trajet, seule
            l&rsquo;empreinte carbone est enregistrée — émissions totales, économie estimée par
            rapport à une voiture individuelle, et répartition par mode de transport.
            L&rsquo;origine et la destination du trajet ne sont <strong>jamais</strong> stockées :
            c&rsquo;est une minimisation volontaire, au-delà de ce que demandait la maquette
            initiale du projet.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="Pourquoi, et sur quelle base">
        <p>
          Le compte et le profil sont nécessaires à l&rsquo;exécution du service (planifier des
          trajets, suivre son empreinte carbone). La géolocalisation et l&rsquo;enregistrement du
          domicile/travail reposent sur votre consentement explicite, que vous pouvez retirer à tout
          moment.
        </p>
      </LegalSection>

      <LegalSection title="Durée de conservation">
        <p>
          Les données de compte et les bilans carbone sont conservés tant que le compte existe. Les
          facteurs d&rsquo;émission utilisés pour les calculs sont versionnés par date de validité
          (une mise à jour n&rsquo;efface jamais l&rsquo;historique des calculs déjà effectués) mais
          ne contiennent aucune donnée personnelle.
        </p>
      </LegalSection>

      <LegalSection title="Vos droits">
        <p>
          Vous disposez d&rsquo;un droit d&rsquo;accès, de rectification et d&rsquo;effacement de
          vos données. La suppression de compte, accessible depuis votre profil, est{' '}
          <strong>immédiate</strong> : votre e-mail et votre mot de passe sont anonymisés, votre
          domicile/travail chiffrés et votre consentement de géolocalisation sont effacés, et
          l&rsquo;historique de vos bilans carbone est définitivement supprimé — le tout dans la
          même opération, sans délai d&rsquo;attente.
        </p>
        <p>
          Si vous estimez que l&rsquo;un de ces droits n&rsquo;est pas respecté, vous pouvez
          introduire une réclamation auprès de la{' '}
          <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer">
            CNIL
          </a>{' '}
          (Commission nationale de l&rsquo;informatique et des libertés), rubrique réclamations.
        </p>
      </LegalSection>

      <LegalSection title="Sécurité">
        <ul>
          <li>Mots de passe hachés (bcrypt, facteur de coût 12).</li>
          <li>Domicile/travail chiffrés (AES-256-GCM) au niveau applicatif.</li>
          <li>Échanges chiffrés en HTTPS/TLS en production (porté par l&rsquo;hébergement).</li>
          <li>Aucune revente ni partage commercial de vos données.</li>
        </ul>
      </LegalSection>

      <LegalSection title="Cookies et session">
        <p>
          Aucun cookie de suivi ou publicitaire n&rsquo;est déposé. La connexion est gérée par un
          jeton conservé uniquement en mémoire dans votre navigateur (jamais dans un cookie, ni dans
          le stockage local) : recharger ou fermer la page vous déconnecte, il n&rsquo;y a rien à
          effacer de votre côté.
        </p>
      </LegalSection>

      <LegalSection title="Destinataires de vos données">
        <p>Vos données ne sont jamais transmises à des tiers à des fins commerciales.</p>
        <ul>
          <li>
            Le calcul d&rsquo;itinéraire s&rsquo;appuie sur OpenTripPlanner, auto-hébergé par
            UrbanFlow : seules les coordonnées de départ/arrivée et l&rsquo;heure du trajet lui sont
            transmises, jamais votre identité.
          </li>
          <li>
            La recherche d&rsquo;adresse (saisie du départ/de l&rsquo;arrivée, ou clic sur la carte)
            interroge la Géoplateforme de l&rsquo;IGN (service public français, sans clé
            d&rsquo;accès) directement depuis votre navigateur. Le bouton « Utiliser ma position »
            fait de même : votre position géographique réelle du moment est alors envoyée à
            l&rsquo;IGN pour être traduite en adresse lisible (géocodage inversé). Ces requêtes ne
            transitent jamais par nos serveurs et ne contiennent aucune donnée de compte.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="Hébergement et transferts hors Union européenne">
        <p>
          L&rsquo;interface de l&rsquo;application est hébergée par Vercel Inc., société américaine
          : la desserte des pages peut impliquer un traitement de données techniques de connexion
          (adresse IP, requêtes) en dehors de l&rsquo;Union européenne, via l&rsquo;infrastructure
          d&rsquo;hébergement — ce n&rsquo;est pas un transfert délibéré de vos données de compte,
          qui restent traitées par nos propres serveurs. Dans une mise en production réelle, un
          hébergeur basé dans l&rsquo;Union européenne (par exemple Scaleway) serait retenu pour
          écarter cette question, conformément aux choix d&rsquo;architecture du projet.
        </p>
      </LegalSection>

      <LegalSection title="Responsable de traitement et contact">
        <p>
          Le responsable du traitement est l&rsquo;éditeur du service, identifié dans les{' '}
          <Link href="/mentions-legales">mentions légales</Link>.
        </p>
        <p>
          Pour toute question sur vos données :{' '}
          <a href="mailto:confidentialite@urbanflow-mobility.fr">
            confidentialite@urbanflow-mobility.fr
          </a>{' '}
          (adresse illustrative — service fictif).
        </p>
      </LegalSection>
    </LegalPage>
  );
}
