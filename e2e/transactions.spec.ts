import { test as base, expect } from '@playwright/test';
import { login, canAuthenticate } from './fixtures/auth';

const test = base.extend({});

// The app is mobile-first and edit sheets animate from the bottom; the
// stable, production-representative way to drive them is an iPhone viewport.
test.use({ viewport: { width: 390, height: 844 } });

/**
 * Transactions page (redesigned): filter pills, virtualized month/day list,
 * and the edit sheet opened by tapping a row.
 */
test.describe('Transactions Page', () => {
  let authAvailable = false;

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    authAvailable = await canAuthenticate(page);
    await page.close();
  });

  test.beforeEach(async ({ page }) => {
    test.skip(!authAvailable, 'Emulator stack not available');
    await login(page);
    await page.goto('/transactions');
    // Month summary header renders once transactions load, e.g. "€ 1.981,09 · 44 TXN".
    await expect(page.getByText(/· \d+ TXN/).first()).toBeVisible({ timeout: 20000 });
  });

  test('shows the filter pills', async ({ page }) => {
    await expect(page.getByText(/UNCAT/).first()).toBeVisible();
    await expect(page.getByText(/REIMB/).first()).toBeVisible();
    await expect(page.getByText(/ALL CATS/).first()).toBeVisible();
  });

  test('renders transaction rows grouped by day', async ({ page }) => {
    // Day headers look like "SAT · JUL 18"; at least one must be present.
    await expect(page.getByText(/^[A-Z]{3} · [A-Z]{3} \d{1,2}$/).first()).toBeVisible();
    // Seeded data always contains groceries transactions.
    await expect(page.getByText('GROCERIES').first()).toBeVisible();
  });

  test('opens the edit sheet when tapping a row and closes it again', async ({ page }) => {
    await page.getByText('GROCERIES').first().click();

    // Edit sheet sections.
    await expect(page.getByText('CATEGORY', { exact: true })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('FLAGS', { exact: true })).toBeVisible();
    await expect(page.getByText('NOTE', { exact: true })).toBeVisible();

    // Close with Escape — the ✕ button can be mid-animation and unstable.
    await page.keyboard.press('Escape');
    await expect(page.getByText('FLAGS', { exact: true })).not.toBeVisible();
  });
});
