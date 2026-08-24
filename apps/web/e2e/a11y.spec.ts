import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { loginViaUi, mockNetwork } from './helpers';

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
});
