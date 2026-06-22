import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import type { AnthropicClient } from './anthropic.js';
import { format, subDays, startOfMonth, endOfMonth, startOfWeek } from 'date-fns';
import type { TransactionDoc, CategoryDoc } from './aggregations.js';

// ============================================================================
// Schema
// ============================================================================

export interface SpendingBaseline {
  categoryId: string;
  categoryName: string;
  avg90d: number;       // rolling 90-day average monthly spend
  stddev90d: number;
  sampleMonths: number; // 1–3 — tells LLM how reliable the baseline is
}

export interface KnownMerchant {
  counterparty: string;
  typicalAmount: number;  // median across all visits
  visitCount: number;
  lastSeen: Date;
  frequencyLabel: string; // 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly' | 'occasional'
}

export interface AdvisorMemoryData {
  // --- human-provided, preserved across consolidations ---
  financialProfile: string;
  recurringExpenses: { counterparty: string; amount: number; frequency: string }[];
  activeGoals: { goalId: string; name: string; summary: string }[];
  investmentProfile: string;
  pastAdvice: { date: Date; advice: string; outcome?: string }[];
  updatedAt: Date;

  // --- computed from transactions, refreshed weekly ---
  spendingBaselines?: SpendingBaseline[];
  knownMerchants?: KnownMerchant[];
  behavioralPatterns?: string[];
  temporalPatterns?: string[];
  consolidatedAt?: Date;
}

interface TransactionWithId {
  id: string;
  doc: TransactionDoc;
}

// ============================================================================
// Pure computation functions
// ============================================================================

/** Get the top-level category id for a transaction (walk up parentId chain once). */
function getTopLevelCategoryId(
  categoryId: string | null,
  categories: Map<string, CategoryDoc>
): string {
  if (!categoryId) return 'uncategorized';
  const cat = categories.get(categoryId);
  if (!cat) return categoryId;
  return cat.parentId ? cat.parentId : categoryId;
}

function getCategoryName(categoryId: string, categories: Map<string, CategoryDoc>): string {
  return categories.get(categoryId)?.name ?? categoryId;
}

/** Compute median of a number array. */
function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** Compute standard deviation of a number array. */
function stddev(values: number[]): number {
  if (values.length < 2) return 0;
  const avg = values.reduce((s, v) => s + v, 0) / values.length;
  const variance = values.reduce((s, v) => s + Math.pow(v - avg, 2), 0) / values.length;
  return Math.sqrt(variance);
}

/**
 * Compute per-category spending baselines from the last 90 days of transactions.
 */
export function computeSpendingBaselines(
  allTransactions: TransactionWithId[],
  categories: Map<string, CategoryDoc>
): SpendingBaseline[] {
  const cutoff = subDays(new Date(), 90);

  // Filter: expenses only, within 90 days, not excluded
  const recentExpenses = allTransactions.filter((t) => {
    const date = t.doc.date?.toDate?.() ?? new Date(0);
    return (
      t.doc.amount < 0 &&
      !t.doc.excludeFromTotals &&
      date >= cutoff
    );
  });

  // Group by top-level category, then by calendar month
  const categoryMonths = new Map<string, Map<string, number>>();

  for (const t of recentExpenses) {
    const topCatId = getTopLevelCategoryId(t.doc.categoryId, categories);
    const monthKey = format(t.doc.date.toDate(), 'yyyy-MM');
    const amount = Math.abs(t.doc.amount);

    if (!categoryMonths.has(topCatId)) categoryMonths.set(topCatId, new Map());
    const months = categoryMonths.get(topCatId)!;
    months.set(monthKey, (months.get(monthKey) ?? 0) + amount);
  }

  const baselines: SpendingBaseline[] = [];

  for (const [catId, months] of categoryMonths.entries()) {
    const monthlyTotals = Array.from(months.values());
    const avg = monthlyTotals.reduce((s, v) => s + v, 0) / monthlyTotals.length;
    const sd = stddev(monthlyTotals);

    baselines.push({
      categoryId: catId,
      categoryName: getCategoryName(catId, categories),
      avg90d: Math.round(avg * 100) / 100,
      stddev90d: Math.round(sd * 100) / 100,
      sampleMonths: Math.min(monthlyTotals.length, 3),
    });
  }

  return baselines.sort((a, b) => b.avg90d - a.avg90d);
}

/**
 * Derive a human-readable frequency label from average days between visits.
 */
function frequencyLabel(avgDaysBetween: number): string {
  if (avgDaysBetween <= 9) return 'weekly';
  if (avgDaysBetween <= 18) return 'biweekly';
  if (avgDaysBetween <= 40) return 'monthly';
  if (avgDaysBetween <= 100) return 'quarterly';
  if (avgDaysBetween <= 400) return 'yearly';
  return 'occasional';
}

/**
 * Build known merchant list from ALL available transaction history.
 * Uses counterparty strings — immune to category changes.
 */
export function computeKnownMerchants(allTransactions: TransactionWithId[]): KnownMerchant[] {
  // Only expense transactions with a counterparty
  const expenses = allTransactions.filter(
    (t) => t.doc.amount < 0 && t.doc.counterparty && !t.doc.excludeFromTotals
  );

  const grouped = new Map<string, { amounts: number[]; dates: Date[]; displayName: string }>();

  for (const t of expenses) {
    const key = (t.doc.counterparty as string).toLowerCase().trim();
    if (!grouped.has(key)) {
      grouped.set(key, { amounts: [], dates: [], displayName: t.doc.counterparty as string });
    }
    const g = grouped.get(key)!;
    g.amounts.push(Math.abs(t.doc.amount));
    g.dates.push(t.doc.date.toDate());
  }

  const merchants: KnownMerchant[] = [];

  for (const [, g] of grouped.entries()) {
    const sortedDates = g.dates.sort((a, b) => a.getTime() - b.getTime());
    let avgDays = 365; // default: occasional
    if (sortedDates.length >= 2) {
      const totalSpan =
        (sortedDates[sortedDates.length - 1].getTime() - sortedDates[0].getTime()) /
        (1000 * 60 * 60 * 24);
      avgDays = totalSpan / (sortedDates.length - 1);
    }

    merchants.push({
      counterparty: g.displayName,
      typicalAmount: Math.round(median(g.amounts) * 100) / 100,
      visitCount: g.amounts.length,
      lastSeen: sortedDates[sortedDates.length - 1],
      frequencyLabel: frequencyLabel(avgDays),
    });
  }

  // Sort by visitCount descending, cap at 200
  return merchants.sort((a, b) => b.visitCount - a.visitCount).slice(0, 200);
}

/**
 * Build a compact text block of spending aggregates for the consolidation LLM call.
 * Stays under ~1500 tokens.
 */
export function buildConsolidationContext(
  allTransactions: TransactionWithId[],
  categories: Map<string, CategoryDoc>
): string {
  const expenses = allTransactions.filter(
    (t) => t.doc.amount < 0 && !t.doc.excludeFromTotals
  );

  if (expenses.length === 0) return 'No expense transaction data available.';

  // Monthly totals
  const byMonth = new Map<string, number>();
  const byDow = new Map<number, number[]>(); // 0=Mon…6=Sun
  const byDayOfMonth = new Map<string, number>(); // 'first3' | 'rest'

  for (const t of expenses) {
    const date = t.doc.date.toDate();
    const monthKey = format(date, 'yyyy-MM');
    const dow = (date.getDay() + 6) % 7; // make Mon=0
    const dom = date.getDate();
    const bucket = dom <= 3 ? 'first3' : 'rest';
    const amount = Math.abs(t.doc.amount);

    byMonth.set(monthKey, (byMonth.get(monthKey) ?? 0) + amount);
    if (!byDow.has(dow)) byDow.set(dow, []);
    byDow.get(dow)!.push(amount);
    byDayOfMonth.set(bucket, (byDayOfMonth.get(bucket) ?? 0) + amount);
  }

  // Weekly totals (last 12 weeks for context)
  const byWeek = new Map<string, number>();
  for (const t of expenses) {
    const date = t.doc.date.toDate();
    const weekKey = format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    byWeek.set(weekKey, (byWeek.get(weekKey) ?? 0) + Math.abs(t.doc.amount));
  }

  const dowNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const monthLines = Array.from(byMonth.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12) // last 12 months max
    .map(([m, v]) => `  ${m}: €${v.toFixed(0)}`)
    .join('\n');

  const dowLines = dowNames
    .map((name, i) => {
      const vals = byDow.get(i) ?? [];
      if (vals.length === 0) return null;
      const avg = vals.reduce((s, v) => s + v, 0) / vals.length;
      return `  ${name}: avg €${avg.toFixed(0)}/day (${vals.length} days)`;
    })
    .filter(Boolean)
    .join('\n');

  const first3 = byDayOfMonth.get('first3') ?? 0;
  const rest = byDayOfMonth.get('rest') ?? 0;
  const first3Days = expenses.filter((t) => t.doc.date.toDate().getDate() <= 3).length;
  const restDays = expenses.filter((t) => t.doc.date.toDate().getDate() > 3).length;
  const first3AvgDay = first3Days > 0 ? first3 / first3Days : 0;
  const restAvgDay = restDays > 0 ? rest / restDays : 0;

  // Top categories for context
  const catTotals = new Map<string, number>();
  for (const t of expenses) {
    const catId = getTopLevelCategoryId(t.doc.categoryId, categories);
    catTotals.set(catId, (catTotals.get(catId) ?? 0) + Math.abs(t.doc.amount));
  }
  const topCats = Array.from(catTotals.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)
    .map(([id, v]) => `  ${getCategoryName(id, categories)}: €${v.toFixed(0)} total`)
    .join('\n');

  const totalMonths = byMonth.size;
  const dateRange = Array.from(byMonth.keys()).sort();

  return `DATA RANGE: ${dateRange[0] ?? 'unknown'} to ${dateRange[dateRange.length - 1] ?? 'unknown'} (${totalMonths} months, ${expenses.length} expense transactions)

MONTHLY SPENDING TOTALS (expenses only):
${monthLines}

DAY-OF-WEEK AVERAGES:
${dowLines}

DAY-OF-MONTH PATTERN:
  Days 1-3: avg €${first3AvgDay.toFixed(0)}/day
  Days 4-31: avg €${restAvgDay.toFixed(0)}/day
  ${first3AvgDay > restAvgDay * 1.5 ? '(Note: first 3 days of month are significantly higher — likely fixed costs landing)' : ''}

TOP SPENDING CATEGORIES (all time):
${topCats}`;
}

// ============================================================================
// Main consolidation function
// ============================================================================

/**
 * Full memory consolidation: reads ALL transactions, computes baselines + merchants,
 * runs one LLM call to extract behavioral and temporal patterns, writes to Firestore.
 * Preserves human-provided fields (financialProfile, recurringExpenses, activeGoals, etc.)
 */
export async function consolidateAdvisorMemory(
  userId: string,
  anthropicClient: AnthropicClient,
  options?: { model?: string }
): Promise<{ baselines: number; merchants: number; patterns: number }> {
  const db = getFirestore();

  // Fetch all transactions and categories in parallel
  const [txnSnap, catSnap] = await Promise.all([
    db.collection('users').doc(userId).collection('transactions').get(),
    db.collection('users').doc(userId).collection('categories').get(),
  ]);

  const allTxns: TransactionWithId[] = txnSnap.docs.map((d) => ({
    id: d.id,
    doc: d.data() as TransactionDoc,
  }));

  const categories = new Map<string, CategoryDoc>();
  catSnap.docs.forEach((d) => categories.set(d.id, d.data() as CategoryDoc));

  // Compute structured data
  const spendingBaselines = computeSpendingBaselines(allTxns, categories);
  const knownMerchants = computeKnownMerchants(allTxns);
  const consolidationContext = buildConsolidationContext(allTxns, categories);

  // LLM call to extract patterns
  const model = options?.model ?? 'claude-haiku-4-5-20251001';
  let behavioralPatterns: string[] = [];
  let temporalPatterns: string[] = [];

  try {
    const response = await anthropicClient.messages.create({
      model,
      max_tokens: 400,
      messages: [
        {
          role: 'user',
          content: `You are a financial pattern analyst. Based on the spending data below, extract behavioral and temporal patterns for this user.

${consolidationContext}

Respond with ONLY this JSON (no markdown, no other text):
{
  "behavioralPatterns": [],
  "temporalPatterns": []
}

Rules:
- behavioralPatterns: max 8 strings, each max 150 chars, about HOW the user spends (e.g. "Saturday grocery spending is 2-3x weekday average")
- temporalPatterns: max 8 strings, each max 150 chars, about WHEN they spend (day-of-week, day-of-month, seasonal, e.g. "First 3 days of month: fixed costs land, daily avg 2x rest of month")
- Only include patterns clearly supported by the data
- If data is insufficient (< 4 weeks), return fewer patterns or empty arrays
- Be specific and quantitative where possible`,
        },
      ],
    });

    const text = response.content.find((b) => b.type === 'text')?.text ?? '';
    let json = text.trim();
    if (json.startsWith('```')) json = json.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    const parsed = JSON.parse(json) as {
      behavioralPatterns?: unknown[];
      temporalPatterns?: unknown[];
    };

    behavioralPatterns = (parsed.behavioralPatterns ?? [])
      .filter((s): s is string => typeof s === 'string')
      .map((s) => s.slice(0, 150))
      .slice(0, 8);

    temporalPatterns = (parsed.temporalPatterns ?? [])
      .filter((s): s is string => typeof s === 'string')
      .map((s) => s.slice(0, 150))
      .slice(0, 8);
  } catch (err) {
    console.error('Consolidation LLM call failed, proceeding without patterns:', err);
  }

  // Write computed fields only — preserve human-provided fields via merge
  const ref = db
    .collection('users')
    .doc(userId)
    .collection('advisorMemory')
    .doc('current');

  await ref.set(
    {
      spendingBaselines: spendingBaselines.map((b) => ({ ...b })),
      knownMerchants: knownMerchants.map((m) => ({
        ...m,
        lastSeen: Timestamp.fromDate(m.lastSeen),
      })),
      behavioralPatterns,
      temporalPatterns,
      consolidatedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  return {
    baselines: spendingBaselines.length,
    merchants: knownMerchants.length,
    patterns: behavioralPatterns.length + temporalPatterns.length,
  };
}

// ============================================================================
// Daily micro-update
// ============================================================================

type MicroPatch =
  | { op: 'add_merchant'; counterparty: string; amount: number }
  | { op: 'update_merchant'; counterparty: string; amount: number }
  | { op: 'add_behavioral_pattern'; text: string }
  | { op: 'add_temporal_pattern'; text: string }
  | { op: 'add_advice'; text: string };

/**
 * Cheap daily LLM call (Haiku, ~200 tokens) that patches memory with incremental facts
 * observed in today's transactions. Non-fatal — caller must wrap in try/catch.
 */
export async function applyDailyMicroUpdate(
  userId: string,
  todayTransactions: TransactionWithId[],
  currentMemory: AdvisorMemoryData,
  anthropicClient: AnthropicClient
): Promise<void> {
  if (todayTransactions.length === 0) return;

  const todayLines = todayTransactions
    .filter((t) => t.doc.amount < 0)
    .map(
      (t) =>
        `  - ${t.doc.counterparty ?? t.doc.description}: €${Math.abs(t.doc.amount).toFixed(2)}`
    )
    .join('\n');

  if (!todayLines.trim()) return; // income-only day, nothing to patch

  const topMerchants = (currentMemory.knownMerchants ?? [])
    .slice(0, 10)
    .map((m) => `  - ${m.counterparty} (${m.visitCount}x, typical €${m.typicalAmount})`)
    .join('\n');

  const currentPatterns = [
    ...(currentMemory.behavioralPatterns ?? []),
    ...(currentMemory.temporalPatterns ?? []),
  ]
    .slice(0, 6)
    .map((p) => `  - ${p}`)
    .join('\n');

  const response = await anthropicClient.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 200,
    messages: [
      {
        role: 'user',
        content: `You are a financial memory assistant. Today's expense transactions:
${todayLines}

Known merchants (top 10):
${topMerchants || '  (none yet)'}

Current patterns:
${currentPatterns || '  (none yet)'}

Respond with ONLY this JSON:
{"patches":[]}

Each patch is one of:
  {"op":"add_merchant","counterparty":"name","amount":12.34}
  {"op":"update_merchant","counterparty":"name","amount":12.34}
  {"op":"add_behavioral_pattern","text":"max 120 chars"}
  {"op":"add_temporal_pattern","text":"max 120 chars"}
  {"op":"add_advice","text":"max 150 chars"}

Rules: max 3 patches, empty array if nothing noteworthy, never duplicate existing patterns.`,
      },
    ],
  });

  const text = response.content.find((b) => b.type === 'text')?.text ?? '';
  let json = text.trim();
  if (json.startsWith('```')) json = json.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');

  const parsed = JSON.parse(json) as { patches?: MicroPatch[] };
  const patches = parsed.patches ?? [];
  if (patches.length === 0) return;

  const db = getFirestore();
  const ref = db
    .collection('users')
    .doc(userId)
    .collection('advisorMemory')
    .doc('current');

  const snap = await ref.get();
  if (!snap.exists) return;

  const data = snap.data()!;
  const knownMerchants: KnownMerchant[] = (data.knownMerchants ?? []).map(
    (m: { counterparty: string; typicalAmount: number; visitCount: number; lastSeen: Timestamp; frequencyLabel: string }) => ({
      ...m,
      lastSeen: m.lastSeen?.toDate?.() ?? new Date(),
    })
  );
  const behavioralPatterns: string[] = data.behavioralPatterns ?? [];
  const temporalPatterns: string[] = data.temporalPatterns ?? [];
  const pastAdvice: { date: Timestamp; advice: string }[] = data.pastAdvice ?? [];

  let changed = false;

  for (const patch of patches) {
    if (patch.op === 'add_merchant') {
      const key = patch.counterparty.toLowerCase().trim();
      const existing = knownMerchants.find(
        (m) => m.counterparty.toLowerCase().trim() === key
      );
      if (!existing) {
        knownMerchants.push({
          counterparty: patch.counterparty,
          typicalAmount: patch.amount,
          visitCount: 1,
          lastSeen: new Date(),
          frequencyLabel: 'occasional',
        });
        changed = true;
      }
    } else if (patch.op === 'update_merchant') {
      const key = patch.counterparty.toLowerCase().trim();
      const existing = knownMerchants.find(
        (m) => m.counterparty.toLowerCase().trim() === key
      );
      if (existing) {
        // Update typicalAmount via running average
        existing.typicalAmount =
          Math.round(
            ((existing.typicalAmount * existing.visitCount + patch.amount) /
              (existing.visitCount + 1)) *
              100
          ) / 100;
        existing.visitCount += 1;
        existing.lastSeen = new Date();
        changed = true;
      }
    } else if (patch.op === 'add_behavioral_pattern') {
      const text = patch.text.slice(0, 120);
      if (!behavioralPatterns.includes(text)) {
        behavioralPatterns.push(text);
        if (behavioralPatterns.length > 10) behavioralPatterns.shift();
        changed = true;
      }
    } else if (patch.op === 'add_temporal_pattern') {
      const text = patch.text.slice(0, 120);
      if (!temporalPatterns.includes(text)) {
        temporalPatterns.push(text);
        if (temporalPatterns.length > 10) temporalPatterns.shift();
        changed = true;
      }
    } else if (patch.op === 'add_advice') {
      pastAdvice.push({
        date: Timestamp.now(),
        advice: patch.text.slice(0, 150),
      });
      // Keep last 20
      if (pastAdvice.length > 20) pastAdvice.splice(0, pastAdvice.length - 20);
      changed = true;
    }
  }

  if (!changed) return;

  await ref.set(
    {
      knownMerchants: knownMerchants.map((m) => ({
        ...m,
        lastSeen: Timestamp.fromDate(m.lastSeen),
      })),
      behavioralPatterns,
      temporalPatterns,
      pastAdvice,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}

// ============================================================================
// Existing CRUD functions (unchanged)
// ============================================================================

/**
 * Load advisor memory for a user. Returns null if not yet initialized.
 */
export async function loadAdvisorMemory(userId: string): Promise<AdvisorMemoryData | null> {
  const db = getFirestore();
  const doc = await db
    .collection('users')
    .doc(userId)
    .collection('advisorMemory')
    .doc('current')
    .get();

  if (!doc.exists) return null;

  const data = doc.data()!;
  return {
    financialProfile: data.financialProfile ?? '',
    recurringExpenses: data.recurringExpenses ?? [],
    activeGoals: data.activeGoals ?? [],
    investmentProfile: data.investmentProfile ?? '',
    pastAdvice: (data.pastAdvice ?? []).map(
      (a: { date: Timestamp; advice: string; outcome?: string }) => ({
        ...a,
        date: a.date?.toDate?.() ?? new Date(),
      })
    ),
    updatedAt: data.updatedAt?.toDate?.() ?? new Date(),
    spendingBaselines: (data.spendingBaselines ?? []) as SpendingBaseline[],
    knownMerchants: (data.knownMerchants ?? []).map(
      (m: { counterparty: string; typicalAmount: number; visitCount: number; lastSeen: Timestamp; frequencyLabel: string }) => ({
        ...m,
        lastSeen: m.lastSeen?.toDate?.() ?? new Date(),
      })
    ),
    behavioralPatterns: data.behavioralPatterns ?? [],
    temporalPatterns: data.temporalPatterns ?? [],
    consolidatedAt: data.consolidatedAt?.toDate?.() ?? undefined,
  };
}

/**
 * Initialize or update advisor memory.
 * Keeps only the most recent 20 pieces of past advice (rolling window).
 */
export async function updateAdvisorMemory(
  userId: string,
  updates: Partial<Omit<AdvisorMemoryData, 'updatedAt'>>
): Promise<void> {
  const db = getFirestore();
  const ref = db
    .collection('users')
    .doc(userId)
    .collection('advisorMemory')
    .doc('current');

  const existing = await ref.get();

  if (!existing.exists) {
    await ref.set({
      financialProfile: updates.financialProfile ?? '',
      recurringExpenses: updates.recurringExpenses ?? [],
      activeGoals: updates.activeGoals ?? [],
      investmentProfile: updates.investmentProfile ?? '',
      pastAdvice: (updates.pastAdvice ?? []).map((a) => ({
        ...a,
        date: Timestamp.fromDate(a.date),
      })),
      spendingBaselines: [],
      knownMerchants: [],
      behavioralPatterns: [],
      temporalPatterns: [],
      updatedAt: FieldValue.serverTimestamp(),
    });
    return;
  }

  const data = existing.data()!;
  const existingAdvice: { date: Timestamp; advice: string; outcome?: string }[] =
    data.pastAdvice ?? [];
  const newAdvice = (updates.pastAdvice ?? []).map((a) => ({
    ...a,
    date: Timestamp.fromDate(a.date),
  }));
  const mergedAdvice = [...existingAdvice, ...newAdvice].slice(-20);

  const updateData: Record<string, unknown> = {
    updatedAt: FieldValue.serverTimestamp(),
  };
  if (updates.financialProfile !== undefined) updateData.financialProfile = updates.financialProfile;
  if (updates.recurringExpenses !== undefined) updateData.recurringExpenses = updates.recurringExpenses;
  if (updates.activeGoals !== undefined) updateData.activeGoals = updates.activeGoals;
  if (updates.investmentProfile !== undefined) updateData.investmentProfile = updates.investmentProfile;
  if (updates.pastAdvice !== undefined) updateData.pastAdvice = mergedAdvice;

  await ref.update(updateData);
}

/**
 * Format advisor memory as a prompt-friendly string.
 * Hard truncation keeps total context under ~800 tokens.
 */
export function formatMemoryForPrompt(memory: AdvisorMemoryData): string {
  const parts: string[] = [];

  if (memory.financialProfile) {
    parts.push(`Financial Profile: ${memory.financialProfile}`);
  }

  if (memory.investmentProfile) {
    parts.push(`Investment Profile: ${memory.investmentProfile}`);
  }

  if (memory.recurringExpenses.length > 0) {
    const recurring = memory.recurringExpenses
      .slice(0, 10)
      .map((r) => `  - ${r.counterparty}: €${r.amount.toFixed(2)} (${r.frequency})`)
      .join('\n');
    parts.push(`Known Recurring Expenses:\n${recurring}`);
  }

  if (memory.activeGoals.length > 0) {
    const goals = memory.activeGoals
      .map((g) => `  - ${g.name}: ${g.summary}`)
      .join('\n');
    parts.push(`Active Goals:\n${goals}`);
  }

  if (memory.pastAdvice.length > 0) {
    const recent = memory.pastAdvice.slice(-5);
    const advice = recent
      .map((a) => `  - ${a.advice}${a.outcome ? ` → ${a.outcome}` : ''}`)
      .join('\n');
    parts.push(`Recent Advice Given:\n${advice}`);
  }

  // New sections — only shown if data exists
  if (memory.spendingBaselines && memory.spendingBaselines.length > 0) {
    const lines = memory.spendingBaselines
      .slice(0, 8)
      .map((b) => {
        const reliability = b.sampleMonths >= 2 ? '' : ' (limited data)';
        const sd = b.stddev90d > 0 ? ` ±€${b.stddev90d}` : '';
        return `  - ${b.categoryName}: avg €${b.avg90d}/mo${sd}${reliability}`;
      })
      .join('\n');
    parts.push(`Spending Baselines (90-day rolling):\n${lines}`);
  }

  if (memory.knownMerchants && memory.knownMerchants.length > 0) {
    const lines = memory.knownMerchants
      .slice(0, 15)
      .map((m) => `  - ${m.counterparty}: typical €${m.typicalAmount}, ${m.visitCount}x seen (${m.frequencyLabel})`)
      .join('\n');
    parts.push(`Known Merchants:\n${lines}`);
  }

  if (memory.behavioralPatterns && memory.behavioralPatterns.length > 0) {
    const lines = memory.behavioralPatterns
      .slice(0, 5)
      .map((p) => `  - ${p.slice(0, 120)}`)
      .join('\n');
    parts.push(`Behavioral Patterns:\n${lines}`);
  }

  if (memory.temporalPatterns && memory.temporalPatterns.length > 0) {
    const lines = memory.temporalPatterns
      .slice(0, 5)
      .map((p) => `  - ${p.slice(0, 120)}`)
      .join('\n');
    parts.push(`Temporal Patterns:\n${lines}`);
  }

  return parts.join('\n\n');
}
