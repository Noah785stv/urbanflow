# Web — Géocodage d'adresse & pages du site

> Spécification en **deux lots**, à implémenter **en séquence** (Lot A d'abord, on
> valide, puis Lot B). À lire avec `CLAUDE.md`, `design-system.md`, `F2-web-planner.md`.
> Références dossier : §4.5 (F2/géoloc C6), §5.6 (C2/C7/C8), volet RGPD (§5.6/§5.7).

## Objectif

Rendre l'application réellement utilisable et complète : saisir des **adresses**
(et non des coordonnées) pour planifier, et disposer des **pages attendues** d'un vrai
service en ligne (confidentialité, mentions légales, à propos, erreurs, footer).

---

# LOT A — Géocodage d'adresse

## A.1 Problème

Aujourd'hui l'origine et la destination se saisissent en **coordonnées GPS** —
inutilisable pour un vrai usager (contrainte C2 « intuitive et facile à utiliser »).
On remplace par une **saisie d'adresse avec autocomplétion**.

## A.2 API — Géoplateforme (IGN), officielle et gratuite

⚠️ **NE PAS utiliser `api-adresse.data.gouv.fr`** (décommissionné depuis janvier 2026).
Endpoints à jour, sans clé :
- **Recherche / autocomplétion** :
  `GET https://data.geopf.fr/geocodage/search/?q=<texte>&limit=5&autocomplete=1`
  → GeoJSON `FeatureCollection` ; chaque feature :
  `geometry.coordinates = [lon, lat]`, `properties.label` = adresse complète.
- **Géocodage inversé** :
  `GET https://data.geopf.fr/geocodage/reverse/?lon=<lon>&lat=<lat>`
  → adresse la plus proche (pour la géoloc et le clic carte).

S'appuie sur la Base Adresse Nationale — gratuit, souverain (bon point souveraineté à
l'oral). Usage raisonnable : **debounce** (≥ 300 ms), minimum 3 caractères.

## A.3 Composant `AddressAutocomplete`

- Champ de saisie + liste de suggestions, en **pattern ARIA combobox** :
  navigation clavier (↑ ↓ Entrée Échap), `aria-activedescendant`, annonce du nombre
  de résultats. **C'est la partie accessibilité délicate — à soigner (C7).**
- Requête debouncée vers l'endpoint `search`. À la sélection d'une suggestion :
  stocker **le label affiché** ET **les coordonnées** (lat/lon) en interne.
- Style conforme au design system (états défaut/focus/erreur du champ).

## A.4 Intégration au planificateur

- Remplacer les deux paires de champs lat/lon par **deux `AddressAutocomplete`**
  (départ, arrivée).
- **Aucun changement backend** : `POST /trips/plan` reçoit toujours
  `{ from: { latitude, longitude }, to: { latitude, longitude } }`, alimenté par les
  coordonnées de la suggestion choisie.
- **Conserver** « utiliser ma position » (géoloc) → géocodage **inversé** pour
  afficher une adresse lisible ; et le **clic sur la carte** → inversé aussi.

## A.5 Config

`NEXT_PUBLIC_GEOCODING_URL=https://data.geopf.fr/geocodage` (dans `.env.local` /
`.env.example`).

## A.6 Critères d'acceptation

- [ ] Taper une adresse propose des suggestions ; la sélectionner remplit le champ et
      permet un calcul d'itinéraire réussi.
- [ ] « Utiliser ma position » remplit le départ avec une **adresse lisible**.
- [ ] Le composant est **entièrement navigable au clavier**, sans violation axe-core.
- [ ] Aucune modification du backend ni du contrat `/trips/plan`.

## A.7 Tests

Composant (debounce, sélection → coordonnées stockées, navigation clavier) ;
accessibilité (rôles combobox, axe). Mock du réseau en test.

---

# LOT B — Pages statiques, footer & erreurs

## B.1 Footer (toutes les pages)

Liens : **À propos**, **Politique de confidentialité**, **Mentions légales** ; ligne
de marque brève. Accessible, responsive, conforme au design system.

## B.2 Politique de confidentialité (`/confidentialite`) — la plus importante

Vitrine de tout ton travail RGPD back-end. Doit refléter **fidèlement** ce que fait
l'app :
- **Données traitées** : e-mail, mot de passe (haché bcrypt), profil de mobilité,
  domicile/travail (**chiffrés AES-256**), géolocalisation (**avec consentement**),
  bilans carbone (**minimisés** : ni origine ni destination stockées).
- **Finalités** et base légale (consentement / exécution du service).
- **Durées de conservation** ; **droits** (accès, rectification, **effacement** —
  suppression de compte effective sous 30 j).
- **Sécurité** (bcrypt, AES-256, TLS), **non-revente** des données, contact/DPO.

> Contenu **illustratif** (service fictif modélisé sur Rennes Métropole) : structure
> réaliste et cohérente avec le dossier, mais pas un document juridique validé. À
> assumer comme tel. (Je peux t'aider à rédiger le texte.)

## B.3 Mentions légales (`/mentions-legales`)

Éditeur (fictif, modélisé Rennes Métropole), directeur de publication, **hébergeur**
(Vercel pour le front), contact. Illustratif.

## B.4 À propos (`/a-propos`)

Court : mission (report modal, éco-mobilité), contexte du projet, note de transparence
(service fictif). Pas un roman.

## B.5 Pages d'erreur

- **404** (`not-found.tsx`), **erreur générique** (`error.tsx`), gestion **403**
  (accès non autorisé aux routes protégées).
- Stylées selon le design system, message clair, lien de retour. Langage clair (C7).

## B.6 Critères d'acceptation

- [ ] Footer présent partout, liens fonctionnels.
- [ ] La politique de confidentialité décrit fidèlement les données réellement
      traitées et les droits (cohérent avec le back-end RGPD).
- [ ] 404 / erreur / 403 stylées et utiles.
- [ ] Toutes les pages respectent design system, accessibilité et responsive.

---

## Points à signaler (les deux lots)

- **Endpoint géocodage** : `data.geopf.fr/geocodage`, **jamais** l'ancien
  `api-adresse.data.gouv.fr` (décommissionné).
- **Combobox accessible** : le point technique le plus délicat du Lot A.
- **Contenu légal illustratif** : service fictif, pas de valeur juridique réelle.
- **Séquence** : Lot A d'abord, validation, puis Lot B.
- Toute contrainte rendant une règle infaisable → la signaler et synchroniser cette
  spec + le dossier (règle n°2).