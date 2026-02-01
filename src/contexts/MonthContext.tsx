import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react';
import { startOfMonth, endOfMonth, addMonths, subMonths, isSameMonth } from 'date-fns';

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
  /** Date range for the selected month (for use with data hooks) */
  dateRange: { startDate: Date; endDate: Date };
}

const MonthContext = createContext<MonthContextType | undefined>(undefined);

interface MonthProviderProps {
  children: ReactNode;
}

export function MonthProvider({ children }: MonthProviderProps) {
  const [selectedMonth, setSelectedMonthInternal] = useState(() => startOfMonth(new Date()));

  const setSelectedMonth = useCallback((date: Date) => {
    setSelectedMonthInternal(startOfMonth(date));
  }, []);

  const goToNextMonth = useCallback(() => {
    setSelectedMonthInternal((prev) => addMonths(prev, 1));
  }, []);

  const goToPreviousMonth = useCallback(() => {
    setSelectedMonthInternal((prev) => subMonths(prev, 1));
  }, []);

  const goToCurrentMonth = useCallback(() => {
    setSelectedMonthInternal(startOfMonth(new Date()));
  }, []);

  const isCurrentMonth = useMemo(
    () => isSameMonth(selectedMonth, new Date()),
    [selectedMonth]
  );

  const dateRange = useMemo(
    () => ({
      startDate: selectedMonth,
      endDate: endOfMonth(selectedMonth),
    }),
    [selectedMonth]
  );

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
