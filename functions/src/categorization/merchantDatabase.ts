import type { MerchantMapping } from './types.js';

/**
 * Pre-populated Dutch merchant patterns mapped to category slugs.
 * These slugs are resolved to actual category IDs at runtime based on user's categories.
 */
export const DUTCH_MERCHANTS: MerchantMapping[] = [
  // Groceries - high confidence
  { pattern: 'ALBERT HEIJN', categorySlug: 'groceries', confidence: 0.95 },
  { pattern: 'JUMBO', categorySlug: 'groceries', confidence: 0.95 },
  { pattern: 'LIDL', categorySlug: 'groceries', confidence: 0.95 },
  { pattern: 'ALDI', categorySlug: 'groceries', confidence: 0.95 },
  { pattern: 'PLUS', categorySlug: 'groceries', confidence: 0.9 },
  { pattern: 'DIRK', categorySlug: 'groceries', confidence: 0.95 },
  { pattern: 'COOP', categorySlug: 'groceries', confidence: 0.9 },

  // Transport - Public
  { pattern: 'NS ', categorySlug: 'transport.public', confidence: 0.95 },
  { pattern: 'GVB', categorySlug: 'transport.public', confidence: 0.95 },
  { pattern: 'RET', categorySlug: 'transport.public', confidence: 0.95 },
  { pattern: 'HTM', categorySlug: 'transport.public', confidence: 0.95 },
  { pattern: 'OV-CHIPKAART', categorySlug: 'transport.public', confidence: 0.9 },

  // Transport - Fuel
  { pattern: 'SHELL', categorySlug: 'transport.fuel', confidence: 0.95 },
  { pattern: 'BP ', categorySlug: 'transport.fuel', confidence: 0.95 },
  { pattern: 'ESSO', categorySlug: 'transport.fuel', confidence: 0.95 },
  { pattern: 'TINQ', categorySlug: 'transport.fuel', confidence: 0.95 },
  { pattern: 'TANGO', categorySlug: 'transport.fuel', confidence: 0.95 },

  // Shopping
  { pattern: 'BOL.COM', categorySlug: 'shopping.general', confidence: 0.95 },
  { pattern: 'HEMA', categorySlug: 'shopping.general', confidence: 0.9 },
  { pattern: 'IKEA', categorySlug: 'shopping.home', confidence: 0.95 },
  { pattern: 'ACTION', categorySlug: 'shopping.general', confidence: 0.9 },
  { pattern: 'COOLBLUE', categorySlug: 'shopping.electronics', confidence: 0.95 },
  { pattern: 'MEDIAMARKT', categorySlug: 'shopping.electronics', confidence: 0.95 },

  // Food & Drink
  { pattern: 'THUISBEZORGD', categorySlug: 'food.restaurants', confidence: 0.95 },
  { pattern: 'UBER EATS', categorySlug: 'food.restaurants', confidence: 0.95 },
  { pattern: 'DELIVEROO', categorySlug: 'food.restaurants', confidence: 0.95 },
  { pattern: 'MCDONALDS', categorySlug: 'food.restaurants', confidence: 0.9 },
  { pattern: 'STARBUCKS', categorySlug: 'food.coffee', confidence: 0.95 },

  // Health
  { pattern: 'KRUIDVAT', categorySlug: 'health.pharmacy', confidence: 0.95 },
  { pattern: 'ETOS', categorySlug: 'health.pharmacy', confidence: 0.95 },
  { pattern: 'APOTHEEK', categorySlug: 'health.pharmacy', confidence: 0.9 },

  // Entertainment
  { pattern: 'NETFLIX', categorySlug: 'entertainment', confidence: 0.95 },
  { pattern: 'SPOTIFY', categorySlug: 'entertainment', confidence: 0.95 },
  { pattern: 'PATHE', categorySlug: 'entertainment', confidence: 0.95 },

  // Utilities
  { pattern: 'VATTENFALL', categorySlug: 'housing.utilities', confidence: 0.95 },
  { pattern: 'ENECO', categorySlug: 'housing.utilities', confidence: 0.95 },
  { pattern: 'ESSENT', categorySlug: 'housing.utilities', confidence: 0.95 },
  { pattern: 'KPN', categorySlug: 'housing.utilities', confidence: 0.9 },
  { pattern: 'VODAFONE', categorySlug: 'housing.utilities', confidence: 0.9 },
  { pattern: 'T-MOBILE', categorySlug: 'housing.utilities', confidence: 0.9 },
  { pattern: 'ZIGGO', categorySlug: 'housing.utilities', confidence: 0.95 },
];

/**
 * Match a transaction description against the merchant database.
 * Returns the first match with highest confidence, or null if no match.
 */
export function matchMerchant(description: string): MerchantMapping | null {
  const upperDesc = description.toUpperCase();

  let bestMatch: MerchantMapping | null = null;

  for (const merchant of DUTCH_MERCHANTS) {
    if (upperDesc.includes(merchant.pattern)) {
      if (!bestMatch || merchant.confidence > bestMatch.confidence) {
        bestMatch = merchant;
      }
    }
  }

  return bestMatch;
}
