import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should show login page for unauthenticated users', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveURL(/\/login/);

    // New calm-terminal Login: wordmark + Google CTA. Email/password is dev-only.
    await expect(page.getByRole('heading', { name: /free lunch/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /continue with google/i })).toBeVisible();
  });

  test('should expose dev-only email/password fallback in dev builds', async ({ page }) => {
    await page.goto('/login');

    // The dev fallback renders only when import.meta.env.DEV is true.
    // The Playwright dev server is a dev build, so the fields must be present.
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /dev login/i })).toBeVisible();
  });

  test('should show error for invalid login', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel(/email/i).fill('invalid@test.com');
    await page.getByLabel(/password/i).fill('wrongpassword');
    await page.getByRole('button', { name: /dev login/i }).click();

    await expect(page.getByText(/invalid email or password/i)).toBeVisible({ timeout: 10000 });
  });
});

test.describe('App Layout', () => {
  test.skip('should show home after login', async () => {
    // Requires authenticated test user; covered by other suites that use the auth fixture.
  });
});
