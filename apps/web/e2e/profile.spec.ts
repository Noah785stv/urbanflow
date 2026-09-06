import { expect, test } from '@playwright/test';
import { API_BASE, loginViaUi, mockNetwork } from './helpers';

/**
 * Page Profil (§4 F1) : consultation du compte + édition des préférences déjà
 * exposées par `GET/PATCH /users/me`, et suppression de compte (`DELETE`).
 * API mockée de bout en bout (§12) — aucun backend réel requis.
 */
test('modifier ses préférences de mobilité depuis la page Profil', async ({ page }) => {
  await mockNetwork(page);

  let patchedBody: unknown = null;
  await page.route(`${API_BASE}/users/me`, async (route) => {
    if (route.request().method() !== 'PATCH') {
      await route.fallback();
      return;
    }
    patchedBody = route.request().postDataJSON();
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'user-e2e',
        email: 'e2e@urbanflow.test',
        emailVerified: true,
        role: 'citizen',
        createdAt: new Date().toISOString(),
        mobilityProfile: {
          preferredModes: ['bus'],
          constraints: { pmr: false, personalBike: false },
          transportSubscriptions: [],
          geolocationConsent: false,
          geolocationConsentAt: null,
          hasHomeLocation: false,
          hasWorkLocation: false,
        },
      }),
    });
  });

  await loginViaUi(page);
  await expect(page).toHaveURL('/');

  await page.getByRole('link', { name: 'Profil' }).click();
  await expect(page).toHaveURL('/profil');
  // L'e-mail apparaît aussi dans l'en-tête (§app-header) : on cible la
  // section « Informations du compte » pour éviter l'ambiguïté.
  const accountSection = page.getByRole('region', { name: 'Informations du compte' });
  await expect(accountSection.getByText('e2e@urbanflow.test')).toBeVisible();

  await page.getByRole('checkbox', { name: 'Bus' }).check();
  await page.getByRole('button', { name: 'Enregistrer' }).click();

  await expect(page.getByText('Préférences enregistrées.')).toBeVisible();
  expect(patchedBody).toEqual({
    preferredModes: ['bus'],
    constraints: { pmr: false, personalBike: false },
    transportSubscriptions: [],
  });
});

test('supprimer son compte redirige vers /login après confirmation explicite', async ({ page }) => {
  await mockNetwork(page);

  let deleteWasCalled = false;
  await page.route(`${API_BASE}/users/me`, async (route) => {
    if (route.request().method() !== 'DELETE') {
      await route.fallback();
      return;
    }
    deleteWasCalled = true;
    await route.fulfill({ status: 204 });
  });
  await page.route(`${API_BASE}/auth/logout`, async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: 'null' });
  });

  await loginViaUi(page);
  await expect(page).toHaveURL('/');

  await page.getByRole('link', { name: 'Profil' }).click();
  await expect(page).toHaveURL('/profil');

  await page.getByRole('button', { name: 'Supprimer mon compte' }).click();
  await expect(page.getByText('définitive et immédiate')).toBeVisible();
  expect(deleteWasCalled).toBe(false);

  await page.getByRole('button', { name: 'Confirmer la suppression' }).click();

  await expect(page).toHaveURL('/login');
  expect(deleteWasCalled).toBe(true);
});
