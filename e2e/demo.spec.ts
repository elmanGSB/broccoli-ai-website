import { test, expect } from '@playwright/test';

test.describe('/demo page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/demo');
  });

  test('page title contains Demo', async ({ page }) => {
    await expect(page).toHaveTitle(/Demo/);
  });

  test('shows Step 1 on load, Steps 2-4 hidden', async ({ page }) => {
    await expect(page.locator('#step1')).toBeVisible();
    await expect(page.locator('#step2')).toBeHidden();
    await expect(page.locator('#step3')).toBeHidden();
    await expect(page.locator('#step4')).toBeHidden();
  });

  test('Step 1 has all required fields', async ({ page }) => {
    for (const id of ['name', 'email', 'phone', 'company', 'company_size', 'website']) {
      await expect(page.locator(`#${id}`)).toBeVisible();
    }
  });

  test('empty form submit shows validation errors', async ({ page }) => {
    await page.locator('#step1-submit').click();
    await expect(page.locator('#name-err')).toBeVisible();
  });

  test('Step 2 has 4 pillar cards and 1 custom card', async ({ page }) => {
    await page.evaluate(() => (window as any).showStep(2));
    await expect(page.locator('.pillar-card')).toHaveCount(4);
    await expect(page.locator('.custom-card')).toHaveCount(1);
  });

  test('selecting a pillar card marks it selected', async ({ page }) => {
    await page.evaluate(() => (window as any).showStep(2));
    await page.locator('.pillar-card[data-id="sales"]').click();
    await expect(page.locator('.pillar-card[data-id="sales"]')).toHaveClass(/selected/);
  });

  test('Step 4 shows correct pillar label after selection', async ({ page }) => {
    await page.evaluate(() => {
      (document.querySelector('.pillar-card[data-id="knowledge"]') as HTMLElement)?.click();
      (window as any).goToStep4();
    });
    await expect(page.locator('#step4')).toBeVisible();
    await expect(page.locator('#selected-pillar-label')).toContainText('Knowledge Capture');
  });
});
