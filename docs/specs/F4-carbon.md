# F4 — Calculateur d'empreinte carbone (volet backend)

> Spécification d'implémentation. À lire avec `CLAUDE.md`, `F2-planner.md`.
> Références dossier : §4.7 (F4, fonctionnalité clé), §5.3 (modèle), §4.8 (minimisation
> RGPD du CarbonLog).

## 1. Objectif

Donner du corps au calcul carbone déjà en place : **enregistrer** l'empreinte des
trajets confirmés, en **versionner les facteurs** d'émission, et exposer les
**agrégats** (historique 12 mois, cumul, comparaison à une référence) qui
alimenteront le tableau de bord. F4 est la fonctionnalité clé du dossier.

## 2. État de départ (à ne pas refaire)

- `CarbonEstimatorService.estimateGrams(sections): number` — pur, testé 100 %,
  facteurs injectés via le token DI `EMISSION_FACTORS` (aujourd'hui `useValue`
  d'une constante en dur). **On ne modifie pas ce service** : on branche seulement
  une nouvelle source sur son token (§5).
- Aucune persistance de trajet, aucune notion de « trajet confirmé », aucune entité
  `carbon_log`/`emission_factor`. Tout cela est à construire.
- ⚠️ Les interfaces `Trip`/`Segment` de `shared-types` sont du **scaffolding mort**
  (non importées). Ne pas les ressusciter ; F4 définit ses propres types. Les
  supprimer serait un nettoyage bienvenu.

## 3. Périmètre

**Inclus (backend) :** facteurs versionnés en base, confirmation & persistance d'un
`carbon_log`, endpoints d'agrégation pour le tableau de bord, export PDF mensuel.
**Volet frontend (incrément appairé, §14) :** tableau de bord, bouton « enregistrer ce
trajet », graphe d'historique — spécifié ensuite.
**Phaseable :** l'export PDF peut suivre le reste si le temps manque.

## 4. Modèle de données

### 4.1 `emission_factor` (versionné)

| Colonne      | Type                 | Contraintes                          |
| :----------- | :------------------- | :----------------------------------- |
| id           | uuid                 | PK                                   |
| mode         | enum `TransportMode` | non nul                              |
| grams_per_km | numeric              | non nul (valeur ADEME)               |
| valid_from   | date                 | non nul (versioning §5.3, CLAUDE.md) |
| valid_to     | date                 | nullable                             |

Migration + **seed** avec les valeurs §4.7.3 (Bus 113, CarSolo 193, Métro/Tram 4,
Walk/Bike 0, VAE 11, Trottinette 28, TER 25, Covoiturage 64), `valid_from` daté.

### 4.2 `carbon_log` (minimisé — RGPD, §4.8)

Enregistré **uniquement pour un trajet confirmé**. **Ne stocke ni origine ni
destination** (minimisation) : seulement l'empreinte agrégée.

| Colonne             | Type        | Contraintes                            |
| :------------------ | :---------- | :------------------------------------- |
| id                  | uuid        | PK                                     |
| user_id             | uuid        | FK → user, non nul                     |
| logged_at           | timestamptz | non nul (date du trajet)               |
| co2_grams           | int         | non nul                                |
| distance_meters     | int         | non nul                                |
| reference_co2_grams | int         | non nul (équivalent voiture solo)      |
| saved_grams         | int         | non nul (`reference − co2`)            |
| mode_breakdown      | jsonb       | `[{ mode, distanceMeters, co2Grams }]` |
| created_at          | timestamptz | auto                                   |

> ⚠️ **Divergence à signaler (§5.3).** Le dossier modélise `trip` → `trip_segment` →
> `emission_factor` + `carbon_log`. Par **minimisation RGPD**, F4 ne persiste pas les
> trajets détaillés géolocalisés : la décomposition par mode vit en `jsonb` dans
> `carbon_log`, sans coordonnées. Choix privacy-by-design à réconcilier dans le §5.3.

## 5. Facteurs versionnés — brancher le token existant

Remplacer le `useValue: DEFAULT_EMISSION_FACTORS` du `CarbonModule` par un provider
qui lit la base :

```ts
{
  provide: EMISSION_FACTORS,
  inject: [/* repository emission_factor */],
  useFactory: async (repo) => repo.getCurrentFactors(), // Record<TransportMode, number>
}
```

- `getCurrentFactors()` retourne les facteurs dont `valid_from <= now` (le plus
  récent par mode).
- **Repli** sur `DEFAULT_EMISSION_FACTORS` si la table est vide (sécurité au démarrage).
- `CarbonEstimatorService` reste inchangé et toujours testé à 100 % : il ne connaît
  que le token. **C'est le point d'extension qui était prévu.**
- L'empreinte d'un `carbon_log` est **figée à la confirmation** : mettre à jour les
  facteurs plus tard n'altère jamais l'historique.

## 6. Confirmation & persistance

Nouvel endpoint pour matérialiser le « trajet confirmé » qui manque aujourd'hui :

| Méthode | Route                 | Auth | Description                               |
| :------ | :-------------------- | :--- | :---------------------------------------- |
| POST    | `/api/v1/carbon-logs` | oui  | Confirme un trajet → crée un `carbon_log` |

- Corps : `{ loggedAt?, sections: [{ mode, distanceMeters }] }`.
- **Le serveur recalcule** `co2_grams` via `CarbonEstimatorService` (ne jamais faire
  confiance à un CO₂ envoyé par le client), calcule `reference_co2_grams`
  (= distance totale × facteur `CarSolo`) et `saved_grams`.
- Rattaché à l'utilisateur courant (`JwtAuthGuard`).

## 7. Tableau de bord — endpoints d'agrégation

| Méthode | Route                         | Auth | Description                                                  |
| :------ | :---------------------------- | :--- | :----------------------------------------------------------- |
| GET     | `/api/v1/carbon-logs`         | oui  | Liste des logs de l'utilisateur (12 mois glissants, paginée) |
| GET     | `/api/v1/carbon-logs/summary` | oui  | Agrégats du tableau de bord                                  |

`summary` renvoie : `totalCo2Grams`, `totalSavedGrams`, `monthly: [{ month,
co2Grams, savedGrams, tripCount }]` (regroupé par mois, `date_trunc`), et la
comparaison à la référence voiture solo. Types dans `@urbanflow/shared-types`.

## 8. Export PDF mensuel (§4.7.4, phaseable)

| Méthode | Route                                      | Auth | Description          |
| :------ | :----------------------------------------- | :--- | :------------------- |
| GET     | `/api/v1/carbon-logs/report?month=YYYY-MM` | oui  | Bilan mensuel en PDF |

Génération côté serveur (ex. `pdfkit`), à partir des agrégats du mois. Peut suivre le
reste de F4 si le temps presse.

## 9. Sécurité & RGPD

- Tous les endpoints protégés par `JwtAuthGuard` ; un utilisateur n'accède qu'à ses
  propres logs (vérif d'appartenance).
- **Minimisation** : pas d'origine/destination stockées (§4.2).
- **Suppression de compte (F1)** : les `carbon_log` de l'utilisateur doivent être
  supprimés/anonymisés avec le compte (cascade ou traitement dédié).

## 10. Configuration & dépendances

Enregistrer `TypeOrmModule.forFeature` pour les nouvelles entités dans les modules
concernés (`carbon` n'importe pas encore TypeORM). Dépendance PDF : `pdfkit` (phase
export uniquement). Pas d'autre ajout.

## 11. Critères d'acceptation

- [x] Les facteurs proviennent de la base (`emission_factor`), le token est branché,
      `CarbonEstimatorService` et ses tests restent inchangés.
- [x] `POST /carbon-logs` recalcule le CO₂ côté serveur et persiste un log minimisé.
- [x] `GET /carbon-logs/summary` renvoie l'historique mensuel, le cumul et les
      économies vs voiture solo.
- [x] Un log ne contient **ni origine ni destination**.
- [x] Un utilisateur ne voit que ses propres logs.
- [x] (Phase) `GET /carbon-logs/report` renvoie un PDF mensuel.

## 12. Tests attendus (§6.1.1, DoD §6.5)

- **Unitaires** : provider de facteurs (lecture courante + repli table vide) ;
  service de confirmation (recalcul serveur, référence, saved) ; agrégation mensuelle.
- **`CarbonEstimatorService`** : reste à **100 %**, non modifié.
- **Intégration (Supertest)** : `POST /carbon-logs` → persistance ; `GET summary` →
  agrégats corrects ; appartenance (un user ne lit pas les logs d'un autre).
- **Couverture ≥ 70 %** ; aucun appel réseau externe.

## 13. Ordre d'implémentation suggéré

1. Entité `emission_factor` + migration + seed (valeurs ADEME).
2. Repository + `getCurrentFactors()` + brancher le token `EMISSION_FACTORS` (repli).
3. Entité `carbon_log` + migration.
4. Service + `POST /carbon-logs` (recalcul serveur, référence, saved).
5. `GET /carbon-logs` + `GET /carbon-logs/summary` (types partagés).
6. Cascade de suppression avec le compte (F1).
7. (Phase) export PDF.
8. Tests + DoD.

## 14. Volet frontend (incrément appairé, à spécifier ensuite)

Bouton « enregistrer ce trajet » sur une option sélectionnée (→ `POST /carbon-logs`) ;
page tableau de bord : graphe d'historique 12 mois, CO₂ cumulé, économies vs voiture
solo, bouton export PDF. Accessible (C7), responsive (C2).

## 15. Points à signaler

- **Minimisation vs §5.3** (§4.2) : décision privacy-by-design à réconcilier au dossier.
- **Types morts `Trip`/`Segment`** : ne pas les réutiliser ; nettoyage possible.
- **Historisation figée** : le CO₂ est gelé à la confirmation ; la mise à jour des
  facteurs n'altère pas le passé (à vérifier par un test).
- Toute contrainte rendant une règle infaisable → la signaler et synchroniser cette
  spec + le dossier (règle n°2).
