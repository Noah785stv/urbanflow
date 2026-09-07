# Runbook de démo — UrbanFlow Mobility

> Mode d'emploi pour présenter la solution le jour de l'oral : le site en ligne
> (Vercel) **et** un front local, **en même temps**, tous les deux branchés sur le
> même backend (ta machine, exposée par un tunnel Cloudflare gratuit pour le site en
> ligne). Testé de bout en bout. À dérouler tel quel le jour J.

## Architecture

```
Navigateur du jury
      │ (HTTPS)
      ▼
Front Next.js ─────► Vercel  (https://urban-flow-mobility.vercel.app)
      │ appels API (HTTPS)
      ▼
Tunnel Cloudflare  (https://<mots-aléatoires>.trycloudflare.com)
      │ expose le port 3001
      ▼
Ta machine :  API NestJS (localhost:3001)
              docker compose → Postgres (5433), Redis (6379), OTP (8081)
```

Le tunnel n'expose **que** l'API (3001). Postgres/Redis/OTP restent internes. Le
géocodage IGN et les tuiles OSM sont appelés directement par le navigateur (publics).

---

## ⚠️ État actuel : le site en ligne n'a pas les dernières fonctionnalités

Détail complet, arguments et pistes déjà épuisées :
[`incident-deploiement-vercel.md`](prepa-oral/incident-deploiement-vercel.md).

Résumé : `pnpm install` échoue systématiquement sur l'infra de build Vercel (bug
externe, ticket support ouvert, jamais reproduit en local). Le site en ligne est donc
figé à un ancien commit et **n'a pas** : tri/filtre des résultats, détail
ligne/direction/arrêts, restauration du dernier trajet, le fix de chargement différé
de la carte, ni la page Profil. Toutes ces fonctionnalités sont testées et
fonctionnelles **en local uniquement**.

D'où la section ci-dessous : faire tourner les deux **en même temps** pendant l'oral,
et basculer d'un onglet à l'autre selon la fonctionnalité à montrer.

---

## Setup unique (déjà fait — pour mémoire, à ne pas refaire)

- **Vercel → Settings** : Root Directory = `apps/web`, Framework = **Next.js**,
  « Include files outside the root directory » = **Enabled**.
- Correctif build monorepo appliqué (`next.config.ts`).
- **cloudflared** installé (`winget install --id Cloudflare.cloudflared`).
- **CORS** : `CORS_ORIGIN` dans le `.env` **local** accepte une liste séparée par des
  virgules (`apps/api/src/config/env.validation.ts` + `main.ts`) — nécessaire
  puisque le même backend doit maintenant répondre à **deux origines** (le site
  Vercel **et** le front local, voir section suivante) :
  ```
  CORS_ORIGIN=http://localhost:3000,https://urban-flow-mobility.vercel.app
  ```
  > ⚠️ Ce support multi-origines vit sur la branche `fix/cors-multi-origin`, pas
  > encore fusionnée dans `main` au moment d'écrire ces lignes. **Vérifier qu'elle
  > est mergée avant le jour J** — sans elle, `CORS_ORIGIN` n'accepte qu'une seule
  > valeur, et l'un des deux fronts (local ou Vercel) sera bloqué par CORS.

---

## Faire tourner local + en ligne en même temps (recommandé pour l'oral)

Le tunnel Cloudflare et la démo locale utilisent **le même backend** — pas besoin de
deux instances, ni de deux bases de données. On lance tout une seule fois, et les deux
fronts (local et Vercel) tapent dessus en parallèle.

### 1. Backend + Docker (comme d'habitude)
```powershell
pnpm db:up
docker ps        # attendre postgres / redis / otp en "healthy" (OTP ~30-60 s)
pnpm --filter ./apps/api start:dev
# attendre : "Nest application successfully started"
```

### 2. Front local (nouveau terminal)
```powershell
pnpm --filter web dev
```
→ `http://localhost:3000`. Garde cet onglet pour tout ce qui n'est **pas** en ligne
(voir tableau plus bas).

### 3. Tunnel (nouveau terminal — PowerShell classique, pas celui de VS Code)
```powershell
cloudflared tunnel --url http://localhost:3001
```
→ note l'URL affichée : `https://<mots>.trycloudflare.com`. Laisse ce terminal
ouvert : si tu le fermes, l'URL meurt et le site en ligne perd son backend.

### 4. Pointer le front Vercel vers le tunnel
- **Vercel → Settings → Environment Variables** → `NEXT_PUBLIC_API_URL`
  - Valeur = `https://<mots>.trycloudflare.com/api/v1` (⚠️ avec `/api/v1` au bout)
  - Type = **Config** (pas « Secret » : injectée dans le code du navigateur, donc
    déjà publique)
- **Deployments** → la ligne `main` · `Production` · `Ready` → **⋯ → Redeploy**
  → **décoche** « Use existing Build Cache » → confirmer.

### 5. Vérifier les deux
- Onglet **en ligne** (`urban-flow-mobility.vercel.app`) : connexion, planifier un
  trajet, tableau de bord carbone.
- Onglet **local** (`localhost:3000`) : pareil, **et en plus** tri/filtre, détail
  d'itinéraire, page Profil.

### Qui montre quoi
| Fonctionnalité | Onglet |
| :--- | :--- |
| Inscription / connexion | en ligne **ou** local (les deux marchent) |
| Planifier un trajet, dashboard carbone | en ligne **ou** local |
| Tri/filtre des résultats | **local uniquement** |
| Détail ligne/direction/arrêts | **local uniquement** |
| Restauration du dernier trajet après reconnexion | **local uniquement** |
| Carte différée (placeholder avant clic) | **local uniquement** |
| Page Profil | **local uniquement** |

Ouvrir avec l'onglet en ligne en premier (« voici un vrai déploiement qui tourne »),
puis basculer sur le local pour le reste, en assumant directement pourquoi (cf.
l'encart plus haut) plutôt que de laisser le jury deviner l'écart.

---

## Checklist finale (~15 min avant le passage)

Une fois les 5 étapes de la section précédente déroulées :
- [ ] Backend : "Nest application successfully started" dans le terminal A
- [ ] `docker ps` : postgres / redis / otp tous "healthy"
- [ ] Tunnel actif, terminal ouvert (B)
- [ ] Front local accessible sur `localhost:3000` (terminal C)
- [ ] Site en ligne redéployé avec la bonne `NEXT_PUBLIC_API_URL`, connexion +
      planification testées dessus (F12 → Réseau/Console pour repérer une erreur CORS
      ou 404 tout de suite plutôt que devant le jury)
- [ ] Filet de sécurité : si le wifi de la salle lâche, tout reste utilisable en
      local seul (le front local ne dépend pas d'Internet, juste du backend sur cette
      machine)

---

## Pièges rencontrés (déjà vécus — ne pas retomber dedans)

| Symptôme | Cause | Fix |
| :---- | :---- | :---- |
| `cloudflared n'est pas reconnu` | PATH pas rechargé | Ouvrir un **nouveau** terminal |
| Redeploy retombe en Error | Mauvaise ligne redéployée (vieux commit) | Redéployer la ligne **main / Production / Ready** |
| Vercel râle sur la variable | Type « Secret » | Passer `NEXT_PUBLIC_API_URL` en **Config** |
| 404 sur les appels API | `/api/v1` en trop ou manquant | Ajuster le suffixe de `NEXT_PUBLIC_API_URL` |
| Erreur CORS en console (local **ou** Vercel, jamais les deux à la fois) | `CORS_ORIGIN` n'a qu'une seule valeur au lieu de la liste des deux origines | `CORS_ORIGIN=http://localhost:3000,https://urban-flow-mobility.vercel.app` dans `.env` + relancer l'API |
| Connexion OK mais trajet vide | Graphe OTP non chargé | `docker logs urbanflow-otp` → `Transit loaded \|Stops\|` non nul |
| Tout marchait, puis plus rien | Tunnel redémarré → **URL changée** | Reporter la nouvelle URL dans Vercel + **redeploy** |
| Fonctionnalité visible en local mais pas sur le site Vercel | Normal, pas un bug — voir l'encart en haut de ce document | Montrer cette fonctionnalité sur l'onglet local |

---

## Après l'oral
- `Ctrl+C` dans le terminal du tunnel (l'URL `trycloudflare` meurt, normal).
- `Ctrl+C` dans le terminal du front local et celui de l'API.
- `pnpm db:down` pour arrêter les conteneurs.

## Note d'architecture (pour l'oral)

« Front déployé sur l'edge Vercel ; backend conteneurisé (Docker) exposé via un tunnel
sécurisé Cloudflare pour la démonstration ; cible de production : hébergement européen
type Scaleway, conformément à l'ADR hébergement. » — récit cohérent et mature.