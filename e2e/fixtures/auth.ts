import { test as base, expect, type Page } from '@playwright/test';

// Test user credentials for E2E tests (use with Firebase emulators)
export const TEST_USER = {
  email: 'e2e-test@freelunch.test',
  password: 'TestPassword123!',
  displayName: 'E2E Test User',
};

// Global flag to track if authentication is available
let authAvailable: boolean | null = null;

/**
 * Check if we're on an authenticated page (not login/register)
 */
async function isAuthenticated(page: Page): Promise<boolean> {
  const url = page.url();
  return !url.includes('/login') && !url.includes('/register');
}

/**
 * Login helper function
 */
export async function login(page: Page, email = TEST_USER.email, password = TEST_USER.password) {
  await page.goto('/login');

  // Wait for the login form to be ready
  await page.waitForLoadState('domcontentloaded');
  const emailInput = page.getByLabel(/email/i);
  await emailInput.waitFor({ state: 'visible', timeout: 5000 });

  // Fill in credentials
  await emailInput.fill(email);
  await page.getByLabel(/password/i).fill(password);

  // Click sign in and wait for navigation
  await Promise.all([
    page.waitForURL(/\/(dashboard|categories|transactions)?$/, { timeout: 15000 }),
    page.getByRole('button', { name: /sign in/i }).click(),
  ]);

  // Verify we're actually authenticated
  const authenticated = await isAuthenticated(page);
  if (!authenticated) {
    // Try to wait a bit more for redirect
    await page.waitForTimeout(1000);
    return await isAuthenticated(page);
  }
  return true;
}

/**
 * Register helper function
 */
export async function register(
  page: Page,
  name = TEST_USER.displayName,
  email = TEST_USER.email,
  password = TEST_USER.password
) {
  await page.goto('/register');

  // Wait for the form to be ready
  await page.waitForLoadState('domcontentloaded');
  const nameInput = page.getByLabel(/name/i);
  await nameInput.waitFor({ state: 'visible', timeout: 5000 });

  // Fill in registration form
  await nameInput.fill(name);
  await page.getByLabel(/email/i).fill(email);
  // Handle both password fields
  const passwordInputs = page.getByLabel(/password/i);
  await passwordInputs.first().fill(password);
  if ((await passwordInputs.count()) > 1) {
    await passwordInputs.nth(1).fill(password);
  }

  // Click create account and wait for navigation
  try {
    await Promise.all([
      page.waitForURL(/\/(dashboard|categories|transactions)?$/, { timeout: 15000 }),
      page.getByRole('button', { name: /create account/i }).click(),
    ]);
    return await isAuthenticated(page);
  } catch {
    return false;
  }
}

/**
 * Extended test fixture with authentication helpers
 */
export const test = base.extend<{
  authenticatedPage: Page;
  isAuthAvailable: boolean;
}>({
  isAuthAvailable: async ({ page }, use) => {
    // Check auth availability only once
    if (authAvailable === null) {
      // Try to register first (in case user doesn't exist)
      const registered = await register(page);

      if (!registered) {
        // If registration failed (user might exist), try to login
        const loggedIn = await login(page);
        authAvailable = loggedIn;
      } else {
        authAvailable = true;
      }

      if (!authAvailable) {
        console.warn(
          '\n⚠️  Authentication not available - Firebase emulators may not be running.\n' +
            '   To run authenticated tests:\n' +
            '   1. Start emulators: npm run firebase:emulators\n' +
            '   2. Enable emulators in .env.local: VITE_USE_EMULATORS=true\n' +
            '   3. Run tests: npm run e2e\n'
        );
      }
    }

    await use(authAvailable);
  },

  authenticatedPage: async ({ page, isAuthAvailable }, use) => {
    if (!isAuthAvailable) {
      // Try one more time in case state changed
      const loggedIn = await register(page);
      if (!loggedIn) {
        await login(page);
      }
    } else {
      // Already authenticated from isAuthAvailable check, just make sure we're logged in
      if (!(await isAuthenticated(page))) {
        await login(page);
      }
    }

    await use(page);
  },
});

export { expect };

/**
 * Helper to skip test if auth is not available
 * Use in beforeEach or individual tests
 */
export function skipIfNoAuth(isAuthAvailable: boolean) {
  if (!isAuthAvailable) {
    test.skip();
  }
}
