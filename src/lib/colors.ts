/**
 * Free Lunch color system
 * Based on the design system document
 */

export const colors = {
  primary: {
    50: '#ECFDF5',
    100: '#D1FAE5',
    200: '#A7F3D0',
    300: '#6EE7B7',
    400: '#34D399',
    500: '#10B981',
    600: '#059669',
    700: '#047857',
    800: '#065F46',
    900: '#064E3B',
  },
  gray: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
  },
  semantic: {
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    info: '#3B82F6',
  },
  amount: {
    positive: '#10B981',
    negative: '#EF4444',
    neutral: '#6B7280',
    pending: '#F59E0B',
  },
} as const;

/**
 * Category colors for charts and badges
 */
export const CATEGORY_COLORS: Record<string, string> = {
  income: '#10B981',
  housing: '#6366F1',
  transport: '#3B82F6',
  food: '#F59E0B',
  shopping: '#EC4899',
  entertainment: '#8B5CF6',
  health: '#14B8A6',
  personal: '#F97316',
  utilities: '#64748B',
  other: '#9CA3AF',
};

/**
 * Chart color palette for visualizations
 */
export const CHART_COLORS = [
  '#10B981', // Emerald
  '#6366F1', // Indigo
  '#3B82F6', // Blue
  '#F59E0B', // Amber
  '#EC4899', // Pink
  '#8B5CF6', // Violet
  '#14B8A6', // Teal
  '#F97316', // Orange
  '#64748B', // Slate
  '#EF4444', // Red
];

/**
 * Get color for an amount value
 */
export function getAmountColorValue(amount: number, isPending = false): string {
  if (isPending) return colors.amount.pending;
  if (amount > 0) return colors.amount.positive;
  if (amount < 0) return colors.amount.negative;
  return colors.amount.neutral;
}

/**
 * Get a category color by key or index
 */
export function getCategoryColor(keyOrIndex: string | number): string {
  if (typeof keyOrIndex === 'string') {
    return CATEGORY_COLORS[keyOrIndex] ?? CATEGORY_COLORS['other']!;
  }
  return CHART_COLORS[keyOrIndex % CHART_COLORS.length]!;
}
