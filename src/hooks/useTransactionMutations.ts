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
import { recategorizeTransactions } from '@/lib/bankingFunctions';
import type { Transaction, TransactionFormData } from '@/types';
import { generateId } from '@/lib/utils';

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
      void queryClient.invalidateQueries({ queryKey: ['transactions'] });
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
      void queryClient.invalidateQueries({ queryKey: ['transactions'] });
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
  const { dataOwnerId } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!dataOwnerId) throw new Error('Not authenticated');
      const transactionRef = doc(db, 'users', dataOwnerId, 'transactions', id);
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
      void queryClient.invalidateQueries({ queryKey: ['transactions'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
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
      void queryClient.invalidateQueries({ queryKey: ['transactions'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
