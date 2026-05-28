import { describe, it, expect } from 'vitest';
import {
  buildDailyActual,
  computeExpected,
  computeProjection,
  fixedRemaining,
  matchFixedToActuals,
} from '../burnUp';

describe('buildDailyActual', () => {
  it('produces a cumulative array of length today + 1', () => {
    const timeline = [
      { dateKey: '2026-05-01', expenses: 0 },
      { dateKey: '2026-05-02', expenses: 50 },
      { dateKey: '2026-05-03', expenses: 25 },
    ];
    const out = buildDailyActual(timeline, 3);
    expect(out).toHaveLength(4); // 0..3 = 4 entries
    expect(out[0]).toBe(0);
    expect(out[3]).toBe(75);
  });

  it('matches summary.totalExpenses at today (single source of truth)', () => {
    const timeline = [
      { dateKey: '2026-05-01', expenses: 100 },
      { dateKey: '2026-05-02', expenses: 50 },
      { dateKey: '2026-05-03', expenses: 25 },
      { dateKey: '2026-05-04', expenses: 200 },
    ];
    const totalExpenses = 100 + 50 + 25 + 200;
    const today = 4;
    const out = buildDailyActual(timeline, today);
    expect(out[today]).toBe(totalExpenses);
  });

  it('handles unsorted input', () => {
    const timeline = [
      { dateKey: '2026-05-03', expenses: 25 },
      { dateKey: '2026-05-01', expenses: 100 },
      { dateKey: '2026-05-02', expenses: 50 },
    ];
    const out = buildDailyActual(timeline, 3);
    expect(out).toEqual([0, 100, 150, 175]);
  });

  it('returns [0] when today is 0', () => {
    expect(buildDailyActual([], 0)).toEqual([0]);
  });
});

describe('computeExpected', () => {
  it('lands on budget at month-end with empty fixed schedule', () => {
    const exp = computeExpected(30, [], 3000);
    expect(exp[30]).toBeCloseTo(3000, 6);
    expect(exp[0]).toBe(0);
    expect(exp[15]).toBeCloseTo(1500, 6);
  });

  it('lands on budget at month-end with a fixed schedule that fits', () => {
    const fixed = [
      { d: 1, a: 1200, l: 'rent' },
      { d: 5, a: 100, l: 'internet' },
    ];
    const exp = computeExpected(30, fixed, 3000);
    expect(exp[30]).toBeCloseTo(3000, 6);
  });

  it('steps up at each scheduled fixed cost', () => {
    const fixed = [{ d: 5, a: 1200, l: 'rent' }];
    const exp = computeExpected(30, fixed, 3000);
    // Variable budget = 1800, rate = 60/day.
    // At d=4 (rent not yet posted): 0 + 60*4 = 240
    // At d=5 (rent posted): 1200 + 60*5 = 1500
    expect(exp[4]).toBeCloseTo(240, 6);
    expect(exp[5]).toBeCloseTo(1500, 6);
  });

  it('clamps variable rate to 0 when fixed exceeds budget', () => {
    const fixed = [{ d: 1, a: 5000, l: 'rent' }];
    const exp = computeExpected(30, fixed, 3000);
    expect(exp[0]).toBe(0);
    expect(exp[1]).toBe(5000);
    expect(exp[30]).toBe(5000);
  });

  it('caps fixed costs scheduled past month-end to the last day', () => {
    const fixed = [{ d: 31, a: 120, l: 'tax' }];
    const exp = computeExpected(30, fixed, 1000);
    // Without capping the d=31 item never lands and the line ends at
    // 880 instead of 1000. With capping it steps in at d=30.
    expect(exp[29]).toBeCloseTo((1000 - 120) * (29 / 30), 6);
    expect(exp[30]).toBeCloseTo(1000, 6);
  });
});

describe('matchFixedToActuals', () => {
  it('matches a fixed cost to its transaction by counterparty + amount', () => {
    const fixed = [{ d: 1, a: 633.73, l: 'Santander Leasing B.V.' }];
    const txns = [{ counterparty: 'Santander Leasing B.V.', amount: -633.73 }];
    const { posted, unposted } = matchFixedToActuals(fixed, txns);
    expect(posted).toHaveLength(1);
    expect(unposted).toHaveLength(0);
  });

  it('leaves unmatched items in unposted', () => {
    const fixed = [{ d: 22, a: 356.06, l: 'CA AUTO FIN NED' }];
    const txns = [{ counterparty: 'Albert Heijn', amount: -42 }];
    const { posted, unposted } = matchFixedToActuals(fixed, txns);
    expect(posted).toHaveLength(0);
    expect(unposted).toHaveLength(1);
  });

  it('rejects a counterparty match whose amount is outside tolerance', () => {
    const fixed = [{ d: 1, a: 100, l: 'Foo' }];
    const txns = [{ counterparty: 'Foo Bar', amount: -200 }]; // 100% drift
    const { posted, unposted } = matchFixedToActuals(fixed, txns);
    expect(posted).toHaveLength(0);
    expect(unposted).toHaveLength(1);
  });

  it('accepts amount within tolerance (utility bills can drift)', () => {
    const fixed = [{ d: 28, a: 105.79, l: 'Tibber' }];
    const txns = [{ counterparty: 'Tibber Netherlands B.V.', amount: -120.5 }];
    const { posted } = matchFixedToActuals(fixed, txns);
    expect(posted).toHaveLength(1);
  });

  it('strips parenthesized suffixes from labels (Odido bundle/line)', () => {
    const fixed = [
      { d: 19, a: 70.08, l: 'Odido (bundle)' },
      { d: 19, a: 27.08, l: 'Odido (line)' },
      { d: 24, a: 31.59, l: 'Odido (line)' },
    ];
    const txns = [
      { counterparty: 'Odido', amount: -70.08 },
      { counterparty: 'Odido', amount: -27.08 },
      { counterparty: 'Odido', amount: -31.59 },
    ];
    const { posted, unposted } = matchFixedToActuals(fixed, txns);
    expect(posted).toHaveLength(3);
    expect(unposted).toHaveLength(0);
  });

  it('greedy: each transaction claims one schedule item', () => {
    const fixed = [
      { d: 19, a: 70.08, l: 'Odido' },
      { d: 19, a: 70.08, l: 'Odido' },
    ];
    const txns = [{ counterparty: 'Odido', amount: -70.08 }];
    const { posted, unposted } = matchFixedToActuals(fixed, txns);
    expect(posted).toHaveLength(1);
    expect(unposted).toHaveLength(1);
  });

  it('ignores positive (income) transactions', () => {
    const fixed = [{ d: 1, a: 100, l: 'Foo' }];
    const txns = [{ counterparty: 'Foo', amount: 100 }];
    const { posted } = matchFixedToActuals(fixed, txns);
    expect(posted).toHaveLength(0);
  });
});

describe('computeProjection', () => {
  it('projects flat when on-pace with no remaining fixed', () => {
    const daily = [0, 100, 200, 300]; // €100/day
    const today = 3;
    const { projectedEnd } = computeProjection(daily, [], [], today, 30);
    // Variable proj = 100/day, no fixed. End: 300 + 100 * 27 = 3000.
    expect(projectedEnd).toBeCloseTo(3000, 6);
  });

  it('layers unposted fixed costs on the projection without double-counting posted', () => {
    const daily = [0, 100, 200, 300];
    const today = 3;
    // 50 already in daily (day 2 subscription), 1200 still upcoming.
    const posted = [{ d: 2, a: 50, l: 'subs' }];
    const unposted = [{ d: 20, a: 1200, l: 'rent' }];
    const { projectedEnd } = computeProjection(daily, posted, unposted, today, 30);
    // postedSoFar = 50, variableProj = (300 - 50) / 3 = 83.333
    // perDay(30) = 300 + 83.333 * 27 + 1200 = 300 + 2250 + 1200 = 3750
    expect(projectedEnd).toBeCloseTo(3750, 4);
  });

  it('pushes overdue unposted items to today + 1', () => {
    // Today is day 21; rent was scheduled day 18 but never posted.
    // Variable rate ~ 50/day with no posted fixed.
    const daily = Array.from({ length: 22 }, (_, i) => i * 50);
    const today = 21;
    const unposted = [{ d: 18, a: 1000, l: 'rent' }];
    const { perDay } = computeProjection(daily, [], unposted, today, 30);
    // At d=21: still daily[21] = 1050.
    // At d=22: rent shows up (overdue → today+1), plus 50 variable.
    //         1050 + 1000 + 50 = 2100.
    expect(perDay(21)).toBeCloseTo(1050, 6);
    expect(perDay(22)).toBeCloseTo(2100, 6);
  });

  it('caps unposted items past month-end at the last day', () => {
    const daily = Array.from({ length: 11 }, (_, i) => i * 30);
    const today = 10;
    const unposted = [{ d: 31, a: 120, l: 'tax' }]; // 30-day month
    const { perDay, projectedEnd } = computeProjection(daily, [], unposted, today, 30);
    // At d=29: tax not yet (effectiveDay = min(30, max(11, 31)) = 30).
    // At d=30: tax steps in.
    expect(perDay(29)).toBeLessThan(perDay(30));
    expect(projectedEnd).toBeCloseTo(perDay(30), 6);
  });

  it('returns 0 when today is 0', () => {
    const { projectedEnd, perDay } = computeProjection([0], [], [], 0, 30);
    expect(projectedEnd).toBe(0);
    expect(perDay(15)).toBe(0);
  });

  it('summary number matches projection endpoint exactly', () => {
    const daily = [0, 80, 160, 240, 320];
    const today = 4;
    const unposted = [{ d: 28, a: 500, l: 'rent' }];
    const { projectedEnd, perDay } = computeProjection(daily, [], unposted, today, 30);
    expect(perDay(30)).toBe(projectedEnd);
  });

  it('clamps negative variable rate to 0 (matched fixed exceeds actual spend)', () => {
    // E.g. matcher claimed 200 of fixed but actual is 150 (false positive).
    const daily = [0, 50, 100, 150];
    const today = 3;
    const posted = [{ d: 1, a: 200, l: 'mortgage' }];
    const { projectedEnd } = computeProjection(daily, posted, [], today, 30);
    // variableProj clamps to 0; no unposted; projection just stays at 150.
    expect(projectedEnd).toBeCloseTo(150, 6);
  });
});

describe('fixedRemaining', () => {
  it('sums all unposted fixed costs (caller filters)', () => {
    const unposted = [
      { d: 15, a: 50, l: 'gym' },
      { d: 28, a: 100, l: 'subs' },
    ];
    expect(fixedRemaining(unposted)).toBe(150);
  });

  it('returns 0 for empty', () => {
    expect(fixedRemaining([])).toBe(0);
  });
});

describe('spent / dot / projection consistency (regression)', () => {
  // The card's "spent" is dailyActual[today] — the same value the dot is
  // drawn at and the projection extrapolates from. Even when the month's
  // timeline carries expenses dated AFTER today (real future-dated debits),
  // these three must agree and the pace can never come out below spent.
  const daysInMonth = 31;
  const today = 28;

  // €250/day every day of the month, including days 29–31 (future-dated).
  const timeline = Array.from({ length: daysInMonth }, (_, i) => ({
    dateKey: `2026-05-${String(i + 1).padStart(2, '0')}`,
    expenses: 250,
  }));

  it('spent (dailyActual[today]) reflects only through-today, not later-dated rows', () => {
    const daily = buildDailyActual(timeline, today);
    const spent = daily[daily.length - 1] ?? 0;
    expect(daily).toHaveLength(today + 1);
    expect(spent).toBe(250 * today); // days 1..28, excludes 29–31
    expect(spent).toBeLessThan(250 * daysInMonth); // full-month total would be higher
  });

  it('projected month-end is never below spent so far', () => {
    const daily = buildDailyActual(timeline, today);
    const spent = daily[daily.length - 1] ?? 0;
    const { projectedEnd } = computeProjection(daily, [], [], today, daysInMonth);
    expect(projectedEnd).toBeGreaterThanOrEqual(spent);
  });
});
