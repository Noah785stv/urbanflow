# Incident déploiement Vercel — préparation orale (6 septembre)

> Objectif : pouvoir expliquer *pourquoi* la version en ligne n'a pas les toutes
> dernières fonctionnalités, sans avoir l'air de subir le problème — en montrant la
> démarche de diagnostic. Un jury de certification évalue autant la méthode que le
> résultat : sais-tu isoler des variables, documenter, et savoir quand arrêter de
> deviner ? C'est exactement ce que cet incident permet de démontrer.

---

## Le symptôme

Depuis plusieurs jours, `pnpm install` échoue systématiquement sur l'infrastructure
de build de Vercel — jamais en local, jamais en CI (GitHub Actions) — avec :

```
ERR_INVALID_THIS  GET https://registry.npmjs.org/... : Value of "this" must be of type URLSearchParams
ERR_PNPM_META_FETCH_FAIL
```

Ça se produit à la toute première étape (récupération des métadonnées du registre
npm), avant même que la moindre ligne de notre code ne soit exécutée — donc
indépendant du contenu du diff, de la branche, ou du commit.

## Ce qui a été isolé méthodiquement (et éliminé)

Chaque piste a été testée en A/B réel — un changement à la fois, un redeploy, un
verdict — pas des suppositions empilées :

| Piste testée | Résultat |
| :--- | :--- |
| Version de Node (plusieurs versions) | Échec identique |
| pnpm 9.15.9 (déjà la dernière version patch de la branche 9.x) | Échec |
| pnpm 10.34.5 (3 versions majeures plus récent) | Échec identique, même signature |
| Activer/désactiver Corepack | Aucun changement |
| Présence ou absence du champ `packageManager` | Aucun changement |
| `NODE_OPTIONS=--no-experimental-fetch` (bug Node/fetch documenté) | Échec identique |
| Remplacer `pnpm install` par `npm install` | Structurellement impossible : npm ne comprend pas le protocole `workspace:*` utilisé pour lier les packages du monorepo entre eux |

Un ticket support a été ouvert auprès de Vercel. Leur première réponse automatisée
(IA) recommandait de désactiver Corepack — recommandation directement contredite par
nos propres logs : un build antérieur, sans aucun `packageManager` ni Corepack actif,
avait déjà échoué à l'identique.

## Diagnostic

Le bug vit dans l'infrastructure de build de Vercel elle-même (leur conteneur, leur
chemin réseau vers le registre npm) — pas dans notre code, notre configuration, ni le
choix d'une dépendance. Preuve : aucune combinaison de Node/pnpm/Corepack ne change le
symptôme, et il ne se reproduit **jamais** ailleurs (poste local, CI GitHub Actions).

## Conséquence concrète : ce qui est en ligne et ce qui ne l'est pas

Le dernier déploiement de production réussi date de la fusion de PR #17 (fix d'un
bug Vercel différent, antérieur à celui-ci). Tout ce qui a été fusionné depuis est
resté bloqué à l'étape d'installation :

**En ligne** (`urban-flow-mobility.vercel.app`) : inscription/connexion,
planificateur de trajet, tableau de bord carbone.

**Fonctionnel uniquement en local** (vérifié : `pnpm dev`, tests unitaires et e2e
tous verts) :
- Tri/filtre des résultats de trajet par durée, CO2, coût
- Détail ligne/direction/arrêts d'un itinéraire sélectionné
- Restauration du dernier trajet recherché après reconnexion
- Chargement différé de la carte (régression corrigée sur cette même base)
- Page Profil (informations du compte, édition des préférences de mobilité,
  suppression de compte)

Vérifié directement sur le site en ligne (pas seulement déduit des logs) : la route
`/profil` y renvoie une 404 — la preuve la plus simple qu'elle n'y est pas déployée.

## Pour la démo le jour J

Deux fenêtres : le site en ligne pour prouver qu'un vrai déploiement fonctionne, puis
bascule sur le serveur local pour tout ce qui précède. Assumer le sujet directement
plutôt que le laisser deviner par le jury — présenter l'incident comme ci-dessus est
plus fort qu'essayer de le dissimuler.

## Questions probables du jury → ta réponse

- *« Pourquoi la version en ligne n'a pas toutes les fonctionnalités ? »*
  → Bug d'infrastructure côté Vercel (pas notre code), isolé méthodiquement,
  ticket support ouvert, non résolu à ce jour. Démonstration en local à la place.

- *« Comment savez-vous que ce n'est pas un problème de votre côté ? »*
  → Trois versions majeures de pnpm testées, Node varié, Corepack activé/désactivé,
  `NODE_OPTIONS` testé — comportement rigoureusement identique à chaque fois, et ça
  ne se reproduit jamais en local ni en CI. Un problème dans notre code ou nos
  dépendances varierait avec ces changements ; ici, rien ne le fait varier.

- *« Qu'auriez-vous fait avec plus de temps ? »*
  → Essayer un registre npm miroir, ou un hébergeur alternatif (Netlify, Render) —
  les deux pistes restantes, écartées ici faute de temps avant la soutenance plutôt
  que par manque de solution.
