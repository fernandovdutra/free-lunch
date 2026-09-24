/** Explicit compatibility mapping for every slug in the built-in merchant table.
 * IDs are stable; a household may remove or archive a default category, in
 * which case the evaluator abstains rather than selecting a similarly named one.
 */
export const MERCHANT_CATEGORY_IDS: Record<string, string | null> = {
  'entertainment.events': 'entertainment-events',
  'entertainment.hobbies': 'entertainment-hobbies',
  'entertainment.travel': 'entertainment-travel',
  'financial.fees': 'financial-fees',
  'financial.taxes': 'financial-taxes',
  'food.coffee': 'food-coffee',
  'food.restaurants': 'food-restaurants',
  'food.takeaway': 'food-takeaway',
  groceries: 'food-groceries',
  health: null, // Broad business types need a human decision.
  'health.fitness': 'health-fitness',
  'health.insurance': 'health-insurance',
  'health.pharmacy': 'health-pharmacy',
  'housing.communications': 'housing-communications',
  'housing.insurance': 'housing-insurance',
  'housing.taxes': 'housing-taxes',
  'housing.utilities': 'housing-utilities',
  income: null,
  'personal.education': 'personal-education',
  pets: 'pets',
  'shopping.clothing': 'shopping-clothing',
  'shopping.electronics': 'shopping-electronics',
  'shopping.general': 'shopping-general',
  'shopping.home': 'shopping-home',
  'subscriptions.streaming': 'subscriptions-streaming',
  'transport.car': 'transport-car',
  'transport.fuel': 'transport-fuel',
  'transport.parking': 'transport-parking',
  'transport.public': 'transport-public',
  'transport.taxi': 'transport-taxi',
};

export interface AssignableCategory {
  id: string;
  parentId: string | null;
  archived?: boolean;
  status?: string;
}

export function isAssignableCategory(id: string | null, categories: AssignableCategory[]): boolean {
  if (!id || id === 'uncategorized' || id === 'none') return false;
  const category = categories.find((item) => item.id === id);
  return !!category && !category.archived && category.status !== 'retiring' &&
    category.status !== 'archived' && !categories.some((child) =>
      child.parentId === id && !child.archived && child.status !== 'archived'
    );
}
