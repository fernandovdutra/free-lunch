import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  collection,
  query,
  orderBy,
  getDocs,
  doc,
  setDoc,
  updateDoc,
  writeBatch,
  serverTimestamp,
  Timestamp,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import type { Category, CategoryFormData, CategoryWithChildren } from '@/types';
import { generateId } from '@/lib/utils';
import { resolveIcon } from '@/lib/iconUtils';

// Firestore document shape
interface CategoryDocument {
  name: string;
  icon: string;
  color: string;
  parentId?: string | null;
  order?: number;
  isSystem?: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

// Query keys
export const categoryKeys = {
  all: (userId: string) => ['categories', userId] as const,
};

// Transform Firestore data to Category type
function transformCategory(docSnap: QueryDocumentSnapshot): Category {
  const data = docSnap.data() as CategoryDocument;
  return {
    id: docSnap.id,
    name: data.name,
    icon: resolveIcon(data.icon),
    color: data.color,
    parentId: data.parentId ?? null,
    order: data.order ?? 0,
    isSystem: data.isSystem ?? false,
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
    updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(),
  };
}

// Build tree structure from flat categories
export function buildCategoryTree(categories: Category[]): CategoryWithChildren[] {
  const map = new Map<string, CategoryWithChildren>();
  const roots: CategoryWithChildren[] = [];

  // First pass: create all nodes
  categories.forEach((cat) => {
    map.set(cat.id, { ...cat, children: [] });
  });

  // Second pass: build tree
  categories.forEach((cat) => {
    const node = map.get(cat.id)!;
    if (cat.parentId && map.has(cat.parentId)) {
      map.get(cat.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  });

  // Sort by order
  const sortByOrder = (a: CategoryWithChildren, b: CategoryWithChildren) => a.order - b.order;
  roots.sort(sortByOrder);
  map.forEach((node) => node.children.sort(sortByOrder));

  return roots;
}

// Get flat list of categories with indent level for select dropdowns
export function getFlatCategoriesWithLevel(
  tree: CategoryWithChildren[],
  level = 0
): Array<Category & { level: number }> {
  const result: Array<Category & { level: number }> = [];

  tree.forEach((node) => {
    const { children, ...category } = node;
    result.push({ ...category, level });
    if (children.length > 0) {
      result.push(...getFlatCategoriesWithLevel(children, level + 1));
    }
  });

  return result;
}

export function useCategories() {
  const { user } = useAuth();

  return useQuery({
    queryKey: categoryKeys.all(user?.id ?? ''),
    queryFn: async () => {
      if (!user?.id) return [];
      const categoriesRef = collection(db, 'users', user.id, 'categories');
      const q = query(categoriesRef, orderBy('order'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(transformCategory);
    },
    enabled: !!user?.id,
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: CategoryFormData) => {
      if (!user?.id) throw new Error('Not authenticated');
      const id = generateId();
      const categoryRef = doc(db, 'users', user.id, 'categories', id);
      await setDoc(categoryRef, {
        ...data,
        order: Date.now(),
        isSystem: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return id;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CategoryFormData> }) => {
      if (!user?.id) throw new Error('Not authenticated');
      const categoryRef = doc(db, 'users', user.id, 'categories', id);
      await updateDoc(categoryRef, {
        ...data,
        updatedAt: serverTimestamp(),
      });
      return id;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: categories = [] } = useCategories();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!user?.id) throw new Error('Not authenticated');

      // Find all children recursively
      const idsToDelete = [id];
      const findChildren = (parentId: string) => {
        categories
          .filter((c) => c.parentId === parentId)
          .forEach((child) => {
            idsToDelete.push(child.id);
            findChildren(child.id);
          });
      };
      findChildren(id);

      // Delete all in batch
      const batch = writeBatch(db);
      idsToDelete.forEach((catId) => {
        const categoryRef = doc(db, 'users', user.id, 'categories', catId);
        batch.delete(categoryRef);
      });
      await batch.commit();

      return id;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });
}
