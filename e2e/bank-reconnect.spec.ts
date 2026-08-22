import { test as base, expect } from '@playwright/test';
import { canAuthenticate, login } from './fixtures/auth';
import {
  STAGED_BANK_CONNECTION,
  removeStagedBankConnection,
  stageExpiredBankConnection,
} from './fixtures/emulator';

const test = base.extend({});

/**
 * Settings → Accounts & Sync for a connection whose PSD2 consent has lapsed.
 *
 * The failure this guards against is a user reading the only enabled control
 * on the card (DISCONNECT, which really does delete every transaction) as the
 * way to fix an expired bank. Re-authorizing keeps the connection doc and its
 * history — bankCallback matches the returning IBANs onto the existing doc —
 * so the card has to say that and offer the action.
 */
test.describe('Expired bank connection — reconnect', () => {
  // Staged data is shared by the whole describe: with fullyParallel the
  // hooks would otherwise run per worker and one worker's afterAll could
  // delete the connection out from under another worker's test.
  test.describe.configure({ mode: 'serial' });

  let authAvailable = false;

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    authAvailable = await canAuthenticate(page);
    await page.close();
    if (authAvailable) await stageExpiredBankConnection();
  });

  test.afterAll(async () => {
    if (authAvailable) await removeStagedBankConnection();
  });

  test.beforeEach(async ({ page }) => {
    test.skip(!authAvailable, 'Emulator stack not available');
    await login(page);
    await page.goto('/settings/accounts');
    // The card only appears once the getBankStatus callable resolves; the
    // Functions emulator cold-starts well past the default 5s expect timeout.
    await expect(page.getByText(STAGED_BANK_CONNECTION.bankName)).toBeVisible({
      timeout: 30_000,
    });
  });

  test('offers an enabled RECONNECT in place of the dead SYNC', async ({ page }) => {
    await expect(page.getByText('EXPIRED')).toBeVisible();

    const reconnect = page.getByTestId('reconnect-bank');
    await expect(reconnect).toBeVisible();
    await expect(reconnect).toBeEnabled();
    // SYNC can't succeed on a lapsed consent, so it isn't offered at all.
    await expect(page.getByText('↻ SYNC')).toHaveCount(0);

    await page.screenshot({ path: 'e2e/screenshots/bank-expired-reconnect.png' });
  });

  test('states that reconnecting preserves accounts and transactions', async ({ page }) => {
    await expect(page.getByText(/transactions stay exactly as they are/i)).toBeVisible();
  });

  test('drops the redundant "expires soon" banner once already expired', async ({ page }) => {
    // The banner used to fire on any consent within 7 days of expiry,
    // including long-expired ones, so the card read "EXPIRED" and
    // "expires soon" at the same time.
    await expect(page.getByText(/Bank consent expires soon/i)).toHaveCount(0);
  });

  test('points back at Reconnect from the destructive disconnect dialog', async ({ page }) => {
    await page.getByText('DISCONNECT', { exact: true }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(/delete all of its transactions/i)).toBeVisible();
    await expect(dialog.getByText(/keeps everything/i)).toBeVisible();

    await page.screenshot({ path: 'e2e/screenshots/bank-disconnect-dialog.png' });

    // Leave without disconnecting — the dialog is the dangerous path.
    await dialog.getByRole('button', { name: 'CANCEL' }).click();
    await expect(page.getByTestId('reconnect-bank')).toBeVisible();
  });
});
