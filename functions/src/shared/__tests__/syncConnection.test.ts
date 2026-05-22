import { describe, it, expect } from 'vitest';
import type { EnableBankingTransaction } from '../../enableBanking/types';
import {
  extractBankDescription,
  getStableExternalId,
  transformTransaction,
} from '../syncConnection';

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

  it('keeps the full remittance text in bankDescription while description stays the short label', () => {
    const incasso = sepaTransfer({
      creditor: { name: 'BELASTINGDIENST' },
      remittance_information: [
        'SEPA Incasso algemeen doorlopend',
        'Incassant: NL35ZZZ273653230000',
        'Naam: BELASTINGDIENST',
        'Machtiging: 18861317',
        'Omschrijving: N-177-HD 15-04-2026 t/m 14-05-2026',
        'IBAN: NL86INGB0002445588',
        'Kenmerk: IOAXXfb8e419b52734a1cbe',
      ],
    });
    const result = transformTransaction(incasso, 'NL16ABNA0837885787', 'conn-1', 'gen_abc123');

    expect(result.description).toBe('BELASTINGDIENST');
    expect(result.bankDescription).toContain('Omschrijving: N-177-HD 15-04-2026 t/m 14-05-2026');
    expect(result.bankDescription).toContain('Machtiging: 18861317');
    expect(result.bankDescription?.split('\n')).toHaveLength(7);
  });
});

describe('extractBankDescription', () => {
  it('joins a multi-line remittance_information array with newlines', () => {
    expect(extractBankDescription(sepaTransfer())).toBe(
      [
        'SEPA Overboeking',
        'IBAN: NL07RABO0358406781',
        'BIC: RABONL2U',
        'Naam: Dierenpension Happy Valley',
        'Kenmerk: NOTPROVIDED',
      ].join('\n')
    );
  });

  it('falls back to the unstructured string when no array is present', () => {
    const tx = sepaTransfer({
      remittance_information: undefined,
      remittance_information_unstructured: 'Albert Heijn 1657',
    });
    expect(extractBankDescription(tx)).toBe('Albert Heijn 1657');
  });

  it('returns null when the bank provides no remittance text', () => {
    const tx = sepaTransfer({ remittance_information: undefined });
    expect(extractBankDescription(tx)).toBeNull();
  });
});
