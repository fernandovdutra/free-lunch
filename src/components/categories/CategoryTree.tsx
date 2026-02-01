import { CategoryItem } from './CategoryItem';
import type { CategoryWithChildren } from '@/types';

interface CategoryTreeProps {
  categories: CategoryWithChildren[];
  onEdit: (category: CategoryWithChildren) => void;
  onDelete: (category: CategoryWithChildren) => void;
}

export function CategoryTree({ categories, onEdit, onDelete }: CategoryTreeProps) {
  if (categories.length === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center text-muted-foreground">
        No categories found
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {categories.map((category) => (
        <CategoryItem
          key={category.id}
          category={category}
          level={0}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
