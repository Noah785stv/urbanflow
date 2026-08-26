import { expect, test } from '@playwright/test';
import { fillAddress, loginViaUi, mockNetwork } from './helpers';

/**
 * Chargement différé de la carte (§C5, passe éco-conception) : ni le chunk
 * Leaflet ni les tuiles OSM ne doivent être chargés tant que la carte n'a
 * pas été sollicitée -- preuve réseau (pas seulement DOM), pour vérifier ce
 * que le bundle analyzer avait chiffré (9 requêtes de tuiles dès l'affichage
 * du planificateur, avant toute interaction).
 */
test.describe('Chargement différé de la carte', () => {
  test('aucune tuile ni carte chargée avant sollicitation, placeholder accessible', async ({
    page,
  }) => {
    let tileRequestCount = 0;
    page.on('request', (request) => {
      if (request.url().includes('tile.openstreetmap.org')) {
        tileRequestCount += 1;
      }
    });

    await mockNetwork(page);
    await loginViaUi(page);
    await expect(page).toHaveURL('/');

    await expect(page.locator('.leaflet-container')).toHaveCount(0);
    const placeholderButton = page.getByRole('button', { name: 'Afficher la carte' });
    await expect(placeholderButton).toBeVisible();
    expect(tileRequestCount).toBe(0);
  });

  test('activer le placeholder (clavier compris) monte la carte', async ({ page }) => {
    await mockNetwork(page);
    await loginViaUi(page);
    await expect(page).toHaveURL('/');

    const placeholderButton = page.getByRole('button', { name: 'Afficher la carte' });
    await placeholderButton.focus();
    await page.keyboard.press('Enter');

    await expect(page.locator('.leaflet-container')).toBeVisible();
  });

  test('focaliser un champ d’adresse monte aussi la carte', async ({ page }) => {
    await mockNetwork(page);
    await loginViaUi(page);
    await expect(page).toHaveURL('/');

    await page.getByRole('combobox', { name: 'Origine' }).focus();

    await expect(page.locator('.leaflet-container')).toBeVisible();
  });

  test('une fois montée, la carte reste affichée pour le reste de la session', async ({ page }) => {
    await mockNetwork(page);
    await loginViaUi(page);
    await expect(page).toHaveURL('/');

    await page.getByRole('button', { name: 'Afficher la carte' }).click();
    await expect(page.locator('.leaflet-container')).toBeVisible();

    // Une interaction sans rapport avec la carte ne doit pas la refaire disparaître.
    await fillAddress(page, 'Destination', 'Destination test');

    await expect(page.locator('.leaflet-container')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Afficher la carte' })).toHaveCount(0);
  });

  test('le clic sur la carte pour poser origine/destination reste intact une fois affichée', async ({
    page,
  }) => {
    await mockNetwork(page);
    await loginViaUi(page);
    await expect(page).toHaveURL('/');

    await page.getByRole('button', { name: 'Afficher la carte' }).click();
    const map = page.locator('.leaflet-container');
    await expect(map).toBeVisible();

    await map.click({ position: { x: 150, y: 150 } });

    // Le clic pose l'origine -> la cible bascule sur "Destination" (comportement inchangé).
    await expect(page.getByRole('button', { name: 'Destination', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });
});
