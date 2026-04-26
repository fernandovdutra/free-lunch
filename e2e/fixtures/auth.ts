import { test as base, expect, type Page } from '@playwright/test';

// Test user credentials for E2E tests (use with Firebase emulators).
// The seeded test user is created by scripts/seed-emulator.mjs;
// e2e tests rely on that seed and only exercise login (registration UI removed in Phase 3).
export const TEST_USER = {
  email: 'e2e-test@freelunch.test',
  password: 'TestPassword123!',
  displayName: 'E2E Test User',
};

let authAvailable: boolean | null = null;

async function isAuthenticated(page: Page): Promise<boolean> {
  const url = page.url();
  return !url.includes('/login');
}

/**
 * Login helper. The redesigned Login page only exposes Google by default;
 * the email/password form is rendered when import.meta.env.DEV is true,
 * which is the case for the dev server Playwright runs against.
 */
export async function login(page: Page, email = TEST_USER.email, password = TEST_USER.password) {
  await page.goto('/login');

  await page.waitForLoadState('domcontentloaded');
  const emailInput = page.getByLabel(/email/i);
  await emailInput.waitFor({ state: 'visible', timeout: 5000 });

  await emailInput.fill(email);
  await page.getByLabel(/password/i).fill(password);

  await Promise.all([
    page.waitForURL(/\/(dashboard|categories|transactions)?$/, { timeout: 15000 }),
    page.getByRole('button', { name: /dev login/i }).click(),
  ]);

  const authenticated = await isAuthenticated(page);
  if (!authenticated) {
    await page.waitForTimeout(1000);
    return await isAuthenticated(page);
  }
  return true;
}

export const test = base.extend<{
  authenticatedPage: Page;
  isAuthAvailable: boolean;
}>({
  isAuthAvailable: async ({ page }, use) => {
    if (authAvailable === null) {
      try {
        authAvailable = await login(page);
      } catch {
        authAvailable = false;
      }

      if (!authAvailable) {
        console.warn(
          '\n⚠️  Authentication not available - Firebase emulators may not be running.\n' +
            '   To run authenticated tests:\n' +
            '   1. Start emulators: npm run firebase:emulators\n' +
            '   2. Seed test user: npm run seed:emulator (or ensure scripts/seed-emulator.mjs ran)\n' +
            '   3. Enable emulators in .env.local: VITE_USE_EMULATORS=true\n' +
            '   4. Run tests: npm run e2e\n'
        );
      }
    }

    await use(authAvailable);
  },

  authenticatedPage: async ({ page, isAuthAvailable }, use) => {
    if (!isAuthAvailable) {
      await login(page);
    } else if (!(await isAuthenticated(page))) {
      await login(page);
    }

    await use(page);
  },
});

export { expect };

export function skipIfNoAuth(isAuthAvailable: boolean) {
  if (!isAuthAvailable) {
    test.skip();
  }
}
