import type { Timestamp } from 'firebase-admin/firestore';

/**
 * Result from the categorization engine
 */
export interface CategorizationResult {
  categoryId: string | null;
  confidence: number; // 0.0 - 1.0
  source: 'rule' | 'merchant' | 'learned' | 'none';
  matchedPattern?: string; // For debugging
  ruleId?: string; // If matched by user rule
}

/**
 * Rule stored in Firestore
 */
export interface StoredRule {
  id: string;
  pattern: string;
  matchType: 'contains' | 'exact' | 'regex';
  categoryId: string;
  priority: number;
  isLearned: boolean;
  isSystem: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Merchant mapping entry
 */
export interface MerchantMapping {
  pattern: string;
  categorySlug: string; // e.g., 'groceries', 'transport.public'
  confidence: number;
}
