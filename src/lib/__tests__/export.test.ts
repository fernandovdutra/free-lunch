import { describe, it, expect, vi } from 'vitest';
import { transactionsToCSV, transactionsToJSON, downloadFile } from '../export';
import type { Transaction, Category } from '@/types';

// Mock date-fns format to return consistent dates for testing
vi.mock('date-fns', () => ({
  format: vi.fn((_date: Date, formatStr: string) => {
    if (formatStr === 'yyyy-MM-dd') {
      return '2024-01-15';
    }
    if (formatStr === "yyyy-MM-dd'T'HH:mm:ss") {
      return '2024-01-15T10:00:00';
    }
    return '2024-01-15';
  }),
}));

describe('export utilities', () => {
  const mockCategories: Category[] = [
    {
      id: 'cat-1',
      name: 'Groceries',
      icon: '🛒',
      color: '#10B981',
      parentId: null,
      order: 1,
      isSystem: false,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    },
    {
      id: 'cat-2',
      name: 'Transport',
      icon: '🚗',
      color: '#3B82F6',
      parentId: null,
      order: 2,
      isSystem: false,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    },
  ];

  const mockTransactions: Transaction[] = [
    {
      id: 'tx-1',
      externalId: null,
      date: new Date('2024-01-15'),
      description: 'Supermarket purchase',
      amount: -50.25,
      currency: 'EUR',
      counterparty: 'Albert Heijn',
      categoryId: 'cat-1',
      categoryConfidence: 1,
      categorySource: 'manual',
      isSplit: false,
      splits: null,
      reimbursement: null,
      bankAccountId: null,
      importedAt: new Date('2024-01-15'),
      updatedAt: new Date('2024-01-15'),
    },
    {
      id: 'tx-2',
      externalId: null,
      date: new Date('2024-01-14'),
      description: 'Train ticket, Amsterdam to Rotterdam',
      amount: -25.0,
      currency: 'EUR',
      counterparty: 'NS',
      categoryId: 'cat-2',
      categoryConfidence: 0.9,
      categorySource: 'auto',
      isSplit: false,
      splits: null,
      reimbursement: {
        type: 'work',
        status: 'pending',
        note: 'Client meeting',
        linkedTransactionId: null,
        clearedAt: null,
      },
      bankAccountId: null,
      importedAt: new Date('2024-01-14'),
      updatedAt: new Date('2024-01-14'),
    },
    {
      id: 'tx-3',
      externalId: null,
      date: new Date('2024-01-13'),
      description: 'Description with "quotes" and, commas',
      amount: -100.0,
      currency: 'EUR',
      counterparty: null,
      categoryId: null, // Uncategorized
      categoryConfidence: 0,
      categorySource: 'manual',
      isSplit: false,
      splits: null,
      reimbursement: {
        type: 'personal',
        status: 'cleared',
        note: 'Paid for friend',
        linkedTransactionId: 'tx-income',
        clearedAt: new Date('2024-01-20'),
      },
      bankAccountId: null,
      importedAt: new Date('2024-01-13'),
      updatedAt: new Date('2024-01-20'),
    },
  ];

  describe('transactionsToCSV', () => {
    it('should generate CSV with correct headers', () => {
      const csv = transactionsToCSV([], mockCategories);
      const lines = csv.split('\n');
      expect(lines[0]).toBe(
        'Date,Description,Amount,Category,Counterparty,Reimbursement Status,Reimbursement Type,Note'
      );
    });

    it('should include all transactions in CSV', () => {
      const csv = transactionsToCSV(mockTransactions, mockCategories);
      const lines = csv.split('\n');
      // Header + 3 transactions
      expect(lines).toHaveLength(4);
    });

    it('should format amounts correctly', () => {
      const csv = transactionsToCSV(mockTransactions, mockCategories);
      expect(csv).toContain('-50.25');
      expect(csv).toContain('-25.00');
    });

    it('should resolve category names', () => {
      const csv = transactionsToCSV(mockTransactions, mockCategories);
      expect(csv).toContain('Groceries');
      expect(csv).toContain('Transport');
    });

    it('should show Uncategorized for transactions without category', () => {
      const csv = transactionsToCSV(mockTransactions, mockCategories);
      expect(csv).toContain('Uncategorized');
    });

    it('should escape special characters in CSV', () => {
      const csv = transactionsToCSV(mockTransactions, mockCategories);
      // Description with quotes and commas should be escaped
      expect(csv).toContain('"Description with ""quotes"" and, commas"');
    });

    it('should include reimbursement status', () => {
      const csv = transactionsToCSV(mockTransactions, mockCategories);
      expect(csv).toContain('pending');
      expect(csv).toContain('cleared');
    });

    it('should include reimbursement type', () => {
      const csv = transactionsToCSV(mockTransactions, mockCategories);
      expect(csv).toContain('work');
      expect(csv).toContain('personal');
    });
  });

  describe('transactionsToJSON', () => {
    it('should generate valid JSON', () => {
      const json = transactionsToJSON(mockTransactions, mockCategories);
      expect(() => JSON.parse(json) as unknown).not.toThrow();
    });

    it('should include all transactions', () => {
      const json = transactionsToJSON(mockTransactions, mockCategories);
      const parsed = JSON.parse(json) as unknown[];
      expect(parsed).toHaveLength(3);
    });

    it('should resolve category names', () => {
      const json = transactionsToJSON(mockTransactions, mockCategories);
      const parsed = JSON.parse(json) as Array<{ category: string | null }>;
      expect(parsed[0]?.category).toBe('Groceries');
      expect(parsed[1]?.category).toBe('Transport');
    });

    it('should set category to null for uncategorized transactions', () => {
      const json = transactionsToJSON(mockTransactions, mockCategories);
      const parsed = JSON.parse(json) as Array<{ category: string | null }>;
      expect(parsed[2]?.category).toBeNull();
    });

    it('should include reimbursement info', () => {
      const json = transactionsToJSON(mockTransactions, mockCategories);
      interface ParsedReimbursement {
        type: string;
        status: string;
        note: string | null;
        clearedAt: string | null;
      }
      interface ParsedTransaction {
        reimbursement: ParsedReimbursement | null;
      }
      const parsed = JSON.parse(json) as ParsedTransaction[];

      // Transaction with pending reimbursement
      expect(parsed[1]?.reimbursement).toEqual({
        type: 'work',
        status: 'pending',
        note: 'Client meeting',
        clearedAt: null,
      });

      // Transaction with cleared reimbursement
      expect(parsed[2]?.reimbursement?.type).toBe('personal');
      expect(parsed[2]?.reimbursement?.status).toBe('cleared');
    });

    it('should format dates correctly', () => {
      const json = transactionsToJSON(mockTransactions, mockCategories);
      const parsed = JSON.parse(json) as Array<{ date: string }>;
      expect(parsed[0]?.date).toBe('2024-01-15');
    });

    it('should include all required fields', () => {
      const json = transactionsToJSON(mockTransactions, mockCategories);
      const parsed = JSON.parse(json) as Record<string, unknown>[];
      const tx = parsed[0];

      expect(tx).toHaveProperty('date');
      expect(tx).toHaveProperty('description');
      expect(tx).toHaveProperty('amount');
      expect(tx).toHaveProperty('currency');
      expect(tx).toHaveProperty('category');
      expect(tx).toHaveProperty('categoryId');
      expect(tx).toHaveProperty('counterparty');
      expect(tx).toHaveProperty('reimbursement');
      expect(tx).toHaveProperty('isSplit');
      expect(tx).toHaveProperty('splits');
      expect(tx).toHaveProperty('importedAt');
    });
  });

  describe('downloadFile', () => {
    it('should be a function', () => {
      // downloadFile is hard to test in jsdom environment because it manipulates the DOM
      // and triggers a download. We verify it exists and is callable.
      expect(typeof downloadFile).toBe('function');
    });
  });
});
