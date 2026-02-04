import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  collection,
  query,
  orderBy,
  getDocs,
  doc,
  updateDoc,
  serverTimestamp,
  Timestamp,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import type { Transaction, ReimbursementInfo } from '@/types';

// Firestore document shape (matches useTransactions.ts)
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
  splits?: Transaction['splits'];
  reimbursement?: ReimbursementInfo | null;
  bankAccountId?: string | null;
  importedAt?: Timestamp | string;
  updatedAt?: Timestamp | string;
}

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

// Query keys
export const reimbursementKeys = {
  pending: (userId: string) => ['reimbursements', 'pending', userId] as const,
  cleared: (userId: string) => ['reimbursements', 'cleared', userId] as const,
  incomeForClearing: (userId: string) => ['reimbursements', 'income-for-clearing', userId] as const,
};

/**
 * Query for pending reimbursements (expenses marked as reimbursable but not yet cleared)
 */
export function usePendingReimbursements() {
  const { user } = useAuth();

  return useQuery({
    queryKey: reimbursementKeys.pending(user?.id ?? ''),
    queryFn: async () => {
      if (!user?.id) return [];

      const transactionsRef = collection(db, 'users', user.id, 'transactions');
      // Note: Firestore doesn't support querying nested fields well, so we fetch all and filter
      const q = query(transactionsRef, orderBy('date', 'desc'));
      const snapshot = await getDocs(q);
      const transactions = snapshot.docs.map(transformTransaction);

      // Filter for pending reimbursements (expenses with reimbursement.status === 'pending')
      return transactions.filter((t) => t.reimbursement?.status === 'pending' && t.amount < 0);
    },
    enabled: !!user?.id,
  });
}

/**
 * Query for cleared reimbursements
 */
export function useClearedReimbursements(options?: { limit?: number }) {
  const { user } = useAuth();

  return useQuery({
    queryKey: reimbursementKeys.cleared(user?.id ?? ''),
    queryFn: async () => {
      if (!user?.id) return [];

      const transactionsRef = collection(db, 'users', user.id, 'transactions');
      const q = query(transactionsRef, orderBy('date', 'desc'));
      const snapshot = await getDocs(q);
      const transactions = snapshot.docs.map(transformTransaction);

      // Filter for cleared reimbursements
      let cleared = transactions.filter(
        (t) => t.reimbursement?.status === 'cleared' && t.amount < 0
      );

      // Apply limit if provided
      if (options?.limit) {
        cleared = cleared.slice(0, options.limit);
      }

      return cleared;
    },
    enabled: !!user?.id,
  });
}

/**
 * Query for recent income transactions that can be used to clear reimbursements.
 * Filters to transactions with amount > 0 that are not already linked to cleared reimbursements.
 * Supports optional search text for filtering by description/counterparty.
 */
export function useRecentIncomeTransactions(searchText?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: [...reimbursementKeys.incomeForClearing(user?.id ?? ''), searchText ?? ''],
    queryFn: async () => {
      if (!user?.id) return [];

      const transactionsRef = collection(db, 'users', user.id, 'transactions');
      const q = query(transactionsRef, orderBy('date', 'desc'));
      const snapshot = await getDocs(q);
      const transactions = snapshot.docs.map(transformTransaction);

      // Filter for income transactions not already used for clearing
      let income = transactions.filter(
        (t) => t.amount > 0 && t.reimbursement?.status !== 'cleared'
      );

      // Apply search filter
      if (searchText) {
        const lower = searchText.toLowerCase();
        income = income.filter(
          (t) =>
            t.description.toLowerCase().includes(lower) ||
            (t.counterparty && t.counterparty.toLowerCase().includes(lower))
        );
      }

      // Return the most recent 50
      return income.slice(0, 50);
    },
    enabled: !!user?.id,
  });
}

/**
 * Mutation to mark a transaction as reimbursable
 */
export function useMarkAsReimbursable() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      id,
      type,
      note,
    }: {
      id: string;
      type: 'work' | 'personal';
      note?: string | undefined;
    }) => {
      if (!user?.id) throw new Error('Not authenticated');

      const transactionRef = doc(db, 'users', user.id, 'transactions', id);
      const reimbursement: ReimbursementInfo = {
        type,
        note: note ?? null,
        status: 'pending',
        linkedTransactionId: null,
        clearedAt: null,
      };

      await updateDoc(transactionRef, {
        reimbursement,
        updatedAt: serverTimestamp(),
      });

      return id;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['transactions'] });
      void queryClient.invalidateQueries({ queryKey: ['reimbursements'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

/**
 * Mutation to clear/match reimbursements against an income transaction
 */
export function useClearReimbursement() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      incomeTransactionId,
      expenseTransactionIds,
    }: {
      incomeTransactionId: string;
      expenseTransactionIds: string[];
    }) => {
      if (!user?.id) throw new Error('Not authenticated');

      const clearedAt = new Date();

      // Update each expense transaction to mark as cleared and link to income
      for (const expenseId of expenseTransactionIds) {
        const expenseRef = doc(db, 'users', user.id, 'transactions', expenseId);
        await updateDoc(expenseRef, {
          'reimbursement.status': 'cleared',
          'reimbursement.linkedTransactionId': incomeTransactionId,
          'reimbursement.clearedAt': Timestamp.fromDate(clearedAt),
          updatedAt: serverTimestamp(),
        });
      }

      // Optionally mark the income transaction as containing reimbursement
      // (This helps identify which income was used to clear expenses)
      const incomeRef = doc(db, 'users', user.id, 'transactions', incomeTransactionId);
      await updateDoc(incomeRef, {
        reimbursement: {
          type: 'work' as const,
          note: `Clears ${expenseTransactionIds.length} expense(s)`,
          status: 'cleared' as const,
          linkedTransactionId: expenseTransactionIds[0], // Link to first expense
          clearedAt: Timestamp.fromDate(clearedAt),
        },
        updatedAt: serverTimestamp(),
      });

      return { incomeTransactionId, expenseTransactionIds };
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['transactions'] });
      void queryClient.invalidateQueries({ queryKey: ['reimbursements'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

/**
 * Mutation to unmark a transaction as reimbursable
 */
export function useUnmarkReimbursement() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!user?.id) throw new Error('Not authenticated');

      const transactionRef = doc(db, 'users', user.id, 'transactions', id);
      await updateDoc(transactionRef, {
        reimbursement: null,
        updatedAt: serverTimestamp(),
      });

      return id;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['transactions'] });
      void queryClient.invalidateQueries({ queryKey: ['reimbursements'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

/**
 * Calculate summary statistics from reimbursement data
 */
export interface ReimbursementSummaryData {
  pendingCount: number;
  pendingTotal: number;
  pendingWorkTotal: number;
  pendingPersonalTotal: number;
  clearedCount: number;
  clearedTotal: number;
}

export function calculateReimbursementSummary(
  pending: Transaction[],
  cleared: Transaction[]
): ReimbursementSummaryData {
  const pendingTotal = pending.reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const pendingWorkTotal = pending
    .filter((t) => t.reimbursement?.type === 'work')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const pendingPersonalTotal = pending
    .filter((t) => t.reimbursement?.type === 'personal')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const clearedTotal = cleared.reduce((sum, t) => sum + Math.abs(t.amount), 0);

  return {
    pendingCount: pending.length,
    pendingTotal,
    pendingWorkTotal,
    pendingPersonalTotal,
    clearedCount: cleared.length,
    clearedTotal,
  };
}
