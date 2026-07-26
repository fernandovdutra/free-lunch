import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

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

import { useUpdateTransactionTags } from '../useTransactionMutations';

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function written() {
  return updateDocMock.mock.calls[0]?.[1] as { tags: string[]; updatedAt: string };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useUpdateTransactionTags', () => {
  it('writes the full tags array plus updatedAt in one updateDoc', async () => {
    const { result } = renderHook(() => useUpdateTransactionTags(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ id: 'txn-1', tags: ['work', 'trip'] });
    });

    expect(docMock).toHaveBeenCalledWith({}, 'users', 'user-1', 'transactions', 'txn-1');
    expect(updateDocMock).toHaveBeenCalledTimes(1);
    // Exact payload — a flat `tags: string[]`, the same field shape the MCP
    // tools write (functions/src/mcp/writeTools.ts).
    expect(written()).toEqual({ tags: ['work', 'trip'], updatedAt: '__SERVER_TIMESTAMP__' });
  });

  it('normalizes before writing (trim, drop empties, dedupe) like the MCP tools', async () => {
    const { result } = renderHook(() => useUpdateTransactionTags(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        id: 'txn-1',
        tags: ['  work  ', '', 'travel', 'travel'],
      });
    });

    expect(written().tags).toEqual(['work', 'travel']);
  });

  it('preserves tag casing (case-sensitive, never lowercased)', async () => {
    const { result } = renderHook(() => useUpdateTransactionTags(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ id: 'txn-1', tags: ['Work', 'work'] });
    });

    expect(written().tags).toEqual(['Work', 'work']);
  });

  it('writes an empty array when the last tag is removed', async () => {
    const { result } = renderHook(() => useUpdateTransactionTags(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ id: 'txn-1', tags: [] });
    });

    expect(written().tags).toEqual([]);
  });

  it('optimistically patches cached transaction lists with the normalized tags', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const key = ['transactions', 'user-1', 'some-filters'];
    client.setQueryData(key, [
      { id: 'txn-1', tags: [] },
      { id: 'txn-2', tags: ['other'] },
    ]);

    const { result } = renderHook(() => useUpdateTransactionTags(), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      ),
    });

    await act(async () => {
      await result.current.mutateAsync({ id: 'txn-1', tags: [' work ', 'work'] });
    });

    const cached = client.getQueryData(key) as { id: string; tags: string[] }[];
    expect(cached[0]).toMatchObject({ id: 'txn-1', tags: ['work'] });
    // Other rows are untouched.
    expect(cached[1]).toMatchObject({ id: 'txn-2', tags: ['other'] });
  });
});
