import { describe, it, expect } from 'vitest';

import {
  bankSlug,
  canReconnect,
  daysUntilConsentExpiry,
  isConsentExpiringSoon,
  resolveReconnectTarget,
} from '../reconnectBank';
import type { Bank, BankConnectionStatus } from '../bankingFunctions';

const bank = (name: string, country = 'NL'): Bank => ({
  name,
  country,
  logo: '',
  bic: '',
});

const BANKS: Bank[] = [bank('ABN AMRO'), bank('ING'), bank('Revolut', 'LT')];

function connection(over: Partial<BankConnectionStatus> = {}): BankConnectionStatus {
  return {
    id: 'abn_amro_1',
    bankName: 'ABN AMRO',
    bankId: 'abn_amro',
    status: 'expired',
    accountCount: 1,
    accounts: [],
    lastSync: null,
    consentExpiresAt: null,
    lastAutoSyncAt: null,
    lastAutoSyncError: null,
    ...over,
  };
}

describe('bankSlug', () => {
  it('matches the slug recipe bankCallback stores as bankId', () => {
    expect(bankSlug('ABN AMRO')).toBe('abn_amro');
    expect(bankSlug('Van Lanschot')).toBe('van_lanschot');
    expect(bankSlug('ING')).toBe('ing');
  });
});

describe('resolveReconnectTarget', () => {
  it('prefers an exact match on the displayed bank name', () => {
    expect(resolveReconnectTarget(connection(), BANKS)).toEqual({
      bankName: 'ABN AMRO',
      bankCountry: 'NL',
    });
  });

  it('carries the country from the matched bank entry', () => {
    const target = resolveReconnectTarget(
      connection({ bankName: 'Revolut', bankId: 'revolut' }),
      BANKS
    );
    expect(target).toEqual({ bankName: 'Revolut', bankCountry: 'LT' });
  });

  it('falls back to bankId when the bank has renamed itself since', () => {
    // Stored display name came from a previous session's aspsp.name.
    const target = resolveReconnectTarget(
      connection({ bankName: 'ABN AMRO Bank N.V.', bankId: 'abn_amro' }),
      BANKS
    );
    expect(target).toEqual({ bankName: 'ABN AMRO', bankCountry: 'NL' });
  });

  it('matches case-insensitively when neither name nor slug lines up', () => {
    const target = resolveReconnectTarget(
      connection({ bankName: 'abn amro', bankId: 'something_else' }),
      BANKS
    );
    expect(target).toEqual({ bankName: 'ABN AMRO', bankCountry: 'NL' });
  });

  it('uses the stored name and omits country when the bank list is empty', () => {
    // Happens while getAvailableBanks is still loading; the backend applies
    // its own NL default when bankCountry is absent.
    const target = resolveReconnectTarget(connection(), []);
    expect(target).toEqual({ bankName: 'ABN AMRO' });
    expect('bankCountry' in target).toBe(false);
  });

  it('tolerates a backend that does not return bankId yet', () => {
    const { bankId: _omitted, ...withoutBankId } = connection();
    expect(resolveReconnectTarget(withoutBankId, BANKS)).toEqual({
      bankName: 'ABN AMRO',
      bankCountry: 'NL',
    });
  });
});

describe('canReconnect', () => {
  it('offers reconnect for dead consents only', () => {
    expect(canReconnect('expired')).toBe(true);
    expect(canReconnect('error')).toBe(true);
    expect(canReconnect('active')).toBe(false);
  });
});

describe('daysUntilConsentExpiry', () => {
  const now = Date.parse('2026-08-22T12:00:00Z');

  it('rounds up so an expiry later today reads as one day', () => {
    expect(daysUntilConsentExpiry('2026-08-22T18:00:00Z', now)).toBe(1);
  });

  it('counts whole days ahead', () => {
    expect(daysUntilConsentExpiry('2026-08-27T12:00:00Z', now)).toBe(5);
  });

  it('goes negative once the consent has lapsed', () => {
    expect(daysUntilConsentExpiry('2026-08-20T12:00:00Z', now)).toBe(-2);
  });

  it('returns null without a usable date', () => {
    expect(daysUntilConsentExpiry(null, now)).toBeNull();
    expect(daysUntilConsentExpiry(undefined, now)).toBeNull();
    expect(daysUntilConsentExpiry('not-a-date', now)).toBeNull();
  });
});

describe('isConsentExpiringSoon', () => {
  const now = Date.parse('2026-08-22T12:00:00Z');

  it('warns inside the seven-day window', () => {
    expect(
      isConsentExpiringSoon(
        connection({ status: 'active', consentExpiresAt: '2026-08-27T12:00:00Z' }),
        now
      )
    ).toBe(true);
  });

  it('stays quiet with a fresh 90-day consent', () => {
    expect(
      isConsentExpiringSoon(
        connection({ status: 'active', consentExpiresAt: '2026-11-20T12:00:00Z' }),
        now
      )
    ).toBe(false);
  });

  it('does not double up on an already-expired connection', () => {
    // Regression: the old inline check ignored status, so an expired card
    // showed both "EXPIRED" and the "expires soon" banner at once.
    expect(
      isConsentExpiringSoon(
        connection({ status: 'expired', consentExpiresAt: '2026-08-01T12:00:00Z' }),
        now
      )
    ).toBe(false);
  });

  it('stays quiet when the connection has no expiry date', () => {
    expect(
      isConsentExpiringSoon(connection({ status: 'active', consentExpiresAt: null }), now)
    ).toBe(false);
  });
});
