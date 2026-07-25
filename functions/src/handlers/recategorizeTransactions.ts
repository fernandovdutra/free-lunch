import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, WriteBatch } from 'firebase-admin/firestore';
import { Categorizer } from '../categorization/index.js';
import { z } from 'zod';
import { resolveDataOwner, requireRole } from '../shared/dataOwner.js';
import {
  CATEGORIZATION_BATCH_SIZE,
  categorizationSuccessFields,
  runLlmCategorization,
  writeLlmCategorizationOutcome,
  type LlmWorkItem,
} from '../shared/categorizationPipeline.js';

interface RecategorizeResult {
  processed: number;
  updated: number;
  skipped: number;
  llmCategorized: number;
  /** Transactions the LLM pass could not categorize this run — they carry
   * `categorizationStatus: 'failed'` and can be retried from Settings. */
  llmFailed: number;
  errors: string[];
}

const recategorizeSchema = z
  .object({
    useLLM: z.boolean().optional().default(false),
    mode: z
      .enum(['all', 'uncategorized', 'failed'])
      .optional()
      .default('all'),
    transactionIds: z.array(z.string()).optional(),
  })
  .nullable()
  .optional()
  .transform((val) => val ?? { useLLM: false, mode: 'all' as const });

export const recategorizeTransactions = onCall(
  {
    region: 'europe-west1',
    cors: true,
    timeoutSeconds: 300, // 5 minutes for large datasets
    secrets: ['ANTHROPIC_API_KEY'],
  },
  async (request): Promise<RecategorizeResult> => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be logged in');
    }

    const parseResult = recategorizeSchema.safeParse(request.data);
    if (!parseResult.success) {
      throw new HttpsError(
        'invalid-argument',
        parseResult.error.issues.map((i) => i.message).join(', ')
      );
    }
    const { useLLM, mode, transactionIds } = parseResult.data;

    // When targeting specific transactions, always use LLM. The 'failed' mode
    // exists to retry transactions a previous LLM pass failed on, so it
    // implies LLM too.
    const effectiveUseLLM =
      useLLM || (transactionIds && transactionIds.length > 0) || mode === 'failed';
    const isExplicitAICategorize = transactionIds && transactionIds.length > 0;

    const userId = await resolveDataOwner(request.auth.uid);
    await requireRole(request.auth.uid, userId, ['owner', 'editor']);
    const db = getFirestore();

    // Initialize categorizer
    const categorizer = new Categorizer(userId);
    await categorizer.initialize();

    // Get transactions based on mode or specific IDs
    const transactionsRef = db.collection('users').doc(userId).collection('transactions');
    let docs: FirebaseFirestore.QueryDocumentSnapshot[];
    if (transactionIds && transactionIds.length > 0) {
      // Fetch specific transactions by ID
      const docRefs = transactionIds.map((id) => transactionsRef.doc(id));
      const docSnaps = await db.getAll(...docRefs);
      docs = docSnaps.filter((d) => d.exists) as FirebaseFirestore.QueryDocumentSnapshot[];
    } else {
      if (mode === 'uncategorized') {
        docs = (await transactionsRef.where('categorySource', '==', 'none').get()).docs;
      } else if (mode === 'failed') {
        const snapshot = await transactionsRef.where('categorizationStatus', '==', 'failed').get();
        // Never re-categorize a doc the user has since categorized by hand:
        // the failure marker survives until *some* categorization succeeds, so
        // a manually fixed transaction can still match this query. The 'all'
        // mode expresses the same intent in its query; here the filter runs in
        // memory because Firestore cannot combine the `categorizationStatus`
        // equality with a `categorySource != 'manual'` inequality without also
        // dropping docs that carry no `categorySource` field at all.
        docs = snapshot.docs.filter((d) => d.data().categorySource !== 'manual');
      } else {
        docs = (await transactionsRef.where('categorySource', '!=', 'manual').get()).docs;
      }
    }

    const result: RecategorizeResult = {
      processed: 0,
      updated: 0,
      skipped: 0,
      llmCategorized: 0,
      llmFailed: 0,
      errors: [],
    };

    // Collect transactions still uncategorized after pattern matching for LLM pass
    const uncategorizedForLLM: Array<LlmWorkItem<FirebaseFirestore.DocumentReference>> = [];

    // Process in batches — pattern matching pass
    for (let i = 0; i < docs.length; i += CATEGORIZATION_BATCH_SIZE) {
      const batch: WriteBatch = db.batch();
      const batchDocs = docs.slice(i, i + CATEGORIZATION_BATCH_SIZE);
      let batchUpdates = 0;

      for (const doc of batchDocs) {
        result.processed++;

        try {
          const data = doc.data();
          const description = data.description || '';
          const counterparty = data.counterparty || null;

          // Re-run pattern-based categorization
          const categorizationResult = categorizer.categorize(description, counterparty);

          if (
            categorizationResult.categoryId &&
            categorizationResult.categoryId !== data.categoryId &&
            !isExplicitAICategorize
          ) {
            // Pattern matching found a different (better) category — apply it
            // (and clear any failure marker from an earlier LLM pass).
            batch.update(
              doc.ref,
              categorizationSuccessFields({
                categoryId: categorizationResult.categoryId,
                confidence: categorizationResult.confidence,
                source: categorizationResult.source,
              })
            );
            batchUpdates++;
            result.updated++;
          } else if (effectiveUseLLM) {
            // Send to LLM: either no pattern match, or explicit AI categorize request
            uncategorizedForLLM.push({
              payload: doc.ref,
              description,
              counterparty,
              amount: data.amount || 0,
            });
          } else {
            result.skipped++;
          }
        } catch (err) {
          const error = err instanceof Error ? err.message : 'Unknown error';
          result.errors.push(`Transaction ${doc.id}: ${error}`);
        }
      }

      if (batchUpdates > 0) {
        await batch.commit();
      }
    }

    // LLM categorization pass (shared pipeline: LLM fallback + batched writes
    // + failure recording — same engine the bank sync uses)
    if (effectiveUseLLM && uncategorizedForLLM.length > 0) {
      const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
      if (!anthropicApiKey) {
        result.errors.push('ANTHROPIC_API_KEY not configured — LLM categorization skipped');
      } else {
        const outcome = await runLlmCategorization(
          categorizer,
          uncategorizedForLLM,
          anthropicApiKey
        );

        // Do not stamp a failure marker on a transaction the user categorized
        // manually: the marker would put an already-resolved transaction back
        // in the "needs AI retry" surface.
        //
        // Accepted residual race: this test uses the snapshot read at the top
        // of the run, so a doc the user edits *during* the (long) LLM pass is
        // still seen as non-manual and can be marked failed. That is now
        // harmless — the failed-mode retry skips manual docs, and the manual
        // client mutations clear the marker themselves — so the worst case is
        // a transiently inflated failed count until the next write to the doc.
        const manualAtSnapshot = new Set(
          docs.filter((d) => d.data().categorySource === 'manual').map((d) => d.ref.path)
        );
        const markable =
          manualAtSnapshot.size === 0
            ? outcome
            : {
                ...outcome,
                failed: outcome.failed.filter((f) => !manualAtSnapshot.has(f.payload.path)),
              };

        const written = await writeLlmCategorizationOutcome(db, markable);
        result.llmCategorized += written.categorized;
        result.updated += written.categorized;
        result.llmFailed += written.failed;

        // Response-shape parity with the pre-pipeline handler: a hard LLM
        // failure (the whole pass threw) also surfaces in `errors`, not only in
        // `llmFailed` and the per-document markers.
        if (outcome.hardFailure) {
          result.errors.push(`LLM categorization failed: ${outcome.hardFailure}`);
        }
      }
    }

    return result;
  }
);
