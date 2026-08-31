import type { Page } from '@playwright/test';
import type { StationNearbyResult } from '@urbanflow/shared-types';

export const API_BASE = 'http://localhost:3001/api/v1';
export const GEOCODING_BASE = 'https://data.geopf.fr/geocodage';

// Fixture GBFS (§8-14 web-gbfs-stations.md) — deux stations, l'une avec
// statut temps réel, l'autre `status: null` (cas explicitement à gérer).
export const STATIONS_NEARBY_FIXTURE: StationNearbyResult[] = [
  {
    station: {
      id: 'station-mairie',
      provider: 'star-le-velo-star',
      externalId: 'ext-mairie',
      name: 'Mairie',
      stationType: 'dock',
      location: { latitude: 48.1173, longitude: -1.6778 },
      capacity: 20,
    },
    distanceMeters: 120,
    status: {
      provider: 'star-le-velo-star',
      externalId: 'ext-mairie',
      bikesAvailable: 4,
      docksAvailable: 16,
      updatedAt: new Date().toISOString(),
      stale: false,
    },
  },
  {
    station: {
      id: 'station-gare',
      provider: 'star-le-velo-star',
      externalId: 'ext-gare',
      name: 'Gare de Rennes',
      stationType: 'dock',
      location: { latitude: 48.1032, longitude: -1.6726 },
      capacity: 30,
    },
    distanceMeters: 850,
    status: null,
  },
];

// PNG transparent 1x1 — évite tout appel réseau réel vers les tuiles OSM en test (§12, §14).
const BLANK_TILE_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);

// Fixtures de géocodage (§A.7 web-geocoding-and-pages.md) — jamais d'appel
// réel à data.geopf.fr en test. Coordonnées reprises de l'ancienne saisie
// lat/lon manuelle (Place de la Mairie / Gare de Rennes).
const GEOCODING_FIXTURES: Record<string, { label: string; latitude: number; longitude: number }> = {
  'Origine test': {
    label: 'Place de la Mairie, 35000 Rennes',
    latitude: 48.1173,
    longitude: -1.6778,
  },
  'Destination test': {
    label: 'Gare de Rennes, 35000 Rennes',
    latitude: 48.1032,
    longitude: -1.6726,
  },
};

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

  await page.route(`${GEOCODING_BASE}/search/**`, async (route) => {
    const url = new URL(route.request().url());
    const fixture = GEOCODING_FIXTURES[url.searchParams.get('q') ?? ''];
    const features = fixture
      ? [
          {
            properties: { label: fixture.label },
            geometry: { coordinates: [fixture.longitude, fixture.latitude] },
          },
        ]
      : [];
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ type: 'FeatureCollection', features }),
    });
  });
}

/**
 * Mocke `GET /stations/nearby` (§3, §14 web-gbfs-stations.md) -- jamais
 * d'appel réel en test. `stations` par défaut : `STATIONS_NEARBY_FIXTURE` ;
 * passer `[]` ou un statut HTTP d'erreur pour les cas vide/erreur.
 */
export async function mockStationsNearby(
  page: Page,
  stations: StationNearbyResult[] = STATIONS_NEARBY_FIXTURE,
  status = 200,
): Promise<void> {
  await page.route(`${API_BASE}/stations/nearby**`, async (route) => {
    if (status !== 200) {
      await route.fulfill({ status, contentType: 'application/json', body: '{}' });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(stations),
    });
  });
}

/**
 * Saisit une requête de recherche connue de `GEOCODING_FIXTURES` dans le
 * champ `AddressAutocomplete` visé par `fieldLabel`, et sélectionne l'unique
 * suggestion mockée renvoyée — au clavier (↓ puis Entrée), jamais à la
 * souris, pour que chaque usage de ce helper reste une preuve du parcours
 * accessible sans pointeur (§11, §A.3).
 */
export async function fillAddress(page: Page, fieldLabel: string, query: string): Promise<void> {
  const fixture = GEOCODING_FIXTURES[query];
  if (!fixture) {
    throw new Error(`Aucun mock géocodage pour la requête "${query}" (voir GEOCODING_FIXTURES).`);
  }
  const combobox = page.getByRole('combobox', { name: fieldLabel });
  await combobox.fill(query);
  await page.getByRole('option', { name: fixture.label }).waitFor();
  await combobox.press('ArrowDown');
  await combobox.press('Enter');
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
