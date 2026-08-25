import { expect, test, type Locator, type Page } from '@playwright/test';
import { loginViaUi, mockNetwork } from './helpers';

/**
 * Audit clavier manuel (§C7, passe de durcissement a11y) : preuve en
 * navigateur réel de l'ordre de tabulation et de la visibilité du focus,
 * plutôt qu'une lecture du JSX. Couvre les deux points signalés comme
 * délicats : la carte Leaflet et le combobox d'adresse ne doivent jamais
 * piéger le focus (Tab doit toujours pouvoir en ressortir).
 */

type Role = 'link' | 'button' | 'textbox' | 'combobox';

/**
 * Point de départ déterministe pour la séquence de tabulation : focus
 * explicite sur le lien d'évitement (premier arrêt de toute page). Un simple
 * `blur()` ne suffit pas — Chromium conserve son ancre de navigation
 * séquentielle sur le dernier élément réellement interagi (ex. le bouton
 * "Se connecter" cliqué juste avant), même après un `blur()` JS ; `.focus()`
 * en pose une nouvelle, fiable, constaté en le vérifiant ci-dessous.
 */
async function focusSkipLink(page: Page): Promise<Locator> {
  const skipLink = page.getByRole('link', { name: 'Aller au contenu principal' });
  await skipLink.focus();
  await expect(skipLink).toBeFocused();
  return skipLink;
}

async function pressTabAndExpect(page: Page, role: Role, name: string): Promise<Locator> {
  await page.keyboard.press('Tab');
  const focused = page.locator(':focus');
  await expect(focused).toHaveRole(role);
  await expect(focused).toHaveAccessibleName(name);
  return focused;
}

/** Contour visible du design system (§5 : ring 3 px, décalé 2 px, box-shadow — pas outline). */
async function expectVisibleFocusRing(locator: Locator): Promise<void> {
  const boxShadow = await locator.evaluate((el) => getComputedStyle(el).boxShadow);
  expect(boxShadow).not.toBe('none');
}

test.describe('Navigation clavier — ordre de tabulation, focus visible, absence de piège', () => {
  test('/login : ordre logique du lien d’évitement au footer, focus visible', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'networkidle' });
    await focusSkipLink(page);

    const email = await pressTabAndExpect(page, 'textbox', 'E-mail');
    await expectVisibleFocusRing(email);

    await pressTabAndExpect(page, 'textbox', 'Mot de passe');
    await pressTabAndExpect(page, 'button', 'Se connecter');
    await pressTabAndExpect(page, 'link', 'S’inscrire');
    await pressTabAndExpect(page, 'link', 'À propos');
    await pressTabAndExpect(page, 'link', 'Politique de confidentialité');
    await pressTabAndExpect(page, 'link', 'Mentions légales');
  });

  test('planificateur : ordre logique jusqu’à la carte, qui ne piège pas le focus', async ({
    page,
  }) => {
    await mockNetwork(page);
    await loginViaUi(page);
    await expect(page).toHaveURL('/');
    await focusSkipLink(page);

    await pressTabAndExpect(page, 'link', 'Planifier');
    await pressTabAndExpect(page, 'link', 'Tableau de bord');
    await pressTabAndExpect(page, 'button', 'Se déconnecter');
    await pressTabAndExpect(page, 'button', 'Utiliser ma position');
    await pressTabAndExpect(page, 'button', 'Origine');
    await pressTabAndExpect(page, 'button', 'Destination');

    const originField = await pressTabAndExpect(page, 'combobox', 'Origine');
    await expectVisibleFocusRing(originField);

    await pressTabAndExpect(page, 'combobox', 'Destination');

    const calculer = await pressTabAndExpect(page, 'button', 'Calculer');
    // aria-disabled, pas l'attribut natif disabled (design-system.md §4) :
    // reste dans l'ordre de tabulation même désactivé.
    await expect(calculer).toHaveAttribute('aria-disabled', 'true');

    // Carte chargée via next/dynamic (ssr: false) — attendre qu'elle soit
    // effectivement montée avant de continuer, sinon Tab saute par-dessus le
    // fallback "Chargement de la carte…" (un <div>, non focusable).
    await expect(page.locator('.leaflet-container')).toBeVisible();

    // La carte Leaflet est focusable (navigation clavier native de Leaflet) —
    // on y entre, puis on vérifie qu'on peut en ressortir (pas de piège).
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toHaveClass(/leaflet-container/);

    // Contrôles de zoom Leaflet, francisés (§C7), puis l'attribution
    // (obligatoire pour l'usage des tuiles OSM) — focusables eux aussi,
    // toujours pas de piège : on continue jusqu'au footer.
    await pressTabAndExpect(page, 'button', 'Zoomer');
    await pressTabAndExpect(page, 'button', 'Dézoomer');
    await pressTabAndExpect(page, 'link', 'Leaflet');
    await pressTabAndExpect(page, 'link', 'OpenStreetMap');

    await pressTabAndExpect(page, 'link', 'À propos');
  });

  test('le combobox d’adresse ne piège pas le focus (Tab referme la liste et avance)', async ({
    page,
  }) => {
    await mockNetwork(page);
    await loginViaUi(page);
    await expect(page).toHaveURL('/');

    const origin = page.getByRole('combobox', { name: 'Origine' });
    await origin.fill('Origine test');
    await expect(
      page.getByRole('option', { name: 'Place de la Mairie, 35000 Rennes' }),
    ).toBeVisible();

    await page.keyboard.press('Tab');

    await expect(page.getByRole('listbox')).toHaveCount(0);
    const focused = page.locator(':focus');
    await expect(focused).toHaveRole('combobox');
    await expect(focused).toHaveAccessibleName('Destination');
  });
});
