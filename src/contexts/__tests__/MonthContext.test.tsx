import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { startOfMonth, subMonths } from 'date-fns';
import type { ReactNode } from 'react';
import {
  MonthProvider,
  useMonth,
  parseStoredMonth,
  SELECTED_MONTH_STORAGE_KEY,
} from '../MonthContext';
import { monthRangeFor } from '@/lib/monthRange';

const wrapper = ({ children }: { children: ReactNode }) => (
  <MonthProvider>{children}</MonthProvider>
);

beforeEach(() => {
  window.localStorage.clear();
});

describe('parseStoredMonth', () => {
  const now = new Date(2026, 6, 13); // 2026-07-13

  it('parses a valid yyyy-MM value to start of that month (local time)', () => {
    expect(parseStoredMonth('2026-05', now)).toEqual(new Date(2026, 4, 1));
  });

  it('rejects malformed values', () => {
    for (const raw of [null, '', 'garbage', '2026-13', '2026-00', '05-2026', '2026-5', '2026-05-01']) {
      expect(parseStoredMonth(raw, now)).toBeNull();
    }
  });

  it('rejects implausibly old or future values (absurd stored data)', () => {
    expect(parseStoredMonth('1999-01', now)).toBeNull();
    expect(parseStoredMonth('2099-01', now)).toBeNull();
    // Within bounds still accepted.
    expect(parseStoredMonth('2017-01', now)).not.toBeNull();
    expect(parseStoredMonth('2027-06', now)).not.toBeNull();
  });
});

describe('MonthProvider persistence', () => {
  it('defaults to the current month when nothing is stored', () => {
    const { result } = renderHook(() => useMonth(), { wrapper });
    expect(result.current.selectedMonth).toEqual(startOfMonth(new Date()));
    expect(result.current.isCurrentMonth).toBe(true);
  });

  it('persists month navigation to localStorage', () => {
    const { result } = renderHook(() => useMonth(), { wrapper });

    act(() => { result.current.goToPreviousMonth(); });

    const expected = subMonths(startOfMonth(new Date()), 1);
    expect(result.current.selectedMonth).toEqual(expected);
    const stored = window.localStorage.getItem(SELECTED_MONTH_STORAGE_KEY);
    expect(stored).toBe(
      `${expected.getFullYear()}-${String(expected.getMonth() + 1).padStart(2, '0')}`
    );
  });

  it('restores the persisted month on a fresh mount (reload)', () => {
    const first = renderHook(() => useMonth(), { wrapper });
    act(() => { first.result.current.goToPreviousMonth(); });
    act(() => { first.result.current.goToPreviousMonth(); });
    const chosen = first.result.current.selectedMonth;
    first.unmount();

    // Fresh provider = new page load.
    const second = renderHook(() => useMonth(), { wrapper });
    expect(second.result.current.selectedMonth).toEqual(chosen);
  });

  it('persists setSelectedMonth (normalized to start of month)', () => {
    const { result, unmount } = renderHook(() => useMonth(), { wrapper });
    act(() => { result.current.setSelectedMonth(new Date(2026, 2, 15)); });
    expect(result.current.selectedMonth).toEqual(new Date(2026, 2, 1));
    unmount();

    const again = renderHook(() => useMonth(), { wrapper });
    expect(again.result.current.selectedMonth).toEqual(new Date(2026, 2, 1));
  });

  it('falls back to the current month for absurd stored values', () => {
    window.localStorage.setItem(SELECTED_MONTH_STORAGE_KEY, '1234-99');
    const { result } = renderHook(() => useMonth(), { wrapper });
    expect(result.current.selectedMonth).toEqual(startOfMonth(new Date()));
  });

  it('exposes the canonical Amsterdam month range for the selected month', () => {
    const { result } = renderHook(() => useMonth(), { wrapper });
    act(() => { result.current.setSelectedMonth(new Date(2026, 4, 15)); }); // May 2026

    // Exact Amsterdam boundary instants (CEST): NOT local startOfMonth /
    // endOfMonth, whose toISOString() serialization skewed backend
    // day-bucketing by a day.
    expect(result.current.dateRange).toEqual(monthRangeFor(new Date(2026, 4, 1)));
    expect(result.current.dateRange.startDate.toISOString()).toBe('2026-04-30T22:00:00.000Z');
    expect(result.current.dateRange.endDate.toISOString()).toBe('2026-05-31T21:59:59.999Z');
  });

  it('goToCurrentMonth returns and persists the current month', () => {
    window.localStorage.setItem(SELECTED_MONTH_STORAGE_KEY, '2025-01');
    const { result } = renderHook(() => useMonth(), { wrapper });
    expect(result.current.isCurrentMonth).toBe(false);

    act(() => { result.current.goToCurrentMonth(); });

    expect(result.current.selectedMonth).toEqual(startOfMonth(new Date()));
    const now = new Date();
    expect(window.localStorage.getItem(SELECTED_MONTH_STORAGE_KEY)).toBe(
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    );
  });
});
