/**
 * Maps iOS SF Symbol names to emoji equivalents.
 * When categories are created from the iOS app, the icon field contains
 * SF Symbol names (e.g., "banknote") instead of emoji characters (e.g., "💰").
 * This mapping ensures the web app displays proper emoji icons.
 */
const SF_SYMBOL_TO_EMOJI: Record<string, string> = {
  // Income
  banknote: '💰',
  briefcase: '💵',
  gift: '🎁',
  'dollarsign.circle': '💸',

  // Housing
  house: '🏠',
  'house.fill': '🏠',
  'building.2': '🏡',
  bolt: '⚡',
  'bolt.fill': '⚡',
  shield: '🛡️',
  'shield.fill': '🛡️',

  // Transport
  car: '🚗',
  'car.fill': '🚗',
  fuelpump: '⛽',
  'fuelpump.fill': '⛽',
  tram: '🚇',
  'tram.fill': '🚇',
  wrench: '🔧',
  'wrench.fill': '🔧',

  // Food & Drink
  'fork.knife': '🍽️',
  cart: '🛒',
  'cart.fill': '🛒',
  'fork.knife.circle': '🍴',
  'fork.knife.circle.fill': '🍴',
  'cup.and.saucer': '☕',
  'cup.and.saucer.fill': '☕',

  // Shopping
  bag: '🛍️',
  'bag.fill': '🛍️',
  tshirt: '👕',
  'tshirt.fill': '👕',
  desktopcomputer: '🖥️',
  shippingbox: '📦',
  'shippingbox.fill': '📦',

  // Entertainment
  film: '🎬',
  'film.fill': '🎬',
  'play.rectangle': '🎥',
  'play.rectangle.fill': '🎥',
  gamecontroller: '🎮',
  'gamecontroller.fill': '🎮',
  book: '📚',
  'book.fill': '📚',
  'books.vertical': '📚',
  'books.vertical.fill': '📚',

  // Health
  heart: '❤️',
  'heart.fill': '❤️',
  pills: '💊',
  'pills.fill': '💊',
  'cross.case': '🏥',
  'cross.case.fill': '🏥',
  dumbbell: '🏋️',
  'dumbbell.fill': '🏋️',
  'figure.run': '🏋️',

  // Personal
  person: '👤',
  'person.fill': '👤',
  scissors: '💇',
  graduationcap: '🎓',
  'graduationcap.fill': '🎓',

  // Other
  'list.bullet': '📋',
  tray: '📋',
  'tray.fill': '📋',
  folder: '📋',
  'folder.fill': '📋',
  questionmark: '❓',
  'questionmark.circle': '❓',
  'questionmark.circle.fill': '❓',
};

/**
 * Returns true if the string looks like an SF Symbol name (ASCII-only, no emoji).
 */
function isSfSymbolName(icon: string): boolean {
  return /^[a-z][a-z0-9.]*$/.test(icon);
}

/**
 * Converts an SF Symbol name to its emoji equivalent.
 * If the icon is already an emoji or not recognized, returns it as-is.
 */
export function resolveIcon(icon: string): string {
  if (!isSfSymbolName(icon)) return icon;
  return SF_SYMBOL_TO_EMOJI[icon] ?? '📋';
}
