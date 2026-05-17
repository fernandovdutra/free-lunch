import { describe, it, expect, vi } from 'vitest';
import type { Firestore } from 'firebase-admin/firestore';

vi.mock('firebase-admin/firestore', () => ({
  FieldValue: { serverTimestamp: vi.fn(() => 'MOCK_TS') },
  Timestamp: { fromDate: vi.fn((d: Date) => ({ _date: d, toDate: () => d })) },
}));

import { callWriteTool, WRITE_TOOL_DEFINITIONS } from '../writeTools.js';

interface WriteRecord {
  path: string;
  op: 'set' | 'update';
  data: Record<string, unknown>;
}

/**
 * Minimal in-memory Firestore stand-in: stores docs by slash-joined path and
 * records every write so tests can assert payloads.
 */
function createFakeDb(seed: Record<string, Record<string, unknown>> = {}) {
  const store = new Map<string, Record<string, unknown>>(Object.entries(seed));
  const writes: WriteRecord[] = [];
  let idCounter = 0;

  function makeDoc(path: string) {
    return {
      id: path.split('/').pop()!,
      collection: (name: string) => makeCollection(`${path}/${name}`),
      get: async () => {
        const data = store.get(path);
        return { exists: data !== undefined, data: () => data };
      },
      set: async (data: Record<string, unknown>) => {
        store.set(path, data);
        writes.push({ path, op: 'set', data });
      },
      update: async (data: Record<string, unknown>) => {
        store.set(path, { ...(store.get(path) ?? {}), ...data });
        writes.push({ path, op: 'update', data });
      },
    };
  }

  function makeCollection(path: string) {
    return {
      doc: (id?: string) => makeDoc(`${path}/${id ?? `auto-${++idCounter}`}`),
    };
  }

  return {
    db: { collection: (name: string) => makeCollection(name) } as unknown as Firestore,
    store,
    writes,
  };
}

const UID = 'u1';
const seededTxn = { description: 'Albert Heijn', amount: -25, categoryId: null };
const seededCategory = { name: 'Groceries' };

function withSeed(extra: Record<string, Record<string, unknown>> = {}) {
  return createFakeDb({
    'users/u1/transactions/t1': { ...seededTxn },
    'users/u1/categories/c1': { ...seededCategory },
    ...extra,
  });
}

describe('callWriteTool — dispatch', () => {
  it('throws on an unknown tool', async () => {
    const { db } = withSeed();
    await expect(callWriteTool(db, UID, 'nope', {})).rejects.toThrow('Unknown tool');
  });

  it('exposes 10 write tool definitions, all marked not read-only', () => {
    expect(WRITE_TOOL_DEFINITIONS).toHaveLength(10);
    for (const tool of WRITE_TOOL_DEFINITIONS) {
      expect(tool.annotations.readOnlyHint).toBe(false);
    }
  });
});

describe('recategorize_transaction', () => {
  it('sets category as a manual change', async () => {
    const { db, writes } = withSeed();
    const result = await callWriteTool(db, UID, 'recategorize_transaction', {
      transactionId: 't1',
      categoryId: 'c1',
    });
    expect(result).toEqual({ id: 't1', categoryId: 'c1', categorySource: 'manual' });
    expect(writes[0]).toMatchObject({
      path: 'users/u1/transactions/t1',
      op: 'update',
      data: { categoryId: 'c1', categorySource: 'manual', categoryConfidence: 1 },
    });
  });

  it('throws when the transaction does not exist', async () => {
    const { db } = withSeed();
    await expect(
      callWriteTool(db, UID, 'recategorize_transaction', {
        transactionId: 'missing',
        categoryId: 'c1',
      })
    ).rejects.toThrow('Transaction not found');
  });

  it('throws when the category does not exist', async () => {
    const { db } = withSeed();
    await expect(
      callWriteTool(db, UID, 'recategorize_transaction', {
        transactionId: 't1',
        categoryId: 'ghost',
      })
    ).rejects.toThrow('Category not found');
  });

  it('throws when a required argument is missing', async () => {
    const { db } = withSeed();
    await expect(
      callWriteTool(db, UID, 'recategorize_transaction', { transactionId: 't1' })
    ).rejects.toThrow('Missing required argument: categoryId');
  });
});

describe('update_transaction_note', () => {
  it('sets a note', async () => {
    const { db, writes } = withSeed();
    await callWriteTool(db, UID, 'update_transaction_note', {
      transactionId: 't1',
      note: 'reimbursable',
    });
    expect(writes[0].data).toMatchObject({ note: 'reimbursable' });
  });

  it('accepts an empty string to clear the note', async () => {
    const { db, writes } = withSeed();
    await callWriteTool(db, UID, 'update_transaction_note', {
      transactionId: 't1',
      note: '',
    });
    expect(writes[0].data).toMatchObject({ note: '' });
  });
});

describe('create_transaction', () => {
  it('creates a manual expense with a category', async () => {
    const { db, writes } = withSeed();
    const result = (await callWriteTool(db, UID, 'create_transaction', {
      date: '2026-05-10',
      description: 'Coffee',
      amount: -3.5,
      categoryId: 'c1',
    })) as { id: string };
    const written = writes[0];
    expect(written.op).toBe('set');
    expect(written.data).toMatchObject({
      description: 'Coffee',
      amount: -3.5,
      currency: 'EUR',
      categoryId: 'c1',
      categoryConfidence: 1,
      categorySource: 'manual',
      isSplit: false,
      source: 'manual',
    });
    expect(written.path).toBe(`users/u1/transactions/${result.id}`);
  });

  it('defaults categorySource to auto when no category is given', async () => {
    const { db, writes } = withSeed();
    await callWriteTool(db, UID, 'create_transaction', {
      date: '2026-05-10',
      description: 'Cash',
      amount: 100,
    });
    expect(writes[0].data).toMatchObject({
      categoryId: null,
      categoryConfidence: 0,
      categorySource: 'auto',
    });
  });

  it('throws on an invalid date', async () => {
    const { db } = withSeed();
    await expect(
      callWriteTool(db, UID, 'create_transaction', {
        date: 'not-a-date',
        description: 'X',
        amount: 1,
      })
    ).rejects.toThrow('Invalid date');
  });
});

describe('add_transaction_tags', () => {
  it('merges tags into a transaction with no prior tags', async () => {
    const { db, writes } = withSeed();
    const result = await callWriteTool(db, UID, 'add_transaction_tags', {
      transactionId: 't1',
      tags: ['work', 'lunch'],
    });
    expect(result).toEqual({ id: 't1', tags: ['work', 'lunch'] });
    expect(writes[0].data).toMatchObject({ tags: ['work', 'lunch'] });
  });

  it('trims, drops empties, and dedupes against existing tags', async () => {
    const { db } = withSeed({
      'users/u1/transactions/t1': { ...seededTxn, tags: ['work'] },
    });
    const result = (await callWriteTool(db, UID, 'add_transaction_tags', {
      transactionId: 't1',
      tags: ['  work  ', '', 'travel', 'travel'],
    })) as { tags: string[] };
    expect(result.tags).toEqual(['work', 'travel']);
  });

  it('throws when only empty tags are supplied', async () => {
    const { db } = withSeed();
    await expect(
      callWriteTool(db, UID, 'add_transaction_tags', {
        transactionId: 't1',
        tags: ['  ', ''],
      })
    ).rejects.toThrow('at least one non-empty tag');
  });

  it('throws when tags is not an array of strings', async () => {
    const { db } = withSeed();
    await expect(
      callWriteTool(db, UID, 'add_transaction_tags', {
        transactionId: 't1',
        tags: 'work',
      })
    ).rejects.toThrow('must be an array of strings');
  });
});

describe('remove_transaction_tags', () => {
  it('removes the given tags and keeps the rest', async () => {
    const { db } = withSeed({
      'users/u1/transactions/t1': { ...seededTxn, tags: ['work', 'lunch', 'travel'] },
    });
    const result = (await callWriteTool(db, UID, 'remove_transaction_tags', {
      transactionId: 't1',
      tags: ['lunch'],
    })) as { tags: string[] };
    expect(result.tags).toEqual(['work', 'travel']);
  });

  it('is a no-op list when the transaction has no tags', async () => {
    const { db } = withSeed();
    const result = (await callWriteTool(db, UID, 'remove_transaction_tags', {
      transactionId: 't1',
      tags: ['work'],
    })) as { tags: string[] };
    expect(result.tags).toEqual([]);
  });
});

describe('create_budget', () => {
  it('creates a budget with the default alert threshold', async () => {
    const { db, writes } = withSeed();
    await callWriteTool(db, UID, 'create_budget', {
      name: 'Groceries',
      categoryId: 'c1',
      monthlyLimit: 400,
    });
    expect(writes[0].data).toMatchObject({
      name: 'Groceries',
      categoryId: 'c1',
      monthlyLimit: 400,
      alertThreshold: 80,
      isActive: true,
    });
  });

  it('throws when the category does not exist', async () => {
    const { db } = withSeed();
    await expect(
      callWriteTool(db, UID, 'create_budget', {
        name: 'X',
        categoryId: 'ghost',
        monthlyLimit: 100,
      })
    ).rejects.toThrow('Category not found');
  });
});

describe('update_budget', () => {
  it('updates only the supplied fields', async () => {
    const { db, writes } = withSeed({
      'users/u1/budgets/b1': { name: 'Old', monthlyLimit: 100 },
    });
    await callWriteTool(db, UID, 'update_budget', { budgetId: 'b1', monthlyLimit: 250 });
    expect(writes[0].data).toMatchObject({ monthlyLimit: 250 });
    expect(writes[0].data).not.toHaveProperty('name');
  });

  it('throws when no fields are provided', async () => {
    const { db } = withSeed({ 'users/u1/budgets/b1': { name: 'Old' } });
    await expect(
      callWriteTool(db, UID, 'update_budget', { budgetId: 'b1' })
    ).rejects.toThrow('No fields to update');
  });

  it('throws when the budget does not exist', async () => {
    const { db } = withSeed();
    await expect(
      callWriteTool(db, UID, 'update_budget', { budgetId: 'missing', monthlyLimit: 1 })
    ).rejects.toThrow('Budget not found');
  });
});

describe('create_goal', () => {
  it('creates an active goal', async () => {
    const { db, writes } = withSeed();
    const result = (await callWriteTool(db, UID, 'create_goal', {
      name: 'Holiday',
      type: 'savings',
      targetAmount: 2000,
    })) as { status: string };
    expect(result.status).toBe('active');
    expect(writes[0].data).toMatchObject({
      name: 'Holiday',
      type: 'savings',
      targetAmount: 2000,
      currentAmount: 0,
      status: 'active',
    });
  });

  it('throws on an invalid goal type', async () => {
    const { db } = withSeed();
    await expect(
      callWriteTool(db, UID, 'create_goal', {
        name: 'X',
        type: 'wishlist',
        targetAmount: 1,
      })
    ).rejects.toThrow('Invalid type');
  });
});

describe('update_goal', () => {
  it('updates goal progress', async () => {
    const { db, writes } = withSeed({
      'users/u1/goals/g1': { name: 'Holiday', currentAmount: 0 },
    });
    await callWriteTool(db, UID, 'update_goal', { goalId: 'g1', currentAmount: 500 });
    expect(writes[0].data).toMatchObject({ currentAmount: 500 });
  });

  it('throws on an invalid status', async () => {
    const { db } = withSeed({ 'users/u1/goals/g1': { name: 'Holiday' } });
    await expect(
      callWriteTool(db, UID, 'update_goal', { goalId: 'g1', status: 'done' })
    ).rejects.toThrow('Invalid status');
  });

  it('throws when the goal does not exist', async () => {
    const { db } = withSeed();
    await expect(
      callWriteTool(db, UID, 'update_goal', { goalId: 'missing', currentAmount: 1 })
    ).rejects.toThrow('Goal not found');
  });
});

describe('create_rule', () => {
  it('creates a learned, non-system rule', async () => {
    const { db, writes } = withSeed();
    await callWriteTool(db, UID, 'create_rule', {
      pattern: 'Albert Heijn',
      matchType: 'contains',
      categoryId: 'c1',
    });
    expect(writes[0].data).toMatchObject({
      pattern: 'Albert Heijn',
      matchType: 'contains',
      categoryId: 'c1',
      isLearned: true,
      isSystem: false,
    });
  });

  it('throws on an invalid match type', async () => {
    const { db } = withSeed();
    await expect(
      callWriteTool(db, UID, 'create_rule', {
        pattern: 'X',
        matchType: 'fuzzy',
        categoryId: 'c1',
      })
    ).rejects.toThrow('Invalid matchType');
  });
});
