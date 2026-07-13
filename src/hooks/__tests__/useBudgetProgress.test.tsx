import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

// The hook transitively imports the Firebase client (initializes Auth/Firestore
// at load) — stub it, per project convention.
vi.mock('@/lib/firebase', () => ({ db: {}, auth: {}, functions: {} }));

interface ProgressResponse {
  data: { budgetProgress: ReturnType<typeof progressItem>[] };
}
interface ProgressParams {
  startDate?: string;
  endDate?: string;
}
const getBudgetProgressFn = vi.fn<(params: ProgressParams) => Promise<ProgressResponse>>();
vi.mock('@/lib/bankingFunctions', () => ({
  getBudgetProgressFn: (params: ProgressParams) => getBudgetProgressFn(params),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ dataOwnerId: 'user-1' }),
}));

vi.mock('@/hooks/useBudgets', () => ({
  useBudgets: () => ({
    data: [
      {
        id: 'b1',
        name: 'Groceries',
        categoryId: 'food',
        monthlyLimit: 400,
        alertThreshold: 80,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
  }),
}));

import { useBudgetProgress, budgetProgressKeys } from '../useBudgetProgress';

function progressItem(spent: number) {
  return {
    budgetId: 'b1',
    budgetName: 'Groceries',
    categoryId: 'food',
    categoryName: 'Food',
    categoryIcon: 'cart',
    categoryColor: '#0f0',
    monthlyLimit: 400,
    alertThreshold: 80,
    spent,
    remaining: 400 - spent,
    percentage: (spent / 400) * 100,
    status: 'ok',
  };
}

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { queryClient, wrapper };
}

const mayRange = {
  startDate: new Date('2026-05-01T00:00:00Z'),
  endDate: new Date('2026-05-31T23:59:59Z'),
};
const mayToTodayRange = {
  startDate: new Date('2026-05-01T00:00:00Z'),
  endDate: new Date('2026-05-13T23:59:59Z'),
};

beforeEach(() => {
  getBudgetProgressFn.mockReset();
  getBudgetProgressFn.mockResolvedValue({
    data: { budgetProgress: [progressItem(100)] },
  });
});

describe('useBudgetProgress', () => {
  it('passes the caller range to the server and returns mapped progress', async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useBudgetProgress(mayRange), { wrapper });

    await waitFor(() => { expect(result.current.data).toHaveLength(1); });

    expect(getBudgetProgressFn).toHaveBeenCalledWith({
      startDate: mayRange.startDate.toISOString(),
      endDate: mayRange.endDate.toISOString(),
    });
    expect(result.current.data[0]?.budget.id).toBe('b1');
    expect(result.current.data[0]?.spent).toBe(100);
  });

  it('refetches when the date range changes (range is part of the key)', async () => {
    const { wrapper } = createWrapper();
    const { result, rerender } = renderHook(
      ({ range }: { range: { startDate: Date; endDate: Date } }) => useBudgetProgress(range),
      { wrapper, initialProps: { range: mayRange } }
    );

    await waitFor(() => { expect(getBudgetProgressFn).toHaveBeenCalledTimes(1); });

    getBudgetProgressFn.mockResolvedValue({
      data: { budgetProgress: [progressItem(50)] },
    });
    rerender({ range: mayToTodayRange });

    // A second, distinct fetch for the new window — not a cache hit.
    await waitFor(() => { expect(getBudgetProgressFn).toHaveBeenCalledTimes(2); });
    expect(getBudgetProgressFn).toHaveBeenLastCalledWith({
      startDate: mayToTodayRange.startDate.toISOString(),
      endDate: mayToTodayRange.endDate.toISOString(),
    });
    await waitFor(() => { expect(result.current.data[0]?.spent).toBe(50); });
  });

  it('keeps distinct cache entries per range — callers do not clobber each other', async () => {
    const { queryClient, wrapper } = createWrapper();

    getBudgetProgressFn.mockImplementation((params) =>
      Promise.resolve({
        data: {
          budgetProgress: [progressItem(params.startDate ? 111 : 222)],
        },
      })
    );

    // Home-style caller (explicit range) and explorer-style caller (no range)
    // mounted against the same client.
    const first = renderHook(() => useBudgetProgress(mayRange), { wrapper });
    const second = renderHook(() => useBudgetProgress(), { wrapper });

    await waitFor(() => { expect(first.result.current.data[0]?.spent).toBe(111); });
    await waitFor(() => { expect(second.result.current.data[0]?.spent).toBe(222); });

    // Two separate cache entries under the shared 'budgetProgress' prefix.
    expect(
      queryClient.getQueryData(budgetProgressKeys.current('user-1', mayRange))
    ).toBeDefined();
    expect(queryClient.getQueryData(budgetProgressKeys.current('user-1', null))).toBeDefined();
  });
});
