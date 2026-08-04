# F1 — Inscription, connexion & profil mobilité

> Spécification d'implémentation. À lire avec `CLAUDE.md` (stack, conventions,
> Definition of Done), qui reste la source de vérité opérationnelle.
> Références dossier : §4.4 (F1), §5.3 (modèle de données), §5.7 (sécurité OWASP).

## 1. Objectif

Permettre à un citoyen de créer un compte, de se connecter de façon sécurisée, et
de gérer un profil de mobilité personnalisé. C'est le module socle : toute
personnalisation ultérieure (planificateur F2, calculateur carbone F4) en dépend.

## 2. Périmètre de l'incrément

**Inclus (F1) :**
- Inscription avec e-mail + mot de passe, vérification d'e-mail.
- Connexion (JWT access + refresh), rafraîchissement, déconnexion.
- RBAC minimal (rôles `citizen`, `premium`, `admin`).
- Profil de mobilité : modes préférés, contraintes (PMR, vélo perso), abonnements,
  domicile/travail (chiffrés), consentement géolocalisation.
- Suppression de compte (RGPD).
- Rate limiting sur les routes d'authentification.

**Reporté (hors F1, à tracer dans la roadmap) :**
- Double authentification (MFA) — prévue mais non implémentée dans cet incrément.
- OAuth France Connect — V2 (cf. §4.4).
- Envoi d'e-mail réel — en F1, le lien de vérification est journalisé (console) en
  dev ; l'intégration d'un fournisseur d'e-mail est un incrément séparé.
- Job de purge à 30 jours — la suppression marque le compte ; le cron de purge
  définitive est un incrément d'exploitation séparé (voir §5.4).

## 3. User stories (§4.4)

- « En tant que citoyen, je veux créer un compte pour personnaliser mes trajets. »
- « …je veux me connecter de façon sécurisée. »
- « …je veux définir mes modes de transport préférés. »
- « …je veux supprimer mon compte et mes données (RGPD). »

## 4. Modèle de données

Tables en `snake_case`, clés primaires en UUID, timestamps `created_at` /
`updated_at`. Le mapping camelCase↔snake_case est assuré par `SnakeNamingStrategy`
(déjà configuré). En dev, `synchronize` crée les tables ; **générer une migration
TypeORM** pour ces tables fait partie de la DoD.

### 4.1 Entité `user`

| Colonne | Type | Contraintes |
| :---- | :---- | :---- |
| id | uuid | PK, généré |
| tenant_id | uuid | non nul, défaut tenant courant (multi-tenancy §5.4) |
| email | citext / varchar | unique (par tenant), non nul, normalisé en minuscules |
| password_hash | varchar | non nul (bcrypt) |
| email_verified | boolean | défaut `false` |
| role | enum `user_role` | `citizen` (défaut) \| `premium` \| `admin` |
| deleted_at | timestamptz | nullable (suppression RGPD, soft-delete) |
| created_at / updated_at | timestamptz | auto |

Relation : `user` 1—1 `mobility_profile`.

### 4.2 Entité `mobility_profile`

| Colonne | Type | Contraintes |
| :---- | :---- | :---- |
| id | uuid | PK |
| user_id | uuid | FK → user, unique, non nul |
| preferred_modes | jsonb / text[] | liste de `TransportMode` (depuis `@urbanflow/shared-types`) |
| constraints | jsonb | `{ pmr: boolean, personalBike: boolean }` |
| transport_subscriptions | text[] | libellés d'abonnements (ex. « STAR illimité ») |
| home_location_encrypted | text | nullable, chiffré (voir §4.3) |
| work_location_encrypted | text | nullable, chiffré (voir §4.3) |
| geolocation_consent | boolean | défaut `false` |
| geolocation_consent_at | timestamptz | nullable |
| created_at / updated_at | timestamptz | auto |

### 4.3 Chiffrement domicile/travail (décision de conception — À SIGNALER)

Les points domicile/travail sont des données personnelles sensibles. Ils sont
**chiffrés au niveau applicatif** (AES-256-GCM, `node:crypto`, clé
`ENCRYPTION_KEY`) et stockés en texte chiffré — jamais en clair. On ne fait
**aucune** requête spatiale sur ces points (privacy-by-design + minimisation, §5.7
A02, C8).

> ⚠️ **Divergence à réconcilier avec le dossier (§5.3).** Le §5.3 présente ces
> points en `geography(POINT)` PostGIS. Or un point chiffré n'est pas requêtable
> spatialement. Décision retenue : domicile/travail en **texte chiffré** (pas de
> PostGIS) ; PostGIS/`geography(POINT)` sera introduit en **F2/F3** pour les
> stations et trajets, où les requêtes de proximité ont un sens. Conséquence :
> **F1 n'utilise pas PostGIS.** À mettre à jour dans le §5.3 après validation.

## 5. Règles métier

### 5.1 Inscription
- E-mail valide et unique (par tenant), normalisé en minuscules.
- Mot de passe **≥ 12 caractères** (validation `class-validator` sur le DTO).
- Hachage **bcrypt, cost 12** (§5.7 A02). Le mot de passe en clair ne quitte jamais
  le DTO d'entrée et n'est jamais journalisé.
- À la création : génération d'un token de vérification stocké dans Redis
  (`REDIS_CLIENT` déjà dispo), TTL 24 h ; en dev, le lien est journalisé.

### 5.2 Connexion / session
- `login` retourne un **access token** (TTL `JWT_EXPIRES_IN`, 15 min) et un
  **refresh token** (TTL `JWT_REFRESH_EXPIRES_IN`, ex. 7 j).
- Le refresh token (ou son `jti`) est suivi dans Redis pour permettre la
  révocation ; `logout` le supprime ; `refresh` vérifie sa présence.
- Messages d'erreur d'authentification **génériques** (ne pas révéler si c'est
  l'e-mail ou le mot de passe qui est faux).

### 5.3 Profil
- Le profil est créé (vide) à l'inscription, puis complété via `PATCH`.
- `preferred_modes` n'accepte que des valeurs de l'enum `TransportMode`.
- Écrire un point domicile/travail exige `geolocation_consent = true`
  (horodaté dans `geolocation_consent_at`).

### 5.4 Suppression de compte (RGPD)
- `DELETE /users/me` : soft-delete (`deleted_at`), anonymisation immédiate des
  données directement identifiantes, révocation des tokens.
- Un compte supprimé ne peut plus se connecter.
- La **purge définitive sous 30 j** est assurée par un job planifié (incrément
  séparé) ; F1 pose le soft-delete et l'anonymisation.

## 6. Endpoints API

Toutes les routes sous `/api/v1`, en `kebab-case` (§4.2). DTO validés par le
`ValidationPipe` global (`whitelist`, `transform`).

| Méthode | Route | Auth | Description |
| :---- | :---- | :---- | :---- |
| POST | `/api/v1/auth/register` | non | Crée un compte + profil vide, déclenche la vérif e-mail |
| POST | `/api/v1/auth/verify-email` | non | Valide l'e-mail via token |
| POST | `/api/v1/auth/login` | non | Retourne access + refresh tokens |
| POST | `/api/v1/auth/refresh` | refresh | Renouvelle l'access token |
| POST | `/api/v1/auth/logout` | oui | Révoque le refresh token |
| GET | `/api/v1/users/me` | oui | Profil de l'utilisateur courant |
| PATCH | `/api/v1/users/me` | oui | Met à jour le profil de mobilité |
| DELETE | `/api/v1/users/me` | oui | Suppression de compte (RGPD) |

Les réponses n'exposent jamais `password_hash` ni les valeurs chiffrées en clair
(utiliser un `class-transformer` / sérialisation explicite).

## 7. Sécurité (mapping OWASP §5.7)

| Risque | Mesure dans F1 |
| :---- | :---- |
| A01 Access Control | `JwtAuthGuard` + `RolesGuard` (+ `@Roles()`), accès `me` limité au propriétaire |
| A02 Cryptographic | bcrypt cost 12 ; AES-256-GCM pour domicile/travail ; secrets via env |
| A03 Injection | Requêtes paramétrées TypeORM + DTO `class-validator` |
| A05 Misconfig | Helmet + CORS déjà en place (`main.ts`) |
| A07 Auth Failures | Politique de mot de passe, rate limiting (`@nestjs/throttler`) sur `register`/`login`, erreurs génériques |

## 8. Configuration & dépendances

**Nouvelles dépendances** (à ajouter sur `apps/api`) :
```
@nestjs/jwt @nestjs/passport passport passport-jwt @nestjs/throttler bcrypt @urbanflow/shared-types@workspace:*
```
Dev : `@types/passport-jwt @types/bcrypt`.

**Nouvelles variables d'environnement** (à ajouter dans `.env`, `.env.example`
et le schéma `env.validation.ts`) :
```
JWT_REFRESH_SECRET=...              # openssl rand -base64 32
JWT_REFRESH_EXPIRES_IN=7d
ENCRYPTION_KEY=...                  # 32 octets base64 : openssl rand -base64 32
```

## 9. Critères d'acceptation (§4.4)

- [ ] Un utilisateur peut s'inscrire, vérifier son e-mail, puis se connecter.
- [ ] Le mot de passe est refusé s'il fait < 12 caractères.
- [ ] `login` échoue avec un message générique si identifiants invalides.
- [ ] `GET /users/me` renvoie le profil ; un autre utilisateur ne peut pas y accéder.
- [ ] Le profil accepte uniquement des `TransportMode` valides.
- [ ] Domicile/travail ne sont écrits qu'avec consentement, et jamais stockés en clair.
- [ ] `DELETE /users/me` empêche toute reconnexion ultérieure.
- [ ] Aucune réponse n'expose `password_hash`.

## 10. Tests attendus (§6.1, DoD §6.5)

- **Unitaires** : `AuthService` (hachage/vérif bcrypt, génération/validation JWT),
  service de chiffrement (aller-retour AES + échec sur clé absente), validateur de
  politique de mot de passe.
- **Guards** : `JwtAuthGuard` et `RolesGuard` systématiquement testés (couvre A01).
- **Intégration (Supertest)** : parcours nominal register → verify → login → me →
  patch → delete, plus les cas d'erreur clés (e-mail dupliqué, mauvais mot de passe,
  accès `me` sans token, accès au profil d'autrui).
- **Couverture ≥ 70 %** sur les modules touchés (seuil CI).

## 11. Ordre d'implémentation suggéré

1. Ajouter dépendances + variables d'env (+ schéma de validation).
2. Entités `user` et `mobility_profile` + enum `user_role` + migration.
3. Service de chiffrement (AES-256-GCM) + tests unitaires.
4. Module Auth : DTO validés, `AuthService` (bcrypt, JWT access/refresh via Redis),
   stratégie/guards Passport, `RolesGuard`.
5. Contrôleurs `auth` et `users` + sérialisation excluant les champs sensibles.
6. Rate limiting sur `auth`.
7. Tests d'intégration des parcours.
8. Vérifier la DoD (§6.5) avant clôture.

## 12. Points à signaler pendant l'implémentation

- La divergence PostGIS/chiffrement du §4.3 (à répercuter dans le dossier §5.3).
- MFA et France Connect explicitement hors périmètre F1.
- Si une contrainte rend une règle infaisable telle quelle, le signaler et
  synchroniser cette spec + le dossier (règle de travail n°2).