import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import Anthropic from '@anthropic-ai/sdk';
import { startOfWeek, endOfWeek, subWeeks, format } from 'date-fns';
import {
  calculateSummary,
  calculateCategorySpending,
  type TransactionDoc,
  type CategoryDoc,
} from '../shared/aggregations.js';
import { detectAnomalies } from '../shared/anomalyDetection.js';
import { buildWeeklyInsightPrompt } from '../shared/promptTemplates.js';
import { storeInsight, getPreviousInsight, markInsightEmailed } from '../shared/insightStorage.js';
import { sendInsightEmail } from '../shared/emailSender.js';
import { buildWeeklyEmailHtml } from '../shared/emailTemplates.js';
import { loadAdvisorMemory, updateAdvisorMemory, formatMemoryForPrompt, consolidateAdvisorMemory } from '../shared/memoryManager.js';
import { config } from '../config.js';

// Insights are single-user by design (household app) — see
// functions/src/ARCHITECTURE.md for the boundary and its rationale.
const SINGLE_USER_ID = process.env.SINGLE_USER_ID ?? '';

/**
 * Scheduled weekly insight — runs every Sunday at 20:00 CET.
 */
export const generateWeeklyInsight = onSchedule(
  {
    schedule: '0 20 * * 0',
    timeZone: 'Europe/Amsterdam',
    region: 'europe-west1',
    memory: '512MiB',
    secrets: ['ANTHROPIC_API_KEY', 'RESEND_API_KEY', 'SINGLE_USER_ID'],
  },
  async () => {
    if (!SINGLE_USER_ID) {
      console.error('SINGLE_USER_ID not configured');
      return;
    }

    const apiKey = config.anthropicApiKey;
    if (!apiKey) {
      console.error('ANTHROPIC_API_KEY not configured');
      return;
    }

    const db = getFirestore();
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
    const prevWeekStart = subWeeks(weekStart, 1);
    const prevWeekEnd = subWeeks(weekEnd, 1);

    // Fetch data in parallel
    const [thisWeekSnap, prevWeekSnap, categoriesSnap, goalsSnap, investmentsSnap] =
      await Promise.all([
        db
          .collection('users')
          .doc(SINGLE_USER_ID)
          .collection('transactions')
          .where('date', '>=', Timestamp.fromDate(weekStart))
          .where('date', '<=', Timestamp.fromDate(weekEnd))
          .get(),
        db
          .collection('users')
          .doc(SINGLE_USER_ID)
          .collection('transactions')
          .where('date', '>=', Timestamp.fromDate(prevWeekStart))
          .where('date', '<=', Timestamp.fromDate(prevWeekEnd))
          .get(),
        db.collection('users').doc(SINGLE_USER_ID).collection('categories').get(),
        db
          .collection('users')
          .doc(SINGLE_USER_ID)
          .collection('goals')
          .where('status', '==', 'active')
          .get(),
        db.collection('users').doc(SINGLE_USER_ID).collection('investments').get(),
      ]);

    const thisWeekTxns = thisWeekSnap.docs.map((d) => ({
      id: d.id,
      doc: d.data() as TransactionDoc,
    }));
    const prevWeekTxns = prevWeekSnap.docs.map((d) => ({
      id: d.id,
      doc: d.data() as TransactionDoc,
    }));

    const categories = new Map<string, CategoryDoc>();
    categoriesSnap.docs.forEach((d) => categories.set(d.id, d.data() as CategoryDoc));

    if (thisWeekTxns.length === 0) {
      console.log('No transactions this week, skipping weekly insight');
      return;
    }

    // Calculate metrics
    const summary = calculateSummary(thisWeekTxns, categories);
    const categorySpending = calculateCategorySpending(thisWeekTxns, categories);
    const previousWeekSummary =
      prevWeekTxns.length > 0 ? calculateSummary(prevWeekTxns, categories) : undefined;
    const previousWeekCategorySpending =
      prevWeekTxns.length > 0
        ? calculateCategorySpending(prevWeekTxns, categories)
        : undefined;
    const anomalies = detectAnomalies(thisWeekTxns, prevWeekTxns, categories);

    // Load advisor memory
    const memory = await loadAdvisorMemory(SINGLE_USER_ID);
    const memoryStr = memory ? formatMemoryForPrompt(memory) : undefined;

    // Get previous weekly insight for continuity
    const prev = await getPreviousInsight(SINGLE_USER_ID, 'weekly');

    // Goal progress
    const goalProgress = goalsSnap.docs.map((d) => {
      const g = d.data();
      const pct =
        g.targetAmount > 0 ? ((g.currentAmount ?? 0) / g.targetAmount) * 100 : 0;
      return {
        goalId: d.id,
        goalName: g.name as string,
        progressPct: pct,
        onTrack: pct >= 50, // Simplified check
      };
    });

    // Investment summary
    let investmentSummary: { totalValue: number; totalGain: number; returnPct: number } | undefined;
    if (!investmentsSnap.empty) {
      let totalValue = 0;
      let totalCost = 0;
      for (const doc of investmentsSnap.docs) {
        const inv = doc.data();
        const entries = inv.entries ?? [];
        if (entries.length > 0) {
          const latest = entries[entries.length - 1];
          totalValue += latest.marketValue ?? 0;
          totalCost += latest.costBasis ?? 0;
        }
      }
      investmentSummary = {
        totalValue,
        totalGain: totalValue - totalCost,
        returnPct: totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : 0,
      };
    }

    // Build prompt and call LLM
    const prompt = buildWeeklyInsightPrompt({
      weekStart: format(weekStart, 'yyyy-MM-dd'),
      weekEnd: format(weekEnd, 'yyyy-MM-dd'),
      summary,
      categorySpending,
      previousWeekSummary,
      previousWeekCategorySpending,
      anomalies,
      previousInsightNarrative: prev?.narrative,
      advisorMemory: memoryStr,
      goalProgress,
      investmentSummary,
    });

    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    });

    const textBlock = message.content.find((b) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      console.error('LLM returned no text');
      return;
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
      goalProgress?: {
        goalId: string;
        goalName: string;
        progressPct: number;
        onTrack: boolean;
        note: string;
      }[];
      investmentSummary?: {
        totalValue: number;
        totalGain: number;
        returnPct: number;
        periodChange: number;
      } | null;
      narrative: string;
    };

    try {
      let json = textBlock.text.trim();
      if (json.startsWith('```')) {
        json = json.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      }
      parsed = JSON.parse(json);
    } catch (e) {
      console.error('Failed to parse LLM response:', textBlock.text);
      return;
    }

    // Store insight
    const insightId = await storeInsight(SINGLE_USER_ID, {
      type: 'weekly',
      periodStart: weekStart,
      periodEnd: weekEnd,
      summary: parsed.summary,
      highlights: parsed.highlights,
      recommendations: parsed.recommendations,
      anomalies,
      goalProgress: parsed.goalProgress ?? [],
      investmentSummary: parsed.investmentSummary ?? null,
      narrative: parsed.narrative,
    });

    // Full weekly consolidation: rebuild baselines, merchants, and patterns from all transactions
    try {
      const consolidationResult = await consolidateAdvisorMemory(SINGLE_USER_ID, client);
      console.log(
        `Weekly memory consolidation complete: ${consolidationResult.baselines} baselines, ` +
        `${consolidationResult.merchants} merchants, ${consolidationResult.patterns} patterns`
      );
    } catch (memErr) {
      console.error('Weekly consolidation failed (non-fatal):', memErr);
    }

    // Also append this week's top recommendations to pastAdvice
    if (parsed.recommendations.length > 0) {
      try {
        await updateAdvisorMemory(SINGLE_USER_ID, {
          pastAdvice: parsed.recommendations.slice(0, 3).map((r) => ({
            date: now,
            advice: r.text,
          })),
        });
      } catch (memErr) {
        console.error('Failed to append advice to memory (non-fatal):', memErr);
      }
    }

    // Send email
    try {
      const userDoc = await db.collection('users').doc(SINGLE_USER_ID).get();
      const email = userDoc.data()?.email;
      if (email) {
        const html = buildWeeklyEmailHtml({
          date: `${format(weekStart, 'MMM d')} — ${format(weekEnd, 'MMM d, yyyy')}`,
          summary: parsed.summary,
          highlights: parsed.highlights,
          recommendations: parsed.recommendations,
          anomalies,
          narrative: parsed.narrative,
          goalProgress: parsed.goalProgress,
          investmentSummary: parsed.investmentSummary,
        });
        await sendInsightEmail(
          email,
          `Weekly Finance Review — ${format(weekStart, 'MMM d')} to ${format(weekEnd, 'MMM d')}`,
          html
        );
        await markInsightEmailed(SINGLE_USER_ID, insightId);
      }
    } catch (e) {
      console.error('Failed to send email:', e);
    }

    console.log(`Weekly insight generated: ${insightId}`);
  }
);
