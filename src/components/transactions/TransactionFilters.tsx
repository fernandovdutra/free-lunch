import { useState, useEffect, useRef } from 'react';
import { Search, X, Calendar } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { CategoryPicker } from './CategoryPicker';
import type { TransactionFilters as Filters } from '@/hooks/useTransactions';
import type { Category } from '@/types';
import { startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear, format } from 'date-fns';

interface TransactionFiltersProps {
  filters: Filters;
  onChange: (filters: Filters) => void;
  categories: Category[];
}

type DatePreset = 'this-month' | 'last-month' | 'this-year' | 'all';

export function TransactionFilters({ filters, onChange, categories }: TransactionFiltersProps) {
  const [searchValue, setSearchValue] = useState(filters.searchText ?? '');
  const [activePreset, setActivePreset] = useState<DatePreset>('this-month');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      const newFilters = { ...filters };
      if (searchValue) {
        newFilters.searchText = searchValue;
      } else {
        delete newFilters.searchText;
      }
      onChange(newFilters);
    }, 300);
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchValue]);

  const handleDatePreset = (preset: DatePreset) => {
    setActivePreset(preset);
    const now = new Date();
    const newFilters = { ...filters };

    switch (preset) {
      case 'this-month':
        newFilters.startDate = startOfMonth(now);
        newFilters.endDate = endOfMonth(now);
        break;
      case 'last-month': {
        const lastMonth = subMonths(now, 1);
        newFilters.startDate = startOfMonth(lastMonth);
        newFilters.endDate = endOfMonth(lastMonth);
        break;
      }
      case 'this-year':
        newFilters.startDate = startOfYear(now);
        newFilters.endDate = endOfYear(now);
        break;
      case 'all':
        delete newFilters.startDate;
        delete newFilters.endDate;
        break;
    }
    onChange(newFilters);
  };

  const handleCategoryChange = (categoryId: string | null) => {
    const newFilters = { ...filters };
    if (categoryId) {
      newFilters.categoryId = categoryId;
    } else {
      delete newFilters.categoryId;
    }
    onChange(newFilters);
  };

  const clearFilters = () => {
    setSearchValue('');
    setActivePreset('this-month');
    const now = new Date();
    onChange({
      startDate: startOfMonth(now),
      endDate: endOfMonth(now),
    });
  };

  const hasActiveFilters =
    !!filters.searchText || !!filters.categoryId || activePreset !== 'this-month';

  const getDateRangeText = () => {
    if (!filters.startDate || !filters.endDate) return 'All time';
    return `${format(filters.startDate, 'MMM d')} - ${format(filters.endDate, 'MMM d, yyyy')}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search transactions..."
            value={searchValue}
            onChange={(e) => {
              setSearchValue(e.target.value);
            }}
            className="pl-9"
          />
        </div>

        {/* Category filter */}
        <CategoryPicker
          value={filters.categoryId ?? null}
          onChange={handleCategoryChange}
          categories={categories}
          placeholder="All categories"
          className="w-[180px]"
        />

        {/* Clear filters */}
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="mr-1 h-4 w-4" />
            Clear
          </Button>
        )}
      </div>

      {/* Date presets */}
      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">{getDateRangeText()}</span>
        <div className="ml-2 flex gap-1">
          <Button
            variant={activePreset === 'this-month' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => {
              handleDatePreset('this-month');
            }}
          >
            This Month
          </Button>
          <Button
            variant={activePreset === 'last-month' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => {
              handleDatePreset('last-month');
            }}
          >
            Last Month
          </Button>
          <Button
            variant={activePreset === 'this-year' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => {
              handleDatePreset('this-year');
            }}
          >
            This Year
          </Button>
          <Button
            variant={activePreset === 'all' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => {
              handleDatePreset('all');
            }}
          >
            All Time
          </Button>
        </div>
      </div>
    </div>
  );
}
