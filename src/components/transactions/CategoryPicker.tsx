import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { buildCategoryTree, getFlatCategoriesWithLevel } from '@/hooks/useCategories';
import type { Category } from '@/types';

interface CategoryPickerProps {
  value: string | null;
  onChange: (value: string | null) => void;
  categories: Category[];
  placeholder?: string;
  className?: string;
}

export function CategoryPicker({
  value,
  onChange,
  categories,
  placeholder = 'Select category',
  className,
}: CategoryPickerProps) {
  const tree = buildCategoryTree(categories);
  const flatCategories = getFlatCategoriesWithLevel(tree);

  return (
    <Select
      value={value ?? 'uncategorized'}
      onValueChange={(v) => {
        onChange(v === 'uncategorized' ? null : v);
      }}
    >
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
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
