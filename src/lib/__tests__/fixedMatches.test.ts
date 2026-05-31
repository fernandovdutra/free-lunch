import { describe, it, expect } from 'vitest';
import {
  monthMarkedKeys,
  markPosted,
  unmarkPosted,
  type FixedMatchesDoc,
} from '../fixedMatches';

describe('monthMarkedKeys', () => {
  it('returns the keys for a month as a Set', () => {
    const doc: FixedMatchesDoc = { months: { '2026-05': ['1|rent|1750', '5|gym|30'] } };
    expect(monthMarkedKeys(doc, '2026-05')).toEqual(new Set(['1|rent|1750', '5|gym|30']));
  });

  it('returns an empty set for an unknown month, missing months, or undefined doc', () => {
    expect(monthMarkedKeys({ months: {} }, '2026-05').size).toBe(0);
    expect(monthMarkedKeys({}, '2026-05').size).toBe(0);
    expect(monthMarkedKeys(undefined, '2026-05').size).toBe(0);
  });
});

describe('markPosted', () => {
  it('adds a key to a month', () => {
    const next = markPosted({ months: {} }, '2026-05', '1|rent|1750');
    expect(next.months?.['2026-05']).toEqual(['1|rent|1750']);
  });

  it('is idempotent — adding the same key twice keeps one entry', () => {
    const once = markPosted({ months: {} }, '2026-05', '1|rent|1750');
    const twice = markPosted(once, '2026-05', '1|rent|1750');
    expect(twice.months?.['2026-05']).toEqual(['1|rent|1750']);
  });

  it('does not touch other months', () => {
    const doc: FixedMatchesDoc = { months: { '2026-04': ['9|net|55'] } };
    const next = markPosted(doc, '2026-05', '1|rent|1750');
    expect(next.months?.['2026-04']).toEqual(['9|net|55']);
    expect(next.months?.['2026-05']).toEqual(['1|rent|1750']);
  });
});

describe('unmarkPosted', () => {
  it('removes a key from a month', () => {
    const doc: FixedMatchesDoc = { months: { '2026-05': ['1|rent|1750', '5|gym|30'] } };
    const next = unmarkPosted(doc, '2026-05', '1|rent|1750');
    expect(next.months?.['2026-05']).toEqual(['5|gym|30']);
  });

  it('drops the month entry entirely once empty', () => {
    const doc: FixedMatchesDoc = { months: { '2026-05': ['1|rent|1750'] } };
    const next = unmarkPosted(doc, '2026-05', '1|rent|1750');
    expect(next.months?.['2026-05']).toBeUndefined();
  });

  it('is a no-op when the key is absent', () => {
    const doc: FixedMatchesDoc = { months: { '2026-05': ['5|gym|30'] } };
    const next = unmarkPosted(doc, '2026-05', '1|rent|1750');
    expect(next.months?.['2026-05']).toEqual(['5|gym|30']);
  });
});
