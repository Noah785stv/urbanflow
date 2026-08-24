import type { MetadataRoute } from 'next';

/** Manifest PWA (§10, C1) — `next` l'expose automatiquement sur /manifest.webmanifest. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'UrbanFlow Mobility',
    short_name: 'UrbanFlow',
    description: 'Planificateur de trajets multimodaux et empreinte carbone.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f4f4f5',
    theme_color: '#1d4ed8',
    lang: 'fr',
    icons: [
      {
        src: '/icons/icon.svg',
        sizes: '192x192 512x512',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: '/icons/icon.svg',
        sizes: '192x192 512x512',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
    ],
  };
}
