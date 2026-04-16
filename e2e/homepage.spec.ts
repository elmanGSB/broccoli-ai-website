import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('page has correct title', async ({ page }) => {
  await expect(page).toHaveTitle(/Broccolli AI/);
});

test('page has main landmark', async ({ page }) => {
  await expect(page.locator('main')).toBeVisible();
});

test('page has skip navigation link', async ({ page }) => {
  const skipLink = page.locator('a[href="#main-content"]');
  await expect(skipLink).toBeAttached();
});

test('hero section visible with required copy', async ({ page }) => {
  await expect(page.locator('.hero-eyebrow')).toContainText('AI Agents for Independent Food Distribution');
  await expect(page.locator('h1.hero-headline')).toContainText('AI operating layer for food distributors');
});

test('four pillar articles exist', async ({ page }) => {
  const pillars = page.locator('article.curated-panel');
  await expect(pillars).toHaveCount(4);
});

test('four stat cards exist', async ({ page }) => {
  const cards = page.locator('article.results-card');
  await expect(cards).toHaveCount(4);
});

test('food images are local (not Wikimedia)', async ({ page }) => {
  const images = page.locator('.food-sprite img');
  const count = await images.count();
  for (let i = 0; i < count; i++) {
    const src = await images.nth(i).getAttribute('src');
    expect(src).toMatch(/^\//);
  }
});

test('page has meta description', async ({ page }) => {
  const meta = page.locator('meta[name="description"]');
  await expect(meta).toHaveAttribute('content', /.+/);
});

test('nav links point to distinct anchors', async ({ page }) => {
  const agentsLink = page.locator('nav a[href="#pillars"]');
  const integrationLink = page.locator('nav a[href="#results"]');
  await expect(agentsLink).toBeAttached();
  await expect(integrationLink).toBeAttached();
});

test('CTA "Book a Demo" links to /demo', async ({ page }) => {
  const ctaLink = page.locator('a.closing-link');
  await expect(ctaLink).toHaveAttribute('href', '/demo');
});
