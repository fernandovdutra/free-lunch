import { describe, it, expect } from 'vitest';
import type { EnableBankingTransaction } from '../../enableBanking/types';
import {
  assignStableExternalIds,
  extractBankDescription,
  getStableExternalId,
  selectIcsStatementMatch,
  summarizeSyncErrors,
  transactionDocId,
  transformTransaction,
} from '../syncConnection';

// A reference-less SEPA "Overboeking" as ABN AMRO surfaces it: the payer
// supplied no reference, so entry_reference is the "NOTPROVIDED" placeholder.
function sepaTransfer(overrides: Partial<EnableBankingTransaction> = {}): EnableBankingTransaction {
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

  it('reproduces the exact hash of the legacy implementation (golden value)', () => {
    // Golden value computed by executing the pre-refactor implementation
    // (git merge-base with origin/main) on this exact fixture. It pins the
    // whole hash recipe — including the '\u0000' join separator, which the
    // legacy source contained as a literal NUL byte. Production documents
    // store gen_ externalIds produced by that recipe; if this test fails,
    // every legacy transaction would be re-inserted as a duplicate.
    expect(getStableExternalId(sepaTransfer())).toBe(
      'gen_e201ea9b4c8ccebb1153d7b97c528139d2f06e20'
    );
  });

  it('treats placeholders case-insensitively', () => {
    expect(getStableExternalId(sepaTransfer({ entry_reference: 'notprovided' }))).toMatch(/^gen_/);
    expect(getStableExternalId(sepaTransfer({ entry_reference: 'Not Provided' }))).toMatch(/^gen_/);
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

describe('transactionDocId', () => {
  it('is deterministic: the same externalId always maps to the same doc id', () => {
    expect(transactionDocId('REF-123')).toBe(transactionDocId('REF-123'));
  });

  it('maps different externalIds to different doc ids', () => {
    expect(transactionDocId('REF-123')).not.toBe(transactionDocId('REF-124'));
    expect(transactionDocId('gen_abc')).not.toBe(transactionDocId('gen_abc#1'));
  });

  it('always produces a valid Firestore document id, even for hostile references', () => {
    const hostile = [
      'REF/WITH/SLASHES',
      '.',
      '..',
      '__id__',
      'x'.repeat(3000),
      'gen_abc#1',
      'ref with spaces\nand newline',
    ];
    for (const externalId of hostile) {
      const id = transactionDocId(externalId);
      expect(id).toMatch(/^tx_[0-9a-f]{32}$/); // no '/', not '.'/'..', well under 1500 bytes
    }
  });
});

describe('assignStableExternalIds', () => {
  const A = sepaTransfer(); // reference-less → synthetic id
  const B = sepaTransfer({ transaction_amount: { amount: '99.00', currency: 'EUR' } });
  const C = sepaTransfer({ entry_reference: 'REAL-REF-1' });

  it('keeps real entry_references untouched and suffix-free', () => {
    const [assignment] = assignStableExternalIds([C]);
    expect(assignment.externalId).toBe('REAL-REF-1');
  });

  it('gives identical reference-less duplicates distinct, occurrence-indexed ids', () => {
    const ids = assignStableExternalIds([A, { ...A }, { ...A }]).map((a) => a.externalId);
    const base = getStableExternalId(A);
    expect(ids.sort()).toEqual([base, `${base}#1`, `${base}#2`]);
  });

  it('re-fetching the same payload produces exactly the same id set', () => {
    const first = assignStableExternalIds([A, { ...A }, B, C]).map((a) => a.externalId);
    const second = assignStableExternalIds([A, { ...A }, B, C]).map((a) => a.externalId);
    expect(second).toEqual(first);
  });

  it('is independent of the order the bank returns the payload in', () => {
    const original = assignStableExternalIds([A, { ...A }, B, C]);
    const reordered = assignStableExternalIds([C, B, { ...A }, A]);
    expect(new Set(reordered.map((a) => a.externalId))).toEqual(
      new Set(original.map((a) => a.externalId))
    );
  });

  it('orders hash-colliding near-duplicates by unhashed fields, not fetch position', () => {
    // Same hash inputs, but different status (status is not hashed).
    const pending = sepaTransfer({ status: 'pending' });
    const booked = sepaTransfer({ status: 'booked' });

    const forward = assignStableExternalIds([pending, booked]);
    const backward = assignStableExternalIds([booked, pending]);

    const idFor = (list: typeof forward, status: string) =>
      list.find((a) => a.tx.status === status)!.externalId;

    expect(idFor(forward, 'pending')).toBe(idFor(backward, 'pending'));
    expect(idFor(forward, 'booked')).toBe(idFor(backward, 'booked'));
  });
});

describe('selectIcsStatementMatch', () => {
  const day = (iso: string) => new Date(`${iso}T12:00:00`);

  it('does not match an equal-amount statement outside the date window', () => {
    const candidates = [{ id: 'old', statementDate: day('2026-01-15') }];
    expect(selectIcsStatementMatch(candidates, day('2026-06-25'))).toBeNull();
  });

  it('does not match a statement dated too long after the debit', () => {
    const candidates = [{ id: 'future', statementDate: day('2026-07-10') }];
    expect(selectIcsStatementMatch(candidates, day('2026-06-25'))).toBeNull();
  });

  it('matches a statement whose debit lands within the window after the statement date', () => {
    const candidates = [{ id: 'near', statementDate: day('2026-06-10') }];
    expect(selectIcsStatementMatch(candidates, day('2026-06-25'))?.id).toBe('near');
  });

  it('prefers the closest-dated statement when several are within the window', () => {
    const candidates = [
      { id: 'far', statementDate: day('2026-06-01') },
      { id: 'closest', statementDate: day('2026-06-20') },
      { id: 'mid', statementDate: day('2026-06-10') },
    ];
    expect(selectIcsStatementMatch(candidates, day('2026-06-25'))?.id).toBe('closest');
  });
});

describe('summarizeSyncErrors', () => {
  it('summarizes per-account errors compactly', () => {
    const summary = summarizeSyncErrors([
      { accountId: 'acc1', newTransactions: 0, updatedTransactions: 0, errors: ['boom', 'later'] },
      { accountId: 'acc2', newTransactions: 3, updatedTransactions: 0, errors: [] },
    ]);
    expect(summary).toBe('acc1: boom (+1 more)');
  });

  it('caps the message length so the connection doc stays small', () => {
    const summary = summarizeSyncErrors([
      { accountId: 'acc1', newTransactions: 0, updatedTransactions: 0, errors: ['x'.repeat(500)] },
    ]);
    expect(summary.length).toBeLessThanOrEqual(300);
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

describe('transformTransaction — Amsterdam wall-clock date handling', () => {
  // A POS payment as ABN AMRO surfaces it; the remittance timestamp is Dutch
  // local time (CET/CEST), not UTC.
  function posTx(remittanceTime: string, bookingDate: string): EnableBankingTransaction {
    return {
      entry_reference: 'POS-REF-1',
      transaction_amount: { amount: '12.50', currency: 'EUR' },
      credit_debit_indicator: 'DBIT',
      booking_date: bookingDate,
      remittance_information: [
        'BEA, Apple Pay',
        'Albert Heijn 1657,PAS462',
        `NR:BS158124, ${remittanceTime}`,
        'EINDHOVEN',
      ],
      status: 'booked',
    };
  }

  const transform = (tx: EnableBankingTransaction) =>
    transformTransaction(tx, 'NL16ABNA0837885787', 'conn-1', 'ext-1');

  it('parses a winter (CET) POS timestamp as Amsterdam time, not server time', () => {
    const result = transform(posTx('31.01.26/15:33', '2026-01-31'));
    // 15:33 CET = 14:33 UTC. Parsing with `new Date(y,m,d,h,min)` on a UTC
    // server stored 15:33 UTC — one hour late.
    expect(result.transactionDate?.toDate().toISOString()).toBe('2026-01-31T14:33:00.000Z');
    expect(result.date.toDate().toISOString()).toBe('2026-01-31T14:33:00.000Z');
  });

  it('parses a summer (CEST) POS timestamp with the +2 h offset', () => {
    const result = transform(posTx('15.07.26/15:33', '2026-07-15'));
    expect(result.transactionDate?.toDate().toISOString()).toBe('2026-07-15T13:33:00.000Z');
  });

  it('keeps a late-evening CEST purchase on its own calendar day', () => {
    // 23:45 CEST on July 15 = 21:45 UTC July 15. The old UTC parse stored
    // 23:45 UTC, which an Amsterdam reader renders as July 16, 01:45 — the
    // wrong day.
    const result = transform(posTx('15.07.26/23:45', '2026-07-15'));
    expect(result.date.toDate().toISOString()).toBe('2026-07-15T21:45:00.000Z');
  });

  it('parses POS timestamps on the DST transition days correctly', () => {
    // Spring forward (2026-03-29): 15:33 is already CEST.
    expect(
      transform(posTx('29.03.26/15:33', '2026-03-29')).transactionDate?.toDate().toISOString()
    ).toBe('2026-03-29T13:33:00.000Z');
    // Just before the jump: 01:59 is still CET.
    expect(
      transform(posTx('29.03.26/01:59', '2026-03-29')).transactionDate?.toDate().toISOString()
    ).toBe('2026-03-29T00:59:00.000Z');
    // Fall back (2026-10-25): 15:33 is already CET again.
    expect(
      transform(posTx('25.10.26/15:33', '2026-10-25')).transactionDate?.toDate().toISOString()
    ).toBe('2026-10-25T14:33:00.000Z');
  });

  it('parses the SEPA "dd-MM-yyyy HH:mm" remittance format as Amsterdam time', () => {
    const tx = sepaTransfer({
      remittance_information: [
        'SEPA iDEAL',
        'IBAN: NL07RABO0358406781',
        'Naam: Bol.com',
        'Omschrijving: order 123',
        'Kenmerk: 31-01-2026 18:24 714056',
      ],
    });
    const result = transform(tx);
    expect(result.transactionDate?.toDate().toISOString()).toBe('2026-01-31T17:24:00.000Z');
  });

  it('stamps bookingDate at Amsterdam noon (same calendar day in any zone)', () => {
    expect(transform(posTx('15.07.26/15:33', '2026-07-15')).bookingDate.toDate().toISOString()).toBe(
      '2026-07-15T10:00:00.000Z' // CEST noon
    );
    expect(transform(posTx('31.01.26/15:33', '2026-01-31')).bookingDate.toDate().toISOString()).toBe(
      '2026-01-31T11:00:00.000Z' // CET noon
    );
  });

  it('falls back to booking date at Amsterdam noon when no remittance time exists', () => {
    const result = transformTransaction(sepaTransfer(), 'NL16ABNA0837885787', 'conn-1', 'ext-2');
    expect(result.transactionDate).toBeNull();
    expect(result.date.toDate().toISOString()).toBe('2026-05-18T10:00:00.000Z'); // May = CEST
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
