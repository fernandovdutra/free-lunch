import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { createAnthropic } from '../shared/anthropic.js';
import { subDays, format } from 'date-fns';
import {
  calculateSummary,
  calculateCategorySpending,
  type TransactionDoc,
  type CategoryDoc,
} from '../shared/aggregations.js';
import { detectAnomalies } from '../shared/anomalyDetection.js';
import { storeInsight } from '../shared/insightStorage.js';
import { loadAdvisorMemory, formatMemoryForPrompt } from '../shared/memoryManager.js';
import { config } from '../config.js';
import { resolveDataOwner } from '../shared/dataOwner.js';

/**
 * On-demand insight generation — callable by the user from the app.
 * Takes an optional question/focus area and a date range.
 */
export const generateOnDemandInsight = onCall(
  { region: 'europe-west1', cors: true, memory: '512MiB', secrets: ['ANTHROPIC_API_KEY'] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be logged in');
    }

    const apiKey = config.anthropicApiKey;
    if (!apiKey) {
      throw new HttpsError('internal', 'AI analysis not configured');
    }

    const userId = await resolveDataOwner(request.auth.uid);
    const {
      question,
      startDate: startStr,
      endDate: endStr,
    } = request.data as {
      question?: string;
      startDate?: string;
      endDate?: string;
    };

    const db = getFirestore();
    const now = new Date();
    const start = startStr ? new Date(startStr) : subDays(now, 30);
    const end = endStr ? new Date(endStr) : now;

    const [txnSnap, catSnap, goalsSnap] = await Promise.all([
      db
        .collection('users')
        .doc(userId)
        .collection('transactions')
        .where('date', '>=', Timestamp.fromDate(start))
        .where('date', '<=', Timestamp.fromDate(end))
        .orderBy('date', 'desc')
        .get(),
      db.collection('users').doc(userId).collection('categories').get(),
      db
        .collection('users')
        .doc(userId)
        .collection('goals')
        .where('status', '==', 'active')
        .get(),
    ]);

    const transactions = txnSnap.docs.map((d) => ({
      id: d.id,
      doc: d.data() as TransactionDoc,
    }));
    const categories = new Map<string, CategoryDoc>();
    catSnap.docs.forEach((d) => categories.set(d.id, d.data() as CategoryDoc));

    const summary = calculateSummary(transactions, categories);
    const categorySpending = calculateCategorySpending(transactions, categories);
    const anomalies = detectAnomalies(transactions, [], categories);

    const memory = await loadAdvisorMemory(userId);
    const memoryStr = memory ? formatMemoryForPrompt(memory) : '';

    const goalInfo = goalsSnap.docs
      .map((d) => {
        const g = d.data();
        const pct =
          g.targetAmount > 0 ? ((g.currentAmount ?? 0) / g.targetAmount) * 100 : 0;
        return `- ${g.name}: ${pct.toFixed(0)}% complete`;
      })
      .join('\n');

    const topCategories = categorySpending
      .slice(0, 8)
      .map((c) => `- ${c.categoryName}: €${c.amount.toFixed(2)}`)
      .join('\n');

    const prompt = `You are a personal finance advisor for a user in the Netherlands.

PERIOD: ${format(start, 'yyyy-MM-dd')} to ${format(end, 'yyyy-MM-dd')}

SUMMARY:
- Income: €${summary.totalIncome.toFixed(2)}
- Expenses: €${summary.totalExpenses.toFixed(2)}
- Net: €${summary.netBalance.toFixed(2)}
- Transactions: ${summary.transactionCount}

TOP CATEGORIES:
${topCategories || 'None'}

ANOMALIES:
${anomalies.length > 0 ? anomalies.map((a) => `- ${a.description}`).join('\n') : 'None'}

${goalInfo ? `GOALS:\n${goalInfo}\n` : ''}
${memoryStr ? `ADVISOR MEMORY:\n${memoryStr}\n` : ''}
${question ? `USER QUESTION: ${question}\n` : ''}

Respond with a JSON object (no markdown code blocks):
{
  "summary": "One-sentence overview",
  "highlights": [{"label": "...", "value": "...", "trend": "up|down|stable", "sentiment": "positive|negative|neutral"}],
  "recommendations": [{"priority": "high|medium|low", "category": "...", "text": "...", "potentialSavings": <number or null>}],
  "narrative": "Detailed analysis answering the user's question or providing general advice"
}`;

    const client = await createAnthropic(apiKey);
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    });

    const textBlock = message.content.find((b) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      throw new HttpsError('internal', 'AI returned no response');
    }

    let parsed: {
      summary: string;
      highlights: { label: string; value: string; trend?: string; sentiment: string }[];
      recommendations: {
        priority: string;
        category: string;
        text: string;
        potentialSavings?: number;
      }[];
      narrative: string;
    };

    try {
      let json = textBlock.text.trim();
      if (json.startsWith('```')) {
        json = json.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      }
      parsed = JSON.parse(json);
    } catch {
      throw new HttpsError('internal', 'Failed to parse AI response');
    }

    const insightId = await storeInsight(userId, {
      type: 'on_demand',
      periodStart: start,
      periodEnd: end,
      summary: parsed.summary,
      highlights: parsed.highlights,
      recommendations: parsed.recommendations,
      anomalies,
      goalProgress: [],
      narrative: parsed.narrative,
    });

    return { insightId, ...parsed };
  }
);
