import { describe, it, expect } from 'vitest';
import { buildCategoryTree, getFlatCategoriesWithLevel } from '../useCategories';
import type { Category } from '@/types';

// Mock categories data
const mockCategories: Category[] = [
  {
    id: 'income',
    name: 'Income',
    icon: '💰',
    color: '#10B981',
    parentId: null,
    order: 0,
    isSystem: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'income-salary',
    name: 'Salary',
    icon: '💵',
    color: '#10B981',
    parentId: 'income',
    order: 0,
    isSystem: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'income-gifts',
    name: 'Gifts',
    icon: '🎁',
    color: '#10B981',
    parentId: 'income',
    order: 1,
    isSystem: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'housing',
    name: 'Housing',
    icon: '🏠',
    color: '#6366F1',
    parentId: null,
    order: 1,
    isSystem: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'housing-rent',
    name: 'Rent',
    icon: '🏡',
    color: '#6366F1',
    parentId: 'housing',
    order: 0,
    isSystem: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

describe('buildCategoryTree', () => {
  it('builds tree from flat categories', () => {
    const tree = buildCategoryTree(mockCategories);

    expect(tree).toHaveLength(2); // income and housing
    expect(tree[0]?.name).toBe('Income');
    expect(tree[1]?.name).toBe('Housing');
  });

  it('nests children under parent categories', () => {
    const tree = buildCategoryTree(mockCategories);

    const incomeCategory = tree.find((c) => c.id === 'income');
    expect(incomeCategory?.children).toHaveLength(2);
    expect(incomeCategory?.children[0]?.name).toBe('Salary');
    expect(incomeCategory?.children[1]?.name).toBe('Gifts');
  });

  it('sorts categories by order', () => {
    const tree = buildCategoryTree(mockCategories);

    // Root level should be sorted by order
    expect(tree[0]?.order).toBe(0);
    expect(tree[1]?.order).toBe(1);

    // Children should also be sorted
    const incomeCategory = tree.find((c) => c.id === 'income');
    expect(incomeCategory?.children[0]?.order).toBe(0);
    expect(incomeCategory?.children[1]?.order).toBe(1);
  });

  it('handles empty input', () => {
    const tree = buildCategoryTree([]);
    expect(tree).toHaveLength(0);
  });

  it('handles orphan categories (parentId points to non-existent parent)', () => {
    const orphanCategories: Category[] = [
      {
        id: 'orphan',
        name: 'Orphan',
        icon: '❓',
        color: '#000000',
        parentId: 'non-existent',
        order: 0,
        isSystem: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const tree = buildCategoryTree(orphanCategories);
    // Orphan should be placed at root level
    expect(tree).toHaveLength(1);
    expect(tree[0]?.name).toBe('Orphan');
  });
});

describe('getFlatCategoriesWithLevel', () => {
  it('flattens tree with correct levels', () => {
    const tree = buildCategoryTree(mockCategories);
    const flat = getFlatCategoriesWithLevel(tree);

    expect(flat).toHaveLength(5);

    // Check levels
    const income = flat.find((c) => c.id === 'income');
    expect(income?.level).toBe(0);

    const salary = flat.find((c) => c.id === 'income-salary');
    expect(salary?.level).toBe(1);
  });

  it('maintains order within levels', () => {
    const tree = buildCategoryTree(mockCategories);
    const flat = getFlatCategoriesWithLevel(tree);

    // Find positions
    const incomeIndex = flat.findIndex((c) => c.id === 'income');
    const salaryIndex = flat.findIndex((c) => c.id === 'income-salary');
    const giftsIndex = flat.findIndex((c) => c.id === 'income-gifts');

    // Children should come right after parent
    expect(salaryIndex).toBe(incomeIndex + 1);
    expect(giftsIndex).toBe(incomeIndex + 2);
  });

  it('handles empty tree', () => {
    const flat = getFlatCategoriesWithLevel([]);
    expect(flat).toHaveLength(0);
  });
});
