import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { TransactionFilters } from '@/components/transactions/TransactionFilters';
import { TransactionList } from '@/components/transactions/TransactionList';
import { groupByMonthThenDay } from '@/components/transactions/groupTransactions';
import { MonthSummaryStickyBar } from '@/components/transactions/MonthSummaryStickyBar';
import { TransactionForm } from '@/components/transactions/TransactionForm';
import { useCategories } from '@/hooks/useCategories';
import {
  useTransactions,
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
  'direction',
  'categorizationStatus',
  'reimbursementStatus',
] as const;

/**
 * Phase 5 Transactions page.
 *
 * Layout per v8 mock + README §03:
 *   [TopBar]
 *   [sticky filter pill row]
 *   [sticky month summary bar]
 *   [day-grouped TransactionList]
 *
 * Row-tap opens the (still-current) TransactionForm dialog via ?id=…
 * deep-link. Phase 6 swaps the dialog for a bottom sheet and folds in the
 * reimbursement / merchant-rule / delete actions that used to live as
 * separate dialogs on this page.
 */
export function Transactions() {
  const { selectedMonth, dateRange: monthDateRange } = useMonth();
  const [searchParams, setSearchParams] = useSearchParams();

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
      startDate: monthDateRange.startDate,
      endDate: monthDateRange.endDate,
      ...(categoryId && { categoryId }),
      ...(searchText && { searchText }),
      ...(direction && { direction }),
      ...(categorizationStatus && { categorizationStatus }),
      ...(reimbursementStatus && { reimbursementStatus }),
    };
  }, [searchParams, monthDateRange]);

  const handleFiltersChange = useCallback(
    (newFilters: Filters) => {
      const filterParams: Record<string, string> = {};
      if (newFilters.categoryId) filterParams.category = newFilters.categoryId;
      if (newFilters.searchText) filterParams.search = newFilters.searchText;
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
  const { data: transactions = [], isLoading, error } = useTransactions(filters);

  const createMutation = useCreateTransaction();
  const updateMutation = useUpdateTransaction();

  const editingTransaction = useMemo(
    () => (editId ? transactions.find((t) => t.id === editId) ?? null : null),
    [editId, transactions]
  );

  const months = useMemo(() => groupByMonthThenDay(transactions), [transactions]);

  // IntersectionObserver — track which month section is currently topmost so
  // the sticky bar swaps `MAR / APR` etc. as the user scrolls past boundaries.
  const [currentMonthKey, setCurrentMonthKey] = useState<string | null>(null);
  const monthRefs = useRef(new Map<string, HTMLElement>());
  const monthVisibility = useRef(new Map<string, number>());
  const observerRef = useRef<IntersectionObserver | null>(null);

  const recomputeCurrentMonth = useCallback(() => {
    let bestKey: string | null = null;
    let bestY = Infinity;
    for (const [key, el] of monthRefs.current.entries()) {
      const ratio = monthVisibility.current.get(key) ?? 0;
      if (ratio <= 0) continue;
      const top = el.getBoundingClientRect().top;
      if (top < bestY) {
        bestKey = key;
        bestY = top;
      }
    }
    if (bestKey) setCurrentMonthKey(bestKey);
  }, []);

  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const key = (entry.target as HTMLElement).dataset.month;
          if (!key) continue;
          monthVisibility.current.set(key, entry.intersectionRatio);
        }
        recomputeCurrentMonth();
      },
      // top margin matches the sticky bar's offset (44px TopBar + ~46px pills)
      { rootMargin: '-90px 0px 0px 0px', threshold: [0, 0.01, 0.5, 1] }
    );
    observerRef.current = observer;
    for (const el of monthRefs.current.values()) observer.observe(el);
    return () => {
      observer.disconnect();
    };
  }, [months, recomputeCurrentMonth]);

  const registerMonthSection = useCallback((key: string, el: HTMLElement | null) => {
    const map = monthRefs.current;
    const prev = map.get(key);
    if (prev && observerRef.current) observerRef.current.unobserve(prev);
    if (el) {
      map.set(key, el);
      observerRef.current?.observe(el);
    } else {
      map.delete(key);
      monthVisibility.current.delete(key);
    }
  }, []);

  const stickyMonthKey = currentMonthKey ?? format(selectedMonth, 'yyyy-MM');
  const stickyMonth = months.find((m) => m.key === stickyMonthKey) ?? months[0] ?? null;

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
      />

      {stickyMonth && (
        <MonthSummaryStickyBar
          monthLabel={stickyMonth.label}
          netTotal={stickyMonth.netTotal}
          count={stickyMonth.count}
        />
      )}

      {isLoading ? (
        <div className="px-4 py-12 text-center font-mono text-[11px] uppercase tracking-[0.08em] text-textLo">
          Loading transactions…
        </div>
      ) : (
        <TransactionList
          months={months}
          categories={categories}
          onRowTap={openEdit}
          registerMonthSection={registerMonthSection}
        />
      )}

      <TransactionForm
        open={!!editingTransaction}
        onOpenChange={(open) => {
          if (!open) closeEdit();
        }}
        transaction={editingTransaction}
        categories={categories}
        onSubmit={handleFormSubmit}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  );
}
