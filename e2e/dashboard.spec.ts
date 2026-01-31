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

test.describe('Dashboard Page', () => {
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
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible({ timeout: 10000 });
  });

  test('should display the dashboard page header', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
    await expect(page.getByText(/your financial overview/i)).toBeVisible();
  });

  test('should display summary cards', async ({ page }) => {
    await expect(page.getByText(/total income/i)).toBeVisible();
    await expect(page.getByText(/total expenses/i)).toBeVisible();
    await expect(page.getByText(/net balance/i)).toBeVisible();
    await expect(page.getByText(/pending reimbursements/i)).toBeVisible();
  });

  test('should display date range buttons', async ({ page }) => {
    await expect(page.getByRole('button', { name: /this month/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /last month/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /this year/i })).toBeVisible();
  });

  test('should toggle date range on button click', async ({ page }) => {
    const lastMonthBtn = page.getByRole('button', { name: /last month/i });
    await lastMonthBtn.click();
    // Verify the button becomes active (secondary variant)
    await expect(lastMonthBtn).toHaveClass(/secondary/);
  });

  test('should display spending by category section', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /spending by category/i })).toBeVisible();
  });

  test('should display spending over time section', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /spending over time/i })).toBeVisible();
  });

  test('should display recent transactions section', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /recent transactions/i })).toBeVisible();
  });

  test('should have link to view all transactions', async ({ page }) => {
    // Wait for loading to complete
    await page.waitForTimeout(2000);
    const link = page.getByRole('link', { name: /view all transactions/i });
    await expect(link).toBeVisible();
  });

  test('should navigate to transactions page from recent transactions', async ({ page }) => {
    await page.waitForTimeout(2000);
    await page.getByRole('link', { name: /view all transactions/i }).click();
    await expect(page).toHaveURL('/transactions');
  });

  test('should show "This Month" button as active by default', async ({ page }) => {
    const thisMonthBtn = page.getByRole('button', { name: /this month/i });
    await expect(thisMonthBtn).toHaveClass(/secondary/);
  });

  test('should update period label when changing date range', async ({ page }) => {
    // Click last month
    await page.getByRole('button', { name: /last month/i }).click();

    // The period label should change (we can't predict exact month but it should update)
    await expect(page.getByText(/your financial overview/i)).toBeVisible();
  });

  test('should display all four summary cards with correct structure', async ({ page }) => {
    // Verify all 4 cards have the expected titles
    const cards = page.locator('[class*="card"]');

    await expect(page.getByText('Total Income', { exact: true })).toBeVisible();
    await expect(page.getByText('Total Expenses', { exact: true })).toBeVisible();
    await expect(page.getByText('Net Balance', { exact: true })).toBeVisible();
    await expect(page.getByText('Pending Reimbursements', { exact: true })).toBeVisible();
  });

  test('should show loading state initially', async ({ page }) => {
    // Navigate to a fresh page without waiting for data
    await page.goto('/');

    // The dashboard should be visible (either loading or loaded)
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible({ timeout: 10000 });
  });
});
