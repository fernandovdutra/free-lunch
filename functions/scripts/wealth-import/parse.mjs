/**
 * Parse a personal net-worth tracker TSV (transposed: rows = accounts, columns
 * = dated snapshots) into the Wealth `Holding` shape, FX-converting per date.
 *
 * Pure + dependency-free so it can be unit-tested against a synthetic fixture
 * (see parse.test.mjs) — it never imports firebase or touches the network. The
 * importer (import.mjs) consumes its output; nothing here reads real balances
 * except the gitignored networth.raw.tsv passed in at runtime.
 *
 * Sheet conventions (confirmed against the source's own subtotal rows):
 *   - First two data rows are FX: `1 BTC in EUR`, `1 EUR in BRL`.
 *   - `flag` column === '1'  → row is denominated in BRL (÷ EUR/BRL per date).
 *   - Rows named `BTC*`      → cells are *unit counts* (× BTC/EUR per date).
 *   - Everything else        → EUR.
 *   - Subtotal rows (SUBTOTALS) are skipped.
 *   - The `Liabilities` marker row flips every following leaf to kind=liability,
 *     disambiguating names that appear on both sides (House, Apto, Tesla, Nubank).
 */

const FX_BTC = '1 BTC in EUR';
const FX_BRL = '1 EUR in BRL';
const LIABILITIES_MARKER = 'Liabilities';

/** Derived/aggregate rows that are sums of their children — never imported. */
export const SUBTOTALS = new Set([
  'Total net worth', 'Growth', 'Assets', 'Liquid Assets', 'Deposits',
  'Financial instruments', 'Real estate', 'Digital assets', 'Objects of value',
  'Receivables', 'Liabilities', 'Consumer debt', 'Real estate debt',
]);

const round2 = (n) => Math.round(n * 100) / 100;

/** Parse a numeric cell; '' / undefined → null (absent observation). */
function num(cell) {
  if (cell === undefined) return null;
  const t = cell.trim();
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/**
 * Parse TSV text into { dates, fx, rows } where rows preserve sheet order and
 * each row is { name, flag, kind, cells: (number|null)[] }.
 */
export function parseSheet(tsv) {
  const lines = tsv.split(/\r?\n/).filter((l) => l.trim() !== '');
  const header = lines[0].split('\t');
  const dates = header.slice(2).map((d) => d.trim());

  const fx = { btcEur: null, eurBrl: null };
  const rows = [];
  let kind = 'asset';

  for (const line of lines.slice(1)) {
    const f = line.split('\t');
    const name = f[0].trim();
    const flag = (f[1] ?? '').trim();
    const cells = dates.map((_, i) => num(f[2 + i]));

    if (name === FX_BTC) { fx.btcEur = cells; continue; }
    if (name === FX_BRL) { fx.eurBrl = cells; continue; }
    if (name === LIABILITIES_MARKER) { kind = 'liability'; continue; }
    if (SUBTOTALS.has(name)) continue;

    rows.push({ name, flag, kind, cells });
  }

  if (!fx.btcEur || !fx.eurBrl) throw new Error('Missing FX rows (BTC/EUR or EUR/BRL)');
  return { dates, fx, rows };
}

/** EUR value of one cell given its valuation basis and the per-date FX. */
function toEur(raw, valuation, i, fx) {
  if (raw === null) return null;
  switch (valuation) {
    case 'BRL': return raw / fx.eurBrl[i];
    case 'BTC': return raw * fx.btcEur[i];
    default: return raw;
  }
}

function valuationFor(row, mapEntry) {
  if (mapEntry?.valuation) return mapEntry.valuation;
  if (row.name.startsWith('BTC')) return 'BTC';
  return row.flag === '1' ? 'BRL' : 'EUR';
}

/**
 * Build holdings from a parsed sheet + a mapping config keyed by
 * `${kind}:${sheetName}`. Returns { holdings, unmapped }.
 */
export function buildHoldings({ dates, fx, rows }, mapping) {
  const lastIdx = dates.length - 1;
  const holdings = [];
  const unmapped = [];

  for (const row of rows) {
    const key = `${row.kind}:${row.name}`;
    const m = mapping[key];
    if (!m) { unmapped.push(key); continue; }

    const valuation = valuationFor(row, m);
    const eur = row.cells.map((raw, i) => toEur(raw, valuation, i, fx));

    // History: one point per observed (non-null) date.
    const history = [];
    let lastObsIdx = -1;
    for (let i = 0; i < dates.length; i++) {
      if (eur[i] === null) continue;
      history.push({ date: dates[i], value: round2(eur[i]) });
      lastObsIdx = i;
    }
    if (history.length === 0) { // account never carried a value
      if (m.include !== false) unmapped.push(`${key} (no data)`);
      continue;
    }

    // Forward-fill correctness: if the account closed before the final snapshot
    // with a non-zero last value, drop it to 0 at the next snapshot so the chart
    // doesn't carry a stale balance forward.
    if (lastObsIdx < lastIdx && round2(eur[lastObsIdx]) !== 0) {
      history.push({ date: dates[lastObsIdx + 1], value: 0 });
    }

    // Current value = value at the final column (closed → 0), so net worth
    // reconciles to the sheet's latest "Total net worth".
    const currentValue = eur[lastIdx] === null ? 0 : round2(eur[lastIdx]);
    const units = valuation === 'BTC'
      ? (row.cells[lastIdx] ?? row.cells[lastObsIdx] ?? null)
      : null;

    holdings.push({
      sheetName: row.name,
      name: m.name,
      platform: m.platform ?? '',
      type: m.type,
      kind: row.kind,
      value: currentValue,
      cost: 0,
      units,
      liquidity: m.liquidity,
      updateSource: 'manual',
      symbol: m.symbol ?? null,
      include: m.include !== false,
      needsTypeDecision: !!m.needsTypeDecision,
      history,
    });
  }

  return { holdings, unmapped };
}

/**
 * Extract a single named row's numeric cells straight from TSV (used to read the
 * sheet's own subtotal rows for reconciliation, since parseSheet drops them).
 */
export function extractRow(tsv, name) {
  const lines = tsv.split(/\r?\n/).filter((l) => l.trim() !== '');
  const nCols = lines[0].split('\t').length - 2;
  for (const line of lines.slice(1)) {
    const f = line.split('\t');
    if (f[0].trim() === name) {
      return Array.from({ length: nCols }, (_, i) => num(f[2 + i]));
    }
  }
  return null;
}

/** Sum leaf EUR values per date (nulls = 0), split by kind. */
export function leafTotalsPerDate({ dates, fx, rows }, mapping) {
  const assets = dates.map(() => 0);
  const liabs = dates.map(() => 0);
  for (const row of rows) {
    const key = `${row.kind}:${row.name}`;
    const m = mapping[key] ?? {};
    const valuation = valuationFor(row, m);
    for (let i = 0; i < dates.length; i++) {
      const v = toEur(row.cells[i], valuation, i, fx);
      if (v === null) continue;
      if (row.kind === 'liability') liabs[i] += v; else assets[i] += v;
    }
  }
  return { assets, liabs };
}
