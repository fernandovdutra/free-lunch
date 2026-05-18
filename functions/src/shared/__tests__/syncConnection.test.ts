import { describe, it, expect } from 'vitest';
import type { EnableBankingTransaction } from '../../enableBanking/types';
import { getStableExternalId, transformTransaction } from '../syncConnection';

// A reference-less SEPA "Overboeking" as ABN AMRO surfaces it: the payer
// supplied no reference, so entry_reference is the "NOTPROVIDED" placeholder.
function sepaTransfer(
  overrides: Partial<EnableBankingTransaction> = {}
): EnableBankingTransaction {
  return {
    entry_reference: 'NOTPROVIDED',
    transaction_amount: { amount: '240.00', currency: 'EUR' },
    credit_debit_indicator: 'DBIT',
    creditor: { name: 'Dierenpension Happy Valley' },
    creditor_account: { iban: 'NL07RABO0358406781' },
    debtor_account: { iban: 'NL16ABNA0837885787' },
    booking_date: '2026-05-18',
    remittance_information: [
      'SEPA Overboeking',
      'IBAN: NL07RABO0358406781',
      'BIC: RABONL2U',
      'Naam: Dierenpension Happy Valley',
      'Kenmerk: NOTPROVIDED',
    ],
    status: 'booked',
    ...overrides,
  };
}

describe('getStableExternalId', () => {
  it('returns a real entry_reference unchanged', () => {
    const tx = sepaTransfer({ entry_reference: '1234567890ABC' });
    expect(getStableExternalId(tx)).toBe('1234567890ABC');
  });

  it('generates a synthetic id for the NOTPROVIDED placeholder', () => {
    const id = getStableExternalId(sepaTransfer());
    expect(id).toMatch(/^gen_[0-9a-f]{40}$/);
  });

  it('treats placeholders case-insensitively', () => {
    expect(getStableExternalId(sepaTransfer({ entry_reference: 'notprovided' }))).toMatch(
      /^gen_/
    );
    expect(getStableExternalId(sepaTransfer({ entry_reference: 'Not Provided' }))).toMatch(
      /^gen_/
    );
  });

  it('generates a synthetic id for empty or missing entry_reference', () => {
    expect(getStableExternalId(sepaTransfer({ entry_reference: '' }))).toMatch(/^gen_/);
    expect(getStableExternalId(sepaTransfer({ entry_reference: undefined }))).toMatch(/^gen_/);
  });

  it('is deterministic: the same transaction always hashes to the same id', () => {
    expect(getStableExternalId(sepaTransfer())).toBe(getStableExternalId(sepaTransfer()));
  });

  it('produces distinct ids for distinct reference-less transfers', () => {
    const a = getStableExternalId(sepaTransfer());
    const differentAmount = getStableExternalId(
      sepaTransfer({ transaction_amount: { amount: '99.00', currency: 'EUR' } })
    );
    const differentPayee = getStableExternalId(
      sepaTransfer({
        creditor: { name: 'Someone Else' },
        creditor_account: { iban: 'NL00BANK0000000000' },
      })
    );
    const differentDate = getStableExternalId(sepaTransfer({ booking_date: '2026-05-19' }));

    expect(new Set([a, differentAmount, differentPayee, differentDate]).size).toBe(4);
  });
});

describe('transformTransaction', () => {
  it('stores the supplied externalId rather than the raw entry_reference', () => {
    const result = transformTransaction(
      sepaTransfer(),
      'NL16ABNA0837885787',
      'conn-1',
      'gen_abc123'
    );
    expect(result.externalId).toBe('gen_abc123');
  });

  it('parses a SEPA transfer into a negative-amount expense with the payee name', () => {
    const result = transformTransaction(
      sepaTransfer(),
      'NL16ABNA0837885787',
      'conn-1',
      'gen_abc123'
    );
    expect(result.amount).toBe(-240);
    expect(result.description).toBe('Dierenpension Happy Valley');
    expect(result.counterparty).toBe('Dierenpension Happy Valley');
  });
});
