import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  collection,
  query,
  orderBy,
  getDocs,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp,
  where,
  writeBatch,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import type {
  Transaction,
  TransactionFormData,
  TransactionSplit,
  ReimbursementInfo,
} from '@/types';
import { generateId } from '@/lib/utils';

// Firestore document shape
interface TransactionDocument {
  externalId?: string | null;
  date: Timestamp | string;
  bookingDate?: Timestamp | string | null;
  transactionDate?: Timestamp | string | null;
  description: string;
  amount: number;
  currency?: 'EUR';
  counterparty?: string | null;
  categoryId?: string | null;
  categoryConfidence?: number;
  categorySource?: 'auto' | 'manual' | 'rule' | 'merchant' | 'learned' | 'none';
  isSplit?: boolean;
  splits?: TransactionSplit[] | null;
  reimbursement?: ReimbursementInfo | null;
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

// Query keys with filters
export const transactionKeys = {
  all: (userId: string) => ['transactions', userId] as const,
  filtered: (userId: string, filters: TransactionFilters) =>
    ['transactions', userId, filters] as const,
};

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
  const { user } = useAuth();

  return useQuery({
    queryKey: transactionKeys.filtered(user?.id ?? '', filters),
    queryFn: async () => {
      if (!user?.id) return [];

      const transactionsRef = collection(db, 'users', user.id, 'transactions');

      // Build query with filters - equality filters before range filters for Firestore
      const constraints = [];

      // Add categoryId equality filter first (if provided)
      if (filters.categoryId) {
        if (filters.categoryId === UNCATEGORIZED_FILTER) {
          // Filter for transactions with no category
          constraints.push(where('categoryId', '==', null));
        } else {
          constraints.push(where('categoryId', '==', filters.categoryId));
        }
      }

      // Add date range filters
      if (filters.startDate) {
        constraints.push(where('date', '>=', Timestamp.fromDate(filters.startDate)));
      }
      if (filters.endDate) {
        constraints.push(where('date', '<=', Timestamp.fromDate(filters.endDate)));
      }

      // Add ordering last
      constraints.push(orderBy('date', 'desc'));

      const q = query(transactionsRef, ...constraints);

      const snapshot = await getDocs(q);
      let transactions = snapshot.docs.map(transformTransaction);

      // Client-side filtering for search (Firestore doesn't support full-text search)
      if (filters.searchText) {
        const search = filters.searchText.toLowerCase();
        transactions = transactions.filter(
          (t) =>
            t.description.toLowerCase().includes(search) ||
            t.counterparty?.toLowerCase().includes(search)
        );
      }

      // Client-side filtering for amount range
      if (filters.minAmount !== undefined) {
        transactions = transactions.filter((t) => Math.abs(t.amount) >= filters.minAmount!);
      }
      if (filters.maxAmount !== undefined) {
        transactions = transactions.filter((t) => Math.abs(t.amount) <= filters.maxAmount!);
      }

      // Client-side filtering for direction
      if (filters.direction && filters.direction !== 'all') {
        transactions = transactions.filter((t) =>
          filters.direction === 'income' ? t.amount > 0 : t.amount < 0
        );
      }

      // Client-side filtering for reimbursement status
      if (filters.reimbursementStatus && filters.reimbursementStatus !== 'all') {
        transactions = transactions.filter((t) => {
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

      // Client-side filtering for categorization status
      if (filters.categorizationStatus && filters.categorizationStatus !== 'all') {
        transactions = transactions.filter((t) => {
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

      return transactions;
    },
    enabled: !!user?.id,
  });
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: TransactionFormData) => {
      if (!user?.id) throw new Error('Not authenticated');
      const id = generateId();
      const transactionRef = doc(db, 'users', user.id, 'transactions', id);
      await setDoc(transactionRef, {
        externalId: null,
        date: Timestamp.fromDate(data.date),
        description: data.description,
        amount: data.amount,
        currency: 'EUR',
        counterparty: null,
        categoryId: data.categoryId,
        categoryConfidence: data.categoryId ? 1 : 0,
        categorySource: data.categoryId ? 'manual' : 'auto',
        isSplit: false,
        splits: null,
        reimbursement: null,
        bankAccountId: null,
        importedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return id;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<TransactionFormData> & { categorySource?: 'manual' | 'auto' | 'rule' };
    }) => {
      if (!user?.id) throw new Error('Not authenticated');
      const transactionRef = doc(db, 'users', user.id, 'transactions', id);

      const updateData: Record<string, unknown> = {
        ...data,
        updatedAt: serverTimestamp(),
      };

      // Convert date to Timestamp if provided
      if (data.date) {
        updateData.date = Timestamp.fromDate(data.date);
      }

      await updateDoc(transactionRef, updateData);
      return id;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}

export function useUpdateTransactionCategory() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, categoryId }: { id: string; categoryId: string | null }) => {
      if (!user?.id) throw new Error('Not authenticated');
      const transactionRef = doc(db, 'users', user.id, 'transactions', id);
      await updateDoc(transactionRef, {
        categoryId,
        categorySource: 'manual',
        categoryConfidence: 1,
        updatedAt: serverTimestamp(),
      });
      return id;
    },
    onMutate: async ({ id, categoryId }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['transactions'] });

      // Snapshot the previous value
      const previousTransactions = queryClient.getQueriesData({ queryKey: ['transactions'] });

      // Optimistically update all transaction queries
      queryClient.setQueriesData({ queryKey: ['transactions'] }, (old: Transaction[] | undefined) =>
        old?.map((t) => (t.id === id ? { ...t, categoryId, categorySource: 'manual' as const } : t))
      );

      return { previousTransactions };
    },
    onError: (_err, _variables, context) => {
      // Rollback on error
      if (context?.previousTransactions) {
        context.previousTransactions.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['transactions'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!user?.id) throw new Error('Not authenticated');
      const transactionRef = doc(db, 'users', user.id, 'transactions', id);
      await deleteDoc(transactionRef);
      return id;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}

/**
 * Bulk update category for multiple transactions by counterparty match.
 * Used when user wants to apply a category change to all similar transactions.
 */
export function useBulkUpdateCategory() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      counterparty,
      categoryId,
      excludeTransactionId,
    }: {
      counterparty: string;
      categoryId: string;
      excludeTransactionId?: string;
    }) => {
      if (!user?.id) throw new Error('Not authenticated');
      if (!counterparty) throw new Error('Counterparty is required');

      const transactionsRef = collection(db, 'users', user.id, 'transactions');
      const q = query(transactionsRef, where('counterparty', '==', counterparty));
      const snapshot = await getDocs(q);

      // Filter out the already-updated transaction and manually categorized ones
      const docsToUpdate = snapshot.docs.filter((docSnap) => {
        if (excludeTransactionId && docSnap.id === excludeTransactionId) return false;
        const data = docSnap.data();
        // Don't overwrite manually categorized transactions
        if (data.categorySource === 'manual') return false;
        return true;
      });

      // Update in batches of 500 (Firestore limit)
      let updatedCount = 0;
      for (let i = 0; i < docsToUpdate.length; i += 500) {
        const batch = writeBatch(db);
        const chunk = docsToUpdate.slice(i, i + 500);

        chunk.forEach((docSnap) => {
          batch.update(docSnap.ref, {
            categoryId,
            categorySource: 'manual',
            categoryConfidence: 1,
            updatedAt: serverTimestamp(),
          });
        });

        await batch.commit();
        updatedCount += chunk.length;
      }

      return { updatedCount };
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['transactions'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

/**
 * Count transactions matching a counterparty (excluding already manually categorized).
 */
export function useCountMatchingTransactions(counterparty: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['matchingTransactionsCount', user?.id, counterparty],
    queryFn: async () => {
      if (!user?.id || !counterparty) return 0;

      const transactionsRef = collection(db, 'users', user.id, 'transactions');
      const q = query(transactionsRef, where('counterparty', '==', counterparty));
      const snapshot = await getDocs(q);

      // Count only non-manually categorized transactions
      const count = snapshot.docs.filter((docSnap) => {
        const data = docSnap.data();
        return data.categorySource !== 'manual';
      }).length;

      return count;
    },
    enabled: !!user?.id && !!counterparty,
    staleTime: 0, // Always refetch to get accurate count
  });
}
