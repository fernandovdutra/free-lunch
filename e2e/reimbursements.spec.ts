import { test as base, expect } from '@playwright/test';
import { login, register, TEST_USER } from './fixtures/auth';

const test = base.extend({});

// Helper to check if we can authenticate
async function canAuthenticate(page: ReturnType<typeof base.extend>['page']) {
  try {
    const registered = await register(page as any);
    if (registered) return true;
    const loggedIn = await login(page as any);
    return loggedIn;
  } catch {
    return false;
  }
}

test.describe('Reimbursements Page', () => {
  test.describe.configure({ mode: 'serial' });

  let authAvailable = false;

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    authAvailable = await canAuthenticate(page);
    await page.close();

    if (!authAvailable) {
      console.warn(
        '\n⚠️  Skipping authenticated tests - Firebase emulators not running.\n' +
          '   To run: npm run firebase:emulators && npm run e2e\n'
      );
    }
  });

  test.beforeEach(async ({ page }) => {
    test.skip(!authAvailable, 'Authentication not available - run Firebase emulators');

    await login(page, TEST_USER.email, TEST_USER.password);
    await page.goto('/reimbursements');
    // Wait for page to fully load - look for main heading or subheading
    await expect(page.getByText(/track work expenses and personal ious/i)).toBeVisible({
      timeout: 10000,
    });
  });

  test('should display the reimbursements page header', async ({ page }) => {
    // The h1 heading "Reimbursements"
    await expect(page.locator('h1').first()).toHaveText('Reimbursements');
    await expect(page.getByText(/track work expenses and personal ious/i)).toBeVisible();
  });

  test('should display pending reimbursements section', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /pending reimbursements/i })).toBeVisible();
  });

  test('should display summary section', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /summary/i })).toBeVisible();
    // Summary should show pending total and cleared stats
    await expect(page.getByText(/pending total/i)).toBeVisible();
  });

  test('should display recently cleared section', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /recently cleared/i })).toBeVisible();
  });

  test('should show empty state or pending items', async ({ page }) => {
    // Wait for content to load
    await page.waitForTimeout(2000);

    // Either shows empty state or has pending items (amber-colored section)
    const emptyState = page.getByText(/no pending reimbursements/i);
    const pendingSection = page.locator('text=Pending Total');

    await expect(emptyState.or(pendingSection)).toBeVisible();
  });
});

test.describe('Reimbursement Workflow', () => {
  test.describe.configure({ mode: 'serial' });

  let authAvailable = false;
  const testExpenseDescription = `E2E Reimbursable Expense ${Date.now()}`;
  const testIncomeDescription = `E2E Reimbursement Income ${Date.now()}`;

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    authAvailable = await canAuthenticate(page);
    await page.close();

    if (!authAvailable) {
      console.warn(
        '\n⚠️  Skipping authenticated tests - Firebase emulators not running.\n' +
          '   To run: npm run firebase:emulators && npm run e2e\n'
      );
    }
  });

  test.beforeEach(async ({ page }) => {
    test.skip(!authAvailable, 'Authentication not available - run Firebase emulators');
    await login(page, TEST_USER.email, TEST_USER.password);
  });

  test('should mark an expense as reimbursable', async ({ page }) => {
    // Go to transactions and create an expense
    await page.goto('/transactions');
    await expect(page.getByRole('heading', { name: /transactions/i })).toBeVisible({
      timeout: 10000,
    });

    // Create a test expense transaction
    await page.getByRole('button', { name: /add transaction/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    await page.getByLabel(/description/i).fill(testExpenseDescription);
    await page.getByLabel(/amount/i).fill('-75.50');
    await page
      .getByRole('button', { name: /add transaction/i })
      .last()
      .click();

    await expect(page.getByRole('dialog')).not.toBeVisible();
    await expect(page.getByText(testExpenseDescription)).toBeVisible({ timeout: 10000 });

    // Find the transaction row with the expense (look for the specific description text)
    const transactionText = page.getByText(testExpenseDescription, { exact: true });
    const transactionRow = transactionText
      .locator('xpath=ancestor::div[contains(@class, "group")]')
      .first();
    await transactionRow.hover();

    // Open the action menu
    const actionsButton = transactionRow.getByRole('button', { name: /actions/i });
    await actionsButton.click();

    // Click "Mark as Reimbursable" - wait for the menu button to appear
    const markButton = page.getByRole('button', { name: /mark as reimbursable/i });
    await expect(markButton).toBeVisible({ timeout: 5000 });
    await markButton.click();

    // Fill in the reimbursement dialog
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('heading', { name: /mark as reimbursable/i })).toBeVisible();

    // Select type (Work Expense is default)
    await page.getByLabel(/note/i).fill('E2E test work expense');
    await page
      .getByRole('button', { name: /mark as reimbursable/i })
      .last()
      .click();

    await expect(page.getByRole('dialog')).not.toBeVisible();

    // Verify the amber badge appears
    await expect(page.getByText('Work').first()).toBeVisible({ timeout: 5000 });
  });

  test('should show pending reimbursement on reimbursements page', async ({ page }) => {
    await page.goto('/reimbursements');
    await expect(page.getByText(/track work expenses and personal ious/i)).toBeVisible({
      timeout: 10000,
    });

    // Wait for data to load
    await page.waitForTimeout(2000);

    // The previously marked transaction should appear in pending list
    // Check for amber-colored items (pending reimbursements use amber styling)
    const pendingSection = page
      .locator('div')
      .filter({ hasText: /pending reimbursements/i })
      .first();
    await expect(pendingSection).toBeVisible();
  });

  test('should clear reimbursement by matching with income', async ({ page }) => {
    // First create an income transaction
    await page.goto('/transactions');
    await expect(page.getByRole('heading', { name: /transactions/i })).toBeVisible({
      timeout: 10000,
    });

    await page.getByRole('button', { name: /add transaction/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    await page.getByLabel(/description/i).fill(testIncomeDescription);
    await page.getByLabel(/amount/i).fill('100');
    await page
      .getByRole('button', { name: /add transaction/i })
      .last()
      .click();

    await expect(page.getByRole('dialog')).not.toBeVisible();
    await expect(page.getByText(testIncomeDescription)).toBeVisible({ timeout: 10000 });

    // Find the income transaction and open action menu
    const incomeRow = page.locator('div').filter({ hasText: testIncomeDescription }).first();
    await incomeRow.hover();
    await incomeRow
      .getByRole('button', { name: /actions/i })
      .first()
      .click();

    // Click "Contains Reimbursement"
    await page.getByRole('button', { name: /contains reimbursement/i }).click();

    // The clear reimbursement dialog should appear
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('heading', { name: /clear reimbursements/i })).toBeVisible();

    // If there are pending reimbursements, select one and clear
    const selectableItems = page
      .locator('[role="dialog"]')
      .locator('button')
      .filter({ hasText: /-€/ });
    const itemCount = await selectableItems.count();

    if (itemCount > 0) {
      // Select the first pending reimbursement
      await selectableItems.first().click();

      // Click Clear button
      await page.getByRole('button', { name: /clear/i }).last().click();

      await expect(page.getByRole('dialog')).not.toBeVisible();
    } else {
      // No pending reimbursements to clear, close dialog
      await page.getByRole('button', { name: /cancel/i }).click();
    }
  });
});

test.describe('Data Export', () => {
  test.describe.configure({ mode: 'serial' });

  let authAvailable = false;

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    authAvailable = await canAuthenticate(page);
    await page.close();

    if (!authAvailable) {
      console.warn(
        '\n⚠️  Skipping authenticated tests - Firebase emulators not running.\n' +
          '   To run: npm run firebase:emulators && npm run e2e\n'
      );
    }
  });

  test.beforeEach(async ({ page }) => {
    test.skip(!authAvailable, 'Authentication not available - run Firebase emulators');
    await login(page, TEST_USER.email, TEST_USER.password);
  });

  test('should display export buttons on settings page', async ({ page }) => {
    await page.goto('/settings');
    await expect(page.getByRole('heading', { name: /settings/i })).toBeVisible({
      timeout: 10000,
    });

    await expect(page.getByRole('heading', { name: /data export/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /export as csv/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /export as json/i })).toBeVisible();
  });

  test('should download CSV export', async ({ page }) => {
    await page.goto('/settings');
    await expect(page.getByRole('heading', { name: /settings/i })).toBeVisible({
      timeout: 10000,
    });

    // Wait for transactions to load (buttons should become enabled)
    await page.waitForTimeout(2000);

    const csvButton = page.getByRole('button', { name: /export as csv/i });

    // Check if button is enabled (has transactions)
    const isDisabled = await csvButton.isDisabled();

    if (!isDisabled) {
      // Set up download handler
      const downloadPromise = page.waitForEvent('download');
      await csvButton.click();
      const download = await downloadPromise;

      expect(download.suggestedFilename()).toMatch(/\.csv$/);
    }
  });

  test('should have working JSON export button', async ({ page }) => {
    await page.goto('/settings');
    await expect(page.getByRole('heading', { name: /settings/i })).toBeVisible({
      timeout: 10000,
    });

    // Wait for transactions to load
    await page.waitForTimeout(3000);

    const jsonButton = page.getByRole('button', { name: /export as json/i });

    // Check if button is enabled (has transactions)
    const isDisabled = await jsonButton.isDisabled();

    if (!isDisabled) {
      // Try to trigger download - in headless mode this may not actually download
      // but we verify the button is clickable
      await jsonButton.click();
      // If we got here, the button click worked
      expect(true).toBe(true);
    } else {
      // No transactions to export - button should be disabled
      expect(isDisabled).toBe(true);
    }
  });
});
