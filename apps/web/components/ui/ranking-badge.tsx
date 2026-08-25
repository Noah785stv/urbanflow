import type { ReactNode } from 'react';

export type RankingVariant = 'fastest' | 'greenest' | 'cheapest' | 'disruption';

export interface RankingBadgeProps {
  variant: RankingVariant;
  children: ReactNode;
}

// `disruption` : le design system (§4) ne précise qu'un texte "alerte (Alert
// 600)" sans fond, contrairement aux trois autres variantes ("fond X / texte
// Y") — traité en contour (bordure + texte Alert 600, fond blanc) plutôt
// qu'un aplat, cohérent avec le traitement des erreurs ailleurs dans l'app.
const VARIANT_CLASS: Record<RankingVariant, string> = {
  fastest: 'bg-brand-blue-50 text-brand-blue-700',
  greenest: 'bg-brand-green-50 text-brand-green-700',
  cheapest: 'bg-surface-50 text-ink-900',
  disruption: 'border border-alert-600 bg-surface-0 text-alert-600',
};

/** Badge de classement d'itinéraire (design-system.md §4). */
export function RankingBadge({ variant, children }: RankingBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${VARIANT_CLASS[variant]}`}
    >
      {children}
    </span>
  );
}
