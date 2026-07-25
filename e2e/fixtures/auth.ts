import { test as base, expect, type Page } from '@playwright/test';

// Credentials of the seeded emulator user created by scripts/seed-emulator.mjs.
// The E2E suite runs exclusively against the Firebase emulators (see
// docs/TESTING.md) — it never talks to production. Registration UI was
// removed in Phase 3, so login with the seeded user is the only auth path.
export const TEST_USER = {
  email: 'test@freelunch.local',
  password: 'test1234',
  displayName: 'Test User',
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
  // ?dev=1 reveals the email/password form. v8's Login is Google-only by default
  // and the dev fallback is gated behind this query param; e2e relies on the form.
  await page.goto('/login?dev=1');

  await page.waitForLoadState('domcontentloaded');
  const emailInput = page.getByLabel(/email/i);
  await emailInput.waitFor({ state: 'visible', timeout: 5000 });

  await emailInput.fill(email);
  await page.getByLabel(/password/i).fill(password);

  await Promise.all([
    page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 15000 }),
    page.getByRole('button', { name: /dev login/i }).click(),
  ]);

  const authenticated = await isAuthenticated(page);
  if (!authenticated) {
    await page.waitForTimeout(1000);
    return await isAuthenticated(page);
  }
  return true;
}

/**
 * Shared beforeAll probe: true when the emulator stack is up and the seeded
 * user can log in. Specs skip their authenticated tests when this is false
 * so the suite degrades gracefully instead of erroring without emulators.
 */
export async function canAuthenticate(page: Page): Promise<boolean> {
  try {
    return await login(page);
  } catch {
    return false;
  }
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
            '   2. Seed test user: FIREBASE_PROJECT_ID=<project> node scripts/seed-emulator.mjs\n' +
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
