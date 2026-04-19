import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  doc,
  updateDoc,
  Timestamp,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import type { Insight } from '@/types';

interface InsightDocument {
  type: Insight['type'];
  periodStart: Timestamp;
  periodEnd: Timestamp;
  generatedAt: Timestamp;
  summary: string;
  highlights?: Insight['highlights'];
  recommendations?: Insight['recommendations'];
  anomalies?: Insight['anomalies'];
  goalProgress?: Insight['goalProgress'];
  investmentSummary?: Insight['investmentSummary'];
  narrative?: string;
  emailSentAt?: Timestamp | null;
  isRead?: boolean;
}

export const insightKeys = {
  all: (userId: string) => ['insights', userId] as const,
  detail: (userId: string, id: string) => ['insights', userId, id] as const,
};

function transformInsight(docSnap: QueryDocumentSnapshot): Insight {
  const data = docSnap.data() as InsightDocument;
  return {
    id: docSnap.id,
    type: data.type,
    periodStart: data.periodStart instanceof Timestamp ? data.periodStart.toDate() : new Date(),
    periodEnd: data.periodEnd instanceof Timestamp ? data.periodEnd.toDate() : new Date(),
    generatedAt: data.generatedAt instanceof Timestamp ? data.generatedAt.toDate() : new Date(),
    summary: data.summary,
    highlights: data.highlights ?? [],
    recommendations: data.recommendations ?? [],
    anomalies: data.anomalies ?? [],
    goalProgress: data.goalProgress ?? [],
    investmentSummary: data.investmentSummary ?? null,
    narrative: data.narrative ?? '',
    emailSentAt:
      data.emailSentAt instanceof Timestamp ? data.emailSentAt.toDate() : null,
    isRead: data.isRead ?? false,
  };
}

export function useInsights(maxCount = 20) {
  const { user } = useAuth();

  return useQuery({
    queryKey: [...insightKeys.all(user?.id ?? ''), maxCount],
    queryFn: async () => {
      if (!user?.id) return [];
      const insightsRef = collection(db, 'users', user.id, 'insights');
      const q = query(insightsRef, orderBy('generatedAt', 'desc'), limit(maxCount));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(transformInsight);
    },
    enabled: !!user?.id,
  });
}

export function useMarkInsightRead() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (insightId: string) => {
      if (!user?.id) throw new Error('Not authenticated');
      const insightRef = doc(db, 'users', user.id, 'insights', insightId);
      await updateDoc(insightRef, { isRead: true });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['insights'] });
    },
  });
}

export function useGenerateOnDemandInsight() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      question?: string;
      startDate?: string;
      endDate?: string;
    }) => {
      const fn = httpsCallable<
        typeof params,
        { insightId: string; summary: string; narrative: string }
      >(functions, 'generateOnDemandInsight');
      const result = await fn(params);
      return result.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['insights'] });
    },
  });
}
