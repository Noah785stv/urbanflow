# @urbanflow/api

Backend NestJS d'UrbanFlow Mobility — monolithe modulaire (voir `CLAUDE.md` à la
racine du monorepo pour la stack, les conventions et la Definition of Done).

## Prérequis

- Node.js ≥ 20, pnpm ≥ 9
- Docker (Postgres + Redis via `docker-compose.yml` à la racine)

## Mise en route

```bash
# à la racine du monorepo
pnpm install
pnpm db:up               # démarre Postgres (PostGIS) + Redis
cp .env.example .env     # puis renseigner les secrets (voir tableau ci-dessous)

# apps/api
pnpm migration:run        # applique le schéma (tables user, mobility_profile…)
pnpm start:dev             # démarre l'API en mode watch — http://localhost:3001/api/v1
```

## Commandes

| Commande                                       | Description                                                         |
| :--------------------------------------------- | :------------------------------------------------------------------ |
| `pnpm start:dev`                               | API en mode watch                                                   |
| `pnpm build` / `pnpm start:prod`               | Build puis exécution du build compilé                               |
| `pnpm lint`                                    | ESLint (flat config, corrige automatiquement)                       |
| `pnpm typecheck`                               | Vérification TypeScript stricte, sans émission                      |
| `pnpm test`                                    | Tests unitaires (Jest)                                              |
| `pnpm test:cov`                                | Tests unitaires + rapport de couverture                             |
| `pnpm test:e2e`                                | Tests d'intégration (Supertest) — nécessite Postgres/Redis démarrés |
| `pnpm migration:generate <chemin>`             | Génère une migration TypeORM à partir des entités                   |
| `pnpm migration:run` / `pnpm migration:revert` | Applique / annule les migrations                                    |

## Variables d'environnement

Définies et validées (Joi, fail-fast au démarrage) dans `src/config/env.validation.ts`.

| Variable                                        | Description                                                         |
| :---------------------------------------------- | :------------------------------------------------------------------ |
| `NODE_ENV`                                      | `development` \| `test` \| `production`                             |
| `API_PORT`                                      | Port HTTP de l'API (défaut `3001`)                                  |
| `DATABASE_URL`                                  | URL de connexion PostgreSQL                                         |
| `REDIS_URL`                                     | URL de connexion Redis (sessions, tokens, cache)                    |
| `JWT_SECRET` / `JWT_EXPIRES_IN`                 | Secret et durée de vie de l'access token (défaut `15m`)             |
| `JWT_REFRESH_SECRET` / `JWT_REFRESH_EXPIRES_IN` | Secret et durée de vie du refresh token (défaut `7d`)               |
| `ENCRYPTION_KEY`                                | Clé AES-256-GCM (32 octets, base64) — chiffrement domicile/travail  |
| `CORS_ORIGIN`                                   | Origine autorisée pour le front (défaut `http://localhost:3000`)    |
| `NAVITIA_API_KEY`                               | Clé API navitia.io                                                  |
| `NAVITIA_BASE_URL`                              | URL de base Navitia (défaut `https://api.navitia.io/v1`)            |
| `NAVITIA_COVERAGE`                              | Région de couverture Navitia — **à confirmer contre la doc à jour** |
| `GBFS_FEED_URLS`                                | Liste JSON des URLs d'auto-découverte `gbfs.json` par opérateur     |

Génération de secrets : `openssl rand -base64 32`.

## Module Auth & Users (F1)

Implémente l'inscription, la connexion sécurisée et le profil de mobilité
(spec : `docs/specs/F1-auth.md`). Toutes les routes sont sous `/api/v1`.

| Méthode | Route                       | Auth                 | Description                                                             |
| :------ | :-------------------------- | :------------------- | :---------------------------------------------------------------------- |
| POST    | `/api/v1/auth/register`     | —                    | Crée un compte + profil vide, journalise le lien de vérification (dev)  |
| POST    | `/api/v1/auth/verify-email` | —                    | Valide l'e-mail via le token reçu                                       |
| POST    | `/api/v1/auth/login`        | —                    | Retourne `{ accessToken, refreshToken }` (échoue si e-mail non vérifié) |
| POST    | `/api/v1/auth/refresh`      | Bearer refresh token | Émet un nouvel access token                                             |
| POST    | `/api/v1/auth/logout`       | Bearer access token  | Révoque le refresh token courant                                        |
| GET     | `/api/v1/users/me`          | Bearer access token  | Profil de l'utilisateur courant                                         |
| PATCH   | `/api/v1/users/me`          | Bearer access token  | Met à jour le profil de mobilité                                        |
| DELETE  | `/api/v1/users/me`          | Bearer access token  | Suppression de compte (RGPD, soft-delete + anonymisation)               |

### Points clés de sécurité (§5.7)

- Mots de passe hachés en **bcrypt, cost 12** ; jamais journalisés ni renvoyés.
- **JWT access (15 min) + refresh (7 j)** signés séparément ; le refresh token
  courant est suivi dans Redis (`auth:refresh:<userId>`) pour permettre la
  révocation immédiate (`logout`, suppression de compte).
- **Rate limiting** (`@nestjs/throttler`) sur `register` et `login`.
- Messages d'erreur d'authentification **génériques** (e-mail/mot de passe
  jamais distingués).
- Domicile/travail chiffrés en **AES-256-GCM** au niveau applicatif (jamais en
  clair, jamais requêtés spatialement — voir divergence documentée dans
  `CLAUDE.md` §Modèle de données et `docs/specs/F1-auth.md` §4.3).
- `GET/PATCH/DELETE /users/me` dérivent systématiquement l'utilisateur du JWT
  (`request.user.sub`) — aucun paramètre de route, donc aucun accès possible
  au profil d'un tiers par construction.

### Hors périmètre F1 (voir spec §2)

MFA, OAuth France Connect, envoi d'e-mail réel (lien journalisé en console en
dev) et job de purge RGPD à 30 j sont des incréments séparés, non implémentés
ici.

## Module Integration & Transport (F3)

Abstraction `TransportProvider` (GBFS, Navitia) derrière un `ProviderRegistry`
(spec : `docs/specs/F3-integration.md`). C'est le **seul** point de contact
avec les APIs de transport externes.

| Méthode | Route                          | Auth                | Description                                                                                      |
| :------ | :----------------------------- | :------------------ | :----------------------------------------------------------------------------------------------- |
| GET     | `/api/v1/stations/nearby`      | Bearer access token | Stations à proximité (PostGIS `ST_DWithin`), triées par distance, enrichies du statut temps réel |
| GET     | `/api/v1/stops/:id/departures` | Bearer access token | Prochains passages à un arrêt (mode dégradé si la source est HS)                                 |

`stations/nearby` prend `lat`, `lng` (obligatoires) et `radius` en mètres
(optionnel, 50–2000, défaut 500).

### Points clés (§5, §7, §9)

- **`TransportProvider`** : interfaces ségréguées (`SharedMobilityProvider`,
  `TransitProvider`, `RoutingProvider`) — ajouter un opérateur = implémenter
  l'interface adéquate et l'enregistrer dans `IntegrationModule`, sans toucher
  au reste.
- **Cache dégradé** (`DegradedCacheService`, générique et réutilisable) :
  fenêtre de fraîcheur ≤ 60 s pour les données temps réel, TTL Redis plus long
  en filet de secours — en cas de panne d'une source, la dernière valeur
  connue est servie (`stale: true`) ; sans historique, une réponse vide
  explicitement signalée est renvoyée. **Aucune panne externe ne bloque
  l'API.**
- **Synchronisation périodique** (`@nestjs/schedule`, toutes les 10 min) pour
  l'inventaire des stations GBFS (`station_information`, PostGIS) — les
  disponibilités temps réel sont rafraîchies à la demande, pas par le
  scheduler.
- **Liste blanche SSRF (A10)** : seuls `NAVITIA_BASE_URL` et les hôtes dérivés
  de `GBFS_FEED_URLS` sont appelés ; les sous-flux découverts via `gbfs.json`
  sont vérifiés contre l'hôte de découverte configuré.

### Hors périmètre F3 (voir spec §2, §14)

GTFS-RT (positions temps réel via protobuf) est reporté — traité en second
temps une fois GBFS et Navitia stabilisés. L'endpoint planificateur
(comparaison de plusieurs itinéraires) appartient à F2 ; F3 fournit
uniquement `RoutingProvider.getJourneys` comme brique brute, sans endpoint
dédié.

**Simplification assumée** : les stations GBFS sont toutes typées
`StationType.Dock` (GBFS ne distingue le véhicule qu'au niveau de
`vehicle_types.json`, hors périmètre de ce premier incrément). Le mapping des
modes Navitia (`NAVITIA_MODE_MAP`) et le calcul de distance par tronçon
d'itinéraire (`distanceMeters`) sont des approximations à affiner avec un
échantillon réel de réponse Navitia (F2).

### OpenAPI

Non généré automatiquement pour cet incrément (pas de `@nestjs/swagger` dans
les dépendances approuvées — voir `docs/specs/F1-auth.md` §8). Les tableaux
ci-dessus font référence tant qu'une génération OpenAPI n'est pas mise en
place.
