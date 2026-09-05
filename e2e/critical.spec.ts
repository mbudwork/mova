import { expect, test } from '@playwright/test';

/**
 * Critical paths from the acceptance criteria. These run against a local
 * Supabase with the demo seed applied (`supabase db reset`).
 *
 * NOTE: not yet executed in CI — Playwright browsers are not installed in the
 * current environment. See REVIEW_NOTES.md.
 */

test('landing shows a real Polier command, not marketing filler', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Hol mal kurz die Wasserwaage rüber.')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Попробовать' })).toBeVisible();
});

test('protected routes bounce anonymous users to login', async ({ page }) => {
  await page.goto('/app');
  await expect(page).toHaveURL(/\/login/);
});

test('the app never shows a CEFR-looking level label', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('body')).not.toContainText(/\b(A1|A2|B1|B2)\b/);
});

test('nothing overflows horizontally on a narrow phone', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto('/');
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(overflow).toBe(false);
});

test('every control is large enough for a gloved thumb', async ({ page }) => {
  await page.goto('/register');
  for (const control of await page.locator('button, input, a').all()) {
    const box = await control.boundingBox();
    if (!box) continue;
    expect(box.height).toBeGreaterThanOrEqual(44);
  }
});

test.describe('signed in', () => {
  test.skip(true, 'Requires a seeded local Supabase; wired in PHASE 3.');

  test('onboarding takes two answers and lands on home', async () => {});
  test('a draft phrase never appears in a lesson', async () => {});
});
