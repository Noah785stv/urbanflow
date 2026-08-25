import { useId, type InputHTMLAttributes } from 'react';
import { FOCUS_RING, MIN_TARGET } from './tokens';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  id: string;
  label: string;
  /** Message d'erreur (design-system.md §4) — sa présence bascule le champ en état erreur. */
  error?: string;
  hint?: string;
}

const LABEL_CLASS =
  'text-[13px] font-semibold uppercase tracking-[0.08em] leading-[18px] text-ink-900';

const BASE_CLASS = `w-full rounded-control border bg-surface-0 px-4 text-ink-900 disabled:bg-surface-50 disabled:text-ink-600 ${MIN_TARGET} ${FOCUS_RING}`;

/**
 * Champ de saisie (design-system.md §4) : label + champ + message d'erreur
 * ou d'aide, `aria-invalid`/`aria-describedby` posés automatiquement — pas à
 * l'appelant de les câbler à chaque usage.
 */
export function Input({ id, label, error, hint, className, ...props }: InputProps) {
  const hintId = useId();
  const errorId = useId();
  const describedBy =
    [hint && !error ? hintId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined;

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className={LABEL_CLASS}>
        {label}
      </label>
      <input
        id={id}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={describedBy}
        className={[BASE_CLASS, error ? 'border-alert-600' : 'border-line-200', className]
          .filter(Boolean)
          .join(' ')}
        {...props}
      />
      {hint && !error && (
        <p id={hintId} className="text-sm text-ink-600">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-sm font-medium text-alert-600">
          {error}
        </p>
      )}
    </div>
  );
}
