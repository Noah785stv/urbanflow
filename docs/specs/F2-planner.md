# F2 — Planificateur multimodal géolocalisé

> Spécification d'implémentation. À lire avec `CLAUDE.md` (stack, conventions,
> Definition of Done) et la spec `F3-integration.md` (dont F2 consomme les sorties).
> Références dossier : §4.5 (F2), §4.7.3 (facteurs carbone), §4.8 (séquence),
> §2.5 (Navitia — **superseded**), §6.1.1 (tests via mocks).
>
> ⚠️ **§3 obsolète, prérequis résolu autrement.** Le §3 ci-dessous décrit le
> correctif prévu sur `NavitiaProvider`. Navitia a depuis été abandonné (accès
> gratuit fermé) au profit d'OpenTripPlanner auto-hébergé — voir
> `docs/adr/ADR-005-routing-opentripplanner.md` et `F3-integration.md`. Le
> nouvel `OtpProvider` renvoie une `distanceMeters` toujours renseignée
> (vérifié par introspection live du schéma OTP) : le blocage carbone du §3.1
> est donc déjà levé, sans qu'une clé Navitia n'ait jamais été nécessaire.

## 1. Objectif

Proposer à l'utilisateur, pour un trajet A→B, **au moins trois itinéraires
multimodaux** classés (le plus rapide / le plus écologique / le moins cher), en
s'appuyant sur la brique routing livrée par F3 (`RoutingProvider.getJourneys`).
C'est le cœur de valeur de la plateforme.

## 2. Périmètre de l'incrément

**Volet A — Backend planificateur (livrable principal de cet incrément) :**

- Endpoint de planification orchestrant `getJourneys` (F3).
- Enrichissement de chaque option : **empreinte carbone** (estimateur minimal) et
  **coût indicatif**.
- Classement et étiquetage : `fastest` / `greenest` / `cheapest`.
- Mode dégradé (réutilise le wrapper de F3) et perf (< 3 s via cache).
- Tests (providers mockés, fixtures — aucun appel réseau réel en CI).

**Volet B — Frontend planificateur (incrément appairé, à spécifier en détail
quand on démarre le front) :** formulaire A→B, géolocalisation navigateur + fallback
IP + précision affichée (C6), carte Leaflet avec tracé, liste de résultats
accessible clavier (C7), cache PWA du dernier plan (C1/C10). `apps/web` n'est
aujourd'hui qu'un squelette : ce volet ouvrira le chantier front.

## 3. Prérequis — raffiner le `NavitiaProvider` de F3 (obsolète, voir avertissement §0)

Section conservée pour l'historique de la décision. F2 consomme directement
`getJourneys`, désormais fourni par `OtpProvider` (ADR-005) :

1. **`distanceMeters` (CRITIQUE).** Résolu par la bascule OTP, pas par un correctif
   du parsing Navitia : `Leg.distance` est un champ `Float` toujours renseigné côté
   OTP (vérifié par introspection live + échantillons réels du réseau STAR), alors
   qu'il valait `0` chez Navitia. Plus aucun blocage pour le tri « plus écologique ».
2. **`NAVITIA_MODE_MAP`.** Remplacé par `OTP_MODE_MAP`
   (`apps/api/src/modules/integration/providers/otp/otp.provider.ts`), construit
   directement contre les enums réels du schéma OTP (`Mode`, `TransitMode`).
3. **Fixture fidèle.** Les fixtures `apps/api/test/fixtures/otp/*.json` sont des
   extraits de vraies réponses GraphQL capturées contre l'instance OTP locale
   (réseau STAR), pas écrites de mémoire. Les tests CI continuent d'utiliser ces
   fixtures, jamais le réseau.

_(Écart n°4 — convention d'auth — sans objet : OTP auto-hébergé n'a pas de clé API.)_

## 4. Types partagés (`@urbanflow/shared-types`)

F2 enrichit le `JourneyOption` de F3 sans le modifier :

```ts
export type JourneyLabel = 'fastest' | 'greenest' | 'cheapest';

export interface PlannedJourney extends JourneyOption {
  co2Grams: number; // empreinte totale de l'itinéraire
  estimatedCostCents: number | null; // null si non estimable
  labels: JourneyLabel[]; // un itinéraire peut cumuler plusieurs labels
}

export interface PlanTripRequest {
  from: Coordinates;
  to: Coordinates;
  departureAt?: string; // ISO 8601 ; défaut = maintenant
  // Filtres optionnels issus du profil (F1)
  excludeModes?: TransportMode[];
  accessibleOnly?: boolean; // contrainte PMR
}
```

## 5. Règles métier

### 5.1 Classement en ≥ 3 options (§4.5)

- Récupérer les itinéraires via `RoutingProvider.getJourneys` (registre F3).
- Calculer pour chacun `co2Grams` (§5.2) et `estimatedCostCents` (§5.3).
- Étiqueter : durée minimale → `fastest`, CO₂ minimal → `greenest`, coût minimal →
  `cheapest`. Un même itinéraire peut porter plusieurs labels.
- **Retourner au moins 3 options distinctes** quand elles existent ; si OTP en
  renvoie moins, retourner ce qui existe (sans en inventer).

### 5.2 Empreinte carbone (estimateur minimal)

- Fonction pure : `co2Grams = Σ (section.distanceMeters / 1000 × facteur(mode))`.
- Facteurs ADEME (gCO₂e/km, §4.7.3) : Marche 0, Vélo 0, VAE 11, Trottinette 28,
  Métro/Tram 4, Bus 113, TER 25, Voiture solo 193, Covoiturage 64.
- **Implémenté dans le module `carbon` existant** (`CarbonEstimatorService`), que
  **F4 étendra** (facteurs versionnés en base, historique, tableau de bord). F2 ne
  fait que l'estimation à la volée ; pas de persistance ici.

### 5.3 Coût indicatif (approximation assumée)

- `FareEstimator` : barème indicatif par mode (ticket TC forfaitaire, déblocage +
  minute pour trottinette, 0 pour marche/vélo, coût/km voiture), configurable.
- **Point le plus faible en données** : à marquer explicitement comme estimation, à
  affiner avec les tarifs réels des opérateurs. Si un mode n'est pas estimable,
  `estimatedCostCents = null` et l'option n'est pas éligible au label `cheapest`.

### 5.4 Temps réel, perf, mode dégradé

- Les données OTP intègrent le temps réel quand disponible (`realtime`,
  `realtimeState` sur les passages ; `realTime`/`realtimeState` sur les legs
  d'itinéraire).
- **Perf < 3 s** (§4.5) : cache Redis court des plans, clé dérivée de
  (from, to, departureAt arrondi, filtres). Réutilise le wrapper de cache de F3.
- **Mode dégradé** : si le `RoutingProvider` est indisponible, servir le dernier plan
  connu (marqué `stale`) ou une réponse vide explicitement dégradée — **jamais** de
  500 global (cohérent F3).

### 5.5 Filtres (profil F1, optionnel)

- `excludeModes` retire les modes non souhaités ; `accessibleOnly` privilégie les
  itinéraires accessibles (PMR). Léger en F2 ; affinable ensuite.

## 6. Endpoint API

Sous `/api/v1`, `kebab-case`, DTO validé. Le planificateur vit dans le module `trip`.

| Méthode | Route                | Auth | Description                                                                |
| :------ | :------------------- | :--- | :------------------------------------------------------------------------- |
| POST    | `/api/v1/trips/plan` | oui  | Corps `PlanTripRequest` → ≥ 3 `PlannedJourney` étiquetés, avec CO₂ et coût |

La réponse indique la fraîcheur (`stale`, `updatedAt`) en mode dégradé.

## 7. Sécurité & contraintes

| Réf                | Mesure dans F2                                                       |
| :----------------- | :------------------------------------------------------------------- |
| A01 (§5.7)         | Endpoint protégé par `JwtAuthGuard` (F1)                             |
| A03 (§5.7)         | DTO `class-validator` (coordonnées bornées lat/lng, date ISO valide) |
| A10 SSRF           | Appels sortants uniquement via les providers F3 (liste blanche)      |
| C6 Géolocalisation | Coordonnées validées ; précision gérée côté front (volet B)          |
| C10 Performances   | Cache des plans, mode dégradé                                        |

## 8. Configuration & dépendances

Aucune nouvelle dépendance backend (réutilise `@nestjs/axios`, Redis, providers F3).
Barème de coût : fichier de config (`apps/api/src/modules/trip/fare.constants.ts`),
injecté via le token `FARE_CONFIG` plutôt que des variables d'environnement — ce
sont des valeurs indicatives versionnées en code, pas des secrets ni des paramètres
qui varient par environnement de déploiement. Volet B (front) : `leaflet` /
`react-leaflet` le moment venu.

## 9. Critères d'acceptation (§4.5)

- [ ] `POST /trips/plan` renvoie **au moins 3 options** étiquetées `fastest` /
      `greenest` / `cheapest` quand elles existent.
- [ ] Le CO₂ de chaque option est **non nul et cohérent** (`distanceMeters`
      toujours renseigné côté OTP — §3.1).
- [ ] Un coût indicatif est fourni par option (ou `null` si non estimable).
- [ ] Réponse en **< 3 s** (cache).
- [ ] Si OTP est indisponible, l'API répond quand même (plan `stale` ou réponse
      dégradée signalée), sans 500.
- [ ] Les filtres `excludeModes` / `accessibleOnly` sont respectés.

## 10. Tests attendus (§6.1.1, DoD §6.5)

- **Aucun appel réseau réel en CI** : `RoutingProvider` mocké, fixtures versionnées.
- **Unitaires** : `CarbonEstimatorService` (Σ distance × facteur, cas multimodal),
  `FareEstimator`, logique de **classement/étiquetage** (jeu de N itinéraires →
  labels attendus, y compris cumul de labels et cas < 3 options).
- **Intégration (Supertest)** : `POST /trips/plan` avec provider mocké → 3 options
  étiquetées ; chemin **mode dégradé** (provider en échec → réponse `stale`).
- **Couverture ≥ 70 %**. Le module `carbon` (fonctionnalité clé) vise **100 %** sur
  la fonction de calcul (§6.1.1).

## 11. Ordre d'implémentation suggéré

1. **Prérequis F3** : résolu par la bascule Navitia → OpenTripPlanner (ADR-005,
   `feature/f3-transport-integration`) — `distanceMeters` toujours renseigné,
   `OTP_MODE_MAP` vérifié contre le schéma réel, fixtures réelles capturées (§3).
2. Types `PlannedJourney` / `PlanTripRequest` dans `@urbanflow/shared-types`.
3. `CarbonEstimatorService` (module `carbon`) + tests (viser 100 %).
4. `FareEstimator` (module `trip`) + tests.
5. `TripPlannerService` : orchestration `getJourneys` → enrichissement → classement,
   avec cache + mode dégradé.
6. Contrôleur `POST /trips/plan` + DTO validés.
7. Tests d'intégration (nominal + dégradé).
8. Vérifier la DoD (§6.5).
9. (Volet B) Ouvrir le chantier front : spec dédiée du planificateur UI.

## 12. Points à signaler pendant l'implémentation

- **Dépendance dure au correctif `distanceMeters`** : résolue par la bascule OTP
  (§3) — le tri écologique et le futur F4 s'appuient sur des distances réelles.
- **`CarbonEstimatorService` est le germe de F4** : conçu pour être étendu (table
  de facteurs injectée via le token `EMISSION_FACTORS`, F4 pourra fournir une
  implémentation versionnée en base sans changer le service ni son test).
- **`FareEstimator` suit le même principe** (token `FARE_CONFIG`) : barème en dur
  dans `fare.constants.ts`, explicitement qualifié d'indicatif — jamais présenté
  comme un tarif garanti (§5.3).
- **`accessibleOnly` accueilli mais non appliqué au tri.** Le DTO et
  `PlanTripRequest` acceptent le champ (contrat API stable dès maintenant), mais
  `TripPlannerService` ne filtre/priorise pas encore dessus : `OtpProvider`
  n'expose actuellement aucune donnée d'accessibilité PMR par section
  (`Trip.wheelchairAccessible` côté schéma OTP n'est pas requêté). Fabriquer un
  proxy à partir des données déjà récupérées (ex. exclure certains modes) serait
  incorrect pour une contrainte PMR — non fait délibérément. Affiner ensuite en
  étendant la requête GraphQL `planConnection` d'`OtpProvider`.
- **OTP auto-hébergé n'a pas de clé API** : rien à provisionner pour valider (CI
  reste mockée, comme avant).
- Toute contrainte rendant une règle infaisable → la signaler et synchroniser cette
  spec + le dossier (règle n°2).
