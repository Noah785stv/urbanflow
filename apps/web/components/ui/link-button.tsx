import Link, { type LinkProps } from 'next/link';
import type { AnchorHTMLAttributes } from 'react';
import { BUTTON_BASE_CLASS, BUTTON_VARIANT_CLASS, type ButtonVariant } from './tokens';

export interface LinkButtonProps
  extends LinkProps, Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps> {
  variant?: ButtonVariant;
}

/**
 * Même apparence que `Button` (design-system.md §4), mais pour une
 * navigation (`<a>` via `next/link`) plutôt qu'une action — les pages
 * d'erreur (404, erreur générique, 403) ont besoin d'un lien de retour qui
 * *ressemble* à un bouton sans en être un sémantiquement.
 */
export function LinkButton({ variant = 'primary', className, ...props }: LinkButtonProps) {
  return (
    <Link
      className={[BUTTON_BASE_CLASS, BUTTON_VARIANT_CLASS[variant], className]
        .filter(Boolean)
        .join(' ')}
      {...props}
    />
  );
}
