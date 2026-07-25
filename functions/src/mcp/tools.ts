import { Timestamp, type Firestore } from 'firebase-admin/firestore';
import { subMonths } from 'date-fns';
import { WRITE_TOOL_DEFINITIONS, callWriteTool } from './writeTools.js';
import { matchMerchant } from '../categorization/merchantDatabase.js';

/**
 * Finance query tools exposed over MCP.
 *
 * This module holds the read tools; write tools live in ./writeTools.ts. All
 * queries are scoped to a single user id supplied by the caller — no tool
 * accepts a user id argument.
 */

interface TransactionFilter {
  startDate?: string;
  endDate?: string;
  categoryId?: string;
  counterparty?: string;
  tags?: string[];
  tagMatch?: 'all' | 'any';
  minAmount?: number;
  maxAmount?: number;
  direction?: 'income' | 'expense' | 'all';
  limit?: number;
}

/** Firestore's hard cap on the number of values in an `array-contains-any`. */
const MAX_TAGS_ANY = 10;
/**
 * Upper bound on docs fetched when a tag filter is active. Tag filters run
 * server-side against the whole history, so this only guards pathological
 * cases — it sits far above any realistic tagged-transaction count.
 */
const TAG_QUERY_CAP = 500;

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Turn an UPPERCASE merchant pattern into a display name ("AH XL" -> "Ah Xl"). */
function toTitleCase(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

interface RawTxn {
  id: string;
  data: FirebaseFirestore.DocumentData;
}

/**
 * Shared transaction query + filter pipeline.
 *
 * Tag filtering is pushed into Firestore (`array-contains` / `array-contains-any`)
 * so the whole history is searched before any limit applies — transactions
 * tagged long ago are no longer missed. `fetchCap` bounds the Firestore read;
 * pass `null` for an unbounded scan (aggregation).
 */
async function queryTransactions(
  db: Firestore,
  userId: string,
  filter: TransactionFilter,
  fetchCap: number | null
): Promise<RawTxn[]> {
  let ref = db
    .collection('users')
    .doc(userId)
    .collection('transactions')
    .orderBy('date', 'desc') as FirebaseFirestore.Query;

  if (filter.startDate) {
    ref = ref.where('date', '>=', Timestamp.fromDate(new Date(filter.startDate)));
  }
  if (filter.endDate) {
    ref = ref.where('date', '<=', Timestamp.fromDate(new Date(filter.endDate)));
  }

  const tags = filter.tags ?? [];
  const tagMatch = filter.tagMatch ?? 'all';
  let categoryIdServerSide = false;

  if (tags.length > 0) {
    // A tag filter and a categoryId filter cannot both run server-side without
    // a three-field composite index, so categoryId falls back to a local pass.
    if (tagMatch === 'any') {
      if (tags.length > MAX_TAGS_ANY) {
        throw new Error(`tagMatch 'any' supports at most ${MAX_TAGS_ANY} tags`);
      }
      ref = ref.where('tags', 'array-contains-any', tags);
    } else {
      ref = ref.where('tags', 'array-contains', tags[0]);
    }
  } else if (filter.categoryId) {
    ref = ref.where('categoryId', '==', filter.categoryId);
    categoryIdServerSide = true;
  }

  if (fetchCap != null) {
    ref = ref.limit(fetchCap);
  }

  const snapshot = await ref.get();
  let rows: RawTxn[] = snapshot.docs.map((doc) => ({ id: doc.id, data: doc.data() }));

  if (!categoryIdServerSide && filter.categoryId) {
    rows = rows.filter((r) => (r.data.categoryId ?? null) === filter.categoryId);
  }
  // `array-contains` only matched the first tag — enforce the rest for AND.
  if (tagMatch === 'all' && tags.length > 1) {
    rows = rows.filter((r) => {
      const txnTags = Array.isArray(r.data.tags) ? (r.data.tags as string[]) : [];
      return tags.every((t) => txnTags.includes(t));
    });
  }
  if (filter.counterparty) {
    const search = filter.counterparty.toLowerCase();
    rows = rows.filter((r) =>
      (r.data.counterparty as string | null)?.toLowerCase().includes(search)
    );
  }
  if (filter.direction === 'income') {
    rows = rows.filter((r) => r.data.amount > 0);
  } else if (filter.direction === 'expense') {
    rows = rows.filter((r) => r.data.amount < 0);
  }
  if (filter.minAmount != null) {
    rows = rows.filter((r) => Math.abs(r.data.amount) >= filter.minAmount!);
  }
  if (filter.maxAmount != null) {
    rows = rows.filter((r) => Math.abs(r.data.amount) <= filter.maxAmount!);
  }

  return rows;
}

/** Load a category-id -> name map for the user. */
async function loadCategoryNames(db: Firestore, userId: string): Promise<Map<string, string>> {
  const snap = await db.collection('users').doc(userId).collection('categories').get();
  const names = new Map<string, string>();
  snap.docs.forEach((doc) => {
    const name = doc.data().name;
    if (typeof name === 'string') names.set(doc.id, name);
  });
  return names;
}

/** Best-effort cleaner merchant name from the categorization merchant database. */
function resolveMerchantName(data: FirebaseFirestore.DocumentData): string | null {
  const description = typeof data.description === 'string' ? data.description : '';
  const counterparty = typeof data.counterparty === 'string' ? data.counterparty : '';
  const match =
    (description ? matchMerchant(description) : null) ??
    (counterparty ? matchMerchant(counterparty) : null);
  return match ? toTitleCase(match.pattern) : null;
}

/** Shape a raw transaction doc into the enriched MCP response record. */
function enrichTransaction(row: RawTxn, categoryNames: Map<string, string>) {
  const categoryId = (row.data.categoryId as string | null) ?? null;
  return {
    id: row.id,
    date: row.data.date?.toDate?.()?.toISOString() ?? '',
    description: row.data.description,
    amount: row.data.amount,
    counterparty: row.data.counterparty ?? null,
    merchantName: resolveMerchantName(row.data),
    categoryId,
    categoryName: categoryId ? (categoryNames.get(categoryId) ?? null) : null,
    categorySource: row.data.categorySource ?? 'none',
    isSplit: row.data.isSplit ?? false,
    tags: Array.isArray(row.data.tags) ? (row.data.tags as string[]) : [],
  };
}

/** Wrap a transaction list with its record count and summed amount. */
function withTotals<T extends { amount: number }>(transactions: T[]) {
  return {
    transactions,
    totalCount: transactions.length,
    totalAmount: round2(transactions.reduce((sum, t) => sum + t.amount, 0)),
  };
}

async function getTransactions(db: Firestore, userId: string, filter: TransactionFilter) {
  const limit = filter.limit ?? 50;
  const hasTagFilter = (filter.tags ?? []).length > 0;
  // With a tag filter, scan deep history then slice; otherwise keep the
  // original behaviour of capping the Firestore read at the caller's limit.
  const fetchCap = hasTagFilter ? TAG_QUERY_CAP : limit;

  const [rows, categoryNames] = await Promise.all([
    queryTransactions(db, userId, filter, fetchCap),
    loadCategoryNames(db, userId),
  ]);

  const transactions = rows.slice(0, limit).map((r) => enrichTransaction(r, categoryNames));
  return withTotals(transactions);
}

async function searchTransactions(db: Firestore, userId: string, searchText: string, limit = 50) {
  // Firestore has no full-text search — fetch recent transactions and filter locally.
  const [snapshot, categoryNames] = await Promise.all([
    db
      .collection('users')
      .doc(userId)
      .collection('transactions')
      .orderBy('date', 'desc')
      .limit(500)
      .get(),
    loadCategoryNames(db, userId),
  ]);

  const search = searchText.toLowerCase();
  const transactions = snapshot.docs
    .map((doc) => ({ id: doc.id, data: doc.data() }))
    .filter(
      (r) =>
        (r.data.description as string | null)?.toLowerCase().includes(search) ||
        (r.data.counterparty as string | null)?.toLowerCase().includes(search)
    )
    .slice(0, limit)
    .map((r) => enrichTransaction(r, categoryNames));

  return withTotals(transactions);
}

type GroupBy = 'category' | 'tag' | 'counterparty' | 'month';

/**
 * Spending totals and counts over a filtered transaction set, without returning
 * the individual records. Optionally grouped by category, tag, counterparty, or
 * month. Note: a transaction may carry several tags, so grouping by tag can sum
 * above the overall total.
 */
async function aggregateTransactions(
  db: Firestore,
  userId: string,
  filter: TransactionFilter,
  groupBy?: GroupBy
) {
  const hasTagFilter = (filter.tags ?? []).length > 0;
  const rows = await queryTransactions(db, userId, filter, hasTagFilter ? TAG_QUERY_CAP : null);

  let totalAmount = 0;
  let totalIncome = 0;
  let totalExpenses = 0;
  for (const row of rows) {
    const amount = row.data.amount as number;
    totalAmount += amount;
    if (amount > 0) totalIncome += amount;
    else totalExpenses += Math.abs(amount);
  }

  const summary = {
    totalAmount: round2(totalAmount),
    totalIncome: round2(totalIncome),
    totalExpenses: round2(totalExpenses),
    transactionCount: rows.length,
  };

  if (!groupBy) return summary;

  const categoryNames = groupBy === 'category' ? await loadCategoryNames(db, userId) : null;
  const groups = new Map<string, { label: string; amount: number; count: number }>();

  for (const row of rows) {
    const amount = row.data.amount as number;
    let keys: { key: string; label: string }[];
    if (groupBy === 'category') {
      const id = (row.data.categoryId as string | null) ?? 'uncategorized';
      const label =
        id === 'uncategorized' ? 'Uncategorized' : (categoryNames!.get(id) ?? 'Unknown');
      keys = [{ key: id, label }];
    } else if (groupBy === 'counterparty') {
      const cp = (row.data.counterparty as string | null) ?? 'Unknown';
      keys = [{ key: cp, label: cp }];
    } else if (groupBy === 'month') {
      const month = row.data.date?.toDate?.()?.toISOString().slice(0, 7) ?? 'unknown';
      keys = [{ key: month, label: month }];
    } else {
      const txnTags = Array.isArray(row.data.tags) ? (row.data.tags as string[]) : [];
      keys =
        txnTags.length > 0
          ? txnTags.map((t) => ({ key: t, label: t }))
          : [{ key: 'untagged', label: 'Untagged' }];
    }
    for (const { key, label } of keys) {
      const group = groups.get(key) ?? { label, amount: 0, count: 0 };
      group.amount += amount;
      group.count += 1;
      groups.set(key, group);
    }
  }

  const groupList = Array.from(groups.entries())
    .map(([key, g]) => ({ key, label: g.label, amount: round2(g.amount), count: g.count }))
    .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));

  return { ...summary, groupBy, groups: groupList };
}

async function getSpendingSummary(
  db: Firestore,
  userId: string,
  startDate: string,
  endDate: string
) {
  const [txnSnap, catSnap] = await Promise.all([
    db
      .collection('users')
      .doc(userId)
      .collection('transactions')
      .where('date', '>=', Timestamp.fromDate(new Date(startDate)))
      .where('date', '<=', Timestamp.fromDate(new Date(endDate)))
      .get(),
    db.collection('users').doc(userId).collection('categories').get(),
  ]);

  const categories = new Map<string, { name: string; color: string; parentId: string | null }>();
  catSnap.docs.forEach((doc) => {
    const data = doc.data();
    categories.set(doc.id, { name: data.name, color: data.color, parentId: data.parentId });
  });

  let totalIncome = 0;
  let totalExpenses = 0;
  const byCat = new Map<string, { name: string; amount: number; count: number }>();

  for (const doc of txnSnap.docs) {
    const data = doc.data();
    if (data.excludeFromTotals) continue;
    if (data.reimbursement?.status === 'pending') continue;
    if (data.reimbursement?.status === 'cleared') continue;

    if (data.amount > 0) {
      totalIncome += data.amount;
    } else {
      totalExpenses += Math.abs(data.amount);
      const catId = data.categoryId ?? 'uncategorized';
      const cat = categories.get(catId);
      const existing = byCat.get(catId) ?? {
        name: cat?.name ?? 'Uncategorized',
        amount: 0,
        count: 0,
      };
      existing.amount += Math.abs(data.amount);
      existing.count += 1;
      byCat.set(catId, existing);
    }
  }

  const categoryBreakdown = Array.from(byCat.entries())
    .map(([id, data]) => ({
      categoryId: id,
      categoryName: data.name,
      amount: Math.round(data.amount * 100) / 100,
      transactionCount: data.count,
      percentage:
        totalExpenses > 0 ? Math.round((data.amount / totalExpenses) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  return {
    period: { startDate, endDate },
    totalIncome: Math.round(totalIncome * 100) / 100,
    totalExpenses: Math.round(totalExpenses * 100) / 100,
    netBalance: Math.round((totalIncome - totalExpenses) * 100) / 100,
    transactionCount: txnSnap.size,
    categoryBreakdown,
  };
}

async function getCategoryTrends(
  db: Firestore,
  userId: string,
  categoryId: string,
  months = 6
) {
  const now = new Date();
  const results: { month: string; amount: number; transactionCount: number }[] = [];

  for (let i = 0; i < months; i++) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);

    const snapshot = await db
      .collection('users')
      .doc(userId)
      .collection('transactions')
      .where('date', '>=', Timestamp.fromDate(monthDate))
      .where('date', '<=', Timestamp.fromDate(monthEnd))
      .where('categoryId', '==', categoryId)
      .get();

    let total = 0;
    let count = 0;
    for (const doc of snapshot.docs) {
      const data = doc.data();
      if (data.amount < 0) {
        total += Math.abs(data.amount);
        count++;
      }
    }

    results.push({
      month: monthDate.toISOString().slice(0, 7),
      amount: Math.round(total * 100) / 100,
      transactionCount: count,
    });
  }

  return results.reverse();
}

async function getBudgetProgress(db: Firestore, userId: string) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const [budgetSnap, txnSnap, catSnap] = await Promise.all([
    db.collection('users').doc(userId).collection('budgets').get(),
    db
      .collection('users')
      .doc(userId)
      .collection('transactions')
      .where('date', '>=', Timestamp.fromDate(monthStart))
      .where('date', '<=', Timestamp.fromDate(monthEnd))
      .get(),
    db.collection('users').doc(userId).collection('categories').get(),
  ]);

  const categories = new Map<string, { name: string; parentId: string | null }>();
  catSnap.docs.forEach((doc) => {
    const data = doc.data();
    categories.set(doc.id, { name: data.name, parentId: data.parentId });
  });

  const spending = new Map<string, number>();
  for (const doc of txnSnap.docs) {
    const data = doc.data();
    if (data.amount >= 0 || data.excludeFromTotals) continue;
    const catId = data.categoryId;
    if (!catId) continue;
    spending.set(catId, (spending.get(catId) ?? 0) + Math.abs(data.amount));
    const cat = categories.get(catId);
    if (cat?.parentId) {
      spending.set(cat.parentId, (spending.get(cat.parentId) ?? 0) + Math.abs(data.amount));
    }
  }

  return budgetSnap.docs
    .filter((doc) => doc.data().isActive !== false)
    .map((doc) => {
      const data = doc.data();
      const spent = Math.round((spending.get(data.categoryId) ?? 0) * 100) / 100;
      const limit = data.monthlyLimit;
      const pct = limit > 0 ? Math.round((spent / limit) * 1000) / 10 : 0;
      const cat = categories.get(data.categoryId);
      return {
        id: doc.id,
        name: data.name,
        categoryId: data.categoryId,
        categoryName: cat?.name ?? 'Unknown',
        monthlyLimit: limit,
        spent,
        remaining: Math.max(0, Math.round((limit - spent) * 100) / 100),
        percentage: pct,
        status:
          pct >= 100 ? 'exceeded' : pct >= (data.alertThreshold ?? 80) ? 'warning' : 'safe',
      };
    })
    .sort((a, b) => b.percentage - a.percentage);
}

async function getGoals(db: Firestore, userId: string) {
  const snapshot = await db
    .collection('users')
    .doc(userId)
    .collection('goals')
    .orderBy('name')
    .get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    const pct =
      data.targetAmount > 0
        ? Math.round(((data.currentAmount ?? 0) / data.targetAmount) * 1000) / 10
        : 0;
    return {
      id: doc.id,
      name: data.name,
      type: data.type,
      targetAmount: data.targetAmount,
      currentAmount: data.currentAmount ?? 0,
      progressPct: pct,
      status: data.status,
      startDate: data.startDate?.toDate?.()?.toISOString() ?? null,
      targetDate: data.targetDate?.toDate?.()?.toISOString() ?? null,
      notes: data.notes ?? null,
    };
  });
}

async function getHoldings(db: Firestore, userId: string) {
  const snapshot = await db
    .collection('users')
    .doc(userId)
    .collection('holdings')
    .orderBy('name')
    .get();

  const round2 = (n: number) => Math.round(n * 100) / 100;
  let assets = 0;
  let liabilities = 0;
  let liquidAssets = 0;

  const holdings = snapshot.docs.map((doc) => {
    const data = doc.data();
    const value = data.value ?? 0;
    const cost = data.cost ?? 0;
    const kind = data.kind ?? 'asset';
    if (kind === 'liability') {
      liabilities += value;
    } else {
      assets += value;
      if (data.liquidity === 'liquid') liquidAssets += value;
    }

    const history = data.history ?? [];
    const lastHistory = history.length > 0 ? history[history.length - 1] : null;
    const lastValueAt =
      data.lastValueAt?.toDate?.()?.toISOString() ??
      (typeof lastHistory?.date === 'string' ? lastHistory.date : null);

    return {
      id: doc.id,
      name: data.name,
      platform: data.platform ?? null,
      type: data.type,
      kind,
      currency: 'EUR',
      currentValue: value,
      costBasis: cost,
      units: data.units ?? null,
      liquidity: data.liquidity ?? null,
      updateSource: data.updateSource ?? 'manual',
      symbol: data.symbol ?? null,
      gain: cost > 0 ? round2(value - cost) : 0,
      returnPct: cost > 0 ? Math.round(((value - cost) / cost) * 1000) / 10 : 0,
      lastUpdated: lastValueAt,
      historyPoints: history.length,
      notes: data.notes ?? null,
    };
  });

  return {
    netWorth: {
      total: round2(assets - liabilities),
      assets: round2(assets),
      liabilities: round2(liabilities),
      liquidAssets: round2(liquidAssets),
    },
    holdings,
  };
}

async function getInsights(db: Firestore, userId: string, type?: string, limit = 10) {
  let ref = db
    .collection('users')
    .doc(userId)
    .collection('insights')
    .orderBy('generatedAt', 'desc') as FirebaseFirestore.Query;

  if (type) {
    ref = ref.where('type', '==', type);
  }

  const snapshot = await ref.limit(limit).get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      type: data.type,
      periodStart: data.periodStart?.toDate?.()?.toISOString() ?? null,
      periodEnd: data.periodEnd?.toDate?.()?.toISOString() ?? null,
      generatedAt: data.generatedAt?.toDate?.()?.toISOString() ?? null,
      summary: data.summary,
      highlights: data.highlights ?? [],
      recommendations: data.recommendations ?? [],
      anomalies: data.anomalies ?? [],
      narrative: data.narrative ?? '',
      isRead: data.isRead ?? false,
    };
  });
}

async function getAdvisorMemory(db: Firestore, userId: string) {
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
      (a: { date: { toDate?: () => Date }; advice: string; outcome?: string }) => ({
        date: a.date?.toDate?.()?.toISOString() ?? null,
        advice: a.advice,
        outcome: a.outcome,
      })
    ),
    updatedAt: data.updatedAt?.toDate?.()?.toISOString() ?? null,
  };
}

async function getRecurringExpenses(db: Firestore, userId: string) {
  const now = new Date();
  const threeMonthsAgo = subMonths(now, 3);

  const snapshot = await db
    .collection('users')
    .doc(userId)
    .collection('transactions')
    .where('date', '>=', Timestamp.fromDate(threeMonthsAgo))
    .where('date', '<=', Timestamp.fromDate(now))
    .orderBy('date', 'desc')
    .get();

  const counterpartyMap = new Map<
    string,
    { amounts: number[]; dates: string[]; descriptions: string[] }
  >();

  for (const doc of snapshot.docs) {
    const data = doc.data();
    if (data.amount >= 0) continue;
    const counterparty = data.counterparty;
    if (!counterparty) continue;

    const key = counterparty.toLowerCase();
    const existing = counterpartyMap.get(key) ?? {
      amounts: [],
      dates: [],
      descriptions: [],
    };
    existing.amounts.push(Math.abs(data.amount));
    existing.dates.push(data.date?.toDate?.()?.toISOString() ?? '');
    if (!existing.descriptions.includes(data.description)) {
      existing.descriptions.push(data.description);
    }
    counterpartyMap.set(key, existing);
  }

  const recurring: {
    counterparty: string;
    averageAmount: number;
    occurrences: number;
    frequency: string;
    isConsistentAmount: boolean;
    lastDate: string;
    descriptions: string[];
  }[] = [];

  for (const [key, data] of counterpartyMap) {
    if (data.amounts.length < 2) continue;
    const avgAmount = data.amounts.reduce((s, a) => s + a, 0) / data.amounts.length;
    const isConsistent = data.amounts.every((a) => Math.abs(a - avgAmount) / avgAmount < 0.2);
    recurring.push({
      counterparty: key,
      averageAmount: Math.round(avgAmount * 100) / 100,
      occurrences: data.amounts.length,
      frequency: data.amounts.length >= 3 ? 'monthly' : 'irregular',
      isConsistentAmount: isConsistent,
      lastDate: data.dates[0],
      descriptions: data.descriptions.slice(0, 3),
    });
  }

  return recurring.sort((a, b) => b.averageAmount - a.averageAmount);
}

// ---------------------------------------------------------------------------
// MCP tool definitions + dispatch
// ---------------------------------------------------------------------------

const READ_TOOL_DEFINITIONS = [
  {
    name: 'get_transactions',
    description:
      'Query bank transactions with filters (date range, category, counterparty, tags, amount, direction). Returns { transactions, totalCount, totalAmount }; each transaction includes categoryName and a cleaner merchantName. Tag filters search the full transaction history.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        startDate: { type: 'string', description: 'Start date (ISO, e.g. 2026-01-01)' },
        endDate: { type: 'string', description: 'End date (ISO format)' },
        categoryId: { type: 'string', description: 'Filter by category ID' },
        counterparty: {
          type: 'string',
          description: 'Filter by counterparty name (partial match)',
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Filter by one or more exact tags',
        },
        tagMatch: {
          type: 'string',
          enum: ['all', 'any'],
          description: "Match all tags (AND) or any tag (OR). Default 'all'.",
        },
        tag: { type: 'string', description: 'Deprecated — single-tag alias for `tags`' },
        minAmount: { type: 'number', description: 'Minimum absolute amount' },
        maxAmount: { type: 'number', description: 'Maximum absolute amount' },
        direction: {
          type: 'string',
          enum: ['income', 'expense', 'all'],
          description: 'Filter by direction',
        },
        limit: { type: 'number', description: 'Max results (default 50)' },
      },
    },
  },
  {
    name: 'aggregate_transactions',
    description:
      'Get spending totals and counts for a filtered set of transactions without returning the individual records. Optionally group the totals by category, tag, counterparty, or month. Accepts the same filters as get_transactions.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        startDate: { type: 'string', description: 'Start date (ISO format)' },
        endDate: { type: 'string', description: 'End date (ISO format)' },
        categoryId: { type: 'string', description: 'Filter by category ID' },
        counterparty: {
          type: 'string',
          description: 'Filter by counterparty name (partial match)',
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Filter by one or more exact tags',
        },
        tagMatch: {
          type: 'string',
          enum: ['all', 'any'],
          description: "Match all tags (AND) or any tag (OR). Default 'all'.",
        },
        tag: { type: 'string', description: 'Deprecated — single-tag alias for `tags`' },
        minAmount: { type: 'number', description: 'Minimum absolute amount' },
        maxAmount: { type: 'number', description: 'Maximum absolute amount' },
        direction: {
          type: 'string',
          enum: ['income', 'expense', 'all'],
          description: 'Filter by direction',
        },
        groupBy: {
          type: 'string',
          enum: ['category', 'tag', 'counterparty', 'month'],
          description: 'Optional grouping dimension for the breakdown',
        },
      },
    },
  },
  {
    name: 'search_transactions',
    description: 'Full-text search across transaction descriptions and counterparties',
    inputSchema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: 'Search text' },
        limit: { type: 'number', description: 'Max results (default 50)' },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_spending_summary',
    description: 'Get spending totals broken down by category for a date range',
    inputSchema: {
      type: 'object' as const,
      properties: {
        startDate: { type: 'string', description: 'Start date (ISO format)' },
        endDate: { type: 'string', description: 'End date (ISO format)' },
      },
      required: ['startDate', 'endDate'],
    },
  },
  {
    name: 'get_category_trends',
    description: 'Get month-over-month spending trends for a specific category',
    inputSchema: {
      type: 'object' as const,
      properties: {
        categoryId: { type: 'string', description: 'Category ID' },
        months: { type: 'number', description: 'Number of months to look back (default 6)' },
      },
      required: ['categoryId'],
    },
  },
  {
    name: 'get_budget_progress',
    description: 'Get current month budget progress — spending vs limits for all active budgets',
    inputSchema: { type: 'object' as const, properties: {} },
  },
  {
    name: 'get_goals',
    description: 'List all financial goals with progress percentages',
    inputSchema: { type: 'object' as const, properties: {} },
  },
  {
    name: 'get_holdings',
    description:
      'Get the wealth/net-worth overview: all holdings (assets and liabilities) with current values, plus net worth, total assets, liabilities, and liquid assets',
    inputSchema: { type: 'object' as const, properties: {} },
  },
  {
    name: 'get_insights',
    description: 'Retrieve past AI-generated financial insights',
    inputSchema: {
      type: 'object' as const,
      properties: {
        type: {
          type: 'string',
          enum: ['daily', 'weekly', 'monthly', 'yearly', 'on_demand'],
          description: 'Filter by insight type',
        },
        limit: { type: 'number', description: 'Max results (default 10)' },
      },
    },
  },
  {
    name: 'get_advisor_memory',
    description:
      "Load the AI advisor's persistent memory — financial profile, recurring expenses, goals, past advice",
    inputSchema: { type: 'object' as const, properties: {} },
  },
  {
    name: 'get_recurring_expenses',
    description: 'Detect recurring/subscription expenses based on transaction patterns',
    inputSchema: { type: 'object' as const, properties: {} },
  },
];

export const TOOL_DEFINITIONS = [...READ_TOOL_DEFINITIONS, ...WRITE_TOOL_DEFINITIONS];

function requireString(args: Record<string, unknown>, key: string): string {
  const value = args[key];
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Missing required argument: ${key}`);
  }
  return value;
}

function optionalNumber(args: Record<string, unknown>, key: string): number | undefined {
  const value = args[key];
  return typeof value === 'number' ? value : undefined;
}

function optionalString(args: Record<string, unknown>, key: string): string | undefined {
  const value = args[key];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function optionalStringArray(args: Record<string, unknown>, key: string): string[] | undefined {
  const value = args[key];
  if (!Array.isArray(value)) return undefined;
  const strings = value.filter((v): v is string => typeof v === 'string' && v.length > 0);
  return strings.length > 0 ? strings : undefined;
}

/** Parse the shared transaction filter args, folding the legacy `tag` alias. */
function parseTransactionFilter(args: Record<string, unknown>): TransactionFilter {
  const tagList = optionalStringArray(args, 'tags');
  const singleTag = optionalString(args, 'tag');
  const tags = tagList ?? (singleTag ? [singleTag] : undefined);
  const tagMatch = optionalString(args, 'tagMatch');

  return {
    startDate: optionalString(args, 'startDate'),
    endDate: optionalString(args, 'endDate'),
    categoryId: optionalString(args, 'categoryId'),
    counterparty: optionalString(args, 'counterparty'),
    tags,
    tagMatch: tagMatch === 'any' ? 'any' : tagMatch === 'all' ? 'all' : undefined,
    minAmount: optionalNumber(args, 'minAmount'),
    maxAmount: optionalNumber(args, 'maxAmount'),
    direction: optionalString(args, 'direction') as 'income' | 'expense' | 'all' | undefined,
    limit: optionalNumber(args, 'limit'),
  };
}

export async function callTool(
  db: Firestore,
  userId: string,
  name: string,
  args: Record<string, unknown>
): Promise<unknown> {
  switch (name) {
    case 'get_transactions':
      return getTransactions(db, userId, parseTransactionFilter(args));
    case 'aggregate_transactions':
      return aggregateTransactions(
        db,
        userId,
        parseTransactionFilter(args),
        optionalString(args, 'groupBy') as GroupBy | undefined
      );
    case 'search_transactions':
      return searchTransactions(
        db,
        userId,
        requireString(args, 'query'),
        optionalNumber(args, 'limit')
      );
    case 'get_spending_summary':
      return getSpendingSummary(
        db,
        userId,
        requireString(args, 'startDate'),
        requireString(args, 'endDate')
      );
    case 'get_category_trends':
      return getCategoryTrends(
        db,
        userId,
        requireString(args, 'categoryId'),
        optionalNumber(args, 'months')
      );
    case 'get_budget_progress':
      return getBudgetProgress(db, userId);
    case 'get_goals':
      return getGoals(db, userId);
    case 'get_holdings':
      return getHoldings(db, userId);
    case 'get_insights':
      return getInsights(db, userId, optionalString(args, 'type'), optionalNumber(args, 'limit'));
    case 'get_advisor_memory':
      return getAdvisorMemory(db, userId);
    case 'get_recurring_expenses':
      return getRecurringExpenses(db, userId);
    default:
      return callWriteTool(db, userId, name, args);
  }
}
