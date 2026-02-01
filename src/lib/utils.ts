import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind CSS classes with clsx
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format amount as currency (EUR)
 */
export function formatAmount(amount: number, options?: { showSign?: boolean }): string {
  const { showSign = true } = options ?? {};

  const formatted = new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(amount));

  if (!showSign) return formatted;
  if (amount > 0) return `+${formatted}`;
  if (amount < 0) return `-${formatted.replace('-', '')}`;
  return formatted;
}

/**
 * Format date for display
 */
export function formatDate(
  date: Date,
  format: 'short' | 'long' | 'relative' | 'withTime' | 'timeOnly' = 'short'
): string {
  if (format === 'relative') {
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays} days ago`;
  }

  if (format === 'timeOnly') {
    return new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' }).format(date);
  }

  let options: Intl.DateTimeFormatOptions;
  if (format === 'long') {
    options = { year: 'numeric', month: 'long', day: 'numeric' };
  } else if (format === 'withTime') {
    options = { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
  } else {
    options = { month: 'short', day: 'numeric' };
  }

  return new Intl.DateTimeFormat('en-GB', options).format(date);
}

/**
 * Get color for amount display
 */
export function getAmountColor(amount: number, isPending = false): string {
  if (isPending) return 'text-secondary';
  if (amount > 0) return 'text-primary';
  if (amount < 0) return 'text-destructive';
  return 'text-muted-foreground';
}

/**
 * Generate a random ID
 */
export function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;

  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}
