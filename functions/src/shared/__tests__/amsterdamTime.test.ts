/**
 * DST-boundary tests for the Europe/Amsterdam calendar helpers.
 *
 * 2026 reference points (EU rule: last Sunday of March / October, at 01:00 UTC):
 *  - spring forward: Sun 2026-03-29, 02:00 CET → 03:00 CEST
 *  - fall back:      Sun 2026-10-25, 03:00 CEST → 02:00 CET
 *
 * Every assertion is against exact UTC instants, and a TZ-variation block
 * re-runs the core conversions under several process timezones — a helper
 * that only works when the server happens to run in UTC is not a fix.
 */
import { describe, it, expect } from 'vitest';
import {
  amsterdamDayKey,
  amsterdamMonthKey,
  amsterdamMonthRangeUtc,
  amsterdamNoon,
  amsterdamStartOfDay,
  amsterdamToday,
  amsterdamWallClock,
  fromAmsterdamWallClock,
  shiftDayKey,
  shiftMonthKey,
} from '../amsterdamTime';

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
  it('converts a CET (winter) wall-clock time to the exact UTC instant', () => {
    // The remittance fixture from the bug report: "31.01.26/15:33".
    expect(fromAmsterdamWallClock(2026, 1, 31, 15, 33).toISOString()).toBe(
      '2026-01-31T14:33:00.000Z'
    );
  });

  it('converts a CEST (summer) wall-clock time to the exact UTC instant', () => {
    expect(fromAmsterdamWallClock(2026, 7, 15, 15, 33).toISOString()).toBe(
      '2026-07-15T13:33:00.000Z'
    );
  });

  it('handles the spring-forward day (2026-03-29) on both sides of the jump', () => {
    // 01:59 is still CET (UTC+1)…
    expect(fromAmsterdamWallClock(2026, 3, 29, 1, 59).toISOString()).toBe(
      '2026-03-29T00:59:00.000Z'
    );
    // …and 03:00 is the first CEST minute (UTC+2), one wall-clock hour but
    // zero elapsed time later.
    expect(fromAmsterdamWallClock(2026, 3, 29, 3, 0).toISOString()).toBe(
      '2026-03-29T01:00:00.000Z'
    );
    // A late-afternoon POS time on the transition day is already CEST.
    expect(fromAmsterdamWallClock(2026, 3, 29, 15, 33).toISOString()).toBe(
      '2026-03-29T13:33:00.000Z'
    );
  });

  it('maps nonexistent spring-gap times deterministically (documented edge)', () => {
    // 02:30 never happens on 2026-03-29; the helper lands one hour later
    // (03:30 CEST), i.e. 01:30 UTC.
    expect(fromAmsterdamWallClock(2026, 3, 29, 2, 30).toISOString()).toBe(
      '2026-03-29T01:30:00.000Z'
    );
  });

  it('handles the fall-back day (2026-10-25) on both sides of the repeat', () => {
    // 01:30 occurs once, in CEST (UTC+2).
    expect(fromAmsterdamWallClock(2026, 10, 25, 1, 30).toISOString()).toBe(
      '2026-10-24T23:30:00.000Z'
    );
    // 03:30 occurs once, in CET (UTC+1).
    expect(fromAmsterdamWallClock(2026, 10, 25, 3, 30).toISOString()).toBe(
      '2026-10-25T02:30:00.000Z'
    );
  });

  it('resolves ambiguous fall-back times to the second (CET) occurrence', () => {
    // 02:30 happens twice (00:30Z as CEST, 01:30Z as CET); documented pick: CET.
    expect(fromAmsterdamWallClock(2026, 10, 25, 2, 30).toISOString()).toBe(
      '2026-10-25T01:30:00.000Z'
    );
  });

  it('round-trips with amsterdamWallClock', () => {
    const instant = fromAmsterdamWallClock(2026, 7, 15, 23, 45, 12);
    expect(amsterdamWallClock(instant)).toEqual({
      year: 2026,
      month: 7,
      day: 15,
      hour: 23,
      minute: 45,
      second: 12,
    });
  });
});

describe('amsterdamDayKey / amsterdamMonthKey', () => {
  it('rolls to the next Amsterdam day before UTC midnight (CEST evening)', () => {
    // 22:30 UTC on July 15 is already 00:30 on July 16 in Amsterdam.
    expect(amsterdamDayKey(new Date('2026-07-15T22:30:00Z'))).toBe('2026-07-16');
    expect(amsterdamDayKey(new Date('2026-07-15T21:59:00Z'))).toBe('2026-07-15');
  });

  it('rolls to the next Amsterdam day at 23:00 UTC in winter (CET)', () => {
    expect(amsterdamDayKey(new Date('2026-01-15T23:30:00Z'))).toBe('2026-01-16');
    expect(amsterdamDayKey(new Date('2026-01-15T22:59:00Z'))).toBe('2026-01-15');
  });

  it('rolls month and year boundaries on the Amsterdam calendar', () => {
    // New Year's Eve 23:30Z = 00:30 CET on Jan 1.
    expect(amsterdamDayKey(new Date('2025-12-31T23:30:00Z'))).toBe('2026-01-01');
    expect(amsterdamMonthKey(new Date('2025-12-31T23:30:00Z'))).toBe('2026-01');
    // Late CEST evening on May 31 stays in May.
    expect(amsterdamMonthKey(new Date('2026-05-31T21:30:00Z'))).toBe('2026-05');
    // …but 22:30Z is already June 1 in Amsterdam.
    expect(amsterdamMonthKey(new Date('2026-05-31T22:30:00Z'))).toBe('2026-06');
  });

  it('amsterdamToday(now) matches amsterdamDayKey(now)', () => {
    const now = new Date('2026-03-29T01:30:00Z'); // mid spring-forward
    expect(amsterdamToday(now)).toBe(amsterdamDayKey(now));
    expect(amsterdamToday(now)).toBe('2026-03-29');
  });
});

describe('shiftDayKey / shiftMonthKey', () => {
  it('shifts across month, year and leap boundaries', () => {
    expect(shiftDayKey('2026-03-01', -1)).toBe('2026-02-28'); // 2026 is not a leap year
    expect(shiftDayKey('2028-03-01', -1)).toBe('2028-02-29'); // 2028 is
    expect(shiftDayKey('2026-01-01', -1)).toBe('2025-12-31');
    expect(shiftDayKey('2026-07-13', -365)).toBe('2025-07-13');
    expect(shiftDayKey('2026-07-13', 0)).toBe('2026-07-13');
  });

  it('is pure calendar arithmetic — unaffected by DST transitions', () => {
    // 2026-03-30 minus 2 days crosses the spring-forward Sunday; a naive
    // ms-based "2 × 24 h" subtraction would land on 03-28 23:00 wall time.
    expect(shiftDayKey('2026-03-30', -2)).toBe('2026-03-28');
    expect(shiftDayKey('2026-10-26', -2)).toBe('2026-10-24');
  });

  it('shifts month keys across year boundaries in both directions', () => {
    expect(shiftMonthKey('2026-01', -5)).toBe('2025-08');
    expect(shiftMonthKey('2026-12', 1)).toBe('2027-01');
    expect(shiftMonthKey('2026-01', -1)).toBe('2025-12');
    expect(shiftMonthKey('2026-06', 0)).toBe('2026-06');
  });
});

describe('amsterdamStartOfDay / amsterdamNoon', () => {
  it('produces the exact Amsterdam midnight instant in both offsets', () => {
    expect(amsterdamStartOfDay('2026-01-15').toISOString()).toBe('2026-01-14T23:00:00.000Z');
    expect(amsterdamStartOfDay('2026-07-15').toISOString()).toBe('2026-07-14T22:00:00.000Z');
  });

  it('produces the exact Amsterdam noon instant in both offsets', () => {
    expect(amsterdamNoon('2026-01-31').toISOString()).toBe('2026-01-31T11:00:00.000Z');
    expect(amsterdamNoon('2026-07-15').toISOString()).toBe('2026-07-15T10:00:00.000Z');
    // Noon on the transition days themselves is already in the new offset.
    expect(amsterdamNoon('2026-03-29').toISOString()).toBe('2026-03-29T10:00:00.000Z');
    expect(amsterdamNoon('2026-10-25').toISOString()).toBe('2026-10-25T11:00:00.000Z');
  });
});

describe('amsterdamMonthRangeUtc', () => {
  it('January (CET on both edges)', () => {
    const { start, end } = amsterdamMonthRangeUtc('2026-01');
    expect(start.toISOString()).toBe('2025-12-31T23:00:00.000Z');
    expect(end.toISOString()).toBe('2026-01-31T22:59:59.999Z');
  });

  it('July (CEST on both edges)', () => {
    const { start, end } = amsterdamMonthRangeUtc('2026-07');
    expect(start.toISOString()).toBe('2026-06-30T22:00:00.000Z');
    expect(end.toISOString()).toBe('2026-07-31T21:59:59.999Z');
  });

  it('March: starts in CET, ends in CEST (spring transition inside the month)', () => {
    const { start, end } = amsterdamMonthRangeUtc('2026-03');
    expect(start.toISOString()).toBe('2026-02-28T23:00:00.000Z');
    expect(end.toISOString()).toBe('2026-03-31T21:59:59.999Z');
  });

  it('October: starts in CEST, ends in CET (fall transition inside the month)', () => {
    const { start, end } = amsterdamMonthRangeUtc('2026-10');
    expect(start.toISOString()).toBe('2026-09-30T22:00:00.000Z');
    expect(end.toISOString()).toBe('2026-10-31T22:59:59.999Z');
  });

  it('adjacent months tile the timeline with no gap or overlap', () => {
    for (const [a, b] of [
      ['2026-02', '2026-03'], // into the spring transition month
      ['2026-03', '2026-04'], // out of it
      ['2026-09', '2026-10'], // into the fall transition month
      ['2026-10', '2026-11'], // out of it
      ['2026-12', '2027-01'], // year boundary
    ] as const) {
      expect(amsterdamMonthRangeUtc(a).end.getTime() + 1).toBe(
        amsterdamMonthRangeUtc(b).start.getTime()
      );
    }
  });
});

describe('timezone independence (a helper that only works in UTC is not a fix)', () => {
  const zones = ['UTC', 'America/New_York', 'Asia/Tokyo', 'Europe/Amsterdam'];

  it('fromAmsterdamWallClock returns identical instants under any process TZ', () => {
    const reference = fromAmsterdamWallClock(2026, 3, 29, 15, 33).getTime();
    for (const tz of zones) {
      expect(withTz(tz, () => fromAmsterdamWallClock(2026, 3, 29, 15, 33).getTime())).toBe(
        reference
      );
    }
  });

  it('amsterdamDayKey and month ranges are identical under any process TZ', () => {
    const instant = new Date('2026-05-31T22:30:00Z');
    for (const tz of zones) {
      expect(withTz(tz, () => amsterdamDayKey(instant))).toBe('2026-06-01');
      expect(withTz(tz, () => amsterdamMonthRangeUtc('2026-05').start.toISOString())).toBe(
        '2026-04-30T22:00:00.000Z'
      );
    }
  });
});
