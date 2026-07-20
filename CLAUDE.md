# CLAUDE.md — UrbanFlow Mobility

> Fichier d'instructions lu par Claude Code au début de chaque session.
> Il est la **traduction opérationnelle** du document de référence du projet.

## Contexte

UrbanFlow Mobility est une **PWA de mobilité urbaine multimodale** pour une
métropole française de ~470 000 habitants (modélisée sur Rennes Métropole).
Objectif : unifier l'offre de transport fragmentée, favoriser le report modal
vers les modes décarbonés, et mesurer l'empreinte carbone des déplacements.

Projet de certification **Titre 6 CDSD (RNCP 36146)**, session septembre 2026.
**Source de vérité absolue** : « Dossier UrbanFlow — VERSION FINALE COMPLÈTE
(sections 1 à 8) ». Toute référence ci-dessous au format §X renvoie à ce dossier.

## Règles de travail IMPÉRATIVES

1. **Alignement dossier.** Tout le code, la stack, l'architecture et les choix
   techniques doivent rester rigoureusement alignés avec le dossier de référence.
2. **Signaler les blocages.** Si une instruction du dossier s'avère
   infaisable/impossible, le signaler immédiatement, en discuter, puis mettre à
   jour À LA FOIS le code, ce CLAUDE.md et la section concernée du dossier.
   La documentation ne doit jamais diverger de l'implémentation.
3. **Fichiers complets.** Toujours produire des fichiers entiers, prêts à
   copier-coller. Jamais de snippets ni de `// reste du code ici`.
4. **Explicabilité.** La certification comprend une revue de code en face-à-face.
   Chaque décision technique doit pouvoir être expliquée et défendue : privilégier
   la clarté et la terminologie métier correcte, commenter les passages non triviaux.

## Stack technique (verrouillée — §2.5)

| Brique        | Choix                                |
| ------------- | ------------------------------------ |
| Frontend      | Next.js (PWA, SSR/SSG)               |
| Backend       | NestJS (monolithe modulaire)         |
| Base de données | PostgreSQL + PostGIS               |
| Cache         | Redis (cache + sessions)             |
| ORM           | TypeORM (intégration NestJS, types spatiaux PostGIS) |
| Cartographie  | Leaflet + OpenStreetMap              |
| Routing       | API Navitia                          |
| Langage       | TypeScript de bout en bout (strict)  |

## Structure du monorepo (pnpm workspaces)

```
apps/web    → PWA Next.js (couche présentation)
apps/api    → Backend NestJS, src/modules/{auth,user,trip,carbon,integration,notification}
packages/shared-types → types TS partagés front ↔ back
packages/config       → configs ESLint / Prettier / tsconfig mutualisées
docs/adr    → Architecture Decision Records
```

## Conventions de nommage (§4.2 — univoques et homogènes)

| Élément                       | Convention            | Exemple                       |
| ----------------------------- | --------------------- | ----------------------------- |
| Variables, fonctions (JS/TS)  | camelCase             | `calculateCarbonFootprint()`  |
| Classes, composants, types    | PascalCase            | `TripPlannerService`          |
| Constantes globales           | UPPER_SNAKE_CASE      | `EMISSION_FACTOR_BUS`         |
| Routes d'API REST             | kebab-case, pluriel, versionné | `/api/v1/carbon-logs` |
| Tables et colonnes BDD        | snake_case            | `carbon_log`, `user_id`       |
| Branches Git                  | type/description-courte | `feature/carbon-calculator` |

**Lexique métier univoque** (n'utiliser QUE ces termes) : `Trip` (déplacement
A→B complet), `Segment` (portion sur un seul mode), `Mode` (moyen de transport),
`Station` (point d'accès physique), `CarbonLog` (enregistrement d'émissions).

## Invariants d'architecture (§5 — l'évolutivité motive chaque choix)

- **Monolithe modulaire NestJS** : modules découplés par domaine. Un module doit
  rester extractible en microservice sans refonte (principe *MonolithFirst*).
- **Séparation des couches** : chaque couche ne connaît que la couche inférieure.
- **Abstraction `TransportProvider`** : le module Integration est le SEUL point de
  contact avec les APIs externes (Navitia, GTFS-RT, GBFS). Ajouter un opérateur =
  implémenter l'interface, sans toucher au cœur.
- **Versioning d'API** : toutes les routes sous `/api/v1/`.
- **Multi-tenancy logique** : colonne `tenant_id` présente dès le MVP.
- **Standards ouverts** : GTFS, GBFS, NeTEx, SIRI.
- **Config externalisée** (12-Factor) : variables d'environnement, jamais de
  valeur en dur ni de secret dans le code.

## Modèle de données (§5.3)

Entités : `user`, `mobility_profile`, `trip`, `trip_segment`, `emission_factor`,
`carbon_log`, `station`. Clés primaires en UUID. Points géographiques en
`geography(POINT)` (PostGIS). Les `emission_factor` sont **versionnés par date**
(`valid_from`) : une mise à jour des facteurs ADEME ne doit pas altérer l'historique.

## Fonctionnalités du MVP (§4)

- **F1** — Inscription, connexion, profil mobilité (RGPD, suppression sous 30 j).
- **F2** — Planificateur multimodal géolocalisé (≥ 3 options, temps réel, < 3 s).
- **F3** — Intégration APIs transport (Navitia + GBFS + GTFS-RT, cache, mode dégradé).
- **F4** — Calculateur d'empreinte carbone (fonctionnalité CLÉ) : `émissions(Trip)
  = Σ [ distance(Segment) × facteur(Mode) ]`, tableau de bord, export PDF.

## Standards de qualité de code (§3.5)

Clean Code, principes SOLID, 12-Factor App, Conventional Commits, ESLint 9 en
flat config (`eslint-config-next` côté web, config NestJS générée côté api,
enrichies du style guide Airbnb via `eslint-config-airbnb-extended` — natif
flat-config, l'`eslint-config-airbnb-typescript` d'origine étant archivé),
Prettier, TypeScript strict. Limite WIP : 2 stories max en cours.

## Definition of Done (§6.5) — checklist avant toute clôture de story

- [ ] Code revu (Pull Request validée)
- [ ] Tests unitaires écrits et passants, couverture ≥ 70 % sur le module touché
- [ ] Tests E2E ajoutés/mis à jour sur les parcours impactés
- [ ] Tests d'accessibilité passants (axe-core, sans violation critical/serious)
- [ ] Aucune régression Lighthouse (perf + accessibilité)
- [ ] Aucune régression EcoIndex
- [ ] Documentation à jour (README du module, OpenAPI si nouvel endpoint)
- [ ] Aucun nouveau composant vulnérable (npm/pnpm audit, Dependabot)
- [ ] Validation fonctionnelle en preprod

## Stratégie de tests (§6.1)

Pyramide : Jest (back) / Vitest (front) pour l'unitaire (~70 %), Supertest pour
l'intégration (~20 %), Playwright pour le E2E (~10 %).

- **Module Carbon : testé à 100 %** (calcul déterministe et reproductible).
- **Module Integration : testé via mocks** — JAMAIS d'appel réel aux APIs externes
  en CI ; utiliser des fixtures versionnées.
- **Guards de sécurité (RBAC) systématiquement testés** (couvre OWASP A01).
- Seuil bloquant en CI : couverture backend ≥ 70 %.

## Sécurité (§5.7) & données personnelles (§5.6)

OWASP Top 10 : RBAC via NestJS Guards (A01), bcrypt cost 12 + TLS 1.3 + AES-256 au
repos (A02), requêtes paramétrées + class-validator (A03), Helmet/CSP (A05),
liste blanche des URLs sortantes (A10). RGPD : privacy-by-design, consentement
explicite à la géolocalisation, minimisation (le `CarbonLog` n'est écrit que si le
trajet est confirmé), chiffrement des points domicile/travail.

## Workflow Git

- Une user story = une branche `type/description` = une PR.
- Branche `main` protégée : aucun merge sans PR validée ET CI verte.
- Commits au format Conventional Commits (`feat:`, `fix:`, `test:`, `chore:`…).
- Tout correctif de bug s'accompagne d'un test de régression (§6.4).

## Commandes du projet

> À compléter au fur et à mesure du setup (install, dev, test, lint, build, db).

## Ce qu'il ne faut JAMAIS faire

- Produire des snippets partiels au lieu de fichiers complets.
- Appeler une API externe réelle dans les tests CI (toujours mocker).
- Merger sans PR ni CI verte.
- Écrire un secret/clé en clair dans le code (toujours via variables d'env).
- Dévier du dossier sans le signaler et synchroniser la documentation.
- Inventer un terme métier hors du lexique univoque ci-dessus.