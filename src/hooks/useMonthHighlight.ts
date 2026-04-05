import { useState } from 'react';
import { format } from 'date-fns';
import { useMonth } from '@/contexts/MonthContext';

/**
 * Manages month bar-chart highlight state, defaulting to the global selected month.
 */
export function useMonthHighlight() {
  const { selectedMonth } = useMonth();
  const globalMonthKey = format(selectedMonth, 'yyyy-MM');
  const [highlightedMonth, setHighlightedMonth] = useState<string | undefined>(undefined);
  const selectedMonthKey = highlightedMonth ?? globalMonthKey;

  const handleMonthClick = (monthKey: string) => {
    setHighlightedMonth(monthKey === globalMonthKey ? undefined : monthKey);
  };

  return {
    selectedMonth,
    globalMonthKey,
    highlightedMonth,
    selectedMonthKey,
    handleMonthClick,
  };
}
