# Design System — UrbanFlow Mobility

> Référence visuelle unique, extraite de la planche d'identité (Claude Design).
> À appliquer dans `apps/web`. Système sobre et fonctionnel, contrastes WCAG 2.1 AA,
> cibles tactiles ≥ 48 px. Sert de base à la refonte UI et au workstream C7.

## 1. Palette

**Bleus mobilité**
| Rôle | Nom | Hex |
| :---- | :---- | :---- |
| Titres, texte fort | Blue 900 | `#08376E` |
| **Primaire** (boutons, liens) · 7.4:1 | Blue 700 | `#0B4F9E` |
| Bordures actives | Blue 500 | `#2E7BD6` |
| Fonds de sélection | Blue 50 | `#E7EFF9` |

**Verts écologie**
| Rôle | Nom | Hex |
| :---- | :---- | :---- |
| Chiffres carbone | Green 900 | `#0A5138` |
| Succès, éco · 4.9:1 | Green 700 | `#0F7A54` |
| Graphes | Green 400 | `#3FA37C` |
| Fonds de badge | Green 50 | `#E4F2EB` |

**Neutres**
| Rôle | Nom | Hex |
| :---- | :---- | :---- |
| Texte principal | Ink 900 | `#12181F` |
| Texte secondaire | Ink 600 | `#4A5560` |
| Bordures | Line 200 | `#DCE2E8` |
| Fond app | Surface 50 | `#F4F6F8` |
| Cartes / fond pur | Surface 0 | `#FFFFFF` |
| Erreur | Alert 600 | `#B3261E` |

## 2. Couleurs par mode

| Mode   | Initiale | Hex       | Contraste |
| :----- | :------- | :-------- | :-------- |
| Métro  | M        | `#5B3B9E` | 8.2:1     |
| Bus    | B        | `#B24A05` | 5.3:1     |
| Vélo   | V        | `#0F7A54` | 4.9:1     |
| Marche | P        | `#0E6E86` | 5.1:1     |

**Règle stricte (WCAG 1.4.1) :** la couleur ne porte jamais seule l'information —
chaque mode est **toujours** accompagné de son initiale et de son libellé texte.
Ces couleurs servent aussi à colorer les **tronçons du tracé** sur la carte (F2-géométrie).

## 3. Typographie

**Polices :** `IBM Plex Sans` pour l'interface ; `IBM Plex Mono` pour les **données
chiffrées** (durées, CO₂, tarifs) — aligne les colonnes et rend les chiffres repérables.

| Style   | Taille / interligne | Graisse | Notes                    |
| :------ | :------------------ | :------ | :----------------------- |
| Display | 34 / 39             | 600     |                          |
| Titre 1 | 26 / 31             | 600     |                          |
| Titre 2 | 20 / 26             | 600     |                          |
| Corps L | 17 / 27             | 400     | taille mini corps mobile |
| Corps   | 15 / 24             | 400     | secondaire               |
| Label   | 13 / 18             | 600     | `+0.08em`, capitales     |
| Données | —                   | 500     | **IBM Plex Mono**        |

## 4. Composants & états

**Bouton primaire** — fond `Blue 700 #0B4F9E`, texte blanc.

- survol → `Blue 900 #08376E`
- focus clavier → contour noir 3 px, décalage 2 px
- désactivé → gris, `aria-disabled`

**Bouton secondaire** — bordure + texte `Blue 700`, fond transparent.

- survol → fond `Blue 50 #E7EFF9`
- focus clavier → contour noir 3 px
- désactivé → atténué

**Champ de saisie**

- défaut → bordure `Line 200`
- focus → bordure sombre 3 px (décalage)
- erreur → bordure `Alert 600` + message texte (« Format attendu : nom@domaine.fr »)
- désactivé → fond `Surface 50`, non modifiable

**Cartes**

- repos → bordure 1 px `Line 200`, rayon **14 px**, fond blanc
- sélectionnée → bordure 2 px `Blue 500` + fond teinté `Blue 50`

**Badges de classement** (itinéraires)

- Le plus rapide → fond `Blue 50` / texte `Blue 700`
- Le plus écologique → fond `Green 50` / texte `Green 700`
- Le moins cher → neutre (`Surface 50` / `Ink 900`)
- Perturbation → alerte (`Alert 600`)

**Puces de mode** — carré coloré (couleur du mode) avec l'initiale blanche + libellé
(ex. `M Métro 4`, `B Bus 27`).

## 5. Règles d'accessibilité appliquées (C7)

- **Contrastes** : texte ≥ 4.5:1 ; éléments d'interface et bordures ≥ 3:1. Jamais de
  gris clair sur blanc pour du texte.
- **Focus visible** : contour noir 3 px avec décalage 2 px sur **tous** les éléments
  interactifs, jamais supprimé.
- **Cibles tactiles** : hauteur mini **52 px** (boutons, champs), **8 px** d'espacement
  entre deux cibles.
- **Redondance de la couleur** : modes = couleur + initiale + libellé ; erreurs
  annoncées par un message texte.
- **Langage clair** : libellés explicites, **une action principale par écran**, pas de
  jargon ni d'abréviation non expliquée.
- **Zoom & reflow** : mise en page fluide jusqu'à **200 %** sans perte de contenu ni
  défilement horizontal.

## 6. Note d'implémentation (Tailwind 4)

`apps/web` est sur **Tailwind 4** → les tokens se déclarent en CSS via `@theme`, pas
dans un `tailwind.config.js`. Exemple de squelette à compléter :

```css
@theme {
  --color-blue-900: #08376e;
  --color-blue-700: #0b4f9e;
  --color-blue-500: #2e7bd6;
  --color-blue-50: #e7eff9;
  --color-green-900: #0a5138;
  --color-green-700: #0f7a54;
  --color-green-400: #3fa37c;
  --color-green-50: #e4f2eb;
  --color-ink-900: #12181f;
  --color-ink-600: #4a5560;
  --color-line-200: #dce2e8;
  --color-surface-50: #f4f6f8;
  --color-surface-0: #ffffff;
  --color-alert-600: #b3261e;
  --color-mode-metro: #5b3b9e;
  --color-mode-bus: #b24a05;
  --color-mode-velo: #0f7a54;
  --color-mode-marche: #0e6e86;
  --font-sans: 'IBM Plex Sans', system-ui, sans-serif;
  --font-mono: 'IBM Plex Mono', ui-monospace, monospace;
  --radius-card: 14px;
}
```

Charger les polices via `next/font` (IBM Plex Sans + Mono). Rayons : cartes 14 px ;
boutons/champs ~10 px (à caler sur les maquettes).
