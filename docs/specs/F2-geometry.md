# F2-géométrie — Tracé des itinéraires sur la carte

> Incrément transversal (backend + frontend). À lire avec `CLAUDE.md`,
> `F2-planner.md`, `F2-web-planner.md` et l'`OtpRoutingProvider` existant.
> Comble le manque de contrat d'API identifié en §3 de `F2-web-planner.md`.

## 1. Objectif

Rendre la carte **démonstrative** : afficher le tracé réel de chaque itinéraire, et
plus seulement des marqueurs. Aujourd'hui l'API ne renvoie aucune géométrie de
tronçon ; cet incrément l'ajoute de bout en bout (OTP → types → API → carte).

## 2. Périmètre

**Backend :** transporter la géométrie de chaque tronçon depuis OTP jusqu'à la réponse
`/trips/plan`.
**Frontend :** décoder cette géométrie et tracer une polyligne par tronçon sur Leaflet,
colorée par mode, avec cadrage automatique de la carte sur l'itinéraire sélectionné.

## 3. Décision de conception (à signaler / défendre à l'oral)

OTP fournit la géométrie d'un tronçon sous forme de **polyligne encodée** (format
Google, précision 5) via `legGeometry.points`. On la **transporte encodée** jusqu'au
front, qui la décode — plutôt que de la décoder en tableau de points côté serveur.
Motif : **sobriété du payload** (une polyligne encodée est bien plus légère qu'un
tableau de coordonnées JSON), cohérent avec l'éco-conception (C5, RGESN). Le champ est
donc une chaîne opaque documentée, pas un tableau.

## 4. Types partagés (`@urbanflow/shared-types`)

Ajouter un champ **optionnel** à `JourneySection` (n'enlève rien, n'impacte pas le
calcul carbone ni le classement) :

```ts
export interface JourneySection {
  mode: TransportMode;
  durationSeconds: number;
  distanceMeters: number;
  /** Polyligne encodée (format Google, précision 5) du tracé du tronçon. */
  geometry?: string;
}
```

## 5. Backend — `OtpRoutingProvider`

- Ajouter `legGeometry { points }` aux `legs` de la requête GraphQL `plan`.
- Étendre le type interne `OtpLeg` avec `legGeometry: { points: string } | null`.
- Dans `mapLeg`, renseigner `geometry: leg.legGeometry?.points`.
- **Mettre à jour la fixture de test** `otp.provider.spec.ts` : ajouter un
  `legGeometry` (recapturé depuis `http://localhost:8080/graphiql` en ajoutant
  `legGeometry { points }` à la requête, ou une chaîne encodée représentative) et
  **asserter** que `section.geometry` est bien renseigné.

Aucun autre changement backend : `PlannedJourney` (qui étend `JourneyOption`) propage
`sections[].geometry` automatiquement ; vérifier seulement que la sérialisation de
`/trips/plan` n'exclut pas ce champ.

## 6. Frontend — tracé Leaflet

- Décoder chaque `section.geometry` (dépendance `@mapbox/polyline`, précision 5).
- Tracer une `Polyline` react-leaflet **par tronçon**, **colorée par mode** (définir
  une petite table mode → couleur ; ex. transport en commun vs marche/vélo distincts).
- Au choix d'une option (bouton « Sélectionner » existant), afficher **son** tracé et
  **cadrer la carte** sur ses limites (`fitBounds`).
- Robustesse : un tronçon sans `geometry` est simplement non tracé (pas d'erreur).
- La carte reste un **complément** : la liste des résultats demeure la source
  accessible (C7 inchangé).

## 7. Configuration & dépendances

Frontend : `@mapbox/polyline` (+ `@types/mapbox__polyline` en dev). Aucun ajout backend.

## 8. Critères d'acceptation

- [ ] La réponse `/trips/plan` contient une `geometry` non vide sur les tronçons.
- [ ] Sélectionner un itinéraire trace son parcours réel sur la carte, coloré par mode.
- [ ] La carte se recadre automatiquement sur l'itinéraire choisi.
- [ ] Un itinéraire multimodal (marche + métro/bus) affiche des segments distincts.
- [ ] Aucun régression : calcul carbone, coût et classement inchangés.

## 9. Tests attendus (DoD §6.5)

- **Backend** : `otp.provider.spec.ts` mis à jour → `geometry` mappé depuis la fixture.
- **Frontend** : test du décodage → nombre de points cohérent ; rendu d'une `Polyline`
  quand une option est sélectionnée. Pas de régression axe-core.

## 10. Ordre d'implémentation suggéré

1. Champ `geometry?` dans `JourneySection` (types partagés).
2. `OtpRoutingProvider` : requête + mapping + fixture/test.
3. Vérifier la présence de `geometry` dans la réponse `/trips/plan` (appel réel).
4. Frontend : décodage + `Polyline` par mode + `fitBounds` sur sélection.
5. Tests + DoD.

## 11. Points à signaler

- Si `legGeometry` n'apparaît pas dans la réponse OTP, vérifier le nom exact du champ
  dans `/graphiql` (autocomplétion) avant d'improviser.
- Toute contrainte rendant une règle infaisable → la signaler et synchroniser cette
  spec + le dossier (règle n°2).
