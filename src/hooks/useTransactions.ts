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
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import type { Transaction, TransactionFormData, TransactionSplit, ReimbursementInfo } from '@/types';
import { generateId } from '@/lib/utils';

// Firestore document shape
interface TransactionDocument {
  externalId?: string | null;
  date: Timestamp | string;
  description: string;
  amount: number;
  currency?: 'EUR';
  counterparty?: string | null;
  categoryId?: string | null;
  categoryConfidence?: number;
  categorySource?: 'auto' | 'manual' | 'rule';
  isSplit?: boolean;
  splits?: TransactionSplit[] | null;
  reimbursement?: ReimbursementInfo | null;
  bankAccountId?: string | null;
  importedAt?: Timestamp | string;
  updatedAt?: Timestamp | string;
}

// Filter interface
export interface TransactionFilters {
  startDate?: Date;
  endDate?: Date;
  categoryId?: string | null;
  searchText?: string;
  minAmount?: number;
  maxAmount?: number;
}

// Query keys with filters
export const transactionKeys = {
  all: (userId: string) => ['transactions', userId] as const,
  filtered: (userId: string, filters: TransactionFilters) =>
    ['transactions', userId, filters] as const,
};

// Transform Firestore data to Transaction type
function transformTransaction(docSnap: QueryDocumentSnapshot): Transaction {
  const data = docSnap.data() as TransactionDocument;
  return {
    id: docSnap.id,
    externalId: data.externalId ?? null,
    date: data.date instanceof Timestamp ? data.date.toDate() : new Date(data.date),
    description: typeof data.description === 'string' ? data.description : 'Bank transaction',
    amount: data.amount,
    currency: data.currency ?? 'EUR',
    counterparty: data.counterparty ?? null,
    categoryId: data.categoryId ?? null,
    categoryConfidence: data.categoryConfidence ?? 0,
    categorySource: data.categorySource ?? 'manual',
    isSplit: data.isSplit ?? false,
    splits: data.splits ?? null,
    reimbursement: data.reimbursement ?? null,
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

      // Build query with filters
      let q = query(transactionsRef, orderBy('date', 'desc'));

      // Add Firestore filters for date range
      if (filters.startDate) {
        q = query(q, where('date', '>=', Timestamp.fromDate(filters.startDate)));
      }
      if (filters.endDate) {
        q = query(q, where('date', '<=', Timestamp.fromDate(filters.endDate)));
      }
      if (filters.categoryId) {
        q = query(q, where('categoryId', '==', filters.categoryId));
      }

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
