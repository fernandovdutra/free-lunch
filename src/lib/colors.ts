/**
 * Free Lunch color system
 * Based on the design system document
 */

export const colors = {
  primary: {
    50: '#E8F0ED',
    100: '#D1E1DA',
    200: '#A3C4B5',
    300: '#75A790',
    400: '#478A6B',
    500: '#2D5A4A',
    600: '#1D4739',
    700: '#163829',
    800: '#0F291D',
    900: '#081A11',
  },
  gray: {
    50: '#FAFAF8',
    100: '#F5F5F3',
    200: '#E2E5E3',
    300: '#C9CDCB',
    400: '#9CA3A0',
    500: '#6B7C72',
    600: '#5C6661',
    700: '#454B48',
    800: '#2E3331',
    900: '#1A1D1C',
  },
  semantic: {
    success: '#2D5A4A',
    error: '#C45C4A',
    warning: '#C9A227',
    info: '#4A6FA5',
  },
  amount: {
    positive: '#2D5A4A',
    negative: '#C45C4A',
    neutral: '#5C6661',
    pending: '#C9A227',
  },
} as const;

/**
 * Category colors for charts and badges
 */
export const CATEGORY_COLORS: Record<string, string> = {
  income: '#2D5A4A',
  housing: '#5B6E8A',
  transport: '#4A6FA5',
  food: '#C9A227',
  shopping: '#A67B8A',
  entertainment: '#7B6B8A',
  health: '#4A9A8A',
  personal: '#B87D4B',
  utilities: '#6B7C72',
  other: '#9CA3A0',
};

/**
 * Chart color palette for visualizations
 */
export const CHART_COLORS = [
  '#2D5A4A', // Forest green
  '#5B6E8A', // Slate
  '#4A6FA5', // Slate blue
  '#C9A227', // Gold
  '#A67B8A', // Dusty mauve
  '#7B6B8A', // Muted purple
  '#4A9A8A', // Teal
  '#B87D4B', // Warm bronze
  '#6B7C72', // Moss gray
  '#C45C4A', // Terracotta
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
