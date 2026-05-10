import { describe, it, expect } from 'vitest';
import {
  sortItems,
  validateFixedCost,
  addItem,
  updateItem,
  deleteItem,
} from '@/lib/fixedSchedule';
import type { FixedCost } from '@/lib/burnUp.types';

const RENT: FixedCost = { d: 1, a: 1450, l: 'Rent' };
const ELECTRIC: FixedCost = { d: 5, a: 95, l: 'Electricity' };
const INTERNET: FixedCost = { d: 19, a: 42, l: 'Internet' };

describe('sortItems', () => {
  it('sorts by day ascending', () => {
    const result = sortItems([INTERNET, RENT, ELECTRIC]);
    expect(result.map((i) => i.l)).toEqual(['Rent', 'Electricity', 'Internet']);
  });

  it('breaks ties on the same day alphabetically by label', () => {
    const a: FixedCost = { d: 1, a: 100, l: 'Beta' };
    const b: FixedCost = { d: 1, a: 200, l: 'Alpha' };
    const result = sortItems([a, b]);
    expect(result.map((i) => i.l)).toEqual(['Alpha', 'Beta']);
  });

  it('does not mutate the input array', () => {
    const input = [INTERNET, RENT];
    const before = [...input];
    sortItems(input);
    expect(input).toEqual(before);
  });
});

describe('validateFixedCost', () => {
  it('accepts valid items', () => {
    expect(() => {
      validateFixedCost(RENT);
    }).not.toThrow();
  });

  it.each([0, 32, -1, 1.5, NaN])('rejects day=%s', (d) => {
    expect(() => {
      validateFixedCost({ d, a: 100, l: 'X' });
    }).toThrow(/Day/);
  });

  it.each([0, -1, NaN, Infinity])('rejects amount=%s', (a) => {
    expect(() => {
      validateFixedCost({ d: 5, a, l: 'X' });
    }).toThrow(/Amount/);
  });

  it.each(['', '   '])('rejects empty/whitespace label', (l) => {
    expect(() => {
      validateFixedCost({ d: 5, a: 100, l });
    }).toThrow(/Label/);
  });

  it('allows day 31 (matcher tolerates short months)', () => {
    expect(() => {
      validateFixedCost({ d: 31, a: 100, l: 'Last day' });
    }).not.toThrow();
  });
});

describe('addItem', () => {
  it('appends and re-sorts', () => {
    const result = addItem([RENT, INTERNET], ELECTRIC);
    expect(result.map((i) => i.l)).toEqual(['Rent', 'Electricity', 'Internet']);
  });

  it('allows two items on the same day', () => {
    const a: FixedCost = { d: 1, a: 100, l: 'Alpha' };
    const b: FixedCost = { d: 1, a: 200, l: 'Beta' };
    const result = addItem([a], b);
    expect(result).toHaveLength(2);
    expect(result.map((i) => i.l)).toEqual(['Alpha', 'Beta']);
  });
});

describe('updateItem', () => {
  it('replaces at the given index and re-sorts', () => {
    const items = sortItems([RENT, ELECTRIC, INTERNET]);
    const moved: FixedCost = { d: 28, a: 50, l: 'Electricity' };
    const result = updateItem(items, 1, moved);
    expect(result.map((i) => i.l)).toEqual(['Rent', 'Internet', 'Electricity']);
  });

  it('is a no-op for an out-of-range index', () => {
    const items = [RENT];
    expect(updateItem(items, 5, ELECTRIC)).toBe(items);
    expect(updateItem(items, -1, ELECTRIC)).toBe(items);
  });
});

describe('deleteItem', () => {
  it('removes at the given index', () => {
    const items = sortItems([RENT, ELECTRIC, INTERNET]);
    const result = deleteItem(items, 1);
    expect(result.map((i) => i.l)).toEqual(['Rent', 'Internet']);
  });

  it('is a no-op for an out-of-range index', () => {
    const items = [RENT];
    expect(deleteItem(items, 5)).toBe(items);
    expect(deleteItem(items, -1)).toBe(items);
  });
});
