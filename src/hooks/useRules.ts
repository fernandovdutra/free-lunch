import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  collection,
  query,
  orderBy,
  getDocs,
  doc,
  deleteDoc,
  getDoc,
  Timestamp,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { queryKeys } from '@/lib/queryKeys';
import type { CategorizationRule } from '@/types';
import { upsertCategorizationRule } from '@/lib/categorizationCommands';

// Firestore document shape
interface RuleDocument {
  pattern: string;
  matchType: 'contains' | 'exact' | 'regex';
  categoryId: string;
  priority?: number;
  isLearned?: boolean;
  isSystem?: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  enabled?: boolean;
  confirmed?: boolean;
  version?: number;
  targetField?: 'counterparty' | 'description' | 'combined';
}

// Query keys — delegated to the central factory (src/lib/queryKeys.ts).
export const ruleKeys = {
  all: (userId: string) => queryKeys.rules.all(userId),
};

// Transform Firestore data to CategorizationRule type
function transformRule(docSnap: QueryDocumentSnapshot): CategorizationRule {
  const data = docSnap.data() as RuleDocument;
  return {
    id: docSnap.id,
    pattern: data.pattern,
    matchType: data.matchType,
    categoryId: data.categoryId,
    priority: data.priority ?? 0,
    isLearned: data.isLearned ?? false,
    isSystem: data.isSystem ?? false,
    enabled: data.enabled !== false,
    confirmed: data.confirmed === true,
    version: data.version ?? 0,
    targetField: data.targetField ?? 'combined',
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
    updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(),
  };
}

export function useRules() {
  const { dataOwnerId } = useAuth();

  return useQuery({
    queryKey: ruleKeys.all(dataOwnerId ?? ''),
    queryFn: async () => {
      if (!dataOwnerId) return [];
      const rulesRef = collection(db, 'users', dataOwnerId, 'rules');
      const q = query(rulesRef, orderBy('priority', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(transformRule);
    },
    enabled: !!dataOwnerId,
  });
}

export interface CreateRuleData {
  pattern: string;
  matchType: 'contains' | 'exact' | 'regex';
  categoryId: string;
  isLearned?: boolean;
  id?: string;
  expectedVersion?: number;
  targetField?: 'counterparty' | 'description' | 'combined';
}

export function useCreateRule() {
  const queryClient = useQueryClient();
  const { dataOwnerId } = useAuth();

  return useMutation({
    mutationFn: async (data: CreateRuleData) => {
      if (!dataOwnerId) throw new Error('Not authenticated');
      if (data.matchType === 'regex') throw new Error('New regex rules are not supported');
      const { data: result } = await upsertCategorizationRule({ ...(data.id ? { id: data.id } : {}),
        ...(data.expectedVersion !== undefined ? { expectedVersion: data.expectedVersion } : {}), pattern: data.pattern, matchType: data.matchType,
        categoryId: data.categoryId, targetField: data.targetField ?? 'combined', enabled: true });
      return result.id;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['rules'] });
    },
  });
}

export function useDeleteRule() {
  const queryClient = useQueryClient();
  const { dataOwnerId } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!dataOwnerId) throw new Error('Not authenticated');
      const ruleRef = doc(db, 'users', dataOwnerId, 'rules', id);
      const snap = await getDoc(ruleRef);
      if (!snap.exists()) throw new Error('Rule not found');
      const data = snap.data() as RuleDocument;
      if (data.confirmed) {
        if (data.matchType === 'regex') throw new Error('Legacy regex rule needs manual review');
        await upsertCategorizationRule({ id, expectedVersion: data.version ?? 0,
          pattern: data.pattern, matchType: data.matchType, targetField: data.targetField ?? 'combined',
          categoryId: data.categoryId, enabled: false });
      } else await deleteDoc(ruleRef);
      return id;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['rules'] });
    },
  });
}
