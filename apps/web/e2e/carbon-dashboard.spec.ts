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
      labels: ['fastest', 'greenest', 'cheapest'],
    },
  ],
  stale: false,
  updatedAt: new Date().toISOString(),
};

const CONFIRMED_LOG = {
  id: 'log-e2e',
  loggedAt: '2026-08-17T08:00:00.000Z',
  co2Grams: 339,
  distanceMeters: 3000,
  referenceCo2Grams: 579,
  savedGrams: 240,
  modeBreakdown: [{ mode: 'bus', distanceMeters: 3000, co2Grams: 339 }],
  createdAt: '2026-08-17T08:16:00.000Z',
};

/**
 * Parcours F4-web (§11) : confirmer un trajet depuis le planificateur, puis
 * le retrouver au tableau de bord. API mockée de bout en bout (§12) — aucun
 * backend réel requis.
 */
test('enregistrer un trajet depuis le planificateur -> il apparaît au tableau de bord', async ({
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

  let confirmedBody: unknown = null;
  await page.route(`${API_BASE}/carbon-logs`, async (route) => {
    if (route.request().method() !== 'POST') {
      await route.fallback();
      return;
    }
    confirmedBody = route.request().postDataJSON();
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify(CONFIRMED_LOG),
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

  await expect(page.getByRole('status')).toContainText('itinéraire');

  const resultsList = page.locator('section ol').first();
  const firstResultItem = resultsList.locator(':scope > li').first();
  await firstResultItem.getByRole('button', { name: 'Sélectionner' }).click();

  await firstResultItem.getByRole('button', { name: 'Enregistrer ce trajet' }).click();
  await expect(firstResultItem.getByRole('status')).toContainText('Trajet enregistré');

  // Corps réduit à { mode, distanceMeters } (F4-carbon.md §6, piège #1) --
  // vérifié directement sur la requête interceptée, pas seulement sur l'UI.
  expect(confirmedBody).toEqual({
    sections: [{ mode: 'bus', distanceMeters: 3000 }],
  });

  await page.route(`${API_BASE}/carbon-logs/summary`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        totalCo2Grams: 339,
        totalSavedGrams: 240,
        monthly: [{ month: '2026-08', co2Grams: 339, savedGrams: 240, tripCount: 1 }],
      }),
    });
  });
  await page.route(`${API_BASE}/carbon-logs?*`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items: [CONFIRMED_LOG], total: 1, page: 1, limit: 10 }),
    });
  });

  await page.getByRole('link', { name: 'Tableau de bord' }).click();
  await expect(page).toHaveURL('/dashboard');

  // Carte de résumé "CO₂ cumulé" -- `.last()` prend le div le plus imbriqué
  // (les ancestors matchent aussi `hasText`) ; la même valeur (339 g) apparaît
  // aussi dans la table mensuelle pour ce scénario à un seul trajet.
  const co2SummaryCard = page.locator('div').filter({ hasText: 'CO₂ cumulé (12 mois)' }).last();
  await expect(co2SummaryCard).toContainText('339 g CO2e');

  // Mode + distance rendus dans un ModeChip séparé du span de données mono
  // (design-system.md §2/§3) -- deux nœuds de texte distincts, pas un seul.
  await expect(page.getByText('Bus')).toBeVisible();
  await expect(page.getByText('(3.0 km)')).toBeVisible();
});
