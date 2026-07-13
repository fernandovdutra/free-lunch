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
import { queryKeys } from '@/lib/queryKeys';
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

// Query keys — delegated to the central factory (src/lib/queryKeys.ts).
export const budgetKeys = {
  all: (userId: string) => queryKeys.budgets.all(userId),
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
  const { dataOwnerId } = useAuth();

  return useQuery({
    queryKey: budgetKeys.all(dataOwnerId ?? ''),
    queryFn: async () => {
      if (!dataOwnerId) return [];
      const budgetsRef = collection(db, 'users', dataOwnerId, 'budgets');
      const q = query(budgetsRef, orderBy('name'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(transformBudget);
    },
    enabled: !!dataOwnerId,
  });
}

export function useCreateBudget() {
  const queryClient = useQueryClient();
  const { dataOwnerId } = useAuth();

  return useMutation({
    mutationFn: async (data: BudgetFormData) => {
      if (!dataOwnerId) throw new Error('Not authenticated');
      const id = generateId();
      const budgetRef = doc(db, 'users', dataOwnerId, 'budgets', id);
      await setDoc(budgetRef, {
        ...data,
        isActive: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return id;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.budgets.root });
      // Budget progress is derived per budget — refetch after any budget change.
      void queryClient.invalidateQueries({ queryKey: queryKeys.budgetProgress.root });
    },
  });
}

export function useUpdateBudget() {
  const queryClient = useQueryClient();
  const { dataOwnerId } = useAuth();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<BudgetFormData> }) => {
      if (!dataOwnerId) throw new Error('Not authenticated');
      const budgetRef = doc(db, 'users', dataOwnerId, 'budgets', id);
      await updateDoc(budgetRef, {
        ...data,
        updatedAt: serverTimestamp(),
      });
      return id;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.budgets.root });
      // Budget progress is derived per budget — refetch after any budget change.
      void queryClient.invalidateQueries({ queryKey: queryKeys.budgetProgress.root });
    },
  });
}

export function useDeleteBudget() {
  const queryClient = useQueryClient();
  const { dataOwnerId } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!dataOwnerId) throw new Error('Not authenticated');
      const budgetRef = doc(db, 'users', dataOwnerId, 'budgets', id);
      await deleteDoc(budgetRef);
      return id;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.budgets.root });
      // Budget progress is derived per budget — refetch after any budget change.
      void queryClient.invalidateQueries({ queryKey: queryKeys.budgetProgress.root });
    },
  });
}
