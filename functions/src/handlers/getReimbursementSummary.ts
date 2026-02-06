import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import {
  calculateReimbursementSummary,
  serializeTransaction,
  type TransactionDoc,
  type ReimbursementSummaryResult,
  type TransactionResult,
} from '../shared/aggregations.js';

export interface ReimbursementSummaryResponse {
  summary: ReimbursementSummaryResult;
  pendingTransactions: TransactionResult[];
  clearedTransactions: TransactionResult[];
}

export const getReimbursementSummary = onCall(
  {
    region: 'europe-west1',
    cors: true,
  },
  async (request): Promise<ReimbursementSummaryResponse> => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be logged in');
    }

    const userId = request.auth.uid;
    const data = (request.data ?? {}) as { clearedLimit?: number };
    const clearedLimit = data.clearedLimit ?? 10;

    const db = getFirestore();

    // Single query fetching all transactions ordered by date desc
    const snapshot = await db
      .collection('users')
      .doc(userId)
      .collection('transactions')
      .orderBy('date', 'desc')
      .get();

    // Filter for pending and cleared reimbursements server-side
    const pending: Array<{ id: string; doc: TransactionDoc }> = [];
    const cleared: Array<{ id: string; doc: TransactionDoc }> = [];

    for (const docSnap of snapshot.docs) {
      const doc = docSnap.data() as TransactionDoc;

      // Only expenses (amount < 0) with reimbursement info
      if (doc.amount >= 0 || !doc.reimbursement) continue;

      if (doc.reimbursement.status === 'pending') {
        pending.push({ id: docSnap.id, doc });
      } else if (doc.reimbursement.status === 'cleared') {
        cleared.push({ id: docSnap.id, doc });
      }
    }

    // Calculate summary from full arrays
    const summary = calculateReimbursementSummary(pending, cleared);

    // Limit cleared for response
    const limitedCleared = cleared.slice(0, clearedLimit);

    return {
      summary,
      pendingTransactions: pending.map(({ id, doc }) => serializeTransaction(id, doc)),
      clearedTransactions: limitedCleared.map(({ id, doc }) => serializeTransaction(id, doc)),
    };
  }
);
