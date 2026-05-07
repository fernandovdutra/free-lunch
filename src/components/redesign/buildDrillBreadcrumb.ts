import type { Category } from '@/types';
import type { BreadcrumbSegment } from './Breadcrumb';

interface BuildArgs {
  pathname: string;
  categories: Category[] | undefined;
  /** Display label for an unresolved category id (e.g., when categories haven't loaded yet). */
  fallbackLabel?: string;
}

const ROOT_LABELS: Record<string, string> = {
  expenses: 'EXPENSES',
  income: 'INCOME',
};

/**
 * Builds the segment list for the in-page Breadcrumb on drill pages.
 *
 * Path conventions (matches App.tsx):
 *   /expenses                                                    → [EXPENSES]
 *   /expenses/:categoryId                                        → [EXPENSES, <CategoryName>]
 *   /expenses/:categoryId/:subcategoryId                         → [EXPENSES, <Category>, <Subcategory>]
 *   /income/...                                                  → mirror via 'income' root
 *
 * The Breadcrumb component itself truncates display to the last 2 segments
 * (per v8 frame 06 "GROCERIES › SUPERMARKET"); this helper returns the full
 * chain so callers can walk it for navigation.
 */
export function buildDrillBreadcrumb({
  pathname,
  categories,
  fallbackLabel = '…',
}: BuildArgs): BreadcrumbSegment[] {
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length === 0) return [];

  const root = parts[0];
  const rootLabel = ROOT_LABELS[root ?? ''] ?? (root ?? '').toUpperCase();
  const segs: BreadcrumbSegment[] = [{ label: rootLabel, href: `/${root}` }];

  const cats = categories ?? [];
  if (parts.length >= 2) {
    const categoryId = parts[1];
    const cat = cats.find((c) => c.id === categoryId);
    segs.push({
      label: (cat?.name ?? fallbackLabel).toUpperCase(),
      href: `/${root}/${categoryId}`,
    });
  }

  if (parts.length >= 3) {
    const subcategoryId = parts[2];
    const sub = cats.find((c) => c.id === subcategoryId);
    segs.push({
      label: (sub?.name ?? fallbackLabel).toUpperCase(),
      href: `/${root}/${parts[1]}/${subcategoryId}`,
    });
  }

  // Mark the last segment as current (no href).
  if (segs.length > 0) {
    const last = segs[segs.length - 1];
    if (last) {
      delete last.href;
    }
  }

  return segs;
}
