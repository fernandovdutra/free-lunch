import { useQuery } from '@tanstack/react-query';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import type { FixedCost } from '@/lib/burnUp.types';

/**
 * Reads the user-confirmed fixed-cost schedule from
 * `users/{uid}/settings/fixedSchedule`.
 *
 * Firestore shape: `{ items: FixedCost[] }`.
 *
 * Returns `[]` when missing so the burn-up chart renders correctly
 * (no hollow markers, footnote hidden) before the post-PR review
 * populates the doc.
 */
export function useFixedSchedule() {
  const { dataOwnerId } = useAuth();

  return useQuery({
    queryKey: ['fixedSchedule', dataOwnerId ?? ''],
    enabled: !!dataOwnerId,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<FixedCost[]> => {
      if (!dataOwnerId) return [];
      const ref = doc(db, 'users', dataOwnerId, 'settings', 'fixedSchedule');
      const snap = await getDoc(ref);
      if (!snap.exists()) return [];
      const data = snap.data() as { items?: FixedCost[] } | undefined;
      return Array.isArray(data?.items) ? data.items : [];
    },
  });
}
