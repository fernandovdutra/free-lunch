import { useQuery } from '@tanstack/react-query';
import {
  collection,
  query,
  where,
  getDocs,
  Timestamp,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import type { Transaction } from '@/types';

// Minimal Firestore document shape for transform
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
  splits?: Transaction['splits'];
  reimbursement?: Transaction['reimbursement'];
  bankAccountId?: string | null;
  excludeFromTotals?: boolean;
  icsStatementId?: string | null;
  source?: 'bank_sync' | 'ics_import' | 'manual';
  importedAt?: Timestamp | string;
  updatedAt?: Timestamp | string;
}

function toDate(value: Timestamp | string | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Timestamp) return value.toDate();
  return new Date(value);
}

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
    reimbursement: data.reimbursement ?? null,
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

export function useIcsBreakdown(icsStatementId: string | null, enabled: boolean) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['icsBreakdown', user?.id, icsStatementId],
    queryFn: async () => {
      if (!user?.id || !icsStatementId) return [];

      const transactionsRef = collection(db, 'users', user.id, 'transactions');
      const q = query(transactionsRef, where('icsStatementId', '==', icsStatementId));
      const snapshot = await getDocs(q);

      // Filter for ICS imports only (excludes the lump-sum ABN AMRO transaction)
      const transactions = snapshot.docs
        .map(transformTransaction)
        .filter((t) => t.source === 'ics_import');

      // Sort by date ascending
      transactions.sort((a, b) => a.date.getTime() - b.date.getTime());

      return transactions;
    },
    enabled: !!user?.id && !!icsStatementId && enabled,
  });
}
