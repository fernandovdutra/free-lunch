import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue, WriteBatch } from 'firebase-admin/firestore';
import { Categorizer } from '../categorization/index.js';
import { z } from 'zod';

interface RecategorizeResult {
  processed: number;
  updated: number;
  skipped: number;
  llmCategorized: number;
  errors: string[];
}

const recategorizeSchema = z
  .object({
    useLLM: z.boolean().optional().default(false),
    mode: z
      .enum(['all', 'uncategorized'])
      .optional()
      .default('all'),
    transactionIds: z.array(z.string()).optional(),
  })
  .nullable()
  .optional()
  .transform((val) => val ?? { useLLM: false, mode: 'all' as const });

// Firestore batch limit
const BATCH_SIZE = 500;

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

    // When targeting specific transactions, always use LLM
    const effectiveUseLLM = useLLM || (transactionIds && transactionIds.length > 0);
    const isExplicitAICategorize = transactionIds && transactionIds.length > 0;

    const userId = request.auth.uid;
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
      let snapshot;
      if (mode === 'uncategorized') {
        snapshot = await transactionsRef.where('categorySource', '==', 'none').get();
      } else {
        snapshot = await transactionsRef.where('categorySource', '!=', 'manual').get();
      }
      docs = snapshot.docs;
    }

    const result: RecategorizeResult = {
      processed: 0,
      updated: 0,
      skipped: 0,
      llmCategorized: 0,
      errors: [],
    };

    // Collect transactions still uncategorized after pattern matching for LLM pass
    const uncategorizedForLLM: Array<{
      docRef: FirebaseFirestore.DocumentReference;
      description: string;
      counterparty: string | null;
      amount: number;
      index: number;
    }> = [];

    // Process in batches — pattern matching pass
    for (let i = 0; i < docs.length; i += BATCH_SIZE) {
      const batch: WriteBatch = db.batch();
      const batchDocs = docs.slice(i, i + BATCH_SIZE);
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
            batch.update(doc.ref, {
              categoryId: categorizationResult.categoryId,
              categoryConfidence: categorizationResult.confidence,
              categorySource: categorizationResult.source,
              updatedAt: FieldValue.serverTimestamp(),
            });
            batchUpdates++;
            result.updated++;
          } else if (effectiveUseLLM) {
            // Send to LLM: either no pattern match, or explicit AI categorize request
            uncategorizedForLLM.push({
              docRef: doc.ref,
              description,
              counterparty,
              amount: data.amount || 0,
              index: uncategorizedForLLM.length,
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

    // LLM categorization pass
    if (effectiveUseLLM && uncategorizedForLLM.length > 0) {
      const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
      if (!anthropicApiKey) {
        result.errors.push('ANTHROPIC_API_KEY not configured — LLM categorization skipped');
      } else {
        try {
          const llmResults = await categorizer.categorizeBatchWithLLM(
            uncategorizedForLLM.map((t) => ({
              index: t.index,
              description: t.description,
              counterparty: t.counterparty,
              amount: t.amount,
            })),
            anthropicApiKey
          );

          // Write LLM results in batches
          const llmItems = Array.from(llmResults.entries());
          for (let i = 0; i < llmItems.length; i += BATCH_SIZE) {
            const batch: WriteBatch = db.batch();
            const batchItems = llmItems.slice(i, i + BATCH_SIZE);

            for (const [index, llmResult] of batchItems) {
              if (llmResult.categoryId) {
                const txn = uncategorizedForLLM[index];
                batch.update(txn.docRef, {
                  categoryId: llmResult.categoryId,
                  categoryConfidence: llmResult.confidence,
                  categorySource: 'llm',
                  updatedAt: FieldValue.serverTimestamp(),
                });
                result.llmCategorized++;
                result.updated++;
              }
            }

            await batch.commit();
          }

          console.log(
            `LLM categorized ${result.llmCategorized}/${uncategorizedForLLM.length} transactions`
          );
        } catch (err) {
          const error = err instanceof Error ? err.message : 'LLM error';
          result.errors.push(`LLM categorization failed: ${error}`);
          console.error('LLM categorization error:', err);
        }
      }
    }

    return result;
  }
);
