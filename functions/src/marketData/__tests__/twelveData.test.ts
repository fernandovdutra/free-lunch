import { describe, it, expect } from 'vitest';
import {
  chunkSymbols,
  parseQuoteResponse,
  parseTimeSeries,
  FREE_TIER_PER_MINUTE,
} from '../twelveData';

describe('chunkSymbols', () => {
  it('defaults to the free-tier per-minute ceiling', () => {
    const symbols = Array.from({ length: 20 }, (_, i) => `S${i}`);
    const batches = chunkSymbols(symbols);
    expect(batches[0]).toHaveLength(FREE_TIER_PER_MINUTE);
    expect(batches.flat()).toEqual(symbols);
  });

  it('splits into batches no larger than size', () => {
    expect(chunkSymbols(['A', 'B', 'C'], 2)).toEqual([['A', 'B'], ['C']]);
  });

  it('returns an empty array for no symbols', () => {
    expect(chunkSymbols([], 5)).toEqual([]);
  });

  it('rejects a non-positive size', () => {
    expect(() => chunkSymbols(['A'], 0)).toThrow();
  });
});

describe('parseQuoteResponse', () => {
  it('parses a single-symbol flat response', () => {
    const json = { symbol: 'AAPL', close: '189.5', previous_close: '187.0' };
    const map = parseQuoteResponse(json, ['AAPL']);
    expect(map.get('AAPL')).toEqual({ symbol: 'AAPL', price: 189.5, previousClose: 187.0 });
  });

  it('parses a batched keyed response and skips per-symbol errors', () => {
    const json = {
      AAPL: { symbol: 'AAPL', close: '189.5', previous_close: '187.0' },
      BTC: { status: 'error', code: 404, message: 'symbol not found' },
      MSFT: { symbol: 'MSFT', close: '410.10' },
    };
    const map = parseQuoteResponse(json, ['AAPL', 'BTC', 'MSFT']);
    expect(map.size).toBe(2);
    expect(map.get('AAPL')?.price).toBe(189.5);
    expect(map.get('MSFT')).toEqual({ symbol: 'MSFT', price: 410.1, previousClose: null });
    expect(map.has('BTC')).toBe(false);
  });

  it('falls back to the requested symbol key when the entry omits its symbol', () => {
    const json = { 'BTC/USD': { close: '66667' } };
    const map = parseQuoteResponse(json, ['BTC/USD']);
    expect(map.get('BTC/USD')).toEqual({ symbol: 'BTC/USD', price: 66667, previousClose: null });
  });

  it('returns empty for a top-level error payload or non-object', () => {
    expect(parseQuoteResponse({ status: 'error', message: 'bad key' }, ['AAPL']).size).toBe(0);
    expect(parseQuoteResponse(null, ['AAPL']).size).toBe(0);
  });
});

describe('parseTimeSeries', () => {
  it('maps values to ascending dated close points', () => {
    const json = {
      values: [
        { datetime: '2026-05-30', close: '575.20' },
        { datetime: '2026-05-29', close: '572.10' },
        { datetime: '2026-05-28', close: '570.00' },
      ],
    };
    expect(parseTimeSeries(json)).toEqual([
      { date: '2026-05-28', value: 570.0 },
      { date: '2026-05-29', value: 572.1 },
      { date: '2026-05-30', value: 575.2 },
    ]);
  });

  it('trims datetime to the date portion and skips malformed rows', () => {
    const json = {
      values: [
        { datetime: '2026-05-30 15:30:00', close: '575.20' },
        { datetime: '2026-05-29', close: 'n/a' },
        { close: '1.0' },
      ],
    };
    expect(parseTimeSeries(json)).toEqual([{ date: '2026-05-30', value: 575.2 }]);
  });

  it('returns empty on an error payload or missing values', () => {
    expect(parseTimeSeries({ status: 'error' })).toEqual([]);
    expect(parseTimeSeries({})).toEqual([]);
    expect(parseTimeSeries(null)).toEqual([]);
  });
});
