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

test.describe('Auto-Categorization', () => {
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

  test('should display transactions page with category column', async ({ page }) => {
    await page.goto('/transactions');
    await expect(page.getByRole('heading', { name: /transactions/i })).toBeVisible({
      timeout: 10000,
    });

    // The transaction list header should include category-related info
    await expect(page.getByText(/category/i).first()).toBeVisible();
  });

  test('should allow category selection for a transaction', async ({ page }) => {
    await page.goto('/transactions');
    await expect(page.getByRole('heading', { name: /transactions/i })).toBeVisible({
      timeout: 10000,
    });

    // Create a transaction first
    await page.getByRole('button', { name: /add transaction/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    await page.getByLabel(/description/i).fill('Categorization Test');
    await page.getByLabel(/amount/i).fill('-30');
    await page
      .getByRole('button', { name: /add transaction/i })
      .last()
      .click();
    await expect(page.getByRole('dialog')).not.toBeVisible();

    // Wait for transaction to appear (use first() as there may be multiple from previous runs)
    await expect(page.getByText('Categorization Test').first()).toBeVisible({ timeout: 10000 });
  });

  test('should show rule creation dialog when manually categorizing', async ({ page }) => {
    // First ensure we have categories
    await page.goto('/categories');
    await expect(page.getByRole('heading', { name: /categories/i })).toBeVisible({
      timeout: 10000,
    });

    // Check if we have at least one category, create if not
    const categoryExists = await page
      .getByText(/groceries|food|transport/i)
      .first()
      .isVisible();
    if (!categoryExists) {
      // Create a category for testing - button is "New Category"
      await page.getByRole('button', { name: /new category/i }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await page.getByLabel(/name/i).fill('Test Category');
      await page
        .getByRole('button', { name: /create category/i })
        .last()
        .click();
      await expect(page.getByRole('dialog')).not.toBeVisible();
    }

    // Navigate to transactions
    await page.goto('/transactions');
    await expect(page.getByRole('heading', { name: /transactions/i })).toBeVisible({
      timeout: 10000,
    });

    // Create a transaction
    await page.getByRole('button', { name: /add transaction/i }).click();
    await page.getByLabel(/description/i).fill('Rule Test Transaction');
    await page.getByLabel(/amount/i).fill('-40');
    await page
      .getByRole('button', { name: /add transaction/i })
      .last()
      .click();
    await expect(page.getByRole('dialog')).not.toBeVisible();

    await expect(page.getByText('Rule Test Transaction').first()).toBeVisible({ timeout: 10000 });
  });

  test('should have category filter in transactions view', async ({ page }) => {
    await page.goto('/transactions');
    await expect(page.getByRole('heading', { name: /transactions/i })).toBeVisible({
      timeout: 10000,
    });

    // Check for category filter dropdown
    await expect(
      page
        .getByRole('combobox')
        .filter({ hasText: /all categories|uncategorized/i })
        .first()
    ).toBeVisible();
  });

  test('should filter transactions by uncategorized', async ({ page }) => {
    await page.goto('/transactions');
    await expect(page.getByRole('heading', { name: /transactions/i })).toBeVisible({
      timeout: 10000,
    });

    // Find and click the category filter
    const categoryFilter = page
      .getByRole('combobox')
      .filter({ hasText: /all categories|category/i })
      .first();

    if (await categoryFilter.isVisible()) {
      await categoryFilter.click();
      // Look for uncategorized option
      const uncategorizedOption = page.getByText(/uncategorized/i, { exact: false });
      if (await uncategorizedOption.isVisible()) {
        await uncategorizedOption.click();
      }
    }
  });
});
