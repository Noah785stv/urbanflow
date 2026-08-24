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

Géocodage d'adresse (Nominatim), tableau de bord carbone/historique/export
PDF (F4), durcissement du stockage de jetons.

## Design system — fondation (`docs/design-system.md`)

Tokens (`app/globals.css` `@theme`, Tailwind 4 — pas de `tailwind.config.js`)
et composants de base réutilisables (`components/ui/`) : `Button`, `Input`,
`Card`, `ModeChip`, `RankingBadge`. **Appliqués pour l'instant uniquement à
`/login`**, comme preuve de direction avant propagation aux autres écrans —
qui continuent d'utiliser `lib/styles.ts` sans changement.

- **Tokens `brand-blue-*`/`brand-green-*`** : préfixés volontairement.
  `blue`/`green` sont déjà des noms de palette Tailwind natifs ; les
  redéclarer directement aurait re-teinté tout usage existant de
  `bg-blue-700` etc. ailleurs dans l'app avant que la propagation ne soit
  décidée. Alignés sur la palette native (mêmes valeurs) au moment de la
  propagation complète.
- **Fonts** : IBM Plex Sans (400/600) + IBM Plex Mono (500) via `next/font`,
  remplacent Geist globalement (inévitable — un seul `<html>` racine).
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
