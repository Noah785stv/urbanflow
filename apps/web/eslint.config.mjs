import { defineConfig, globalIgnores } from 'eslint/config';
import { configs, helpers } from 'eslint-config-airbnb-extended';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

// CLAUDE.md (Standards de qualité) : eslint-config-next (règles Next.js) +
// eslint-config-airbnb-extended (style guide Airbnb) — natif flat-config,
// contrairement à eslint-config-airbnb-typescript (archivé). `configs.next.typescript`
// est la combinaison documentée par le paquet (base + react + next, plugins
// inclus) ; `configs.base`/`configs.react` seuls omettent l'enregistrement
// des plugins (ex. @stylistic) et échouent au chargement.
const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  ...configs.next.typescript,
  {
    settings: helpers.getImportSettings({
      javascript: false,
      typescript: true,
      jsx: true,
    }),
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    'public/sw.js',
    'coverage/**',
    'playwright-report/**',
    'test-results/**',
  ]),
]);

export default eslintConfig;
