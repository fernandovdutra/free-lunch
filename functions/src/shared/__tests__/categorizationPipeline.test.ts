/**
 * Tests for the shared categorization pipeline: LLM fallback outcome mapping,
 * failure recording, the clear-on-success semantics, and the batched writes
 * used by `recategorizeTransactions` (and, for the in-memory variant, the
 * bank sync).
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(),
  FieldValue: {
    serverTimestamp: () => 'SERVER_TS',
    delete: () => 'DELETE',
  },
}));

import type { DocumentReference, Firestore } from 'firebase-admin/firestore';
import type { Categorizer } from '../../categorization/categorizer';
import type { LlmCategorizationOutcome } from '../../categorization/llmCategorizer';
import {
  CATEGORIZATION_BATCH_SIZE,
  categorizationFailureFields,
  categorizationSuccessFields,
  runLlmCategorization,
  writeLlmCategorizationOutcome,
} from '../categorizationPipeline';

function stubCategorizer(
  impl: (
    transactions: Array<{ index: number }>,
    apiKey: string
  ) => Promise<LlmCategorizationOutcome>
): Categorizer {
  return { categorizeBatchWithLLM: impl } as unknown as Categorizer;
}

function item(payload: string) {
  return { payload, description: `desc ${payload}`, counterparty: null, amount: -5 };
}

describe('runLlmCategorization', () => {
  it('maps every input into exactly one of categorized/failed', async () => {
    const categorizer = stubCategorizer(async () => ({
      results: new Map([[0, { categoryId: 'groceries', confidence: 0.9, source: 'llm' as const }]]),
      failures: new Map([[1, 'model returned no valid category for this transaction']]),
    }));

    const outcome = await runLlmCategorization(categorizer, [item('a'), item('b')], 'key');

    expect(outcome.categorized).toEqual([
      { payload: 'a', categoryId: 'groceries', confidence: 0.9 },
    ]);
    expect(outcome.failed).toEqual([
      { payload: 'b', error: 'model returned no valid category for this transaction' },
    ]);
  });

  it('fails every item with a concise reason when the LLM layer throws', async () => {
    const categorizer = stubCategorizer(async () => {
      throw new Error('boom '.repeat(100)); // long error gets truncated
    });

    const outcome = await runLlmCategorization(categorizer, [item('a'), item('b')], 'key');

    expect(outcome.categorized).toHaveLength(0);
    expect(outcome.failed).toHaveLength(2);
    expect(outcome.failed[0].error.length).toBeLessThanOrEqual(200);
    expect(outcome.failed[0].error).toMatch(/^boom/);
    // Run-level reason, so callers can report one error instead of N.
    expect(outcome.hardFailure).toBe(outcome.failed[0].error);
  });

  it('leaves hardFailure unset when individual items fail', async () => {
    const categorizer = stubCategorizer(async () => ({
      results: new Map([[0, { categoryId: 'groceries', confidence: 0.9, source: 'llm' as const }]]),
      failures: new Map([[1, 'model returned no valid category for this transaction']]),
    }));

    const outcome = await runLlmCategorization(categorizer, [item('a'), item('b')], 'key');

    expect(outcome.hardFailure).toBeUndefined();
  });

  it('returns an empty outcome for no items without calling the LLM', async () => {
    const spy = vi.fn();
    const categorizer = stubCategorizer(spy);

    const outcome = await runLlmCategorization(categorizer, [], 'key');

    expect(outcome).toEqual({ categorized: [], failed: [] });
    expect(spy).not.toHaveBeenCalled();
  });
});

describe('field builders', () => {
  it('success fields set the category and clear the failure marker', () => {
    const fields = categorizationSuccessFields({
      categoryId: 'groceries',
      confidence: 0.8,
      source: 'llm',
    });
    expect(fields).toEqual({
      categoryId: 'groceries',
      categoryConfidence: 0.8,
      categorySource: 'llm',
      categorizationStatus: 'DELETE',
      categorizationError: 'DELETE',
      updatedAt: 'SERVER_TS',
    });
  });

  it('failure fields mark the doc failed with a bounded error string', () => {
    const fields = categorizationFailureFields('x'.repeat(500));
    expect(fields.categorizationStatus).toBe('failed');
    expect((fields.categorizationError as string).length).toBeLessThanOrEqual(200);
    expect(fields.updatedAt).toBe('SERVER_TS');
  });
});

interface RecordedUpdate {
  ref: unknown;
  data: Record<string, unknown>;
}

function fakeDb() {
  const commits: RecordedUpdate[][] = [];
  const db = {
    batch() {
      const ops: RecordedUpdate[] = [];
      return {
        update(ref: unknown, data: Record<string, unknown>) {
          ops.push({ ref, data });
        },
        async commit() {
          commits.push(ops);
        },
      };
    },
  };
  return { db: db as unknown as Firestore, commits };
}

describe('writeLlmCategorizationOutcome', () => {
  it('writes successes with cleared markers and failures with failed status', async () => {
    const { db, commits } = fakeDb();
    const refA = { id: 'a' } as unknown as DocumentReference;
    const refB = { id: 'b' } as unknown as DocumentReference;

    const written = await writeLlmCategorizationOutcome(db, {
      categorized: [{ payload: refA, categoryId: 'groceries', confidence: 0.9 }],
      failed: [{ payload: refB, error: 'LLM response unusable: truncated' }],
    });

    expect(written).toEqual({ categorized: 1, failed: 1 });
    expect(commits).toHaveLength(1);
    expect(commits[0]).toEqual([
      {
        ref: refA,
        data: {
          categoryId: 'groceries',
          categoryConfidence: 0.9,
          categorySource: 'llm',
          categorizationStatus: 'DELETE',
          categorizationError: 'DELETE',
          updatedAt: 'SERVER_TS',
        },
      },
      {
        ref: refB,
        data: {
          categorizationStatus: 'failed',
          categorizationError: 'LLM response unusable: truncated',
          updatedAt: 'SERVER_TS',
        },
      },
    ]);
  });

  it('chunks writes at the shared batch size (400)', async () => {
    const { db, commits } = fakeDb();
    const failed = Array.from({ length: CATEGORIZATION_BATCH_SIZE * 2 + 1 }, (_, i) => ({
      payload: { id: `doc${i}` } as unknown as DocumentReference,
      error: 'failed',
    }));

    await writeLlmCategorizationOutcome(db, { categorized: [], failed });

    expect(CATEGORIZATION_BATCH_SIZE).toBe(400);
    expect(commits.map((c) => c.length)).toEqual([400, 400, 1]);
  });
});
