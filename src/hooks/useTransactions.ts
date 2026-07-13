import { useMemo } from 'react';
import { useQuery, useInfiniteQuery, type InfiniteData } from '@tanstack/react-query';
import {
  collection,
  query,
  orderBy,
  getDocs,
  limit,
  startAfter,
  Timestamp,
  where,
  type QueryConstraint,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { timed } from '@/lib/perf';
import { queryKeys, type TransactionServerFilters } from '@/lib/queryKeys';
import type { Transaction, TransactionSplit, ReimbursementInfo } from '@/types';

// Re-export mutations from dedicated file for backward compatibility
export {
  useCreateTransaction,
  useUpdateTransaction,
  useUpdateTransactionCategory,
  useDeleteTransaction,
  useBulkUpdateCategory,
  useAICategorizeTransaction,
} from './useTransactionMutations';

// Firestore document shape
interface TransactionDocument {
  externalId?: string | null;
  date: Timestamp | string;
  bookingDate?: Timestamp | string | null;
  transactionDate?: Timestamp | string | null;
  description: string;
  bankDescription?: string | null;
  amount: number;
  currency?: 'EUR';
  counterparty?: string | null;
  categoryId?: string | null;
  categoryConfidence?: number;
  categorySource?: 'auto' | 'manual' | 'rule' | 'merchant' | 'learned' | 'none';
  isSplit?: boolean;
  splits?: TransactionSplit[] | null;
  reimbursement?: ReimbursementInfo | null;
  note?: string | null;
  bankAccountId?: string | null;
  excludeFromTotals?: boolean;
  icsStatementId?: string | null;
  source?: 'bank_sync' | 'ics_import' | 'manual';
  importedAt?: Timestamp | string;
  updatedAt?: Timestamp | string;
}

// Special value to filter for uncategorized transactions
export const UNCATEGORIZED_FILTER = '__uncategorized__';

// Filter interface
export interface TransactionFilters {
  startDate?: Date;
  endDate?: Date;
  categoryId?: string | null;
  searchText?: string;
  minAmount?: number;
  maxAmount?: number;
  // New filter fields
  direction?: 'income' | 'expense' | 'all';
  reimbursementStatus?: 'none' | 'pending' | 'cleared' | 'all';
  categorizationStatus?: 'auto' | 'manual' | 'uncategorized' | 'all';
}

// Upper bound on docs fetched per query. The 6-month window plus the
// persistent cache + list virtualization make this comfortable headroom;
// a follow-up can swap to cursor-based infinite scroll if a user ever
// exceeds it. Kept here so the query and any tooling share one source.
export const TRANSACTIONS_QUERY_LIMIT = 500;

// Server-side filters: these are translated into the Firestore query, so
// they (and only they) belong in the query key — changing them requires a
// new network read. Values are explicitly `| undefined` so the pick helpers
// can assign them under `exactOptionalPropertyTypes`.
type ServerFilters = TransactionServerFilters;

// Client-side filters: applied in-memory via `select`, so changing them
// re-derives from the cached dataset without touching the network.
interface ClientFilters {
  searchText?: string | undefined;
  minAmount?: number | undefined;
  maxAmount?: number | undefined;
  direction?: 'income' | 'expense' | 'all' | undefined;
  reimbursementStatus?: 'none' | 'pending' | 'cleared' | 'all' | undefined;
  categorizationStatus?: 'auto' | 'manual' | 'uncategorized' | 'all' | undefined;
}

function pickServerFilters(filters: TransactionFilters): ServerFilters {
  return {
    startDate: filters.startDate,
    endDate: filters.endDate,
    categoryId: filters.categoryId,
  };
}

// Query keys with filters — thin wrappers over the central factory
// (src/lib/queryKeys.ts) that pick out the server-side filters first.
export const transactionKeys = {
  all: (userId: string) => queryKeys.transactions.all(userId),
  // Keyed only on the server filters so client-side filter changes reuse the
  // cached result instead of refetching.
  filtered: (userId: string, filters: TransactionFilters) =>
    queryKeys.transactions.list(userId, pickServerFilters(filters)),
  // Paginated (infinite) variant used by the Transactions page. Distinct shape
  // (InfiniteData) so it needs its own key namespace; still keyed only on the
  // server filters.
  infinite: (userId: string, filters: TransactionFilters) =>
    queryKeys.transactions.infinite(userId, pickServerFilters(filters)),
};

/**
 * Apply the client-side-only filters (search, amount range, direction,
 * reimbursement / categorization status) to an already-fetched list. Pure so
 * it can run inside TanStack Query's `select` (no network) and be unit-tested
 * directly. Firestore can't express full-text search, and the rest avoid extra
 * composite indexes, so they live here.
 */
export function applyClientFilters(
  transactions: Transaction[],
  filters: ClientFilters
): Transaction[] {
  let result = transactions;

  if (filters.searchText) {
    const search = filters.searchText.toLowerCase();
    result = result.filter(
      (t) =>
        t.description.toLowerCase().includes(search) ||
        t.counterparty?.toLowerCase().includes(search) ||
        t.bankDescription?.toLowerCase().includes(search)
    );
  }

  if (filters.minAmount !== undefined) {
    result = result.filter((t) => Math.abs(t.amount) >= filters.minAmount!);
  }
  if (filters.maxAmount !== undefined) {
    result = result.filter((t) => Math.abs(t.amount) <= filters.maxAmount!);
  }

  if (filters.direction && filters.direction !== 'all') {
    result = result.filter((t) =>
      filters.direction === 'income' ? t.amount > 0 : t.amount < 0
    );
  }

  if (filters.reimbursementStatus && filters.reimbursementStatus !== 'all') {
    result = result.filter((t) => {
      switch (filters.reimbursementStatus) {
        case 'none':
          return !t.reimbursement;
        case 'pending':
          return t.reimbursement?.status === 'pending';
        case 'cleared':
          return t.reimbursement?.status === 'cleared';
        default:
          return true;
      }
    });
  }

  if (filters.categorizationStatus && filters.categorizationStatus !== 'all') {
    result = result.filter((t) => {
      switch (filters.categorizationStatus) {
        case 'manual':
          return t.categorySource === 'manual';
        case 'auto':
          return t.categorySource !== 'manual' && t.categorySource !== 'none' && t.categoryId;
        case 'uncategorized':
          return !t.categoryId || t.categorySource === 'none';
        default:
          return true;
      }
    });
  }

  return result;
}

// Helper to convert Firestore timestamp to Date
function toDate(value: Timestamp | string | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Timestamp) return value.toDate();
  return new Date(value);
}

// Transform Firestore data to Transaction type
function transformTransaction(docSnap: QueryDocumentSnapshot): Transaction {
  const data = docSnap.data() as TransactionDocument;
  return {
    id: docSnap.id,
    externalId: data.externalId ?? null,
    date: data.date instanceof Timestamp ? data.date.toDate() : new Date(data.date),
    bookingDate: toDate(data.bookingDate),
    transactionDate: toDate(data.transactionDate),
    description: typeof data.description === 'string' ? data.description : 'Bank transaction',
    bankDescription: data.bankDescription ?? null,
    amount: data.amount,
    currency: data.currency ?? 'EUR',
    counterparty: data.counterparty ?? null,
    categoryId: data.categoryId ?? null,
    categoryConfidence: data.categoryConfidence ?? 0,
    categorySource: data.categorySource ?? 'manual',
    isSplit: data.isSplit ?? false,
    splits: data.splits ?? null,
    reimbursement: data.reimbursement
      ? {
          ...data.reimbursement,
          clearedAt: data.reimbursement.clearedAt
            ? data.reimbursement.clearedAt instanceof Timestamp
              ? data.reimbursement.clearedAt.toDate()
              : new Date(data.reimbursement.clearedAt as unknown as string)
            : null,
        }
      : null,
    note: data.note ?? null,
    excludeFromTotals: data.excludeFromTotals ?? undefined,
    icsStatementId: data.icsStatementId ?? undefined,
    source: data.source ?? undefined,
    bankAccountId: data.bankAccountId ?? null,
    importedAt:
      data.importedAt instanceof Timestamp
        ? data.importedAt.toDate()
        : new Date(data.importedAt ?? Date.now()),
    updatedAt:
      data.updatedAt instanceof Timestamp
        ? data.updatedAt.toDate()
        : new Date(data.updatedAt ?? Date.now()),
  };
}

export function useTransactions(filters: TransactionFilters = {}) {
  const { dataOwnerId } = useAuth();

  const { startDate, endDate, categoryId } = filters;

  // A stable `select` per client-filter set: re-runs on the cached dataset
  // (no network) whenever a client-side filter changes, while a referentially
  // stable function keeps TanStack Query from recomputing needlessly.
  const select = useMemo(() => {
    const clientFilters: ClientFilters = {
      searchText: filters.searchText,
      minAmount: filters.minAmount,
      maxAmount: filters.maxAmount,
      direction: filters.direction,
      reimbursementStatus: filters.reimbursementStatus,
      categorizationStatus: filters.categorizationStatus,
    };
    return (transactions: Transaction[]) => applyClientFilters(transactions, clientFilters);
  }, [
    filters.searchText,
    filters.minAmount,
    filters.maxAmount,
    filters.direction,
    filters.reimbursementStatus,
    filters.categorizationStatus,
  ]);

  return useQuery({
    // Keyed only on server filters (see transactionKeys.filtered) so changing
    // a client-side filter reuses this cached result instead of refetching.
    queryKey: transactionKeys.filtered(dataOwnerId ?? '', filters),
    queryFn: async () => {
      if (!dataOwnerId) return [];

      const transactionsRef = collection(db, 'users', dataOwnerId, 'transactions');

      // Build query with filters - equality filters before range filters for Firestore
      const constraints = [];

      // Add categoryId equality filter first (if provided)
      if (categoryId) {
        if (categoryId === UNCATEGORIZED_FILTER) {
          // Filter for transactions with no category
          constraints.push(where('categoryId', '==', null));
        } else {
          constraints.push(where('categoryId', '==', categoryId));
        }
      }

      // Add date range filters
      if (startDate) {
        constraints.push(where('date', '>=', Timestamp.fromDate(startDate)));
      }
      if (endDate) {
        constraints.push(where('date', '<=', Timestamp.fromDate(endDate)));
      }

      // Order by date desc, bounded so the worst case stays cheap
      constraints.push(orderBy('date', 'desc'));
      constraints.push(limit(TRANSACTIONS_QUERY_LIMIT));

      const q = query(transactionsRef, ...constraints);

      const snapshot = await getDocs(q);
      return snapshot.docs.map(transformTransaction);
    },
    // Client-side filters run here against the cached server result.
    select,
    enabled: !!dataOwnerId,
    staleTime: 1000 * 60 * 5, // 5 min — explicit; matches the global default
  });
}

// How many transactions to fetch per page. Small enough that the first page
// paints quickly on a cold open, large enough to fill the viewport.
export const TRANSACTIONS_PAGE_SIZE = 50;

interface TransactionPage {
  transactions: Transaction[];
  /** Cursor for the next page (last doc of this page), or null when empty. */
  lastDoc: QueryDocumentSnapshot | null;
  /** True when this page was full, i.e. more may exist. */
  hasMore: boolean;
}

/**
 * Paginated transactions for the Transactions page. Fetches `TRANSACTIONS_PAGE_SIZE`
 * rows at a time (date desc) via Firestore cursors (`startAfter`), so the first
 * paint only waits on one small page instead of the whole window. Subsequent
 * pages load on scroll via `fetchNextPage`.
 *
 * Mirrors `useTransactions`' filter split: the query key depends only on the
 * server filters (date range, category); the client-side filters run in `select`
 * over the flattened pages, so changing them never refetches. Because those
 * filters only see already-loaded pages, the caller should keep fetching pages
 * while a client filter is active (the Transactions page does this).
 *
 * Kept separate from `useTransactions` so the non-paginated callers
 * (Home, Settings export/counts) that need the full set are unaffected.
 */
export function useInfiniteTransactions(filters: TransactionFilters = {}) {
  const { dataOwnerId } = useAuth();
  const { startDate, endDate, categoryId } = filters;

  const select = useMemo(() => {
    const clientFilters: ClientFilters = {
      searchText: filters.searchText,
      minAmount: filters.minAmount,
      maxAmount: filters.maxAmount,
      direction: filters.direction,
      reimbursementStatus: filters.reimbursementStatus,
      categorizationStatus: filters.categorizationStatus,
    };
    return (data: InfiniteData<TransactionPage>) =>
      applyClientFilters(
        data.pages.flatMap((page) => page.transactions),
        clientFilters
      );
  }, [
    filters.searchText,
    filters.minAmount,
    filters.maxAmount,
    filters.direction,
    filters.reimbursementStatus,
    filters.categorizationStatus,
  ]);

  const result = useInfiniteQuery({
    queryKey: transactionKeys.infinite(dataOwnerId ?? '', filters),
    queryFn: async ({ pageParam }): Promise<TransactionPage> => {
      if (!dataOwnerId) return { transactions: [], lastDoc: null, hasMore: false };

      const transactionsRef = collection(db, 'users', dataOwnerId, 'transactions');
      const constraints: QueryConstraint[] = [];

      if (categoryId) {
        constraints.push(
          where('categoryId', '==', categoryId === UNCATEGORIZED_FILTER ? null : categoryId)
        );
      }
      if (startDate) {
        constraints.push(where('date', '>=', Timestamp.fromDate(startDate)));
      }
      if (endDate) {
        constraints.push(where('date', '<=', Timestamp.fromDate(endDate)));
      }
      constraints.push(orderBy('date', 'desc'));
      if (pageParam) {
        constraints.push(startAfter(pageParam));
      }
      constraints.push(limit(TRANSACTIONS_PAGE_SIZE));

      const snapshot = await timed(pageParam ? 'transactions:nextPage' : 'transactions:firstPage', () =>
        getDocs(query(transactionsRef, ...constraints))
      );
      return {
        transactions: snapshot.docs.map(transformTransaction),
        lastDoc: snapshot.docs[snapshot.docs.length - 1] ?? null,
        hasMore: snapshot.size === TRANSACTIONS_PAGE_SIZE,
      };
    },
    initialPageParam: null as QueryDocumentSnapshot | null,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore && lastPage.lastDoc ? lastPage.lastDoc : undefined,
    select,
    enabled: !!dataOwnerId,
    staleTime: 1000 * 60 * 5,
  });

  return {
    transactions: result.data ?? [],
    isLoading: result.isLoading,
    error: result.error,
    fetchNextPage: result.fetchNextPage,
    hasNextPage: result.hasNextPage,
    isFetchingNextPage: result.isFetchingNextPage,
  };
}

/**
 * Count transactions matching a counterparty (excluding already manually categorized).
 */
export function useCountMatchingTransactions(counterparty: string | null) {
  const { dataOwnerId } = useAuth();

  return useQuery({
    queryKey: queryKeys.transactions.matchingCount(dataOwnerId ?? '', counterparty),
    queryFn: async () => {
      if (!dataOwnerId || !counterparty) return 0;

      const transactionsRef = collection(db, 'users', dataOwnerId, 'transactions');
      const q = query(transactionsRef, where('counterparty', '==', counterparty));
      const snapshot = await getDocs(q);

      // Count only non-manually categorized transactions
      const count = snapshot.docs.filter((docSnap) => {
        const data = docSnap.data();
        return data.categorySource !== 'manual';
      }).length;

      return count;
    },
    enabled: !!dataOwnerId && !!counterparty,
    staleTime: 30_000, // 30s — avoid excessive refetches while staying reasonably fresh
  });
}

