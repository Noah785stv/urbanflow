# ADR-005 — Bascule du routing de Navitia vers OpenTripPlanner auto-hébergé

- **Statut** : Accepté
- **Date** : (à dater)
- **Décideur** : Lead Dev
- **Réf. dossier** : §2.5 (Arbitrage 5 : Navitia + fallback OTP), §5.4 (abstraction)
- **Remplace** : le choix de l'API Navitia comme source de routing primaire

## Contexte

Le dossier avait retenu l'API Navitia pour le calcul d'itinéraires multimodal,
« gratuite via l'écosystème data.gouv » (§2.5), tout en documentant explicitement un
plan de repli : « abstraction permettant de basculer vers OpenTripPlanner
self-hosted ».

Lors de l'implémentation (F2), il s'avère que **l'accès gratuit en self-service à
navitia.io a été fermé** (fin 2024) : l'obtention d'un token nécessite désormais une
offre payante ou de passer par une autorité organisatrice. Cette option n'est pas
soutenable pour un prototype de certification à budget nul.

## Options envisagées

1. **OpenTripPlanner (OTP) auto-hébergé** — moteur open source de calcul multimodal
   à partir de GTFS + OpenStreetMap, exécuté localement en Docker.
2. **Transitous** — service de routing communautaire gratuit ; écarté car dépendance
   externe sans SLA (même catégorie de risque que Navitia) et couverture à vérifier.
3. **Navitia payant** — écarté (contrainte budgétaire).

## Décision

Basculer sur **OpenTripPlanner auto-hébergé**, alimenté par le GTFS du réseau STAR
(transport.data.gouv.fr) et un extrait OpenStreetMap de Bretagne.

Ce choix était **déjà documenté comme repli** dans le dossier (§2.5) et l'abstraction
`TransportProvider` (§5.4) a été conçue précisément pour permettre ce changement : on
ajoute un `OtpRoutingProvider` implémentant la même interface `RoutingProvider`, sans
toucher à F2, au calcul carbone (F4) ni au reste du code.

## Conséquences

- (+) **Gratuité et souveraineté** : hébergement local, données open data, aucune
  dépendance à un tiers payant — renforce l'axe souveraineté/éco-conception du dossier.
- (+) **L'abstraction est validée** : le changement de fournisseur reste circonscrit à
  un seul module, ce qui démontre la valeur de la conception (argument de soutenance).
- (+) **Bonus technique** : OTP expose la **distance par tronçon**, ce qui résout
  nativement le problème `distanceMeters = 0` rencontré avec le provider Navitia — le
  calcul carbone (F4) s'en trouve fiabilisé.
- (−) **Surcoût de mise en place** : téléchargement des données (GTFS + OSM),
  construction du graphe, service Docker supplémentaire, besoin mémoire accru à la
  construction. Ponctuel.
- (−) **Fraîcheur des données** : le GTFS est théorique (horaires planifiés) ; le
  temps réel (GTFS-RT) reste géré séparément via le provider dédié (F3).

## Suivi documentaire

- Mettre à jour le **§2.5** du dossier : OTP passe de « repli » à « solution retenue »,
  avec la justification ci-dessus.
- Réviser la section « prérequis » de la spec **F2** : cibler `OtpRoutingProvider` au
  lieu du raffinement du provider Navitia.
