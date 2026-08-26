import { fileURLToPath } from 'node:url';
import withBundleAnalyzerInit from '@next/bundle-analyzer';
import withSerwistInit from '@serwist/next';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Racine du monorepo pnpm sans ambiguïté (évite l'auto-détection de
  // Next.js face au pnpm-workspace.yaml à la racine du repo).
  outputFileTracingRoot: fileURLToPath(new URL('.', import.meta.url)),
  // 127.0.0.1 (utilisé par la config Playwright, §14) sinon Next.js 16
  // bloque par défaut les requêtes dev cross-origin (HMR notamment).
  allowedDevOrigins: ['127.0.0.1', 'localhost'],
};

// PWA (§10, C1). @serwist/next (v9, basé sur un plugin webpack) ne supporte
// pas Turbopack — devenu le bundler par défaut de Next.js 16 — d'où
// `--webpack` sur les scripts dev/build (voir package.json). Désactivé en
// dev pour éviter que le service worker ne serve des bundles périmés
// pendant `next dev` (Fast Refresh).
const withSerwist = withSerwistInit({
  swSrc: 'app/sw.ts',
  swDest: 'public/sw.js',
  disable: process.env.NODE_ENV === 'development',
});

// Mesure ponctuelle (§C5, passe éco-conception) : `ANALYZE=true pnpm build`
// ouvre un rapport visuel du bundle client. Désactivé par défaut, aucun
// effet sur `dev`/`build` normaux.
const withBundleAnalyzer = withBundleAnalyzerInit({
  enabled: process.env.ANALYZE === 'true',
  openAnalyzer: false,
});

export default withBundleAnalyzer(withSerwist(nextConfig));
