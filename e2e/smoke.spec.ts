import { test, expect } from '@playwright/test';

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
