"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recategorizeTransactions = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const index_js_1 = require("../categorization/index.js");
// Firestore batch limit
const BATCH_SIZE = 500;
exports.recategorizeTransactions = (0, https_1.onCall)({
    region: 'europe-west1',
    cors: true,
    timeoutSeconds: 300, // 5 minutes for large datasets
}, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Must be logged in');
    }
    const userId = request.auth.uid;
    const db = (0, firestore_1.getFirestore)();
    // Initialize categorizer
    const categorizer = new index_js_1.Categorizer(userId);
    await categorizer.initialize();
    // Get all non-manually categorized transactions
    const transactionsRef = db.collection('users').doc(userId).collection('transactions');
    const snapshot = await transactionsRef.where('categorySource', '!=', 'manual').get();
    const result = {
        processed: 0,
        updated: 0,
        skipped: 0,
        errors: [],
    };
    // Process in batches
    const docs = snapshot.docs;
    for (let i = 0; i < docs.length; i += BATCH_SIZE) {
        const batch = db.batch();
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
                if (categorizationResult.categoryId &&
                    categorizationResult.categoryId !== data.categoryId) {
                    batch.update(doc.ref, {
                        categoryId: categorizationResult.categoryId,
                        categoryConfidence: categorizationResult.confidence,
                        categorySource: categorizationResult.source,
                        updatedAt: firestore_1.FieldValue.serverTimestamp(),
                    });
                    batchUpdates++;
                    result.updated++;
                }
                else {
                    result.skipped++;
                }
            }
            catch (err) {
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
});
//# sourceMappingURL=recategorizeTransactions.js.map