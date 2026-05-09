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
import type { Investment, InvestmentFormData, InvestmentEntry } from '@/types';
import { generateId } from '@/lib/utils';

interface InvestmentDocument {
  name: string;
  platform: string;
  type: Investment['type'];
  entries?: { date: Timestamp; marketValue: number; costBasis: number }[];
  currency?: string;
  notes?: string | null;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export const investmentKeys = {
  all: (userId: string) => ['investments', userId] as const,
};

function transformInvestment(docSnap: QueryDocumentSnapshot): Investment {
  const data = docSnap.data() as InvestmentDocument;
  return {
    id: docSnap.id,
    name: data.name,
    platform: data.platform,
    type: data.type,
    entries: (data.entries ?? []).map((e) => ({
      date: e.date instanceof Timestamp ? e.date.toDate() : new Date(),
      marketValue: e.marketValue,
      costBasis: e.costBasis,
    })),
    currency: data.currency ?? 'EUR',
    notes: data.notes ?? null,
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
    updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(),
  };
}

export function useInvestments() {
  const { dataOwnerId } = useAuth();

  return useQuery({
    queryKey: investmentKeys.all(dataOwnerId ?? ''),
    queryFn: async () => {
      if (!dataOwnerId) return [];
      const investmentsRef = collection(db, 'users', dataOwnerId, 'investments');
      const q = query(investmentsRef, orderBy('name'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(transformInvestment);
    },
    enabled: !!dataOwnerId,
  });
}

export function useCreateInvestment() {
  const queryClient = useQueryClient();
  const { dataOwnerId } = useAuth();

  return useMutation({
    mutationFn: async (data: InvestmentFormData) => {
      if (!dataOwnerId) throw new Error('Not authenticated');
      const id = generateId();
      const investmentRef = doc(db, 'users', dataOwnerId, 'investments', id);
      await setDoc(investmentRef, {
        ...data,
        entries: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return id;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['investments'] });
    },
  });
}

export function useUpdateInvestment() {
  const queryClient = useQueryClient();
  const { dataOwnerId } = useAuth();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InvestmentFormData> }) => {
      if (!dataOwnerId) throw new Error('Not authenticated');
      const investmentRef = doc(db, 'users', dataOwnerId, 'investments', id);
      await updateDoc(investmentRef, {
        ...data,
        updatedAt: serverTimestamp(),
      });
      return id;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['investments'] });
    },
  });
}

export function useAddInvestmentEntry() {
  const queryClient = useQueryClient();
  const { dataOwnerId } = useAuth();

  return useMutation({
    mutationFn: async ({ investmentId, entry }: { investmentId: string; entry: InvestmentEntry }) => {
      if (!dataOwnerId) throw new Error('Not authenticated');
      const investmentRef = doc(db, 'users', dataOwnerId, 'investments', investmentId);
      const snapshot = await getDocs(
        query(collection(db, 'users', dataOwnerId, 'investments'))
      );
      const existingDoc = snapshot.docs.find((d) => d.id === investmentId);
      const existingEntries = (existingDoc?.data() as InvestmentDocument | undefined)?.entries ?? [];

      await updateDoc(investmentRef, {
        entries: [
          ...existingEntries,
          {
            date: Timestamp.fromDate(entry.date),
            marketValue: entry.marketValue,
            costBasis: entry.costBasis,
          },
        ],
        updatedAt: serverTimestamp(),
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['investments'] });
    },
  });
}

export function useDeleteInvestment() {
  const queryClient = useQueryClient();
  const { dataOwnerId } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!dataOwnerId) throw new Error('Not authenticated');
      const investmentRef = doc(db, 'users', dataOwnerId, 'investments', id);
      await deleteDoc(investmentRef);
      return id;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['investments'] });
    },
  });
}
