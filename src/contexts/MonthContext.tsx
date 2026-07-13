import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react';
import { startOfMonth, addMonths, subMonths, isSameMonth } from 'date-fns';
import { monthRangeFor } from '@/lib/monthRange';

interface MonthContextType {
  /** The first day of the selected month */
  selectedMonth: Date;
  /** Set to a specific month (will be normalized to start of month) */
  setSelectedMonth: (date: Date) => void;
  /** Navigate to next month */
  goToNextMonth: () => void;
  /** Navigate to previous month */
  goToPreviousMonth: () => void;
  /** Jump to current month */
  goToCurrentMonth: () => void;
  /** Check if selected month is current month */
  isCurrentMonth: boolean;
  /**
   * Date range for the selected month (for use with data hooks): exact UTC
   * instants of the Amsterdam month boundaries (see src/lib/monthRange.ts),
   * safe to serialize with toISOString() for query keys and backend calls.
   */
  dateRange: { startDate: Date; endDate: Date };
}

const MonthContext = createContext<MonthContextType | undefined>(undefined);

/** localStorage key for the persisted month selection. */
export const SELECTED_MONTH_STORAGE_KEY = 'freeLunch.selectedMonth';

// How far a stored month may deviate from today before we treat it as
// garbage and fall back to the current month. Wide enough for any real
// browsing session, narrow enough to reject corrupted / absurd values.
const MAX_YEARS_IN_PAST = 10;
const MAX_YEARS_IN_FUTURE = 1;

/**
 * Parse a stored `yyyy-MM` value back into a start-of-month Date.
 * Returns null (→ fall back to the current month) for anything malformed
 * or implausibly far from today.
 */
export function parseStoredMonth(raw: string | null, now: Date = new Date()): Date | null {
  if (!raw) return null;
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(raw);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (year < now.getFullYear() - MAX_YEARS_IN_PAST) return null;
  if (year > now.getFullYear() + MAX_YEARS_IN_FUTURE) return null;
  // Local-time construction, consistent with startOfMonth(new Date()).
  return startOfMonth(new Date(year, month - 1, 1));
}

function readStoredMonth(): Date | null {
  try {
    return parseStoredMonth(window.localStorage.getItem(SELECTED_MONTH_STORAGE_KEY));
  } catch {
    // Storage unavailable (private mode, SSR) — just use the current month.
    return null;
  }
}

function storeMonth(date: Date): void {
  try {
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    window.localStorage.setItem(SELECTED_MONTH_STORAGE_KEY, key);
  } catch {
    // Best-effort persistence only.
  }
}

interface MonthProviderProps {
  children: ReactNode;
}

export function MonthProvider({ children }: MonthProviderProps) {
  const [selectedMonth, setSelectedMonthInternal] = useState(
    () => readStoredMonth() ?? startOfMonth(new Date())
  );

  // Persist every change so a reload restores the last-viewed month.
  const setAndStore = useCallback((updater: (prev: Date) => Date) => {
    setSelectedMonthInternal((prev) => {
      const next = updater(prev);
      storeMonth(next);
      return next;
    });
  }, []);

  const setSelectedMonth = useCallback(
    (date: Date) => {
      setAndStore(() => startOfMonth(date));
    },
    [setAndStore]
  );

  const goToNextMonth = useCallback(() => {
    setAndStore((prev) => addMonths(prev, 1));
  }, [setAndStore]);

  const goToPreviousMonth = useCallback(() => {
    setAndStore((prev) => subMonths(prev, 1));
  }, [setAndStore]);

  const goToCurrentMonth = useCallback(() => {
    setAndStore(() => startOfMonth(new Date()));
  }, [setAndStore]);

  const isCurrentMonth = useMemo(
    () => isSameMonth(selectedMonth, new Date()),
    [selectedMonth]
  );

  // Canonical Amsterdam month boundaries — NOT local startOfMonth/endOfMonth,
  // whose toISOString() serialization skewed backend day-bucketing by a day.
  const dateRange = useMemo(() => monthRangeFor(selectedMonth), [selectedMonth]);

  const value = useMemo(
    () => ({
      selectedMonth,
      setSelectedMonth,
      goToNextMonth,
      goToPreviousMonth,
      goToCurrentMonth,
      isCurrentMonth,
      dateRange,
    }),
    [selectedMonth, setSelectedMonth, goToNextMonth, goToPreviousMonth, goToCurrentMonth, isCurrentMonth, dateRange]
  );

  return <MonthContext.Provider value={value}>{children}</MonthContext.Provider>;
}

export function useMonth() {
  const context = useContext(MonthContext);
  if (!context) {
    throw new Error('useMonth must be used within a MonthProvider');
  }
  return context;
}
