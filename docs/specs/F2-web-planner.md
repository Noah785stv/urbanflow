# F2-web — Première tranche verticale frontend (planificateur)

> Spécification d'implémentation. À lire avec `CLAUDE.md` et `F2-planner.md`
> (volet backend, déjà livré). Références dossier : §4.5 (F2), §5.6 (C1/C2/C6/C7),
> §2.5 (Leaflet/OSM).

## 1. Objectif

Livrer la **première interface utilisable** de l'application (`apps/web`, aujourd'hui
un squelette) : une tranche verticale de bout en bout — **se connecter → saisir un
trajet → voir les 3 itinéraires classés avec leur CO₂ sur une carte**. Cette tranche
valide toute la chaîne (auth, contrat d'API, carto, PWA) et fait remonter tôt les
problèmes d'intégration.

## 2. Périmètre de la tranche

**Inclus :**

- Parcours d'authentification (connexion, inscription minimale), appels API
  authentifiés, gestion du 401.
- Page planificateur : origine par géolocalisation, destination par clic sur la
  carte, appel à `POST /api/v1/trips/plan`, affichage des 3 options classées.
- Carte Leaflet + OpenStreetMap (marqueurs origine/destination).
- PWA installable (manifest + service worker) — C1.
- Accessibilité de base WCAG 2.1 AA (C7) et responsive mobile-first (C2).

**Exclu (itérations suivantes) :**

- Recherche d'adresse (géocodage Nominatim) : reportée pour ne pas ajouter une
  dépendance externe dans cette tranche. Interaction MVP = géolocalisation + clic carte.
- Tableau de bord carbone, historique, export PDF → **F4**.

## 3. Contrat d'API (backend déjà livré)

**Auth (F1)** — aligne les appels sur les **formes de réponse réelles** de F1
(vérifie les DTO côté `apps/api`, ne devine pas les noms de champs) :
`POST /auth/register`, `POST /auth/verify-email`, `POST /auth/login` (→ tokens),
`POST /auth/refresh`, `POST /auth/logout`, `GET /users/me`.

**Planificateur (F2)** — `POST /api/v1/trips/plan`

- Corps : `PlanTripRequest { from: {latitude, longitude}, to: {latitude, longitude},
departureAt?, excludeModes?, accessibleOnly? }`.
- Réponse : `PlannedJourney[]` avec `departureAt`, `arrivalAt`, `durationSeconds`,
  `sections[{ mode, durationSeconds, distanceMeters, geometry? }]`, `co2Grams`,
  `estimatedCostCents`, `labels[]` (`fastest` | `greenest` | `cheapest`).

> ✅ **Point résolu (contrat d'API).** Le manque de géométrie signalé ci-dessous a
> été comblé par l'incrément transversal `F2-geometry` (voir
> `docs/specs/F2-geometry.md`) : `JourneySection.geometry` porte désormais la
> polyligne encodée (format Google, précision 5) du tronçon, décodée côté client
> uniquement (sobriété du payload). Champ **optionnel** — absence sans impact sur
> le calcul carbone, le coût ou le classement.

## 4. Stack frontend

Next.js (App Router, déjà scaffoldé) + TypeScript strict + Tailwind. Cartographie :
`react-leaflet` + tuiles OSM (attribution obligatoire). PWA : `@serwist/next`. Appels
API : `fetch` + un contexte d'auth React (pas de nouvelle grosse dépendance d'état
pour cette tranche). Leaflet dépend de `window` → composants carte **client-only**
(`'use client'` + import dynamique `ssr: false`).

## 5. Écrans & parcours

1. **Connexion** (`/login`) : e-mail + mot de passe → stocke l'access token → redirige
   vers le planificateur. Lien vers l'inscription.
2. **Inscription** (`/register`) : e-mail + mot de passe (≥ 12 car., même règle que F1).
   En dev, la vérification e-mail se fait via le token journalisé par l'API (documenter
   ce raccourci de dev).
3. **Planificateur** (`/`, protégé) : carte + panneau « d'où → où » + bouton « Calculer »
   → liste des 3 options classées. Bouton de déconnexion.

Une route protégée non authentifiée redirige vers `/login`.

## 6. Géolocalisation (C6)

- Origine par défaut = position via l'**API Geolocation du navigateur**, avec
  **repli** si refus/échec (dernière position, ou centre de la métropole).
- **Afficher la précision** retournée (rayon en mètres) à l'utilisateur.
- Consentement respecté : ne jamais forcer la géolocalisation ; l'utilisateur peut
  poser l'origine manuellement en cliquant la carte.

## 7. Carte Leaflet

- Tuiles OSM, centrée sur la métropole (Rennes), attribution visible.
- Clic sur la carte = pose origine puis destination (marqueurs distincts).
- La carte est un **complément** : la liste des résultats (§8) reste la source
  d'information accessible (voir C7).

## 8. Affichage des résultats

Les `PlannedJourney` sont présentés en **liste sémantique**, une carte par option :

- badge du/des `labels` (le plus rapide / le plus écologique / le moins cher) ;
- durée, **CO₂ (`co2Grams`)**, coût (`estimatedCostCents`, ou « estimation
  indisponible » si `null`) ;
- décomposition des `sections` (suite de modes avec durée/distance).
  Sélectionner une option la met en évidence et trace son parcours réel sur la
  carte, tronçon par tronçon (couleur par mode) — voir `F2-geometry.md`.

## 9. Authentification côté client

- Attacher l'access token (`Authorization: Bearer …`) aux appels API.
- Sur **401**, tenter un `refresh` une fois, sinon rediriger vers `/login`.
- Stockage de l'access token **en mémoire** (contexte React) pour cette tranche.
  > À signaler : le stockage de tokens est un sujet de sécurité (XSS). Le durcissement
  > (cookies httpOnly) est un incrément ultérieur ; l'assumer, ne pas bricoler.

## 10. PWA (C1)

- `manifest` (nom, icônes, couleurs, `display: standalone`) → installable.
- Service worker via `@serwist/next` : mise en cache de l'app shell + de la dernière
  réponse de plan (fonctionnement dégradé hors-ligne basique, cohérent C10).

## 11. Accessibilité (C7) & responsive (C2)

- Navigation **clavier complète** (formulaire, résultats, contrôles carte), focus
  visible, ordre logique.
- HTML sémantique, `label` associés, `aria` là où utile ; annonce des résultats
  (région live) après calcul.
- Contrastes **AA** (4.5:1 texte normal). Respect de `prefers-reduced-motion`.
- Mobile-first : formulaire et résultats s'empilent sur petit écran, carte
  redimensionnable.

## 12. Configuration & dépendances

Dépendances : `leaflet react-leaflet`, `@serwist/next serwist` (+ types Leaflet en dev).
Variable d'env : `NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1` (dans
`apps/web/.env.local` et `.env.example`).

## 13. Critères d'acceptation

- [ ] Un utilisateur peut se connecter, atteindre le planificateur, et être redirigé
      vers `/login` s'il n'est pas authentifié.
- [ ] L'origine se remplit par géolocalisation (avec précision affichée) et le repli
      fonctionne en cas de refus.
- [ ] Un calcul renvoie et affiche **3 options classées** avec durée, CO₂ et coût.
- [ ] L'app est **installable** (manifest + service worker actifs).
- [ ] Parcours connexion + planification **entièrement utilisables au clavier**,
      sans violation axe-core critique/serious.
- [ ] Utilisable de mobile à desktop.

## 14. Tests attendus (DoD §6.5)

- **Composants** : rendu des cartes de résultats (labels, CO₂, coût `null`),
  formulaire, garde d'authentification.
- **Accessibilité** : `axe-core` (via `@axe-core/playwright`) sur `/login` et le
  planificateur → 0 violation critical/serious.
- **E2E (Playwright)** : parcours connexion → calcul → affichage des 3 options
  (API mockée ou de test). Navigation clavier vérifiée.
- Pas d'appel réseau réel non maîtrisé en CI.

## 15. Ordre d'implémentation suggéré

1. Dépendances + `NEXT_PUBLIC_API_URL` + client API (`fetch` + Bearer + refresh sur 401).
2. Contexte d'auth + pages `/login` et `/register` + garde de route.
3. Carte Leaflet client-only (marqueurs origine/destination, tuiles OSM).
4. Géolocalisation (origine + précision + repli).
5. Formulaire + appel `POST /trips/plan` + liste des 3 options accessibles.
6. PWA : manifest + service worker Serwist.
7. Passe accessibilité (clavier, focus, aria, contrastes) + responsive.
8. Tests (composants, axe-core, e2e) ; vérifier la DoD.

## 16. Points à signaler pendant l'implémentation

- **Géométrie manquante dans l'API** (§3) : ✅ résolu par l'incrément
  `F2-geometry` (`docs/specs/F2-geometry.md`).
- **Stockage de tokens** : en mémoire ici, durcissement (cookies httpOnly) reporté.
- **Vérification e-mail en dev** : documenter le raccourci (token journalisé).
- Toute contrainte rendant une règle infaisable → la signaler et synchroniser cette
  spec + le dossier (règle n°2).
