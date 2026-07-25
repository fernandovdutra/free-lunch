import { test as base, expect } from '@playwright/test';
import { login, canAuthenticate } from './fixtures/auth';

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
      (e) =>
        !e.includes('Firebase') &&
        !e.includes('third-party') &&
        // Emulator warm-up can drop a request; not an app defect.
        !e.includes('ERR_CONNECTION')
    );

    expect(criticalErrors).toHaveLength(0);
  });
});

test.describe('Authenticated smoke', () => {
  let authAvailable = false;

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    authAvailable = await canAuthenticate(page);
    await page.close();
  });

  test.beforeEach(async ({ page }) => {
    test.skip(!authAvailable, 'Emulator stack not available');
    await login(page);
  });

  test('login lands on the Home dashboard', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText(/SPENT ·/)).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('TXNS', { exact: true }).first()).toBeVisible();
  });
});
