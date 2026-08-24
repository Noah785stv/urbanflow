/**
 * Classes Tailwind partagées (§11 C7 : contrastes AA vérifiés une fois ici
 * plutôt que redérivés à chaque composant). `FOCUS_RING` assure un indicateur
 * de focus visible partout (clavier obligatoire, §11).
 */
export const FOCUS_RING =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700';

export const INPUT_CLASS = `rounded border border-zinc-600 bg-white px-3 py-2 text-zinc-900 disabled:opacity-60 ${FOCUS_RING}`;

export const LABEL_CLASS = 'font-medium text-zinc-900';

export const PRIMARY_BUTTON_CLASS = `rounded bg-blue-700 px-4 py-2 font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60 ${FOCUS_RING}`;

export const SECONDARY_BUTTON_CLASS = `rounded border border-zinc-600 px-4 py-2 font-semibold text-zinc-900 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60 ${FOCUS_RING}`;

export const ERROR_TEXT_CLASS = 'text-sm font-medium text-red-700';

export const HINT_TEXT_CLASS = 'text-sm text-zinc-700';
