import { test as base, expect } from '@playwright/test';
import { login, register, TEST_USER } from './fixtures/auth';

const test = base.extend({});

test.describe('Smoke Tests', () => {
  test('app loads without crashing', async ({ page }) => {
    const response = await page.goto('/');

    // Should get a successful response
    expect(response?.status()).toBeLessThan(400);

    // Should have the app title
    await expect(page).toHaveTitle(/free lunch/i);
  });

  test('login page renders correctly', async ({ page }) => {
    await page.goto('/login');

    // Check key elements are present
    await expect(page.getByText('Free Lunch')).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /google/i })).toBeVisible();

    // Take a screenshot for visual verification
    await page.screenshot({ path: 'e2e/screenshots/login-page.png' });
  });

  test('register page renders correctly', async ({ page }) => {
    await page.goto('/register');

    // Check key elements are present
    await expect(page.getByText('Free Lunch')).toBeVisible();
    await expect(page.getByRole('button', { name: /create account/i })).toBeVisible();

    // Take a screenshot for visual verification
    await page.screenshot({ path: 'e2e/screenshots/register-page.png' });
  });

  test('no console errors on page load', async ({ page }) => {
    const errors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Filter out expected Firebase/third-party warnings
    const criticalErrors = errors.filter(
      (e) => !e.includes('Firebase') && !e.includes('third-party')
    );

    expect(criticalErrors).toHaveLength(0);
  });
});

test.describe('Header Sync Button', () => {
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

  let authAvailable = false;

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    authAvailable = await canAuthenticate(page);
    await page.close();
  });

  test.beforeEach(async ({ page }) => {
    test.skip(!authAvailable, 'Authentication not available - run Firebase emulators');
    await login(page, TEST_USER.email, TEST_USER.password);
  });

  test('should show sync button in header', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /dashboard|welcome/i })).toBeVisible({
      timeout: 10000,
    });

    // Find sync button
    const syncButton = page.getByRole('button', { name: /sync/i });
    await expect(syncButton).toBeVisible();
  });

  test('should handle sync button click', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /dashboard|welcome/i })).toBeVisible({
      timeout: 10000,
    });

    // Click sync button
    const syncButton = page.getByRole('button', { name: /sync/i });
    await syncButton.click();

    // Should either show loading state, toast notification, or "no connections" message
    // Wait for any of these outcomes - use first() to handle multiple matches
    await expect(
      page
        .getByText(/syncing/i)
        .or(page.getByText(/no bank connections/i))
        .or(page.getByText(/sync complete/i))
        .or(page.getByText(/sync failed/i))
        .first()
    ).toBeVisible({ timeout: 10000 });
  });
});
