import { formatAmount } from '@/lib/utils';
import type { Category, Transaction } from '@/types';

/**
 * The transaction row's secondary ("meta") line. Pure string building, kept
 * beside `groupTransactions.ts` rather than inside TransactionList so it stays
 * directly unit-testable and the list file only exports components.
 */

export function hasSplits(t: Transaction): boolean {
  return t.isSplit && !!t.splits && t.splits.length > 0;
}

// At most this many tags get their own `#tag` marker on the meta line; any
// beyond that collapse into a `+N` counter so the line stays scannable.
const META_TAG_LIMIT = 2;

/** `#work #trip` (plus `+N` when truncated), or null when the txn has no tags. */
function buildTagLabel(tags: string[] | undefined): string | null {
  if (!tags || tags.length === 0) return null;
  const shown = tags.slice(0, META_TAG_LIMIT).map((tag) => `#${tag}`);
  const extra = tags.length - shown.length;
  return [...shown, ...(extra > 0 ? [`+${extra}`] : [])].join(' ');
}

export function buildMetaLine(t: Transaction, categoriesById: Map<string, Category>): string {
  // Split transactions (US-4): the category slot reads "SPLIT (N)" plus the
  // per-split category names instead of a single category.
  let categoryLabel: string;
  if (hasSplits(t)) {
    const names = (t.splits ?? []).map((s) => categoriesById.get(s.categoryId)?.name ?? 'Category');
    categoryLabel = `SPLIT (${t.splits?.length ?? 0}) · ${names.join(' + ')}`.toUpperCase();
  } else if (!t.categoryId) {
    categoryLabel = 'UNCATEGORIZED';
  } else {
    const cat = categoriesById.get(t.categoryId);
    categoryLabel = (cat?.name ?? 'CATEGORY').toUpperCase();
  }

  const parts = [categoryLabel];

  if (t.reimbursement?.status === 'pending') {
    parts.push(`REIMB ${formatAmount(Math.abs(t.amount), { showSign: false })}`);
  } else if (t.reimbursement?.status === 'cleared') {
    parts.push('REIMBURSED ✓');
  }

  // Tags are the last marker on the line — same ` · ` separator convention as
  // the split/reimbursement markers. The row CSS-uppercases the whole line.
  const tagLabel = buildTagLabel(t.tags);
  if (tagLabel) parts.push(tagLabel);

  return parts.join(' · ');
}
