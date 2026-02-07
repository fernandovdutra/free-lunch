"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteIcsImport = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
// Firestore batch limit
const BATCH_SIZE = 450;
exports.deleteIcsImport = (0, https_1.onCall)({
    region: 'europe-west1',
    cors: true,
    timeoutSeconds: 60,
}, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Must be logged in');
    }
    const userId = request.auth.uid;
    const data = request.data;
    if (!data.statementId) {
        throw new https_1.HttpsError('invalid-argument', 'statementId is required');
    }
    const db = (0, firestore_1.getFirestore)();
    const userRef = db.collection('users').doc(userId);
    // 1. Verify statement exists
    const statementDoc = await userRef.collection('icsStatements').doc(data.statementId).get();
    if (!statementDoc.exists) {
        throw new https_1.HttpsError('not-found', `Statement ${data.statementId} not found`);
    }
    const statementData = statementDoc.data();
    const lumpSumTransactionId = statementData?.lumpSumTransactionId;
    // 2. Find all ICS-imported transactions for this statement
    const icsTransactions = await userRef
        .collection('transactions')
        .where('icsStatementId', '==', data.statementId)
        .get();
    // Separate ICS imports (to delete) from the lump-sum (to revert)
    const toDelete = icsTransactions.docs.filter((doc) => doc.data().source === 'ics_import');
    // 3. Batch delete ICS transactions
    let transactionsDeleted = 0;
    for (let i = 0; i < toDelete.length; i += BATCH_SIZE) {
        const batchDocs = toDelete.slice(i, i + BATCH_SIZE);
        const batch = db.batch();
        for (const doc of batchDocs) {
            batch.delete(doc.ref);
        }
        await batch.commit();
        transactionsDeleted += batchDocs.length;
    }
    // 4. Revert the lump-sum ABN AMRO transaction if it was matched
    let lumpSumReverted = false;
    if (lumpSumTransactionId) {
        const lumpSumRef = userRef.collection('transactions').doc(lumpSumTransactionId);
        const lumpSumDoc = await lumpSumRef.get();
        if (lumpSumDoc.exists) {
            await lumpSumRef.update({
                excludeFromTotals: firestore_1.FieldValue.delete(),
                icsStatementId: firestore_1.FieldValue.delete(),
                categoryId: firestore_1.FieldValue.delete(),
                categorySource: firestore_1.FieldValue.delete(),
                categoryConfidence: firestore_1.FieldValue.delete(),
                updatedAt: firestore_1.FieldValue.serverTimestamp(),
            });
            lumpSumReverted = true;
        }
    }
    // 5. Delete the statement record
    await userRef.collection('icsStatements').doc(data.statementId).delete();
    return {
        transactionsDeleted,
        lumpSumReverted,
        message: `Deleted ${transactionsDeleted} ICS transactions.${lumpSumReverted ? ' Lump-sum transaction reverted.' : ''}`,
    };
});
//# sourceMappingURL=deleteIcsImport.js.map