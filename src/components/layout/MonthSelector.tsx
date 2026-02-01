import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { getYear, setMonth, setYear } from 'date-fns';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useMonth } from '@/contexts/MonthContext';
import { cn } from '@/lib/utils';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

interface MonthSelectorProps {
  className?: string;
}

export function MonthSelector({ className }: MonthSelectorProps) {
  const { selectedMonth, setSelectedMonth, goToNextMonth, goToPreviousMonth, goToCurrentMonth, isCurrentMonth } = useMonth();

  const currentYear = getYear(selectedMonth);
  const currentMonthIndex = selectedMonth.getMonth();

  // Generate year options (5 years back, 1 year forward)
  const currentActualYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 7 }, (_, i) => currentActualYear - 5 + i);

  const handleMonthChange = (monthIndex: string) => {
    setSelectedMonth(setMonth(selectedMonth, parseInt(monthIndex, 10)));
  };

  const handleYearChange = (year: string) => {
    setSelectedMonth(setYear(selectedMonth, parseInt(year, 10)));
  };

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {/* Previous month */}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={goToPreviousMonth}
        aria-label="Previous month"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      {/* Month selector */}
      <Select value={String(currentMonthIndex)} onValueChange={handleMonthChange}>
        <SelectTrigger className="h-8 w-[110px] border-none bg-transparent px-2 font-medium shadow-none focus:ring-0">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {MONTHS.map((month, index) => (
            <SelectItem key={month} value={String(index)}>
              {month}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Year selector */}
      <Select value={String(currentYear)} onValueChange={handleYearChange}>
        <SelectTrigger className="h-8 w-[80px] border-none bg-transparent px-2 font-medium shadow-none focus:ring-0">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {yearOptions.map((year) => (
            <SelectItem key={year} value={String(year)}>
              {year}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Next month */}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={goToNextMonth}
        aria-label="Next month"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>

      {/* Today button (shown when not on current month) */}
      {!isCurrentMonth && (
        <Button
          variant="ghost"
          size="sm"
          className="ml-1 h-8 gap-1 text-xs text-muted-foreground"
          onClick={goToCurrentMonth}
        >
          <Calendar className="h-3 w-3" />
          Today
        </Button>
      )}
    </div>
  );
}
