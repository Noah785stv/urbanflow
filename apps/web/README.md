# @urbanflow/web

Frontend PWA d'UrbanFlow Mobility — Next.js App Router (voir `CLAUDE.md` à la
racine du monorepo pour la stack, les conventions et la Definition of Done).

## Prérequis

- Node.js ≥ 20, pnpm ≥ 9
- `apps/api` démarré (voir `apps/api/README.md`) pour un usage réel ; les
  tests (unitaires, e2e, a11y) n'en ont pas besoin, tout est mocké.

## Mise en route

```bash
# à la racine du monorepo
pnpm install
cp apps/web/.env.example apps/web/.env.local   # NEXT_PUBLIC_API_URL

pnpm --filter web dev   # http://localhost:3000
```

## Commandes

| Commande                      | Description                                               |
| :---------------------------- | :-------------------------------------------------------- |
| `pnpm --filter web dev`       | Serveur de dev (webpack — voir note Turbopack ci-dessous) |
| `pnpm --filter web build`     | Build de production (génère aussi le service worker)      |
| `pnpm --filter web start`     | Sert le build de production                               |
| `pnpm --filter web lint`      | ESLint (flat config, corrige automatiquement)             |
| `pnpm --filter web typecheck` | Vérification TypeScript stricte, sans émission            |
| `pnpm --filter web test`      | Tests de composants (Vitest + Testing Library)            |
| `pnpm --filter web test:e2e`  | E2E + accessibilité (Playwright, axe-core) — API mockée   |

## Module Planificateur (F2, première tranche verticale)

Spec : `docs/specs/F2-web-planner.md`. Parcours : **se connecter → saisir un
trajet → voir les 3 itinéraires classés avec leur CO₂ sur une carte**.

- `/login`, `/register` : authentification (F1). L'inscription inclut une
  étape de vérification par token collé manuellement — F1 n'envoie pas
  d'e-mail réel, le lien est journalisé côté API en dev.
- `/` (protégée) : carte Leaflet/OSM (marqueurs + tracé réel de l'itinéraire
  sélectionné, voir F2-geometry ci-dessous), origine par géolocalisation ou
  clic carte, saisie clavier des coordonnées, `POST /trips/plan`, 3 options
  classées (`fastest`/`greenest`/`cheapest`).

### Points clés

- **Jetons en mémoire uniquement** (`lib/token-store.ts`), jamais persistés.
  Conséquence assumée (§9) : un rechargement de page déconnecte l'utilisateur.
  Le durcissement (cookies httpOnly) est un incrément ultérieur.
- **`POST /auth/refresh`** attend le refresh token en `Authorization: Bearer`
  (comme l'access token) — vérifié dans `apps/api` avant d'écrire le client,
  pas deviné.
- **Hors-ligne (§10, C1)** : le service worker (Serwist) met en cache l'app
  shell ; la dernière réponse de `POST /trips/plan` (non cachable côté SW —
  Cache API ne gère que les GET) est mémorisée dans `localStorage`
  (`lib/last-plan-cache.ts`) et resservie si le réseau échoue.
- **Accessibilité (§11, C7)** : navigation clavier complète (y compris pour
  poser origine/destination — champs lat/lng en plus du clic carte), focus
  visible, contrastes AA, région live pour l'annonce des résultats. Vérifié
  par `axe-core` (0 violation critical/serious) sur `/login`, `/register` et
  le planificateur.
- **Tri des itinéraires** (`components/planner/trip-results.tsx`) : à partir
  de 2 résultats, un contrôle « Trier par Durée / CO₂ / Coût » réordonne
  l'affichage (croissant, le meilleur en premier — un coût `null` non estimé
  trie en dernier, jamais traité comme gratuit). Le tri ne réordonne qu'une
  copie locale : `selectedIndex`/`onSelect` (portés par `TripPlanner`)
  référencent toujours l'index dans `journeys`, jamais la position affichée —
  la sélection reste donc correcte quel que soit le tri actif.
- **Détail de l'itinéraire** (`components/planner/trip-result-card.tsx`) : à
  la **sélection** d'une option (pas à la confirmation, §RGPD — voir la
  décomposition ci-dessous) s'affiche le détail pas-à-pas : pour un tronçon
  en transport en commun, ligne + direction + arrêts de montée/descente
  (`JourneySection.line`/`headsign`/`fromStopName`/`toStopName`, envoyés par
  `apps/api` uniquement quand `route` est non nul côté OTP). Un tronçon à
  pied garde le format compact (mode, durée, distance) : OTP y renseigne
  `from`/`to` avec des placeholders ("Origin"/"Destination"), jamais exposés
  comme de vrais arrêts.

### Tracé de l'itinéraire (F2-geometry)

Spec : `docs/specs/F2-geometry.md`. `JourneySection.geometry` porte la
polyligne du tronçon **encodée** (format Google, précision 5) telle que
renvoyée par OTP — le serveur ne la décode jamais, seul le client le fait
(`lib/decode-geometry.ts`, via `@mapbox/polyline`), pour garder le payload
sobre (éco-conception, C5/RGESN). Sélectionner une option dessine son tracé
sur la carte, un `Polyline` par tronçon coloré selon le mode
(`lib/mode-labels.ts#MODE_COLORS`), avec recadrage automatique
(`fitBounds`). Champ **optionnel** : un tronçon sans géométrie n'est
simplement pas dessiné, sans erreur.

### Turbopack

`@serwist/next` (plugin webpack) ne supporte pas Turbopack, devenu le bundler
par défaut de Next.js 16. `dev`/`build` passent donc explicitement
`--webpack` (voir `package.json`, `next.config.ts`).

### Hors périmètre de cette tranche (voir spec §2)

Durcissement du stockage de jetons.

### Géocodage d'adresse (Lot A, `docs/specs/web-geocoding-and-pages.md`)

L'origine et la destination se saisissent en **adresse** (composant
`AddressAutocomplete`), pas en coordonnées GPS — `lib/geocoding-api.ts`
appelle la Géoplateforme IGN (`data.geopf.fr/geocodage`, Base Adresse
Nationale, sans clé) directement depuis le navigateur.

- **Pattern ARIA combobox** (`components/planner/address-autocomplete.tsx`) :
  le focus DOM reste sur le champ texte, l'option survolée/naviguée au
  clavier (↑ ↓ Entrée Échap) est seulement signalée via
  `aria-activedescendant` — jamais un déplacement de focus réel, qui
  casserait la frappe. Recherche debouncée (300 ms), seuil de 3 caractères,
  `AbortController` pour annuler une requête devenue obsolète. Vérifié par
  axe-core avec la liste de suggestions **ouverte** (l'état le plus à
  risque), pas seulement au repos.
- **Le texte affiché n'est jamais la source de vérité envoyée au backend.**
  `POST /trips/plan` reçoit toujours `{ latitude, longitude }` — celles de
  la suggestion effectivement sélectionnée. Un texte libre non résolu (pas
  encore sélectionné) invalide la sélection précédente : impossible de
  calculer un itinéraire sur une adresse tapée mais non choisie.
- **Géoloc et clic carte inchangés dans leur mécanique**, mais désormais
  accompagnés d'un **géocodage inversé** (`reverseGeocode`) pour afficher
  une adresse lisible plutôt que des coordonnées brutes ; ces dernières
  restent un repli visible pendant la résolution, ou si l'IGN ne renvoie
  aucun résultat proche — jamais bloquant.
- **Client HTTP dédié, pas `apiRequest`.** `lib/geocoding-api.ts` appelle un
  hôte tiers public sans jeton Bearer ; réutiliser le client de
  `apps/api` (Bearer + retry 401) n'aurait pas de sens ici.
- **Point signalé (CLAUDE.md §5) : appel direct navigateur → IGN.**
  L'invariant « le module Integration est le seul point de contact avec les
  APIs externes » énumère explicitement OpenTripPlanner/GTFS-RT/GBFS — les
  fournisseurs de données transport qu'`apps/api` doit mettre en cache et
  dégrader. Le géocodage IGN en est hors périmètre : API publique sans clé,
  appelée à chaque frappe (debounce 300 ms) — la proxifier via le backend
  ajouterait une latence perceptible sur un pattern typeahead sans rien
  protéger. Documenté explicitement plutôt que laissé implicite.

## Module Tableau de bord carbone (F4-web)

Spec : `docs/specs/F4-web-dashboard.md`. Volet frontend de F4 (backend livré,
`docs/specs/F4-carbon.md`) : rend la fonctionnalité clé **visible**.
Réutilise le contexte d'auth et `apiRequest` de F2-web — **aucune nouvelle
dépendance**.

- Sur le planificateur, une option sélectionnée affiche « Enregistrer ce
  trajet » (`POST /carbon-logs`). Le corps est réduit à `{ mode,
distanceMeters }` par tronçon via une fonction pure dédiée et testée
  isolément (`lib/to-confirm-trip-request.ts`) : `durationSeconds` et
  `geometry` (présents sur `JourneySection`) sont explicitement retirés,
  jamais transmis par un simple spread — l'API les rejette en 400
  (`whitelist` stricte, F4-carbon.md §6).
- `/dashboard` (protégée) : cartes de résumé (CO₂ cumulé, économies vs
  voiture solo, nombre de trajets), historique mensuel, trajets récents
  paginés, export PDF par mois.
- **Types** : `CarbonLog`, `CarbonLogPage`, `CarbonLogSummary`,
  `MonthlyCarbonBreakdown`, `ModeBreakdownEntry`, `ConfirmTripRequest`
  réutilisés depuis `@urbanflow/shared-types`, jamais redéfinis.

### Points clés

- **Pas de librairie de graphique.** Le graphe mensuel (≤ 12 barres) est un
  SVG écrit à la main plutôt qu'une dépendance comme `recharts` — la table
  de données équivalente est de toute façon obligatoire pour
  l'accessibilité (voir plus bas) et porte déjà 100 % de l'information ;
  ajouter une librairie de charting pour 12 barres irait à l'encontre de la
  sobriété déjà pratiquée sur ce projet (choix de la polyligne encodée en
  F2-geometry).
- **Accessibilité des graphes (§8).** Le SVG est décoratif (`aria-hidden`) :
  la donnée réelle vit dans une `<table>` **toujours visible** juste en
  dessous (mois/CO₂/économies/trajets), jamais une alternative masquée.
  Aucune animation, donc rien à désactiver pour `prefers-reduced-motion`.
  Vérifié par `axe-core` (0 violation critical/serious) sur `/dashboard`.
- **Export PDF authentifié.** `GET /carbon-logs/report` exige le Bearer, donc
  un `<a href>` classique ne suffit pas : `lib/api-client.ts#apiRequestBlob`
  récupère le PDF en `Blob` via la même logique d'auth/retry-on-401 que
  `apiRequest`, puis `lib/download-blob.ts` déclenche le téléchargement côté
  navigateur (`URL.createObjectURL`).

## Pages statiques, footer & erreurs (Lot B, `docs/specs/web-geocoding-and-pages.md`)

- **Footer** (`components/layout/footer.tsx`) posé dans `app/layout.tsx`, donc sur
  **toutes** les pages y compris non authentifiées (contrairement à
  `AppHeader`, qui ne s'affiche qu'une fois connecté) — et donc aussi
  présent sur 404/erreur/403, qui restent rendues dans le layout racine.
- **`/confidentialite`, `/mentions-legales`, `/a-propos`** : contenu
  illustratif (service fictif) mais la politique de confidentialité décrit
  le fonctionnement **réellement implémenté**, vérifié dans le code (pas
  recopié depuis la spec) : bcrypt coût 12, chiffrement AES-256-GCM
  applicatif de `mobility_profile.home/workLocationEncrypted`, consentement
  géoloc explicite (opt-in, désactivé par défaut), minimisation du
  `CarbonLog` (aucune origine/destination), suppression de compte
  **immédiate** (voir CLAUDE.md §F1 — divergence positive avec le dossier,
  qui annonçait un délai de 30 j), aucun cookie (jeton en mémoire, cf.
  `lib/token-store.ts`), géocodage inversé de la position réelle pour
  « Utiliser ma position » (pas seulement la recherche tapée), transferts
  hors UE (hébergement front Vercel) et voie de réclamation CNIL.
  > ⚠️ **Correction (revue ultérieure) : GBFS retiré de la page.** Le
  > `GbfsProvider` backend (`apps/api`) existe et synchronise bien la table
  > `station`, mais **rien dans `apps/web` ne l'appelle** — aucune page,
  > aucun composant. La politique affirmait à tort que la disponibilité des
  > vélos/trottinettes partagés provenait d'un flux GBFS visible dans
  > l'app ; retiré tant que ce n'est pas réellement branché côté front.
- **Pages d'erreur** : `app/not-found.tsx` (404), `app/error.tsx` (error
  boundary générique, requiert `'use client'` côté Next.js), `app/403/page.tsx`.
  Le 403 est construit et stylé mais **n'a pas de déclencheur réel
  aujourd'hui** : `RouteGuard` ne vérifie que l'authentification, pas
  `UserRole` — aucune route n'est restreinte par rôle dans l'app actuelle.
  Prête pour un futur contrôle d'accès, pas câblée artificiellement pour
  la forme (même traitement que la variante `disruption` de `RankingBadge`).
- **`LinkButton`** (`components/ui/link-button.tsx`) : même apparence que
  `Button`, mais un vrai lien (`next/link`) pour les retours à l'accueil
  depuis les pages d'erreur — la logique de classes communes a été extraite
  vers `components/ui/tokens.ts` (`BUTTON_BASE_CLASS`/`BUTTON_VARIANT_CLASS`)
  pour que les deux composants restent visuellement identiques sans
  dupliquer les styles.

## Passe d'accessibilité (durcissement C7)

Couverture axe-core (0 violation critical/serious) étendue à **toutes** les
pages : `/login`, `/register`, planificateur (repos + suggestions ouvertes),
tableau de bord, `/confidentialite`, `/mentions-legales`, `/a-propos`,
`/403`, 404. `app/error.tsx` (frontière d'erreur générique) fait exception :
inatteignable par navigation réelle sans ajouter une route qui lève
volontairement une exception (nouvelle logique applicative, hors périmètre
d'une passe présentation) — testé à la place en jsdom via `axe-core`
directement dans `app/error.test.tsx`.

- **`e2e/keyboard-navigation.spec.ts` (nouveau).** Preuve en navigateur réel
  de l'ordre de tabulation sur `/login` et le planificateur, plutôt qu'une
  lecture du JSX — y compris la carte Leaflet et le combobox d'adresse,
  signalés comme délicats. Aucun piège de focus trouvé : on entre dans la
  carte et le combobox, et on en ressort normalement.
  - Piège de méthode de test trouvé et corrigé en cours de route : un simple
    `blur()` ne réinitialise pas le point de départ de tabulation de
    Chromium après une connexion (il repart du dernier élément réellement
    cliqué) — focaliser explicitement le lien d'évitement avant de tabuler
    est fiable, `blur()` seul ne l'est pas.
  - **Vraie trouvaille corrigée sur l'app** : les contrôles de zoom Leaflet
    affichaient « Zoom in »/« Zoom out » — anglais sur un site `lang="fr"`.
    `components/planner/trip-map.tsx` désactive désormais le contrôle par
    défaut (`zoomControl={false}`) et le repose francisé (`<ZoomControl
zoomInTitle="Zoomer" zoomOutTitle="Dézoomer" />`).
- **Test `/dashboard` stabilisé, pas masqué.** Le `<h1>` de `CarbonDashboard`
  se rend avant la fin du chargement ; le test n'attendait que ce titre puis
  lançait axe immédiatement, ce qui percutait la navigation/le rendu encore
  en cours sous forte parallélisation (piège documenté côté
  `@axe-core/playwright` avec les navigations SPA — cause du flake, pas
  l'app). Corrigé en attendant la région live existante (« Tableau de bord
  carbone chargé. ») avant d'appeler axe. Vérifié sur 3 exécutions complètes
  de la suite, pas un seul run vert isolé.
- **Déjà conformes, aucune correction nécessaire** : alternative textuelle
  du graphe mensuel (`<table>` toujours visible), régions live des résultats
  d'itinéraire et de la confirmation d'enregistrement (`role="status"`),
  `lang="fr"` global, titres de page uniques, labels de formulaire tous
  câblés via `Input`.

## Passe éco-conception (C5)

`ANALYZE=true pnpm --filter web build` active `@next/bundle-analyzer`
(`next.config.ts`, `openAnalyzer: false`, aucun effet sur `dev`/`build`
normaux) — a servi à mesurer, pas à deviner, le seul levier EcoIndex retenu :

- **Chargement différé de la carte** (`components/planner/map-placeholder.tsx`).
  La carte (chunk Leaflet + tuiles OSM) chargeait auparavant dès l'affichage
  du planificateur, avant toute interaction — mesuré : 9 requêtes de tuiles
  sur les 53 premières requêtes de la page. Elle est désormais remplacée par
  un placeholder (bouton « Afficher la carte », même gabarit, aucun saut de
  mise en page) tant que rien ne l'a sollicitée. Se monte au premier de :
  activation du placeholder, **ou** prise de focus d'un des deux champs
  `AddressAutocomplete` (nouvelle prop `onFocus`, additive — n'affecte aucun
  test existant) ; reste monté ensuite pour le reste de la session. Mesuré
  avant/après (script Playwright ponctuel, non conservé) sur `/` juste après
  connexion : **115 → 82 nœuds DOM, 53 → 17 requêtes, 9 → 0 tuiles**.
  - Le parcours clic-sur-la-carte reste inchangé une fois affichée (mêmes
    props/handlers que `<TripMap>` avant ce changement).
  - `e2e/map-lazy-load.spec.ts` (nouveau) : preuve réseau (pas seulement
    DOM) que zéro requête de tuile ne part avant sollicitation, montage via
    le placeholder et via le focus d'un champ, persistance, et clic-carte
    intact une fois affichée.
  - `e2e/a11y.spec.ts` : le test planificateur historique couvre désormais
    le placeholder (lui-même vérifié accessible) ; un nouveau test couvre la
    carte réellement montée, pour ne perdre aucune couverture axe-core.
- **Fonts et images déjà optimales, vérifié dans le code du paquet (pas
  deviné)** : `next/font/google` a `display: 'swap'`, `preload: true` et
  `adjustFontFallback: true` par défaut ; `subsets: ['latin']` déjà posé
  explicitement. `public/` ne contient aucune image raster — rien à
  convertir vers `next/image`.
- **Ménage** : les 5 SVG de scaffold Next.js jamais utilisés (`file.svg`,
  `globe.svg`, `next.svg`, `vercel.svg`, `window.svg`) ont été supprimés,
  confirmé sans référence dans le code au préalable.
- **Framework tax, non actionnable** : les postes les plus lourds du bundle
  (runtime App Router, React/react-dom) sont à ~95 % du code Next.js/React
  lui-même, pas du code applicatif — hors périmètre d'une passe présentation.

## Design system (`docs/design-system.md`)

Tokens (`app/globals.css` `@theme`, Tailwind 4 — pas de `tailwind.config.js`)
et composants de base réutilisables (`components/ui/`) : `Button`, `Input`,
`Card`, `ModeChip`, `RankingBadge`. Appliqués à tout `apps/web` (planificateur,
tableau de bord, authentification, en-tête) ; `lib/styles.ts` — l'ancien
système de classes ad hoc qu'ils remplacent — est supprimé, plus aucun écran
ne le consomme.

- **Tokens `brand-blue-*`/`brand-green-*`** : préfixés volontairement.
  `blue`/`green` sont déjà des noms de palette Tailwind natifs ; les
  redéclarer directement aurait re-teinté `bg-blue-700` etc. avant que la
  propagation ne soit validée. Gardés tels quels après propagation complète :
  renommer maintenant romprait tous les usages pour un gain nul, la doc
  fait référence sous ce nom.
- **Fonts** : IBM Plex Sans (400/600) + IBM Plex Mono (500) via `next/font`,
  remplacent Geist globalement (inévitable — un seul `<html>` racine). Le
  mono s'applique à toute donnée chiffrée (durée, CO₂, coût, distance,
  nombre de trajets) partout dans l'app, conformément à la section 3.
- **Couverture partielle des couleurs de mode (§2).** Seuls 4 `TransportMode`
  sur 10 ont une couleur officielle (métro/bus/vélo/marche) — appliquée
  exactement. Les 6 autres (VAE, trottinette, tram, TER, voiture solo,
  covoiturage) gardent leurs couleurs F2-geometry existantes plutôt que des
  teintes inventées qui auraient l'air sanctionnées par la doc.
  `RankingBadge` a une variante `disruption` sans source de données
  aujourd'hui (`JourneyLabel` n'a que fastest/greenest/cheapest) : construite,
  non câblée.
- **Focus visible (§5) : `ring-*`, pas `outline-*`.** Constaté en navigateur
  réel : sur `<button>` (natif, `appearance: button` non réinitialisé par
  Preflight Tailwind 4), `outline-color` en `:focus-visible` — testé sous
  trois formes (`outline-black`, `var(--color-black)`, hex direct
  `outline-[#000]`) — se réduit systématiquement à `currentColor`, alors que
  le même utilitaire fonctionne correctement sur `<input>`. Cause exacte non
  élucidée (probablement liée au rendu du widget natif du bouton) ;
  contournée en utilisant `ring-[3px] ring-[#000] ring-offset-2`
  (`box-shadow`, indépendant du rendu natif) pour tous les composants
  `components/ui/*`, bouton et champ confondus. Vérifié en DOM réel
  (`getComputedStyle`), pas seulement en test unitaire.
- **`Button` désactivé = `aria-disabled`, pas l'attribut natif `disabled`**
  (design-system.md §4) : reste focusable/repérable au clavier, le clic est
  neutralisé côté composant.
