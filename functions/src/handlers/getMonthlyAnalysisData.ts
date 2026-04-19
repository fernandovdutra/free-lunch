import { onRequest } from 'firebase-functions/v2/https';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';
import {
  calculateSummary,
  calculateCategorySpending,
  serializeTransaction,
  type TransactionDoc,
  type CategoryDoc,
} from '../shared/aggregations.js';
import { detectAnomalies } from '../shared/anomalyDetection.js';
import { loadAdvisorMemory, formatMemoryForPrompt } from '../shared/memoryManager.js';
import { getPreviousInsight } from '../shared/insightStorage.js';
import { authenticateAgent } from '../middleware/agentAuth.js';

/**
 * onRequest endpoint that provides monthly data for the Claude Code scheduled agent.
 * Auth: Bearer token (AGENT_API_TOKEN).
 */
export const getMonthlyAnalysisData = onRequest(
  { region: 'europe-west1', cors: false, secrets: ['AGENT_API_TOKEN', 'SINGLE_USER_ID'] },
  async (request, response) => {
    const userId = authenticateAgent(request, response);
    if (!userId) return;

    const db = getFirestore();
    const now = new Date();
    const monthParam = request.query.month as string | undefined;
    const targetDate = monthParam ? new Date(monthParam + '-01') : subMonths(now, 1);
    const monthStart = startOfMonth(targetDate);
    const monthEnd = endOfMonth(targetDate);
    const prevMonthStart = startOfMonth(subMonths(monthStart, 1));
    const prevMonthEnd = endOfMonth(subMonths(monthStart, 1));

    const [txnSnap, prevTxnSnap, catSnap, goalsSnap, investSnap] = await Promise.all([
      db
        .collection('users')
        .doc(userId)
        .collection('transactions')
        .where('date', '>=', Timestamp.fromDate(monthStart))
        .where('date', '<=', Timestamp.fromDate(monthEnd))
        .orderBy('date', 'desc')
        .get(),
      db
        .collection('users')
        .doc(userId)
        .collection('transactions')
        .where('date', '>=', Timestamp.fromDate(prevMonthStart))
        .where('date', '<=', Timestamp.fromDate(prevMonthEnd))
        .get(),
      db.collection('users').doc(userId).collection('categories').get(),
      db
        .collection('users')
        .doc(userId)
        .collection('goals')
        .where('status', '==', 'active')
        .get(),
      db.collection('users').doc(userId).collection('investments').get(),
    ]);

    const transactions = txnSnap.docs.map((d) => ({
      id: d.id,
      doc: d.data() as TransactionDoc,
    }));
    const prevTransactions = prevTxnSnap.docs.map((d) => ({
      id: d.id,
      doc: d.data() as TransactionDoc,
    }));

    const categories = new Map<string, CategoryDoc>();
    catSnap.docs.forEach((d) => categories.set(d.id, d.data() as CategoryDoc));

    const summary = calculateSummary(transactions, categories);
    const categorySpending = calculateCategorySpending(transactions, categories);
    const prevSummary = calculateSummary(prevTransactions, categories);
    const prevCategorySpending = calculateCategorySpending(prevTransactions, categories);
    const anomalies = detectAnomalies(transactions, prevTransactions, categories);

    const memory = await loadAdvisorMemory(userId);
    const prevInsight = await getPreviousInsight(userId, 'monthly');

    const goals = goalsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const investments = investSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

    response.json({
      period: {
        start: format(monthStart, 'yyyy-MM-dd'),
        end: format(monthEnd, 'yyyy-MM-dd'),
        label: format(monthStart, 'MMMM yyyy'),
      },
      summary,
      categorySpending,
      previousMonth: { summary: prevSummary, categorySpending: prevCategorySpending },
      anomalies,
      transactions: transactions.slice(0, 100).map(({ id, doc }) => serializeTransaction(id, doc)),
      goals,
      investments,
      advisorMemory: memory ? formatMemoryForPrompt(memory) : null,
      previousInsightNarrative: prevInsight?.narrative ?? null,
    });
  }
);
