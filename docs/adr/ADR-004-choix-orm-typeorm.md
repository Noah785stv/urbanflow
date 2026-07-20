# ADR-004 — Choix de TypeORM comme ORM backend

- **Statut** : Accepté
- **Date** : (à dater)
- **Décideur** : Lead Dev
- **Réf. dossier** : §2.5 (choix PostgreSQL/PostGIS), §5.3 (modèle de données), §5.7 (A03)

## Contexte
Le dossier verrouille PostgreSQL/PostGIS et NestJS mais laisse l'ORM ouvert
(§5.7 mentionne seulement « ORM avec requêtes paramétrées »). Le modèle de
données repose sur des colonnes `geography(POINT)` et des requêtes spatiales
(proximité de stations, planificateur F2). L'ORM doit être cohérent avec ces
deux choix structurants.

## Options envisagées
1. **TypeORM** — ORM à décorateurs, intégration NestJS officielle
   (`@nestjs/typeorm`), support des types spatiaux et des fonctions PostGIS.
2. **Prisma** — meilleure type-safety et DX, mais PostGIS non supporté
   nativement (SQL brut via `$queryRaw` pour toute opération spatiale).
3. **Drizzle** — SQL-first performant, mais écosystème plus récent et restreint.

## Décision
**TypeORM**, pour trois raisons de cohérence :
- intégration native à NestJS (même paradigme à décorateurs que les modules/DI) ;
- support des types et requêtes spatiales PostGIS, fondement du modèle
  géolocalisé — alignement direct avec le motif du choix PostGIS (§2.5) ;
- requêtes paramétrées par défaut, couvrant OWASP A03 (§5.7).

## Conséquences
- (+) Récit technique simple et cohérent à défendre en soutenance.
- (+) Un seul modèle mental sur tout le backend.
- (−) Type-safety inférieure à Prisma, compensée par TypeScript strict et la
  validation `class-validator` aux frontières d'API.
- Réversibilité : un module isolé pourrait migrer si un besoin de performance
  spécifique l'imposait, sans toucher au reste (couplage limité).