import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { doc, getDoc, type Timestamp } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { queryKeys } from '@/lib/queryKeys';

// ---- Types ----

export interface AdvisorMemoryMeta {
  updatedAt: Date | null;
  consolidatedAt: Date | null;
  baselinesCount: number;
  merchantsCount: number;
  behavioralPatternsCount: number;
  temporalPatternsCount: number;
}

interface RefreshResult {
  success: boolean;
  baselines: number;
  merchants: number;
  patterns: number;
}

// ---- Firestore read: memory metadata ----

export function useAdvisorMemoryMeta() {
  const { dataOwnerId } = useAuth();

  return useQuery({
    queryKey: queryKeys.advisorMemory.meta(dataOwnerId ?? ''),
    queryFn: async (): Promise<AdvisorMemoryMeta> => {
      if (!dataOwnerId) {
        return {
          updatedAt: null,
          consolidatedAt: null,
          baselinesCount: 0,
          merchantsCount: 0,
          behavioralPatternsCount: 0,
          temporalPatternsCount: 0,
        };
      }

      const ref = doc(db, 'users', dataOwnerId, 'advisorMemory', 'current');
      const snap = await getDoc(ref);

      if (!snap.exists()) {
        return {
          updatedAt: null,
          consolidatedAt: null,
          baselinesCount: 0,
          merchantsCount: 0,
          behavioralPatternsCount: 0,
          temporalPatternsCount: 0,
        };
      }

      // Firestore returns loosely-typed DocumentData; cast to the shape we
      // expect but keep the timestamp accessors optional so a malformed
      // field degrades to null instead of throwing inside the queryFn.
      const data = snap.data() as {
        updatedAt?: Partial<Timestamp>;
        consolidatedAt?: Partial<Timestamp>;
        spendingBaselines?: unknown[];
        knownMerchants?: unknown[];
        behavioralPatterns?: unknown[];
        temporalPatterns?: unknown[];
      };
      return {
        updatedAt: data.updatedAt?.toDate?.() ?? null,
        consolidatedAt: data.consolidatedAt?.toDate?.() ?? null,
        baselinesCount: data.spendingBaselines?.length ?? 0,
        merchantsCount: data.knownMerchants?.length ?? 0,
        behavioralPatternsCount: data.behavioralPatterns?.length ?? 0,
        temporalPatternsCount: data.temporalPatterns?.length ?? 0,
      };
    },
    enabled: !!dataOwnerId,
    staleTime: 60_000, // 1 minute
  });
}

// ---- Cloud Function: refresh memory ----

const refreshAdvisorMemoryFn = httpsCallable<undefined, RefreshResult>(
  functions,
  'refreshAdvisorMemory'
);

export function useRefreshAdvisorMemory() {
  const queryClient = useQueryClient();
  const { dataOwnerId } = useAuth();

  return useMutation({
    mutationFn: async () => {
      const result = await refreshAdvisorMemoryFn();
      return result.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.advisorMemory.all(dataOwnerId ?? '') });
    },
  });
}
