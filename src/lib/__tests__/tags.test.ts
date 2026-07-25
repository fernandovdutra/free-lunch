import { describe, it, expect } from 'vitest';

import { collectExistingTags, normalizeTags } from '../tags';

describe('normalizeTags', () => {
  it('trims surrounding whitespace', () => {
    expect(normalizeTags(['  work  ', '\ttrip\n'])).toEqual(['work', 'trip']);
  });

  it('drops empty and whitespace-only entries', () => {
    expect(normalizeTags(['work', '', '   ', 'trip'])).toEqual(['work', 'trip']);
  });

  it('dedupes while preserving first-seen order', () => {
    expect(normalizeTags(['trip', 'work', 'trip', 'work'])).toEqual(['trip', 'work']);
  });

  it('dedupes case-sensitively and preserves original casing (no lowercasing)', () => {
    expect(normalizeTags(['Work', 'work', 'WORK'])).toEqual(['Work', 'work', 'WORK']);
  });

  it('dedupes only after trimming', () => {
    expect(normalizeTags(['work', ' work '])).toEqual(['work']);
  });

  it('returns an empty array for an all-empty input', () => {
    expect(normalizeTags(['  ', ''])).toEqual([]);
  });

  // Parity pin against the MCP server's `normalizeTags`
  // (functions/src/mcp/writeTools.ts). This is the exact fixture used by
  // functions/src/mcp/__tests__/writeTools.test.ts ('trims, drops empties, and
  // dedupes against existing tags'): merging into an existing ['work'] must
  // yield ['work', 'travel'] on both write paths, so a tag written from the web
  // UI is indistinguishable from one written by `add_transaction_tags`.
  it('matches the MCP write path when merging into existing tags', () => {
    expect(normalizeTags([...['work'], ...['  work  ', '', 'travel', 'travel']])).toEqual([
      'work',
      'travel',
    ]);
  });
});

describe('collectExistingTags', () => {
  it('returns distinct tags across transactions, most frequent first', () => {
    const transactions = [
      { tags: ['work', 'trip'] },
      { tags: ['work'] },
      { tags: ['work', 'lunch'] },
      { tags: ['trip'] },
    ];
    expect(collectExistingTags(transactions)).toEqual(['work', 'trip', 'lunch']);
  });

  it('breaks frequency ties alphabetically', () => {
    expect(collectExistingTags([{ tags: ['zeta'] }, { tags: ['alpha'] }])).toEqual([
      'alpha',
      'zeta',
    ]);
  });

  it('tolerates transactions with missing or empty tag arrays', () => {
    expect(collectExistingTags([{}, { tags: [] }, { tags: ['work'] }])).toEqual(['work']);
  });

  it('returns an empty list when nothing is tagged', () => {
    expect(collectExistingTags([{}, { tags: [] }])).toEqual([]);
  });

  it('keeps casing distinct (mirrors the case-sensitive stored form)', () => {
    // Both survive as separate entries; the tiebreak order is locale collation.
    expect(collectExistingTags([{ tags: ['Work'] }, { tags: ['work'] }]).sort()).toEqual(
      ['Work', 'work'].sort()
    );
  });
});
