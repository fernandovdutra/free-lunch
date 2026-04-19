import { db, userId } from '../firebase.js';
import { Timestamp } from 'firebase-admin/firestore';

export interface TransactionFilter {
  startDate?: string;
  endDate?: string;
  categoryId?: string;
  counterparty?: string;
  minAmount?: number;
  maxAmount?: number;
  direction?: 'income' | 'expense' | 'all';
  limit?: number;
}

export async function getTransactions(filter: TransactionFilter = {}) {
  let ref = db
    .collection('users')
    .doc(userId)
    .collection('transactions')
    .orderBy('date', 'desc') as FirebaseFirestore.Query;

  if (filter.startDate) {
    ref = ref.where('date', '>=', Timestamp.fromDate(new Date(filter.startDate)));
  }
  if (filter.endDate) {
    ref = ref.where('date', '<=', Timestamp.fromDate(new Date(filter.endDate)));
  }
  if (filter.categoryId) {
    ref = ref.where('categoryId', '==', filter.categoryId);
  }

  const snapshot = await ref.limit(filter.limit ?? 50).get();

  let results = snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      date: data.date?.toDate?.()?.toISOString() ?? '',
      description: data.description,
      amount: data.amount,
      counterparty: data.counterparty ?? null,
      categoryId: data.categoryId ?? null,
      categorySource: data.categorySource ?? 'none',
      isSplit: data.isSplit ?? false,
    };
  });

  // Client-side filters that Firestore can't handle with existing indexes
  if (filter.counterparty) {
    const search = filter.counterparty.toLowerCase();
    results = results.filter(
      (t) => t.counterparty?.toLowerCase().includes(search)
    );
  }
  if (filter.direction === 'income') {
    results = results.filter((t) => t.amount > 0);
  } else if (filter.direction === 'expense') {
    results = results.filter((t) => t.amount < 0);
  }
  if (filter.minAmount != null) {
    results = results.filter((t) => Math.abs(t.amount) >= filter.minAmount!);
  }
  if (filter.maxAmount != null) {
    results = results.filter((t) => Math.abs(t.amount) <= filter.maxAmount!);
  }

  return results;
}

export async function searchTransactions(searchText: string, limit = 50) {
  // Firestore doesn't support full-text search, so we fetch recent and filter client-side
  const snapshot = await db
    .collection('users')
    .doc(userId)
    .collection('transactions')
    .orderBy('date', 'desc')
    .limit(500)
    .get();

  const search = searchText.toLowerCase();
  return snapshot.docs
    .map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        date: data.date?.toDate?.()?.toISOString() ?? '',
        description: data.description,
        amount: data.amount,
        counterparty: data.counterparty ?? null,
        categoryId: data.categoryId ?? null,
      };
    })
    .filter(
      (t) =>
        t.description?.toLowerCase().includes(search) ||
        t.counterparty?.toLowerCase().includes(search)
    )
    .slice(0, limit);
}
