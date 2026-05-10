import type { TimelineRow, FixedCost } from './burnUp.types';

export type { TimelineRow, FixedCost };

/**
 * Build the cumulative-spend array for the burn-up chart.
 *
 * Index 0 = €0 at month start. Final index = today's day-of-month.
 * Length = today + 1.
 *
 * Re-uses the dashboard `timeline` rows (already excludes transfers,
 * pending reimbursements, and excludeFromTotals — same exclusions as
 * the displayed `spent` total) so `daily[today]` matches the header
 * spent number.
 */
export function buildDailyActual(timeline: TimelineRow[], today: number): number[] {
  if (today < 0) return [0];

  const sorted = [...timeline].sort((a, b) => a.dateKey.localeCompare(b.dateKey));
  const out: number[] = [0];
  let running = 0;
  for (const row of sorted) {
    if (out.length > today) break;
    running += row.expenses;
    out.push(running);
  }
  while (out.length <= today) out.push(running);
  return out.slice(0, today + 1);
}

/**
 * Expected pace at end of each day-of-month [0..daysInMonth].
 *
 * Step function: cumulative fixed costs scheduled by day + linear
 * variable burn at variableRate = (budget - sum(fixed)) / daysInMonth.
 *
 * Items scheduled past month-end (e.g. d=31 in a 30-day month) are
 * capped to the last day so they still show up.
 *
 * At d = daysInMonth this lands on `budget` exactly when the fixed
 * schedule sums to ≤ budget (the typical case). When variableBudget
 * goes negative (fixed > budget) the rate is clamped to 0 and the
 * line just steps up at each fixed date.
 */
export function computeExpected(
  daysInMonth: number,
  fixed: FixedCost[],
  budget: number
): number[] {
  const fixedSum = fixed.reduce((s, f) => s + f.a, 0);
  const variableBudget = Math.max(0, budget - fixedSum);
  const variableRate = daysInMonth > 0 ? variableBudget / daysInMonth : 0;

  const effectiveDay = (f: FixedCost) => Math.min(daysInMonth, f.d);

  const out: number[] = [];
  for (let d = 0; d <= daysInMonth; d++) {
    const fixedByDay = fixed
      .filter((f) => effectiveDay(f) <= d)
      .reduce((s, f) => s + f.a, 0);
    out.push(fixedByDay + variableRate * d);
  }
  return out;
}

/**
 * Minimal transaction shape the matcher needs.
 *
 * `excludeFromTotals` and reimbursement-pending transactions should be
 * filtered out by the caller — they are not part of the spent total
 * the chart tracks.
 */
export interface MatchableTxn {
  amount: number;
  counterparty: string | null;
}

export interface MatchedSchedule {
  /** Items whose corresponding transaction is already in `daily`. */
  posted: FixedCost[];
  /** Items still expected (either upcoming or overdue). */
  unposted: FixedCost[];
}

function normalizeLabel(label: string): string {
  return label
    .replace(/\([^)]*\)/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Greedy match between scheduled fixed costs and real transactions.
 *
 * For each scheduled item, pick the unclaimed expense with the closest
 * amount whose counterparty contains the (paren-stripped, lowercased)
 * label as a substring AND whose amount is within `amountTolerance`.
 *
 * Each transaction can match at most one schedule item, so multi-line
 * schedules (e.g. three Odido lines) get paired one-to-one with the
 * three Odido charges in the month.
 *
 * Items without a match are returned in `unposted` and the projection
 * still expects them to land — even when their scheduled date has
 * already passed (overdue → `today + 1`).
 */
export function matchFixedToActuals(
  fixed: FixedCost[],
  txns: MatchableTxn[],
  amountTolerance = 0.2
): MatchedSchedule {
  const expenses = txns.filter((t) => t.amount < 0);
  const claimed = new Set<number>();
  const posted: FixedCost[] = [];
  const unposted: FixedCost[] = [];

  for (const f of fixed) {
    const needle = normalizeLabel(f.l);
    if (!needle) {
      unposted.push(f);
      continue;
    }
    let bestIdx = -1;
    let bestDrift = Infinity;
    for (let i = 0; i < expenses.length; i++) {
      if (claimed.has(i)) continue;
      const t = expenses[i];
      if (!t) continue;
      const cp = (t.counterparty ?? '').toLowerCase();
      if (!cp.includes(needle)) continue;
      const a = Math.abs(t.amount);
      const drift = f.a > 0 ? Math.abs(a - f.a) / f.a : Infinity;
      if (drift > amountTolerance) continue;
      if (drift < bestDrift) {
        bestDrift = drift;
        bestIdx = i;
      }
    }
    if (bestIdx >= 0) {
      claimed.add(bestIdx);
      posted.push(f);
    } else {
      unposted.push(f);
    }
  }
  return { posted, unposted };
}

export interface Projection {
  projectedEnd: number;
  perDay: (d: number) => number;
}

/**
 * Linear projection from today to month-end, layered with the
 * remaining fixed-cost step-ups.
 *
 * `posted` items are already inside `daily[today]` — don't double-
 * count them. `unposted` items step in at their scheduled day, except:
 *   - overdue items (f.d ≤ today) are pushed to `today + 1`
 *   - items past month-end (f.d > daysInMonth) are capped at month-end
 *
 * variableProj = max(0, (todaySpent - postedSoFar) / today)
 * projected[d] = todaySpent + variableProj × (d - today)
 *              + sum of unposted whose effectiveDay ≤ d
 *
 * The summary line and the dashed projection in the chart both call
 * `perDay(daysInMonth)` so the on-screen "AT THIS PACE €X" lands
 * exactly where the line ends.
 */
export function computeProjection(
  daily: number[],
  posted: FixedCost[],
  unposted: FixedCost[],
  today: number,
  daysInMonth: number
): Projection {
  if (today <= 0) return { projectedEnd: 0, perDay: () => 0 };

  const todaySpent = daily[today] ?? 0;
  const postedSoFar = posted.reduce((s, f) => s + f.a, 0);
  const variableProj = Math.max(0, (todaySpent - postedSoFar) / today);

  const effectiveDay = (f: FixedCost): number =>
    Math.min(daysInMonth, Math.max(today + 1, f.d));

  const perDay = (d: number): number => {
    if (d <= today) return daily[d] ?? todaySpent;
    const fixedAfter = unposted
      .filter((f) => effectiveDay(f) <= d)
      .reduce((s, f) => s + f.a, 0);
    return todaySpent + variableProj * (d - today) + fixedAfter;
  };

  return { projectedEnd: perDay(daysInMonth), perDay };
}

/**
 * Sum of fixed costs still expected to post (upcoming + overdue).
 * Drives the "€XXX FIXED COSTS STILL TO POST" footnote.
 */
export function fixedRemaining(unposted: FixedCost[]): number {
  return unposted.reduce((s, f) => s + f.a, 0);
}
