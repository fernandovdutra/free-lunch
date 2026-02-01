import { test as base, expect } from '@playwright/test';
import { login, register, TEST_USER } from './fixtures/auth';

const test = base.extend({});

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

test.describe('Month Navigation', () => {
  test.describe.configure({ mode: 'serial' });

  let authAvailable = false;

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    authAvailable = await canAuthenticate(page);
    await page.close();
  });

  test.beforeEach(async ({ page }) => {
    test.skip(!authAvailable, 'Authentication not available - run Firebase emulators');
    await login(page, TEST_USER.email, TEST_USER.password);
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible({ timeout: 10000 });
  });

  test('should display month selector in header', async ({ page }) => {
    // Month and year selectors should be visible
    await expect(page.locator('button[aria-label="Previous month"]')).toBeVisible();
    await expect(page.locator('button[aria-label="Next month"]')).toBeVisible();
  });

  test('should navigate to previous month', async ({ page }) => {
    const prevButton = page.locator('button[aria-label="Previous month"]');
    await prevButton.click();

    // Today button should appear when not on current month
    await expect(page.getByRole('button', { name: /today/i })).toBeVisible();
  });

  test('should return to current month with Today button', async ({ page }) => {
    // Go to previous month first
    await page.locator('button[aria-label="Previous month"]').click();
    await expect(page.getByRole('button', { name: /today/i })).toBeVisible();

    // Click Today
    await page.getByRole('button', { name: /today/i }).click();

    // Today button should disappear
    await expect(page.getByRole('button', { name: /today/i })).not.toBeVisible();
  });
});

test.describe('Counterparty Analytics', () => {
  test.describe.configure({ mode: 'serial' });

  let authAvailable = false;

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    authAvailable = await canAuthenticate(page);
    await page.close();
  });

  test.beforeEach(async ({ page }) => {
    test.skip(!authAvailable, 'Authentication not available - run Firebase emulators');
    await login(page, TEST_USER.email, TEST_USER.password);
    await page.goto('/transactions');
    await expect(page.getByRole('heading', { name: /transactions/i })).toBeVisible({ timeout: 10000 });
  });

  test('should show counterparty dialog when clicking counterparty', async ({ page }) => {
    // Wait for transactions to load
    await page.waitForTimeout(2000);

    // Find a clickable counterparty (might be empty if no transactions)
    const counterpartyButton = page.locator('button').filter({ hasText: /albert|jumbo|ns/i }).first();

    // Skip if no counterparties found
    if (!(await counterpartyButton.isVisible())) {
      test.skip();
      return;
    }

    await counterpartyButton.click();

    // Dialog should appear
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText(/spending summary/i)).toBeVisible();
  });

  test('should navigate to counterparty detail page from dialog', async ({ page }) => {
    await page.waitForTimeout(2000);

    const counterpartyButton = page.locator('button').filter({ hasText: /albert|jumbo|ns/i }).first();

    if (!(await counterpartyButton.isVisible())) {
      test.skip();
      return;
    }

    await counterpartyButton.click();
    await expect(page.getByRole('dialog')).toBeVisible();

    // Click view full history
    await page.getByRole('button', { name: /view full history/i }).click();

    // Should navigate to detail page
    await expect(page).toHaveURL(/\/counterparty\//);
    await expect(page.getByText(/spending analytics/i)).toBeVisible();
  });
});

test.describe('Counterparty Detail Page', () => {
  test.describe.configure({ mode: 'serial' });

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

  test('should display counterparty detail page structure', async ({ page }) => {
    // Navigate directly to a test counterparty
    await page.goto('/counterparty/Test%20Merchant');

    // Should show the page structure even if no data
    await expect(page.getByText(/spending analytics/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /go back/i })).toBeVisible();
  });

  test('should navigate back from detail page', async ({ page }) => {
    // Go to transactions first
    await page.goto('/transactions');
    await expect(page.getByRole('heading', { name: /transactions/i })).toBeVisible({ timeout: 10000 });

    // Navigate to counterparty detail
    await page.goto('/counterparty/Test');
    await expect(page.getByText(/spending analytics/i)).toBeVisible();

    // Click back button
    await page.getByRole('button', { name: /go back/i }).click();

    // Should go back
    await expect(page).not.toHaveURL(/\/counterparty\//);
  });
});
