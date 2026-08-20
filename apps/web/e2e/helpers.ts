import type { Page } from '@playwright/test';

export const API_BASE = 'http://localhost:3001/api/v1';

// PNG transparent 1x1 — évite tout appel réseau réel vers les tuiles OSM en test (§12, §14).
const BLANK_TILE_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);

const DEFAULT_ME_RESPONSE = {
  id: 'user-e2e',
  email: 'e2e@urbanflow.test',
  emailVerified: true,
  role: 'citizen',
  createdAt: new Date().toISOString(),
  mobilityProfile: {
    preferredModes: [],
    constraints: { pmr: false, personalBike: false },
    transportSubscriptions: [],
    geolocationConsent: false,
    geolocationConsentAt: null,
    hasHomeLocation: false,
    hasWorkLocation: false,
  },
};

export async function mockNetwork(page: Page): Promise<void> {
  await page.route('**/*.tile.openstreetmap.org/**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'image/png', body: BLANK_TILE_PNG });
  });

  await page.route(`${API_BASE}/auth/login`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ accessToken: 'access-e2e', refreshToken: 'refresh-e2e' }),
    });
  });

  await page.route(`${API_BASE}/users/me`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(DEFAULT_ME_RESPONSE),
    });
  });
}

export async function loginViaUi(page: Page): Promise<void> {
  // `networkidle` : en mode dev, la route est compilée à la demande — le
  // HTML sert avant que le bundle d'hydratation soit prêt, sinon Entrée
  // déclenche une soumission native (GET) au lieu du handler React.
  await page.goto('/login', { waitUntil: 'networkidle' });
  await page.getByLabel('E-mail').fill('e2e@urbanflow.test');
  await page.getByLabel('Mot de passe').fill('un-mot-de-passe-tres-solide');
  await page.getByRole('button', { name: 'Se connecter' }).click();
}
