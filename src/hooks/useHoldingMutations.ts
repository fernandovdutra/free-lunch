import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  arrayUnion,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { generateId } from '@/lib/utils';
import { todayIso } from '@/lib/holdingsMapping';
import type { Holding, HistoryPoint } from '@/types/wealth';

/** Detail fields that Edit-details may patch — deliberately excludes value/history. */
const EDITABLE_DETAIL_KEYS = [
  'name',
  'platform',
  'type',
  'cost',
  'units',
  'liquidity',
  'updateSource',
  'currency',
  'notes',
  'symbol',
] as const;

type DetailPatch = Partial<Pick<Holding, (typeof EDITABLE_DETAIL_KEYS)[number]>>;

function pickDetailFields(patch: Partial<Holding>): DetailPatch {
  const out: Record<string, unknown> = {};
  for (const key of EDITABLE_DETAIL_KEYS) {
    if (key in patch && patch[key] !== undefined) out[key] = patch[key];
  }
  return out as DetailPatch;
}

/** Apply a function to every cached holdings list (across data-owner scopes). */
function patchHoldingsCache(
  queryClient: ReturnType<typeof useQueryClient>,
  fn: (holdings: Holding[]) => Holding[]
) {
  queryClient.setQueriesData<Holding[]>({ queryKey: ['holdings'] }, (old) => (old ? fn(old) : old));
}

/**
 * Append a dated value point and update the holding's current value. Backs both
 * the Update-value dialog and the check-in flow. Every confirmed value writes a
 * history point so the charts reflect observed values.
 */
export function useUpdateHoldingValue() {
  const queryClient = useQueryClient();
  const { dataOwnerId } = useAuth();

  return useMutation({
    mutationFn: async ({
      id,
      point,
      nativeValue,
    }: {
      id: string;
      point: HistoryPoint;
      /** Value in the holding's native currency, when not EUR. `point.value` stays EUR. */
      nativeValue?: number | null;
    }) => {
      if (!dataOwnerId) throw new Error('Not authenticated');
      const ref = doc(db, 'users', dataOwnerId, 'holdings', id);
      const date = Timestamp.fromDate(new Date(point.date));
      await updateDoc(ref, {
        history: arrayUnion({ date, value: point.value }),
        value: point.value,
        ...(nativeValue !== undefined ? { nativeValue } : {}),
        lastValueAt: date,
        updatedAt: serverTimestamp(),
      });
      return id;
    },
    onMutate: async ({ id, point, nativeValue }) => {
      await queryClient.cancelQueries({ queryKey: ['holdings'] });
      const previous = queryClient.getQueriesData({ queryKey: ['holdings'] });
      patchHoldingsCache(queryClient, (holdings) =>
        holdings.map((h) => {
          if (h.id !== id) return h;
          const history = [...h.history, point].sort((a, b) =>
            a.date < b.date ? -1 : a.date > b.date ? 1 : 0
          );
          return {
            ...h,
            history,
            value: history[history.length - 1]!.value,
            ...(nativeValue !== undefined ? { nativeValue } : {}),
            updatedDaysAgo: 0,
          };
        })
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      context?.previous.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['holdings'] });
    },
  });
}

/**
 * Update a holding's attributes (name, platform, type, cost, liquidity, source,
 * notes, symbol) WITHOUT writing a history point — distinct from a value update.
 */
export function useUpdateHoldingDetails() {
  const queryClient = useQueryClient();
  const { dataOwnerId } = useAuth();

  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Holding> }) => {
      if (!dataOwnerId) throw new Error('Not authenticated');
      const ref = doc(db, 'users', dataOwnerId, 'holdings', id);
      await updateDoc(ref, {
        ...pickDetailFields(patch),
        updatedAt: serverTimestamp(),
      });
      return id;
    },
    onMutate: async ({ id, patch }) => {
      await queryClient.cancelQueries({ queryKey: ['holdings'] });
      const previous = queryClient.getQueriesData({ queryKey: ['holdings'] });
      const fields = pickDetailFields(patch);
      patchHoldingsCache(queryClient, (holdings) =>
        holdings.map((h) => (h.id === id ? { ...h, ...fields } : h))
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      context?.previous.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['holdings'] });
    },
  });
}

/**
 * Create a new holding (manual entry, v1). Seeds today's history point and
 * returns the runtime Holding so the caller can immediately open Edit-details.
 */
export function useCreateHolding() {
  const queryClient = useQueryClient();
  const { dataOwnerId } = useAuth();

  return useMutation({
    mutationFn: async (seed?: Partial<Holding>): Promise<Holding> => {
      if (!dataOwnerId) throw new Error('Not authenticated');
      const id = generateId();
      const now = new Date();
      const date = todayIso(now);
      const value = seed?.value ?? 0;

      const holding: Holding = {
        id,
        name: seed?.name ?? 'New Holding',
        platform: seed?.platform ?? 'Manual',
        type: seed?.type ?? 'Cash',
        kind: seed?.kind ?? 'asset',
        value,
        cost: seed?.cost ?? 0,
        units: seed?.units ?? null,
        liquidity: seed?.liquidity ?? 'liquid',
        updateSource: seed?.updateSource ?? 'manual',
        currency: seed?.currency ?? 'EUR',
        updatedDaysAgo: 0,
        notes: seed?.notes ?? null,
        symbol: seed?.symbol ?? null,
        history: [{ date, value }],
      };

      const ref = doc(db, 'users', dataOwnerId, 'holdings', id);
      const ts = Timestamp.fromDate(now);
      await setDoc(ref, {
        name: holding.name,
        platform: holding.platform,
        type: holding.type,
        kind: holding.kind,
        value: holding.value,
        cost: holding.cost,
        units: holding.units,
        liquidity: holding.liquidity,
        updateSource: holding.updateSource,
        currency: holding.currency,
        nativeValue: null,
        notes: holding.notes,
        symbol: holding.symbol,
        history: [{ date: ts, value }],
        lastValueAt: ts,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return holding;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['holdings'] });
    },
  });
}

/** Delete a holding. */
export function useDeleteHolding() {
  const queryClient = useQueryClient();
  const { dataOwnerId } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!dataOwnerId) throw new Error('Not authenticated');
      const ref = doc(db, 'users', dataOwnerId, 'holdings', id);
      await deleteDoc(ref);
      return id;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['holdings'] });
      const previous = queryClient.getQueriesData({ queryKey: ['holdings'] });
      patchHoldingsCache(queryClient, (holdings) => holdings.filter((h) => h.id !== id));
      return { previous };
    },
    onError: (_err, _id, context) => {
      context?.previous.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['holdings'] });
    },
  });
}
