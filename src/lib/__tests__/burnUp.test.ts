import { describe, it, expect } from 'vitest';
import {
  buildDailyActual,
  computeExpected,
  computeProjection,
  fixedRemaining,
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
});

describe('computeProjection', () => {
  it('projects flat when on-pace with no remaining fixed', () => {
    const daily = [0, 100, 200, 300]; // €100/day
    const today = 3;
    const { projectedEnd } = computeProjection(daily, [], today, 30);
    // Variable proj = 100/day, no fixed. End: 300 + 100 * 27 = 3000.
    expect(projectedEnd).toBeCloseTo(3000, 6);
  });

  it('layers remaining fixed costs on the projection', () => {
    const daily = [0, 100, 200, 300];
    const today = 3;
    const fixed = [
      { d: 2, a: 50, l: 'subs' }, // already in daily
      { d: 20, a: 1200, l: 'rent' }, // upcoming
    ];
    const { projectedEnd } = computeProjection(daily, fixed, today, 30);
    // fixedSoFar = 50, variableProj = (300 - 50) / 3 = 83.333
    // perDay(30) = 300 + 83.333 * 27 + 1200 = 300 + 2250 + 1200 = 3750
    expect(projectedEnd).toBeCloseTo(3750, 4);
  });

  it('returns 0 when today is 0', () => {
    const { projectedEnd, perDay } = computeProjection([0], [], 0, 30);
    expect(projectedEnd).toBe(0);
    expect(perDay(15)).toBe(0);
  });

  it('summary number matches projection endpoint exactly', () => {
    const daily = [0, 80, 160, 240, 320];
    const today = 4;
    const fixed = [{ d: 28, a: 500, l: 'rent' }];
    const { projectedEnd, perDay } = computeProjection(daily, fixed, today, 30);
    expect(perDay(30)).toBe(projectedEnd);
  });
});

describe('fixedRemaining', () => {
  it('sums only fixed costs scheduled after today', () => {
    const fixed = [
      { d: 1, a: 1200, l: 'rent' },
      { d: 15, a: 50, l: 'gym' },
      { d: 28, a: 100, l: 'subs' },
    ];
    expect(fixedRemaining(fixed, 14)).toBe(150); // gym + subs
    expect(fixedRemaining(fixed, 15)).toBe(100); // subs only
    expect(fixedRemaining(fixed, 28)).toBe(0);
  });
});
