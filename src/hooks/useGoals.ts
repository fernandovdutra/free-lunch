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
import type { Goal, GoalFormData } from '@/types';
import { generateId } from '@/lib/utils';

interface GoalDocument {
  name: string;
  type: Goal['type'];
  targetAmount: number;
  currentAmount: number;
  startDate: Timestamp;
  targetDate?: Timestamp | null;
  status: Goal['status'];
  linkedCategoryIds?: string[] | null;
  notes?: string | null;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export const goalKeys = {
  all: (userId: string) => ['goals', userId] as const,
};

function transformGoal(docSnap: QueryDocumentSnapshot): Goal {
  const data = docSnap.data() as GoalDocument;
  return {
    id: docSnap.id,
    name: data.name,
    type: data.type,
    targetAmount: data.targetAmount,
    currentAmount: data.currentAmount,
    startDate: data.startDate instanceof Timestamp ? data.startDate.toDate() : new Date(),
    targetDate: data.targetDate instanceof Timestamp ? data.targetDate.toDate() : null,
    status: data.status,
    linkedCategoryIds: data.linkedCategoryIds ?? null,
    notes: data.notes ?? null,
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
    updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(),
  };
}

export function useGoals() {
  const { user } = useAuth();

  return useQuery({
    queryKey: goalKeys.all(user?.id ?? ''),
    queryFn: async () => {
      if (!user?.id) return [];
      const goalsRef = collection(db, 'users', user.id, 'goals');
      const q = query(goalsRef, orderBy('name'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(transformGoal);
    },
    enabled: !!user?.id,
  });
}

export function useCreateGoal() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: GoalFormData) => {
      if (!user?.id) throw new Error('Not authenticated');
      const id = generateId();
      const goalRef = doc(db, 'users', user.id, 'goals', id);
      await setDoc(goalRef, {
        ...data,
        startDate: Timestamp.fromDate(data.startDate),
        targetDate: data.targetDate ? Timestamp.fromDate(data.targetDate) : null,
        status: 'active',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return id;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['goals'] });
    },
  });
}

export function useUpdateGoal() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<GoalFormData & { status: Goal['status']; currentAmount: number }> }) => {
      if (!user?.id) throw new Error('Not authenticated');
      const goalRef = doc(db, 'users', user.id, 'goals', id);
      const updateData: Record<string, unknown> = {
        ...data,
        updatedAt: serverTimestamp(),
      };
      if (data.startDate) updateData.startDate = Timestamp.fromDate(data.startDate);
      if (data.targetDate) updateData.targetDate = Timestamp.fromDate(data.targetDate);
      if (data.targetDate === null) updateData.targetDate = null;
      await updateDoc(goalRef, updateData);
      return id;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['goals'] });
    },
  });
}

export function useDeleteGoal() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!user?.id) throw new Error('Not authenticated');
      const goalRef = doc(db, 'users', user.id, 'goals', id);
      await deleteDoc(goalRef);
      return id;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['goals'] });
    },
  });
}
