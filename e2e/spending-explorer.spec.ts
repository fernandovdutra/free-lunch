import { test as base, expect } from '@playwright/test';
import { login, canAuthenticate } from './fixtures/auth';

const test = base.extend({});

/**
 * Spending Explorer (/expenses): monthly total, category breakdown with
 * budget context, and drill-down into a category.
 * Replaces the pre-redesign counterparty-analytics spec.
 */
test.describe('Spending Explorer', () => {
  let authAvailable = false;

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    authAvailable = await canAuthenticate(page);
    await page.close();
  });

  test.beforeEach(async ({ page }) => {
    test.skip(!authAvailable, 'Emulator stack not available');
    await login(page);
    await page.goto('/expenses');
    await expect(page.getByText('EXPENSES', { exact: true })).toBeVisible({ timeout: 20000 });
  });

  test('shows the monthly total and category breakdown', async ({ page }) => {
    await expect(page.getByText('BY CATEGORY')).toBeVisible({ timeout: 15000 });
    // Seeded data always has Food & Drink spending with a budget attached.
    await expect(page.getByText('Food & Drink').first()).toBeVisible();
    await expect(page.getByText(/% OF/).first()).toBeVisible();
  });

  test('drills down into a category', async ({ page }) => {
    await page.getByText('Food & Drink').first().click();
    await expect(page).toHaveURL(/\/expenses\/food/);
    // Subcategory breakdown of the seeded food tree.
    await expect(page.getByText(/Groceries|Restaurants/).first()).toBeVisible({ timeout: 15000 });
  });
});
