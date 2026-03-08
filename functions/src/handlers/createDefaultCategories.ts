import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

interface DefaultCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  parentId: string | null;
  order: number;
  isSystem: boolean;
}

// Default categories — broader structure with NL-focused subcategories
const DEFAULT_CATEGORIES: DefaultCategory[] = [
  // Income
  { id: 'income', name: 'Income', icon: '💰', color: '#2D5A4A', parentId: null, order: 0, isSystem: true },
  { id: 'income-salary', name: 'Salary', icon: '💵', color: '#2D5A4A', parentId: 'income', order: 0, isSystem: true },
  { id: 'income-benefits', name: 'Benefits/Toeslagen', icon: '🏛️', color: '#2D5A4A', parentId: 'income', order: 1, isSystem: true },
  { id: 'income-gifts', name: 'Gifts Received', icon: '🎁', color: '#2D5A4A', parentId: 'income', order: 2, isSystem: true },
  { id: 'income-other', name: 'Other Income', icon: '💸', color: '#2D5A4A', parentId: 'income', order: 3, isSystem: true },

  // Housing
  { id: 'housing', name: 'Housing', icon: '🏠', color: '#5B6E8A', parentId: null, order: 1, isSystem: true },
  { id: 'housing-rent', name: 'Rent/Mortgage', icon: '🏡', color: '#5B6E8A', parentId: 'housing', order: 0, isSystem: true },
  { id: 'housing-utilities', name: 'Utilities', icon: '⚡', color: '#5B6E8A', parentId: 'housing', order: 1, isSystem: true },
  { id: 'housing-insurance', name: 'Home Insurance', icon: '🛡️', color: '#5B6E8A', parentId: 'housing', order: 2, isSystem: true },
  { id: 'housing-communications', name: 'Communications', icon: '📱', color: '#5B6E8A', parentId: 'housing', order: 3, isSystem: true },
  { id: 'housing-maintenance', name: 'Maintenance', icon: '🔧', color: '#5B6E8A', parentId: 'housing', order: 4, isSystem: true },
  { id: 'housing-taxes', name: 'City Taxes', icon: '🏛️', color: '#5B6E8A', parentId: 'housing', order: 5, isSystem: true },

  // Transport
  { id: 'transport', name: 'Transport', icon: '🚗', color: '#4A6FA5', parentId: null, order: 2, isSystem: true },
  { id: 'transport-public', name: 'Public Transit', icon: '🚇', color: '#4A6FA5', parentId: 'transport', order: 0, isSystem: true },
  { id: 'transport-fuel', name: 'Fuel/Charging', icon: '⛽', color: '#4A6FA5', parentId: 'transport', order: 1, isSystem: true },
  { id: 'transport-car', name: 'Car Expenses', icon: '🔧', color: '#4A6FA5', parentId: 'transport', order: 2, isSystem: true },
  { id: 'transport-insurance', name: 'Car Insurance', icon: '🛡️', color: '#4A6FA5', parentId: 'transport', order: 3, isSystem: true },
  { id: 'transport-lease', name: 'Car Lease/Finance', icon: '📝', color: '#4A6FA5', parentId: 'transport', order: 4, isSystem: true },
  { id: 'transport-parking', name: 'Parking', icon: '🅿️', color: '#4A6FA5', parentId: 'transport', order: 5, isSystem: true },
  { id: 'transport-taxi', name: 'Taxi/Rideshare', icon: '🚕', color: '#4A6FA5', parentId: 'transport', order: 6, isSystem: true },

  // Food & Drink
  { id: 'food', name: 'Food & Drink', icon: '🍽️', color: '#C9A227', parentId: null, order: 3, isSystem: true },
  { id: 'food-groceries', name: 'Groceries', icon: '🛒', color: '#C9A227', parentId: 'food', order: 0, isSystem: true },
  { id: 'food-restaurants', name: 'Restaurants', icon: '🍴', color: '#C9A227', parentId: 'food', order: 1, isSystem: true },
  { id: 'food-takeaway', name: 'Takeaway/Delivery', icon: '🥡', color: '#C9A227', parentId: 'food', order: 2, isSystem: true },
  { id: 'food-coffee', name: 'Coffee & Bars', icon: '☕', color: '#C9A227', parentId: 'food', order: 3, isSystem: true },

  // Shopping
  { id: 'shopping', name: 'Shopping', icon: '🛍️', color: '#A67B8A', parentId: null, order: 4, isSystem: true },
  { id: 'shopping-clothing', name: 'Clothing', icon: '👕', color: '#A67B8A', parentId: 'shopping', order: 0, isSystem: true },
  { id: 'shopping-electronics', name: 'Electronics', icon: '🖥️', color: '#A67B8A', parentId: 'shopping', order: 1, isSystem: true },
  { id: 'shopping-home', name: 'Home & Garden', icon: '🏡', color: '#A67B8A', parentId: 'shopping', order: 2, isSystem: true },
  { id: 'shopping-general', name: 'Online/General', icon: '📦', color: '#A67B8A', parentId: 'shopping', order: 3, isSystem: true },

  // Subscriptions
  { id: 'subscriptions', name: 'Subscriptions', icon: '🔄', color: '#6366F1', parentId: null, order: 5, isSystem: true },
  { id: 'subscriptions-streaming', name: 'Streaming', icon: '📺', color: '#6366F1', parentId: 'subscriptions', order: 0, isSystem: true },
  { id: 'subscriptions-software', name: 'Software/Apps', icon: '💻', color: '#6366F1', parentId: 'subscriptions', order: 1, isSystem: true },
  { id: 'subscriptions-news', name: 'News/Media', icon: '📰', color: '#6366F1', parentId: 'subscriptions', order: 2, isSystem: true },

  // Health
  { id: 'health', name: 'Health', icon: '❤️', color: '#4A9A8A', parentId: null, order: 6, isSystem: true },
  { id: 'health-insurance', name: 'Health Insurance', icon: '🛡️', color: '#4A9A8A', parentId: 'health', order: 0, isSystem: true },
  { id: 'health-medical', name: 'Medical/Doctor', icon: '🏥', color: '#4A9A8A', parentId: 'health', order: 1, isSystem: true },
  { id: 'health-pharmacy', name: 'Pharmacy', icon: '💊', color: '#4A9A8A', parentId: 'health', order: 2, isSystem: true },
  { id: 'health-fitness', name: 'Fitness', icon: '🏋️', color: '#4A9A8A', parentId: 'health', order: 3, isSystem: true },

  // Outings & Entertainment
  { id: 'entertainment', name: 'Outings & Entertainment', icon: '🎬', color: '#7B6B8A', parentId: null, order: 7, isSystem: true },
  { id: 'entertainment-events', name: 'Events/Going Out', icon: '🎪', color: '#7B6B8A', parentId: 'entertainment', order: 0, isSystem: true },
  { id: 'entertainment-hobbies', name: 'Hobbies', icon: '🎨', color: '#7B6B8A', parentId: 'entertainment', order: 1, isSystem: true },
  { id: 'entertainment-travel', name: 'Travel/Vacation', icon: '✈️', color: '#7B6B8A', parentId: 'entertainment', order: 2, isSystem: true },

  // Financial
  { id: 'financial', name: 'Financial', icon: '🏦', color: '#059669', parentId: null, order: 8, isSystem: true },
  { id: 'financial-fees', name: 'Bank Fees', icon: '💳', color: '#059669', parentId: 'financial', order: 0, isSystem: true },
  { id: 'financial-taxes', name: 'Taxes', icon: '🏛️', color: '#059669', parentId: 'financial', order: 1, isSystem: true },
  { id: 'financial-savings', name: 'Savings', icon: '🐷', color: '#059669', parentId: 'financial', order: 2, isSystem: true },
  { id: 'financial-investments', name: 'Investments', icon: '📈', color: '#059669', parentId: 'financial', order: 3, isSystem: true },

  // Personal
  { id: 'personal', name: 'Personal', icon: '👤', color: '#B87D4B', parentId: null, order: 9, isSystem: true },
  { id: 'personal-selfcare', name: 'Self Care', icon: '💇', color: '#B87D4B', parentId: 'personal', order: 0, isSystem: true },
  { id: 'personal-education', name: 'Education', icon: '🎓', color: '#B87D4B', parentId: 'personal', order: 1, isSystem: true },
  { id: 'personal-gifts', name: 'Gifts Given', icon: '🎁', color: '#B87D4B', parentId: 'personal', order: 2, isSystem: true },
  { id: 'personal-donations', name: 'Donations', icon: '🤝', color: '#B87D4B', parentId: 'personal', order: 3, isSystem: true },

  // Pets
  { id: 'pets', name: 'Pets', icon: '🐾', color: '#D97706', parentId: null, order: 10, isSystem: true },

  // Transfer
  { id: 'transfer', name: 'Transfer', icon: '🔄', color: '#6B7280', parentId: null, order: 11, isSystem: true },
  { id: 'transfer-cc', name: 'Credit Card Payment', icon: '💳', color: '#6B7280', parentId: 'transfer', order: 0, isSystem: true },
  { id: 'transfer-internal', name: 'Internal Transfer', icon: '🔃', color: '#6B7280', parentId: 'transfer', order: 1, isSystem: true },

  // Other
  { id: 'other', name: 'Other', icon: '📋', color: '#9CA3A0', parentId: null, order: 12, isSystem: true },
  { id: 'uncategorized', name: 'Uncategorized', icon: '❓', color: '#9CA3A0', parentId: 'other', order: 0, isSystem: true },
];

export const createDefaultCategories = onCall(
  {
    region: 'europe-west1',
    cors: true,
  },
  async (request): Promise<{ created: boolean; count: number }> => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be logged in');
    }

    const userId = request.auth.uid;
    const db = getFirestore();
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
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    await batch.commit();

    return { created: true, count: DEFAULT_CATEGORIES.length };
  }
);
