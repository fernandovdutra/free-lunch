import { useState, useEffect, useRef } from 'react';
import { Search, X, Calendar, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CategoryPicker } from './CategoryPicker';
import type { TransactionFilters as Filters } from '@/hooks/useTransactions';
import type { Category } from '@/types';
import { format } from 'date-fns';

interface TransactionFiltersProps {
  filters: Filters;
  onChange: (filters: Filters) => void;
  categories: Category[];
}

export function TransactionFilters({ filters, onChange, categories }: TransactionFiltersProps) {
  const [searchValue, setSearchValue] = useState(filters.searchText ?? '');
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

  const handleCategoryChange = (categoryId: string | null) => {
    const newFilters = { ...filters };
    if (categoryId) {
      // Include both regular category IDs and the special uncategorized filter
      newFilters.categoryId = categoryId;
    } else {
      delete newFilters.categoryId;
    }
    onChange(newFilters);
  };

  const clearFilters = () => {
    setSearchValue('');
    const dateOnly: Filters = {};
    if (filters.startDate) dateOnly.startDate = filters.startDate;
    if (filters.endDate) dateOnly.endDate = filters.endDate;
    onChange(dateOnly);
  };

  const hasActiveFilters =
    !!filters.searchText ||
    !!filters.categoryId ||
    !!filters.direction ||
    !!filters.categorizationStatus ||
    !!filters.reimbursementStatus;

  const getDateRangeText = () => {
    if (!filters.startDate || !filters.endDate) return 'All time';
    return `${format(filters.startDate, 'MMM d')} - ${format(filters.endDate, 'MMM d, yyyy')}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        {/* Date range indicator */}
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>{getDateRangeText()}</span>
        </div>

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
          showAllOption
        />

        {/* Direction filter */}
        <Select
          value={filters.direction ?? 'all'}
          onValueChange={(value: 'income' | 'expense' | 'all') => {
            const newFilters = { ...filters };
            if (value === 'all') {
              delete newFilters.direction;
            } else {
              newFilters.direction = value;
            }
            onChange(newFilters);
          }}
        >
          <SelectTrigger className="w-[140px]" data-testid="direction-filter">
            <SelectValue placeholder="Direction" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="income">
              <span className="flex items-center gap-1">
                <ArrowUpRight className="h-3 w-3 text-emerald-500" />
                Income
              </span>
            </SelectItem>
            <SelectItem value="expense">
              <span className="flex items-center gap-1">
                <ArrowDownRight className="h-3 w-3 text-red-500" />
                Expense
              </span>
            </SelectItem>
          </SelectContent>
        </Select>

        {/* Categorization status filter */}
        <Select
          value={filters.categorizationStatus ?? 'all'}
          onValueChange={(value: 'auto' | 'manual' | 'uncategorized' | 'all') => {
            const newFilters = { ...filters };
            if (value === 'all') {
              delete newFilters.categorizationStatus;
            } else {
              newFilters.categorizationStatus = value;
            }
            onChange(newFilters);
          }}
        >
          <SelectTrigger className="w-[160px]" data-testid="categorization-filter">
            <SelectValue placeholder="Cat. Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="manual">Manually Set</SelectItem>
            <SelectItem value="auto">Auto-categorized</SelectItem>
            <SelectItem value="uncategorized">Uncategorized</SelectItem>
          </SelectContent>
        </Select>

        {/* Reimbursement filter */}
        <Select
          value={filters.reimbursementStatus ?? 'all'}
          onValueChange={(value: 'none' | 'pending' | 'cleared' | 'all') => {
            const newFilters = { ...filters };
            if (value === 'all') {
              delete newFilters.reimbursementStatus;
            } else {
              newFilters.reimbursementStatus = value;
            }
            onChange(newFilters);
          }}
        >
          <SelectTrigger className="w-[160px]" data-testid="reimbursement-filter">
            <SelectValue placeholder="Reimbursement" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="none">No Reimbursement</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="cleared">Cleared</SelectItem>
          </SelectContent>
        </Select>

        {/* Clear filters */}
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="mr-1 h-4 w-4" />
            Clear
          </Button>
        )}
      </div>
    </div>
  );
}
