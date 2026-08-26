import withBundleAnalyzerInit from '@next/bundle-analyzer';
import withSerwistInit from '@serwist/next';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Pas d'`outputFileTracingRoot` explicite : sur Vercel, avec Root
  // Directory = apps/web (réglage projet, confirmé), le tracing de fichiers
  // est configuré automatiquement — Next.js le documente explicitement pour
  // les déploiements Vercel. Un override pointant vers la racine du
  // monorepo entrait en conflit avec cette détection automatique et faisait
  // chercher .next à la racine du dépôt au lieu d'apps/web/.next
  // (ENOENT sur .next/package.json au déploiement). Repli implicite sur
  // l'auto-détection de Next.js si un jour ce projet est self-hosté
  // (Docker, `next start` hors Vercel) sans Root Directory équivalent.
  //
  // Package workspace partagé (types uniquement, mais webpack doit quand
  // même le traiter en JS pour le build du front).
  transpilePackages: ['@urbanflow/shared-types'],
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
