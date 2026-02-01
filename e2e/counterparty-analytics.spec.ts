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
    // Month and year selectors should be visible (use :visible filter for desktop)
    await page.waitForTimeout(1000);
    // Use filter for visible buttons since there's one for mobile and one for desktop
    await expect(page.locator('button[aria-label="Previous month"]:visible')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('button[aria-label="Next month"]:visible')).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to previous month', async ({ page }) => {
    const prevButton = page.locator('button[aria-label="Previous month"]:visible');
    await prevButton.click();

    // Today button should appear when not on current month
    await expect(page.getByRole('button', { name: /today/i })).toBeVisible({ timeout: 5000 });
  });

  test('should return to current month with Today button', async ({ page }) => {
    // Go to previous month first
    await page.locator('button[aria-label="Previous month"]:visible').click();
    await expect(page.getByRole('button', { name: /today/i })).toBeVisible({ timeout: 5000 });

    // Click Today
    await page.getByRole('button', { name: /today/i }).click();

    // Today button should disappear
    await expect(page.getByRole('button', { name: /today/i })).not.toBeVisible({ timeout: 5000 });
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
    await page.waitForTimeout(3000);

    // Find the counterparty column buttons within the transaction list
    // These are buttons inside the w-32 counterparty column
    const counterpartyButtons = page.locator('div.w-32 button');
    const firstCounterparty = counterpartyButtons.first();

    // Check if there are any counterparty buttons visible
    const buttonCount = await counterpartyButtons.count();
    if (buttonCount === 0 || !(await firstCounterparty.isVisible())) {
      test.skip(true, 'No transactions with counterparties found');
      return;
    }

    await firstCounterparty.click();

    // Dialog should appear
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/spending summary/i)).toBeVisible();
  });

  test('should navigate to counterparty detail page from dialog', async ({ page }) => {
    await page.waitForTimeout(3000);

    const counterpartyButtons = page.locator('div.w-32 button');
    const firstCounterparty = counterpartyButtons.first();

    const buttonCount = await counterpartyButtons.count();
    if (buttonCount === 0 || !(await firstCounterparty.isVisible())) {
      test.skip(true, 'No transactions with counterparties found');
      return;
    }

    await firstCounterparty.click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });

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
