# Incident déploiement Vercel — préparation orale (6-7 septembre)

> Objectif : pouvoir expliquer *pourquoi* il n'y a pas de site en ligne à jour
> pour la soutenance, sans avoir l'air de subir le problème — en montrant la
> démarche de diagnostic. Un jury de certification évalue autant la méthode que
> le résultat : sais-tu isoler des variables, documenter, et savoir quand
> arrêter de deviner ? C'est exactement ce que cet incident permet de démontrer.

---

## Deux bugs distincts, tous les deux propres à l'infra Vercel

### 1. `pnpm install` échoue sur tout commit récent

```
ERR_INVALID_THIS  GET https://registry.npmjs.org/... : Value of "this" must be of type URLSearchParams
ERR_PNPM_META_FETCH_FAIL
```

Se produit à la toute première étape (récupération des métadonnées du registre
npm), avant même que la moindre ligne de notre code ne soit exécutée.

**Piste la plus sérieuse, tranchée par A/B direct et répété (pas une supposition
isolée)** : un vieux commit (`9917f88`, antérieur à tout pin `packageManager`)
installe correctement **3 fois sur 3**. Le commit `main` actuel, qui a un
`packageManager` épinglé, échoue **4 fois sur 4** — cache désactivé à chaque
fois, mêmes paquets en échec. Épingler `packageManager` sur la version qui
avait pourtant marché (`pnpm@10.28.0`, dans `apps/web/package.json` **et** à
la racine) échoue quand même : ce n'est donc pas la version de pnpm qui compte,
c'est le simple fait qu'un `packageManager` déclenche Corepack. Retirer le
champ entièrement, en repartant de `main` : échoue encore. Revenir sur l'autre
changement du même commit historique (`engines.node` : `">=22"` vs `"22.x"`) :
échoue aussi. Piste dans une impasse malgré l'A/B le plus propre possible.

| Piste testée | Résultat |
| :--- | :--- |
| Version de Node (plusieurs versions) | Échec identique |
| pnpm 9.15.9, 10.28.0 (exactement la version qui marchait ailleurs), 10.34.5 | Échec identique dans les 3 cas |
| Activer/désactiver Corepack, présence/absence de `packageManager` | Échec dans toutes les combinaisons |
| `engines.node` (`">=22"` vs `"22.x"`) | Aucun changement |
| `NODE_OPTIONS=--no-experimental-fetch` | Échec identique |
| Remplacer `pnpm install` par `npm install` | Structurellement impossible : npm ne comprend pas `workspace:*` (protocole pnpm pour lier les packages du monorepo) |

Un ticket support est ouvert chez Vercel. Leur première réponse automatisée
(IA) recommandait de désactiver Corepack — contredit par nos propres logs
(un commit sans aucun `packageManager` avait déjà échoué à l'identique).

### 2. Le seul commit qui installe ne build pas

Le commit `9917f88` (celui qui installe de façon fiable) échoue ensuite,
systématiquement, dès la première seconde de `next build --webpack` — avant
même le premier message normal de build :

```
unhandledRejection ReferenceError: Request is not defined
    at ignore-listed frames
```

Deux hypothèses concrètes testées, toutes les deux éliminées par une
reproduction locale qui **réussit** (donc le bug ne s'y manifeste pas) :

| Hypothèse | Test | Résultat |
| :--- | :--- | :--- |
| Télémétrie Next.js (appel réseau au démarrage du build) | `NEXT_TELEMETRY_DISABLED=1` sur Vercel, redeploy | Échec identique |
| Comportement spécifique déclenché par la détection "je tourne sur Vercel" | `VERCEL=1 CI=1 VERCEL_ENV=production` forcés en local | Build **réussi** en local avec ces variables |
| Différence Windows (poste local) / Linux (infra Vercel), ex. casse de fichier | Build dans un vrai conteneur Docker `node:22-slim` (Linux), mêmes variables Vercel forcées | Build **réussi** dans ce conteneur aussi |

Le troisième test est le plus rigoureux possible sans accès direct aux
machines de build Vercel : OS identique (Linux), version de Node identique,
variables d'environnement Vercel simulées — et ça build sans erreur. Le bug
ne vit donc ni dans notre code, ni dans une dépendance sensible à l'OS ou à la
télémétrie : il est spécifique à l'infrastructure de build Vercel elle-même,
d'une façon qu'on ne peut plus isoler de l'extérieur.

## Diagnostic

Les deux bugs vivent dans l'infrastructure de build de Vercel — pas dans notre
code, notre configuration, ni un choix de dépendance. Preuve pour chacun :
aucune combinaison de Node/pnpm/Corepack/variables d'environnement/OS ne
change le symptôme, et aucun des deux ne se reproduit **jamais** ailleurs
(poste local Windows, conteneur Linux, CI GitHub Actions).

**Conclusion opérationnelle** : après ~15 tentatives A/B ciblées sur les deux
bugs, aucune piste testable depuis l'extérieur de l'infra Vercel ne reste. On
arrête la chasse — décision consciente, pas un abandon par manque d'idées — et
on bascule sur une démonstration 100 % locale pour la soutenance.

## Conséquence concrète : ce qui est en ligne et ce qui ne l'est pas

Le dernier déploiement de production réussi date de la fusion de PR #17,
avant l'apparition de ces deux bugs. **Rien de plus récent n'est en ligne.**

**En ligne** (`urban-flow-mobility.vercel.app`, figé à cet ancien état) :
inscription/connexion, planificateur de trajet, tableau de bord carbone.

**Fonctionnel uniquement en local** (vérifié : `pnpm dev`, tests unitaires et
e2e tous verts) :
- Tri/filtre des résultats de trajet par durée, CO2, coût
- Détail ligne/direction/arrêts d'un itinéraire sélectionné
- Restauration du dernier trajet recherché après reconnexion
- Chargement différé de la carte (régression corrigée sur cette même base)
- Page Profil (informations du compte, édition des préférences de mobilité,
  suppression de compte)

Vérifié directement sur le site en ligne (pas seulement déduit des logs) : la
route `/profil` y renvoie une 404 — la preuve la plus simple qu'elle n'y est
pas déployée.

## Pour la démo le jour J

**Démonstration 100 % locale** (`pnpm dev`, comme tout au long de cette
session) — pas de bascule avec un onglet en ligne, puisqu'aucun commit récent
ne s'y déploie. Assumer le sujet directement plutôt que le laisser deviner par
le jury : présenter l'incident comme ci-dessus est plus fort que d'essayer de
le dissimuler ou de espérer qu'il ne soit pas remarqué.

## Questions probables du jury → ta réponse

- *« Pourquoi pas de démonstration en ligne ? »*
  → Deux bugs distincts et successifs sur l'infrastructure de build Vercel
  (échec d'installation des dépendances, puis échec de compilation sur le seul
  commit qui installait), tous les deux isolés méthodiquement, ticket support
  ouvert, non résolus à ce jour malgré une quinzaine de tests A/B ciblés.
  Démonstration en local à la place.

- *« Comment savez-vous que ce n'est pas un problème de votre côté ? »*
  → Pour chaque bug, testé en variant tout ce qu'on contrôle (versions de
  Node/pnpm, Corepack, variables d'environnement, jusqu'à reproduire l'OS de
  Vercel dans un conteneur Linux) — comportement rigoureusement identique à
  chaque fois côté Vercel, et succès à chaque fois en dehors. Un problème dans
  notre code varierait avec ces changements ; ici, rien ne le fait varier.

- *« Qu'auriez-vous fait avec plus de temps ? »*
  → Contacter le support Vercel avec ces preuves précises (plutôt que le
  ticket générique déjà ouvert), ou tenter un hébergeur alternatif (Netlify,
  Render) — écarté ici faute de temps avant la soutenance, pas par manque de
  solution.

- *« Pourquoi ne pas avoir essayé un autre hébergeur ? »*
  → Décision consciente de priorisation : redévelopper la config de
  déploiement sur une autre plateforme, à 1-2 jours de l'oral, était un risque
  plus grand que de préparer une démonstration locale solide et déjà
  entièrement testée.
