# Web — Stations vélos/trottinettes partagés sur la carte (GBFS)

> Rend **F3 visiblement complète** : le backend GBFS existe et tourne, on l'expose
> enfin dans l'interface. À lire avec `CLAUDE.md`, `design-system.md`, `F2-web-planner.md`.
> Références : sujet F3 (« services de vélos/trottinettes partagés »).

## 1. Objectif

Afficher sur la carte Leaflet les **stations de mobilité partagée à proximité**, avec
leur **disponibilité temps réel**, en consommant l'endpoint `/stations/nearby` existant.
**Aucun changement backend** : il est prêt et testé.

## 2. Périmètre

**Inclus :** un affichage optionnel (toggle) des stations proches sur la carte, avec
marqueurs + popup de disponibilité, accessible et conforme au design system.
**Exclu :** toute modif backend ; la réservation (V2) ; la distinction vélo/trottinette
(voir limitation ci-dessous).

> ⚠️ **Limitation assumée à respecter :** `stationType` vaut toujours `"dock"` (le GBFS
> ne distingue pas vélo/trottinette à ce niveau). On affiche donc des **« stations de
> mobilité partagée »**, sans prétendre distinguer les deux. À ne pas survendre à l'oral.

## 3. Contrat d'API (réel — ne pas deviner)

`GET /api/v1/stations/nearby?lat=<>&lng=<>&radius=<>` — **protégé par JwtAuthGuard**
(réutiliser le client API authentifié existant).
- `lat`, `lng` requis ; `radius` optionnel (50–2000 m, défaut 500).
- Réponse : **tableau brut** trié par distance croissante, un élément par station :
  ```
  { station: { id, provider, externalId, name, stationType, location:{latitude,longitude}, capacity },
    distanceMeters: number,
    status: { bikesAvailable, docksAvailable, updatedAt, stale } | null }
  ```
- `status` peut être **`null`** (pas de disponibilité connue) → à gérer proprement.
- `status.stale === true` → donnée non temps réel (dernière valeur connue) → à signaler.

## 4. Types partagés

Le composite `StationNearbyResult` n'existe **que côté backend**. L'ajouter à
`@urbanflow/shared-types` (ajout de type, sans logique) :
```ts
export interface StationNearbyResult {
  station: Station;
  distanceMeters: number;
  status: StationStatus | null;
}
```
(`Station` et `StationStatus` y sont déjà.) Le front réutilise ces types, ne les
redéfinit pas.

## 5. Déclenchement & source de position

- Affichage **optionnel** via un **toggle/bouton** « Vélos/trottinettes à proximité »
  (pas d'auto-chargement → sobriété C5 + l'utilisateur choisit).
- **Position de recherche** : réutiliser le point d'**origine** du planificateur (ou le
  centre courant de la carte). Ne rien réinventer : la géoloc/origine existe déjà.
- Rayon par défaut raisonnable (ex. 800 m), borné à 2000.

## 6. Affichage sur la carte

- Un **marqueur par station** (couleur **Vélo** du design system, `#0F7A54`), distinct
  des marqueurs origine/destination.
- **Popup au clic/activation** (texte, accessible) :
  - nom de la station, distance ;
  - si `status` présent : « **X vélos disponibles · Y places** » (`bikesAvailable` /
    `docksAvailable`) ;
  - si `status.stale` : mention « dernière mise à jour à HH:MM » (donnée non temps réel) ;
  - si `status === null` : « disponibilité indisponible ».
- Se charge **avec la carte déjà différée** (ne casse pas l'EcoIndex A) et **à la
  demande** (au toggle).

## 7. Accessibilité (C7) — à ne pas négliger

- La couleur ne porte jamais seule l'info : le popup **texte** est la source réelle.
- Marqueurs **focusables au clavier**, popup atteignable au clavier.
- Fournir une **représentation textuelle accessible** des stations proches (ex. une
  courte liste sous/à côté de la carte : nom + dispo + distance) — la carte reste un
  complément, la liste est l'équivalent accessible.
- Annonce (région live) du résultat après chargement.

## 8. Non-régression (garde-fous)

- **Zéro changement backend.**
- Ne pas dégrader l'**EcoIndex A** : chargement à la demande, pas de requête au boot.
- Ne pas dégrader l'**accessibilité** (axe-core reste vert) ni le **responsive**.

## 9. Critères d'acceptation

- [ ] Le toggle affiche les stations proches sur la carte, triées par distance.
- [ ] Le popup montre la **disponibilité temps réel** (vélos/places).
- [ ] Les cas `status = null` et `stale = true` sont gérés proprement (pas de crash, pas
      d'affichage trompeur).
- [ ] Représentation textuelle accessible présente ; parcours utilisable au clavier,
      sans violation axe-core critical/serious.
- [ ] Aucune régression EcoIndex / responsive / tests existants.

## 10. Tests (DoD §6.5)

- **Composant** : rendu des marqueurs depuis une réponse mockée ; popup avec dispo ;
  cas `status null` et `stale`.
- **Accessibilité** : axe-core sur l'état « stations affichées ».
- **E2E (Playwright)** : activer le toggle → stations visibles (API mockée).

## 11. Ordre d'implémentation

1. Ajouter `StationNearbyResult` à shared-types.
2. Client API : appel authentifié `GET /stations/nearby` (réutilise l'auth existante).
3. Toggle + récupération autour de l'origine/centre carte.
4. Marqueurs Leaflet (couleur Vélo) + popup accessible (dispo, stale, null).
5. Liste textuelle accessible équivalente.
6. Tests + vérif EcoIndex/axe/responsive.

## 12. Points à signaler

- **Limitation `stationType = "dock"`** : ne pas distinguer vélo/trottinette (donnée
  absente). L'assumer dans l'UI et à l'oral.
- **Position requise** : si aucune origine n'est définie, demander/utiliser la géoloc
  avant de chercher — ne pas appeler l'API sans coordonnées.
- Toute contrainte rendant une règle infaisable → la signaler et synchroniser cette
  spec (règle n°2).