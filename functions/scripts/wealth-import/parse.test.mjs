/**
 * Smoke tests for the net-worth parser, run against a small SYNTHETIC fixture
 * (no real balances). Run: node --test  (from this directory).
 *
 * Covers: transposed parse, subtotal skipping, the Liabilities marker flipping
 * kind, BRL ÷ FX and BTC × FX conversion, BTC unit capture, latest-date value,
 * forward-fill closure markers, and reconciliation against the sheet's own
 * subtotal rows.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSheet, buildHoldings, leafTotalsPerDate, extractRow, SUBTOTALS } from './parse.mjs';

// Synthetic sheet: 2 snapshots. FX: 1 BTC = 10k then 20k EUR; 1 EUR = 5 then 4 BRL.
//   ABN (EUR cash): 100, 200
//   BR Bank (R$):   500, 400  → EUR 100, 100
//   BTC (units):    0.5, 0.5  → EUR 5000, 10000
//   ── Liabilities marker ──
//   Car Loan (EUR): 50, 60
// Assets = 100+100+5000=5200 ; 200+100+10000=10300. Liab = 50 ; 60.
const FIXTURE = [
  'Metric\tflag\t2020-01-01\t2020-02-01',
  '1 BTC in EUR\t\t10000\t20000',
  '1 EUR in BRL\t\t5\t4',
  'Total net worth\t\t5150\t10240',
  'Assets\t\t5200\t10300',
  'Liquid Assets\t\t5200\t10300', // subtotal — must be skipped
  'ABN\t\t100\t200',
  'BR Bank (R$)\t1\t500\t400',
  'BTC\t\t0.5\t0.5',
  'Liabilities\t\t50\t60',
  'Car Loan\t\t50\t60',
].join('\n');

const MAP = {
  'asset:ABN': { name: 'ABN', type: 'Cash', liquidity: 'liquid' },
  'asset:BR Bank (R$)': { name: 'BR Bank', type: 'Cash', liquidity: 'liquid' },
  'asset:BTC': { name: 'Bitcoin', type: 'Crypto', liquidity: 'liquid', symbol: 'BTC', valuation: 'BTC' },
  'liability:Car Loan': { name: 'Car Loan', type: 'Loan', liquidity: 'illiquid' },
};

test('parseSheet: dates, FX rows, drops subtotals + marker + FX', () => {
  const p = parseSheet(FIXTURE);
  assert.deepEqual(p.dates, ['2020-01-01', '2020-02-01']);
  assert.deepEqual(p.fx.btcEur, [10000, 20000]);
  assert.deepEqual(p.fx.eurBrl, [5, 4]);
  const names = p.rows.map((r) => r.name);
  assert.deepEqual(names, ['ABN', 'BR Bank (R$)', 'BTC', 'Car Loan']);
  assert.ok(!names.includes('Liquid Assets'));
  assert.ok(SUBTOTALS.has('Total net worth'));
});

test('Liabilities marker flips kind', () => {
  const p = parseSheet(FIXTURE);
  assert.equal(p.rows.find((r) => r.name === 'BTC').kind, 'asset');
  assert.equal(p.rows.find((r) => r.name === 'Car Loan').kind, 'liability');
});

test('buildHoldings: FX conversion, units, latest value', () => {
  const { holdings } = buildHoldings(parseSheet(FIXTURE), MAP);
  const by = Object.fromEntries(holdings.map((h) => [h.name, h]));

  assert.equal(by['BR Bank'].value, 100); // 400 BRL / 4
  assert.deepEqual(by['BR Bank'].history, [
    { date: '2020-01-01', value: 100 }, // 500/5
    { date: '2020-02-01', value: 100 }, // 400/4
  ]);

  assert.equal(by['Bitcoin'].value, 10000); // 0.5 * 20000
  assert.equal(by['Bitcoin'].units, 0.5);   // unit count, not EUR
  assert.equal(by['Car Loan'].kind, 'liability');
  assert.equal(by['Car Loan'].value, 60);
});

test('reconciliation: leaf sums equal the sheet subtotals at every date', () => {
  const p = parseSheet(FIXTURE);
  const { assets, liabs } = leafTotalsPerDate(p, MAP);
  const A = extractRow(FIXTURE, 'Assets');
  const L = extractRow(FIXTURE, 'Liabilities');
  const T = extractRow(FIXTURE, 'Total net worth');
  for (let i = 0; i < p.dates.length; i++) {
    assert.ok(Math.abs(assets[i] - A[i]) < 1e-6, `assets@${i}`);
    assert.ok(Math.abs(liabs[i] - L[i]) < 1e-6, `liabs@${i}`);
    assert.ok(Math.abs(assets[i] - liabs[i] - T[i]) < 1e-6, `net@${i}`);
  }
});

test('forward-fill: closed account gets a 0 marker at the next snapshot', () => {
  const tsv = [
    'Metric\tflag\t2020-01-01\t2020-02-01',
    '1 BTC in EUR\t\t10000\t20000',
    '1 EUR in BRL\t\t5\t4',
    'Old\t\t30\t', // value then empty (closed)
  ].join('\n');
  const { holdings } = buildHoldings(parseSheet(tsv), {
    'asset:Old': { name: 'Old', type: 'Cash', liquidity: 'liquid' },
  });
  const h = holdings[0];
  assert.equal(h.value, 0); // closed at latest snapshot
  assert.deepEqual(h.history, [
    { date: '2020-01-01', value: 30 },
    { date: '2020-02-01', value: 0 }, // closure marker for the forward-fill chart
  ]);
});
