import { expect, test } from '@playwright/test';
import { API_BASE, fillAddress, loginViaUi, mockNetwork } from './helpers';

const PLAN_RESPONSE = {
  journeys: [
    {
      departureAt: '2026-08-17T08:00:00+02:00',
      arrivalAt: '2026-08-17T08:16:00+02:00',
      durationSeconds: 960,
      sections: [
        {
          mode: 'bus',
          durationSeconds: 960,
          distanceMeters: 3000,
          // Polyligne réelle capturée sur l'instance OTP locale (F2-geometry).
          geometry:
            'a|tdHr{fIXvJ?\\QBcAG{@O{A]C?gBi@c@Gm@?a@Ho@Ty@l@k@jAmAlCcBrC}@pAORq@r@c@f@wA`B]XQDK@uBt@K@g@RAMOwDCe@YwIgAIW@ODKJ]Ne@P{B|@eK|DgBl@[JqB\\Y?oA^oIdCsAVmLvBYVAECEACC?G?C@CBABAF@FkEt@sDt@wCh@}Cl@e@He@?AKAGAGAECECCCCCCEACAE?G@CBEBEDCDADADAFAF?F?F@F@DBF@DBBBDBBD@B@F?B?F\\Fl@DbAZhHJjAJb@CBCDCDCDAFAH?L@F@DBJFHHDD@B?NnALr@^`Cl@lEEDEDCFCDELCL?HAD@J@PDJDJDHDBLHDBH@H@HAFAHEHEBEDEBGf@Tr@Jl@LdAb@?L?D@J@DBFDDBBB@D@HABABCFGBIZTZd@dAvAAF?F?FBD@DDBBBD?DAFGlCtEDNTlAgAb@?@KFwBtCqCzDe@r@`AjC@DPd@^ZPTHTP`Cz@|NDNhArA\\b@ZNrDdAtBj@dAXb@Cx@O\\GNfCj@xBtC|Kx@zCFPJJHFNDNAhCU',
        },
      ],
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

  // Origine/destination par adresse — chemin accessible sans carte ni souris (§11, §A.3).
  await fillAddress(page, 'Origine', 'Origine test');
  await fillAddress(page, 'Destination', 'Destination test');

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

  // Avant sélection : aucun tracé sur la carte (F2-geometry §8).
  await expect(page.locator('path.leaflet-interactive')).toHaveCount(0);

  await firstSelectButton.focus();
  await page.keyboard.press('Enter');
  await expect(firstSelectButton).toHaveText('✓ Sélectionné');

  // Après sélection : le tracé réel du bus apparaît (rendu Leaflet réel, pas
  // un mock jsdom — la géométrie du premier tronçon décode en > 1 point).
  await expect(page.locator('path.leaflet-interactive')).toHaveCount(1);
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

  await fillAddress(page, 'Origine', 'Origine test');
  await fillAddress(page, 'Destination', 'Destination test');

  await page.getByRole('button', { name: 'Calculer' }).click();

  await expect(page.getByRole('status')).toContainText('temporairement indisponible');
});
