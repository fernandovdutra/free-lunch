import type { FixedCost } from '@/lib/burnUp.types';

/**
 * Pure helpers for the fixed-cost schedule.
 *
 * Kept Firebase-free so the unit tests can exercise array transformations
 * without booting `@/lib/firebase`. The hook layer in
 * `src/hooks/useFixedSchedule.ts` composes these against Firestore.
 */

/**
 * Stable display order: by day-of-month ascending, then label ascending.
 * Both stored and rendered in this order so the array index used by
 * mutations is unambiguous.
 */
export function sortItems(items: FixedCost[]): FixedCost[] {
  return [...items].sort((a, b) => a.d - b.d || a.l.localeCompare(b.l));
}

/** Throws on invalid input. Kept thin — the form does richer UX-side validation. */
export function validateFixedCost(item: FixedCost): void {
  if (!Number.isInteger(item.d) || item.d < 1 || item.d > 31) {
    throw new Error('Day must be a whole number between 1 and 31');
  }
  if (!Number.isFinite(item.a) || item.a <= 0) {
    throw new Error('Amount must be greater than 0');
  }
  if (typeof item.l !== 'string' || item.l.trim().length === 0) {
    throw new Error('Label is required');
  }
}

/** Pure: insert + re-sort. */
export function addItem(items: FixedCost[], item: FixedCost): FixedCost[] {
  return sortItems([...items, item]);
}

/** Pure: replace at index + re-sort. Out-of-range index is a no-op. */
export function updateItem(
  items: FixedCost[],
  index: number,
  item: FixedCost
): FixedCost[] {
  if (index < 0 || index >= items.length) return items;
  const next = [...items];
  next[index] = item;
  return sortItems(next);
}

/** Pure: remove at index. Out-of-range index is a no-op. */
export function deleteItem(items: FixedCost[], index: number): FixedCost[] {
  if (index < 0 || index >= items.length) return items;
  const next = [...items];
  next.splice(index, 1);
  return next;
}
