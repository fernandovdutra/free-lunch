/**
 * Europe/Amsterdam calendar helpers for the Functions runtime.
 *
 * Cloud Functions servers run in UTC, but every date this app cares about —
 * bank booking dates, remittance timestamps like `31.01.26/15:33`, the sync
 * fetch window, "which day/month does this transaction belong to" — is an
 * Amsterdam wall-clock concept (CET in winter, CEST in summer). Constructing
 * these with `new Date(y, m, d, …)` silently uses the SERVER's zone, which
 * shifts stored instants by 1–2 hours and can push late-evening transactions
 * onto the wrong calendar day.
 *
 * Dependency-free: `Intl.DateTimeFormat` with `timeZone: 'Europe/Amsterdam'`
 * is the timezone database (ICU ships with Node), so DST transitions are
 * handled correctly for any year without hardcoded offsets.
 *
 * Conventions used throughout:
 *  - a "day key" is an ISO `yyyy-MM-dd` string naming an Amsterdam calendar day
 *  - a "month key" is an ISO `yyyy-MM` string naming an Amsterdam calendar month
 *  - both sort chronologically as plain strings, so `<`/`>` comparisons and
 *    lexicographic sorts are safe.
 */

export const AMSTERDAM_TIME_ZONE = 'Europe/Amsterdam';

// en-CA is the locale whose date pattern is already ISO-like (yyyy-MM-dd),
// but we read formatToParts, so any stable locale works; en-US is universal.
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

export interface AmsterdamWallClock {
  year: number;
  month: number; // 1-12
  day: number; // 1-31
  hour: number; // 0-23
  minute: number;
  second: number;
}

/** Amsterdam wall-clock reading of a UTC instant. */
export function amsterdamWallClock(instant: Date): AmsterdamWallClock {
  const fields: Record<string, number> = {};
  for (const { type, value } of wallClockFormatter.formatToParts(instant)) {
    if (type !== 'literal') fields[type] = Number(value);
  }
  return {
    year: fields.year,
    month: fields.month,
    day: fields.day,
    hour: fields.hour,
    minute: fields.minute,
    second: fields.second,
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
 *
 * `fromAmsterdamWallClock(2026, 1, 31, 15, 33)` → `2026-01-31T14:33:00Z` (CET),
 * `fromAmsterdamWallClock(2026, 7, 15, 15, 33)` → `2026-07-15T13:33:00Z` (CEST).
 *
 * Uses the standard two-pass offset probe, so it converges on the correct
 * offset across DST transitions. Edge semantics (documented, deterministic):
 *  - times inside the spring-forward gap (02:00–03:00 on the last Sunday of
 *    March, which don't exist on an Amsterdam clock) map to the equivalent
 *    instant one hour later;
 *  - ambiguous fall-back times (02:00–03:00 on the last Sunday of October,
 *    which occur twice) resolve to the second (CET) occurrence.
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
  // First guess: assume the Amsterdam offset at the wall-clock-read-as-UTC
  // instant; second pass re-probes at the corrected instant so a guess that
  // straddled a DST transition settles on the right offset.
  const guess = wallClockAsUtc - amsterdamOffsetMs(new Date(wallClockAsUtc));
  return new Date(wallClockAsUtc - amsterdamOffsetMs(new Date(guess)));
}

const pad = (n: number, width: number): string => String(n).padStart(width, '0');

/** Amsterdam calendar day (`yyyy-MM-dd`) an instant falls on. Defaults to now. */
export function amsterdamDayKey(instant: Date = new Date()): string {
  const wc = amsterdamWallClock(instant);
  return `${pad(wc.year, 4)}-${pad(wc.month, 2)}-${pad(wc.day, 2)}`;
}

/** Amsterdam calendar month (`yyyy-MM`) an instant falls in. Defaults to now. */
export function amsterdamMonthKey(instant: Date = new Date()): string {
  return amsterdamDayKey(instant).slice(0, 7);
}

/** Today's date on the Amsterdam calendar, as `yyyy-MM-dd`. */
export function amsterdamToday(now: Date = new Date()): string {
  return amsterdamDayKey(now);
}

/**
 * Pure calendar arithmetic on a day key: `shiftDayKey('2026-03-01', -1)` →
 * `'2026-02-28'`. Timezone-free by construction (computed on the proleptic
 * Gregorian calendar via Date.UTC), so it never drifts across DST.
 */
export function shiftDayKey(dayKey: string, days: number): string {
  const [year, month, day] = dayKey.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

/** Pure calendar arithmetic on a month key: `shiftMonthKey('2026-01', -5)` → `'2025-08'`. */
export function shiftMonthKey(monthKey: string, months: number): string {
  const [year, month] = monthKey.split('-').map(Number);
  const total = year * 12 + (month - 1) + months;
  const shiftedYear = Math.floor(total / 12);
  const shiftedMonth = (((total % 12) + 12) % 12) + 1;
  return `${pad(shiftedYear, 4)}-${pad(shiftedMonth, 2)}`;
}

/** UTC instant of Amsterdam midnight (00:00:00.000) on the given day. */
export function amsterdamStartOfDay(dayKey: string): Date {
  const [year, month, day] = dayKey.split('-').map(Number);
  return fromAmsterdamWallClock(year, month, day);
}

/**
 * UTC instant of Amsterdam noon on the given day. Noon is the storage
 * convention for date-only bank fields (`bookingDate`): it stays on the same
 * calendar day when rendered in any zone within UTC±10, and it is hours away
 * from both midnights, so day-bucketing can never flip it.
 */
export function amsterdamNoon(dayKey: string): Date {
  const [year, month, day] = dayKey.split('-').map(Number);
  return fromAmsterdamWallClock(year, month, day, 12);
}

/**
 * Exact UTC instants of an Amsterdam calendar month's boundaries:
 * `start` = 00:00:00.000 on the 1st, `end` = 23:59:59.999 on the last day
 * (both read on an Amsterdam clock). `[start, end]` is inclusive and tiles
 * the timeline with no gap or overlap between adjacent months.
 */
export function amsterdamMonthRangeUtc(monthKey: string): { start: Date; end: Date } {
  const [year, month] = monthKey.split('-').map(Number);
  const nextKey = shiftMonthKey(monthKey, 1);
  const [nextYear, nextMonth] = nextKey.split('-').map(Number);
  const start = fromAmsterdamWallClock(year, month, 1);
  const end = new Date(fromAmsterdamWallClock(nextYear, nextMonth, 1).getTime() - 1);
  return { start, end };
}
