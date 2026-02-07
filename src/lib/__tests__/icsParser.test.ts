import { describe, it, expect } from 'vitest';
import { parseDutchDate, parseDutchAmount } from '../icsParser';

describe('parseDutchDate', () => {
  it('parses a standard date within the statement month', () => {
    // Jan statement, jan date → same year
    const date = parseDutchDate('06 jan.', 2026, 0); // month 0 = January
    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(0);
    expect(date.getDate()).toBe(6);
  });

  it('infers previous year for dec dates on a January statement', () => {
    // Jan statement (month 0), dec date → previous year
    const date = parseDutchDate('30 dec.', 2026, 0);
    expect(date.getFullYear()).toBe(2025);
    expect(date.getMonth()).toBe(11);
    expect(date.getDate()).toBe(30);
  });

  it('handles dates without trailing period', () => {
    const date = parseDutchDate('15 mrt', 2026, 2);
    expect(date.getMonth()).toBe(2);
    expect(date.getDate()).toBe(15);
  });

  it('handles single-digit day', () => {
    const date = parseDutchDate('2 jan.', 2026, 0);
    expect(date.getDate()).toBe(2);
  });

  it('throws on invalid date format', () => {
    expect(() => parseDutchDate('invalid', 2026, 0)).toThrow('Cannot parse Dutch date');
  });

  it('throws on unknown month', () => {
    expect(() => parseDutchDate('15 xyz.', 2026, 0)).toThrow('Unknown Dutch month');
  });

  it('keeps same year when transaction month <= statement month', () => {
    // March statement, feb date → same year
    const date = parseDutchDate('10 feb.', 2026, 2);
    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(1);
  });
});

describe('parseDutchAmount', () => {
  it('parses standard comma-notation amount', () => {
    expect(parseDutchAmount('36,00')).toBe(36.0);
  });

  it('parses amount with decimals', () => {
    expect(parseDutchAmount('692,52')).toBe(692.52);
  });

  it('parses amount with spaces', () => {
    expect(parseDutchAmount(' 13,99 ')).toBe(13.99);
  });

  it('parses small amount', () => {
    expect(parseDutchAmount('2,62')).toBe(2.62);
  });

  it('parses large amount', () => {
    expect(parseDutchAmount('148,32')).toBe(148.32);
  });

  it('throws on invalid amount', () => {
    expect(() => parseDutchAmount('abc')).toThrow('Cannot parse amount');
  });
});
