import { format } from 'date-fns';

/**
 * ICS statement coverage helpers.
 *
 * The ICS (ABN AMRO credit card) statement is a monthly chore: one statement
 * per calendar month, debited around the 1st. These pure helpers turn the set
 * of imported statements into a contiguous month-by-month timeline so the UI
 * can show which months are imported and which are still missing (gaps).
 *
 * Kept free of React/Firebase so the month-sequencing logic can be unit-tested
 * in isolation. Month math is done on integer indices (year*12 + month) to stay
 * timezone-stable — never via Date arithmetic on 'yyyy-MM' strings.
 */

/** One imported statement, reduced to what coverage needs. */
export interface IcsStatementSummary {
  statementId: string;
  monthKey: string; // 'yyyy-MM'
  total: number;
  transactionsCreated: number;
  importedAt: Date | null;
}

/** One row in the coverage timeline. */
export interface IcsMonthCoverage {
  monthKey: string; // 'yyyy-MM'
  monthLabel: string; // 'May 2026'
  imported: boolean;
  statementId?: string;
  total?: number;
  transactionsCreated?: number;
  importedAt?: Date;
}

function keyToNum(key: string): number {
  const parts = key.split('-');
  return Number(parts[0]) * 12 + (Number(parts[1]) - 1);
}

function numToKey(n: number): string {
  const y = Math.floor(n / 12);
  const m = (n % 12) + 1;
  return `${y}-${String(m).padStart(2, '0')}`;
}

/** 'yyyy-MM' → 'MMMM yyyy' (e.g. '2026-05' → 'May 2026'). TZ-safe. */
export function monthKeyLabel(key: string): string {
  const parts = key.split('-');
  const y = Number(parts[0]);
  const m = Number(parts[1]);
  return format(new Date(y, m - 1, 1), 'MMMM yyyy');
}

/**
 * Build a contiguous, newest-first coverage timeline spanning the earliest
 * imported statement's month through `nowMonthKey` (today). Any month in that
 * span without a statement is a gap (`imported: false`).
 *
 * Returns `[]` when there are no statements — the feature is opt-in, so we
 * don't invent a timeline for users who have never imported.
 */
export function buildIcsCoverage(
  statements: IcsStatementSummary[],
  nowMonthKey: string
): IcsMonthCoverage[] {
  if (statements.length === 0) return [];

  const byKey = new Map<string, IcsStatementSummary>();
  for (const s of statements) byKey.set(s.monthKey, s);

  const stmtNums = statements.map((s) => keyToNum(s.monthKey));
  const startNum = Math.min(...stmtNums);
  // End at today, but never clip a (rare) statement dated in a future month.
  const endNum = Math.max(keyToNum(nowMonthKey), ...stmtNums);

  const rows: IcsMonthCoverage[] = [];
  for (let n = endNum; n >= startNum; n--) {
    const monthKey = numToKey(n);
    const monthLabel = monthKeyLabel(monthKey);
    const stmt = byKey.get(monthKey);
    if (stmt) {
      rows.push({
        monthKey,
        monthLabel,
        imported: true,
        statementId: stmt.statementId,
        total: stmt.total,
        transactionsCreated: stmt.transactionsCreated,
        ...(stmt.importedAt ? { importedAt: stmt.importedAt } : {}),
      });
    } else {
      rows.push({ monthKey, monthLabel, imported: false });
    }
  }
  return rows;
}

/** Months with no statement (newest first). */
export function missingMonths(coverage: IcsMonthCoverage[]): IcsMonthCoverage[] {
  return coverage.filter((m) => !m.imported);
}

/**
 * The most recent month that should already have a statement but doesn't —
 * i.e. the newest gap that is not in the future. This is what the reminder
 * banner nags about. Returns null when fully caught up.
 */
export function latestMissingMonth(
  coverage: IcsMonthCoverage[],
  nowMonthKey: string
): IcsMonthCoverage | null {
  return coverage.find((m) => !m.imported && m.monthKey <= nowMonthKey) ?? null;
}
