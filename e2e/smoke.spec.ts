import { test as base, expect } from '@playwright/test';
import { login, TEST_USER } from './fixtures/auth';

const test = base.extend({});

test.describe('Smoke Tests', () => {
  test('app loads without crashing', async ({ page }) => {
    const response = await page.goto('/');

    expect(response?.status()).toBeLessThan(400);

    await expect(page).toHaveTitle(/free lunch/i);
  });

  test('login page renders correctly', async ({ page }) => {
    await page.goto('/login');

    // New calm-terminal Login: wordmark, READY status, Google CTA.
    // The dev-only fallback is also rendered against the dev server.
    await expect(page.getByRole('heading', { name: /free lunch/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /continue with google/i })).toBeVisible();

    await page.screenshot({ path: 'e2e/screenshots/login-page.png' });
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

    const criticalErrors = errors.filter(
      (e) => !e.includes('Firebase') && !e.includes('third-party')
    );

    expect(criticalErrors).toHaveLength(0);
  });
});

test.describe('Header Sync Button', () => {
  async function canAuthenticate(page: ReturnType<typeof base.extend>['page']) {
    try {
      return await login(page as any);
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
    await expect(page.getByRole('heading', { name: /dashboard|welcome|free lunch/i })).toBeVisible({
      timeout: 10000,
    });

    const syncButton = page.getByRole('button', { name: /sync/i });
    await expect(syncButton).toBeVisible();
  });

  test('should handle sync button click', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /dashboard|welcome|free lunch/i })).toBeVisible({
      timeout: 10000,
    });

    const syncButton = page.getByRole('button', { name: /sync/i });
    await syncButton.click();

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
