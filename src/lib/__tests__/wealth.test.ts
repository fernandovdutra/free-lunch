import { describe, it, expect } from 'vitest';
import {
  netWorth,
  liquidTotal,
  equitiesTotal,
  buildSeries,
  clipToRange,
  rangeDelta,
  normalizeBenchmark,
  composition,
  groupHoldings,
  benchmarkOptions,
  formatUnits,
  buildCashBenchmark,
} from '@/lib/wealth';
import type { Holding } from '@/types/wealth';

function h(partial: Partial<Holding> & Pick<Holding, 'id' | 'type' | 'kind' | 'value'>): Holding {
  return {
    name: partial.id,
    platform: 'Test',
    cost: 0,
    units: null,
    liquidity: 'liquid',
    updateSource: 'manual',
    updatedDaysAgo: 0,
    history: [],
    ...partial,
  } as Holding;
}

const holdings: Holding[] = [
  h({ id: 'house', type: 'Real Estate', kind: 'asset', value: 500_000, liquidity: 'illiquid' }),
  h({ id: 'etf', type: 'Equities', kind: 'asset', value: 80_000, liquidity: 'liquid' }),
  h({ id: 'btc', type: 'Crypto', kind: 'asset', value: 20_000, liquidity: 'liquid' }),
  h({ id: 'cash', type: 'Cash', kind: 'asset', value: 10_000, liquidity: 'liquid' }),
  h({ id: 'mortgage', type: 'Mortgage', kind: 'liability', value: 300_000 }),
];

describe('derived totals', () => {
  it('netWorth subtracts liabilities', () => {
    expect(netWorth(holdings)).toBe(500_000 + 80_000 + 20_000 + 10_000 - 300_000);
  });

  it('liquidTotal sums only liquid assets, no liability subtraction', () => {
    expect(liquidTotal(holdings)).toBe(80_000 + 20_000 + 10_000);
  });

  it('equitiesTotal sums only equities assets', () => {
    expect(equitiesTotal(holdings)).toBe(80_000);
  });
});

describe('buildSeries', () => {
  const a = h({
    id: 'a',
    type: 'Cash',
    kind: 'asset',
    value: 0,
    history: [
      { date: '2024-01-01', value: 100 },
      { date: '2024-03-01', value: 150 },
    ],
  });
  const b = h({
    id: 'b',
    type: 'Mortgage',
    kind: 'liability',
    value: 0,
    history: [{ date: '2024-02-01', value: 40 }],
  });

  it('forward-fills and subtracts liabilities for NET_WORTH', () => {
    const s = buildSeries([a, b], 'NET_WORTH');
    expect(s.map((p) => p.date)).toEqual(['2024-01-01', '2024-02-01', '2024-03-01']);
    // Jan: 100 (b not yet present). Feb: 100 - 40 = 60. Mar: 150 - 40 = 110.
    expect(s.map((p) => p.value)).toEqual([100, 60, 110]);
  });

  it('LIQUID series ignores liabilities entirely', () => {
    const s = buildSeries([a, b], 'LIQUID');
    expect(s.map((p) => p.value)).toEqual([100, 150]);
  });
});

describe('clipToRange + rangeDelta', () => {
  const series = [
    { date: '2023-01-01', value: 100 },
    { date: '2023-12-01', value: 120 },
    { date: '2024-06-01', value: 150 },
    { date: '2024-11-01', value: 200 },
  ];

  it('1Y keeps roughly the last 12 months relative to last point', () => {
    const clipped = clipToRange(series, '1Y');
    expect(clipped[0]!.date).toBe('2023-12-01');
    expect(clipped.at(-1)!.date).toBe('2024-11-01');
  });

  it('MAX keeps everything', () => {
    expect(clipToRange(series, 'MAX')).toHaveLength(4);
  });

  it('YTD starts at Jan 1 of the last point year', () => {
    const clipped = clipToRange(series, 'YTD');
    expect(clipped[0]!.date).toBe('2024-06-01');
  });

  it('rangeDelta is first vs last', () => {
    const d = rangeDelta([
      { date: '2024-01-01', value: 200 },
      { date: '2024-06-01', value: 250 },
    ]);
    expect(d.abs).toBe(50);
    expect(d.pct).toBeCloseTo(25);
  });
});

describe('normalizeBenchmark', () => {
  it('re-bases the benchmark to the subject start value', () => {
    const subject = [
      { date: '2024-01-01', value: 1000 },
      { date: '2024-02-01', value: 1100 },
    ];
    const bench = [
      { date: '2024-01-01', value: 50 },
      { date: '2024-02-01', value: 55 }, // +10%
    ];
    const norm = normalizeBenchmark(subject, bench);
    expect(norm[0]!.value).toBe(1000); // starts at subject base
    expect(norm[1]!.value).toBeCloseTo(1100); // +10% → 1100
  });
});

describe('composition', () => {
  it('groups by type with percentages of the kind total', () => {
    const slices = composition(holdings, 'asset');
    const total = 500_000 + 80_000 + 20_000 + 10_000;
    const re = slices.find((s) => s.type === 'Real Estate')!;
    expect(re.amount).toBe(500_000);
    expect(re.pct).toBeCloseTo((500_000 / total) * 100);
    // sorted descending by amount
    expect(slices[0]!.type).toBe('Real Estate');
  });
});

describe('groupHoldings', () => {
  it('orders assets then liabilities and computes subtotals, skipping empties', () => {
    const groups = groupHoldings(holdings);
    expect(groups.map((g) => g.type)).toEqual([
      'Real Estate',
      'Equities',
      'Crypto',
      'Cash',
      'Mortgage',
    ]);
    expect(groups.at(-1)!.kind).toBe('liability');
    expect(groups.find((g) => g.type === 'Equities')!.subtotal).toBe(80_000);
  });
});

describe('benchmarkOptions', () => {
  it('offers only NONE/CASH for net worth', () => {
    expect(benchmarkOptions('NET_WORTH')).toEqual(['NONE', 'CASH']);
  });
  it('offers equity benchmarks for liquid/equities', () => {
    expect(benchmarkOptions('EQUITIES')).toEqual(['NONE', 'SP500', 'MSCI_WORLD', 'CASH']);
  });
});

describe('formatUnits', () => {
  it('shows up to 8 decimals for crypto and strips trailing zeros', () => {
    expect(formatUnits(0.42, 'Crypto')).toBe('0.42');
    expect(formatUnits(0.123456789, 'Crypto')).toBe('0.12345679');
  });
  it('shows up to 4 decimals for equities', () => {
    expect(formatUnits(12.5, 'Equities')).toBe('12.5');
    expect(formatUnits(100, 'Equities')).toBe('100');
  });
  it('keeps whole numbers intact for other types', () => {
    expect(formatUnits(1500, 'Cash')).toBe('1500');
  });
});

describe('buildCashBenchmark', () => {
  const now = new Date('2026-05-31T12:00:00Z');

  it('produces ascending first-of-month points spanning the window', () => {
    const series = buildCashBenchmark(now, 6);
    expect(series).toHaveLength(6);
    expect(series[0]!.date).toBe('2025-12-01');
    expect(series[series.length - 1]!.date).toBe('2026-05-01');
    for (let i = 1; i < series.length; i++) {
      expect(series[i]!.date > series[i - 1]!.date).toBe(true);
    }
  });

  it('starts at 100 and compounds monthly so later points are larger', () => {
    const series = buildCashBenchmark(now, 13, 0.12); // 1%/month for clean numbers
    expect(series[0]!.value).toBe(100);
    // After 12 months at 1%/month: 100 × 1.01^12 ≈ 112.683
    expect(series[12]!.value).toBeCloseTo(112.683, 2);
    expect(series[12]!.value).toBeGreaterThan(series[0]!.value);
  });
});
