import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { endOfMonth, format, startOfMonth, subMonths } from 'date-fns';
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
 * How many months of data to render at once. The page anchors at the
 * MonthContext-selected month and pulls this many months going backward
 * (e.g. selectedMonth=APR 2026 → fetch Nov 2025 through Apr 2026). Lets
 * the IntersectionObserver-driven MonthSummaryStickyBar swap labels as
 * the user scrolls past month boundaries.
 */
const TRANSACTIONS_MONTHS_WINDOW = 6;

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
  const { selectedMonth } = useMonth();
  const [searchParams, setSearchParams] = useSearchParams();

  // 6-month window ending at the selected month — drives the multi-month
  // scroll + sticky-bar swap. selectedMonth still feeds the filter bar's
  // anchor pill (`▸ APR 2026`) so the user knows which month they "picked".
  const dateRange = useMemo(
    () => ({
      startDate: startOfMonth(subMonths(selectedMonth, TRANSACTIONS_MONTHS_WINDOW - 1)),
      endDate: endOfMonth(selectedMonth),
    }),
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

  // Sticky-bar month tracker — swaps `APR / MAR / FEB …` as the user scrolls
  // past month-section boundaries.
  //
  // Originally tried IntersectionObserver but hit reliability gaps when sections
  // are very tall (single ratio threshold sweeps don't always fire on slow
  // scrolls). A throttled scroll listener with direct bounding-rect reads is
  // simpler and exercises the same logic on every frame the user is scrolling.
  const STICKY_OFFSET = 90; // 44 TopBar + 46 pill row (matches MonthSummaryStickyBar's top:90)
  const [currentMonthKey, setCurrentMonthKey] = useState<string | null>(null);
  const monthRefs = useRef(new Map<string, HTMLElement>());

  const recomputeCurrentMonth = useCallback(() => {
    // The "active" month is the topmost section whose bottom is still below
    // the sticky bar (i.e. some content is still visible under the bar) AND
    // whose top is above the viewport bottom (i.e. it hasn't fully scrolled
    // up off-screen yet from above). When the user scrolls past a section
    // completely, its bottom drops above the sticky bar — at that moment the
    // next section takes over.
    let bestKey: string | null = null;
    let bestTop = Infinity;
    for (const [key, el] of monthRefs.current.entries()) {
      const r = el.getBoundingClientRect();
      const intersecting = r.bottom > STICKY_OFFSET && r.top < window.innerHeight;
      if (!intersecting) continue;
      if (r.top < bestTop) {
        bestKey = key;
        bestTop = r.top;
      }
    }
    if (bestKey) {
      setCurrentMonthKey((prev) => (prev === bestKey ? prev : bestKey));
    }
  }, []);

  // Single long-lived observer; ref callbacks observe/unobserve sections as
  // they mount and unmount. Avoids races where useEffect tries to observe a
  // map of refs that hasn't been populated yet.
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      () => {
        recomputeCurrentMonth();
      },
      { rootMargin: `-${STICKY_OFFSET}px 0px 0px 0px`, threshold: [0, 0.01, 0.5, 1] }
    );
    observerRef.current = observer;
    // Observe whatever's already mounted (e.g. on hot reload)
    for (const el of monthRefs.current.values()) observer.observe(el);

    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        recomputeCurrentMonth();
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });

    // Initial pass once layout settles
    recomputeCurrentMonth();

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      observer.disconnect();
      observerRef.current = null;
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [recomputeCurrentMonth]);

  const registerMonthSection = useCallback(
    (key: string, el: HTMLElement | null) => {
      const map = monthRefs.current;
      const existing = map.get(key);
      if (existing && observerRef.current) observerRef.current.unobserve(existing);
      if (el) {
        map.set(key, el);
        observerRef.current?.observe(el);
        // Recompute now — IO callback won't fire until threshold crossings, and
        // we want the bar accurate as soon as the first section mounts.
        recomputeCurrentMonth();
      } else {
        map.delete(key);
      }
    },
    [recomputeCurrentMonth]
  );

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
