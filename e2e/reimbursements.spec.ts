import { test as base, expect } from '@playwright/test';
import { login, canAuthenticate } from './fixtures/auth';
import {
  STAGED,
  stageReimbursementData,
  getIdToken,
  fetchBudgetProgress,
  listUserDocs,
} from './fixtures/emulator';

const test = base.extend({});

// The app is mobile-first and edit sheets animate from the bottom; the
// stable, production-representative way to drive them is an iPhone viewport.
test.use({ viewport: { width: 390, height: 844 } });

/**
 * Covers the reimbursement flow end-to-end against the emulator stack:
 * visibility of cleared/pending states, the exact-amount suggestion picker,
 * resolving a pending reimbursement, and the budget exclusion of reimbursed
 * spend. Data is staged deterministically in fixtures/emulator.ts.
 */
test.describe('Reimbursements', () => {
  test.describe.configure({ mode: 'serial' });

  let authAvailable = false;

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    authAvailable = await canAuthenticate(page);
    await page.close();
    if (authAvailable) {
      await stageReimbursementData();
    } else {
      console.warn('⚠️  Skipping reimbursement tests - emulators not running (see docs/TESTING.md)');
    }
  });

  test.beforeEach(async ({ page }) => {
    test.skip(!authAvailable, 'Emulator stack not available');
    await login(page);
  });

  test('shows the open reimbursement and closed history', async ({ page }) => {
    await page.goto('/reimbursements');
    await expect(page.getByText(/YOU'RE OWED/i)).toBeVisible({ timeout: 15000 });

    // The staged pending expense appears in the OPEN list with its amount.
    const openRow = page.getByRole('button').filter({ hasText: STAGED.pendingMerchant }).first();
    await expect(openRow).toBeVisible();
    await expect(openRow).toContainText('47,23');

    // Closed section exists (collapsed by default).
    await expect(page.getByText(/CLOSED · LAST 90 DAYS/)).toBeVisible();
  });

  test('marks cleared reimbursements in the transactions list', async ({ page }) => {
    await page.goto('/transactions');
    // The list is virtualized — search to bring the staged row into view.
    await page.getByPlaceholder(/search description or payee/i).fill(STAGED.clearedMerchant);
    const clearedRow = page
      .getByRole('button')
      .filter({ hasText: STAGED.clearedMerchant })
      .filter({ hasText: 'REIMBURSED ✓' })
      .first();
    await expect(clearedRow).toBeVisible({ timeout: 20000 });
  });

  test('shows reimbursed status in the edit sheet', async ({ page }) => {
    await page.goto('/transactions');
    await page.getByPlaceholder(/search description or payee/i).fill(STAGED.clearedMerchant);
    await page
      .getByRole('button')
      .filter({ hasText: STAGED.clearedMerchant })
      .first()
      .click();

    // Status row under the Reimbursable toggle.
    await expect(page.getByText(/Reimbursed ✓/i).last()).toBeVisible({ timeout: 10000 });
  });

  test('suggests and resolves an exact-amount match end-to-end', async ({ page }) => {
    await page.goto('/transactions');

    // Open the pending expense (meta shows "REIMB €47,23").
    await page.getByPlaceholder(/search description or payee/i).fill(STAGED.pendingMerchant);
    await page
      .getByRole('button')
      .filter({ hasText: STAGED.pendingMerchant })
      .first()
      .click();
    await expect(page.getByText(/Awaiting reimbursement/i)).toBeVisible({ timeout: 10000 });

    // Manual resolve → picker with the SUGGESTED section on top.
    await page.getByText('Mark as reimbursed').click();
    await expect(page.getByText(/Suggested · Same amount/i)).toBeVisible({ timeout: 15000 });

    const suggestion = page.locator('button.border-l-accent').first();
    await expect(suggestion).toContainText(STAGED.matchMerchant);
    await expect(suggestion).toContainText('47,23');

    // Picker rows below the suggestions are newest-first.
    const dates = await page
      .locator('button.grid.w-full span.nums')
      .allTextContents();
    const parsed = dates
      .map((t) => t.trim())
      .filter((t) => /^[A-Z]{3} \d{1,2}$/.test(t))
      .map((t) => new Date(`${t} ${new Date().getFullYear()}`).getTime());
    const allIncome = parsed.slice(1); // skip the proximity-ranked suggestion row
    for (let i = 1; i < allIncome.length; i++) {
      expect(allIncome[i - 1]!).toBeGreaterThanOrEqual(allIncome[i]!);
    }

    // Pick the suggestion → reimbursement resolves, row flips to cleared.
    await suggestion.click();
    await expect(page.getByText(/Reimbursement resolved/i).first()).toBeVisible({ timeout: 15000 });
    await expect(
      page
        .getByRole('button')
        .filter({ hasText: STAGED.pendingMerchant })
        .filter({ hasText: 'REIMBURSED ✓' })
        .first()
    ).toBeVisible({ timeout: 15000 });
  });

  test('excludes reimbursed expenses from budget progress', async () => {
    test.skip(!authAvailable, 'Emulator stack not available');

    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // Expected: sum of this month's restaurant expenses that are NOT
    // reimbursed (pending or cleared), computed from raw emulator data.
    const docs = await listUserDocs('transactions');
    let expected = 0;
    let reimbursedSum = 0;
    for (const d of docs) {
      const f = d.fields;
      const amount = Number(f.amount?.doubleValue ?? f.amount?.integerValue ?? 0);
      const date = new Date(f.date?.timestampValue ?? 0);
      if (f.categoryId?.stringValue !== 'food-restaurants') continue;
      if (amount >= 0 || date < start || date > end) continue;
      const status = f.reimbursement?.mapValue?.fields?.status?.stringValue;
      if (status === 'pending' || status === 'cleared') {
        reimbursedSum += Math.abs(amount);
      } else {
        expected += Math.abs(amount);
      }
    }
    // Sanity: the staged reimbursed expenses are actually in the excluded set.
    expect(reimbursedSum).toBeGreaterThanOrEqual(STAGED.clearedAmount + STAGED.pendingAmount - 0.01);

    const idToken = await getIdToken();
    const progress = await fetchBudgetProgress(idToken, start, end);
    const restaurants = progress.find((b) => b.categoryId === 'food-restaurants');
    expect(restaurants, 'seeded restaurants budget should exist').toBeTruthy();
    expect(Math.abs(restaurants!.spent - expected)).toBeLessThan(0.01);
  });
});
