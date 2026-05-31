import { describe, it, expect } from 'vitest';
import { mergeTimeSeries, BENCHMARK_INDICES } from '../benchmarks';

describe('mergeTimeSeries', () => {
  it('appends new dates and keeps the series ascending', () => {
    const existing = [
      { date: '2026-05-28', value: 570 },
      { date: '2026-05-29', value: 572 },
    ];
    const incoming = [{ date: '2026-05-30', value: 575 }];
    expect(mergeTimeSeries(existing, incoming)).toEqual([
      { date: '2026-05-28', value: 570 },
      { date: '2026-05-29', value: 572 },
      { date: '2026-05-30', value: 575 },
    ]);
  });

  it('upserts: incoming overwrites an existing same-date point', () => {
    const existing = [{ date: '2026-05-29', value: 572 }];
    const incoming = [{ date: '2026-05-29', value: 999 }];
    expect(mergeTimeSeries(existing, incoming)).toEqual([{ date: '2026-05-29', value: 999 }]);
  });

  it('deduplicates within a backfill and sorts out-of-order input', () => {
    const merged = mergeTimeSeries([], [
      { date: '2026-05-30', value: 3 },
      { date: '2026-05-28', value: 1 },
      { date: '2026-05-29', value: 2 },
    ]);
    expect(merged.map((p) => p.value)).toEqual([1, 2, 3]);
  });
});

describe('BENCHMARK_INDICES', () => {
  it('covers the equity benchmark keys with a sourcing symbol', () => {
    const keys = BENCHMARK_INDICES.map((i) => i.key);
    expect(keys).toContain('SP500');
    expect(keys).toContain('MSCI_WORLD');
    for (const idx of BENCHMARK_INDICES) {
      expect(idx.symbol.length).toBeGreaterThan(0);
    }
  });
});
