/**
 * Fragments Tailwind partagés par les composants `components/ui/*`
 * (design-system.md §4-5). Séparé de `lib/styles.ts` (qui reste utilisé tel
 * quel par les écrans non encore migrés) pour ne rien changer ailleurs tant
 * que la propagation n'est pas décidée.
 */

/**
 * Focus visible : contour noir 3 px, décalage 2 px, jamais supprimé (§5).
 * Implémenté via `ring`/`ring-offset` (box-shadow) plutôt que la propriété
 * CSS `outline` : constaté à l'usage (vérifié en navigateur réel, pas
 * deviné) que `<button>` — natif, `appearance: button` non réinitialisé par
 * Preflight — ignore `outline-color` en focus-visible quel que soit le
 * mécanisme Tailwind utilisé (mot-clé, `var()`, hex direct), alors que le
 * même utilitaire fonctionne correctement sur `<input>`. `ring-*` est
 * peint via `box-shadow`, indépendant du rendu natif du widget bouton.
 */
export const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#000] focus-visible:ring-offset-2';

/** Cible tactile minimale 52 px (§5). */
export const MIN_TARGET = 'min-h-[52px]';

export type ButtonVariant = 'primary' | 'secondary';

/** Classes partagées par `Button` (action) et `LinkButton` (navigation) — même apparence, sémantique différente. */
export const BUTTON_BASE_CLASS = `inline-flex items-center justify-center rounded-control px-6 font-semibold transition-colors ${MIN_TARGET} ${FOCUS_RING}`;

export const BUTTON_VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: 'bg-brand-blue-700 text-white hover:bg-brand-blue-900',
  secondary:
    'border border-brand-blue-700 bg-transparent text-brand-blue-700 hover:bg-brand-blue-50',
};
