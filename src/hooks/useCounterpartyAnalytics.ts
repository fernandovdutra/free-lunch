import { useQuery } from '@tanstack/react-query';
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  Timestamp,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useMonth } from '@/contexts/MonthContext';
import { queryKeys } from '@/lib/queryKeys';
import {
  format,
  startOfMonth,
  subMonths,
  eachMonthOfInterval,
} from 'date-fns';

// Query keys — delegated to the central factory (src/lib/queryKeys.ts).
// The month key is part of the analytics key because the queryFn computes
// current-month figures and a rolling 12-month window relative to the
// selected month; switching month must refetch.
export const counterpartyKeys = {
  all: (userId: string) => queryKeys.counterparty.all(userId),
  analytics: (userId: string, counterparty: string, monthKey: string) =>
    queryKeys.counterparty.analytics(userId, counterparty, monthKey),
};

export interface MonthlySpending {
  month: string; // 'Jan 2024' format
  monthKey: string; // '2024-01' format for sorting
  amount: number;
  transactionCount: number;
}

export interface CounterpartyAnalytics {
  counterparty: string;
  currentMonthSpending: number;
  currentMonthTransactions: number;
  last3Months: MonthlySpending[];
  last12Months: MonthlySpending[];
  totalSpent: number;
  totalTransactions: number;
  averagePerMonth: number;
  firstTransactionDate: Date | null;
  lastTransactionDate: Date | null;
}

// Transform Firestore document
interface TransactionDoc {
  date: Timestamp | string;
  amount: number;
  counterparty?: string | null;
  reimbursement?: { status: string } | null;
}

function transformDoc(doc: QueryDocumentSnapshot): { date: Date; amount: number } {
  const data = doc.data() as TransactionDoc;
  return {
    date: data.date instanceof Timestamp ? data.date.toDate() : new Date(data.date),
    amount: data.amount,
  };
}

export function useCounterpartyAnalytics(counterparty: string | null) {
  const { dataOwnerId } = useAuth();
  const { selectedMonth } = useMonth();
  // Local-time format → TZ-stable yyyy-MM (same convention as useSpendingExplorer).
  const monthKey = format(selectedMonth, 'yyyy-MM');

  return useQuery({
    queryKey: counterpartyKeys.analytics(dataOwnerId ?? '', counterparty ?? '', monthKey),
    queryFn: async (): Promise<CounterpartyAnalytics | null> => {
      if (!dataOwnerId || !counterparty) return null;

      const transactionsRef = collection(db, 'users', dataOwnerId, 'transactions');
      const q = query(
        transactionsRef,
        where('counterparty', '==', counterparty),
        orderBy('date', 'desc')
      );
      const snapshot = await getDocs(q);

      if (snapshot.empty) return null;

      const transactions = snapshot.docs.map(transformDoc);

      // Filter to only expenses (negative amounts)
      const expenses = transactions.filter((t) => t.amount < 0);

      if (expenses.length === 0) {
        // Transactions exist but all are income - return basic info
        return {
          counterparty,
          currentMonthSpending: 0,
          currentMonthTransactions: 0,
          last3Months: [],
          last12Months: [],
          totalSpent: 0,
          totalTransactions: 0,
          averagePerMonth: 0,
          firstTransactionDate: null,
          lastTransactionDate: null,
        };
      }

      // Calculate monthly aggregates
      const monthlyMap = new Map<string, { amount: number; count: number }>();

      expenses.forEach((t) => {
        const monthKey = format(t.date, 'yyyy-MM');
        const current = monthlyMap.get(monthKey) ?? { amount: 0, count: 0 };
        monthlyMap.set(monthKey, {
          amount: current.amount + Math.abs(t.amount),
          count: current.count + 1,
        });
      });

      // Current month calculations
      const currentMonthKey = format(selectedMonth, 'yyyy-MM');
      const currentMonthData = monthlyMap.get(currentMonthKey) ?? { amount: 0, count: 0 };

      // Get last 12 months (including months with no data)
      const last12MonthsStart = subMonths(startOfMonth(selectedMonth), 11);
      const monthsInterval = eachMonthOfInterval({
        start: last12MonthsStart,
        end: selectedMonth,
      });

      const last12Months: MonthlySpending[] = monthsInterval.map((monthDate) => {
        const key = format(monthDate, 'yyyy-MM');
        const data = monthlyMap.get(key) ?? { amount: 0, count: 0 };
        return {
          month: format(monthDate, 'MMM yyyy'),
          monthKey: key,
          amount: data.amount,
          transactionCount: data.count,
        };
      });

      // Last 3 months (most recent 3 from the 12)
      const last3Months = last12Months.slice(-3);

      // Summary stats
      const totalSpent = expenses.reduce((sum, t) => sum + Math.abs(t.amount), 0);
      const totalTransactions = expenses.length;

      // Calculate average per month (only months with transactions)
      const monthsWithData = Array.from(monthlyMap.values()).filter((m) => m.count > 0);
      const averagePerMonth =
        monthsWithData.length > 0 ? totalSpent / monthsWithData.length : 0;

      // First and last dates
      const sortedByDate = [...expenses].sort((a, b) => a.date.getTime() - b.date.getTime());
      const firstTransactionDate = sortedByDate[0]?.date ?? null;
      const lastTransactionDate = sortedByDate[sortedByDate.length - 1]?.date ?? null;

      return {
        counterparty,
        currentMonthSpending: currentMonthData.amount,
        currentMonthTransactions: currentMonthData.count,
        last3Months,
        last12Months,
        totalSpent,
        totalTransactions,
        averagePerMonth,
        firstTransactionDate,
        lastTransactionDate,
      };
    },
    enabled: !!dataOwnerId && !!counterparty,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
