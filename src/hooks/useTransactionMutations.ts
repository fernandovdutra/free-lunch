import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  collection,
  query,
  getDocs,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { invalidateFinancialData } from '@/lib/queryKeys';
import { recategorizeTransactions } from '@/lib/bankingFunctions';
import type { Transaction, TransactionFormData, TransactionSplit } from '@/types';
import { generateId } from '@/lib/utils';

/**
 * Apply a partial patch to the transaction with `id` inside a cached query value,
 * handling both shapes that live under the `['transactions', …]` key space:
 *   - a flat `Transaction[]` (the non-paginated `useTransactions` queries), and
 *   - `InfiniteData` from `useInfiniteTransactions` (`{ pages: [{ transactions }] }`).
 * Returns the value unchanged for any other shape, so a single optimistic updater
 * can safely run across every matching query without assuming an array.
 */
export function patchTransactionInCache(
  old: unknown,
  id: string,
  patch: Partial<Transaction>
): unknown {
  if (!old) return old;

  if (Array.isArray(old)) {
    return (old as Transaction[]).map((t) => (t.id === id ? { ...t, ...patch } : t));
  }

  if (
    typeof old === 'object' &&
    'pages' in old &&
    Array.isArray((old as { pages: unknown }).pages)
  ) {
    const data = old as {
      pages: { transactions: Transaction[] }[];
      pageParams: unknown;
    };
    return {
      ...data,
      pages: data.pages.map((page) => ({
        ...page,
        transactions: page.transactions.map((t) =>
          t.id === id ? { ...t, ...patch } : t
        ),
      })),
    };
  }

  return old;
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();
  const { dataOwnerId } = useAuth();

  return useMutation({
    mutationFn: async (data: TransactionFormData) => {
      if (!dataOwnerId) throw new Error('Not authenticated');
      const id = generateId();
      const transactionRef = doc(db, 'users', dataOwnerId, 'transactions', id);
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
      invalidateFinancialData(queryClient);
    },
  });
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient();
  const { dataOwnerId } = useAuth();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<TransactionFormData> & { categorySource?: 'manual' | 'auto' | 'rule' };
    }) => {
      if (!dataOwnerId) throw new Error('Not authenticated');
      const transactionRef = doc(db, 'users', dataOwnerId, 'transactions', id);

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
      invalidateFinancialData(queryClient);
    },
  });
}

export function useUpdateTransactionCategory() {
  const queryClient = useQueryClient();
  const { dataOwnerId } = useAuth();

  return useMutation({
    mutationFn: async ({ id, categoryId }: { id: string; categoryId: string | null }) => {
      if (!dataOwnerId) throw new Error('Not authenticated');
      const transactionRef = doc(db, 'users', dataOwnerId, 'transactions', id);
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

      // Optimistically update all transaction queries (flat arrays and the
      // paginated InfiniteData shape alike).
      // Mirror the server write exactly (categoryConfidence: 1) so the
      // optimistic row matches what the refetch will return.
      queryClient.setQueriesData({ queryKey: ['transactions'] }, (old: unknown) =>
        patchTransactionInCache(old, id, {
          categoryId,
          categorySource: 'manual',
          categoryConfidence: 1,
        })
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
      // Refetch every money-displaying surface. Invalidation (not cache
      // patching) also removes the row from any server-filtered list it no
      // longer belongs to (e.g. category changed while filtering by category).
      invalidateFinancialData(queryClient);
    },
  });
}

export interface SetTransactionSplitInput {
  id: string;
  /** 2+ rows to store a split, or `null` to remove an existing one. */
  splits: TransactionSplit[] | null;
  /**
   * Only meaningful when removing a split (`splits: null`): category the
   * transaction falls back to (e.g. the surviving editor row's category).
   * Omit to leave `categoryId` untouched.
   */
  categoryId?: string | null;
}

/**
 * Write `isSplit` + `splits[]` (US-4) in a single `updateDoc`, so the split
 * state and any category fallback change atomically with `updatedAt`.
 *
 * Stored shape must match the functions-side reader
 * (functions/src/shared/aggregations.ts `TransactionDoc`): split amounts are
 * POSITIVE euros summing to `abs(transaction.amount)` — backend aggregation
 * skips `amount <= 0` rows, so those are rejected here.
 */
export function useSetTransactionSplit() {
  const queryClient = useQueryClient();
  const { dataOwnerId } = useAuth();

  return useMutation({
    mutationFn: async ({ id, splits, categoryId }: SetTransactionSplitInput) => {
      if (!dataOwnerId) throw new Error('Not authenticated');
      if (splits !== null) {
        if (splits.length < 2) throw new Error('A split needs at least two rows');
        if (splits.some((s) => s.amount <= 0)) {
          throw new Error('Split amounts must be positive');
        }
      }
      const transactionRef = doc(db, 'users', dataOwnerId, 'transactions', id);

      const updateData: Record<string, unknown> = {
        isSplit: splits !== null,
        splits,
        updatedAt: serverTimestamp(),
      };
      if (splits === null && categoryId !== undefined) {
        updateData.categoryId = categoryId;
        updateData.categorySource = 'manual';
        updateData.categoryConfidence = 1;
      }

      await updateDoc(transactionRef, updateData);
      return id;
    },
    onSuccess: () => {
      invalidateFinancialData(queryClient);
    },
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();
  const { dataOwnerId } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!dataOwnerId) throw new Error('Not authenticated');
      const transactionRef = doc(db, 'users', dataOwnerId, 'transactions', id);
      await deleteDoc(transactionRef);
      return id;
    },
    onSuccess: () => {
      invalidateFinancialData(queryClient);
    },
  });
}

/**
 * Bulk update category for multiple transactions by counterparty match.
 * Used when user wants to apply a category change to all similar transactions.
 */
export function useBulkUpdateCategory() {
  const queryClient = useQueryClient();
  const { dataOwnerId } = useAuth();

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
      if (!dataOwnerId) throw new Error('Not authenticated');
      if (!counterparty) throw new Error('Counterparty is required');

      const transactionsRef = collection(db, 'users', dataOwnerId, 'transactions');
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
      invalidateFinancialData(queryClient);
    },
  });
}

/**
 * AI-categorize a single transaction using LLM.
 */
export function useAICategorizeTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (transactionId: string) => {
      const result = await recategorizeTransactions({ transactionIds: [transactionId] });
      return result.data;
    },
    onSettled: () => {
      invalidateFinancialData(queryClient);
    },
  });
}
