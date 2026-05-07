import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { doc, getDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';

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
  const { user } = useAuth();

  return useQuery({
    queryKey: ['advisorMemory', user?.id, 'meta'],
    queryFn: async (): Promise<AdvisorMemoryMeta> => {
      if (!user?.id) {
        return {
          updatedAt: null,
          consolidatedAt: null,
          baselinesCount: 0,
          merchantsCount: 0,
          behavioralPatternsCount: 0,
          temporalPatternsCount: 0,
        };
      }

      const ref = doc(db, 'users', user.id, 'advisorMemory', 'current');
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

      const data = snap.data();
      return {
        updatedAt: data['updatedAt']?.toDate?.() ?? null,
        consolidatedAt: data['consolidatedAt']?.toDate?.() ?? null,
        baselinesCount: (data['spendingBaselines'] as unknown[])?.length ?? 0,
        merchantsCount: (data['knownMerchants'] as unknown[])?.length ?? 0,
        behavioralPatternsCount: (data['behavioralPatterns'] as unknown[])?.length ?? 0,
        temporalPatternsCount: (data['temporalPatterns'] as unknown[])?.length ?? 0,
      };
    },
    enabled: !!user?.id,
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
  const { user } = useAuth();

  return useMutation({
    mutationFn: async () => {
      const result = await refreshAdvisorMemoryFn();
      return result.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['advisorMemory', user?.id] });
    },
  });
}
