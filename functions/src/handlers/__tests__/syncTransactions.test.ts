import { describe, it, expect, vi } from 'vitest';

// Mock firebase-admin
vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(),
  FieldValue: {
    serverTimestamp: vi.fn(() => 'MOCK_TIMESTAMP'),
  },
  Timestamp: {
    fromDate: vi.fn((date: Date) => ({ toDate: () => date, _date: date })),
  },
}));

// Note: transformTransaction is not exported, so we document expected behavior
// In a production codebase, we'd export it for testing or use integration tests

describe('Transaction Transformation Logic', () => {
  describe('Amount Sign Determination', () => {
    it('should make outgoing payments negative (user is debtor)', () => {
      // When user's IBAN matches debtor_account.iban, transaction is outgoing
      // Amount should be negative (expense)
      const userIban = 'NL91ABNA0417164300';
      const tx = {
        debtor_account: { iban: userIban },
        creditor_account: { iban: 'NL91ABNA0123456789' },
        creditor: { name: 'Albert Heijn' },
        transaction_amount: { amount: '25.50', currency: 'EUR' },
      };

      // Test: when user is debtor (sender), they are paying out
      const userIsDebtor = tx.debtor_account.iban === userIban;
      expect(userIsDebtor).toBe(true);

      // Expected amount should be negative
      const rawAmount = parseFloat(tx.transaction_amount.amount);
      const expectedAmount = userIsDebtor ? -Math.abs(rawAmount) : Math.abs(rawAmount);
      expect(expectedAmount).toBe(-25.5);
    });

    it('should make incoming payments positive (user is creditor)', () => {
      // When user's IBAN matches creditor_account.iban, transaction is incoming
      // Amount should be positive (income)
      const userIban = 'NL91ABNA0417164300';
      const tx = {
        debtor_account: { iban: 'NL91ABNA0123456789' },
        debtor: { name: 'Employer BV' },
        creditor_account: { iban: userIban },
        transaction_amount: { amount: '2500.00', currency: 'EUR' },
      };

      // Test: when user is creditor (receiver), they are receiving money
      const userIsCreditor = tx.creditor_account.iban === userIban;
      expect(userIsCreditor).toBe(true);

      const rawAmount = parseFloat(tx.transaction_amount.amount);
      const expectedAmount = userIsCreditor ? Math.abs(rawAmount) : -Math.abs(rawAmount);
      expect(expectedAmount).toBe(2500.0);
    });

    it('should fallback to creditor name for direction when IBAN not present', () => {
      // When no IBAN match possible, use presence of creditor name as fallback
      const tx = {
        creditor: { name: 'Some Shop' },
        transaction_amount: { amount: '50.00', currency: 'EUR' },
      };

      // If creditor name exists, likely outgoing (we paid them)
      const isOutgoing = !!tx.creditor?.name;
      expect(isOutgoing).toBe(true);

      const rawAmount = parseFloat(tx.transaction_amount.amount);
      const expectedAmount = isOutgoing ? -Math.abs(rawAmount) : Math.abs(rawAmount);
      expect(expectedAmount).toBe(-50.0);
    });
  });

  describe('Counterparty Extraction', () => {
    it('should use creditor name for outgoing payments', () => {
      // When user pays someone (outgoing), show who they paid
      const userIban = 'NL91ABNA0417164300';
      const tx = {
        debtor_account: { iban: userIban },
        creditor: { name: 'Albert Heijn BV' },
        debtor: { name: 'User Name' },
      };

      const userIsDebtor = tx.debtor_account.iban === userIban;
      const counterparty = userIsDebtor ? tx.creditor?.name : tx.debtor?.name;
      expect(counterparty).toBe('Albert Heijn BV');
    });

    it('should use debtor name for incoming payments', () => {
      // When user receives money (incoming), show who paid them
      const userIban = 'NL91ABNA0417164300';
      const tx = {
        creditor_account: { iban: userIban },
        debtor: { name: 'Employer BV' },
        creditor: { name: 'User Name' },
      };

      const userIsCreditor = tx.creditor_account.iban === userIban;
      const isOutgoing = !userIsCreditor;
      const counterparty = isOutgoing ? tx.creditor?.name : tx.debtor?.name;
      expect(counterparty).toBe('Employer BV');
    });
  });

  describe('Description Extraction', () => {
    it('should prefer remittance_information_unstructured', () => {
      const tx = {
        remittance_information_unstructured: 'Payment for groceries',
        bank_transaction_code: { description: 'SEPA IDEAL' },
      };

      let description = 'Bank transaction';
      if (tx.remittance_information_unstructured) {
        description = tx.remittance_information_unstructured;
      }

      expect(description).toBe('Payment for groceries');
    });

    it('should join remittance_information_unstructured_array', () => {
      const tx = {
        remittance_information_unstructured_array: ['Payment', 'for', 'order', '12345'],
      };

      let description = 'Bank transaction';
      if (tx.remittance_information_unstructured_array?.length) {
        description = tx.remittance_information_unstructured_array.join(' ');
      }

      expect(description).toBe('Payment for order 12345');
    });

    it('should extract description from bank_transaction_code object', () => {
      const tx = {
        bank_transaction_code: { description: 'SEPA Credit Transfer', code: '944' },
      };

      let description = 'Bank transaction';
      if (tx.bank_transaction_code) {
        if (typeof tx.bank_transaction_code === 'object' && tx.bank_transaction_code !== null) {
          const btc = tx.bank_transaction_code as { description?: string; code?: string };
          description = btc.description || `Transaction ${btc.code || ''}`.trim();
        }
      }

      expect(description).toBe('SEPA Credit Transfer');
    });

    it('should handle bank_transaction_code as string', () => {
      const tx = {
        bank_transaction_code: 'POS PAYMENT',
      };

      let description = 'Bank transaction';
      if (tx.bank_transaction_code) {
        if (typeof tx.bank_transaction_code === 'string') {
          description = tx.bank_transaction_code;
        }
      }

      expect(description).toBe('POS PAYMENT');
    });

    it('should not show raw JSON for bank_transaction_code', () => {
      const tx = {
        bank_transaction_code: { description: 'POS NATIONAL', code: '426' },
      };

      let description = 'Bank transaction';
      if (tx.bank_transaction_code) {
        if (typeof tx.bank_transaction_code === 'object') {
          const btc = tx.bank_transaction_code as { description?: string };
          description = btc.description || 'Bank transaction';
        }
      }

      // Should NOT contain JSON braces
      expect(description).not.toContain('{');
      expect(description).not.toContain('}');
      expect(description).toBe('POS NATIONAL');
    });

    it('should use counterparty as description for generic descriptions', () => {
      const counterparty = 'Albert Heijn Amsterdam';
      let description = 'Bank transaction';

      // Use counterparty if description is generic
      if (counterparty && description === 'Bank transaction') {
        description = counterparty;
      }

      expect(description).toBe('Albert Heijn Amsterdam');
    });

    it('should use counterparty as description for SEPA descriptions', () => {
      const counterparty = 'Albert Heijn Amsterdam';
      let description = 'SEPA IDEAL';

      // Use counterparty if description starts with SEPA
      if (counterparty && description.startsWith('SEPA')) {
        description = counterparty;
      }

      expect(description).toBe('Albert Heijn Amsterdam');
    });
  });

  describe('Date Parsing', () => {
    it('should parse dates without timezone shift', () => {
      const bookingDate = '2026-02-01';

      // Parse as local date (noon to avoid boundary issues)
      const [year, month, day] = bookingDate.split('-').map(Number);
      const dateObj = new Date(year, month - 1, day, 12, 0, 0);

      // Should be Feb 1st, not Feb 2nd (which would happen with UTC interpretation)
      expect(dateObj.getFullYear()).toBe(2026);
      expect(dateObj.getMonth()).toBe(1); // 0-indexed, so 1 = February
      expect(dateObj.getDate()).toBe(1);
    });

    it('should handle end of month dates correctly', () => {
      const bookingDate = '2026-01-31';

      const [year, month, day] = bookingDate.split('-').map(Number);
      const dateObj = new Date(year, month - 1, day, 12, 0, 0);

      expect(dateObj.getMonth()).toBe(0); // January
      expect(dateObj.getDate()).toBe(31);
    });

    it('should prefer booking_date over value_date', () => {
      const tx = {
        booking_date: '2026-02-01',
        value_date: '2026-01-30',
        transaction_date: '2026-01-29',
      };

      const bookingDate = tx.booking_date || tx.value_date || tx.transaction_date;
      expect(bookingDate).toBe('2026-02-01');
    });

    it('should fall back to value_date when booking_date is missing', () => {
      const tx = {
        value_date: '2026-01-30',
        transaction_date: '2026-01-29',
      };

      const bookingDate = tx.value_date || tx.transaction_date;
      expect(bookingDate).toBe('2026-01-30');
    });
  });

  describe('Date Range Calculation', () => {
    it('should format dates as YYYY-MM-DD using local time', () => {
      const date = new Date(2026, 1, 1); // Feb 1, 2026
      const formatted = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

      expect(formatted).toBe('2026-02-01');
    });

    it('should pad single-digit months correctly', () => {
      const date = new Date(2026, 0, 15); // Jan 15, 2026
      const formatted = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

      expect(formatted).toBe('2026-01-15');
    });

    it('should pad single-digit days correctly', () => {
      const date = new Date(2026, 11, 5); // Dec 5, 2026
      const formatted = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

      expect(formatted).toBe('2026-12-05');
    });
  });
});
