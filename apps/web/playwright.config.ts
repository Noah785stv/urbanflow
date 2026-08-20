import { defineConfig, devices } from '@playwright/test';

/**
 * E2E + axe-core (§14). Aucun backend réel : les routes API sont
 * interceptées via `page.route()` dans chaque test (§12 : pas d'appel
 * réseau réel non maîtrisé en CI).
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'html',
  use: {
    baseURL: 'http://127.0.0.1:3100',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    // Mode dev (pas `next start`) pour ne pas exiger un `pnpm build` préalable
    // dans la commande e2e ; le SW est de toute façon désactivé en dev.
    command: 'pnpm exec next dev --webpack --port 3100',
    url: 'http://127.0.0.1:3100',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
