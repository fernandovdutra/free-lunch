import { useState } from 'react';
import { ChevronRight, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { CategoryWithChildren } from '@/types';

interface CategoryItemProps {
  category: CategoryWithChildren;
  level: number;
  onEdit: (category: CategoryWithChildren) => void;
  onDelete: (category: CategoryWithChildren) => void;
}

export function CategoryItem({ category, level, onEdit, onDelete }: CategoryItemProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = category.children.length > 0;
  const canDelete = !category.isSystem && !hasChildren;

  return (
    <div>
      <div
        className={cn(
          'group flex items-center gap-2 rounded-md px-2 py-2 transition-colors hover:bg-muted/50',
          level > 0 && 'ml-6'
        )}
      >
        {/* Expand/collapse button */}
        <button
          type="button"
          className={cn(
            'flex h-6 w-6 items-center justify-center rounded transition-transform',
            hasChildren ? 'hover:bg-muted' : 'invisible'
          )}
          onClick={() => {
            setIsExpanded(!isExpanded);
          }}
        >
          <ChevronRight
            className={cn(
              'h-4 w-4 text-muted-foreground transition-transform',
              isExpanded && 'rotate-90'
            )}
          />
        </button>

        {/* Color indicator */}
        <div
          className="h-3 w-3 flex-shrink-0 rounded-full"
          style={{ backgroundColor: category.color }}
        />

        {/* Icon & Name */}
        <span className="text-lg">{category.icon}</span>
        <span className="flex-1 font-medium">{category.name}</span>

        {/* System badge */}
        {category.isSystem && (
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            System
          </span>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => {
              onEdit(category);
            }}
          >
            <Pencil className="h-4 w-4" />
            <span className="sr-only">Edit {category.name}</span>
          </Button>
          {canDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={() => {
                onDelete(category);
              }}
            >
              <Trash2 className="h-4 w-4" />
              <span className="sr-only">Delete {category.name}</span>
            </Button>
          )}
        </div>
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div>
          {category.children.map((child) => (
            <CategoryItem
              key={child.id}
              category={child}
              level={level + 1}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
