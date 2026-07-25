import { test as base, expect } from '@playwright/test';
import { login, canAuthenticate } from './fixtures/auth';

const test = base.extend({});

/**
 * Budgets page (redesigned): monthly budget waterfall + per-category caps
 * with expandable subcategory rows. Data comes from the seeded emulator.
 */
test.describe('Budgets Page', () => {
  let authAvailable = false;

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    authAvailable = await canAuthenticate(page);
    await page.close();
  });

  test.beforeEach(async ({ page }) => {
    test.skip(!authAvailable, 'Emulator stack not available');
    await login(page);
    await page.goto('/budgets');
    await expect(page.getByText('MONTHLY BUDGET')).toBeVisible({ timeout: 15000 });
  });

  test('renders the monthly budget header and edit control', async ({ page }) => {
    await expect(page.getByText('MONTHLY BUDGET')).toBeVisible();
    await expect(page.getByText(/EDIT/).first()).toBeVisible();
  });

  test('lists top-level categories with caps', async ({ page }) => {
    await expect(page.getByText('BY CATEGORY')).toBeVisible();
    // Seeded categories render as expandable row buttons. Plain getByText
    // would also match hidden SVG <title> nodes in the waterfall chart.
    const foodRow = page.getByRole('button').filter({ hasText: 'Food & Drink' }).first();
    await expect(foodRow).toBeVisible();
    await expect(foodRow).toContainText(/SUBCATEGOR/);
  });

  test('expands a category to show its subcategories', async ({ page }) => {
    await page.getByRole('button').filter({ hasText: 'Food & Drink' }).first().click();
    // Leaf rows are plain rows (not buttons) in read mode; exact-match the names.
    await expect(page.getByText('Restaurants', { exact: true })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Groceries', { exact: true })).toBeVisible();
  });
});
