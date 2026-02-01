import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue, WriteBatch } from 'firebase-admin/firestore';
import { Categorizer } from '../categorization/index.js';

interface RecategorizeResult {
  processed: number;
  updated: number;
  skipped: number;
  errors: string[];
}

// Firestore batch limit
const BATCH_SIZE = 500;

export const recategorizeTransactions = onCall(
  {
    region: 'europe-west1',
    cors: true,
    timeoutSeconds: 300, // 5 minutes for large datasets
  },
  async (request): Promise<RecategorizeResult> => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be logged in');
    }

    const userId = request.auth.uid;
    const db = getFirestore();

    // Initialize categorizer
    const categorizer = new Categorizer(userId);
    await categorizer.initialize();

    // Get all non-manually categorized transactions
    const transactionsRef = db.collection('users').doc(userId).collection('transactions');
    const snapshot = await transactionsRef.where('categorySource', '!=', 'manual').get();

    const result: RecategorizeResult = {
      processed: 0,
      updated: 0,
      skipped: 0,
      errors: [],
    };

    // Process in batches
    const docs = snapshot.docs;
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

          // Re-run categorization
          const categorizationResult = categorizer.categorize(description, counterparty);

          // Only update if we found a category (don't un-categorize)
          if (
            categorizationResult.categoryId &&
            categorizationResult.categoryId !== data.categoryId
          ) {
            batch.update(doc.ref, {
              categoryId: categorizationResult.categoryId,
              categoryConfidence: categorizationResult.confidence,
              categorySource: categorizationResult.source,
              updatedAt: FieldValue.serverTimestamp(),
            });
            batchUpdates++;
            result.updated++;
          } else {
            result.skipped++;
          }
        } catch (err) {
          const error = err instanceof Error ? err.message : 'Unknown error';
          result.errors.push(`Transaction ${doc.id}: ${error}`);
        }
      }

      // Only commit if there are updates
      if (batchUpdates > 0) {
        await batch.commit();
      }
    }

    return result;
  }
);
