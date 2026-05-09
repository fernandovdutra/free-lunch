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
import type { Debt, DebtFormData } from '@/types';
import { generateId } from '@/lib/utils';

interface DebtDocument {
  name: string;
  type: Debt['type'];
  balance: number;
  originalAmount: number | null;
  interestRate: number | null;
  monthlyPayment: number | null;
  notes: string | null;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export const debtKeys = {
  all: (userId: string) => ['debts', userId] as const,
};

function transformDebt(docSnap: QueryDocumentSnapshot): Debt {
  const data = docSnap.data() as DebtDocument;
  return {
    id: docSnap.id,
    name: data.name,
    type: data.type,
    balance: data.balance,
    originalAmount: data.originalAmount ?? null,
    interestRate: data.interestRate ?? null,
    monthlyPayment: data.monthlyPayment ?? null,
    notes: data.notes ?? null,
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
    updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(),
  };
}

export function useDebts() {
  const { dataOwnerId } = useAuth();

  return useQuery({
    queryKey: debtKeys.all(dataOwnerId ?? ''),
    queryFn: async () => {
      if (!dataOwnerId) return [];
      const debtsRef = collection(db, 'users', dataOwnerId, 'debts');
      const q = query(debtsRef, orderBy('name'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(transformDebt);
    },
    enabled: !!dataOwnerId,
  });
}

export function useCreateDebt() {
  const queryClient = useQueryClient();
  const { dataOwnerId } = useAuth();

  return useMutation({
    mutationFn: async (data: DebtFormData) => {
      if (!dataOwnerId) throw new Error('Not authenticated');
      const id = generateId();
      const debtRef = doc(db, 'users', dataOwnerId, 'debts', id);
      await setDoc(debtRef, {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return id;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['debts'] });
    },
  });
}

export function useUpdateDebt() {
  const queryClient = useQueryClient();
  const { dataOwnerId } = useAuth();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<DebtFormData> }) => {
      if (!dataOwnerId) throw new Error('Not authenticated');
      const debtRef = doc(db, 'users', dataOwnerId, 'debts', id);
      await updateDoc(debtRef, {
        ...data,
        updatedAt: serverTimestamp(),
      });
      return id;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['debts'] });
    },
  });
}

export function useDeleteDebt() {
  const queryClient = useQueryClient();
  const { dataOwnerId } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!dataOwnerId) throw new Error('Not authenticated');
      const debtRef = doc(db, 'users', dataOwnerId, 'debts', id);
      await deleteDoc(debtRef);
      return id;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['debts'] });
    },
  });
}
