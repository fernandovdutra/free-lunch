"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const merchantDatabase_1 = require("../merchantDatabase");
(0, vitest_1.describe)('matchMerchant', () => {
    (0, vitest_1.describe)('grocery matching', () => {
        (0, vitest_1.it)('matches ALBERT HEIJN', () => {
            const result = (0, merchantDatabase_1.matchMerchant)('ALBERT HEIJN 1234 AMSTERDAM');
            (0, vitest_1.expect)(result).not.toBeNull();
            (0, vitest_1.expect)(result?.categorySlug).toBe('groceries');
            (0, vitest_1.expect)(result?.confidence).toBe(0.95);
        });
        (0, vitest_1.it)('matches JUMBO', () => {
            const result = (0, merchantDatabase_1.matchMerchant)('JUMBO SUPERMARKTEN BV');
            (0, vitest_1.expect)(result).not.toBeNull();
            (0, vitest_1.expect)(result?.categorySlug).toBe('groceries');
        });
        (0, vitest_1.it)('matches LIDL', () => {
            const result = (0, merchantDatabase_1.matchMerchant)('LIDL NEDERLAND');
            (0, vitest_1.expect)(result).not.toBeNull();
            (0, vitest_1.expect)(result?.categorySlug).toBe('groceries');
        });
    });
    (0, vitest_1.describe)('transport matching', () => {
        (0, vitest_1.it)('matches NS (train)', () => {
            const result = (0, merchantDatabase_1.matchMerchant)('NS GROEP TREINKAARTJE');
            (0, vitest_1.expect)(result).not.toBeNull();
            (0, vitest_1.expect)(result?.categorySlug).toBe('transport.public');
        });
        (0, vitest_1.it)('matches GVB', () => {
            const result = (0, merchantDatabase_1.matchMerchant)('GVB AMSTERDAM TRAM');
            (0, vitest_1.expect)(result).not.toBeNull();
            (0, vitest_1.expect)(result?.categorySlug).toBe('transport.public');
        });
        (0, vitest_1.it)('matches SHELL fuel station', () => {
            const result = (0, merchantDatabase_1.matchMerchant)('SHELL STATION AMSTERDAM');
            (0, vitest_1.expect)(result).not.toBeNull();
            (0, vitest_1.expect)(result?.categorySlug).toBe('transport.fuel');
        });
    });
    (0, vitest_1.describe)('entertainment matching', () => {
        (0, vitest_1.it)('matches NETFLIX', () => {
            const result = (0, merchantDatabase_1.matchMerchant)('NETFLIX.COM');
            (0, vitest_1.expect)(result).not.toBeNull();
            (0, vitest_1.expect)(result?.categorySlug).toBe('entertainment');
        });
        (0, vitest_1.it)('matches SPOTIFY', () => {
            const result = (0, merchantDatabase_1.matchMerchant)('SPOTIFY AB');
            (0, vitest_1.expect)(result).not.toBeNull();
            (0, vitest_1.expect)(result?.categorySlug).toBe('entertainment');
        });
    });
    (0, vitest_1.describe)('utilities matching', () => {
        (0, vitest_1.it)('matches VATTENFALL', () => {
            const result = (0, merchantDatabase_1.matchMerchant)('VATTENFALL ENERGIE');
            (0, vitest_1.expect)(result).not.toBeNull();
            (0, vitest_1.expect)(result?.categorySlug).toBe('housing.utilities');
        });
        (0, vitest_1.it)('matches ZIGGO', () => {
            const result = (0, merchantDatabase_1.matchMerchant)('ZIGGO BV INTERNET');
            (0, vitest_1.expect)(result).not.toBeNull();
            (0, vitest_1.expect)(result?.categorySlug).toBe('housing.utilities');
        });
    });
    (0, vitest_1.describe)('case insensitivity', () => {
        (0, vitest_1.it)('matches lowercase description', () => {
            const result = (0, merchantDatabase_1.matchMerchant)('albert heijn amsterdam');
            (0, vitest_1.expect)(result).not.toBeNull();
            (0, vitest_1.expect)(result?.categorySlug).toBe('groceries');
        });
        (0, vitest_1.it)('matches mixed case description', () => {
            const result = (0, merchantDatabase_1.matchMerchant)('Albert Heijn Store 123');
            (0, vitest_1.expect)(result).not.toBeNull();
            (0, vitest_1.expect)(result?.categorySlug).toBe('groceries');
        });
    });
    (0, vitest_1.describe)('no match scenarios', () => {
        (0, vitest_1.it)('returns null for unknown merchant', () => {
            const result = (0, merchantDatabase_1.matchMerchant)('RANDOM COMPANY BV');
            (0, vitest_1.expect)(result).toBeNull();
        });
        (0, vitest_1.it)('returns null for empty string', () => {
            const result = (0, merchantDatabase_1.matchMerchant)('');
            (0, vitest_1.expect)(result).toBeNull();
        });
        (0, vitest_1.it)('returns null for partial non-match', () => {
            const result = (0, merchantDatabase_1.matchMerchant)('ALBERTOS PIZZA');
            (0, vitest_1.expect)(result).toBeNull();
        });
    });
    (0, vitest_1.describe)('confidence selection', () => {
        (0, vitest_1.it)('returns highest confidence match when multiple patterns match', () => {
            // PLUS has confidence 0.9, so if we have another match with 0.95 it should pick that
            const result = (0, merchantDatabase_1.matchMerchant)('SHELL PLUS CARD');
            (0, vitest_1.expect)(result).not.toBeNull();
            (0, vitest_1.expect)(result?.confidence).toBe(0.95);
        });
    });
    (0, vitest_1.describe)('edge cases', () => {
        (0, vitest_1.it)('handles special characters in description', () => {
            const result = (0, merchantDatabase_1.matchMerchant)('BOL.COM ORDER #123456');
            (0, vitest_1.expect)(result).not.toBeNull();
            (0, vitest_1.expect)(result?.categorySlug).toBe('shopping.general');
        });
        (0, vitest_1.it)('handles description with numbers', () => {
            const result = (0, merchantDatabase_1.matchMerchant)('ALBERT HEIJN 1234 STOR 5678');
            (0, vitest_1.expect)(result).not.toBeNull();
            (0, vitest_1.expect)(result?.categorySlug).toBe('groceries');
        });
    });
});
(0, vitest_1.describe)('DUTCH_MERCHANTS', () => {
    (0, vitest_1.it)('contains merchants with required fields', () => {
        for (const merchant of merchantDatabase_1.DUTCH_MERCHANTS) {
            (0, vitest_1.expect)(merchant.pattern).toBeDefined();
            (0, vitest_1.expect)(merchant.pattern.length).toBeGreaterThan(0);
            (0, vitest_1.expect)(merchant.categorySlug).toBeDefined();
            (0, vitest_1.expect)(merchant.confidence).toBeGreaterThan(0);
            (0, vitest_1.expect)(merchant.confidence).toBeLessThanOrEqual(1);
        }
    });
    (0, vitest_1.it)('has unique patterns', () => {
        const patterns = merchantDatabase_1.DUTCH_MERCHANTS.map((m) => m.pattern);
        const uniquePatterns = new Set(patterns);
        (0, vitest_1.expect)(uniquePatterns.size).toBe(patterns.length);
    });
});
//# sourceMappingURL=merchantDatabase.test.js.map