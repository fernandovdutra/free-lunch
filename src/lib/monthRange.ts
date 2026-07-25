/**
 * Canonical month-range helper: "which month is this transaction in" is an
 * Europe/Amsterdam calendar question everywhere in the app.
 *
 * The bug this exists to fix: month boundaries used to be built with local
 * `startOfMonth`/`endOfMonth` Dates and then serialized with `toISOString()`
 * (UTC) for the backend. A local "May 1 00:00" in CEST serializes to
 * `2026-04-30T22:00Z`, so UTC-side day/month bucketing gained a spurious
 * adjacent-month day (see the burn-up chart's former off-by-one-row
 * workaround) and boundary transactions could land in the wrong month.
 *
 * The fix: month ranges are exact UTC instants of the AMSTERDAM month
 * boundaries, computed DST-aware via Intl (no dependencies). Serializing them
 * with `toISOString()` is then lossless — the backend recovers exactly the
 * same Amsterdam month.
 *
 * Scope (deliberate): the month MARKER (`selectedMonth`, a local
 * start-of-month Date) stays browser-local, matching the persisted `yyyy-MM`
 * key and every `format(selectedMonth, …)` call site. For this single-
 * household app the browser is in the Netherlands, so the marker's local
 * calendar equals the Amsterdam calendar; a user browsing from a far-away
 * zone (e.g. Tokyo) could see the "current month" flip a day early/late.
 * That is accepted and out of scope — what matters is that the RANGES sent
 * to Firestore and the backend are unambiguous Amsterdam instants.
 *
 * (Mirrors `functions/src/shared/amsterdamTime.ts`; the packages don't share
 * code, so the small Intl core is duplicated by design.)
 */

export const AMSTERDAM_TIME_ZONE = 'Europe/Amsterdam';

const wallClockFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: AMSTERDAM_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

function amsterdamWallClock(instant: Date): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
} {
  const fields: Record<string, number> = {};
  for (const { type, value } of wallClockFormatter.formatToParts(instant)) {
    if (type !== 'literal') fields[type] = Number(value);
  }
  // The formatter is configured to emit every one of these parts; the ?? 0
  // fallbacks only satisfy noUncheckedIndexedAccess.
  return {
    year: fields['year'] ?? 0,
    month: fields['month'] ?? 0,
    day: fields['day'] ?? 0,
    hour: fields['hour'] ?? 0,
    minute: fields['minute'] ?? 0,
    second: fields['second'] ?? 0,
  };
}

/** Milliseconds Amsterdam is ahead of UTC at the given instant (CET: 1h, CEST: 2h). */
function amsterdamOffsetMs(instant: Date): number {
  const wc = amsterdamWallClock(instant);
  const reinterpretedAsUtc = Date.UTC(
    wc.year,
    wc.month - 1,
    wc.day,
    wc.hour,
    wc.minute,
    wc.second,
    instant.getUTCMilliseconds()
  );
  return reinterpretedAsUtc - instant.getTime();
}

/**
 * The UTC instant at which an Amsterdam wall-clock time occurs (DST-aware).
 * Two-pass offset probe, so it is correct across the CET/CEST transitions.
 */
export function fromAmsterdamWallClock(
  year: number,
  month: number, // 1-12
  day: number,
  hour = 0,
  minute = 0,
  second = 0,
  millisecond = 0
): Date {
  const wallClockAsUtc = Date.UTC(year, month - 1, day, hour, minute, second, millisecond);
  const guess = wallClockAsUtc - amsterdamOffsetMs(new Date(wallClockAsUtc));
  return new Date(wallClockAsUtc - amsterdamOffsetMs(new Date(guess)));
}

export interface MonthRange {
  /** UTC instant of Amsterdam 00:00:00.000 on the 1st of the month. */
  startDate: Date;
  /** UTC instant of Amsterdam 23:59:59.999 on the last day of the month. */
  endDate: Date;
}

/**
 * Exact UTC instants of an Amsterdam calendar month's boundaries.
 * `[startDate, endDate]` is inclusive; adjacent months tile the timeline with
 * no gap or overlap (endDate + 1ms === next month's startDate).
 */
export function amsterdamMonthRange(year: number, month: number /* 1-12 */): MonthRange {
  const nextMonthStart =
    month === 12
      ? fromAmsterdamWallClock(year + 1, 1, 1)
      : fromAmsterdamWallClock(year, month + 1, 1);
  return {
    startDate: fromAmsterdamWallClock(year, month, 1),
    endDate: new Date(nextMonthStart.getTime() - 1),
  };
}

/**
 * Month range for a month MARKER Date (e.g. `selectedMonth` from
 * `MonthContext`, or any Date inside the month): the marker's browser-local
 * year/month name the Amsterdam calendar month (see the scope note above).
 */
export function monthRangeFor(monthMarker: Date): MonthRange {
  return amsterdamMonthRange(monthMarker.getFullYear(), monthMarker.getMonth() + 1);
}

/**
 * Range spanning several whole months: from the start of the month `monthsBack`
 * months before the marker's month, through the end of the marker's month.
 * (Used by the transactions page's multi-month scroll window.)
 */
export function monthRangeSpanning(monthMarker: Date, monthsBack: number): MonthRange {
  const year = monthMarker.getFullYear();
  const month = monthMarker.getMonth() + 1;
  const total = year * 12 + (month - 1) - monthsBack;
  const startYear = Math.floor(total / 12);
  const startMonth = (((total % 12) + 12) % 12) + 1;
  return {
    startDate: amsterdamMonthRange(startYear, startMonth).startDate,
    endDate: amsterdamMonthRange(year, month).endDate,
  };
}
