# Guide de revue de code — Préparation oral (8 septembre)

> Objectif : pouvoir **expliquer chaque zone avec tes mots** et **défendre chaque
> choix** devant le jury. Ce n'est pas du par-cœur : relis les fichiers indiqués en
> te posant les questions ci-dessous, puis **entraîne-toi à répondre à voix haute**.
> Règle d'or : si tu sais expliquer _pourquoi_ un choix a été fait (pas seulement
> _ce que_ fait le code), tu as gagné. Ouvre les vrais fichiers de ton projet en
> parallèle — les noms ci-dessous sont indicatifs.

---

## ZONE 1 — L'abstraction TransportProvider & le pivot Navitia → OTP

**Fichiers à relire (module `integration`)** : les interfaces (`TransportProvider`
base + `RoutingProvider` / `TransitProvider` / `SharedMobilityProvider`), le
`ProviderRegistry`, `otp.provider.ts`, `navitia.provider.ts`, `gbfs.provider.ts`.
Réf : **ADR-005**.

### Ce que tu dois savoir expliquer

- **Le rôle de l'abstraction** : le cœur de l'appli (planificateur F2, calcul carbone)
  ne dépend **pas** d'une API précise, mais d'une **interface**. Ajouter ou remplacer
  une source = implémenter l'interface, sans toucher au reste.
- **Interfaces ségréguées (SOLID)** : un provider n'implémente que ce qu'il sait faire
  (routing, temps réel, mobilité partagée). C'est le principe de ségrégation
  d'interface — pas une grosse interface fourre-tout.
- **Le registre** : collecte les providers et les expose par capacité.
- **Le pivot** : Navitia (accès gratuit fermé en janvier 2026) → OTP auto-hébergé.
  Le `OtpRoutingProvider` implémente **la même** interface `RoutingProvider` →
  **F2 et le calcul carbone n'ont pas changé d'une ligne.** C'est LE dividende de
  l'abstraction.
- **OTP concrètement** : moteur open source, auto-hébergé en Docker, nourri du **GTFS
  STAR** (transports) + **OSM Bretagne** (voirie). On l'interroge via son **API GTFS
  GraphQL** (requête `plan`). Il fournit la **distance par tronçon** — ce qui a résolu
  le problème `distanceMeters = 0` qu'on avait avec Navitia.

### Questions probables du jury → ta réponse

- _« Pourquoi cette abstraction plutôt qu'appeler Navitia directement ? »_
  → Découplage, testabilité, et capacité à changer de fournisseur. Preuve : je l'ai
  fait pour de vrai.
- _« Qu'avez-vous dû modifier en passant à OTP ? »_
  → Uniquement ajouter le `OtpRoutingProvider` et l'enregistrer. Le planificateur et
  le carbone sont restés intacts. (Sache **montrer** que F2 n'importe pas OTP.)
- _« Comment ajouteriez-vous un nouvel opérateur (ex. un autre réseau) ? »_
  → J'implémente l'interface correspondante et je l'enregistre dans le registre.
- _« Comment testez-vous sans appeler l'API réelle ? »_
  → Le `HttpService` est mocké, avec des **fixtures** (vraies réponses capturées). Zéro
  appel réseau en CI.
- _« Pourquoi OTP et pas rester sur Navitia payant ou un autre ? »_
  → Gratuit, souverain (auto-hébergé, données open data), c'était mon **repli
  documenté** (§2.5), et il fournit la distance par tronçon.

### Pièges

- Ne prétends **pas** que le GBFS (vélos/trottinettes) est affiché dans l'UI : il est
  implémenté côté données mais **pas exposé** côté front (évolution identifiée).
- Sache dire que les **tuiles de carte** et le **géocodage IGN** sont appelés par le
  navigateur, pas par ton backend.

---

## ZONE 2 — Authentification (JWT, refresh, guards, RBAC)

**Fichiers à relire (module `auth`)** : `AuthService`, la stratégie JWT (passport-jwt),
`JwtAuthGuard`, `RolesGuard` + décorateur `@Roles`, décorateur `@CurrentUser`, l'usage
de **Redis** pour les refresh tokens, le hachage **bcrypt**.

### Ce que tu dois savoir expliquer

- **Inscription** : e-mail unique, mot de passe **≥ 12 caractères**, haché en **bcrypt
  (coût 12)**, jamais stocké en clair ni renvoyé. Token de vérification e-mail en Redis.
- **Connexion** : `bcrypt.compare` vérifie le mot de passe, puis émission d'un **access
  token** (courte durée, ~15 min) + **refresh token** (plus long, ~7 j).
- **Pourquoi deux tokens** : l'access court limite la fenêtre d'exposition s'il fuite ;
  le refresh permet de renouveler **et** d'être **révoqué**.
- **Révocation** : le refresh token est suivi dans **Redis** ; `logout` le supprime ;
  `refresh` vérifie sa présence avant d'émettre un nouvel access.
- **Guards** : un _Guard_ NestJS intercepte la requête **avant** le contrôleur et
  autorise ou non. `JwtAuthGuard` valide le token et attache l'utilisateur ;
  `RolesGuard` vérifie le rôle (`citizen` / `premium` / `admin`) — c'est le **RBAC**.
- **`@CurrentUser`** : l'utilisateur vient **toujours du JWT vérifié**, jamais d'un ID
  fourni par le client. → la faille **IDOR est structurellement impossible**, pas juste
  gardée. (Argument fort.)
- **Rate limiting** (`@nestjs/throttler`) sur `login`/`register` (anti-brute-force).
- **Messages d'erreur génériques** : ne pas révéler si c'est l'e-mail ou le mot de
  passe qui est faux.

### Questions probables du jury → ta réponse

- _« Différence entre access token et refresh token ? »_ → durée de vie + rôle
  (accès court vs renouvellement révocable). Voir ci-dessus.
- _« Comment révoquez-vous un token ? »_ → suppression du refresh en Redis.
- _« Où stockez-vous le token côté front ? »_ → **en mémoire** (état React), pas en
  localStorage — pour limiter le risque XSS. (Sache dire que le durcissement idéal
  serait des cookies httpOnly.)
- _« Comment empêchez-vous un utilisateur d'accéder aux données d'un autre ? »_
  → `@CurrentUser` depuis le JWT, jamais d'ID client → IDOR impossible par conception.
  Testé (deux utilisateurs, « appartenance stricte »).
- _« Pourquoi bcrypt et pas un hash classique (SHA-256) ? »_ → bcrypt est **lent et
  salé** par conception, donc résistant au brute-force ; le coût 12 règle cette lenteur.
- _« C'est quoi un Guard ? »_ → un intercepteur d'autorisation avant le handler.
- Mapping OWASP : **A01** (contrôle d'accès), **A07** (échecs d'authentification).

### Pièges

- **Authentification** (qui es-tu) ≠ **autorisation** (as-tu le droit) — ne les confonds
  pas.
- Ne dis pas « je chiffre les mots de passe » : ils sont **hachés** (voir Zone 3).

---

## ZONE 3 — Chiffrement, sécurité & RGPD

**Fichiers à relire** : le service de chiffrement (**AES-256-GCM**, `node:crypto`),
l'entité `mobility_profile` (domicile/travail chiffrés), la variable `ENCRYPTION_KEY`,
l'entité `carbon_log` (minimisation), `deleteAccount`, la gestion du **consentement**
géoloc, `main.ts` (**Helmet/CSP**, `ValidationPipe`).

### LE point à maîtriser absolument : hachage ≠ chiffrement

- **Hachage (bcrypt)** = **sens unique**, irréversible. Pour les **mots de passe** : on
  ne les récupère jamais, on compare des empreintes.
- **Chiffrement (AES-256-GCM)** = **réversible** avec la clé. Pour le **domicile/travail**
  qu'on doit pouvoir **réafficher** à l'utilisateur.
- Si tu ne retiens qu'une chose de cette zone, c'est **ça**. « Je hache les mots de
  passe, je chiffre le domicile/travail. »

### Ce que tu dois savoir expliquer

- **AES-256-GCM** : chiffrement symétrique **authentifié** — le mode GCM garantit à la
  fois la **confidentialité** et l'**intégrité** (détecte toute altération). Clé de 32
  octets via `ENCRYPTION_KEY` (jamais commitée), un IV par chiffrement.
- **Pourquoi chiffrer domicile/travail** : donnée personnelle sensible, jamais utilisée
  pour une requête spatiale → on la chiffre au repos (privacy-by-design).
- **Minimisation (RGPD)** : `carbon_log` n'enregistre **ni origine ni destination**,
  seulement l'empreinte agrégée + la répartition par mode.
- **Consentement** : géolocalisation **opt-in**, désactivée par défaut ; le consentement
  et sa date sont enregistrés.
- **Droit à l'effacement** : `deleteAccount` anonymise et **purge immédiatement** les
  bilans, en une opération.
- **Injections (A03)** : requêtes **paramétrées** (TypeORM) + validation des DTO
  (`class-validator`, `ValidationPipe` en `whitelist`/`forbidNonWhitelisted`).
- **Configuration (A05)** : **Helmet** actif (en-têtes durcis), CSP stricte partout,
  relâchée uniquement sur `/api/docs`.

### Questions probables du jury → ta réponse

- _« Différence entre hacher et chiffrer ? »_ → voir encadré ci-dessus. **La** question.
- _« Pourquoi GCM ? »_ → chiffrement authentifié : confidentialité **+** intégrité.
- _« Où est la clé de chiffrement ? »_ → variable d'environnement, hors du dépôt. (Sache
  dire qu'en production réelle, un gestionnaire de secrets / KMS serait plus robuste.)
- _« Si on vole votre base de données, qu'est-ce qui est exposé ? »_ → les mots de passe
  sont hachés (bcrypt), le domicile/travail chiffrés (inutilisables sans la clé) →
  exposition limitée.
- _« Comment respectez-vous le RGPD ? »_ → minimisation, consentement explicite, droit à
  l'effacement (suppression immédiate), chiffrement des données sensibles.
- _« Comment évitez-vous les injections SQL ? »_ → requêtes paramétrées + validation des
  entrées.
- Mapping OWASP : **A02** (crypto), **A03** (injection), **A05** (config).

### Pièges

- Ne jamais dire « mot de passe chiffré » → **haché**.
- Sache que la clé de chiffrement dans un `.env` est un compromis de prototype (à
  assumer), pas la solution de production idéale.

---

## Méthode de révision (d'ici le 8)

1. Pour chaque zone : **ouvre les fichiers**, relis-les avec les questions sous les yeux.
2. **Explique à voix haute** (ou à quelqu'un) chaque point, sans lire tes notes.
3. Repère les endroits où tu **hésites** → c'est là que tu creuses.
4. Prépare, pour chaque zone, **une phrase de synthèse** que tu sors avec assurance.
5. Bonus : sache **naviguer** dans ton code (retrouver vite un fichier) — un jury
   apprécie quand tu ouvres directement le bon fichier.

Objectif final : que le jury reparte convaincu que **c'est ton projet, que tu le
comprends de bout en bout**, et que chaque choix technique est le tien.
EOF
