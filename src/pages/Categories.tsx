import { useState } from 'react';
import { Plus, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { CategoryTree } from '@/components/categories/CategoryTree';
import { CategoryForm } from '@/components/categories/CategoryForm';
import {
  useCategories,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
  buildCategoryTree,
} from '@/hooks/useCategories';
import type { Category, CategoryWithChildren, CategoryFormData } from '@/types';

export function Categories() {
  const [formOpen, setFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryWithChildren | null>(null);
  const [deleteCategory, setDeleteCategory] = useState<CategoryWithChildren | null>(null);

  const { data: categories = [], isLoading, error } = useCategories();
  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory();
  const deleteMutation = useDeleteCategory();

  const categoryTree = buildCategoryTree(categories);

  const handleEdit = (category: CategoryWithChildren) => {
    setEditingCategory(category);
    setFormOpen(true);
  };

  const handleDelete = (category: CategoryWithChildren) => {
    setDeleteCategory(category);
  };

  const handleFormSubmit = async (data: CategoryFormData) => {
    if (editingCategory) {
      await updateMutation.mutateAsync({ id: editingCategory.id, data });
    } else {
      await createMutation.mutateAsync(data);
    }
    setEditingCategory(null);
  };

  const handleConfirmDelete = async () => {
    if (deleteCategory) {
      await deleteMutation.mutateAsync(deleteCategory.id);
      setDeleteCategory(null);
    }
  };

  const handleNewCategory = () => {
    setEditingCategory(null);
    setFormOpen(true);
  };

  // Get flat list of parent-eligible categories (top-level only)
  const parentCategories = categories.filter((c) => c.parentId === null);

  if (error) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-destructive" />
          <h3 className="mt-4 text-lg font-semibold">Failed to load categories</h3>
          <p className="text-muted-foreground">Please try refreshing the page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Categories</h1>
          <p className="text-muted-foreground">Organize your spending categories</p>
        </div>
        <Button onClick={handleNewCategory}>
          <Plus className="mr-2 h-4 w-4" />
          New Category
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Category Tree</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-6 w-6" />
                  <Skeleton className="h-3 w-3 rounded-full" />
                  <Skeleton className="h-5 w-5" />
                  <Skeleton className="h-4 w-32" />
                </div>
              ))}
            </div>
          ) : (
            <CategoryTree categories={categoryTree} onEdit={handleEdit} onDelete={handleDelete} />
          )}
        </CardContent>
      </Card>

      {/* Category Form Dialog */}
      <CategoryForm
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingCategory(null);
        }}
        category={editingCategory as Category | null}
        parentCategories={parentCategories}
        onSubmit={handleFormSubmit}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteCategory}
        onOpenChange={(open) => {
          if (!open) setDeleteCategory(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Category</DialogTitle>
            <DialogDescription>
              {deleteCategory && deleteCategory.children.length > 0 ? (
                <>
                  Are you sure you want to delete &quot;{deleteCategory.name}&quot; and its{' '}
                  <strong>{deleteCategory.children.length}</strong> sub-categor
                  {deleteCategory.children.length === 1 ? 'y' : 'ies'}? Transactions in these
                  categories will become uncategorized. This action cannot be undone.
                </>
              ) : (
                <>
                  Are you sure you want to delete &quot;{deleteCategory?.name}&quot;? Transactions in
                  this category will become uncategorized. This action cannot be undone.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteCategory(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => void handleConfirmDelete()}
              disabled={deleteMutation.isPending}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
