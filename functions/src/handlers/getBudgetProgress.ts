import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { startOfMonth, endOfMonth, subMonths } from 'date-fns';
import {
  calculateSpendingByCategory,
  calculateBudgetProgress,
  type TransactionDoc,
  type CategoryDoc,
  type BudgetDoc,
  type BudgetProgressResult,
} from '../shared/aggregations.js';

export interface BudgetProgressResponse {
  budgetProgress: BudgetProgressResult[];
  suggestions?: Record<string, number>;
}

export const getBudgetProgress = onCall(
  {
    region: 'europe-west1',
    cors: true,
  },
  async (request): Promise<BudgetProgressResponse> => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be logged in');
    }

    const userId = request.auth.uid;
    const data = (request.data ?? {}) as {
      startDate?: string;
      endDate?: string;
      suggestions?: boolean;
    };

    const now = new Date();
    const start = data.startDate ? new Date(data.startDate) : startOfMonth(now);
    const end = data.endDate ? new Date(data.endDate) : endOfMonth(now);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new HttpsError('invalid-argument', 'startDate and endDate must be valid ISO date strings');
    }

    const db = getFirestore();
    const userRef = db.collection('users').doc(userId);

    // Fetch transactions, categories, and budgets in parallel
    const [transactionsSnapshot, categoriesSnapshot, budgetsSnapshot] = await Promise.all([
      userRef
        .collection('transactions')
        .where('date', '>=', Timestamp.fromDate(start))
        .where('date', '<=', Timestamp.fromDate(end))
        .orderBy('date', 'desc')
        .get(),
      userRef.collection('categories').orderBy('order').get(),
      userRef.collection('budgets').where('isActive', '==', true).get(),
    ]);

    // Build data structures
    const transactions = transactionsSnapshot.docs.map((doc) => ({
      id: doc.id,
      doc: doc.data() as TransactionDoc,
    }));

    const categories = new Map<string, CategoryDoc>();
    categoriesSnapshot.docs.forEach((doc) => {
      categories.set(doc.id, doc.data() as CategoryDoc);
    });

    const budgets = budgetsSnapshot.docs.map((doc) => ({
      id: doc.id,
      doc: doc.data() as BudgetDoc,
    }));

    // Calculate spending and budget progress
    const spendingMap = calculateSpendingByCategory(transactions, categories);
    const budgetProgress = calculateBudgetProgress(budgets, spendingMap, categories);

    const response: BudgetProgressResponse = { budgetProgress };

    // Optionally compute suggestions (3-month average spending)
    if (data.suggestions) {
      const threeMonthsAgo = subMonths(startOfMonth(now), 3);
      const endOfLastMonth = endOfMonth(subMonths(now, 1));

      const suggestionsSnapshot = await userRef
        .collection('transactions')
        .where('date', '>=', Timestamp.fromDate(threeMonthsAgo))
        .where('date', '<=', Timestamp.fromDate(endOfLastMonth))
        .orderBy('date', 'desc')
        .get();

      const suggestionsTransactions = suggestionsSnapshot.docs.map((doc) => ({
        id: doc.id,
        doc: doc.data() as TransactionDoc,
      }));

      const suggestionsSpending = calculateSpendingByCategory(suggestionsTransactions, categories);

      // Divide by 3 for average
      const suggestions: Record<string, number> = {};
      suggestionsSpending.forEach((amount, categoryId) => {
        suggestions[categoryId] = Math.round((amount / 3) * 100) / 100;
      });

      response.suggestions = suggestions;
    }

    return response;
  }
);
