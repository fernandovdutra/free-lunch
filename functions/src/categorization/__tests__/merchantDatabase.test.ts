import { describe, it, expect } from 'vitest';
import { matchMerchant, DUTCH_MERCHANTS } from '../merchantDatabase';

describe('matchMerchant', () => {
  describe('grocery matching', () => {
    it('matches ALBERT HEIJN', () => {
      const result = matchMerchant('ALBERT HEIJN 1234 AMSTERDAM');
      expect(result).not.toBeNull();
      expect(result?.categorySlug).toBe('groceries');
      expect(result?.confidence).toBe(0.95);
    });

    it('matches JUMBO', () => {
      const result = matchMerchant('JUMBO SUPERMARKTEN BV');
      expect(result).not.toBeNull();
      expect(result?.categorySlug).toBe('groceries');
    });

    it('matches LIDL', () => {
      const result = matchMerchant('LIDL NEDERLAND');
      expect(result).not.toBeNull();
      expect(result?.categorySlug).toBe('groceries');
    });
  });

  describe('transport matching', () => {
    it('matches NS (train)', () => {
      const result = matchMerchant('NS GROEP TREINKAARTJE');
      expect(result).not.toBeNull();
      expect(result?.categorySlug).toBe('transport.public');
    });

    it('matches GVB', () => {
      const result = matchMerchant('GVB AMSTERDAM TRAM');
      expect(result).not.toBeNull();
      expect(result?.categorySlug).toBe('transport.public');
    });

    it('matches SHELL fuel station', () => {
      const result = matchMerchant('SHELL STATION AMSTERDAM');
      expect(result).not.toBeNull();
      expect(result?.categorySlug).toBe('transport.fuel');
    });
  });

  describe('entertainment matching', () => {
    it('matches NETFLIX', () => {
      const result = matchMerchant('NETFLIX.COM');
      expect(result).not.toBeNull();
      expect(result?.categorySlug).toBe('entertainment');
    });

    it('matches SPOTIFY', () => {
      const result = matchMerchant('SPOTIFY AB');
      expect(result).not.toBeNull();
      expect(result?.categorySlug).toBe('entertainment');
    });
  });

  describe('utilities matching', () => {
    it('matches VATTENFALL', () => {
      const result = matchMerchant('VATTENFALL ENERGIE');
      expect(result).not.toBeNull();
      expect(result?.categorySlug).toBe('housing.utilities');
    });

    it('matches ZIGGO', () => {
      const result = matchMerchant('ZIGGO BV INTERNET');
      expect(result).not.toBeNull();
      expect(result?.categorySlug).toBe('housing.utilities');
    });
  });

  describe('case insensitivity', () => {
    it('matches lowercase description', () => {
      const result = matchMerchant('albert heijn amsterdam');
      expect(result).not.toBeNull();
      expect(result?.categorySlug).toBe('groceries');
    });

    it('matches mixed case description', () => {
      const result = matchMerchant('Albert Heijn Store 123');
      expect(result).not.toBeNull();
      expect(result?.categorySlug).toBe('groceries');
    });
  });

  describe('no match scenarios', () => {
    it('returns null for unknown merchant', () => {
      const result = matchMerchant('RANDOM COMPANY BV');
      expect(result).toBeNull();
    });

    it('returns null for empty string', () => {
      const result = matchMerchant('');
      expect(result).toBeNull();
    });

    it('returns null for partial non-match', () => {
      const result = matchMerchant('ALBERTOS PIZZA');
      expect(result).toBeNull();
    });
  });

  describe('confidence selection', () => {
    it('returns highest confidence match when multiple patterns match', () => {
      // PLUS has confidence 0.9, so if we have another match with 0.95 it should pick that
      const result = matchMerchant('SHELL PLUS CARD');
      expect(result).not.toBeNull();
      expect(result?.confidence).toBe(0.95);
    });
  });

  describe('edge cases', () => {
    it('handles special characters in description', () => {
      const result = matchMerchant('BOL.COM ORDER #123456');
      expect(result).not.toBeNull();
      expect(result?.categorySlug).toBe('shopping.general');
    });

    it('handles description with numbers', () => {
      const result = matchMerchant('ALBERT HEIJN 1234 STOR 5678');
      expect(result).not.toBeNull();
      expect(result?.categorySlug).toBe('groceries');
    });
  });
});

describe('DUTCH_MERCHANTS', () => {
  it('contains merchants with required fields', () => {
    for (const merchant of DUTCH_MERCHANTS) {
      expect(merchant.pattern).toBeDefined();
      expect(merchant.pattern.length).toBeGreaterThan(0);
      expect(merchant.categorySlug).toBeDefined();
      expect(merchant.confidence).toBeGreaterThan(0);
      expect(merchant.confidence).toBeLessThanOrEqual(1);
    }
  });

  it('has unique patterns', () => {
    const patterns = DUTCH_MERCHANTS.map((m) => m.pattern);
    const uniquePatterns = new Set(patterns);
    expect(uniquePatterns.size).toBe(patterns.length);
  });
});
