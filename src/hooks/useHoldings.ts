import { useQuery } from '@tanstack/react-query';
import {
  collection,
  query,
  orderBy,
  getDocs,
  Timestamp,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { queryKeys } from '@/lib/queryKeys';
import { deriveUpdatedDaysAgo } from '@/lib/holdingsMapping';
import type {
  AssetType,
  CurrencyCode,
  HistoryPoint,
  Holding,
  HoldingKind,
  Liquidity,
  UpdateSource,
} from '@/types/wealth';

/** Firestore-side history point — dates may be Timestamps or already-ISO strings. */
type StoredHistoryPoint = { date: Timestamp | string; value: number };

export interface HoldingDocument {
  name: string;
  platform: string;
  type: AssetType;
  kind: HoldingKind;
  value: number;
  cost?: number;
  units?: number | null;
  liquidity: Liquidity;
  updateSource: UpdateSource;
  currency?: CurrencyCode | null;
  nativeValue?: number | null;
  notes?: string | null;
  symbol?: string | null;
  bankConnectionId?: string | null;
  bankAccountUid?: string | null;
  livePrice?: number | null;
  prevPrice?: number | null;
  priceUpdatedAt?: Timestamp | null;
  history?: StoredHistoryPoint[];
  lastValueAt?: Timestamp;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

// Query keys — delegated to the central factory (src/lib/queryKeys.ts).
export const holdingKeys = {
  all: (userId: string) => queryKeys.holdings.all(userId),
};

function pointDateToIso(date: Timestamp | string): string {
  if (date instanceof Timestamp) return date.toDate().toISOString().slice(0, 10);
  // Already an ISO string (or ISO datetime) — keep just the date portion.
  return date.slice(0, 10);
}

export function transformHolding(docSnap: QueryDocumentSnapshot): Holding {
  const data = docSnap.data() as HoldingDocument;

  const history: HistoryPoint[] = (data.history ?? [])
    .map((p) => ({ date: pointDateToIso(p.date), value: p.value }))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  const lastValueMs =
    data.lastValueAt instanceof Timestamp
      ? data.lastValueAt.toMillis()
      : history.length > 0
        ? new Date(history[history.length - 1]!.date).getTime()
        : Date.now();

  const holding: Holding = {
    id: docSnap.id,
    name: data.name,
    platform: data.platform,
    type: data.type,
    kind: data.kind,
    value: data.value,
    cost: data.cost ?? 0,
    units: data.units ?? null,
    liquidity: data.liquidity,
    updateSource: data.updateSource,
    currency: data.currency ?? 'EUR',
    updatedDaysAgo: deriveUpdatedDaysAgo(lastValueMs, Date.now()),
    notes: data.notes ?? null,
    symbol: data.symbol ?? null,
    history,
  };
  // Only set the optional fields when present (exactOptionalPropertyTypes).
  if (data.nativeValue != null) holding.nativeValue = data.nativeValue;
  if (data.livePrice != null) holding.livePrice = data.livePrice;
  if (data.prevPrice != null) holding.prevPrice = data.prevPrice;
  return holding;
}

export function useHoldings() {
  const { dataOwnerId } = useAuth();

  return useQuery({
    queryKey: holdingKeys.all(dataOwnerId ?? ''),
    queryFn: async () => {
      if (!dataOwnerId) return [];
      const holdingsRef = collection(db, 'users', dataOwnerId, 'holdings');
      const q = query(holdingsRef, orderBy('name'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(transformHolding);
    },
    enabled: !!dataOwnerId,
  });
}
