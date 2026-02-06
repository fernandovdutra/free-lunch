"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDefaultCategories = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
// Canonical 41 categories (web source of truth with emoji icons)
const DEFAULT_CATEGORIES = [
    // Income
    { id: 'income', name: 'Income', icon: '💰', color: '#2D5A4A', parentId: null, order: 0, isSystem: true },
    { id: 'income-salary', name: 'Salary', icon: '💵', color: '#2D5A4A', parentId: 'income', order: 0, isSystem: true },
    { id: 'income-gifts', name: 'Gifts', icon: '🎁', color: '#2D5A4A', parentId: 'income', order: 1, isSystem: true },
    { id: 'income-other', name: 'Other Income', icon: '💸', color: '#2D5A4A', parentId: 'income', order: 2, isSystem: true },
    // Housing
    { id: 'housing', name: 'Housing', icon: '🏠', color: '#5B6E8A', parentId: null, order: 1, isSystem: true },
    { id: 'housing-rent', name: 'Rent/Mortgage', icon: '🏡', color: '#5B6E8A', parentId: 'housing', order: 0, isSystem: true },
    { id: 'housing-utilities', name: 'Utilities', icon: '⚡', color: '#5B6E8A', parentId: 'housing', order: 1, isSystem: true },
    { id: 'housing-insurance', name: 'Insurance', icon: '🛡️', color: '#5B6E8A', parentId: 'housing', order: 2, isSystem: true },
    // Transport
    { id: 'transport', name: 'Transport', icon: '🚗', color: '#4A6FA5', parentId: null, order: 2, isSystem: true },
    { id: 'transport-fuel', name: 'Fuel', icon: '⛽', color: '#4A6FA5', parentId: 'transport', order: 0, isSystem: true },
    { id: 'transport-public', name: 'Public Transit', icon: '🚇', color: '#4A6FA5', parentId: 'transport', order: 1, isSystem: true },
    { id: 'transport-car', name: 'Car Expenses', icon: '🔧', color: '#4A6FA5', parentId: 'transport', order: 2, isSystem: true },
    // Food & Drink
    { id: 'food', name: 'Food & Drink', icon: '🍽️', color: '#C9A227', parentId: null, order: 3, isSystem: true },
    { id: 'food-groceries', name: 'Groceries', icon: '🛒', color: '#C9A227', parentId: 'food', order: 0, isSystem: true },
    { id: 'food-restaurants', name: 'Restaurants', icon: '🍴', color: '#C9A227', parentId: 'food', order: 1, isSystem: true },
    { id: 'food-coffee', name: 'Coffee & Snacks', icon: '☕', color: '#C9A227', parentId: 'food', order: 2, isSystem: true },
    // Shopping
    { id: 'shopping', name: 'Shopping', icon: '🛍️', color: '#A67B8A', parentId: null, order: 4, isSystem: true },
    { id: 'shopping-clothing', name: 'Clothing', icon: '👕', color: '#A67B8A', parentId: 'shopping', order: 0, isSystem: true },
    { id: 'shopping-electronics', name: 'Electronics', icon: '🖥️', color: '#A67B8A', parentId: 'shopping', order: 1, isSystem: true },
    { id: 'shopping-general', name: 'General', icon: '📦', color: '#A67B8A', parentId: 'shopping', order: 2, isSystem: true },
    // Entertainment
    { id: 'entertainment', name: 'Entertainment', icon: '🎬', color: '#7B6B8A', parentId: null, order: 5, isSystem: true },
    { id: 'entertainment-movies', name: 'Movies & Shows', icon: '🎥', color: '#7B6B8A', parentId: 'entertainment', order: 0, isSystem: true },
    { id: 'entertainment-games', name: 'Games', icon: '🎮', color: '#7B6B8A', parentId: 'entertainment', order: 1, isSystem: true },
    { id: 'entertainment-books', name: 'Books', icon: '📚', color: '#7B6B8A', parentId: 'entertainment', order: 2, isSystem: true },
    // Health
    { id: 'health', name: 'Health', icon: '❤️', color: '#4A9A8A', parentId: null, order: 6, isSystem: true },
    { id: 'health-pharmacy', name: 'Pharmacy', icon: '💊', color: '#4A9A8A', parentId: 'health', order: 0, isSystem: true },
    { id: 'health-medical', name: 'Medical', icon: '🏥', color: '#4A9A8A', parentId: 'health', order: 1, isSystem: true },
    { id: 'health-fitness', name: 'Fitness', icon: '🏋️', color: '#4A9A8A', parentId: 'health', order: 2, isSystem: true },
    // Personal
    { id: 'personal', name: 'Personal', icon: '👤', color: '#B87D4B', parentId: null, order: 7, isSystem: true },
    { id: 'personal-selfcare', name: 'Self Care', icon: '💇', color: '#B87D4B', parentId: 'personal', order: 0, isSystem: true },
    { id: 'personal-education', name: 'Education', icon: '🎓', color: '#B87D4B', parentId: 'personal', order: 1, isSystem: true },
    // Other
    { id: 'other', name: 'Other', icon: '📋', color: '#9CA3A0', parentId: null, order: 8, isSystem: true },
    { id: 'uncategorized', name: 'Uncategorized', icon: '❓', color: '#9CA3A0', parentId: 'other', order: 0, isSystem: true },
];
exports.createDefaultCategories = (0, https_1.onCall)({
    region: 'europe-west1',
    cors: true,
}, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Must be logged in');
    }
    const userId = request.auth.uid;
    const db = (0, firestore_1.getFirestore)();
    const categoriesRef = db.collection('users').doc(userId).collection('categories');
    // Check if categories already exist (idempotent)
    const existing = await categoriesRef.limit(1).get();
    if (!existing.empty) {
        return { created: false, count: 0 };
    }
    // Create all categories in a single batch
    const batch = db.batch();
    for (const category of DEFAULT_CATEGORIES) {
        const docRef = categoriesRef.doc(category.id);
        batch.set(docRef, {
            name: category.name,
            icon: category.icon,
            color: category.color,
            parentId: category.parentId,
            order: category.order,
            isSystem: category.isSystem,
            createdAt: firestore_1.FieldValue.serverTimestamp(),
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        });
    }
    await batch.commit();
    return { created: true, count: DEFAULT_CATEGORIES.length };
});
//# sourceMappingURL=createDefaultCategories.js.map