/**
 * Pure helpers for the per-month "manually marked as posted" overrides.
 *
 * Kept Firebase-free (like `fixedSchedule.ts`) so unit tests can exercise the
 * array/map transformations without booting `@/lib/firebase`. The hook layer in
 * `src/hooks/useFixedMatches.ts` composes these against the Firestore doc
 * `users/{uid}/settings/fixedMatches`, shape:
 *
 *   { months: { [monthKey: "YYYY-MM"]: string[] } }   // arrays of fixedCostKey()
 *
 * Each string is a `fixedCostKey(f)` (see `src/lib/burnUp.ts`). Marking a
 * schedule item posted for a month adds its key to that month's array; the
 * burn-up matcher then treats it as posted.
 */

export interface FixedMatchesDoc {
  months?: Record<string, string[]>;
}

/** Keys the user marked posted for `monthKey`, as a Set (empty when none). */
export function monthMarkedKeys(
  doc: FixedMatchesDoc | undefined,
  monthKey: string
): Set<string> {
  const arr = doc?.months?.[monthKey];
  return new Set(Array.isArray(arr) ? arr : []);
}

/** Pure: add a key to a month (idempotent). Returns the next doc. */
export function markPosted(
  doc: FixedMatchesDoc,
  monthKey: string,
  key: string
): FixedMatchesDoc {
  const months = { ...(doc.months ?? {}) };
  const set = new Set(months[monthKey] ?? []);
  set.add(key);
  months[monthKey] = [...set];
  return { months };
}

/**
 * Pure: remove a key from a month (no-op if absent). Drops the month entry
 * entirely once empty so the doc doesn't accumulate empty arrays. Returns the
 * next doc.
 */
export function unmarkPosted(
  doc: FixedMatchesDoc,
  monthKey: string,
  key: string
): FixedMatchesDoc {
  const months: Record<string, string[]> = {};
  for (const [m, keys] of Object.entries(doc.months ?? {})) {
    if (m === monthKey) {
      const filtered = keys.filter((k) => k !== key);
      if (filtered.length > 0) months[m] = filtered;
    } else {
      months[m] = keys;
    }
  }
  return { months };
}
