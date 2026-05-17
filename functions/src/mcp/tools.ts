import { Timestamp, type Firestore } from 'firebase-admin/firestore';
import { subMonths } from 'date-fns';
import { WRITE_TOOL_DEFINITIONS, callWriteTool } from './writeTools.js';

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
  tag?: string;
  minAmount?: number;
  maxAmount?: number;
  direction?: 'income' | 'expense' | 'all';
  limit?: number;
}

async function getTransactions(db: Firestore, userId: string, filter: TransactionFilter) {
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
  if (filter.categoryId) {
    ref = ref.where('categoryId', '==', filter.categoryId);
  }

  const snapshot = await ref.limit(filter.limit ?? 50).get();

  let results = snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      date: data.date?.toDate?.()?.toISOString() ?? '',
      description: data.description,
      amount: data.amount,
      counterparty: data.counterparty ?? null,
      categoryId: data.categoryId ?? null,
      categorySource: data.categorySource ?? 'none',
      isSplit: data.isSplit ?? false,
      tags: Array.isArray(data.tags) ? (data.tags as string[]) : [],
    };
  });

  if (filter.counterparty) {
    const search = filter.counterparty.toLowerCase();
    results = results.filter((t) => t.counterparty?.toLowerCase().includes(search));
  }
  if (filter.tag) {
    results = results.filter((t) => t.tags.includes(filter.tag!));
  }
  if (filter.direction === 'income') {
    results = results.filter((t) => t.amount > 0);
  } else if (filter.direction === 'expense') {
    results = results.filter((t) => t.amount < 0);
  }
  if (filter.minAmount != null) {
    results = results.filter((t) => Math.abs(t.amount) >= filter.minAmount!);
  }
  if (filter.maxAmount != null) {
    results = results.filter((t) => Math.abs(t.amount) <= filter.maxAmount!);
  }

  return results;
}

async function searchTransactions(db: Firestore, userId: string, searchText: string, limit = 50) {
  // Firestore has no full-text search — fetch recent transactions and filter locally.
  const snapshot = await db
    .collection('users')
    .doc(userId)
    .collection('transactions')
    .orderBy('date', 'desc')
    .limit(500)
    .get();

  const search = searchText.toLowerCase();
  return snapshot.docs
    .map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        date: data.date?.toDate?.()?.toISOString() ?? '',
        description: data.description,
        amount: data.amount,
        counterparty: data.counterparty ?? null,
        categoryId: data.categoryId ?? null,
        tags: Array.isArray(data.tags) ? (data.tags as string[]) : [],
      };
    })
    .filter(
      (t) =>
        t.description?.toLowerCase().includes(search) ||
        t.counterparty?.toLowerCase().includes(search)
    )
    .slice(0, limit);
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

async function getInvestments(db: Firestore, userId: string) {
  const snapshot = await db
    .collection('users')
    .doc(userId)
    .collection('investments')
    .orderBy('name')
    .get();

  let totalValue = 0;
  let totalCost = 0;

  const investments = snapshot.docs.map((doc) => {
    const data = doc.data();
    const entries = data.entries ?? [];
    const latest = entries.length > 0 ? entries[entries.length - 1] : null;
    const marketValue = latest?.marketValue ?? 0;
    const costBasis = latest?.costBasis ?? 0;
    totalValue += marketValue;
    totalCost += costBasis;

    return {
      id: doc.id,
      name: data.name,
      platform: data.platform,
      type: data.type,
      currency: data.currency ?? 'EUR',
      currentValue: marketValue,
      costBasis,
      gain: Math.round((marketValue - costBasis) * 100) / 100,
      returnPct:
        costBasis > 0 ? Math.round(((marketValue - costBasis) / costBasis) * 1000) / 10 : 0,
      lastUpdated: latest?.date?.toDate?.()?.toISOString() ?? null,
      entryCount: entries.length,
      notes: data.notes ?? null,
    };
  });

  return {
    portfolio: {
      totalValue: Math.round(totalValue * 100) / 100,
      totalCostBasis: Math.round(totalCost * 100) / 100,
      totalGain: Math.round((totalValue - totalCost) * 100) / 100,
      totalReturnPct:
        totalCost > 0 ? Math.round(((totalValue - totalCost) / totalCost) * 1000) / 10 : 0,
    },
    investments,
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
      'Query bank transactions with filters (date range, category, counterparty, tag, amount, direction)',
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
        tag: { type: 'string', description: 'Filter by an exact tag' },
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
    name: 'get_investments',
    description: 'Get investment portfolio overview with current values, gains, and returns',
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

export async function callTool(
  db: Firestore,
  userId: string,
  name: string,
  args: Record<string, unknown>
): Promise<unknown> {
  switch (name) {
    case 'get_transactions':
      return getTransactions(db, userId, {
        startDate: optionalString(args, 'startDate'),
        endDate: optionalString(args, 'endDate'),
        categoryId: optionalString(args, 'categoryId'),
        counterparty: optionalString(args, 'counterparty'),
        tag: optionalString(args, 'tag'),
        minAmount: optionalNumber(args, 'minAmount'),
        maxAmount: optionalNumber(args, 'maxAmount'),
        direction: optionalString(args, 'direction') as
          | 'income'
          | 'expense'
          | 'all'
          | undefined,
        limit: optionalNumber(args, 'limit'),
      });
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
    case 'get_investments':
      return getInvestments(db, userId);
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
