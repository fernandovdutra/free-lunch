import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  collection,
  query,
  orderBy,
  getDocs,
  runTransaction,
  doc,
  updateDoc,
  serverTimestamp,
  Timestamp,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { invalidateFinancialData, queryKeys } from '@/lib/queryKeys';
import { getReimbursementSummaryFn, deserializeTransaction } from '@/lib/bankingFunctions';
import type { Transaction, ReimbursementInfo } from '@/types';

// Firestore document shape (used only for useRecentIncomeTransactions)
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

// Transform Firestore data to Transaction type (used only for useRecentIncomeTransactions)
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

// Query keys — delegated to the central factory (src/lib/queryKeys.ts).
export const reimbursementKeys = {
  summary: (userId: string, clearedLimit: number | undefined) =>
    queryKeys.reimbursements.summary(userId, clearedLimit),
  incomeForClearing: (userId: string, searchText: string) =>
    queryKeys.reimbursements.incomeForClearing(userId, searchText),
};

/**
 * Unified reimbursement data hook — single Cloud Function call for all reimbursement data
 */
function useReimbursementData(clearedLimit?: number) {
  const { dataOwnerId } = useAuth();

  return useQuery({
    queryKey: reimbursementKeys.summary(dataOwnerId ?? '', clearedLimit),
    queryFn: async () => {
      if (!dataOwnerId) return { summary: null, pending: [] as Transaction[], cleared: [] as Transaction[] };

      const params: { clearedLimit?: number } = {};
      if (clearedLimit !== undefined) {
        params.clearedLimit = clearedLimit;
      }
      const result = await getReimbursementSummaryFn(params);
      return {
        summary: result.data.summary,
        pending: result.data.pendingTransactions.map(deserializeTransaction),
        cleared: result.data.clearedTransactions.map(deserializeTransaction),
      };
    },
    enabled: !!dataOwnerId,
  });
}

/**
 * Query for pending reimbursements
 */
export function usePendingReimbursements() {
  const { data, isLoading, error } = useReimbursementData();

  return {
    data: data?.pending ?? [],
    isLoading,
    error,
  };
}

/**
 * Query for cleared reimbursements
 */
export function useClearedReimbursements(options?: { limit?: number }) {
  const { data, isLoading, error } = useReimbursementData(options?.limit);

  return {
    data: data?.cleared ?? [],
    isLoading,
    error,
  };
}

/**
 * Query for recent income transactions that can be used to clear reimbursements.
 * Stays as direct Firestore query — it's an interactive search.
 */
export function useRecentIncomeTransactions(searchText?: string) {
  const { dataOwnerId } = useAuth();

  return useQuery({
    queryKey: reimbursementKeys.incomeForClearing(dataOwnerId ?? '', searchText ?? ''),
    queryFn: async () => {
      if (!dataOwnerId) return [];

      const transactionsRef = collection(db, 'users', dataOwnerId, 'transactions');
      const q = query(transactionsRef, orderBy('date', 'desc'));
      const snapshot = await getDocs(q);
      // Re-sort after normalizing dates: Firestore's orderBy groups Timestamp
      // and string values separately, so documents with mixed `date` types
      // come back out of chronological order.
      const transactions = snapshot.docs
        .map(transformTransaction)
        .sort((a, b) => b.date.getTime() - a.date.getTime());

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
    enabled: !!dataOwnerId,
  });
}

/**
 * Mutation to mark a transaction as reimbursable
 */
export function useMarkAsReimbursable() {
  const queryClient = useQueryClient();
  const { dataOwnerId } = useAuth();

  return useMutation({
    mutationFn: async ({
      id,
      type,
      note,
      amount,
    }: {
      id: string;
      type: 'work' | 'personal';
      note?: string | undefined;
      amount: number;
    }) => {
      if (!dataOwnerId) throw new Error('Not authenticated');

      const transactionRef = doc(db, 'users', dataOwnerId, 'transactions', id);
      await runTransaction(db, async (tx) => {
        const current = await tx.get(transactionRef);
        const data = current.data() as { amount: number; isSplit?: boolean; reimbursement?: ReimbursementInfo | null } | undefined;
        if (!data || data.amount >= 0 || data.isSplit ||
            data.reimbursement?.status === 'cleared' ||
            !Number.isSafeInteger(Math.round(amount * 100)) ||
            amount <= 0 || amount > Math.abs(data.amount) ||
            Math.abs(Math.round(amount * 100) - amount * 100) > 0.000001) {
          throw new Error('Invalid reimbursable amount');
        }
        const reimbursement: ReimbursementInfo = {
          type, amount, note: note ?? data.reimbursement?.note ?? null,
          status: 'pending', linkedTransactionId: null, clearedAt: null,
        };
        tx.update(transactionRef, { reimbursement, updatedAt: serverTimestamp() });
      });

      return id;
    },
    onSuccess: () => {
      invalidateFinancialData(queryClient);
    },
  });
}

/**
 * Mutation to clear/match reimbursements against an income transaction
 */
export function useClearReimbursement() {
  const queryClient = useQueryClient();
  const { dataOwnerId } = useAuth();

  return useMutation({
    mutationFn: async ({
      incomeTransactionId,
      expenseTransactionIds,
    }: {
      incomeTransactionId: string;
      expenseTransactionIds: string[];
    }) => {
      if (!dataOwnerId) throw new Error('Not authenticated');

      const clearedAt = new Date();

      const incomeRef = doc(db, 'users', dataOwnerId, 'transactions', incomeTransactionId);
      const expenseRefs = expenseTransactionIds.map((id) =>
        doc(db, 'users', dataOwnerId, 'transactions', id));
      if (!expenseRefs.length || new Set(expenseTransactionIds).size !== expenseRefs.length ||
          expenseTransactionIds.includes(incomeTransactionId)) {
        throw new Error('Select distinct expenses and income');
      }
      await runTransaction(db, async (tx) => {
        const [income, ...expenses] = await Promise.all([
          tx.get(incomeRef), ...expenseRefs.map((ref) => tx.get(ref)),
        ]);
        const incomeData = income.data() as { amount: number; reimbursement?: ReimbursementInfo | null } | undefined;
        if (!incomeData || incomeData.amount <= 0 || incomeData.reimbursement) {
          throw new Error('Income is unavailable for reimbursement');
        }
        let reimbursable = 0;
        let type: 'work' | 'personal' = 'personal';
        for (const expense of expenses) {
          const data = expense.data() as { amount: number; reimbursement?: ReimbursementInfo | null } | undefined;
          if (!data || data.amount >= 0 || data.reimbursement?.status !== 'pending') {
            throw new Error('Expense is not pending reimbursement');
          }
          reimbursable += data.reimbursement.amount ?? Math.abs(data.amount);
          type = data.reimbursement.type === 'work' ? 'work' : 'personal';
        }
        if (Math.round(reimbursable * 100) !== Math.round(incomeData.amount * 100)) {
          throw new Error('Income must equal the reimbursable amount');
        }
        for (const ref of expenseRefs) {
          tx.update(ref, {
            'reimbursement.status': 'cleared',
            'reimbursement.linkedTransactionId': incomeTransactionId,
            'reimbursement.clearedAt': Timestamp.fromDate(clearedAt),
            updatedAt: serverTimestamp(),
          });
        }
        tx.update(incomeRef, {
          reimbursement: {
            type,
            amount: reimbursable,
            note: `Clears ${expenseTransactionIds.length} expense(s)`,
            status: 'cleared',
            linkedTransactionId: expenseTransactionIds[0],
            clearedAt: Timestamp.fromDate(clearedAt),
          },
          updatedAt: serverTimestamp(),
        });
      });

      return { incomeTransactionId, expenseTransactionIds };
    },
    onSuccess: () => {
      invalidateFinancialData(queryClient);
    },
  });
}

/**
 * Mutation to unmark a transaction as reimbursable
 */
export function useUnmarkReimbursement() {
  const queryClient = useQueryClient();
  const { dataOwnerId } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!dataOwnerId) throw new Error('Not authenticated');

      const transactionRef = doc(db, 'users', dataOwnerId, 'transactions', id);
      await updateDoc(transactionRef, {
        reimbursement: null,
        updatedAt: serverTimestamp(),
      });

      return id;
    },
    onSuccess: () => {
      invalidateFinancialData(queryClient);
    },
  });
}
