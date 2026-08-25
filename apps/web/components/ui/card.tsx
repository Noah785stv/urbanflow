import type { HTMLAttributes } from 'react';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  selected?: boolean;
}

/**
 * Carte (design-system.md §4) : repos = bordure 1 px Line 200 + fond blanc ;
 * sélectionnée = bordure 2 px Blue 500 + fond teinté Blue 50. Purement
 * visuel — la sémantique de sélection (aria-pressed, aria-selected…) reste
 * à la charge de l'appelant selon le contexte d'usage.
 */
export function Card({ selected, className, ...props }: CardProps) {
  return (
    <div
      className={[
        'rounded-card p-4',
        selected
          ? 'border-2 border-brand-blue-500 bg-brand-blue-50'
          : 'border border-line-200 bg-surface-0',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    />
  );
}
