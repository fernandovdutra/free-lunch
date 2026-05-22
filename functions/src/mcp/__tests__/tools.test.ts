import { describe, it, expect, vi } from 'vitest';
import type { Firestore } from 'firebase-admin/firestore';

vi.mock('firebase-admin/firestore', () => ({
  FieldValue: { serverTimestamp: () => 'MOCK_TS' },
  Timestamp: { fromDate: (d: Date) => ({ _date: d, toDate: () => d }) },
}));

import { callTool, TOOL_DEFINITIONS } from '../tools.js';

const UID = 'u1';

interface SeedTxn {
  id: string;
  date: Date;
  amount: number;
  description: string;
  counterparty?: string | null;
  categoryId?: string | null;
  categorySource?: string;
  isSplit?: boolean;
  tags?: string[];
}

interface SeedCategory {
  id: string;
  name: string;
}

interface Constraint {
  field: string;
  op: string;
  value: unknown;
}

/**
 * Minimal query-capable Firestore stand-in. Supports the chain used by the read
 * tools: collection -> doc -> collection -> orderBy/where/limit/get, and
 * mirrors Firestore's server-side filtering so the tag-window bug fix is
 * exercised end-to-end.
 */
function createQueryDb(transactions: SeedTxn[], categories: SeedCategory[] = []) {
  function txnData(t: SeedTxn) {
    return {
      date: { toDate: () => t.date },
      description: t.description,
      amount: t.amount,
      counterparty: t.counterparty ?? null,
      categoryId: t.categoryId ?? null,
      categorySource: t.categorySource ?? 'auto',
      isSplit: t.isSplit ?? false,
      tags: t.tags,
    };
  }

  function matchesConstraint(t: SeedTxn, c: Constraint): boolean {
    if (c.field === 'date') {
      const ts = t.date.getTime();
      const v = (c.value as { _date: Date })._date.getTime();
      if (c.op === '>=') return ts >= v;
      if (c.op === '<=') return ts <= v;
      return true;
    }
    if (c.field === 'categoryId') {
      return (t.categoryId ?? null) === c.value;
    }
    if (c.field === 'tags') {
      const tags = Array.isArray(t.tags) ? t.tags : [];
      if (c.op === 'array-contains') return tags.includes(c.value as string);
      if (c.op === 'array-contains-any') {
        return (c.value as string[]).some((x) => tags.includes(x));
      }
    }
    return true;
  }

  function makeQuery() {
    const constraints: Constraint[] = [];
    let limitN = Infinity;
    const query = {
      orderBy: () => query,
      where: (field: string, op: string, value: unknown) => {
        constraints.push({ field, op, value });
        return query;
      },
      limit: (n: number) => {
        limitN = n;
        return query;
      },
      get: async () => {
        const rows = transactions
          .filter((t) => constraints.every((c) => matchesConstraint(t, c)))
          .slice()
          .sort((a, b) => b.date.getTime() - a.date.getTime())
          .slice(0, limitN);
        return {
          size: rows.length,
          docs: rows.map((t) => ({ id: t.id, data: () => txnData(t) })),
        };
      },
    };
    return query;
  }

  const db = {
    collection: (name: string) => {
      if (name !== 'users') throw new Error(`unexpected collection: ${name}`);
      return {
        doc: () => ({
          collection: (sub: string) => {
            if (sub === 'transactions') return makeQuery();
            if (sub === 'categories') {
              return {
                get: async () => ({
                  docs: categories.map((c) => ({ id: c.id, data: () => ({ name: c.name }) })),
                }),
              };
            }
            throw new Error(`unexpected subcollection: ${sub}`);
          },
        }),
      };
    },
  };

  return db as unknown as Firestore;
}

describe('TOOL_DEFINITIONS', () => {
  it('exposes the get_transactions and aggregate_transactions read tools', () => {
    const names = TOOL_DEFINITIONS.map((t) => t.name);
    expect(names).toContain('get_transactions');
    expect(names).toContain('aggregate_transactions');
  });
});

describe('get_transactions — tag filtering', () => {
  it('finds a transaction tagged long ago, beyond the default recency window', async () => {
    const recent: SeedTxn[] = Array.from({ length: 60 }, (_, i) => ({
      id: `r${i}`,
      date: new Date(2026, 3, 20 - i),
      amount: -10,
      description: 'Coffee',
    }));
    const oldTagged: SeedTxn = {
      id: 'old',
      date: new Date(2025, 0, 15),
      amount: -200,
      description: 'Flight booking',
      tags: ['vacation'],
    };

    const result = (await callTool(createQueryDb([...recent, oldTagged]), UID, 'get_transactions', {
      tags: ['vacation'],
    })) as { transactions: { id: string }[]; totalCount: number };

    expect(result.transactions.map((t) => t.id)).toEqual(['old']);
    expect(result.totalCount).toBe(1);
  });

  it('supports AND (all) and OR (any) multi-tag matching', async () => {
    const txns: SeedTxn[] = [
      { id: 'ab', date: new Date(2026, 3, 3), amount: -10, description: 'A+B', tags: ['a', 'b'] },
      { id: 'a', date: new Date(2026, 3, 2), amount: -10, description: 'A', tags: ['a'] },
      { id: 'b', date: new Date(2026, 3, 1), amount: -10, description: 'B', tags: ['b'] },
    ];

    const all = (await callTool(createQueryDb(txns), UID, 'get_transactions', {
      tags: ['a', 'b'],
      tagMatch: 'all',
    })) as { transactions: { id: string }[] };
    expect(all.transactions.map((t) => t.id)).toEqual(['ab']);

    const any = (await callTool(createQueryDb(txns), UID, 'get_transactions', {
      tags: ['a', 'b'],
      tagMatch: 'any',
    })) as { transactions: { id: string }[] };
    expect(any.transactions.map((t) => t.id).sort()).toEqual(['a', 'ab', 'b']);
  });

  it('rejects more than 10 tags with tagMatch any', async () => {
    const tags = Array.from({ length: 11 }, (_, i) => `t${i}`);
    await expect(
      callTool(createQueryDb([]), UID, 'get_transactions', { tags, tagMatch: 'any' })
    ).rejects.toThrow('at most 10 tags');
  });
});

describe('get_transactions — response shape', () => {
  it('includes category names, merchant names, and totals', async () => {
    const db = createQueryDb(
      [
        {
          id: 't1',
          date: new Date(2026, 3, 10),
          amount: -25.5,
          description: 'Albert Heijn 1234 Amsterdam',
          counterparty: 'AH BV',
          categoryId: 'c1',
        },
        {
          id: 't2',
          date: new Date(2026, 3, 9),
          amount: -100,
          description: 'Mystery payment',
          categoryId: null,
        },
      ],
      [{ id: 'c1', name: 'Groceries' }]
    );

    const result = (await callTool(db, UID, 'get_transactions', {})) as {
      transactions: { id: string; categoryName: string | null; merchantName: string | null }[];
      totalCount: number;
      totalAmount: number;
    };

    const t1 = result.transactions.find((t) => t.id === 't1')!;
    expect(t1.categoryName).toBe('Groceries');
    expect(t1.merchantName).toBe('Albert Heijn');

    const t2 = result.transactions.find((t) => t.id === 't2')!;
    expect(t2.categoryName).toBeNull();
    expect(t2.merchantName).toBeNull();

    expect(result.totalCount).toBe(2);
    expect(result.totalAmount).toBe(-125.5);
  });
});

describe('aggregate_transactions', () => {
  const txns: SeedTxn[] = [
    { id: 't1', date: new Date(2026, 3, 5), amount: -40, description: 'AH', categoryId: 'food' },
    { id: 't2', date: new Date(2026, 3, 6), amount: -60, description: 'Jumbo', categoryId: 'food' },
    { id: 't3', date: new Date(2026, 2, 7), amount: -30, description: 'NS', categoryId: 'transport' },
    { id: 't4', date: new Date(2026, 3, 8), amount: 2000, description: 'Salary', categoryId: null },
  ];
  const cats: SeedCategory[] = [
    { id: 'food', name: 'Food' },
    { id: 'transport', name: 'Transport' },
  ];

  it('returns overall totals without a record list', async () => {
    const result = (await callTool(
      createQueryDb(txns, cats),
      UID,
      'aggregate_transactions',
      {}
    )) as {
      totalAmount: number;
      totalIncome: number;
      totalExpenses: number;
      transactionCount: number;
      groups?: unknown;
    };
    expect(result.totalIncome).toBe(2000);
    expect(result.totalExpenses).toBe(130);
    expect(result.totalAmount).toBe(1870);
    expect(result.transactionCount).toBe(4);
    expect(result.groups).toBeUndefined();
  });

  it('groups expense totals by category', async () => {
    const result = (await callTool(createQueryDb(txns, cats), UID, 'aggregate_transactions', {
      groupBy: 'category',
      direction: 'expense',
    })) as { groups: { key: string; label: string; amount: number; count: number }[] };
    expect(result.groups).toEqual([
      { key: 'food', label: 'Food', amount: -100, count: 2 },
      { key: 'transport', label: 'Transport', amount: -30, count: 1 },
    ]);
  });

  it('groups expense totals by month', async () => {
    const result = (await callTool(createQueryDb(txns, cats), UID, 'aggregate_transactions', {
      groupBy: 'month',
      direction: 'expense',
    })) as { groups: { key: string }[] };
    expect(result.groups.map((g) => g.key).sort()).toEqual(['2026-03', '2026-04']);
  });
});

describe('search_transactions', () => {
  it('returns matches wrapped with totals and enrichment', async () => {
    const db = createQueryDb(
      [
        {
          id: 't1',
          date: new Date(2026, 3, 5),
          amount: -12,
          description: 'Albert Heijn',
          categoryId: 'c1',
        },
        {
          id: 't2',
          date: new Date(2026, 3, 4),
          amount: -8,
          description: 'Starbucks',
          categoryId: 'c1',
        },
      ],
      [{ id: 'c1', name: 'Groceries' }]
    );

    const result = (await callTool(db, UID, 'search_transactions', { query: 'heijn' })) as {
      transactions: { id: string; categoryName: string | null }[];
      totalCount: number;
    };
    expect(result.transactions).toHaveLength(1);
    expect(result.transactions[0].id).toBe('t1');
    expect(result.transactions[0].categoryName).toBe('Groceries');
    expect(result.totalCount).toBe(1);
  });
});
