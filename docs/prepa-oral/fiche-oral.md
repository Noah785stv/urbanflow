# Comprendre mon propre vocabulaire — fiche de préparation orale

> Pour chaque phrase du diaporama : les mots techniques expliqués simplement, et
> leur rôle concret dans UrbanFlow. Objectif : pouvoir les redire avec **tes mots**.

---

### 1. « GTFS via OpenTripPlanner, et GBFS pour les vélos et trottinettes partagés »

**GTFS** est un format standard qui décrit un réseau de transport public : arrêts,
lignes, horaires (théoriques). **OpenTripPlanner (OTP)** est un moteur open source,
que j'héberge moi-même, qui lit ces données GTFS + la carte des rues (OpenStreetMap)
pour **calculer les itinéraires** multimodaux — c'est lui qui alimente mon
planificateur (F2). **GBFS** est le standard équivalent pour les **vélos et
trottinettes partagés** : il donne la position des stations et leur disponibilité en
temps réel. Rôle : GTFS→OTP = le routing ; GBFS = les stations de mobilité partagée (F3).

---

### 2. « TypeScript de bout en bout, front et back… Next.js pour la PWA, NestJS pour un backend en monolithe modulaire, PostgreSQL avec PostGIS, TypeORM comme ORM »

**Ta question : pourquoi "de bout en bout" si TypeScript n'est cité que pour le back ?**
Parce que **Next.js aussi est écrit en TypeScript**. TypeScript est le **langage** ;
Next.js (front) et NestJS (back) sont des **frameworks** (des boîtes à outils) posés
par-dessus. Donc front ET back sont en TypeScript = « de bout en bout ». Intérêt :
un seul langage à maîtriser (**coût cognitif** réduit), et surtout je **partage les
types** — un même modèle de données (ex. un itinéraire) est défini une fois et utilisé
des deux côtés, donc le front et le back ne peuvent pas se désynchroniser.
**PostGIS** = extension géographique de PostgreSQL (requêtes de proximité). **ORM**
(TypeORM) = l'outil qui fait le pont entre mes tables SQL et mes objets de code.

---

### 3. « J'avais abstrait mes sources de transport derrière une interface, TransportProvider. Le planificateur et le calcul carbone ne dépendent pas d'une API précise, mais de cette interface. »

Une **interface** est un **contrat** : elle dit *quelles* fonctions existent (ex.
« calcule-moi des itinéraires ») sans dire *comment*. Chaque source réelle (Navitia,
puis OTP) fournit sa propre version qui **respecte ce contrat**. « **Abstraire** »,
c'est justement séparer le *quoi* du *comment*. Résultat : mon planificateur ne parle
qu'au contrat, jamais directement à Navitia ou OTP. Donc quand j'ai changé de
fournisseur, j'ai juste branché une nouvelle implémentation du même contrat — sans
toucher au planificateur ni au calcul carbone.

---

### 4. « Monolithe modulaire… en haut la PWA… une API Gateway… en bas les données… »

**Ta question : pourquoi "en haut / en bas" ?** Parce que je décris un **schéma en
couches** empilées verticalement : « en haut » = la couche la plus proche de
l'utilisateur (l'app), « en bas » = la plus proche des données. Je lis le schéma du
haut vers le bas. **Monolithe modulaire** = une seule application déployée, mais
organisée en **modules** indépendants par domaine (auth, trip, carbon…) — au lieu de
plein de petits services séparés (microservices). Avantage : je pourrais plus tard
**extraire un module** en service autonome sans payer aujourd'hui le **coût
opérationnel** (déploiement, supervision) de gérer beaucoup de services. L'**API
Gateway** est la porte d'entrée unique qui centralise authentification, validation et
**versioning** (`/api/v1` = préfixe qui permet de faire évoluer l'API sans casser les
clients existants). Le module **Integration** est le seul à contacter les APIs
externes : c'est là que vit l'abstraction du point 3.

---

### 5. « Je chiffre le domicile et le travail en AES-256-GCM — c'est réversible, car je dois les réafficher »

**Chiffrer** = transformer une donnée en texte illisible, que l'on peut
**re-transformer** en clair grâce à une clé (c'est **réversible**). **AES-256** est un
standard de chiffrement **symétrique** (même clé pour chiffrer et déchiffrer) très
robuste, avec une clé de 256 bits. **GCM** est un mode qui garantit en plus
l'**intégrité** : si quelqu'un altère la donnée, on le détecte. Pourquoi chiffrer et
pas hacher ? Parce que je dois **réafficher** le domicile/travail à l'utilisateur —
donc j'ai besoin de pouvoir revenir en clair (contrairement au mot de passe, haché,
donc irréversible).

---

### 6. « La géolocalisation est opt-in »

**Opt-in** = **désactivé par défaut** ; l'utilisateur doit **donner son accord
explicite** pour l'activer. C'est l'inverse d'**opt-out** (activé d'office, à
l'utilisateur de le couper). Dans mon app, rien de géolocalisé ne se déclenche sans ce
consentement, que j'enregistre avec sa date. Rôle : conformité RGPD — on ne collecte
une donnée sensible (la position) qu'après un choix clair et volontaire de la personne.

---

### 7. « Mes 16 endpoints sont documentés en OpenAPI, générés depuis le code »

Un **endpoint** est une **route** accessible de mon API — une adresse associée à une
action (ex. `POST /auth/login` pour se connecter). **OpenAPI** est un **format
standard** qui décrit une API : ses routes, leurs paramètres, leurs réponses ; c'est
lisible par un humain (via l'interface Swagger) et par des outils. « **Générés depuis
le code** » = cette documentation est produite **automatiquement** à partir du code,
pas écrite à la main — donc elle reste toujours à jour. Rôle : interopérabilité (C9) et
contrat clair pour quiconque voudrait consommer mon API.

---

### 8. « Un PostgreSQL installé nativement captait le port, un conflit IPv4/IPv6 diagnostiqué via les logs réseau »

« **Nativement** » = installé directement sur Windows (pas dans Docker). « **Captait le
port** » = ce Postgres écoutait déjà sur le port 5432, celui que voulait mon conteneur
Docker. **IPv4 / IPv6** sont deux systèmes d'adressage réseau : `localhost` peut
pointer vers l'un (`127.0.0.1`, IPv4) **ou** l'autre (`::1`, IPv6). Le Postgres natif
occupait l'IPv4, mon conteneur l'IPv6 → mon application tapait sur le mauvais des deux,
d'où l'échec d'authentification. « **Logs réseau** » = j'ai inspecté quel programme
écoutait sur le port pour le diagnostiquer, puis j'ai déplacé mon conteneur sur un
autre port (5433).

---

**Réflexe pour l'oral :** si un mot de cette fiche te fait hésiter, ne le prononce pas
mécaniquement — reformule-le avec l'explication simple ci-dessus. Le jury préfère de
loin « je maîtrise l'idée et je l'explique clairement » à un terme technique récité.