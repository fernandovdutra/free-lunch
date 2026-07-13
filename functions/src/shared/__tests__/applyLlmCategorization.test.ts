/**
 * Sync-path failure recording: `applyLlmCategorization` runs the shared LLM
 * pipeline over the sync's in-memory pending transactions BEFORE their
 * create-only batch write, so LLM outcomes (success or failure marker) are
 * baked into the document being created. These tests pin that behavior:
 *
 *  - successes get categoryId / confidence / source 'llm'
 *  - hard failures get categorizationStatus 'failed' + a concise error
 *  - without an API key nothing is touched (unconfigured ≠ failed)
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { EnableBankingTransaction } from '../../enableBanking/types';
import type { Categorizer } from '../../categorization/categorizer';
import type { LlmCategorizationOutcome } from '../../categorization/llmCategorizer';
import {
  applyLlmCategorization,
  transformTransaction,
  transactionDocId,
  type PendingTransaction,
} from '../syncConnection';

function bankTx(ref: string): EnableBankingTransaction {
  return {
    entry_reference: ref,
    transaction_amount: { amount: '25.00', currency: 'EUR' },
    credit_debit_indicator: 'DBIT',
    creditor: { name: 'Onbekende Winkel' },
    booking_date: '2026-06-25',
    remittance_information_unstructured: `Onbekende Winkel ${ref}`,
    status: 'booked',
  };
}

function pending(ref: string): PendingTransaction {
  const tx = bankTx(ref);
  const transactionData = transformTransaction(tx, 'NL16ABNA0837885787', 'conn1', ref);
  transactionData.categorySource = 'none'; // no rule/merchant matched
  return { tx, externalId: ref, docId: transactionDocId(ref), transactionData };
}

function stubCategorizer(outcome: LlmCategorizationOutcome | Error): Categorizer {
  return {
    categorizeBatchWithLLM: async () => {
      if (outcome instanceof Error) throw outcome;
      return outcome;
    },
  } as unknown as Categorizer;
}

const originalKey = process.env.ANTHROPIC_API_KEY;

beforeEach(() => {
  process.env.ANTHROPIC_API_KEY = 'test-key';
});

afterEach(() => {
  if (originalKey === undefined) delete process.env.ANTHROPIC_API_KEY;
  else process.env.ANTHROPIC_API_KEY = originalKey;
});

describe('applyLlmCategorization (sync path)', () => {
  it('applies LLM successes to the pending doc and marks failures for creation', async () => {
    const items = [pending('REF-A'), pending('REF-B')];
    const categorizer = stubCategorizer({
      results: new Map([[0, { categoryId: 'groceries', confidence: 0.9, source: 'llm' }]]),
      failures: new Map([[1, 'model returned no valid category for this transaction']]),
    });

    await applyLlmCategorization(categorizer, items);

    expect(items[0].transactionData).toMatchObject({
      categoryId: 'groceries',
      categoryConfidence: 0.9,
      categorySource: 'llm',
    });
    expect(items[0].transactionData.categorizationStatus).toBeUndefined();

    expect(items[1].transactionData.categoryId).toBeNull();
    expect(items[1].transactionData.categorySource).toBe('none');
    expect(items[1].transactionData.categorizationStatus).toBe('failed');
    expect(items[1].transactionData.categorizationError).toMatch(/no valid category/);
  });

  it('marks every uncategorized transaction failed when the LLM hard-fails', async () => {
    const items = [pending('REF-A'), pending('REF-B')];
    const categorizer = stubCategorizer(new Error('Anthropic API error: 529 overloaded'));

    await applyLlmCategorization(categorizer, items);

    for (const item of items) {
      expect(item.transactionData.categorizationStatus).toBe('failed');
      expect(item.transactionData.categorizationError).toMatch(/529 overloaded/);
      expect(item.transactionData.categoryId).toBeNull();
    }
  });

  it('only sends transactions no rule/merchant matched', async () => {
    const matched = pending('REF-A');
    matched.transactionData.categoryId = 'groceries';
    matched.transactionData.categorySource = 'merchant';
    const unmatched = pending('REF-B');

    const categorizer = stubCategorizer(new Error('down'));
    await applyLlmCategorization(categorizer, [matched, unmatched]);

    // The merchant-matched transaction is untouched by the failing LLM pass.
    expect(matched.transactionData.categorizationStatus).toBeUndefined();
    expect(matched.transactionData.categorySource).toBe('merchant');
    expect(unmatched.transactionData.categorizationStatus).toBe('failed');
  });

  it('does nothing (and marks nothing failed) when no API key is configured', async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const items = [pending('REF-A')];
    const categorizer = stubCategorizer(new Error('should never be called'));

    await applyLlmCategorization(categorizer, items);

    expect(items[0].transactionData.categorizationStatus).toBeUndefined();
    expect(items[0].transactionData.categorySource).toBe('none');
  });
});
