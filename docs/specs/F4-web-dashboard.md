# F4-web — Tableau de bord carbone (volet frontend)

> Spécification d'implémentation. À lire avec `CLAUDE.md`, `F4-carbon.md` (backend
> livré) et `F2-web-planner.md` (dont on réutilise le client API et le contexte d'auth).
> Références dossier : §4.7 (F4), §5.6 (C2/C7), §4.7.4 (export PDF).

## 1. Objectif

Rendre la fonctionnalité clé **visible** : permettre d'enregistrer un trajet confirmé,
puis afficher un tableau de bord de l'empreinte carbone (historique 12 mois, CO₂
cumulé, économies vs voiture solo, export PDF). C'est ce qui matérialise le report
modal et donne son sens à toute la démarche.

## 2. Périmètre

**Inclus :** bouton « enregistrer ce trajet » sur une option du planificateur ; page
tableau de bord (résumé, graphe mensuel, liste des trajets, export PDF) ; lien de
navigation vers le tableau de bord.
**Exclu :** toute modification backend (F4 est livré) ; objectifs/gamification (V2).

## 3. Contrat d'API (backend livré — formes réelles)

Types disponibles dans `@urbanflow/shared-types` : `CarbonLogSummary`,
`MonthlyCarbonBreakdown`, `CarbonLog`, `ModeBreakdownEntry`, `ConfirmTripRequest`,
`CarbonLogPage`. **Réutiliser ces types, ne pas les redéfinir.**

- `POST /api/v1/carbon-logs` — corps `ConfirmTripRequest` :
  `{ loggedAt?: string (ISO), sections: [{ mode, distanceMeters }] }`.
  ⚠️ **Uniquement `mode` + `distanceMeters` par section.** Tout champ en trop (ex.
  `durationSeconds`, `geometry`, `co2Grams`) est **rejeté en 400** (`whitelist`).
- `GET /api/v1/carbon-logs/summary` → `CarbonLogSummary` :
  `{ totalCo2Grams, totalSavedGrams, monthly: [{ month: "YYYY-MM", co2Grams,
savedGrams, tripCount }] }`.
- `GET /api/v1/carbon-logs` → `CarbonLogPage` (liste paginée des logs).
- `GET /api/v1/carbon-logs/report?month=YYYY-MM` → **PDF** (téléchargement).

## 4. Stack

Réutilise l'existant de `F2-web` : contexte d'auth, client `fetch` avec Bearer +
refresh sur 401. Graphe : une librairie légère (ex. `recharts`), **assortie d'une
alternative accessible** (§7). Aucun nouveau système d'état lourd.

## 5. Écrans & parcours

1. **Enregistrer un trajet** — sur le planificateur (`F2-web`), quand une option est
   sélectionnée, un bouton « Enregistrer ce trajet » déclenche `POST /carbon-logs`.
   Retour visuel de succès/erreur. C'est l'acte de **confirmation** (§4.8 : le log
   n'existe que pour un trajet confirmé).
2. **Tableau de bord** (`/dashboard`, protégé) : résumé + graphe + liste + export.
3. **Navigation** : lien visible vers `/dashboard` depuis le planificateur.

## 6. Enregistrer un trajet (détail)

- Construire le corps depuis l'option sélectionnée : **mapper `sections` vers
  `{ mode, distanceMeters }` uniquement** (retirer `durationSeconds`, `geometry`…),
  sinon 400.
- `loggedAt` omis (défaut serveur = maintenant) sauf si tu ajoutes un sélecteur de date.
- Après succès : message de confirmation, et invalidation/rechargement des données du
  tableau de bord si affiché.

## 7. Tableau de bord

- **Cartes de résumé** : CO₂ total (`totalCo2Grams`), **économies vs voiture solo**
  (`totalSavedGrams`), nombre de trajets. Formatage lisible (g/kg, km).
- **Graphe mensuel** : `monthly[]` en barres/lignes (CO₂ et économies par mois).
- **Comparaison de référence** : mettre en avant les économies (« vous avez évité
  X kg de CO₂ par rapport à la voiture individuelle »).
- **Liste des trajets récents** : `GET /carbon-logs` (paginée), avec la décomposition
  par mode (`ModeBreakdownEntry`).
- **Export PDF** : bouton par mois → `GET /carbon-logs/report?month=` avec l'en-tête
  d'auth ; récupérer le blob et déclencher le téléchargement (un simple lien ne suffit
  pas, il faut le Bearer).

## 8. Accessibilité des graphes (C7) — point d'attention clé

Les graphes sont un piège d'accessibilité. Exigences :

- Le graphe est **complété par une alternative textuelle** : une table de données
  (mois / CO₂ / économies / nb trajets) équivalente, ou des `aria-label` décrivant
  chaque point. La donnée ne doit jamais exister _uniquement_ dans le graphe.
- Navigation clavier, focus visible, contrastes **AA**, respect de
  `prefers-reduced-motion` (pas d'animation imposée).
- Annonce (région live) du résultat après chargement/enregistrement.

## 9. Configuration & dépendances

Frontend : librairie de graphe (ex. `recharts`). L'export PDF ne nécessite pas de
dépendance (fetch → blob → download). Réutilise `NEXT_PUBLIC_API_URL`.

## 10. Critères d'acceptation

- [x] Depuis une option du planificateur, « enregistrer ce trajet » crée bien un log
      (corps réduit à `mode` + `distanceMeters`, pas de 400).
- [x] Le tableau de bord affiche CO₂ total, économies, et l'historique mensuel.
- [x] Un bouton exporte le bilan mensuel en PDF (téléchargement authentifié).
- [x] Le graphe a une **alternative accessible** ; parcours utilisable au clavier,
      sans violation axe-core critical/serious.
- [x] Utilisable de mobile à desktop (grilles responsive Tailwind, cohérent avec F2-web).

## 11. Tests attendus (DoD §6.5)

- **Composants** : cartes de résumé (formatage g/kg), rendu du graphe + de sa table
  alternative, mapping du corps `POST /carbon-logs` (vérifier qu'aucun champ interdit
  n'est envoyé).
- **Accessibilité** : `axe-core` sur `/dashboard` → 0 violation critical/serious.
- **E2E (Playwright)** : enregistrer un trajet depuis le planificateur → le voir
  apparaître dans le tableau de bord (API mockée/de test).

## 12. Ordre d'implémentation suggéré

1. Client API carbone (summary, list, confirm, report) réutilisant l'auth existante.
2. Bouton « enregistrer ce trajet » sur le planificateur + mapping du corps + retour visuel.
3. Page `/dashboard` : cartes de résumé + lien de navigation.
4. Graphe mensuel **+ sa table alternative accessible**.
5. Liste des trajets récents (pagination).
6. Export PDF (téléchargement authentifié).
7. Passe accessibilité + responsive ; tests + DoD.

## 13. Points à signaler

- **Corps `POST /carbon-logs` strict** : n'envoyer que `mode` + `distanceMeters`
  (sinon 400) — le piège le plus probable.
- **Accessibilité des graphes** : ne pas livrer un graphe sans équivalent textuel.
- Toute contrainte rendant une règle infaisable → la signaler et synchroniser cette
  spec + le dossier (règle n°2).
