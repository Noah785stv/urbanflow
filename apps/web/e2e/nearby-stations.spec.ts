import { expect, test } from '@playwright/test';
import {
  API_BASE,
  fillAddress,
  loginViaUi,
  mockNetwork,
  mockStationsNearby,
  STATIONS_NEARBY_FIXTURE,
} from './helpers';

/**
 * Stations de mobilité partagée à proximité (GBFS) — §11 web-gbfs-stations.md.
 * Recherche strictement à la demande : jamais d'appel `/stations/nearby` au
 * chargement du planificateur, uniquement après activation du bouton.
 */
test.describe('Stations à proximité (GBFS)', () => {
  test('aucun appel réseau tant que le bouton n’est pas activé', async ({ page }) => {
    let stationsRequestCount = 0;
    await mockNetwork(page);
    await page.route(`${API_BASE}/stations/nearby**`, async (route) => {
      stationsRequestCount += 1;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(STATIONS_NEARBY_FIXTURE),
      });
    });

    await loginViaUi(page);
    await expect(page).toHaveURL('/');
    await expect(
      page.getByRole('button', { name: 'Afficher les stations à proximité' }),
    ).toBeVisible();

    expect(stationsRequestCount).toBe(0);
  });

  test('activer le bouton recherche autour de l’origine déjà posée et affiche la liste + les marqueurs', async ({
    page,
  }) => {
    await mockNetwork(page);
    await mockStationsNearby(page);
    await loginViaUi(page);
    await expect(page).toHaveURL('/');

    await fillAddress(page, 'Origine', 'Origine test');
    await page.getByRole('button', { name: 'Afficher les stations à proximité' }).click();

    // Aucune origine/destination posée -> la carte se monte aussi (marqueurs
    // requièrent une carte visible, cf. plan §11).
    await expect(page.locator('.leaflet-container')).toBeVisible();

    await expect(page.getByText('Mairie')).toBeVisible();
    await expect(page.getByText('Gare de Rennes')).toBeVisible();
    await expect(page.getByText('4 vélos disponibles · 16 places')).toBeVisible();
    // Statut `null` (§7) : géré sans planter, message explicite plutôt qu'un vide.
    await expect(page.getByText('Disponibilité indisponible.')).toBeVisible();

    await expect(
      page.getByRole('button', { name: 'Masquer les stations à proximité' }),
    ).toBeVisible();
  });

  test('désactiver le bouton masque à nouveau la liste', async ({ page }) => {
    await mockNetwork(page);
    await mockStationsNearby(page);
    await loginViaUi(page);
    await expect(page).toHaveURL('/');

    await fillAddress(page, 'Origine', 'Origine test');
    await page.getByRole('button', { name: 'Afficher les stations à proximité' }).click();
    await expect(page.getByText('Mairie')).toBeVisible();

    await page.getByRole('button', { name: 'Masquer les stations à proximité' }).click();
    await expect(page.getByText('Mairie')).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: 'Afficher les stations à proximité' }),
    ).toBeVisible();
  });

  test('activable au clavier (sans souris)', async ({ page }) => {
    await mockNetwork(page);
    await mockStationsNearby(page);
    await loginViaUi(page);
    await expect(page).toHaveURL('/');

    await fillAddress(page, 'Origine', 'Origine test');
    await page.getByRole('button', { name: 'Afficher les stations à proximité' }).focus();
    await page.keyboard.press('Enter');

    await expect(page.getByText('Mairie')).toBeVisible();
  });

  test('recherche échouée : message d’erreur explicite, pas de plantage', async ({ page }) => {
    await mockNetwork(page);
    await mockStationsNearby(page, [], 500);
    await loginViaUi(page);
    await expect(page).toHaveURL('/');

    await fillAddress(page, 'Origine', 'Origine test');
    await page.getByRole('button', { name: 'Afficher les stations à proximité' }).click();

    await expect(page.getByText('Recherche des stations impossible pour le moment.')).toBeVisible();
  });

  test('aucune station à proximité : message explicite plutôt qu’une liste vide silencieuse', async ({
    page,
  }) => {
    await mockNetwork(page);
    await mockStationsNearby(page, []);
    await loginViaUi(page);
    await expect(page).toHaveURL('/');

    await fillAddress(page, 'Origine', 'Origine test');
    await page.getByRole('button', { name: 'Afficher les stations à proximité' }).click();

    await expect(
      page.getByText('Aucune station de mobilité partagée trouvée à proximité.').last(),
    ).toBeVisible();
  });

  test('sans origine ni destination posée, repli sur le centre métropole (géolocalisation refusée par défaut)', async ({
    page,
  }) => {
    await mockNetwork(page);
    await mockStationsNearby(page);
    await loginViaUi(page);
    await expect(page).toHaveURL('/');

    await page.getByRole('button', { name: 'Afficher les stations à proximité' }).click();

    await expect(page.getByText('Mairie')).toBeVisible();
  });
});
