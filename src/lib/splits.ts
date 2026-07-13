import { z } from 'zod';
import type { TransactionSplit } from '@/types';

/**
 * Pure helpers + Zod schema for the transaction split editor (US-4).
 *
 * Stored shape (mirrors `TransactionSplit` in src/types and the functions-side
 * reader in functions/src/shared/aggregations.ts `TransactionDoc`):
 *   { amount: number; categoryId: string; note: string | null }
 *
 * IMPORTANT: split amounts are stored as POSITIVE euro values regardless of
 * the transaction's sign — the backend aggregations skip any split with
 * `amount <= 0` and add `split.amount` directly to category spending, so the
 * UI must write positive amounts that sum to `Math.abs(transaction.amount)`.
 * All sum/remainder math here is done in integer cents to avoid float drift.
 */

/** Hard cap on editor rows — keeps the doc small and the UI sane. */
export const MAX_SPLIT_ROWS = 10;

/** One editor row. `amountText` is the raw input string (parsed on the fly). */
export interface SplitRowInput {
  amountText: string;
  categoryId: string;
  note: string;
}

export interface SplitFormValues {
  splits: SplitRowInput[];
}

/** Round a euro value to whole cents (guards float artifacts like 20.499999…). */
export function roundToCents(value: number): number {
  return Math.round(value * 100) / 100;
}

function toCents(value: number): number {
  return Math.round(value * 100);
}

/**
 * Parse a user-typed euro amount. Accepts both NL comma decimals ("20,50")
 * and dot decimals ("20.50"), an optional leading € and grouping separators
 * ("1.234,56"). Returns the value in euros, or null when unparseable.
 */
export function parseAmountInput(text: string): number | null {
  let s = text.replace(/[€\s]/g, '');
  if (s === '') return null;

  const lastComma = s.lastIndexOf(',');
  const lastDot = s.lastIndexOf('.');
  if (lastComma !== -1 && lastDot !== -1) {
    // Both present → the later one is the decimal separator, the other grouping.
    const decimalSep = lastComma > lastDot ? ',' : '.';
    const groupSep = decimalSep === ',' ? '.' : ',';
    s = s.split(groupSep).join('');
    s = s.replace(decimalSep, '.');
  } else {
    s = s.replace(',', '.');
  }

  if (!/^-?\d+(\.\d+)?$/.test(s)) return null;
  const value = Number(s);
  if (!Number.isFinite(value)) return null;
  return roundToCents(value);
}

/** Format a euro value as plain input text ("20.50") for prefills. */
export function amountToInputText(value: number): string {
  return roundToCents(value).toFixed(2);
}

/**
 * Remaining amount (euros) still to be allocated: `totalAbs − Σ rows`.
 * Null/unparsed row amounts count as 0 so the display works while typing.
 * Computed in cents, so an exactly-allocated split returns exactly 0.
 */
export function splitRemainder(totalAbs: number, amounts: Array<number | null>): number {
  const allocated = amounts.reduce<number>((sum, a) => sum + (a !== null ? toCents(a) : 0), 0);
  return (toCents(totalAbs) - allocated) / 100;
}

/**
 * True when `splits` is a valid stored split for a transaction of
 * `Math.abs(amount) === totalAbs`: at least 2 rows, every amount positive,
 * and the cent-exact sum equals the total. (Matches PRD §10 `validateSplits`.)
 */
export function validateSplits(totalAbs: number, splits: Array<{ amount: number }>): boolean {
  if (splits.length < 2) return false;
  if (splits.some((s) => s.amount <= 0)) return false;
  return splitRemainder(totalAbs, splits.map((s) => s.amount)) === 0;
}

/**
 * Zod schema for the editor form. Row-level checks (parseable positive
 * amount, category picked) always apply; the sum-equals-total check only
 * applies with 2+ rows — a single remaining row means "remove the split"
 * and is submitted through a separate path.
 */
export function makeSplitFormSchema(totalAbs: number) {
  return z.object({
    splits: z
      .array(
        z.object({
          amountText: z.string().refine(
            (s) => {
              const v = parseAmountInput(s);
              return v !== null && v > 0;
            },
            { message: 'Enter an amount above €0' }
          ),
          categoryId: z.string().min(1, { message: 'Pick a category' }),
          note: z.string(),
        })
      )
      .min(1)
      .max(MAX_SPLIT_ROWS)
      .superRefine((rows, ctx) => {
        if (rows.length < 2) return; // single row → un-split path, no sum check
        const amounts = rows.map((r) => parseAmountInput(r.amountText));
        if (amounts.some((a) => a === null || a <= 0)) return; // row errors already reported
        if (splitRemainder(totalAbs, amounts) !== 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Split amounts must add up to the transaction amount',
          });
        }
      }),
  });
}

/** Convert validated editor rows to the stored `splits[]` shape. */
export function rowsToStoredSplits(rows: SplitRowInput[]): TransactionSplit[] {
  return rows.map((row) => {
    const note = row.note.trim();
    return {
      amount: parseAmountInput(row.amountText) ?? 0,
      categoryId: row.categoryId,
      note: note === '' ? null : note,
    };
  });
}
