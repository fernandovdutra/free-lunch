import { describe, it, expect, vi } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import {
  queryKeys,
  serializeDateRange,
  invalidateFinancialData,
} from '../queryKeys';

const range = (start: string, end: string) => ({
  startDate: new Date(start),
  endDate: new Date(end),
});

describe('serializeDateRange', () => {
  it('produces stable, comparable strings', () => {
    const a = serializeDateRange(range('2026-05-01T00:00:00Z', '2026-05-31T23:59:59Z'));
    const b = serializeDateRange(range('2026-05-01T00:00:00Z', '2026-05-31T23:59:59Z'));
    expect(a).toEqual(b);
    expect(typeof a.start).toBe('string');
    expect(typeof a.end).toBe('string');
  });
});

describe('queryKeys — every input the queryFn uses is in the key', () => {
  it('budgetProgress.forRange: different ranges → different keys', () => {
    const a = queryKeys.budgetProgress.forRange('u1', range('2026-05-01', '2026-05-31'));
    const b = queryKeys.budgetProgress.forRange('u1', range('2026-05-01', '2026-05-13'));
    expect(a).not.toEqual(b);
  });

  it('budgetProgress.forRange: no range gets its own entry, distinct from any explicit range', () => {
    const none = queryKeys.budgetProgress.forRange('u1', null);
    const some = queryKeys.budgetProgress.forRange('u1', range('2026-05-01', '2026-05-31'));
    expect(none).not.toEqual(some);
    // Same inputs → identical key (structural equality).
    expect(queryKeys.budgetProgress.forRange('u1', null)).toEqual(none);
  });

  it('budgetProgress.forRange: different users → different keys, shared prefix preserved', () => {
    const a = queryKeys.budgetProgress.forRange('u1', null);
    const b = queryKeys.budgetProgress.forRange('u2', null);
    expect(a).not.toEqual(b);
    expect(a[0]).toBe('budgetProgress');
    expect(b[0]).toBe('budgetProgress');
  });

  it('counterparty.analytics: month is part of the key (switching month refetches)', () => {
    const may = queryKeys.counterparty.analytics('u1', 'Albert Heijn', '2026-05');
    const jun = queryKeys.counterparty.analytics('u1', 'Albert Heijn', '2026-06');
    expect(may).not.toEqual(jun);
    expect(may[0]).toBe('counterparty');
  });

  it('dashboard.range: different windows → different keys', () => {
    const a = queryKeys.dashboard.range('u1', range('2026-05-01', '2026-05-31'));
    const b = queryKeys.dashboard.range('u1', range('2026-05-01', '2026-05-13'));
    expect(a).not.toEqual(b);
  });

  it('transactions.list: server filters (dates, category) affect the key', () => {
    const base = queryKeys.transactions.list('u1', {
      startDate: new Date('2026-05-01'),
      endDate: new Date('2026-05-31'),
      categoryId: null,
    });
    const otherCategory = queryKeys.transactions.list('u1', {
      startDate: new Date('2026-05-01'),
      endDate: new Date('2026-05-31'),
      categoryId: 'food',
    });
    const otherEnd = queryKeys.transactions.list('u1', {
      startDate: new Date('2026-05-01'),
      endDate: new Date('2026-05-13'),
      categoryId: null,
    });
    expect(base).not.toEqual(otherCategory);
    expect(base).not.toEqual(otherEnd);
    // Dates serialize to strings, not Date objects, for deterministic hashing.
    expect(JSON.stringify(base)).toBe(
      JSON.stringify(
        queryKeys.transactions.list('u1', {
          startDate: new Date('2026-05-01'),
          endDate: new Date('2026-05-31'),
          categoryId: null,
        })
      )
    );
  });

  it('transactions.infinite is namespaced apart from transactions.list', () => {
    const filters = { startDate: new Date('2026-05-01'), endDate: new Date('2026-05-31') };
    expect(queryKeys.transactions.infinite('u1', filters)).not.toEqual(
      queryKeys.transactions.list('u1', filters)
    );
  });

  it('spendingExplorer.explorer: month key and drill-down params affect the key', () => {
    const a = queryKeys.spendingExplorer.explorer('u1', { direction: 'expenses', monthKey: '2026-05' });
    const b = queryKeys.spendingExplorer.explorer('u1', { direction: 'expenses', monthKey: '2026-06' });
    const c = queryKeys.spendingExplorer.explorer('u1', {
      direction: 'expenses',
      monthKey: '2026-05',
      categoryId: 'food',
    });
    expect(a).not.toEqual(b);
    expect(a).not.toEqual(c);
  });

  it('reimbursements.summary: clearedLimit affects the key, undefined is stable', () => {
    const a = queryKeys.reimbursements.summary('u1', undefined);
    const b = queryKeys.reimbursements.summary('u1', 25);
    expect(a).not.toEqual(b);
    expect(queryKeys.reimbursements.summary('u1', undefined)).toEqual(a);
  });
});

describe('invalidateFinancialData', () => {
  it('invalidates every money-displaying surface by prefix', () => {
    const queryClient = new QueryClient();
    const spy = vi.spyOn(queryClient, 'invalidateQueries').mockResolvedValue();

    invalidateFinancialData(queryClient);

    const invalidated = spy.mock.calls.map(([f]) => (f?.queryKey as string[])[0]);
    for (const prefix of [
      'transactions',
      'matchingTransactionsCount',
      'dashboard',
      'budgets',
      'budgetProgress',
      'spendingExplorer',
      'icsBreakdown',
      'counterparty',
      'reimbursements',
    ]) {
      expect(invalidated).toContain(prefix);
    }
  });

  it('marks concrete cached financial queries stale (prefix matching works)', () => {
    const queryClient = new QueryClient();
    const keys = [
      queryKeys.budgetProgress.forRange('u1', range('2026-05-01', '2026-05-31')),
      queryKeys.dashboard.range('u1', range('2026-05-01', '2026-05-31')),
      queryKeys.counterparty.analytics('u1', 'Albert Heijn', '2026-05'),
      queryKeys.transactions.list('u1', { categoryId: 'food' }),
    ];
    for (const key of keys) {
      queryClient.setQueryData(key, { some: 'data' });
    }

    invalidateFinancialData(queryClient);

    for (const key of keys) {
      expect(queryClient.getQueryState(key)?.isInvalidated).toBe(true);
    }
  });
});
