export interface ModeChipProps {
  /** Couleur du mode (hex) — voir design-system.md §2 et `lib/mode-labels.ts`. */
  color: string;
  initial: string;
  label: string;
  className?: string;
}

/**
 * Puce de mode (design-system.md §2, §4) : carré coloré + initiale blanche
 * **et** libellé texte visible — la couleur ne porte jamais seule
 * l'information (WCAG 1.4.1). Le carré est décoratif (`aria-hidden`) :
 * l'initiale y est redondante avec le libellé, lu par les lecteurs d'écran
 * via ce dernier.
 */
export function ModeChip({ color, initial, label, className }: ModeChipProps) {
  return (
    <span className={['inline-flex items-center gap-2', className].filter(Boolean).join(' ')}>
      <span
        aria-hidden="true"
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-xs font-semibold text-white"
        style={{ backgroundColor: color }}
      >
        {initial}
      </span>
      <span className="text-ink-900">{label}</span>
    </span>
  );
}
