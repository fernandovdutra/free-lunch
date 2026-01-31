import { cn } from '@/lib/utils';
import type { Category } from '@/types';

interface CategoryBadgeProps {
  category: Category;
  size?: 'sm' | 'default';
  className?: string;
}

export function CategoryBadge({ category, size = 'default', className }: CategoryBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm',
        className
      )}
      style={{
        backgroundColor: `${category.color}15`,
        color: category.color,
      }}
    >
      <span>{category.icon}</span>
      {category.name}
    </span>
  );
}
