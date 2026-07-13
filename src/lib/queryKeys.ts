import type { QueryClient } from '@tanstack/react-query';

/**
 * Central TanStack Query key factory.
 *
 * Rules this module enforces:
 *  1. Every input a queryFn actually reads (uid, date range, month, filters…)
 *     appears in the key it produces, so changing an input always creates a
 *     distinct cache entry and triggers a refetch.
 *  2. Key prefixes stay compatible with the historical hand-rolled keys
 *     (`['transactions', …]`, `['dashboard', …]`, …) so partial-prefix
 *     invalidation keeps working everywhere.
 *  3. Dates are serialized to stable strings here (never raw `Date` objects)
 *     so structural key comparison is deterministic.
 *
 * Mutations that change transaction data must call {@link invalidateFinancialData}
 * instead of hand-picking prefixes — that helper is the single list of every
 * money-displaying surface.
 */

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

/** Stable, comparable serialization of a date range for use inside keys. */
export function serializeDateRange(range: DateRange): { start: string; end: string } {
  return {
    start: range.startDate.toISOString(),
    end: range.endDate.toISOString(),
  };
}

/**
 * Server-side transaction filters — the subset of `TransactionFilters` that is
 * translated into the Firestore query. Only these belong in the key; the
 * client-side filters run in `select` over the cached result.
 */
export interface TransactionServerFilters {
  startDate?: Date | undefined;
  endDate?: Date | undefined;
  categoryId?: string | null | undefined;
}

function serializeServerFilters(filters: TransactionServerFilters): {
  start: string | null;
  end: string | null;
  categoryId: string | null;
} {
  return {
    start: filters.startDate ? filters.startDate.toISOString() : null,
    end: filters.endDate ? filters.endDate.toISOString() : null,
    categoryId: filters.categoryId ?? null,
  };
}

export interface SpendingExplorerKeyParams {
  direction: string;
  monthKey: string;
  categoryId?: string | undefined;
  subcategoryId?: string | undefined;
  counterparty?: string | undefined;
  breakdownMonthKey?: string | undefined;
}

export interface IcsBreakdownKeyParams {
  statementId: string | undefined;
  monthKey: string;
  categoryId?: string | undefined;
  counterparty?: string | undefined;
  breakdownMonthKey?: string | undefined;
}

export const queryKeys = {
  transactions: {
    root: ['transactions'] as const,
    all: (uid: string) => ['transactions', uid] as const,
    /** Non-paginated list, keyed on the server filters only. */
    list: (uid: string, filters: TransactionServerFilters) =>
      ['transactions', uid, serializeServerFilters(filters)] as const,
    /** Paginated (InfiniteData) variant — distinct namespace, same filters. */
    infinite: (uid: string, filters: TransactionServerFilters) =>
      ['transactions', uid, 'infinite', serializeServerFilters(filters)] as const,
    matchingCountRoot: ['matchingTransactionsCount'] as const,
    matchingCount: (uid: string, counterparty: string | null) =>
      ['matchingTransactionsCount', uid, counterparty] as const,
  },

  dashboard: {
    root: ['dashboard'] as const,
    all: (uid: string) => ['dashboard', uid] as const,
    range: (uid: string, range: DateRange) => {
      const { start, end } = serializeDateRange(range);
      return ['dashboard', uid, start, end] as const;
    },
  },

  budgets: {
    root: ['budgets'] as const,
    all: (uid: string) => ['budgets', uid] as const,
  },

  budgetProgress: {
    root: ['budgetProgress'] as const,
    /**
     * Progress for an explicit date range, or the server-default window when
     * the caller passes none. Callers with different ranges get different
     * cache entries (fixes the shared-key bug where whichever caller mounted
     * first won).
     */
    forRange: (uid: string, range: DateRange | null) =>
      [
        'budgetProgress',
        uid,
        'current',
        range ? serializeDateRange(range) : 'default-window',
      ] as const,
    suggestions: (uid: string) => ['budgetProgress', uid, 'suggestions'] as const,
  },

  spendingExplorer: {
    root: ['spendingExplorer'] as const,
    all: (uid: string) => ['spendingExplorer', uid] as const,
    explorer: (uid: string, params: SpendingExplorerKeyParams) =>
      [
        'spendingExplorer',
        uid,
        params.direction,
        params.monthKey,
        params.categoryId,
        params.subcategoryId,
        params.counterparty,
        params.breakdownMonthKey,
      ] as const,
  },

  icsBreakdown: {
    root: ['icsBreakdown'] as const,
    explorer: (uid: string, params: IcsBreakdownKeyParams) =>
      [
        'icsBreakdown',
        uid,
        params.statementId,
        params.monthKey,
        params.categoryId,
        params.counterparty,
        params.breakdownMonthKey,
      ] as const,
  },

  icsStatements: {
    root: ['icsStatements'] as const,
    all: (uid: string) => ['icsStatements', uid] as const,
  },

  counterparty: {
    root: ['counterparty'] as const,
    all: (uid: string) => ['counterparty', uid] as const,
    /**
     * Analytics are computed relative to the selected month (current-month
     * figures + rolling 12-month window), so the month key is part of the key.
     */
    analytics: (uid: string, counterparty: string, monthKey: string) =>
      ['counterparty', uid, counterparty, 'analytics', monthKey] as const,
  },

  reimbursements: {
    root: ['reimbursements'] as const,
    summary: (uid: string, clearedLimit: number | undefined) =>
      ['reimbursements', 'all', uid, clearedLimit ?? null] as const,
    incomeForClearing: (uid: string, searchText: string) =>
      ['reimbursements', 'income-for-clearing', uid, searchText] as const,
  },

  categories: {
    root: ['categories'] as const,
    all: (uid: string) => ['categories', uid] as const,
  },

  rules: {
    root: ['rules'] as const,
    all: (uid: string) => ['rules', uid] as const,
  },

  goals: {
    root: ['goals'] as const,
    all: (uid: string) => ['goals', uid] as const,
  },

  holdings: {
    root: ['holdings'] as const,
    all: (uid: string) => ['holdings', uid] as const,
  },

  benchmarks: {
    /** Global market data — no per-user inputs in the queryFn. */
    all: ['benchmarks'] as const,
  },

  insights: {
    root: ['insights'] as const,
    all: (uid: string) => ['insights', uid] as const,
    list: (uid: string, maxCount: number) => ['insights', uid, maxCount] as const,
  },

  fixedSchedule: {
    root: ['fixedSchedule'] as const,
    all: (uid: string) => ['fixedSchedule', uid] as const,
  },

  fixedMatches: {
    root: ['fixedMatches'] as const,
    month: (uid: string, monthKey: string) => ['fixedMatches', uid, monthKey] as const,
  },

  bankConnections: {
    root: ['bankConnections'] as const,
    all: (uid: string) => ['bankConnections', uid] as const,
  },

  availableBanks: {
    forCountry: (country: string) => ['availableBanks', country] as const,
  },

  sharing: {
    state: (uid: string) => ['sharing', uid] as const,
  },

  userPreferences: {
    forUser: (uid: string) => ['userPreferences', uid] as const,
  },

  advisorMemory: {
    all: (uid: string) => ['advisorMemory', uid] as const,
    meta: (uid: string) => ['advisorMemory', uid, 'meta'] as const,
  },
};

/**
 * Every query-key prefix whose data is derived from transaction documents,
 * i.e. every money-displaying surface. Kept as a single list so a new
 * spend-derived query only needs to be added here once.
 */
const FINANCIAL_DATA_PREFIXES: readonly (readonly string[])[] = [
  queryKeys.transactions.root,
  queryKeys.transactions.matchingCountRoot,
  queryKeys.dashboard.root,
  queryKeys.budgets.root,
  queryKeys.budgetProgress.root,
  queryKeys.spendingExplorer.root,
  queryKeys.icsBreakdown.root,
  queryKeys.counterparty.root,
  queryKeys.reimbursements.root,
];

/**
 * Invalidate every query that displays money derived from transactions.
 *
 * Call this from the settled/success callback of ANY mutation that creates,
 * updates, deletes, recategorizes, splits, or (un)marks reimbursement on
 * transactions. Invalidation (rather than in-place cache patching) also
 * guarantees that a transaction moved out of a server-filtered list (e.g. a
 * category change while a category filter is active) disappears from that
 * list on refetch instead of lingering.
 */
export function invalidateFinancialData(queryClient: QueryClient): void {
  for (const queryKey of FINANCIAL_DATA_PREFIXES) {
    void queryClient.invalidateQueries({ queryKey });
  }
}
