import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { queryKeys } from '@/lib/queryKeys';
import type { FixedCost } from '@/lib/burnUp.types';
import {
  sortItems,
  validateFixedCost,
  addItem,
  updateItem,
  deleteItem,
} from '@/lib/fixedSchedule';

/**
 * Reads the user-confirmed fixed-cost schedule from
 * `users/{uid}/settings/fixedSchedule`.
 *
 * Firestore shape: `{ items: FixedCost[] }`.
 *
 * Returns `[]` when missing so the burn-up chart renders correctly
 * (no hollow markers, footnote hidden) before the post-PR review
 * populates the doc.
 */
export function useFixedSchedule() {
  const { dataOwnerId } = useAuth();

  return useQuery({
    queryKey: queryKeys.fixedSchedule.all(dataOwnerId ?? ''),
    enabled: !!dataOwnerId,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<FixedCost[]> => {
      if (!dataOwnerId) return [];
      const ref = doc(db, 'users', dataOwnerId, 'settings', 'fixedSchedule');
      const snap = await getDoc(ref);
      if (!snap.exists()) return [];
      const data = snap.data() as { items?: FixedCost[] } | undefined;
      const items = Array.isArray(data?.items) ? data.items : [];
      return sortItems(items);
    },
  });
}

/**
 * Reads the latest items array directly from Firestore (cache-bypassing) so
 * concurrent edits across tabs don't race. Returns sorted items.
 */
async function fetchCurrentItems(uid: string): Promise<FixedCost[]> {
  const ref = doc(db, 'users', uid, 'settings', 'fixedSchedule');
  const snap = await getDoc(ref);
  if (!snap.exists()) return [];
  const data = snap.data() as { items?: FixedCost[] } | undefined;
  return sortItems(Array.isArray(data?.items) ? data.items : []);
}

async function writeItems(uid: string, items: FixedCost[]): Promise<void> {
  const ref = doc(db, 'users', uid, 'settings', 'fixedSchedule');
  await setDoc(ref, { items });
}

export function useAddFixedCost() {
  const queryClient = useQueryClient();
  const { dataOwnerId } = useAuth();

  return useMutation({
    mutationFn: async (item: FixedCost) => {
      if (!dataOwnerId) throw new Error('Not authenticated');
      validateFixedCost(item);
      const current = await fetchCurrentItems(dataOwnerId);
      const next = addItem(current, item);
      await writeItems(dataOwnerId, next);
      return next;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['fixedSchedule'] });
    },
  });
}

export function useUpdateFixedCost() {
  const queryClient = useQueryClient();
  const { dataOwnerId } = useAuth();

  return useMutation({
    mutationFn: async ({ index, item }: { index: number; item: FixedCost }) => {
      if (!dataOwnerId) throw new Error('Not authenticated');
      validateFixedCost(item);
      const current = await fetchCurrentItems(dataOwnerId);
      const next = updateItem(current, index, item);
      await writeItems(dataOwnerId, next);
      return next;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['fixedSchedule'] });
    },
  });
}

export function useDeleteFixedCost() {
  const queryClient = useQueryClient();
  const { dataOwnerId } = useAuth();

  return useMutation({
    mutationFn: async (index: number) => {
      if (!dataOwnerId) throw new Error('Not authenticated');
      const current = await fetchCurrentItems(dataOwnerId);
      const next = deleteItem(current, index);
      await writeItems(dataOwnerId, next);
      return next;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['fixedSchedule'] });
    },
  });
}
