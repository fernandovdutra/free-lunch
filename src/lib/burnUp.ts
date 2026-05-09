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

  const out: number[] = [];
  for (let d = 0; d <= daysInMonth; d++) {
    const fixedByDay = fixed.filter((f) => f.d <= d).reduce((s, f) => s + f.a, 0);
    out.push(fixedByDay + variableRate * d);
  }
  return out;
}

export interface Projection {
  projectedEnd: number;
  perDay: (d: number) => number;
}

/**
 * Linear projection from today to month-end, layered with the
 * remaining fixed-cost step-ups.
 *
 * variableProj = (todaySpent - fixedSoFar) / today
 * projected[d] = todaySpent + variableProj × (d - today)
 *              + sum of fixedCosts scheduled in (today, d]
 *
 * The summary line and the dashed projection in the chart both call
 * `perDay(daysInMonth)` so the on-screen "AT THIS PACE €X" lands
 * exactly where the line ends.
 */
export function computeProjection(
  daily: number[],
  fixed: FixedCost[],
  today: number,
  daysInMonth: number
): Projection {
  if (today <= 0) return { projectedEnd: 0, perDay: () => 0 };

  const todaySpent = daily[today] ?? 0;
  const fixedSoFar = fixed.filter((f) => f.d <= today).reduce((s, f) => s + f.a, 0);
  const variableProj = (todaySpent - fixedSoFar) / today;

  const perDay = (d: number): number => {
    if (d <= today) return daily[d] ?? todaySpent;
    const fixedAfter = fixed
      .filter((f) => f.d > today && f.d <= d)
      .reduce((s, f) => s + f.a, 0);
    return todaySpent + variableProj * (d - today) + fixedAfter;
  };

  return { projectedEnd: perDay(daysInMonth), perDay };
}

/**
 * Sum of fixed costs scheduled strictly after `today`. Used for the
 * footnote: "€XXX FIXED COSTS STILL TO POST".
 */
export function fixedRemaining(fixed: FixedCost[], today: number): number {
  return fixed.filter((f) => f.d > today).reduce((s, f) => s + f.a, 0);
}
