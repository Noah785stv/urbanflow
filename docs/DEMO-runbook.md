# Runbook de démo — UrbanFlow Mobility

> Mode d'emploi pour présenter la solution le jour de l'oral : **en local**,
> intégralement. Le site en ligne (Vercel) ne peut plus être redéployé depuis
> plusieurs jours (deux bugs distincts et successifs sur leur infra de build,
> détail complet et démarche de diagnostic dans
> [`incident-deploiement-vercel.md`](prepa-oral/incident-deploiement-vercel.md)
> — utile pour répondre au jury si la question vient). Le site déjà en ligne
> reste figé à un ancien état (avant les fonctionnalités récentes) et n'est
> **pas** utilisé pour la démo.

---

## Architecture (locale)

```
Ton navigateur
      │
      ▼
Front Next.js (localhost:3000)
      │ appels API
      ▼
API NestJS (localhost:3001)
      │
      ▼
docker compose → Postgres (5433), Redis (6379), OTP (8081)
```

Le géocodage IGN et les tuiles OSM sont appelés directement par le navigateur
(publics, aucune dépendance à un hébergement quelconque).

---

## Procédure — jour de l'oral (~15 min avant le passage)

### 1. Lancer Docker Desktop, puis les conteneurs

```powershell
pnpm db:up
docker ps        # attendre postgres / redis / otp en "healthy" (OTP ~30-60 s)
```

### 2. Backend

```powershell
pnpm --filter ./apps/api start:dev
# attendre : "Nest application successfully started"
```

Laisse ce terminal ouvert.

### 3. Front (nouveau terminal)

```powershell
pnpm --filter web dev
```

→ `http://localhost:3000`.

### 4. Vérifier `.env`

`CORS_ORIGIN` doit au minimum contenir `http://localhost:3000`. Pas besoin de
liste multi-origines pour une démo 100 % locale (ça, c'était pour le plan
hybride local+en ligne, abandonné avec le site en ligne).

### 5. Checklist finale

- [ ] Backend : "Nest application successfully started"
- [ ] `docker ps` : postgres / redis / otp tous "healthy"
- [ ] Front accessible sur `localhost:3000`
- [ ] Test à blanc : connexion, planifier un trajet (2 adresses rennaises) →
      itinéraires + tracé, tri/filtre, détail d'un itinéraire, enregistrer un
      trajet → tableau de bord carbone, page Profil
- [ ] Filet de sécurité supplémentaire : si un souci de dernière minute
      empêche de lancer en direct, avoir une capture d'écran ou un
      enregistrement du parcours déjà testé, en secours

---

## Pièges rencontrés (déjà vécus — ne pas retomber dedans)

| Symptôme                                                           | Cause                                                                                                         | Fix                                                                                                                                      |
| :----------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------ | :--------------------------------------------------------------------------------------------------------------------------------------- |
| API : `Config validation error: "CORS_ORIGIN" must be a valid uri` | Ancien format `CORS_ORIGIN` avant le fix multi-origines, ou dossier de travail sur une branche qui ne l'a pas | Vérifier `git log` a bien `fix(api): support multiple CORS origins` ; sinon `CORS_ORIGIN=http://localhost:3000` suffit seul en local pur |
| Connexion OK mais trajet vide                                      | Graphe OTP non chargé                                                                                         | `docker logs urbanflow-otp` → `Transit loaded \|Stops\|` non nul                                                                         |
| Docker Desktop pas lancé                                           | Oubli, ou machine en veille depuis la dernière session                                                        | Relancer Docker Desktop, attendre qu'il soit prêt avant `pnpm db:up`                                                                     |

---

## Après l'oral

- `Ctrl+C` dans le terminal du front et celui de l'API.
- `pnpm db:down` pour arrêter les conteneurs.

## Note d'architecture (pour l'oral)

« Le front est prévu pour un déploiement Vercel edge et le backend pour un
hébergement européen conteneurisé (cible ADR hébergement) — l'architecture
est prête pour ça et a déjà tourné en ligne. La démonstration du jour se fait
en local suite à un incident d'infrastructure côté Vercel, documenté et
diagnostiqué méthodiquement (voir le document d'incident). » — assume le
sujet directement, ne le laisse pas deviner.

---

## Annexe — procédure en ligne (hors service depuis le 6-7 septembre)

Conservée pour mémoire / si le bug Vercel venait à se résoudre plus tard.
**Ne pas essayer de dérouler ça pour la soutenance** sans avoir d'abord
vérifié qu'un déploiement récent construit à nouveau (voir le document
d'incident pour le dernier statut connu).

Architecture prévue : front sur Vercel, backend exposé par un tunnel
Cloudflare gratuit vers la machine locale.

```powershell
pnpm db:up && docker ps
pnpm --filter ./apps/api start:dev
cloudflared tunnel --url http://localhost:3001    # terminal séparé, PowerShell classique
```

Puis dans Vercel : `NEXT_PUBLIC_API_URL` = `https://<tunnel>.trycloudflare.com/api/v1`
(type Config), et `CORS_ORIGIN` local sur
`http://localhost:3000,https://urban-flow-mobility.vercel.app` — puis
redéployer la ligne `main` / `Production` / `Ready` sans cache.
