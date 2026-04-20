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
  await page.fill('#name', 'Test User');
  await page.fill('#company', 'Test Corp');
  await page.fill('#email', 'test@example.com');
  await page.fill('#phone', '555-1234567');
  await page.selectOption('#company_size', 'under-100m');
  await page.fill('#website', 'https://test.com');
  await page.click('#step1-submit');
  await page.waitForSelector('#step2', { state: 'visible' });
}

async function reachStep2(page: Page) {
  await mockApis(page);
  await fillAndSubmitStep1(page);
}

// ── tests ─────────────────────────────────────────────────────────────────────

test.describe('Demo Flow - Mobile (375px iPhone SE)', () => {
  test.beforeEach(async ({ page }) => {
    // Set mobile viewport: iPhone SE (375x812)
    await page.setViewportSize({ width: 375, height: 812 });
    // Use mobile-like user agent
    await page.context().setUserAgent(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1'
    );
    await page.goto('/demo');
  });

  test('viewport is 375px wide (mobile)', async ({ page }) => {
    const size = page.viewportSize();
    expect(size?.width).toBe(375);
    expect(size?.height).toBe(812);
  });

  test('Step 1 form is visible on load with all required fields', async ({ page }) => {
    // Assert Step 1 is visible, Steps 2-3 are hidden
    await expect(page.locator('#step1')).toBeVisible();
    await expect(page.locator('#step2')).toBeHidden();
    await expect(page.locator('#step3')).toBeHidden();

    // Assert all form fields are visible
    await expect(page.locator('#name')).toBeVisible();
    await expect(page.locator('#company')).toBeVisible();
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#phone')).toBeVisible();
    await expect(page.locator('#company_size')).toBeVisible();
    await expect(page.locator('#website')).toBeVisible();
    await expect(page.locator('#step1-submit')).toBeVisible();
  });

  test('Step 1 form submission transitions to Step 2', async ({ page }) => {
    await mockApis(page);

    // Fill form
    await page.fill('#name', 'Test User');
    await page.fill('#company', 'Test Corp');
    await page.fill('#email', 'test@example.com');
    await page.fill('#phone', '555-1234567');
    await page.selectOption('#company_size', 'under-100m');
    await page.fill('#website', 'https://test.com');

    // Submit and verify Step 2 appears
    await page.click('#step1-submit');
    await page.waitForSelector('#step2', { state: 'visible' });

    // Assert Step 1 is now hidden, Step 2 is visible
    await expect(page.locator('#step1')).toBeHidden();
    await expect(page.locator('#step2')).toBeVisible();
  });

  test('Step 2 displays pillar cards', async ({ page }) => {
    await reachStep2(page);

    // Assert pillar cards exist and are visible
    const pillarCards = page.locator('.pillar-card');
    const customCard = page.locator('.custom-card');

    await expect(pillarCards.first()).toBeVisible();
    await expect(customCard).toBeVisible();
  });

  test('Step 2 pillar card selection marks card as selected', async ({ page }) => {
    await reachStep2(page);

    // Click first pillar card
    const firstCard = page.locator('.pillar-card[data-id="sales"]');
    await firstCard.click();

    // Assert card is marked as selected
    await expect(firstCard).toHaveClass(/selected/);
  });

  test('Step 2 continue button is enabled after pillar selection', async ({ page }) => {
    await reachStep2(page);

    // Click a pillar card
    await page.locator('.pillar-card[data-id="knowledge"]').click();

    // Assert Continue button is enabled (not disabled)
    const continueBtn = page.locator('#step2-continue');
    await expect(continueBtn).not.toBeDisabled();
  });

  test('Step 2 to Step 3 transition shows calendar container', async ({ page }) => {
    await reachStep2(page);

    // Select a pillar
    await page.locator('.pillar-card[data-id="sales"]').click();

    // Click Continue button
    await page.click('#step2-continue');

    // Wait for Step 3 to appear
    await page.waitForSelector('#step3', { state: 'visible' });

    // Assert Step 3 is now visible
    await expect(page.locator('#step3')).toBeVisible();

    // Assert Step 2 is hidden
    await expect(page.locator('#step2')).toBeHidden();
  });

  test('Step 3 calendar container is present', async ({ page }) => {
    await reachStep2(page);

    // Navigate to Step 3
    await page.locator('.pillar-card[data-id="sales"]').click();
    await page.click('#step2-continue');
    await page.waitForSelector('#step3', { state: 'visible' });

    // Assert calendar container exists
    const calendarContainer = page.locator('#calendar-container');
    await expect(calendarContainer).toBeVisible();
  });

  test('Step 3 displays booking headline', async ({ page }) => {
    await reachStep2(page);

    // Navigate to Step 3
    await page.locator('.pillar-card[data-id="sales"]').click();
    await page.click('#step2-continue');
    await page.waitForSelector('#step3', { state: 'visible' });

    // Assert headline is visible (adjust text if different in actual page)
    const headline = page.locator('#step3').locator('h2, h3').first();
    await expect(headline).toBeVisible();
  });

  test('full demo flow: Step 1 -> Step 2 -> Step 3', async ({ page }) => {
    // Track console errors
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await mockApis(page);

    // STEP 1: Fill and submit form
    await expect(page.locator('#step1')).toBeVisible();
    await page.fill('#name', 'Test User');
    await page.fill('#company', 'Test Corp');
    await page.fill('#email', 'test@example.com');
    await page.fill('#phone', '555-1234567');
    await page.selectOption('#company_size', 'under-100m');
    await page.fill('#website', 'https://test.com');
    await page.click('#step1-submit');

    // STEP 2: Verify transition and select pillar
    await page.waitForSelector('#step2', { state: 'visible' });
    await expect(page.locator('#step1')).toBeHidden();
    await expect(page.locator('#step2')).toBeVisible();

    const pillarCard = page.locator('.pillar-card[data-id="sales"]');
    await expect(pillarCard).toBeVisible();
    await pillarCard.click();
    await expect(pillarCard).toHaveClass(/selected/);

    // STEP 3: Click Continue and verify calendar container
    await page.click('#step2-continue');
    await page.waitForSelector('#step3', { state: 'visible' });
    await expect(page.locator('#step2')).toBeHidden();
    await expect(page.locator('#step3')).toBeVisible();

    const calendarContainer = page.locator('#calendar-container');
    await expect(calendarContainer).toBeVisible();

    // Assert no console errors occurred
    expect(consoleErrors).toHaveLength(0);
  });

  test('mobile viewport is maintained throughout flow', async ({ page }) => {
    // Verify initial viewport
    let size = page.viewportSize();
    expect(size?.width).toBe(375);

    // Navigate and verify viewport is maintained
    await mockApis(page);
    await fillAndSubmitStep1(page);

    size = page.viewportSize();
    expect(size?.width).toBe(375);
    expect(size?.height).toBe(812);
  });

  test('form fields respond correctly to mobile input', async ({ page }) => {
    await mockApis(page);

    // Fill fields one by one with mobile-like input
    const nameField = page.locator('#name');
    await nameField.click();
    await nameField.fill('Mobile User');
    await expect(nameField).toHaveValue('Mobile User');

    const companyField = page.locator('#company');
    await companyField.click();
    await companyField.fill('Mobile Co');
    await expect(companyField).toHaveValue('Mobile Co');

    const emailField = page.locator('#email');
    await emailField.click();
    await emailField.fill('mobile@test.com');
    await expect(emailField).toHaveValue('mobile@test.com');
  });
});
