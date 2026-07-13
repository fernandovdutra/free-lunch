import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { queryKeys } from '@/lib/queryKeys';
import {
  monthMarkedKeys,
  markPosted,
  unmarkPosted,
  type FixedMatchesDoc,
} from '@/lib/fixedMatches';

/**
 * Per-month manual "mark as posted" overrides for fixed costs, stored at
 * `users/{uid}/settings/fixedMatches`. See `src/lib/fixedMatches.ts` for the
 * doc shape. Marking a schedule item posted moves it into the burn-up
 * matcher's `posted` bucket, removing it from the "still to post" footnote,
 * the hollow chart markers, and the projection step-ups.
 */

const matchesRef = (uid: string) => doc(db, 'users', uid, 'settings', 'fixedMatches');

async function fetchMatches(uid: string): Promise<FixedMatchesDoc> {
  const snap = await getDoc(matchesRef(uid));
  if (!snap.exists()) return { months: {} };
  const data = snap.data() as FixedMatchesDoc | undefined;
  return { months: data?.months ?? {} };
}

/**
 * Keys (`fixedCostKey`) the user has manually marked "already posted" for the
 * given month. Empty set when unauthenticated, missing doc, or none marked.
 */
export function useFixedMatches(monthKey: string) {
  const { dataOwnerId } = useAuth();

  return useQuery({
    queryKey: queryKeys.fixedMatches.month(dataOwnerId ?? '', monthKey),
    enabled: !!dataOwnerId,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<Set<string>> => {
      if (!dataOwnerId) return new Set();
      const data = await fetchMatches(dataOwnerId);
      return monthMarkedKeys(data, monthKey);
    },
  });
}

interface MarkVars {
  monthKey: string;
  key: string;
}

/** Optimistically toggle a key in the cached Set for `[fixedMatches, uid, monthKey]`. */
function useToggleMark(
  apply: (doc: FixedMatchesDoc, monthKey: string, key: string) => FixedMatchesDoc,
  mutate: (prev: Set<string>, key: string) => Set<string>
) {
  const queryClient = useQueryClient();
  const { dataOwnerId } = useAuth();

  return useMutation({
    mutationFn: async ({ monthKey, key }: MarkVars) => {
      if (!dataOwnerId) throw new Error('Not authenticated');
      const current = await fetchMatches(dataOwnerId);
      await setDoc(matchesRef(dataOwnerId), apply(current, monthKey, key));
    },
    onMutate: async ({ monthKey, key }: MarkVars) => {
      const qk = queryKeys.fixedMatches.month(dataOwnerId ?? '', monthKey);
      await queryClient.cancelQueries({ queryKey: qk });
      const prev = queryClient.getQueryData<Set<string>>(qk);
      queryClient.setQueryData<Set<string>>(qk, mutate(prev ?? new Set(), key));
      return { qk, prev };
    },
    onError: (_err, _vars, context) => {
      if (context) queryClient.setQueryData(context.qk, context.prev);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.fixedMatches.root });
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.root });
    },
  });
}

export function useMarkFixedPosted() {
  return useToggleMark(markPosted, (prev, key) => new Set(prev).add(key));
}

export function useUnmarkFixedPosted() {
  return useToggleMark(unmarkPosted, (prev, key) => {
    const next = new Set(prev);
    next.delete(key);
    return next;
  });
}
