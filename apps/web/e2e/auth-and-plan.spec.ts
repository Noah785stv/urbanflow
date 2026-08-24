import { expect, test } from '@playwright/test';
import { API_BASE, loginViaUi, mockNetwork } from './helpers';

const PLAN_RESPONSE = {
  journeys: [
    {
      departureAt: '2026-08-17T08:00:00+02:00',
      arrivalAt: '2026-08-17T08:16:00+02:00',
      durationSeconds: 960,
      sections: [{ mode: 'bus', durationSeconds: 960, distanceMeters: 3000 }],
      co2Grams: 339,
      estimatedCostCents: 180,
      labels: ['fastest'],
    },
    {
      departureAt: '2026-08-17T08:05:00+02:00',
      arrivalAt: '2026-08-17T08:30:00+02:00',
      durationSeconds: 1500,
      sections: [{ mode: 'metro', durationSeconds: 1500, distanceMeters: 2600 }],
      co2Grams: 10,
      estimatedCostCents: 180,
      labels: ['greenest', 'cheapest'],
    },
    {
      departureAt: '2026-08-17T08:10:00+02:00',
      arrivalAt: '2026-08-17T08:40:00+02:00',
      durationSeconds: 1800,
      sections: [{ mode: 'car_solo', durationSeconds: 1800, distanceMeters: 8000 }],
      co2Grams: 1544,
      estimatedCostCents: 240,
      labels: [],
    },
  ],
  stale: false,
  updatedAt: new Date().toISOString(),
};

test('une route protégée redirige vers /login sans authentification (§5, §13)', async ({
  page,
}) => {
  // La garde de route est un effet React (§9, pas de session côté serveur) :
  // il faut attendre l'hydratation avant que la redirection ne se déclenche.
  await page.goto('/', { waitUntil: 'networkidle' });
  await expect(page).toHaveURL('/login');
});

test('connexion (clavier) -> calcul -> 3 options classées -> sélection au clavier', async ({
  page,
}) => {
  await mockNetwork(page);
  await page.route(`${API_BASE}/trips/plan`, async (route) => {
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify(PLAN_RESPONSE),
    });
  });

  await page.goto('/login', { waitUntil: 'networkidle' });
  await page.getByLabel('E-mail').fill('e2e@urbanflow.test');
  await page.getByLabel('Mot de passe').fill('un-mot-de-passe-tres-solide');
  await page.getByLabel('Mot de passe').press('Enter');

  await expect(page).toHaveURL('/');
  await expect(page.getByRole('heading', { name: 'Planifier un trajet' })).toBeVisible();

  // Origine/destination au clavier — chemin accessible sans carte ni souris (§11).
  await page.locator('#origin-lat').fill('48.1173');
  await page.locator('#origin-lat').blur();
  await page.locator('#origin-lon').fill('-1.6778');
  await page.locator('#origin-lon').blur();
  await page.locator('#destination-lat').fill('48.1032');
  await page.locator('#destination-lat').blur();
  await page.locator('#destination-lon').fill('-1.6726');
  await page.locator('#destination-lon').blur();

  const calculateButton = page.getByRole('button', { name: 'Calculer' });
  await expect(calculateButton).toBeEnabled();
  await calculateButton.click();

  await expect(page.getByRole('status')).toContainText('3 itinéraires trouvés');
  await expect(page.getByText('Le plus rapide')).toBeVisible();
  await expect(page.getByText('Le plus écologique')).toBeVisible();
  await expect(page.getByText('Le moins cher')).toBeVisible();

  // Localisé par position (pas par le texte "Sélectionner"), qui change
  // après le clic — un locator filtré par ce texte ne se retrouverait plus.
  const resultsList = page.locator('section ol').first();
  const firstResultItem = resultsList.locator(':scope > li').first();
  const firstSelectButton = firstResultItem.getByRole('button').first();

  await firstSelectButton.focus();
  await page.keyboard.press('Enter');
  await expect(firstSelectButton).toHaveText('✓ Sélectionné');
});

test('mode dégradé : réponse stale et vide affichée sans jamais planter (§4.6-like)', async ({
  page,
}) => {
  await mockNetwork(page);
  await page.route(`${API_BASE}/trips/plan`, async (route) => {
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({ journeys: [], stale: true, updatedAt: null }),
    });
  });

  await loginViaUi(page);
  await expect(page).toHaveURL('/');

  await page.locator('#origin-lat').fill('48.1173');
  await page.locator('#origin-lon').fill('-1.6778');
  await page.locator('#origin-lon').blur();
  await page.locator('#destination-lat').fill('48.1032');
  await page.locator('#destination-lon').fill('-1.6726');
  await page.locator('#destination-lon').blur();

  await page.getByRole('button', { name: 'Calculer' }).click();

  await expect(page.getByRole('status')).toContainText('temporairement indisponible');
});
