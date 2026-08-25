import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { API_BASE, loginViaUi, mockNetwork } from './helpers';

const SUMMARY_RESPONSE = {
  totalCo2Grams: 839,
  totalSavedGrams: 340,
  monthly: [
    { month: '2026-07', co2Grams: 500, savedGrams: 100, tripCount: 2 },
    { month: '2026-08', co2Grams: 339, savedGrams: 240, tripCount: 1 },
  ],
};

const LOGS_PAGE_RESPONSE = {
  items: [
    {
      id: 'log-1',
      loggedAt: '2026-08-17T08:00:00.000Z',
      co2Grams: 339,
      distanceMeters: 3000,
      referenceCo2Grams: 579,
      savedGrams: 240,
      modeBreakdown: [{ mode: 'bus', distanceMeters: 3000, co2Grams: 339 }],
      createdAt: '2026-08-17T08:01:00.000Z',
    },
  ],
  total: 1,
  page: 1,
  limit: 10,
};

function seriousOrCritical(results: Awaited<ReturnType<AxeBuilder['analyze']>>) {
  return results.violations.filter(
    (violation) => violation.impact === 'critical' || violation.impact === 'serious',
  );
}

test.describe('Accessibilité — axe-core (§14 : 0 violation critical/serious)', () => {
  test('/login', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'networkidle' });
    const results = await new AxeBuilder({ page }).analyze();
    expect(seriousOrCritical(results)).toEqual([]);
  });

  test('/register', async ({ page }) => {
    await page.goto('/register', { waitUntil: 'networkidle' });
    const results = await new AxeBuilder({ page }).analyze();
    expect(seriousOrCritical(results)).toEqual([]);
  });

  test('planificateur (authentifié)', async ({ page }) => {
    await mockNetwork(page);
    await loginViaUi(page);
    await expect(page).toHaveURL('/');

    const results = await new AxeBuilder({ page }).analyze();
    expect(seriousOrCritical(results)).toEqual([]);
  });

  test('planificateur — liste de suggestions d’adresse ouverte (§A.3, combobox)', async ({
    page,
  }) => {
    await mockNetwork(page);
    await loginViaUi(page);
    await expect(page).toHaveURL('/');

    await page.getByRole('combobox', { name: 'Origine' }).fill('Origine test');
    await expect(
      page.getByRole('option', { name: 'Place de la Mairie, 35000 Rennes' }),
    ).toBeVisible();

    const results = await new AxeBuilder({ page }).analyze();
    expect(seriousOrCritical(results)).toEqual([]);
  });

  test('tableau de bord carbone (authentifié)', async ({ page }) => {
    await mockNetwork(page);
    await page.route(`${API_BASE}/carbon-logs/summary`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(SUMMARY_RESPONSE),
      });
    });
    await page.route(`${API_BASE}/carbon-logs?*`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(LOGS_PAGE_RESPONSE),
      });
    });

    // Navigation cliente (lien), pas `page.goto` : les jetons ne vivent qu'en
    // mémoire JS (§9 F2-web-planner.md) — un rechargement de page les perdrait.
    await loginViaUi(page);
    await expect(page).toHaveURL('/');
    await page.getByRole('link', { name: 'Tableau de bord' }).click();
    await expect(page.getByRole('heading', { name: 'Empreinte carbone' })).toBeVisible();
    // Le <h1> est rendu avant la fin du chargement (CarbonDashboard) : sous
    // forte parallélisation, lancer axe dès son apparition percute encore la
    // navigation/le rendu en cours (piège connu d'@axe-core/playwright avec
    // les navigations SPA — cause du flake, pas l'app). On attend le signal
    // de fin de chargement réel (région live existante), pas le titre seul.
    await expect(page.getByRole('status')).toHaveText('Tableau de bord carbone chargé.');

    const results = await new AxeBuilder({ page }).analyze();
    expect(seriousOrCritical(results)).toEqual([]);
  });

  for (const path of ['/confidentialite', '/mentions-legales', '/a-propos', '/403']) {
    test(path, async ({ page }) => {
      await page.goto(path, { waitUntil: 'networkidle' });
      const results = await new AxeBuilder({ page }).analyze();
      expect(seriousOrCritical(results)).toEqual([]);
    });
  }

  test('404 (route inconnue)', async ({ page }) => {
    await page.goto('/une-route-qui-nexiste-pas', { waitUntil: 'networkidle' });
    const results = await new AxeBuilder({ page }).analyze();
    expect(seriousOrCritical(results)).toEqual([]);
  });
});
