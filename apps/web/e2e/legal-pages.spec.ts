import { expect, test } from '@playwright/test';

/**
 * Lot B (§B.1, §B.5 web-geocoding-and-pages.md) : footer sur toutes les
 * pages, navigation réelle vers les pages illustratives, et pages d'erreur.
 * Pages publiques, sans dépendance réseau (§12) : aucun mock nécessaire.
 */
test.describe('Footer et pages statiques', () => {
  test('le footer est présent sur une page publique et ses liens fonctionnent', async ({
    page,
  }) => {
    await page.goto('/login', { waitUntil: 'networkidle' });

    const footerNav = page.getByRole('navigation', { name: 'Pied de page' });
    await expect(footerNav).toBeVisible();

    await footerNav.getByRole('link', { name: 'Politique de confidentialité' }).click();
    await expect(page).toHaveURL('/confidentialite');
    await expect(page.getByRole('heading', { name: 'Politique de confidentialité' })).toBeVisible();

    await page
      .getByRole('navigation', { name: 'Pied de page' })
      .getByRole('link', { name: 'Mentions légales' })
      .click();
    await expect(page).toHaveURL('/mentions-legales');
    await expect(page.getByRole('heading', { name: 'Mentions légales' })).toBeVisible();

    await page
      .getByRole('navigation', { name: 'Pied de page' })
      .getByRole('link', { name: 'À propos' })
      .click();
    await expect(page).toHaveURL('/a-propos');
    await expect(page.getByRole('heading', { name: 'À propos' })).toBeVisible();
  });

  test('une route inconnue affiche la page 404, avec un lien de retour', async ({ page }) => {
    await page.goto('/une-route-qui-nexiste-pas', { waitUntil: 'networkidle' });

    await expect(page.getByRole('heading', { name: 'Page introuvable' })).toBeVisible();
    await page.getByRole('link', { name: /Retour à l.accueil/ }).click();
    await expect(page).toHaveURL('/login');
  });

  test('la page /403 affiche un message clair, avec un lien de retour', async ({ page }) => {
    await page.goto('/403', { waitUntil: 'networkidle' });

    await expect(page.getByRole('heading', { name: 'Accès refusé' })).toBeVisible();
    await expect(page.getByRole('link', { name: /Retour à l.accueil/ })).toBeVisible();
  });
});
