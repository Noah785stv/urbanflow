import type { ButtonHTMLAttributes } from 'react';
import { BUTTON_BASE_CLASS, BUTTON_VARIANT_CLASS, type ButtonVariant } from './tokens';

export type { ButtonVariant };

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

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
      className={[
        BUTTON_BASE_CLASS,
        BUTTON_VARIANT_CLASS[variant],
        disabled ? DISABLED_CLASS : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    />
  );
}
