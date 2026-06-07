import type { TimelineRow, FixedCost } from './burnUp.types';

export type { TimelineRow, FixedCost };

/**
 * Build the cumulative-spend array for the burn-up chart.
 *
 * Index 0 = €0 at month start. Index d = cumulative spend through
 * day-of-month d. Length = today + 1.
 *
 * Each day's expenses are bucketed by the day-of-month parsed from its
 * `dateKey`, NOT by the row's position in the array. The dashboard
 * `timeline` can carry a spurious leading (or trailing) day when the
 * month's local boundaries cross a UTC date — e.g. a "2026-04-30" row
 * for a CEST May, because the local-midnight start serializes to the
 * previous day in UTC. A position-based cumulative would let that extra
 * row shift everything back by a day, so `daily[today]` would land on
 * yesterday and miss today's spend. `monthKey` ("YYYY-MM") scopes the
 * rows to the visible month so adjacent-month days never interfere.
 *
 * Re-uses the dashboard `timeline` rows (already excludes transfers,
 * pending reimbursements, and excludeFromTotals — same exclusions as
 * the displayed `spent` total) so `daily[today]` matches the header
 * spent number.
 */
export function buildDailyActual(
  timeline: TimelineRow[],
  today: number,
  monthKey?: string
): number[] {
  if (today < 0) return [0];

  const byDay: number[] = Array.from({ length: today + 1 }, () => 0);
  for (const row of timeline) {
    if (monthKey && !row.dateKey.startsWith(monthKey)) continue;
    const dom = Number(row.dateKey.slice(8, 10));
    if (dom >= 1 && dom <= today) byDay[dom] = (byDay[dom] ?? 0) + row.expenses;
  }

  const out: number[] = [0];
  let running = 0;
  for (let d = 1; d <= today; d++) {
    running += byDay[d] ?? 0;
    out.push(running);
  }
  return out;
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
 * Stable identity for a schedule item, used to persist a manual "mark as
 * posted" override (`users/{uid}/settings/fixedMatches`) and as the React key
 * for the chart's hollow markers. FixedCost has no id, so the {day, label,
 * amount} triple is the key. Editing any of those three re-keys the item and
 * drops a stale override — acceptable for a per-month, low-stakes override.
 */
export const fixedCostKey = (f: FixedCost): string => `${f.d}|${f.l}|${f.a}`;

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
 *
 * `manualPostedKeys` holds `fixedCostKey`s the user has explicitly marked as
 * already posted (the heuristic missed the real charge — different merchant
 * name, amount drift > tolerance). Those items skip the heuristic and go
 * straight to `posted` without claiming a transaction, so they drop out of the
 * "still to post" footnote, the hollow markers, and the projection step-ups.
 */
export function matchFixedToActuals(
  fixed: FixedCost[],
  txns: MatchableTxn[],
  amountTolerance = 0.2,
  manualPostedKeys: ReadonlySet<string> = new Set()
): MatchedSchedule {
  const expenses = txns.filter((t) => t.amount < 0);
  const claimed = new Set<number>();
  const posted: FixedCost[] = [];
  const unposted: FixedCost[] = [];

  for (const f of fixed) {
    if (manualPostedKeys.has(fixedCostKey(f))) {
      posted.push(f);
      continue;
    }
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

export interface ProjectionBreakdown {
  /** Spend already booked plus fixed costs still certain to post. */
  committed: number;
  /** Forecast discretionary (variable) spend from today to month-end. */
  variable: number;
  /** projectedEnd − budget. Positive = projected over budget. */
  over: number;
}

export interface Projection {
  projectedEnd: number;
  /** Central (shrinkage-smoothed) projection for each day-of-month. */
  perDay: (d: number) => number;
  /** Lower edge of the uncertainty cone (optimistic variable burn). */
  lowPerDay: (d: number) => number;
  /** Upper edge of the uncertainty cone (pessimistic variable burn). */
  highPerDay: (d: number) => number;
  /** Fixed-vs-variable decomposition of the central projection. */
  breakdown: ProjectionBreakdown;
}

/**
 * Strength of the budget-pace prior (in days) used to shrink the observed
 * variable burn rate. With few observed days the projection sits near budget
 * pace; it converges to the raw observed rate as the month fills in. This stops
 * the headline number from swinging wildly on a single big day early on.
 */
const PRIOR_DAYS = 7;

/**
 * Half-width of the uncertainty cone, at month-end, on day 1 — as a fraction of
 * the projected variable rate. Decays linearly to 0 as the calendar advances,
 * so later forecasts are tighter (more evidence ⇒ a narrower cone).
 */
const BASE_SPREAD = 0.4;

/**
 * Projection from today to month-end: a shrinkage-smoothed central path plus an
 * uncertainty cone, with the remaining fixed-cost step-ups layered on.
 *
 * `posted` items are already inside `daily[today]` — don't double-count them.
 * `unposted` items step in at their scheduled day, except:
 *   - overdue items (f.d ≤ today) are pushed to `today + 1`
 *   - items past month-end (f.d > daysInMonth) are capped at month-end
 *
 * Variable burn is shrunk toward the budgeted variable rate (the same slope the
 * gray expected line uses):
 *   obsRate     = max(0, (todaySpent − postedSoFar) / today)
 *   budgetRate  = max(0, budget − fixedSum) / daysInMonth
 *   blendedRate = (today·obsRate + PRIOR_DAYS·budgetRate) / (today + PRIOR_DAYS)
 *
 * The cone is a point at `today` and fans out to month-end; its opening shrinks
 * as `today` advances. Fixed step-ups are identical across the central, low,
 * and high paths (fixed is certain), so the band's thickness is variable-only.
 *
 * The summary line and the dashed central projection in the chart both call
 * `perDay(daysInMonth)`, so the on-screen "PROJECTED €X" lands exactly where
 * the central line ends.
 */
export function computeProjection(
  daily: number[],
  posted: FixedCost[],
  unposted: FixedCost[],
  today: number,
  daysInMonth: number,
  budget: number,
  fixedSum: number
): Projection {
  if (today <= 0) {
    const zero = () => 0;
    return {
      projectedEnd: 0,
      perDay: zero,
      lowPerDay: zero,
      highPerDay: zero,
      breakdown: { committed: 0, variable: 0, over: -budget },
    };
  }

  const todaySpent = daily[today] ?? 0;
  const postedSoFar = posted.reduce((s, f) => s + f.a, 0);
  const unpostedSum = unposted.reduce((s, f) => s + f.a, 0);

  const obsRate = Math.max(0, (todaySpent - postedSoFar) / today);
  const budgetRate = daysInMonth > 0 ? Math.max(0, budget - fixedSum) / daysInMonth : 0;
  const blendedRate = (today * obsRate + PRIOR_DAYS * budgetRate) / (today + PRIOR_DAYS);

  const spread = BASE_SPREAD * (1 - today / daysInMonth);
  const lowRate = blendedRate * (1 - spread);
  const highRate = blendedRate * (1 + spread);

  const effectiveDay = (f: FixedCost): number =>
    Math.min(daysInMonth, Math.max(today + 1, f.d));

  const fixedAfter = (d: number): number =>
    unposted.filter((f) => effectiveDay(f) <= d).reduce((s, f) => s + f.a, 0);

  const perDayAt =
    (rate: number) =>
    (d: number): number => {
      if (d <= today) return daily[d] ?? todaySpent;
      return todaySpent + rate * (d - today) + fixedAfter(d);
    };

  const perDay = perDayAt(blendedRate);
  const projectedEnd = perDay(daysInMonth);

  return {
    projectedEnd,
    perDay,
    lowPerDay: perDayAt(lowRate),
    highPerDay: perDayAt(highRate),
    breakdown: {
      committed: todaySpent + unpostedSum,
      variable: blendedRate * (daysInMonth - today),
      over: projectedEnd - budget,
    },
  };
}

/**
 * Sum of fixed costs still expected to post (upcoming + overdue).
 * Drives the "€XXX FIXED COSTS STILL TO POST" footnote.
 */
export function fixedRemaining(unposted: FixedCost[]): number {
  return unposted.reduce((s, f) => s + f.a, 0);
}
