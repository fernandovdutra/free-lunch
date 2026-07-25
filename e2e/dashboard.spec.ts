import { test as base, expect } from '@playwright/test';
import { login, canAuthenticate } from './fixtures/auth';

const test = base.extend({});

/**
 * Home page (redesigned "calm terminal" dashboard): month navigation,
 * spent headline, category breakdown, recent transactions, tab bar.
 */
test.describe('Home', () => {
  let authAvailable = false;

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    authAvailable = await canAuthenticate(page);
    await page.close();
  });

  test.beforeEach(async ({ page }) => {
    test.skip(!authAvailable, 'Emulator stack not available');
    await login(page);
    await page.goto('/');
  });

  test('shows the month navigator with the current month', async ({ page }) => {
    const monthName = new Date()
      .toLocaleString('en-US', { month: 'long', year: 'numeric' })
      .toUpperCase();
    await expect(page.getByText(monthName)).toBeVisible({ timeout: 15000 });
  });

  test('shows the spent headline and balance row', async ({ page }) => {
    await expect(page.getByText(/SPENT ·/)).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/BALANCE/).first()).toBeVisible();
  });

  test('shows the category breakdown and recent transactions', async ({ page }) => {
    await expect(page.getByText('BY CATEGORY')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('RECENT TRANSACTIONS')).toBeVisible();
  });

  test('shows the bottom tab bar', async ({ page }) => {
    await expect(page.getByText('HOME', { exact: true }).first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('TXNS', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('BUDGET', { exact: true }).first()).toBeVisible();
  });
});
