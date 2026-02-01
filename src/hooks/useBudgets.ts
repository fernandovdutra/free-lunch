import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  collection,
  query,
  orderBy,
  getDocs,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import type { Budget, BudgetFormData } from '@/types';
import { generateId } from '@/lib/utils';

// Firestore document shape
interface BudgetDocument {
  name: string;
  categoryId: string;
  monthlyLimit: number;
  alertThreshold?: number;
  isActive?: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

// Query keys
export const budgetKeys = {
  all: (userId: string) => ['budgets', userId] as const,
};

// Transform Firestore data to Budget type
function transformBudget(docSnap: QueryDocumentSnapshot): Budget {
  const data = docSnap.data() as BudgetDocument;
  return {
    id: docSnap.id,
    name: data.name,
    categoryId: data.categoryId,
    monthlyLimit: data.monthlyLimit,
    alertThreshold: data.alertThreshold ?? 80,
    isActive: data.isActive ?? true,
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
    updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(),
  };
}

export function useBudgets() {
  const { user } = useAuth();

  return useQuery({
    queryKey: budgetKeys.all(user?.id ?? ''),
    queryFn: async () => {
      if (!user?.id) return [];
      const budgetsRef = collection(db, 'users', user.id, 'budgets');
      const q = query(budgetsRef, orderBy('name'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(transformBudget);
    },
    enabled: !!user?.id,
  });
}

export function useCreateBudget() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: BudgetFormData) => {
      if (!user?.id) throw new Error('Not authenticated');
      const id = generateId();
      const budgetRef = doc(db, 'users', user.id, 'budgets', id);
      await setDoc(budgetRef, {
        ...data,
        isActive: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return id;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['budgets'] });
    },
  });
}

export function useUpdateBudget() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<BudgetFormData> }) => {
      if (!user?.id) throw new Error('Not authenticated');
      const budgetRef = doc(db, 'users', user.id, 'budgets', id);
      await updateDoc(budgetRef, {
        ...data,
        updatedAt: serverTimestamp(),
      });
      return id;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['budgets'] });
    },
  });
}

export function useDeleteBudget() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!user?.id) throw new Error('Not authenticated');
      const budgetRef = doc(db, 'users', user.id, 'budgets', id);
      await deleteDoc(budgetRef);
      return id;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['budgets'] });
    },
  });
}
