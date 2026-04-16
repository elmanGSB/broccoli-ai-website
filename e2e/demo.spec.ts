import { test, expect, type Page } from '@playwright/test';

// ── helpers ──────────────────────────────────────────────────────────────────

async function mockApis(page: Page) {
  await page.route('**/api/leads**', route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'test-123' }) })
  );
  await page.route('**/formspree.io/**', route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) })
  );
}

async function fillAndSubmitStep1(page: Page) {
  await page.fill('#name', 'Alex Rivera');
  await page.fill('#company', 'Rivera Fresh Foods');
  await page.fill('#email', 'alex@riverafresh.com');
  await page.fill('#phone', '555-010-0100');
  await page.selectOption('#company_size', '2-10');
  await page.fill('#website', 'https://riverafresh.com');
  await page.click('#step1-submit');
  await page.waitForSelector('#step2', { state: 'visible' });
}

async function reachStep2(page: Page) {
  await mockApis(page);
  await fillAndSubmitStep1(page);
}

// ── tests ─────────────────────────────────────────────────────────────────────

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
    await reachStep2(page);
    await expect(page.locator('.pillar-card')).toHaveCount(4);
    await expect(page.locator('.custom-card')).toHaveCount(1);
  });

  test('selecting a pillar card marks it selected', async ({ page }) => {
    await reachStep2(page);
    await page.locator('.pillar-card[data-id="sales"]').click();
    await expect(page.locator('.pillar-card[data-id="sales"]')).toHaveClass(/selected/);
  });

  test('Step 4 shows correct pillar label after selection', async ({ page }) => {
    await reachStep2(page);
    await page.locator('.pillar-card[data-id="knowledge"]').click();
    await page.locator('#step2-continue').click();
    await page.waitForSelector('#step3', { state: 'visible' });
    await page.locator('#step3-skip').click();
    await expect(page.locator('#step4')).toBeVisible();
    await expect(page.locator('#selected-pillar-label')).toContainText('Knowledge Capture');
  });
});
