/**
 * Shared LLM-fallback categorization pipeline, used by both the bank sync
 * (`syncConnection.ts` — categorizes NEW transactions in memory before their
 * create-only batch write) and the `recategorizeTransactions` callable
 * (categorizes EXISTING transaction docs via batched updates).
 *
 * The two callers keep their own pattern-matching policies (the sync
 * categorizes every new transaction; recategorize compares against the stored
 * category and honours explicit-AI requests), but the risky duplicated part —
 * LLM fallback, failure recording, and the batched Firestore writes — lives
 * here once.
 *
 * Failure recording: every transaction that was actually sent to the LLM and
 * did not receive a valid category is marked `categorizationStatus: 'failed'`
 * with a concise `categorizationError`, so the user can see and retry them
 * (Settings → Categorization). A later successful categorization — by rule,
 * merchant, or LLM — clears the marker. When no ANTHROPIC_API_KEY is
 * configured the LLM pass is skipped entirely and nothing is marked failed
 * (an unconfigured feature is not a failure).
 */

import {
  FieldValue,
  type DocumentReference,
  type Firestore,
  type WriteBatch,
} from 'firebase-admin/firestore';
import type { Categorizer } from '../categorization/categorizer.js';

/**
 * Batch size for categorization update writes: one update per document, so
 * 400 leaves comfortable headroom under Firestore's 500-operation batch cap
 * while still amortizing commit latency. (The sync's insert path keeps its
 * own smaller batch size because it writes two documents per transaction.)
 */
export const CATEGORIZATION_BATCH_SIZE = 400;

/** Cap stored error strings so a failure marker can't bloat the document. */
const MAX_ERROR_LENGTH = 200;

function conciseError(error: string): string {
  return error.length > MAX_ERROR_LENGTH ? `${error.slice(0, MAX_ERROR_LENGTH - 3)}...` : error;
}

/** A transaction to send through the LLM fallback; `payload` is returned
 * untouched in the outcome so callers can map results back. */
export interface LlmWorkItem<T> {
  payload: T;
  description: string;
  counterparty: string | null;
  amount: number;
}

export interface LlmPassOutcome<T> {
  categorized: Array<{ payload: T; categoryId: string; confidence: number }>;
  failed: Array<{ payload: T; error: string }>;
}

/**
 * Run the LLM fallback over the given items. Never throws: an error from the
 * LLM layer lands every item in `failed` with a concise reason. Every input
 * item appears in exactly one of the two outcome lists.
 */
export async function runLlmCategorization<T>(
  categorizer: Categorizer,
  items: LlmWorkItem<T>[],
  apiKey: string
): Promise<LlmPassOutcome<T>> {
  const outcome: LlmPassOutcome<T> = { categorized: [], failed: [] };
  if (items.length === 0) return outcome;

  let batchOutcome;
  try {
    batchOutcome = await categorizer.categorizeBatchWithLLM(
      items.map((item, index) => ({
        index,
        description: item.description,
        counterparty: item.counterparty,
        amount: item.amount,
      })),
      apiKey
    );
  } catch (err) {
    const msg = conciseError(err instanceof Error ? err.message : 'LLM categorization failed');
    console.error(`LLM categorization pass failed for all ${items.length} item(s): ${msg}`);
    outcome.failed = items.map((item) => ({ payload: item.payload, error: msg }));
    return outcome;
  }

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const result = batchOutcome.results.get(i);
    if (result?.categoryId) {
      outcome.categorized.push({
        payload: item.payload,
        categoryId: result.categoryId,
        confidence: result.confidence,
      });
    } else {
      outcome.failed.push({
        payload: item.payload,
        error: conciseError(batchOutcome.failures.get(i) ?? 'not categorized by model'),
      });
    }
  }

  console.log(
    `LLM categorized ${outcome.categorized.length}/${items.length} transactions` +
      (outcome.failed.length > 0 ? ` (${outcome.failed.length} failed)` : '')
  );
  return outcome;
}

/**
 * Update payload for a successfully categorized transaction. Always clears
 * any previous failure marker so a transaction that later categorizes cleanly
 * drops out of the "needs review" surface.
 */
export function categorizationSuccessFields(result: {
  categoryId: string;
  confidence: number;
  source: string;
}): Record<string, unknown> {
  return {
    categoryId: result.categoryId,
    categoryConfidence: result.confidence,
    categorySource: result.source,
    categorizationStatus: FieldValue.delete(),
    categorizationError: FieldValue.delete(),
    updatedAt: FieldValue.serverTimestamp(),
  };
}

/** Update payload marking a transaction the LLM pass failed to categorize. */
export function categorizationFailureFields(error: string): Record<string, unknown> {
  return {
    categorizationStatus: 'failed',
    categorizationError: conciseError(error),
    updatedAt: FieldValue.serverTimestamp(),
  };
}

/**
 * Write an LLM pass outcome back onto EXISTING transaction documents in
 * batches of {@link CATEGORIZATION_BATCH_SIZE}. Successes get the new
 * category (and clear any failure marker); failures get
 * `categorizationStatus: 'failed'`.
 */
export async function writeLlmCategorizationOutcome(
  db: Firestore,
  outcome: LlmPassOutcome<DocumentReference>
): Promise<{ categorized: number; failed: number }> {
  const updates: Array<{ ref: DocumentReference; data: Record<string, unknown> }> = [
    ...outcome.categorized.map((c) => ({
      ref: c.payload,
      data: categorizationSuccessFields({
        categoryId: c.categoryId,
        confidence: c.confidence,
        source: 'llm',
      }),
    })),
    ...outcome.failed.map((f) => ({
      ref: f.payload,
      data: categorizationFailureFields(f.error),
    })),
  ];

  for (let i = 0; i < updates.length; i += CATEGORIZATION_BATCH_SIZE) {
    const chunk = updates.slice(i, i + CATEGORIZATION_BATCH_SIZE);
    const batch: WriteBatch = db.batch();
    for (const { ref, data } of chunk) {
      batch.update(ref, data);
    }
    await batch.commit();
  }

  return { categorized: outcome.categorized.length, failed: outcome.failed.length };
}
