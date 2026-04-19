import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import Anthropic from '@anthropic-ai/sdk';
import { startOfDay, endOfDay, subDays, format } from 'date-fns';
import {
  calculateSummary,
  calculateCategorySpending,
  type TransactionDoc,
  type CategoryDoc,
} from '../shared/aggregations.js';
import { detectAnomalies } from '../shared/anomalyDetection.js';
import { buildDailyInsightPrompt } from '../shared/promptTemplates.js';
import { storeInsight, getPreviousInsight, markInsightEmailed } from '../shared/insightStorage.js';
import { sendInsightEmail } from '../shared/emailSender.js';
import { buildDailyEmailHtml } from '../shared/emailTemplates.js';
import { config } from '../config.js';

const SINGLE_USER_ID = process.env.SINGLE_USER_ID ?? '';

/**
 * Scheduled daily insight — runs every day at 21:00 CET.
 * Analyzes today's transactions, detects anomalies, and sends email.
 */
export const generateDailyInsight = onSchedule(
  {
    schedule: '0 21 * * *',
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
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const historyStart = subDays(todayStart, 30);

    // Fetch data in parallel
    const [todaySnap, historySnap, categoriesSnap] = await Promise.all([
      db
        .collection('users')
        .doc(SINGLE_USER_ID)
        .collection('transactions')
        .where('date', '>=', Timestamp.fromDate(todayStart))
        .where('date', '<=', Timestamp.fromDate(todayEnd))
        .get(),
      db
        .collection('users')
        .doc(SINGLE_USER_ID)
        .collection('transactions')
        .where('date', '>=', Timestamp.fromDate(historyStart))
        .where('date', '<', Timestamp.fromDate(todayStart))
        .get(),
      db
        .collection('users')
        .doc(SINGLE_USER_ID)
        .collection('categories')
        .get(),
    ]);

    const todayTxns = todaySnap.docs.map((d) => ({
      id: d.id,
      doc: d.data() as TransactionDoc,
    }));
    const historyTxns = historySnap.docs.map((d) => ({
      id: d.id,
      doc: d.data() as TransactionDoc,
    }));

    const categories = new Map<string, CategoryDoc>();
    categoriesSnap.docs.forEach((d) => categories.set(d.id, d.data() as CategoryDoc));

    // Skip if no transactions today
    if (todayTxns.length === 0) {
      console.log('No transactions today, skipping daily insight');
      return;
    }

    // Calculate metrics
    const summary = calculateSummary(todayTxns, categories);
    const categorySpending = calculateCategorySpending(todayTxns, categories);
    const anomalies = detectAnomalies(todayTxns, historyTxns, categories);

    // Get previous daily insight for continuity
    const prev = await getPreviousInsight(SINGLE_USER_ID, 'daily');

    // Build prompt and call LLM
    const prompt = buildDailyInsightPrompt({
      date: format(now, 'yyyy-MM-dd (EEEE)'),
      summary,
      categorySpending,
      anomalies,
      previousInsightNarrative: prev?.narrative,
    });

    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
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
      type: 'daily',
      periodStart: todayStart,
      periodEnd: todayEnd,
      summary: parsed.summary,
      highlights: parsed.highlights,
      recommendations: parsed.recommendations,
      anomalies,
      goalProgress: [],
      narrative: parsed.narrative,
    });

    // Send email
    try {
      const userDoc = await db.collection('users').doc(SINGLE_USER_ID).get();
      const email = userDoc.data()?.email;
      if (email) {
        const html = buildDailyEmailHtml({
          date: format(now, 'EEEE, MMMM d, yyyy'),
          summary: parsed.summary,
          highlights: parsed.highlights,
          recommendations: parsed.recommendations,
          anomalies,
          narrative: parsed.narrative,
        });
        await sendInsightEmail(email, `Daily Finance Update — ${format(now, 'MMM d')}`, html);
        await markInsightEmailed(SINGLE_USER_ID, insightId);
      }
    } catch (e) {
      console.error('Failed to send email:', e);
    }

    console.log(`Daily insight generated: ${insightId}`);
  }
);
