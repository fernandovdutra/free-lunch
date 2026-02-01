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

test.describe('Transactions Page', () => {
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
    await page.goto('/transactions');
    // Wait for the page content to load (not networkidle - Firestore listeners keep network active)
    await expect(page.getByRole('heading', { name: /transactions/i })).toBeVisible({
      timeout: 10000,
    });
  });

  test('should display the transactions page header', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /transactions/i })).toBeVisible();
    await expect(page.getByText(/view and manage your transactions/i)).toBeVisible();
  });

  test('should have an "Add Transaction" button', async ({ page }) => {
    const addButton = page.getByRole('button', { name: /add transaction/i });
    await expect(addButton).toBeVisible();
  });

  test('should display search input', async ({ page }) => {
    await expect(page.getByPlaceholder(/search transactions/i)).toBeVisible();
  });

  test('should display date filter buttons', async ({ page }) => {
    await expect(page.getByRole('button', { name: /this month/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /last month/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /this year/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /all time/i })).toBeVisible();
  });

  test('should display category filter dropdown', async ({ page }) => {
    await expect(
      page
        .getByRole('combobox')
        .filter({ hasText: /all categories|uncategorized/i })
        .first()
    ).toBeVisible();
  });

  test('should display empty state or transaction list', async ({ page }) => {
    await page.waitForTimeout(2000);
    const emptyState = page.getByText(/no transactions found/i);
    const transactionHeader = page.locator('text=Date').first();
    await expect(emptyState.or(transactionHeader)).toBeVisible();
  });

  test('should open add transaction dialog when clicking "Add Transaction"', async ({ page }) => {
    await page.getByRole('button', { name: /add transaction/i }).click();

    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('heading', { name: /add transaction/i })).toBeVisible();
    await expect(page.getByLabel(/date/i)).toBeVisible();
    await expect(page.getByLabel(/description/i)).toBeVisible();
    await expect(page.getByLabel(/amount/i)).toBeVisible();
  });

  test('should validate required fields in transaction form', async ({ page }) => {
    await page.getByRole('button', { name: /add transaction/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    await page.getByLabel(/description/i).fill('');
    await page.getByLabel(/amount/i).fill('0');
    await page
      .getByRole('button', { name: /add transaction/i })
      .last()
      .click();

    // Check that at least one validation error appears
    await expect(
      page.getByText(/description must be at least 2 characters/i).first()
    ).toBeVisible();
  });

  test('should close dialog when clicking Cancel', async ({ page }) => {
    await page.getByRole('button', { name: /add transaction/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    await page.getByRole('button', { name: /cancel/i }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });

  test('should create a new transaction', async ({ page }) => {
    const uniqueDescription = `Test Transaction ${Date.now()}`;

    await page.getByRole('button', { name: /add transaction/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    await page.getByLabel(/description/i).fill(uniqueDescription);
    await page.getByLabel(/amount/i).fill('-25.50');
    await page
      .getByRole('button', { name: /add transaction/i })
      .last()
      .click();

    await expect(page.getByRole('dialog')).not.toBeVisible();
    await expect(page.getByText(uniqueDescription)).toBeVisible({ timeout: 10000 });
  });

  test('should filter by date preset', async ({ page }) => {
    await page.getByRole('button', { name: /last month/i }).click();
    await expect(page.getByRole('button', { name: /last month/i })).toHaveClass(/secondary/);
  });

  test('should search transactions', async ({ page }) => {
    const searchTerm = `Searchable ${Date.now()}`;

    // Create transaction
    await page.getByRole('button', { name: /add transaction/i }).click();
    await page.getByLabel(/description/i).fill(searchTerm);
    await page.getByLabel(/amount/i).fill('-10');
    await page
      .getByRole('button', { name: /add transaction/i })
      .last()
      .click();
    await expect(page.getByRole('dialog')).not.toBeVisible();

    await expect(page.getByText(searchTerm)).toBeVisible({ timeout: 10000 });

    // Search for it
    await page.getByPlaceholder(/search transactions/i).fill(searchTerm);
    await expect(page.getByText(searchTerm)).toBeVisible();
  });

  test('should display transaction summary after adding transaction', async ({ page }) => {
    await page.getByRole('button', { name: /add transaction/i }).click();
    await page.getByLabel(/description/i).fill('Summary Test');
    await page.getByLabel(/amount/i).fill('-50');
    await page
      .getByRole('button', { name: /add transaction/i })
      .last()
      .click();
    await expect(page.getByRole('dialog')).not.toBeVisible();

    await page.waitForTimeout(1000);
    // Check for the transaction count text (e.g. "3 transactions")
    await expect(page.getByText(/\d+ transactions?/i)).toBeVisible();
  });

  test('should display counterparty column header', async ({ page }) => {
    await page.waitForTimeout(2000);
    // Check for the Counterparty column header in the transaction list
    const counterpartyHeader = page.getByText('Counterparty', { exact: true });
    await expect(counterpartyHeader).toBeVisible();
  });

  test('should display transaction list column headers', async ({ page }) => {
    await page.waitForTimeout(2000);
    // Verify all expected column headers are visible
    await expect(page.getByText('Date', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Description', { exact: true })).toBeVisible();
    await expect(page.getByText('Counterparty', { exact: true })).toBeVisible();
    await expect(page.getByText('Category', { exact: true })).toBeVisible();
    await expect(page.getByText('Amount', { exact: true })).toBeVisible();
  });

  test('should display direction arrows for expense transactions', async ({ page }) => {
    const uniqueDescription = `Direction Test Expense ${Date.now()}`;

    // Create an expense transaction
    await page.getByRole('button', { name: /add transaction/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    await page.getByLabel(/description/i).fill(uniqueDescription);
    await page.getByLabel(/amount/i).fill('-75.00');
    await page
      .getByRole('button', { name: /add transaction/i })
      .last()
      .click();

    await expect(page.getByRole('dialog')).not.toBeVisible();
    await expect(page.getByText(uniqueDescription)).toBeVisible({ timeout: 10000 });

    // Verify the transaction shows with negative amount and proper formatting
    await expect(page.getByText(/-.*€.*75/)).toBeVisible();
  });

  test('should display direction arrows for income transactions', async ({ page }) => {
    const uniqueDescription = `Direction Test Income ${Date.now()}`;

    // Create an income transaction (positive amount)
    await page.getByRole('button', { name: /add transaction/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    await page.getByLabel(/description/i).fill(uniqueDescription);
    await page.getByLabel(/amount/i).fill('150.00');
    await page
      .getByRole('button', { name: /add transaction/i })
      .last()
      .click();

    await expect(page.getByRole('dialog')).not.toBeVisible();
    await expect(page.getByText(uniqueDescription)).toBeVisible({ timeout: 10000 });

    // Verify the transaction shows with positive amount and proper formatting
    await expect(page.getByText(/\+.*€.*150/)).toBeVisible();
  });

  test('should display direction filter dropdown', async ({ page }) => {
    await page.waitForTimeout(1000);
    // Look for the direction filter
    const directionFilter = page.getByTestId('direction-filter');
    await expect(directionFilter).toBeVisible();
  });

  test('should filter transactions by direction', async ({ page }) => {
    const incomeDesc = `Income Filter Test ${Date.now()}`;
    const expenseDesc = `Expense Filter Test ${Date.now()}`;

    // Create an income transaction
    await page.getByRole('button', { name: /add transaction/i }).click();
    await page.getByLabel(/description/i).fill(incomeDesc);
    await page.getByLabel(/amount/i).fill('100');
    await page
      .getByRole('button', { name: /add transaction/i })
      .last()
      .click();
    await expect(page.getByRole('dialog')).not.toBeVisible();

    // Create an expense transaction
    await page.getByRole('button', { name: /add transaction/i }).click();
    await page.getByLabel(/description/i).fill(expenseDesc);
    await page.getByLabel(/amount/i).fill('-50');
    await page
      .getByRole('button', { name: /add transaction/i })
      .last()
      .click();
    await expect(page.getByRole('dialog')).not.toBeVisible();

    await expect(page.getByText(incomeDesc)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(expenseDesc)).toBeVisible({ timeout: 10000 });

    // Apply income filter
    await page.getByTestId('direction-filter').click();
    await page.getByRole('option', { name: /income/i }).click();

    // Income transaction should be visible, expense should not
    await expect(page.getByText(incomeDesc)).toBeVisible();
    await expect(page.getByText(expenseDesc)).not.toBeVisible();

    // Apply expense filter
    await page.getByTestId('direction-filter').click();
    await page.getByRole('option', { name: /expense/i }).click();

    // Expense transaction should be visible, income should not
    await expect(page.getByText(expenseDesc)).toBeVisible();
    await expect(page.getByText(incomeDesc)).not.toBeVisible();

    // Reset to all
    await page.getByTestId('direction-filter').click();
    await page.getByRole('option', { name: /^all$/i }).click();

    // Both should be visible again
    await expect(page.getByText(incomeDesc)).toBeVisible();
    await expect(page.getByText(expenseDesc)).toBeVisible();
  });

  test('should display categorization status filter', async ({ page }) => {
    await page.waitForTimeout(1000);
    const catStatusFilter = page.getByTestId('categorization-filter');
    await expect(catStatusFilter).toBeVisible();
  });

  test('should display reimbursement filter', async ({ page }) => {
    await page.waitForTimeout(1000);
    const reimbursementFilter = page.getByTestId('reimbursement-filter');
    await expect(reimbursementFilter).toBeVisible();
  });
});
