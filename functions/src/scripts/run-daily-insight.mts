/**
 * Ad hoc runner for the daily insight — sends a real email.
 * Run with: npx tsx src/scripts/run-daily-insight.mts
 */

import { initializeApp, applicationDefault, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import Anthropic from '@anthropic-ai/sdk';
import { startOfDay, endOfDay, subDays, format } from 'date-fns';
import { calculateSummary, calculateCategorySpending, type TransactionDoc, type CategoryDoc } from '../shared/aggregations.js';
import { detectAnomalies } from '../shared/anomalyDetection.js';
import { buildDailyInsightPrompt } from '../shared/promptTemplates.js';
import { loadAdvisorMemory, formatMemoryForPrompt } from '../shared/memoryManager.js';
import { storeInsight, getPreviousInsight, markInsightEmailed } from '../shared/insightStorage.js';
import { sendInsightEmail } from '../shared/emailSender.js';
import { buildDailyEmailHtml } from '../shared/emailTemplates.js';

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID ?? 'free-lunch-85447';
const USER_ID = process.env.FREE_LUNCH_USER_ID ?? 'iTLsCrooi9MFYlKV7eP2nsVuffh2';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY ?? '';
const RESEND_API_KEY = process.env.RESEND_API_KEY ?? '';

if (!ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY is required');
if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY is required');

if (getApps().length === 0) {
  initializeApp({ credential: applicationDefault(), projectId: PROJECT_ID });
}

const db = getFirestore();
const now = new Date();
const todayStart = startOfDay(now);
const todayEnd = endOfDay(now);
const historyStart = subDays(todayStart, 30);

console.log(`Running daily insight for ${format(now, 'yyyy-MM-dd (EEEE)')}...`);

const [todaySnap, historySnap, categoriesSnap, advisorMemory] = await Promise.all([
  db.collection('users').doc(USER_ID).collection('transactions')
    .where('date', '>=', Timestamp.fromDate(todayStart))
    .where('date', '<=', Timestamp.fromDate(todayEnd))
    .get(),
  db.collection('users').doc(USER_ID).collection('transactions')
    .where('date', '>=', Timestamp.fromDate(historyStart))
    .where('date', '<', Timestamp.fromDate(todayStart))
    .get(),
  db.collection('users').doc(USER_ID).collection('categories').get(),
  loadAdvisorMemory(USER_ID),
]);

const todayTxns = todaySnap.docs.map((d) => ({ id: d.id, doc: d.data() as TransactionDoc }));
const historyTxns = historySnap.docs.map((d) => ({ id: d.id, doc: d.data() as TransactionDoc }));
const categories = new Map<string, CategoryDoc>();
categoriesSnap.docs.forEach((d) => categories.set(d.id, d.data() as CategoryDoc));

console.log(`Today: ${todayTxns.length} transactions | History: ${historyTxns.length} transactions`);

if (todayTxns.length === 0) {
  console.log('No transactions today — email would be skipped in production.');
  process.exit(0);
}

const summary = calculateSummary(todayTxns, categories);
const categorySpending = calculateCategorySpending(todayTxns, categories);
const anomalies = detectAnomalies(todayTxns, historyTxns, categories);
const prev = await getPreviousInsight(USER_ID, 'daily');

console.log(`Summary: €${summary.totalExpenses.toFixed(2)} expenses, €${summary.totalIncome.toFixed(2)} income`);
console.log(`Anomalies: ${anomalies.length}`);
console.log(`Advisor memory loaded: ${advisorMemory ? 'yes' : 'no'}`);

const prompt = buildDailyInsightPrompt({
  date: format(now, 'yyyy-MM-dd (EEEE)'),
  summary,
  categorySpending,
  anomalies,
  previousInsightNarrative: prev?.narrative,
  advisorMemory: advisorMemory ? formatMemoryForPrompt(advisorMemory) : undefined,
});

console.log('\nCalling Claude...');
const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
const message = await client.messages.create({
  model: 'claude-haiku-4-5-20251001',
  max_tokens: 2048,
  messages: [{ role: 'user', content: prompt }],
});

const textBlock = message.content.find((b) => b.type === 'text');
if (!textBlock || textBlock.type !== 'text') throw new Error('No text from LLM');

let json = textBlock.text.trim();
if (json.startsWith('```')) json = json.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
const parsed = JSON.parse(json);

console.log(`\nSummary: ${parsed.summary}`);
console.log(`Highlights: ${parsed.highlights.length} | Recommendations: ${parsed.recommendations.length}`);

const insightId = await storeInsight(USER_ID, {
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

const userDoc = await db.collection('users').doc(USER_ID).get();
const email = userDoc.data()?.email;
if (!email) throw new Error('No email on user doc');

// Temporarily inject RESEND_API_KEY into env so emailSender picks it up
process.env.RESEND_API_KEY = RESEND_API_KEY;

const html = buildDailyEmailHtml({
  date: format(now, 'EEEE, MMMM d, yyyy'),
  summary: parsed.summary,
  highlights: parsed.highlights,
  recommendations: parsed.recommendations,
  anomalies,
  narrative: parsed.narrative,
});

await sendInsightEmail(email, `Daily Finance Update — ${format(now, 'MMM d')}`, html);
await markInsightEmailed(USER_ID, insightId);

console.log(`\n✅ Email sent to ${email} (insight: ${insightId})`);
process.exit(0);
