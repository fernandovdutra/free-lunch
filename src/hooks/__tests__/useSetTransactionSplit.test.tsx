import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { validateSplits } from '@/lib/splits';

vi.mock('@/lib/firebase', () => ({ db: {}, auth: {}, functions: {} }));
vi.mock('@/lib/bankingFunctions', () => ({ recategorizeTransactions: vi.fn() }));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ dataOwnerId: 'user-1' }),
}));

const { docMock, updateDocMock } = vi.hoisted(() => ({
  docMock: vi.fn((..._args: unknown[]) => ({ __ref: true })),
  updateDocMock: vi.fn((..._args: unknown[]) => Promise.resolve()),
}));

vi.mock('firebase/firestore', () => ({
  doc: docMock,
  updateDoc: updateDocMock,
  serverTimestamp: () => '__SERVER_TIMESTAMP__',
  Timestamp: { fromDate: (d: Date) => d },
  collection: vi.fn(),
  query: vi.fn(),
  getDocs: vi.fn(),
  setDoc: vi.fn(),
  deleteDoc: vi.fn(),
  where: vi.fn(),
  writeBatch: vi.fn(),
}));

import { useSetTransactionSplit } from '../useTransactionMutations';

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useSetTransactionSplit', () => {
  it('writes isSplit + splits[] atomically in the stored (backend-readable) shape', async () => {
    const splits = [
      { amount: 65, categoryId: 'groceries', note: null },
      { amount: 20.5, categoryId: 'household', note: 'cleaning' },
    ];
    const { result } = renderHook(() => useSetTransactionSplit(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ id: 'txn-1', splits });
    });

    expect(docMock).toHaveBeenCalledWith({}, 'users', 'user-1', 'transactions', 'txn-1');
    expect(updateDocMock).toHaveBeenCalledTimes(1);
    const written = updateDocMock.mock.calls[0]?.[1] as {
      isSplit: boolean;
      splits: Array<{ amount: number; categoryId: string; note: string | null }>;
      updatedAt: string;
    };
    // Exact write payload — one updateDoc call, so split state changes atomically.
    expect(written).toEqual({
      isSplit: true,
      splits,
      updatedAt: '__SERVER_TIMESTAMP__',
    });
    // Shape parity with functions/src/shared/aggregations.ts `TransactionDoc`:
    // positive per-split amounts that sum cent-exactly to abs(txn.amount).
    expect(validateSplits(85.5, written.splits)).toBe(true);
  });

  it('removes a split with `splits: null` and falls back to the surviving category', async () => {
    const { result } = renderHook(() => useSetTransactionSplit(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ id: 'txn-1', splits: null, categoryId: 'groceries' });
    });

    expect(updateDocMock.mock.calls[0]?.[1]).toEqual({
      isSplit: false,
      splits: null,
      categoryId: 'groceries',
      categorySource: 'manual',
      categoryConfidence: 1,
      updatedAt: '__SERVER_TIMESTAMP__',
    });
  });

  it('removes a split without touching categoryId when no fallback is given', async () => {
    const { result } = renderHook(() => useSetTransactionSplit(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ id: 'txn-1', splits: null });
    });

    expect(updateDocMock.mock.calls[0]?.[1]).toEqual({
      isSplit: false,
      splits: null,
      updatedAt: '__SERVER_TIMESTAMP__',
    });
  });

  it('rejects fewer than two rows', async () => {
    const { result } = renderHook(() => useSetTransactionSplit(), { wrapper });

    await act(async () => {
      await expect(
        result.current.mutateAsync({
          id: 'txn-1',
          splits: [{ amount: 85.5, categoryId: 'groceries', note: null }],
        })
      ).rejects.toThrow('at least two rows');
    });
    expect(updateDocMock).not.toHaveBeenCalled();
  });

  it('rejects non-positive amounts (backend aggregation skips amount <= 0)', async () => {
    const { result } = renderHook(() => useSetTransactionSplit(), { wrapper });

    await act(async () => {
      await expect(
        result.current.mutateAsync({
          id: 'txn-1',
          splits: [
            { amount: 90.5, categoryId: 'groceries', note: null },
            { amount: -5, categoryId: 'household', note: null },
          ],
        })
      ).rejects.toThrow('positive');
    });
    expect(updateDocMock).not.toHaveBeenCalled();
  });
});
