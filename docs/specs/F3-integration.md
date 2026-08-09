# F3 — Intégration des APIs transport

> Spécification d'implémentation. À lire avec `CLAUDE.md` (stack, conventions,
> Definition of Done), qui reste la source de vérité opérationnelle.
> Références dossier : §4.6 (F3), §5.4 (abstraction `TransportProvider`),
> §5.3 (modèle de données), §2.5 (Arbitrage 5 : Navitia), §6.1.1 (tests via mocks).

## 1. Objectif

Fournir une couche d'intégration unique vers les sources de mobilité externes
(transport public, vélos/trottinettes partagés, temps réel), derrière une
**abstraction commune**. C'est le module qui **alimente F2** (planificateur) : il
expose des données normalisées et résilientes, sans que le reste du code ne
connaisse les APIs sous-jacentes.

## 2. Périmètre de l'incrément

**Inclus (F3) :**

- Abstraction `TransportProvider` (interfaces ségréguées) + registre de providers.
- Provider **GBFS** : inventaire des stations vélos/trottinettes (statique →
  PostGIS) + disponibilités temps réel (→ Redis).
- Provider **Navitia** : prochains passages à un arrêt + méthode de routing
  (`getJourneys`) réutilisée par F2.
- Recherche de stations **à proximité** via PostGIS (`ST_DWithin`).
- Cache Redis avec TTL par type de donnée + **mode dégradé** (tolérance aux pannes).
- Endpoints exposant stations à proximité et prochains passages.

**Phasé / reporté (à tracer) :**

- Provider **GTFS-RT** (positions/passages temps réel via protobuf) : plus complexe
  (décodage `gtfs-realtime-bindings`) — implémentable en second temps dans F3.
- L'**endpoint planificateur** (3 options, filtres, comparaison) appartient à **F2**.
  F3 fournit uniquement la brique routing brute que F2 orchestrera.
- NeTEx / SIRI : standards visés pour l'interopérabilité long terme (C9), non
  intégrés dans cet incrément.

## 3. User stories

- « En tant que citoyen, je veux voir les vélos/trottinettes disponibles près de
  moi en temps réel. »
- « …je veux voir les prochains passages à un arrêt. »
- (Technique) « En tant que système, je veux continuer à répondre même si une source
  externe est en panne, en servant la dernière donnée connue. »

## 4. Modèle de données

### 4.1 Entité `station` (statique → PostgreSQL/PostGIS)

Les informations de station changent rarement : on les **persiste**. PostGIS entre
ici pour les requêtes de proximité (résout la note laissée en F1 ; concrétise le
choix TypeORM+PostGIS, ADR-004).

| Colonne                 | Type                    | Contraintes                                     |
| :---------------------- | :---------------------- | :---------------------------------------------- |
| id                      | uuid                    | PK                                              |
| tenant_id               | uuid                    | non nul                                         |
| provider                | varchar                 | ex. `gbfs:velostar`, `navitia`                  |
| external_id             | varchar                 | identifiant de la station chez la source        |
| name                    | varchar                 | non nul                                         |
| station_type            | enum                    | `bike` \| `scooter` \| `dock` \| `transit_stop` |
| location                | `geography(Point,4326)` | non nul, index **GiST** (PostGIS)               |
| capacity                | int                     | nullable                                        |
| created_at / updated_at | timestamptz             | auto                                            |

Contrainte d'unicité : `(provider, external_id)`. Extension à activer par
migration : `CREATE EXTENSION IF NOT EXISTS postgis;`.

### 4.2 Statut temps réel (volatil → Redis, pas de persistance)

Les disponibilités changent en permanence : elles vivent **en cache**, pas en base.

- Clé : `station-status:{provider}:{external_id}`
- Valeur : `{ bikesAvailable, docksAvailable, updatedAt, stale }`
- TTL : court (**≤ 60 s**, cf. critère d'acceptation §4.6).

## 5. Abstraction `TransportProvider` (cœur architectural §5.4)

Interfaces **ségréguées** (principe SOLID d'interface) : chaque provider
n'implémente que ce qu'il sait faire. Ajouter un opérateur = implémenter l'interface
adéquate et l'enregistrer, **sans toucher au cœur**.

```
TransportProvider (base)     : id, modes: TransportMode[], isAvailable(): Promise<boolean>
  ├─ SharedMobilityProvider  : syncStations(), getStationStatus(externalIds[])
  ├─ TransitProvider         : getDepartures(stopId)
  └─ RoutingProvider         : getJourneys(query)   // consommé par F2
```

Un `ProviderRegistry` (injecté) collecte les providers enregistrés et les expose
par capacité/mode. Les types de données échangés (`Station`, `StationStatus`,
`Departure`, `JourneyOption`) sont définis dans `@urbanflow/shared-types` pour être
partagés avec le front et F2.

## 6. Sources & standards

| Source                     | Standard             | Rôle dans F3                        |
| :------------------------- | :------------------- | :---------------------------------- |
| Navitia (`api.navitia.io`) | agrège GTFS national | prochains passages + routing (F2)   |
| Feeds GBFS opérateurs      | GBFS                 | stations + dispo vélos/trottinettes |
| Flux opérateur temps réel  | GTFS-RT              | passages temps réel (phasé)         |

> Consulter la **documentation Navitia et la spec GBFS à jour** au moment de
> l'implémentation (formats de requête/réponse, région de couverture). Vérifier que
> la couverture Navitia inclut bien le territoire de référence (réseau STAR).

## 7. Cache & mode dégradé (C10, §2.6)

- **Cache Redis par type**, TTL adapté : stations statiques rafraîchies par sync
  périodique (long) ; statuts et passages temps réel en cache court (≤ 60 s).
- **Mode dégradé** : chaque appel externe passe par un wrapper qui, en cas d'échec
  ou d'indisponibilité (`isAvailable()` faux) :
  - sert la **dernière valeur connue** en cache, marquée `stale: true` + `updatedAt` ;
  - à défaut de cache, renvoie une réponse vide explicitement signalée comme dégradée ;
  - **n'échoue jamais globalement** : la panne d'une source ne bloque pas les autres
    (critère §4.6).

## 8. Endpoints API

Sous `/api/v1`, `kebab-case`, DTO validés (`ValidationPipe` global).

| Méthode | Route                                       | Auth | Description                                                                        |
| :------ | :------------------------------------------ | :--- | :--------------------------------------------------------------------------------- |
| GET     | `/api/v1/stations/nearby?lat=&lng=&radius=` | oui  | Stations à proximité (PostGIS `ST_DWithin`) enrichies du statut temps réel (Redis) |
| GET     | `/api/v1/stops/:id/departures`              | oui  | Prochains passages à un arrêt (temps réel, mode dégradé si source HS)              |

Le paramètre `radius` est borné (min/max) pour éviter les requêtes abusives. Les
réponses indiquent la fraîcheur des données (`stale`, `updatedAt`).

## 9. Sécurité & contraintes

| Réf                 | Mesure dans F3                                                                                                                       |
| :------------------ | :----------------------------------------------------------------------------------------------------------------------------------- |
| A10 SSRF (§5.7)     | Appels sortants **uniquement** vers les hôtes en liste blanche (Navitia + feeds configurés) ; aucune URL contrôlée par l'utilisateur |
| A01 (§5.7)          | Endpoints protégés par `JwtAuthGuard` (réutilise F1)                                                                                 |
| Secrets             | Clé API Navitia et URLs de feeds via variables d'environnement, jamais en dur                                                        |
| C9 Interopérabilité | Respect strict de GTFS/GBFS ; abstraction prête pour NeTEx/SIRI                                                                      |
| C10 Performances    | Cache Redis, mode dégradé, requêtes spatiales indexées (GiST)                                                                        |

## 10. Configuration & dépendances

**Dépendances** (`apps/api`) :

```
@nestjs/axios axios @nestjs/schedule
```

Pour la phase GTFS-RT : `gtfs-realtime-bindings` (+ `protobufjs`).

**Variables d'environnement** (dans `.env`, `.env.example`, `env.validation.ts`) :

```
NAVITIA_API_KEY=...
NAVITIA_BASE_URL=https://api.navitia.io/v1
NAVITIA_COVERAGE=...            # région de couverture (à confirmer dans la doc)
GBFS_FEED_URLS=...              # JSON ou liste : URL d'auto-découverte gbfs.json par opérateur
GTFS_RT_FEED_URL=...            # (phase GTFS-RT)
```

## 11. Critères d'acceptation (§4.6)

- [ ] `GET /stations/nearby` renvoie les stations dans le rayon, triées par distance
      (PostGIS), avec disponibilités temps réel.
- [ ] Les disponibilités temps réel se rafraîchissent en **< 60 s**.
- [ ] Si une source externe tombe, l'API répond quand même (dernière donnée connue,
      marquée `stale`) — **aucun blocage global**.
- [ ] Ajouter un nouveau provider ne nécessite d'implémenter qu'une interface, sans
      modifier les endpoints ni le registre.
- [ ] Aucune URL externe hors liste blanche n'est appelée.

## 12. Tests attendus (§6.1.1, DoD §6.5)

- **Aucun appel réseau réel en CI.** Les APIs externes sont simulées par des
  **fixtures versionnées** (échantillons GBFS `station_information` /
  `station_status`, réponse Navitia, trame GTFS-RT décodée). Le `HttpService` est
  mocké.
- **Unitaires** : chaque provider (parsing des fixtures → types normalisés), le
  wrapper de cache (hit/miss/TTL), le **mode dégradé** (provider en échec → service
  de la valeur `stale` / réponse vide signalée).
- **Intégration** : requête de proximité PostGIS (`ST_DWithin`) contre le Postgres
  PostGIS de la CI ; parcours `stations/nearby` de bout en bout avec statuts mockés.
- **Couverture ≥ 70 %** sur les modules touchés.

## 13. Ordre d'implémentation suggéré

1. Dépendances + variables d'env (+ schéma de validation).
2. Migration : `CREATE EXTENSION postgis` + entité `station` (`geography(Point)`,
   index GiST).
3. Types partagés (`Station`, `StationStatus`, `Departure`, `JourneyOption`) dans
   `@urbanflow/shared-types`.
4. Interfaces `TransportProvider` ségréguées + `ProviderRegistry`.
5. Wrapper cache Redis + mode dégradé (générique, réutilisable par tout provider).
6. `GbfsProvider` : `syncStations` (→ PostGIS) + `getStationStatus` (→ Redis).
7. Sync périodique des stations (`@nestjs/schedule`).
8. `NavitiaProvider` : `getDepartures` + `getJourneys` (routing pour F2).
9. Endpoints `stations/nearby` (PostGIS + statut) et `stops/:id/departures`.
10. (Phase) `GtfsRtProvider` via `gtfs-realtime-bindings`.
11. Tests avec fixtures + proximité PostGIS + mode dégradé.
12. Vérifier la DoD (§6.5).

## 14. Points à signaler pendant l'implémentation

- **PostGIS entre en jeu ici** : c'est le bon moment pour valider la chaîne
  spatiale (extension, type `geography`, index GiST, `ST_DWithin`) et, si besoin,
  mettre à jour le §5.3 du dossier pour refléter que les points géospatiaux
  concernent les stations/trajets (et non plus domicile/travail, chiffrés en F1).
- **Clé API Navitia requise** : à obtenir sur navitia.io ; en CI elle n'est pas
  utilisée (tout est mocké).
- **GTFS-RT (protobuf)** est la partie la plus délicate : la traiter en second, une
  fois GBFS + Navitia stabilisés.
- Toute contrainte rendant une règle infaisable → la signaler et synchroniser cette
  spec + le dossier (règle de travail n°2).
