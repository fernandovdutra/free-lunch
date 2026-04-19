import { onRequest } from 'firebase-functions/v2/https';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { startOfYear, endOfYear, subYears, format, startOfMonth, endOfMonth, eachMonthOfInterval } from 'date-fns';
import {
  calculateSummary,
  calculateCategorySpending,
  type TransactionDoc,
  type CategoryDoc,
} from '../shared/aggregations.js';
import { loadAdvisorMemory, formatMemoryForPrompt } from '../shared/memoryManager.js';
import { getPreviousInsight } from '../shared/insightStorage.js';
import { authenticateAgent } from '../middleware/agentAuth.js';

/**
 * onRequest endpoint for yearly analysis data (Claude Code scheduled agent).
 */
export const getYearlyAnalysisData = onRequest(
  { region: 'europe-west1', cors: false, secrets: ['AGENT_API_TOKEN', 'SINGLE_USER_ID'] },
  async (request, response) => {
    const userId = authenticateAgent(request, response);
    if (!userId) return;

    const db = getFirestore();
    const now = new Date();
    const yearParam = request.query.year as string | undefined;
    const targetYear = yearParam ? parseInt(yearParam, 10) : now.getFullYear() - 1;
    const yearStart = startOfYear(new Date(targetYear, 0, 1));
    const yearEnd = endOfYear(new Date(targetYear, 0, 1));

    const [txnSnap, catSnap, goalsSnap, investSnap] = await Promise.all([
      db
        .collection('users')
        .doc(userId)
        .collection('transactions')
        .where('date', '>=', Timestamp.fromDate(yearStart))
        .where('date', '<=', Timestamp.fromDate(yearEnd))
        .orderBy('date', 'desc')
        .get(),
      db.collection('users').doc(userId).collection('categories').get(),
      db.collection('users').doc(userId).collection('goals').get(),
      db.collection('users').doc(userId).collection('investments').get(),
    ]);

    const allTxns = txnSnap.docs.map((d) => ({
      id: d.id,
      doc: d.data() as TransactionDoc,
    }));

    const categories = new Map<string, CategoryDoc>();
    catSnap.docs.forEach((d) => categories.set(d.id, d.data() as CategoryDoc));

    // Monthly breakdown
    const months = eachMonthOfInterval({ start: yearStart, end: yearEnd });
    const monthlyBreakdown = months.map((month) => {
      const ms = startOfMonth(month);
      const me = endOfMonth(month);
      const monthTxns = allTxns.filter(({ doc }) => {
        const d = doc.date.toDate();
        return d >= ms && d <= me;
      });
      return {
        month: format(ms, 'yyyy-MM'),
        label: format(ms, 'MMMM'),
        summary: calculateSummary(monthTxns, categories),
        categorySpending: calculateCategorySpending(monthTxns, categories),
        transactionCount: monthTxns.length,
      };
    });

    const yearSummary = calculateSummary(allTxns, categories);
    const yearCategorySpending = calculateCategorySpending(allTxns, categories);

    const memory = await loadAdvisorMemory(userId);
    const prevInsight = await getPreviousInsight(userId, 'yearly');
    const goals = goalsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const investments = investSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

    response.json({
      period: {
        year: targetYear,
        start: format(yearStart, 'yyyy-MM-dd'),
        end: format(yearEnd, 'yyyy-MM-dd'),
      },
      summary: yearSummary,
      categorySpending: yearCategorySpending,
      monthlyBreakdown,
      goals,
      investments,
      advisorMemory: memory ? formatMemoryForPrompt(memory) : null,
      previousInsightNarrative: prevInsight?.narrative ?? null,
      totalTransactions: allTxns.length,
    });
  }
);
