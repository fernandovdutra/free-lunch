/**
 * Tests for the canonical Amsterdam month-range helper.
 *
 * 2026 DST reference points (EU rule): spring forward Sun 2026-03-29,
 * fall back Sun 2026-10-25. Assertions are exact UTC instants, so a range
 * that is only right when the browser happens to sit in UTC (or Amsterdam)
 * fails here.
 */
import { describe, it, expect } from 'vitest';
import {
  amsterdamMonthRange,
  fromAmsterdamWallClock,
  monthRangeFor,
  monthRangeSpanning,
} from '../monthRange';

/** Run `fn` with process.env.TZ temporarily set (Node picks TZ changes up on Linux). */
function withTz<T>(tz: string, fn: () => T): T {
  const previous = process.env.TZ;
  process.env.TZ = tz;
  try {
    return fn();
  } finally {
    if (previous === undefined) delete process.env.TZ;
    else process.env.TZ = previous;
  }
}

describe('fromAmsterdamWallClock', () => {
  it('is DST-aware (CET vs CEST)', () => {
    expect(fromAmsterdamWallClock(2026, 1, 31, 15, 33).toISOString()).toBe(
      '2026-01-31T14:33:00.000Z'
    );
    expect(fromAmsterdamWallClock(2026, 7, 15, 15, 33).toISOString()).toBe(
      '2026-07-15T13:33:00.000Z'
    );
  });

  it('handles both sides of the 2026 transitions', () => {
    expect(fromAmsterdamWallClock(2026, 3, 29, 1, 59).toISOString()).toBe(
      '2026-03-29T00:59:00.000Z' // still CET
    );
    expect(fromAmsterdamWallClock(2026, 3, 29, 3, 0).toISOString()).toBe(
      '2026-03-29T01:00:00.000Z' // first CEST minute
    );
    expect(fromAmsterdamWallClock(2026, 10, 25, 3, 30).toISOString()).toBe(
      '2026-10-25T02:30:00.000Z' // back to CET
    );
  });
});

describe('amsterdamMonthRange', () => {
  it('January: CET boundaries', () => {
    const { startDate, endDate } = amsterdamMonthRange(2026, 1);
    expect(startDate.toISOString()).toBe('2025-12-31T23:00:00.000Z');
    expect(endDate.toISOString()).toBe('2026-01-31T22:59:59.999Z');
  });

  it('July: CEST boundaries', () => {
    const { startDate, endDate } = amsterdamMonthRange(2026, 7);
    expect(startDate.toISOString()).toBe('2026-06-30T22:00:00.000Z');
    expect(endDate.toISOString()).toBe('2026-07-31T21:59:59.999Z');
  });

  it('March: starts CET, ends CEST (spring transition inside the month)', () => {
    const { startDate, endDate } = amsterdamMonthRange(2026, 3);
    expect(startDate.toISOString()).toBe('2026-02-28T23:00:00.000Z');
    expect(endDate.toISOString()).toBe('2026-03-31T21:59:59.999Z');
  });

  it('October: starts CEST, ends CET (fall transition inside the month)', () => {
    const { startDate, endDate } = amsterdamMonthRange(2026, 10);
    expect(startDate.toISOString()).toBe('2026-09-30T22:00:00.000Z');
    expect(endDate.toISOString()).toBe('2026-10-31T22:59:59.999Z');
  });

  it('adjacent months tile with no gap or overlap (incl. DST and year edges)', () => {
    const pairs: Array<[[number, number], [number, number]]> = [
      [
        [2026, 2],
        [2026, 3],
      ],
      [
        [2026, 3],
        [2026, 4],
      ],
      [
        [2026, 9],
        [2026, 10],
      ],
      [
        [2026, 10],
        [2026, 11],
      ],
      [
        [2026, 12],
        [2027, 1],
      ],
    ];
    for (const [[y1, m1], [y2, m2]] of pairs) {
      expect(amsterdamMonthRange(y1, m1).endDate.getTime() + 1).toBe(
        amsterdamMonthRange(y2, m2).startDate.getTime()
      );
    }
  });

  it('no off-by-one row for a 31-day month: the range spans exactly 31 Amsterdam days', () => {
    // This is the burn-up chart's former workaround scenario: the May range
    // used to start at local-midnight-as-UTC (2026-04-30T22:00Z read as an
    // extra April 30 day). The canonical range must contain exactly the 31
    // May days — no leading or trailing adjacent-month day.
    const { startDate, endDate } = amsterdamMonthRange(2026, 5);
    const dayKeys = new Set<string>();
    for (let t = startDate.getTime(); t <= endDate.getTime(); t += 60 * 60 * 1000) {
      dayKeys.add(
        new Intl.DateTimeFormat('en-CA', {
          timeZone: 'Europe/Amsterdam',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        }).format(new Date(t))
      );
    }
    expect(dayKeys.size).toBe(31);
    expect([...dayKeys].sort()[0]).toBe('2026-05-01');
    expect([...dayKeys].sort()[30]).toBe('2026-05-31');
  });
});

describe('monthRangeFor / monthRangeSpanning', () => {
  it('uses the marker Date’s local year/month (MonthContext contract)', () => {
    const marker = new Date(2026, 4, 1); // local May 1 — selectedMonth shape
    expect(monthRangeFor(marker)).toEqual(amsterdamMonthRange(2026, 5));
  });

  it('spans whole months back from the marker month (transactions window)', () => {
    const { startDate, endDate } = monthRangeSpanning(new Date(2026, 4, 1), 5);
    expect(startDate).toEqual(amsterdamMonthRange(2025, 12).startDate);
    expect(endDate).toEqual(amsterdamMonthRange(2026, 5).endDate);
  });

  it('spanning 0 months equals the single-month range', () => {
    expect(monthRangeSpanning(new Date(2026, 0, 15), 0)).toEqual(amsterdamMonthRange(2026, 1));
  });
});

describe('timezone robustness', () => {
  it('produces identical instants regardless of the process timezone', () => {
    const reference = amsterdamMonthRange(2026, 5);
    for (const tz of ['UTC', 'America/New_York', 'Asia/Tokyo', 'Europe/Amsterdam']) {
      const range = withTz(tz, () => amsterdamMonthRange(2026, 5));
      expect(range.startDate.getTime()).toBe(reference.startDate.getTime());
      expect(range.endDate.getTime()).toBe(reference.endDate.getTime());
    }
  });

  it('toISOString() serialization (used in query keys and backend calls) is lossless', () => {
    const { startDate, endDate } = amsterdamMonthRange(2026, 5);
    expect(new Date(startDate.toISOString()).getTime()).toBe(startDate.getTime());
    expect(new Date(endDate.toISOString()).getTime()).toBe(endDate.getTime());
  });
});
