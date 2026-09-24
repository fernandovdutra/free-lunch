import { getFirestore } from 'firebase-admin/firestore';
import type { CategorizationResult, StoredRule } from './types.js';
import { evaluateCategorization } from './decisionEngine.js';
import { categorizeWithLLM, type LlmCategorizationOutcome } from './llmCategorizer.js';
import { isAssignableCategory } from './categoryRegistry.js';

interface CategoryDoc {
  id: string;
  name: string;
  parentId: string | null;
  archived?: boolean;
  status?: string;
}

/**
 * Main categorization engine.
 * Applies categorization in priority order:
 * 1. User-defined rules (highest priority)
 * 2. Merchant database
 * 3. Learned rules (from corrections)
 */
export class Categorizer {
  private db = getFirestore();
  private userId: string;
  private rules: StoredRule[] = [];
  private categories: CategoryDoc[] = [];
  private initialized = false;

  constructor(userId: string) {
    this.userId = userId;
  }

  /**
   * Initialize the categorizer by loading user's rules and categories.
   * Call this once before categorizing multiple transactions.
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Load user's categorization rules
    const rulesSnapshot = await this.db
      .collection('users')
      .doc(this.userId)
      .collection('rules')
      .get();

    this.rules = rulesSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as StoredRule[];

    // Load user's categories for slug resolution
    const categoriesSnapshot = await this.db
      .collection('users')
      .doc(this.userId)
      .collection('categories')
      .get();

    this.categories = categoriesSnapshot.docs.map((doc) => ({
      id: doc.id,
      name: doc.data().name,
      parentId: doc.data().parentId ?? null,
      archived: doc.data().archived === true,
      status: doc.data().status,
    }));

    this.initialized = true;
  }

  /**
   * Categorize a transaction.
   * Returns categorization result with category ID, confidence, and source.
   */
  categorize(description: string, counterparty: string | null): CategorizationResult {
    if (!this.initialized) {
      throw new Error('Categorizer not initialized. Call initialize() first.');
    }

    return evaluateCategorization({ description, counterparty }, this.rules, this.categories);
  }

  /**
   * Batch-categorize uncategorized transactions using LLM.
   * Call this after pattern matching to fill in gaps.
   * Returns per-index results plus per-index failure reasons — every input
   * index lands in exactly one of the two maps.
   */
  async categorizeBatchWithLLM(
    transactions: Array<{
      index: number;
      description: string;
      counterparty: string | null;
      amount: number;
    }>,
    apiKey: string
  ): Promise<LlmCategorizationOutcome> {
    if (!this.initialized) {
      throw new Error('Categorizer not initialized. Call initialize() first.');
    }

    // Build category info for the LLM (only leaf categories)
    const categoryInfos = this.categories
      .filter((c) => isAssignableCategory(c.id, this.categories))
      .map((c) => {
        const parent = this.categories.find((p) => p.id === c.parentId);
        return {
          id: c.id,
          name: c.name,
          parentName: parent?.name ?? null,
        };
      });

    return categorizeWithLLM(transactions, categoryInfos, apiKey);
  }
}
