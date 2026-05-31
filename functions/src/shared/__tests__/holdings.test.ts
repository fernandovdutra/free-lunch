import { describe, it, expect } from 'vitest';
import {
  balanceToCashHolding,
  quoteToHoldingUpdate,
  todayIso,
  upsertHistoryPoint,
} from '../holdings';

// These mirror the client tests in src/lib/__tests__/holdingsMapping.test.ts so
// the duplicated Functions-side mappers stay behaviourally identical.

describe('todayIso', () => {
  it('formats YYYY-MM-DD', () => {
    expect(todayIso(new Date('2026-05-31T14:00:00Z'))).toBe('2026-05-31');
  });
});

describe('quoteToHoldingUpdate', () => {
  it('computes value = price × units and carries prevPrice', () => {
    expect(quoteToHoldingUpdate(10, 98.8, 97.2)).toEqual({
      value: 988,
      livePrice: 98.8,
      prevPrice: 97.2,
    });
  });

  it('rounds value to cents', () => {
    expect(quoteToHoldingUpdate(0.42, 66667, 63900).value).toBe(28000.14);
  });

  it('treats null units as 0 and missing prev price as null', () => {
    expect(quoteToHoldingUpdate(null, 100, undefined)).toEqual({
      value: 0,
      livePrice: 100,
      prevPrice: null,
    });
  });
});

describe('balanceToCashHolding', () => {
  it('builds a liquid bank cash holding with a single dated point', () => {
    const h = balanceToCashHolding(18_500, {
      name: 'ABN AMRO ••5787',
      platform: 'ABN AMRO',
      date: '2026-05-31',
    });
    expect(h).toMatchObject({
      type: 'Cash',
      kind: 'asset',
      updateSource: 'bank',
      liquidity: 'liquid',
      units: null,
      value: 18_500,
    });
    expect(h.history).toEqual([{ date: '2026-05-31', value: 18_500 }]);
  });
});

describe('upsertHistoryPoint', () => {
  it('appends a new dated point and keeps the series ascending', () => {
    const out = upsertHistoryPoint(
      [
        { date: '2026-05-28', value: 100 },
        { date: '2026-05-29', value: 110 },
      ],
      { date: '2026-05-30', value: 120 }
    );
    expect(out.map((p) => p.date)).toEqual(['2026-05-28', '2026-05-29', '2026-05-30']);
  });

  it('replaces an existing same-date point rather than duplicating', () => {
    const out = upsertHistoryPoint(
      [{ date: '2026-05-29', value: 110 }],
      { date: '2026-05-29', value: 999 }
    );
    expect(out).toEqual([{ date: '2026-05-29', value: 999 }]);
  });

  it('does not mutate the input array', () => {
    const input = [{ date: '2026-05-29', value: 110 }];
    upsertHistoryPoint(input, { date: '2026-05-30', value: 120 });
    expect(input).toEqual([{ date: '2026-05-29', value: 110 }]);
  });
});
