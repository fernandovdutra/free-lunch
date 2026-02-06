import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { buildCategoryTree, getFlatCategoriesWithLevel } from '@/hooks/useCategories';
import type { Category } from '@/types';

// Special value to represent filtering for uncategorized transactions
export const UNCATEGORIZED_FILTER = '__uncategorized__';

interface CategoryPickerProps {
  value: string | null;
  onChange: (value: string | null) => void;
  categories: Category[];
  placeholder?: string;
  className?: string;
  /** If true, show "All categories" option instead of treating uncategorized as default */
  showAllOption?: boolean;
}

export function CategoryPicker({
  value,
  onChange,
  categories,
  placeholder = 'Select category',
  className,
  showAllOption = false,
}: CategoryPickerProps) {
  const tree = buildCategoryTree(categories);
  const flatCategories = getFlatCategoriesWithLevel(tree);

  // Determine the select value
  const selectValue = value ?? (showAllOption ? '__all__' : 'uncategorized');

  return (
    <Select
      value={selectValue}
      onValueChange={(v) => {
        if (v === '__all__') {
          onChange(null);
        } else if (v === 'uncategorized') {
          // For filter mode, pass the special filter value
          // For assignment mode, pass null (actual null categoryId)
          onChange(showAllOption ? UNCATEGORIZED_FILTER : null);
        } else {
          onChange(v);
        }
      }}
    >
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {showAllOption && (
          <SelectItem value="__all__">
            <span className="flex items-center gap-2">
              <span>📋</span>
              <span>All categories</span>
            </span>
          </SelectItem>
        )}
        <SelectItem value="uncategorized">
          <span className="flex items-center gap-2">
            <span>❓</span>
            <span>Uncategorized</span>
          </span>
        </SelectItem>
        {flatCategories.map((cat) => (
          <SelectItem key={cat.id} value={cat.id}>
            <span className="flex items-center gap-2" style={{ paddingLeft: cat.level * 16 }}>
              <span>{cat.icon}</span>
              <span>{cat.name}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
