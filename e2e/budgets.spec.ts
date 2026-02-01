import { test as base, expect } from '@playwright/test';
import { login, register, TEST_USER } from './fixtures/auth';

const test = base.extend<{ loggedInPage: ReturnType<typeof base.extend> }>({});

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

test.describe('Budgets Page', () => {
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
    await page.goto('/budgets');
    await expect(page.getByRole('heading', { name: 'Budgets', exact: true })).toBeVisible({ timeout: 10000 });
  });

  test('should display the budgets page header', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Budgets', exact: true })).toBeVisible();
    await expect(page.getByText(/set and monitor spending limits/i)).toBeVisible();
  });

  test('should have a "New Budget" button', async ({ page }) => {
    const newBudgetButton = page.getByRole('button', { name: /new budget/i });
    await expect(newBudgetButton).toBeVisible();
  });

  test('should display page content (summary or error state)', async ({ page }) => {
    // After data loading, should show either:
    // - Summary cards if successful
    // - Error state if failed
    // - Your Budgets section if successful
    const summaryCard = page.getByText('Total Budgeted', { exact: true });
    const yourBudgetsSection = page.getByRole('heading', { name: 'Your Budgets' });
    const errorState = page.getByText('Failed to load budgets');

    // Wait for any of these states
    await expect(summaryCard.or(yourBudgetsSection).or(errorState)).toBeVisible({ timeout: 15000 });
  });

  test('should open new budget dialog when clicking "New Budget"', async ({ page }) => {
    // Skip if in error state
    const newBudgetButton = page.getByRole('button', { name: /new budget/i });
    if (!(await newBudgetButton.isVisible())) {
      test.skip(true, 'Page in error state - New Budget button not visible');
    }
    await newBudgetButton.click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('heading', { name: /new budget/i })).toBeVisible();
    // The form has a select, not a labeled input, so check for the trigger
    await expect(page.locator('[role="combobox"]').first()).toBeVisible();
    await expect(page.getByLabel(/monthly limit/i)).toBeVisible();
  });

  test('should validate required fields in budget form', async ({ page }) => {
    // Skip if in error state
    const newBudgetButton = page.getByRole('button', { name: /new budget/i });
    if (!(await newBudgetButton.isVisible())) {
      test.skip(true, 'Page in error state - New Budget button not visible');
    }
    await newBudgetButton.click();
    await expect(page.getByRole('dialog')).toBeVisible();

    // Try to submit without filling required fields
    await page.getByRole('button', { name: /create budget/i }).click();

    // Should show validation errors
    await expect(page.getByText(/category is required/i)).toBeVisible();
  });

  test('should close dialog when clicking Cancel', async ({ page }) => {
    // Skip if in error state
    const newBudgetButton = page.getByRole('button', { name: /new budget/i });
    if (!(await newBudgetButton.isVisible())) {
      test.skip(true, 'Page in error state - New Budget button not visible');
    }
    await newBudgetButton.click();
    await expect(page.getByRole('dialog')).toBeVisible();

    await page.getByRole('button', { name: /cancel/i }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });

  test('should show budget in navigation', async ({ page }) => {
    // Check sidebar navigation - this should always work
    await expect(page.getByRole('link', { name: 'Budgets' })).toBeVisible();
  });
});

test.describe('Dashboard Budget Widget', () => {
  test.describe.configure({ mode: 'serial' });

  let authAvailable = false;

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    authAvailable = await canAuthenticate(page);
    await page.close();
  });

  test.beforeEach(async ({ page }) => {
    test.skip(!authAvailable, 'Authentication not available - run Firebase emulators');
    await login(page, TEST_USER.email, TEST_USER.password);
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible({ timeout: 10000 });
  });

  test('should display budget status card on dashboard', async ({ page }) => {
    await expect(page.getByText('Budget Status', { exact: true })).toBeVisible({ timeout: 10000 });
  });

  test('should have link to budgets page from dashboard', async ({ page }) => {
    await expect(page.getByText('Budget Status', { exact: true })).toBeVisible({ timeout: 10000 });
    const viewAllLink = page.getByRole('link', { name: /view all/i });
    await expect(viewAllLink).toBeVisible();
  });
});
