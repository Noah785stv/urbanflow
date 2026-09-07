# Runbook de démo — UrbanFlow Mobility

Mode d'emploi pour présenter la solution le jour de l'oral. Le site en ligne a été bloqué plusieurs jours par deux bugs successifs et distincts sur l'infra de build Vercel (détail complet et démarche de diagnostic dans [incident-deploiement-vercel.md](prepa-oral/incident-deploiement-vercel.md) — utile pour répondre au jury si la question vient). Solution retenue : le front est déployé sur Netlify à la place (urban-flow-mobility.netlify.app), qui build sans problème le même code — preuve supplémentaire que le bug était bien côté infra Vercel, pas côté projet. Le backend reste local, exposé via un tunnel Cloudflare (cloudflared) pendant la démo.

---

## Architecture (démo en ligne, front Netlify + API locale via tunnel)

```
Ton navigateur
Front Next.js (urban-flow-mobility.netlify.app)
Tunnel Cloudflare (https://<sous-domaine>.trycloudflare.com/api/v1)
API NestJS (localhost:3001)
docker compose vers Postgres (5433), Redis (6379), OTP (8081)
```

Le géocodage IGN et les tuiles OSM sont appelés directement par le navigateur (publics, aucune dépendance à un hébergement quelconque).

Une démo 100% locale (front sur localhost:3000) reste possible en secours, voir l'Annexe en bas de ce document.

---

## Procédure jour de l'oral (~15 min avant le passage)

### 1. Lancer Docker Desktop, puis les conteneurs

```powershell
pnpm db:up
docker ps
```

Attendre postgres / redis / otp en "healthy" (OTP ~30-60 s).

### 2. Backend

```powershell
pnpm --filter ./apps/api start:dev
```

Attendre "Nest application successfully started". Laisse ce terminal ouvert.

### 3. Tunnel Cloudflare (nouveau terminal)

```powershell
cloudflared tunnel --url http://localhost:3001
```

Note l'URL générée (https://sous-domaine.trycloudflare.com), elle change à chaque lancement de cloudflared en mode rapide (sans tunnel nommé).

### 4. Vérifier la config

Sur Netlify (Project configuration, Environment variables), NEXT_PUBLIC_API_URL doit valoir https://sous-domaine.trycloudflare.com/api/v1, à mettre à jour si l'URL du tunnel a changé, puis redéployer.

Dans le .env de l'API locale, CORS_ORIGIN doit contenir https://urban-flow-mobility.netlify.app (en plus de http://localhost:3000 si besoin de tester en local aussi). Sans ça, le préflight CORS passe mais la vraie requête est bloquée par le navigateur, symptôme déjà rencontré : connexion qui échoue silencieusement avec "Connexion impossible".

### 5. Checklist finale

Backend : "Nest application successfully started". docker ps : postgres / redis / otp tous "healthy". Tunnel Cloudflare actif, URL à jour dans NEXT_PUBLIC_API_URL sur Netlify. CORS_ORIGIN de l'API inclut bien le domaine Netlify. Site accessible sur urban-flow-mobility.netlify.app. Test à blanc : connexion, planifier un trajet (2 adresses rennaises) vers itinéraires + tracé, tri/filtre, détail d'un itinéraire, enregistrer un trajet vers tableau de bord carbone, page Profil. Filet de sécurité supplémentaire : si un souci de dernière minute empêche de lancer en direct, avoir une capture d'écran ou un enregistrement du parcours déjà testé, en secours, ou basculer sur la démo 100% locale (voir Annexe).

---

## Pièges rencontrés (déjà vécus, ne pas retomber dedans)

Symptôme : Config validation error CORS_ORIGIN must be a valid uri. Cause : ancien format CORS_ORIGIN avant le fix multi-origines, ou dossier de travail sur une branche qui ne l'a pas. Fix : vérifier git log a bien fix(api): support multiple CORS origins, sinon CORS_ORIGIN=http://localhost:3000 suffit seul en local pur.

Symptôme : Connexion OK mais trajet vide. Cause : graphe OTP non chargé. Fix : docker logs urbanflow-otp, chercher Transit loaded Stops non nul.

Symptôme : Docker Desktop pas lancé. Cause : oubli, ou machine en veille depuis la dernière session. Fix : relancer Docker Desktop, attendre qu'il soit prêt avant pnpm db:up.

Symptôme : Connexion impossible depuis le site en ligne alors que l'API locale et le tunnel tournent. Cause : CORS_ORIGIN de l'API locale ne contient pas le domaine du front en ligne (ex. encore l'ancien domaine Vercel après bascule vers Netlify). Le préflight OPTIONS répond 204 mais la vraie requête est bloquée côté navigateur, sans erreur explicite pour l'utilisateur. Fix : ajouter le domaine exact du front (https://urban-flow-mobility.netlify.app) à CORS_ORIGIN et redémarrer l'API.

---

## Après l'oral

Ctrl+C dans le terminal du front et celui de l'API. pnpm db:down pour arrêter les conteneurs.

## Note d'architecture (pour l'oral)

Le front est déployé sur Netlify (edge) et le backend pour un hébergement européen conteneurisé (cible ADR hébergement). L'architecture est prête pour ça et tourne en ligne. Le point notable pour la soutenance : un bug d'infrastructure sur Vercel (documenté et diagnostiqué méthodiquement, voir le document d'incident) a nécessité de basculer le déploiement front sur Netlify quelques jours avant l'oral, sans changement de code applicatif.

---

## Annexe — procédure 100% locale (secours)

À utiliser si le tunnel Cloudflare, Netlify, ou la connexion internet posent problème le jour J.

```powershell
pnpm db:up
docker ps
pnpm --filter ./apps/api start:dev
```

Dans un nouveau terminal :

```powershell
pnpm --filter web dev
```

Puis ouvrir http://localhost:3000. Vérifier que CORS_ORIGIN contient au minimum http://localhost:3000 dans le .env de l'API.
