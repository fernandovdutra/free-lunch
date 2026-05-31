import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { collection, getDocs, query, orderBy, Timestamp } from 'firebase/firestore';
import { format } from 'date-fns';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import {
  buildIcsCoverage,
  latestMissingMonth as pickLatestMissing,
  missingMonths as pickMissing,
  type IcsMonthCoverage,
  type IcsStatementSummary,
} from '@/lib/icsCoverage';

// Firestore shape of users/{uid}/icsStatements/{statementId}
interface IcsStatementDoc {
  statementDate?: Timestamp | string;
  totalNewExpenses?: number;
  transactionsCreated?: number;
  importedAt?: Timestamp | string | null;
}

function toDate(value: Timestamp | string | null | undefined): Date | null {
  if (!value) return null;
  return value instanceof Timestamp ? value.toDate() : new Date(value);
}

/**
 * Derive a statement's calendar month ('yyyy-MM'). The doc id is
 * `{customerNumber}_{yyyy-MM}`, which is the canonical month; fall back to the
 * statementDate if the id ever lacks the suffix.
 */
function monthKeyFor(statementId: string, statementDate: Date | null): string {
  const m = /(\d{4})-(\d{2})$/.exec(statementId);
  if (m) return `${m[1]}-${m[2]}`;
  return statementDate ? format(statementDate, 'yyyy-MM') : '';
}

export const icsStatementKeys = {
  all: (userId: string) => ['icsStatements', userId] as const,
};

export interface UseIcsStatementsResult {
  months: IcsMonthCoverage[];
  missingMonths: IcsMonthCoverage[];
  latestMissingMonth: IcsMonthCoverage | null;
  hasAnyStatements: boolean;
  isLoading: boolean;
}

/**
 * Imported ICS statements + a contiguous month-by-month coverage timeline
 * (earliest statement → current month) flagging which months are missing.
 * Reads the user-scoped icsStatements collection client-side, mirroring the
 * Firestore read pattern in useReimbursements/useTransactions.
 */
export function useIcsStatements(): UseIcsStatementsResult {
  const { dataOwnerId } = useAuth();

  const { data: statements = [], isLoading } = useQuery({
    queryKey: icsStatementKeys.all(dataOwnerId ?? ''),
    queryFn: async (): Promise<IcsStatementSummary[]> => {
      if (!dataOwnerId) return [];
      const ref = collection(db, 'users', dataOwnerId, 'icsStatements');
      const snapshot = await getDocs(query(ref, orderBy('statementDate', 'asc')));
      return snapshot.docs.map((docSnap) => {
        const data = docSnap.data() as IcsStatementDoc;
        const statementDate = toDate(data.statementDate);
        return {
          statementId: docSnap.id,
          monthKey: monthKeyFor(docSnap.id, statementDate),
          total: data.totalNewExpenses ?? 0,
          transactionsCreated: data.transactionsCreated ?? 0,
          importedAt: toDate(data.importedAt),
        };
      });
    },
    enabled: !!dataOwnerId,
    staleTime: 60_000,
  });

  return useMemo(() => {
    const nowMonthKey = format(new Date(), 'yyyy-MM');
    const months = buildIcsCoverage(statements, nowMonthKey);
    return {
      months,
      missingMonths: pickMissing(months),
      latestMissingMonth: pickLatestMissing(months, nowMonthKey),
      hasAnyStatements: statements.length > 0,
      isLoading,
    };
  }, [statements, isLoading]);
}
