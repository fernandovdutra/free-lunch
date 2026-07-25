import { describe, it, expect } from 'vitest';
import {
  amountToInputText,
  makeSplitFormSchema,
  parseAmountInput,
  roundToCents,
  rowsToStoredSplits,
  splitRemainder,
  validateSplits,
} from '../splits';

describe('parseAmountInput', () => {
  it('parses plain and dot-decimal amounts', () => {
    expect(parseAmountInput('65')).toBe(65);
    expect(parseAmountInput('65.50')).toBe(65.5);
    expect(parseAmountInput('0.01')).toBe(0.01);
  });

  it('parses NL comma decimals and grouping separators', () => {
    expect(parseAmountInput('20,50')).toBe(20.5);
    expect(parseAmountInput('1.234,56')).toBe(1234.56);
    expect(parseAmountInput('1,234.56')).toBe(1234.56);
  });

  it('tolerates a euro sign and whitespace', () => {
    expect(parseAmountInput('€ 20,50')).toBe(20.5);
    expect(parseAmountInput(' 12 ')).toBe(12);
  });

  it('returns null for empty or malformed input', () => {
    expect(parseAmountInput('')).toBeNull();
    expect(parseAmountInput('abc')).toBeNull();
    expect(parseAmountInput('12.34.56')).toBeNull();
    expect(parseAmountInput('12,')).toBeNull();
  });

  it('rounds parsed values to whole cents', () => {
    expect(parseAmountInput('20.505')).toBe(20.51);
  });
});

describe('splitRemainder', () => {
  it('returns exactly 0 for a fully allocated split', () => {
    expect(splitRemainder(85.5, [65, 20.5])).toBe(0);
  });

  it('is float-safe (cent math, no drift)', () => {
    expect(splitRemainder(0.3, [0.1, 0.2])).toBe(0);
    expect(splitRemainder(85.5, [28.5, 28.5, 28.5])).toBe(0);
  });

  it('treats unparsed rows as 0 and reports what is left', () => {
    expect(splitRemainder(85.5, [65, null])).toBe(20.5);
  });

  it('goes negative when over-allocated', () => {
    expect(splitRemainder(85.5, [65, 30])).toBe(-9.5);
  });
});

describe('validateSplits (PRD §10)', () => {
  it('validates splits equal original amount', () => {
    const splits = [
      { amount: 65, categoryId: 'groceries', note: null },
      { amount: 20.5, categoryId: 'household', note: 'cleaning' },
    ];
    expect(validateSplits(85.5, splits)).toBe(true);
  });

  it('rejects splits that do not sum correctly', () => {
    const splits = [
      { amount: 65, categoryId: 'groceries', note: null },
      { amount: 10, categoryId: 'household', note: null },
    ];
    expect(validateSplits(85.5, splits)).toBe(false);
  });

  it('rejects fewer than 2 rows', () => {
    expect(validateSplits(85.5, [{ amount: 85.5 }])).toBe(false);
  });

  it('rejects non-positive amounts (backend skips amount <= 0)', () => {
    expect(validateSplits(85.5, [{ amount: 90.5 }, { amount: -5 }])).toBe(false);
    expect(validateSplits(85.5, [{ amount: 85.5 }, { amount: 0 }])).toBe(false);
  });
});

describe('makeSplitFormSchema', () => {
  const schema = makeSplitFormSchema(85.5);

  it('accepts 2+ rows that sum to the total', () => {
    const result = schema.safeParse({
      splits: [
        { amountText: '65', categoryId: 'groceries', note: '' },
        { amountText: '20,50', categoryId: 'household', note: 'cleaning' },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('rejects 2+ rows whose sum misses the total', () => {
    const result = schema.safeParse({
      splits: [
        { amountText: '65', categoryId: 'groceries', note: '' },
        { amountText: '10', categoryId: 'household', note: '' },
      ],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((i) => i.message)).toContain(
        'Split amounts must add up to the transaction amount'
      );
    }
  });

  it('skips the sum check for a single row (un-split path)', () => {
    const result = schema.safeParse({
      splits: [{ amountText: '10', categoryId: 'groceries', note: '' }],
    });
    expect(result.success).toBe(true);
  });

  it('requires a category and a positive amount per row', () => {
    const noCategory = schema.safeParse({
      splits: [
        { amountText: '65', categoryId: '', note: '' },
        { amountText: '20.50', categoryId: 'household', note: '' },
      ],
    });
    expect(noCategory.success).toBe(false);

    const zeroAmount = schema.safeParse({
      splits: [
        { amountText: '0', categoryId: 'groceries', note: '' },
        { amountText: '85.50', categoryId: 'household', note: '' },
      ],
    });
    expect(zeroAmount.success).toBe(false);
  });
});

describe('rowsToStoredSplits', () => {
  it('produces the stored shape: positive amount, categoryId, note or null', () => {
    expect(
      rowsToStoredSplits([
        { amountText: '65', categoryId: 'groceries', note: '  ' },
        { amountText: '20,50', categoryId: 'household', note: ' cleaning ' },
      ])
    ).toEqual([
      { amount: 65, categoryId: 'groceries', note: null },
      { amount: 20.5, categoryId: 'household', note: 'cleaning' },
    ]);
  });
});

describe('helpers', () => {
  it('roundToCents guards float artifacts', () => {
    expect(roundToCents(20.499999999)).toBe(20.5);
  });

  it('amountToInputText formats prefills with two decimals', () => {
    expect(amountToInputText(65)).toBe('65.00');
    expect(amountToInputText(20.5)).toBe('20.50');
  });
});
