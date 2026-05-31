import { describe, it, expect } from 'vitest';
import {
  buildIcsCoverage,
  latestMissingMonth,
  missingMonths,
  monthKeyLabel,
  type IcsStatementSummary,
} from '../icsCoverage';

function stmt(monthKey: string, overrides: Partial<IcsStatementSummary> = {}): IcsStatementSummary {
  return {
    statementId: `cust_${monthKey}`,
    monthKey,
    total: 100,
    transactionsCreated: 5,
    importedAt: new Date('2026-05-01T00:00:00Z'),
    ...overrides,
  };
}

describe('monthKeyLabel', () => {
  it('formats yyyy-MM as month + year', () => {
    expect(monthKeyLabel('2026-05')).toBe('May 2026');
    expect(monthKeyLabel('2025-12')).toBe('December 2025');
    expect(monthKeyLabel('2026-01')).toBe('January 2026');
  });
});

describe('buildIcsCoverage', () => {
  it('returns empty when there are no statements', () => {
    expect(buildIcsCoverage([], '2026-05')).toEqual([]);
  });

  it('spans earliest statement → now, newest first', () => {
    const coverage = buildIcsCoverage([stmt('2026-01'), stmt('2026-03')], '2026-04');
    expect(coverage.map((m) => m.monthKey)).toEqual([
      '2026-04',
      '2026-03',
      '2026-02',
      '2026-01',
    ]);
  });

  it('flags months without a statement as gaps', () => {
    const coverage = buildIcsCoverage([stmt('2026-01'), stmt('2026-03')], '2026-04');
    const byKey = Object.fromEntries(coverage.map((m) => [m.monthKey, m.imported]));
    expect(byKey).toEqual({
      '2026-01': true,
      '2026-02': false,
      '2026-03': true,
      '2026-04': false,
    });
  });

  it('carries statement details onto imported rows', () => {
    const coverage = buildIcsCoverage(
      [stmt('2026-03', { statementId: 's3', total: 250.5, transactionsCreated: 12 })],
      '2026-03'
    );
    expect(coverage[0]).toMatchObject({
      monthKey: '2026-03',
      imported: true,
      statementId: 's3',
      total: 250.5,
      transactionsCreated: 12,
    });
  });

  it('crosses year boundaries correctly', () => {
    const coverage = buildIcsCoverage([stmt('2025-11')], '2026-01');
    expect(coverage.map((m) => m.monthKey)).toEqual(['2026-01', '2025-12', '2025-11']);
  });

  it('does not clip a statement dated in a future month', () => {
    const coverage = buildIcsCoverage([stmt('2026-01'), stmt('2026-06')], '2026-04');
    expect(coverage[0].monthKey).toBe('2026-06');
    expect(coverage.at(-1)?.monthKey).toBe('2026-01');
  });
});

describe('missingMonths / latestMissingMonth', () => {
  it('lists only gaps, newest first', () => {
    const coverage = buildIcsCoverage([stmt('2026-01')], '2026-04');
    expect(missingMonths(coverage).map((m) => m.monthKey)).toEqual([
      '2026-04',
      '2026-03',
      '2026-02',
    ]);
  });

  it('picks the most recent gap not in the future', () => {
    const coverage = buildIcsCoverage([stmt('2026-01'), stmt('2026-04')], '2026-04');
    // 2026-02 and 2026-03 are gaps; latest is 2026-03
    expect(latestMissingMonth(coverage, '2026-04')?.monthKey).toBe('2026-03');
  });

  it('returns null when fully caught up', () => {
    const coverage = buildIcsCoverage([stmt('2026-03'), stmt('2026-04')], '2026-04');
    expect(latestMissingMonth(coverage, '2026-04')).toBeNull();
  });

  it('ignores future-dated gaps for the reminder', () => {
    const coverage = buildIcsCoverage([stmt('2026-04'), stmt('2026-06')], '2026-04');
    // 2026-05 is a gap but it is in the future relative to now (2026-04)
    expect(latestMissingMonth(coverage, '2026-04')).toBeNull();
  });
});
