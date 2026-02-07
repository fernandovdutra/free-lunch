import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

interface DeleteIcsRequest {
  statementId: string;
}

interface DeleteIcsResponse {
  transactionsDeleted: number;
  lumpSumReverted: boolean;
  message: string;
}

// Firestore batch limit
const BATCH_SIZE = 450;

export const deleteIcsImport = onCall(
  {
    region: 'europe-west1',
    cors: true,
    timeoutSeconds: 60,
  },
  async (request): Promise<DeleteIcsResponse> => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be logged in');
    }

    const userId = request.auth.uid;
    const data = request.data as DeleteIcsRequest;

    if (!data.statementId) {
      throw new HttpsError('invalid-argument', 'statementId is required');
    }

    const db = getFirestore();
    const userRef = db.collection('users').doc(userId);

    // 1. Verify statement exists
    const statementDoc = await userRef.collection('icsStatements').doc(data.statementId).get();
    if (!statementDoc.exists) {
      throw new HttpsError('not-found', `Statement ${data.statementId} not found`);
    }

    const statementData = statementDoc.data();
    const lumpSumTransactionId = statementData?.lumpSumTransactionId as string | null;

    // 2. Find all ICS-imported transactions for this statement
    const icsTransactions = await userRef
      .collection('transactions')
      .where('icsStatementId', '==', data.statementId)
      .get();

    // Separate ICS imports (to delete) from the lump-sum (to revert)
    const toDelete = icsTransactions.docs.filter(
      (doc) => doc.data().source === 'ics_import'
    );

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
          excludeFromTotals: FieldValue.delete(),
          icsStatementId: FieldValue.delete(),
          categoryId: FieldValue.delete(),
          categorySource: FieldValue.delete(),
          categoryConfidence: FieldValue.delete(),
          updatedAt: FieldValue.serverTimestamp(),
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
  }
);
