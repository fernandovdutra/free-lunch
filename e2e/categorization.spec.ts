import { test as base, expect } from '@playwright/test';
import { login, canAuthenticate } from './fixtures/auth';
import { STAGED, stageCategorizationData } from './fixtures/emulator';

const test = base.extend({});

// The app is mobile-first and edit sheets animate from the bottom; the
// stable, production-representative way to drive them is an iPhone viewport.
test.use({ viewport: { width: 390, height: 844 } });

/**
 * Manual categorization journey: open a transaction's edit sheet, change
 * its category via the nested CategoryPicker, verify the list reflects it.
 * The staged transaction is reset to Coffee & Bars on every run.
 */
test.describe('Categorization', () => {
  test.describe.configure({ mode: 'serial' });

  let authAvailable = false;

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    authAvailable = await canAuthenticate(page);
    await page.close();
    if (authAvailable) await stageCategorizationData();
  });

  test.beforeEach(async ({ page }) => {
    test.skip(!authAvailable, 'Emulator stack not available');
    await login(page);
    await page.goto('/transactions');
    await expect(page.getByText(/· \d+ TXN/).first()).toBeVisible({ timeout: 20000 });
  });

  test('recategorizes a transaction via the category picker', async ({ page }) => {
    // The list is virtualized — search to bring the staged row into view.
    await page.getByPlaceholder(/search description or payee/i).fill(STAGED.categorizeMerchant);
    // Staged txn starts as Coffee & Bars.
    const row = page.getByRole('button').filter({ hasText: STAGED.categorizeMerchant }).first();
    await expect(row).toContainText('COFFEE & BARS');
    await row.click();

    // Scope to the edit sheet — hasText is case-insensitive, so unscoped
    // locators would also match the list row behind the sheet overlay.
    const editSheet = page
      .getByRole('dialog')
      .filter({ hasText: STAGED.categorizeMerchant })
      .first();
    await editSheet.getByRole('button').filter({ hasText: 'Coffee & Bars' }).first().click();

    const picker = page.getByRole('dialog').filter({ hasText: 'SELECT CATEGORY' }).first();
    await expect(picker.getByText('SELECT CATEGORY')).toBeVisible({ timeout: 10000 });

    // Search narrows the tree; pick Restaurants.
    await picker.getByPlaceholder(/search categories/i).fill('restaur');
    await picker.getByRole('button').filter({ hasText: 'Restaurants' }).first().click();

    // Edit sheet reflects the change.
    await expect(
      editSheet.getByRole('button').filter({ hasText: 'Restaurants' }).first()
    ).toBeVisible({ timeout: 10000 });

    // And so does the list row after closing the sheet.
    await page.keyboard.press('Escape');
    await expect(
      page
        .getByRole('button')
        .filter({ hasText: STAGED.categorizeMerchant })
        .filter({ hasText: 'RESTAURANTS' })
        .first()
    ).toBeVisible({ timeout: 10000 });
  });
});
