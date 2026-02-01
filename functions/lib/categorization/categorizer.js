"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Categorizer = void 0;
const firestore_1 = require("firebase-admin/firestore");
const ruleEngine_js_1 = require("./ruleEngine.js");
const merchantDatabase_js_1 = require("./merchantDatabase.js");
/**
 * Main categorization engine.
 * Applies categorization in priority order:
 * 1. User-defined rules (highest priority)
 * 2. Merchant database
 * 3. Learned rules (from corrections)
 */
class Categorizer {
    db = (0, firestore_1.getFirestore)();
    userId;
    rules = [];
    categories = [];
    categorySlugMap = new Map(); // slug -> categoryId
    initialized = false;
    constructor(userId) {
        this.userId = userId;
    }
    /**
     * Initialize the categorizer by loading user's rules and categories.
     * Call this once before categorizing multiple transactions.
     */
    async initialize() {
        if (this.initialized)
            return;
        // Load user's categorization rules
        const rulesSnapshot = await this.db
            .collection('users')
            .doc(this.userId)
            .collection('rules')
            .orderBy('priority', 'desc')
            .get();
        this.rules = rulesSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        }));
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
        }));
        // Build slug map for merchant database resolution
        this.buildCategorySlugMap();
        this.initialized = true;
    }
    /**
     * Build a map from category slugs to category IDs.
     * Handles hierarchical slugs like 'transport.public' by matching category names.
     */
    buildCategorySlugMap() {
        this.categorySlugMap.clear();
        for (const cat of this.categories) {
            // 1. Map by category ID directly
            this.categorySlugMap.set(cat.id, cat.id);
            // 2. Simple name match (lowercase, alphanumeric only)
            const simpleName = cat.name.toLowerCase().replace(/[^a-z0-9]/g, '');
            this.categorySlugMap.set(simpleName, cat.id);
            // 3. Name with spaces replaced by dots
            const dottedName = cat.name.toLowerCase().replace(/[^a-z0-9]+/g, '.');
            this.categorySlugMap.set(dottedName, cat.id);
            // 4. If has parent, create hierarchical slugs
            if (cat.parentId) {
                const parent = this.categories.find((c) => c.id === cat.parentId);
                if (parent) {
                    // Format: parent.child (e.g., "food.groceries")
                    const parentSimple = parent.name.toLowerCase().replace(/[^a-z0-9]/g, '');
                    const childSimple = cat.name.toLowerCase().replace(/[^a-z0-9]/g, '');
                    this.categorySlugMap.set(`${parentSimple}.${childSimple}`, cat.id);
                    // Also map just the child name for partial matches
                    this.categorySlugMap.set(childSimple, cat.id);
                }
            }
        }
    }
    /**
     * Resolve a category slug to an actual category ID.
     */
    resolveCategorySlug(slug) {
        // Try exact match first
        if (this.categorySlugMap.has(slug)) {
            return this.categorySlugMap.get(slug);
        }
        // Try partial match (e.g., 'groceries' matches 'Food > Groceries')
        const normalizedSlug = slug.toLowerCase().replace(/[^a-z.]/g, '');
        for (const [key, value] of this.categorySlugMap) {
            if (key.includes(normalizedSlug) || normalizedSlug.includes(key)) {
                return value;
            }
        }
        return null;
    }
    /**
     * Categorize a transaction.
     * Returns categorization result with category ID, confidence, and source.
     */
    categorize(description, counterparty) {
        if (!this.initialized) {
            throw new Error('Categorizer not initialized. Call initialize() first.');
        }
        const searchText = [description, counterparty].filter(Boolean).join(' ');
        // 1. Try user-defined rules first (non-learned)
        const userRules = this.rules.filter((r) => !r.isLearned);
        const userRuleMatch = (0, ruleEngine_js_1.matchRules)(searchText, userRules);
        if (userRuleMatch) {
            return userRuleMatch;
        }
        // 2. Try merchant database
        const merchantMatch = (0, merchantDatabase_js_1.matchMerchant)(searchText);
        if (merchantMatch) {
            const categoryId = this.resolveCategorySlug(merchantMatch.categorySlug);
            if (categoryId) {
                return {
                    categoryId,
                    confidence: merchantMatch.confidence,
                    source: 'merchant',
                    matchedPattern: merchantMatch.pattern,
                };
            }
        }
        // 3. Try learned rules (lower priority)
        const learnedRules = this.rules.filter((r) => r.isLearned);
        const learnedMatch = (0, ruleEngine_js_1.matchRules)(searchText, learnedRules);
        if (learnedMatch) {
            return learnedMatch;
        }
        // 4. No match found
        return {
            categoryId: null,
            confidence: 0,
            source: 'none',
        };
    }
}
exports.Categorizer = Categorizer;
//# sourceMappingURL=categorizer.js.map