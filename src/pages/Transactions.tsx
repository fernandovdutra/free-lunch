import { useCallback, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { monthRangeSpanning } from '@/lib/monthRange';
import { TransactionFilters } from '@/components/transactions/TransactionFilters';
import { TransactionList } from '@/components/transactions/TransactionList';
import { groupByMonthThenDay } from '@/components/transactions/groupTransactions';
import { TransactionForm } from '@/components/transactions/TransactionForm';
import { useCategories } from '@/hooks/useCategories';
import {
  useInfiniteTransactions,
  useCreateTransaction,
  useUpdateTransaction,
  type TransactionFilters as Filters,
} from '@/hooks/useTransactions';
import { useMonth } from '@/contexts/MonthContext';
import type { TransactionFormData } from '@/types';

const FILTERS_STORAGE_KEY = 'transactions-filters';
const FILTER_KEYS = [
  'category',
  'search',
  'tag',
  'direction',
  'categorizationStatus',
  'reimbursementStatus',
] as const;

/**
 * How many months of data to render at once. The page anchors at the
 * MonthContext-selected month and pulls this many months going backward
 * (e.g. selectedMonth=APR 2026 → fetch Nov 2025 through Apr 2026). Each
 * month section gets its own `position: sticky` header that pins below
 * the filter pills as you scroll, then is pushed up by the next month's
 * header — same pattern as iOS Contacts.
 */
const TRANSACTIONS_MONTHS_WINDOW = 6;

/**
 * Phase 5 Transactions page.
 *
 * Layout per v8 mock + README §03:
 *   [TopBar]
 *   [sticky filter pill row]
 *   [day-grouped TransactionList — each month has its own sticky header row]
 *
 * Row-tap opens the Phase 6 Edit Sheet via `?id=…` deep-link.
 */
export function Transactions() {
  const { selectedMonth } = useMonth();
  const [searchParams, setSearchParams] = useSearchParams();

  // 6-month window ending at the selected month — drives the multi-month
  // scroll. selectedMonth still feeds the filter bar's anchor pill.
  // Amsterdam month boundaries via the canonical helper (not local
  // startOfMonth/endOfMonth), so the Firestore range matches the backend's
  // month bucketing.
  const dateRange = useMemo(
    () => monthRangeSpanning(selectedMonth, TRANSACTIONS_MONTHS_WINDOW - 1),
    [selectedMonth]
  );

  // Restore filter state from sessionStorage when URL has none
  useEffect(() => {
    const hasUrlFilters = Array.from(searchParams.keys()).some((key) =>
      (FILTER_KEYS as readonly string[]).includes(key)
    );
    if (!hasUrlFilters) {
      try {
        const stored = sessionStorage.getItem(FILTERS_STORAGE_KEY);
        if (stored) {
          const saved = JSON.parse(stored) as Record<string, string>;
          if (Object.keys(saved).length > 0) {
            setSearchParams(
              (prev) => {
                const next = new URLSearchParams(prev);
                for (const [k, v] of Object.entries(saved)) next.set(k, v);
                return next;
              },
              { replace: true }
            );
          }
        }
      } catch {
        // ignore parse errors
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filters: Filters = useMemo(() => {
    const categoryId = searchParams.get('category');
    const searchText = searchParams.get('search');
    const tag = searchParams.get('tag');
    const direction = searchParams.get('direction') as 'income' | 'expense' | undefined;
    const categorizationStatus = searchParams.get('categorizationStatus') as
      | 'auto'
      | 'manual'
      | 'uncategorized'
      | undefined;
    const reimbursementStatus = searchParams.get('reimbursementStatus') as
      | 'none'
      | 'pending'
      | 'cleared'
      | undefined;

    return {
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
      ...(categoryId && { categoryId }),
      ...(searchText && { searchText }),
      ...(tag && { tag }),
      ...(direction && { direction }),
      ...(categorizationStatus && { categorizationStatus }),
      ...(reimbursementStatus && { reimbursementStatus }),
    };
  }, [searchParams, dateRange]);

  const handleFiltersChange = useCallback(
    (newFilters: Filters) => {
      const filterParams: Record<string, string> = {};
      if (newFilters.categoryId) filterParams.category = newFilters.categoryId;
      if (newFilters.searchText) filterParams.search = newFilters.searchText;
      if (newFilters.tag) filterParams.tag = newFilters.tag;
      if (newFilters.direction) filterParams.direction = newFilters.direction;
      if (newFilters.categorizationStatus)
        filterParams.categorizationStatus = newFilters.categorizationStatus;
      if (newFilters.reimbursementStatus)
        filterParams.reimbursementStatus = newFilters.reimbursementStatus;

      sessionStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(filterParams));

      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const k of FILTER_KEYS) next.delete(k);
          for (const [k, v] of Object.entries(filterParams)) next.set(k, v);
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  // Edit-sheet deep link via ?id=<txn>
  const editId = searchParams.get('id');
  const openEdit = useCallback(
    (id: string) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set('id', id);
          return next;
        },
        { replace: false }
      );
    },
    [setSearchParams]
  );
  const closeEdit = useCallback(() => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete('id');
        return next;
      },
      { replace: true }
    );
  }, [setSearchParams]);

  const { data: categories = [] } = useCategories();
  const {
    transactions,
    availableTags,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteTransactions(filters);

  // Load the next page when the list nears its end (infinite scroll). Guarded so
  // it's a no-op while a fetch is in flight or when no more pages remain.
  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Client-side filters (search, amount, direction, status) only see already-
  // loaded pages, so while one is active keep pulling pages until the window is
  // exhausted — otherwise a match in an unloaded page would be missed.
  const hasActiveClientFilters = Boolean(
    filters.searchText ||
      filters.tag ||
      filters.minAmount != null ||
      filters.maxAmount != null ||
      (filters.direction && filters.direction !== 'all') ||
      (filters.reimbursementStatus && filters.reimbursementStatus !== 'all') ||
      (filters.categorizationStatus && filters.categorizationStatus !== 'all')
  );
  useEffect(() => {
    if (hasActiveClientFilters && hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [hasActiveClientFilters, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const createMutation = useCreateTransaction();
  const updateMutation = useUpdateTransaction();

  const editingTransaction = useMemo(
    () => (editId ? transactions.find((t) => t.id === editId) ?? null : null),
    [editId, transactions]
  );

  const months = useMemo(() => groupByMonthThenDay(transactions), [transactions]);

  const handleFormSubmit = async (data: TransactionFormData) => {
    if (editingTransaction) {
      await updateMutation.mutateAsync({ id: editingTransaction.id, data });
    } else {
      await createMutation.mutateAsync(data);
    }
  };

  if (error) {
    return (
      <div className="px-4 py-12 text-center font-mono text-[11px] uppercase tracking-[0.08em] text-warn">
        Failed to load transactions. Pull to refresh or try again.
      </div>
    );
  }

  return (
    <div className="-mx-4">
      <TransactionFilters
        filters={filters}
        onChange={handleFiltersChange}
        categories={categories}
        selectedMonth={selectedMonth}
        availableTags={availableTags}
      />

      {isLoading ? (
        <div className="px-4 py-12 text-center font-mono text-[11px] uppercase tracking-[0.08em] text-textLo">
          Loading transactions…
        </div>
      ) : (
        <TransactionList
          months={months}
          categories={categories}
          onRowTap={openEdit}
          onEndReached={handleEndReached}
          isFetchingMore={isFetchingNextPage}
        />
      )}

      <TransactionForm
        open={!!editingTransaction}
        onOpenChange={(open) => {
          if (!open) closeEdit();
        }}
        transaction={editingTransaction}
        categories={categories}
        existingTags={availableTags}
        onSubmit={handleFormSubmit}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  );
}
