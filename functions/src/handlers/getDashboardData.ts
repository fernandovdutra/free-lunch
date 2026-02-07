import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import {
  calculateSummary,
  calculateCategorySpending,
  calculateTimelineData,
  serializeTransaction,
  type TransactionDoc,
  type CategoryDoc,
  type SpendingSummaryResult,
  type CategorySpendingResult,
  type TimelineDataResult,
  type TransactionResult,
} from '../shared/aggregations.js';

export interface DashboardDataResponse {
  summary: SpendingSummaryResult;
  categorySpending: CategorySpendingResult[];
  timeline: TimelineDataResult[];
  recentTransactions: TransactionResult[];
}

export const getDashboardData = onCall(
  {
    region: 'europe-west1',
    cors: true,
  },
  async (request): Promise<DashboardDataResponse> => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be logged in');
    }

    const userId = request.auth.uid;
    const { startDate, endDate } = request.data as {
      startDate?: string;
      endDate?: string;
    };

    if (!startDate || !endDate) {
      throw new HttpsError('invalid-argument', 'startDate and endDate are required');
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new HttpsError('invalid-argument', 'startDate and endDate must be valid ISO date strings');
    }

    const db = getFirestore();

    // Fetch transactions and categories in parallel
    const [transactionsSnapshot, categoriesSnapshot] = await Promise.all([
      db
        .collection('users')
        .doc(userId)
        .collection('transactions')
        .where('date', '>=', Timestamp.fromDate(start))
        .where('date', '<=', Timestamp.fromDate(end))
        .orderBy('date', 'desc')
        .get(),
      db
        .collection('users')
        .doc(userId)
        .collection('categories')
        .orderBy('order')
        .get(),
    ]);

    // Build transactions array
    const transactions = transactionsSnapshot.docs.map((doc) => ({
      id: doc.id,
      doc: doc.data() as TransactionDoc,
    }));

    // Build categories map
    const categories = new Map<string, CategoryDoc>();
    categoriesSnapshot.docs.forEach((doc) => {
      categories.set(doc.id, doc.data() as CategoryDoc);
    });

    // Compute aggregations
    const summary = calculateSummary(transactions, categories);
    const categorySpending = calculateCategorySpending(transactions, categories);
    const timeline = calculateTimelineData(transactions, start, end, categories);

    // Recent transactions (first 5, already sorted desc)
    const recentTransactions = transactions
      .slice(0, 5)
      .map(({ id, doc }) => serializeTransaction(id, doc));

    return {
      summary,
      categorySpending,
      timeline,
      recentTransactions,
    };
  }
);
