import { expect, test } from '@playwright/test';
import { API_BASE, fillAddress, loginViaUi, mockNetwork } from './helpers';

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
  ],
  stale: false,
  updatedAt: new Date().toISOString(),
};

/**
 * Restauration après rechargement (§9) : les jetons ne vivent qu'en mémoire
 * JS -- un refresh déconnecte systématiquement (comportement documenté et
 * assumé, `lib/token-store.ts`). Ce qu'on teste ici : une fois reconnecté,
 * le formulaire et les résultats du dernier trajet réapparaissent plutôt
 * qu'un planificateur vide (`lib/last-plan-cache.ts`).
 */
test.describe('Restauration du dernier trajet après reconnexion', () => {
  test('origine, destination et itinéraires réapparaissent après un refresh + reconnexion', async ({
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

    await loginViaUi(page);
    await expect(page).toHaveURL('/');

    await fillAddress(page, 'Origine', 'Origine test');
    await fillAddress(page, 'Destination', 'Destination test');
    await page.getByRole('button', { name: 'Calculer' }).click();
    await expect(page.getByRole('status')).toContainText('1 itinéraire trouvé');

    // Rechargement réel : perd la session (§9, comportement attendu), pas
    // seulement une navigation cliente.
    await page.reload({ waitUntil: 'networkidle' });
    await expect(page).toHaveURL('/login');

    await page.getByLabel('E-mail').fill('e2e@urbanflow.test');
    await page.getByLabel('Mot de passe').fill('un-mot-de-passe-tres-solide');
    await page.getByLabel('Mot de passe').press('Enter');
    await expect(page).toHaveURL('/');

    // Formulaire repeuplé sans nouvelle recherche...
    await expect(page.getByRole('combobox', { name: 'Origine' })).toHaveValue(
      'Place de la Mairie, 35000 Rennes',
    );
    await expect(page.getByRole('combobox', { name: 'Destination' })).toHaveValue(
      'Gare de Rennes, 35000 Rennes',
    );
    // ...et les résultats du dernier calcul aussi, sans appel réseau requis
    // pour les afficher (la seule route /trips/plan mockée est celle
    // déclenchée par le clic "Calculer" plus haut).
    await expect(page.getByRole('status').filter({ hasText: 'itinéraire' })).toContainText(
      '1 itinéraire trouvé',
    );
  });

  test('une recherche manuelle après restauration écrase bien l’état restauré', async ({
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

    await loginViaUi(page);
    await expect(page).toHaveURL('/');
    await fillAddress(page, 'Origine', 'Origine test');
    await fillAddress(page, 'Destination', 'Destination test');
    await page.getByRole('button', { name: 'Calculer' }).click();
    await expect(page.getByRole('status')).toContainText('1 itinéraire trouvé');

    await page.reload({ waitUntil: 'networkidle' });
    await page.getByLabel('E-mail').fill('e2e@urbanflow.test');
    await page.getByLabel('Mot de passe').fill('un-mot-de-passe-tres-solide');
    await page.getByLabel('Mot de passe').press('Enter');
    await expect(page).toHaveURL('/');
    await expect(page.getByRole('combobox', { name: 'Origine' })).toHaveValue(
      'Place de la Mairie, 35000 Rennes',
    );

    // L'utilisateur tape une nouvelle destination : l'état restauré ne doit
    // pas la ré-écraser au rendu suivant (régression du pattern « state
    // comparé au rendu précédent », pas un simple effet ponctuel).
    const destinationField = page.getByRole('combobox', { name: 'Destination' });
    await destinationField.fill('');
    await destinationField.fill('Autre destination');
    await expect(destinationField).toHaveValue('Autre destination');
  });

  test('la déconnexion efface le trajet mémorisé (poste partagé)', async ({ page }) => {
    await mockNetwork(page);
    await page.route(`${API_BASE}/trips/plan`, async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(PLAN_RESPONSE),
      });
    });

    await loginViaUi(page);
    await expect(page).toHaveURL('/');
    await fillAddress(page, 'Origine', 'Origine test');
    await fillAddress(page, 'Destination', 'Destination test');
    await page.getByRole('button', { name: 'Calculer' }).click();
    await expect(page.getByRole('status')).toContainText('1 itinéraire trouvé');
    expect(
      await page.evaluate(() => window.localStorage.getItem('urbanflow:last-plan')),
    ).not.toBeNull();

    await page.getByRole('button', { name: 'Se déconnecter' }).click();
    await expect(page).toHaveURL('/login');
    expect(
      await page.evaluate(() => window.localStorage.getItem('urbanflow:last-plan')),
    ).toBeNull();

    // Une autre personne se connecte sur ce même navigateur : formulaire
    // vide, pas le trajet de la précédente.
    await page.getByLabel('E-mail').fill('e2e@urbanflow.test');
    await page.getByLabel('Mot de passe').fill('un-mot-de-passe-tres-solide');
    await page.getByLabel('Mot de passe').press('Enter');
    await expect(page).toHaveURL('/');
    await expect(page.getByRole('combobox', { name: 'Origine' })).toHaveValue('');
  });
});
