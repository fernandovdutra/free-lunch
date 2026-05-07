import type { Icon } from '@phosphor-icons/react';
import {
  WalletIcon,
  BriefcaseIcon,
  CoinsIcon,
  HouseIcon,
  HouseLineIcon,
  LightningIcon,
  DeviceMobileIcon,
  CarIcon,
  TrainIcon,
  GasPumpIcon,
  ForkKnifeIcon,
  ShoppingCartIcon,
  CoffeeIcon,
  ShoppingBagIcon,
  TShirtIcon,
  PackageIcon,
  ArrowsClockwiseIcon,
  TelevisionIcon,
  LaptopIcon,
  HeartIcon,
  BarbellIcon,
  FilmStripIcon,
  ConfettiIcon,
  AirplaneTiltIcon,
  TagIcon,
} from '@phosphor-icons/react';
import { resolveIcon } from './iconUtils';
import { resolvePhosphorIcon } from './phosphorCatalog';

// Map seeded category IDs → Phosphor icon component.
// Falls back to emoji rendering for unknown IDs (user-created categories).
const CATEGORY_ICON_REGISTRY: Record<string, Icon> = {
  // Income
  income: WalletIcon,
  'income-salary': BriefcaseIcon,
  'income-other': CoinsIcon,
  // Housing
  housing: HouseIcon,
  'housing-rent': HouseLineIcon,
  'housing-utilities': LightningIcon,
  'housing-communications': DeviceMobileIcon,
  // Transport
  transport: CarIcon,
  'transport-public': TrainIcon,
  'transport-fuel': GasPumpIcon,
  // Food & Drink
  food: ForkKnifeIcon,
  'food-groceries': ShoppingCartIcon,
  'food-restaurants': ForkKnifeIcon,
  'food-coffee': CoffeeIcon,
  // Shopping
  shopping: ShoppingBagIcon,
  'shopping-clothing': TShirtIcon,
  'shopping-general': PackageIcon,
  // Subscriptions
  subscriptions: ArrowsClockwiseIcon,
  'subscriptions-streaming': TelevisionIcon,
  'subscriptions-software': LaptopIcon,
  // Health
  health: HeartIcon,
  'health-fitness': BarbellIcon,
  // Entertainment
  entertainment: FilmStripIcon,
  'entertainment-events': ConfettiIcon,
  'entertainment-travel': AirplaneTiltIcon,
};

interface CategoryIconProps {
  categoryId?: string | undefined;
  /** Legacy emoji or SF Symbol fallback when no registry entry exists. */
  fallback?: string | undefined;
  /** Pixel size for the SVG. Defaults to 18. */
  size?: number;
  className?: string;
}

/**
 * Renders a category icon. Resolution order:
 *   1. Seeded registry by categoryId (deliberate per-category mapping).
 *   2. `phosphor:Name` prefix on the fallback string (user-picked icon).
 *   3. Emoji / SF Symbol fallback (legacy iOS or pre-picker categories).
 */
export function CategoryIcon({
  categoryId,
  fallback,
  size = 18,
  className,
}: CategoryIconProps) {
  const IconComp = categoryId ? CATEGORY_ICON_REGISTRY[categoryId] : undefined;

  if (IconComp) {
    return <IconComp size={size} weight="regular" className={className} aria-hidden />;
  }

  const PhosphorComp = resolvePhosphorIcon(fallback);
  if (PhosphorComp) {
    return <PhosphorComp size={size} weight="regular" className={className} aria-hidden />;
  }

  if (fallback) {
    return (
      <span className={className} style={{ fontSize: size }} aria-hidden>
        {resolveIcon(fallback)}
      </span>
    );
  }

  return <TagIcon size={size} weight="regular" className={className} aria-hidden />;
}
