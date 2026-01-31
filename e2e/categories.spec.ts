import { test as base, expect } from '@playwright/test';
import { login, register, TEST_USER } from './fixtures/auth';

// Create a test that requires authentication
const test = base.extend<{ loggedInPage: ReturnType<typeof base.extend> }>({});

// Helper to check if we can authenticate
async function canAuthenticate(page: ReturnType<typeof base.extend>['page']) {
  try {
    // Try to register
    const registered = await register(page as any);
    if (registered) return true;

    // Try to login
    const loggedIn = await login(page as any);
    return loggedIn;
  } catch {
    return false;
  }
}

test.describe('Categories Page', () => {
  // Skip entire describe block if running without emulators
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

    // Login before each test
    await login(page, TEST_USER.email, TEST_USER.password);

    // Navigate to categories page
    await page.goto('/categories');
    // Wait for the page content to load (not networkidle - Firestore listeners keep network active)
    await expect(page.getByRole('heading', { name: /categories/i })).toBeVisible({ timeout: 10000 });
  });

  test('should display the categories page header', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /categories/i })).toBeVisible();
    await expect(page.getByText(/organize your spending categories/i)).toBeVisible();
  });

  test('should have a "New Category" button', async ({ page }) => {
    const newCategoryButton = page.getByRole('button', { name: /new category/i });
    await expect(newCategoryButton).toBeVisible();
  });

  test('should display category tree card', async ({ page }) => {
    await expect(page.getByText(/category tree/i)).toBeVisible();
  });

  test('should display default system categories', async ({ page }) => {
    await expect(page.getByText('Income', { exact: true })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Housing', { exact: true })).toBeVisible();
    await expect(page.getByText('Transport', { exact: true })).toBeVisible();
    await expect(page.getByText('Food & Drink', { exact: true })).toBeVisible();
  });

  test('should show system badge for default categories', async ({ page }) => {
    await expect(page.getByText('System').first()).toBeVisible({ timeout: 10000 });
  });

  test('should open new category dialog when clicking "New Category"', async ({ page }) => {
    await page.getByRole('button', { name: /new category/i }).click();

    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('heading', { name: /new category/i })).toBeVisible();
    await expect(page.getByLabel(/name/i)).toBeVisible();
  });

  test('should validate required fields in category form', async ({ page }) => {
    await page.getByRole('button', { name: /new category/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    await page.getByLabel(/name/i).fill('');
    await page.getByRole('button', { name: /create category/i }).click();

    await expect(page.getByText(/name must be at least 2 characters/i)).toBeVisible();
  });

  test('should close dialog when clicking Cancel', async ({ page }) => {
    await page.getByRole('button', { name: /new category/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    await page.getByRole('button', { name: /cancel/i }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });

  test('should create a new category', async ({ page }) => {
    const uniqueName = `Test Category ${Date.now()}`;

    await page.getByRole('button', { name: /new category/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    await page.getByLabel(/name/i).fill(uniqueName);
    await page.getByRole('button', { name: /create category/i }).click();

    await expect(page.getByRole('dialog')).not.toBeVisible();
    await expect(page.getByText(uniqueName, { exact: true })).toBeVisible({ timeout: 10000 });
  });

  test('should show child categories expanded by default', async ({ page }) => {
    await expect(page.getByText('Income', { exact: true })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Salary', { exact: true })).toBeVisible();
  });

  test('should show edit button on hover for categories', async ({ page }) => {
    await expect(page.getByText('Income', { exact: true })).toBeVisible({ timeout: 10000 });
    await page.getByText('Income', { exact: true }).hover();
    await expect(page.getByRole('button', { name: /edit income/i })).toBeVisible();
  });
});
