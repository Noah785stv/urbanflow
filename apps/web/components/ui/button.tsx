import type { ButtonHTMLAttributes } from 'react';
import { FOCUS_RING, MIN_TARGET } from './tokens';

export type ButtonVariant = 'primary' | 'secondary';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const BASE_CLASS = `inline-flex items-center justify-center rounded-control px-6 font-semibold transition-colors ${MIN_TARGET} ${FOCUS_RING}`;

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: 'bg-brand-blue-700 text-white hover:bg-brand-blue-900',
  secondary:
    'border border-brand-blue-700 bg-transparent text-brand-blue-700 hover:bg-brand-blue-50',
};

const DISABLED_CLASS = 'opacity-50 cursor-not-allowed';

/**
 * Bouton primaire/secondaire (design-system.md §4). Désactivé via
 * `aria-disabled` plutôt que l'attribut natif `disabled` — le bouton reste
 * focusable et repérable au clavier (choix explicite du design system), le
 * clic est simplement neutralisé.
 */
export function Button({
  variant = 'primary',
  disabled,
  className,
  onClick,
  ...props
}: ButtonProps) {
  return (
    <button
      aria-disabled={disabled || undefined}
      onClick={(event) => {
        if (disabled) {
          event.preventDefault();
          return;
        }
        onClick?.(event);
      }}
      className={[BASE_CLASS, VARIANT_CLASS[variant], disabled ? DISABLED_CLASS : '', className]
        .filter(Boolean)
        .join(' ')}
      {...props}
    />
  );
}
