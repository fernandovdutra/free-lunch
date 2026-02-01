import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  collection,
  query,
  orderBy,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import type { CategorizationRule } from '@/types';
import { generateId } from '@/lib/utils';

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
}

// Query keys
export const ruleKeys = {
  all: (userId: string) => ['rules', userId] as const,
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
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
    updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(),
  };
}

export function useRules() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ruleKeys.all(user?.id ?? ''),
    queryFn: async () => {
      if (!user?.id) return [];
      const rulesRef = collection(db, 'users', user.id, 'rules');
      const q = query(rulesRef, orderBy('priority', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(transformRule);
    },
    enabled: !!user?.id,
  });
}

export interface CreateRuleData {
  pattern: string;
  matchType: 'contains' | 'exact' | 'regex';
  categoryId: string;
  isLearned?: boolean;
}

export function useCreateRule() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: CreateRuleData) => {
      if (!user?.id) throw new Error('Not authenticated');
      const id = generateId();
      const ruleRef = doc(db, 'users', user.id, 'rules', id);
      await setDoc(ruleRef, {
        pattern: data.pattern,
        matchType: data.matchType,
        categoryId: data.categoryId,
        priority: Date.now(), // Higher = newer = checked first
        isLearned: data.isLearned ?? true,
        isSystem: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return id;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['rules'] });
    },
  });
}

export function useDeleteRule() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!user?.id) throw new Error('Not authenticated');
      const ruleRef = doc(db, 'users', user.id, 'rules', id);
      await deleteDoc(ruleRef);
      return id;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['rules'] });
    },
  });
}
