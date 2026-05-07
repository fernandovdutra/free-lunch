import type { Icon } from '@phosphor-icons/react';
import {
  // Money
  WalletIcon,
  CoinsIcon,
  BankIcon,
  CreditCardIcon,
  MoneyIcon,
  PiggyBankIcon,
  ReceiptIcon,
  HandCoinsIcon,
  ChartLineIcon,
  ChartPieIcon,
  CurrencyEurIcon,
  // Work / Income
  BriefcaseIcon,
  BuildingsIcon,
  GiftIcon,
  // Housing / Utilities
  HouseIcon,
  HouseLineIcon,
  KeyIcon,
  LightningIcon,
  FlameIcon,
  DropIcon,
  WrenchIcon,
  TrashIcon,
  BroomIcon,
  PlugIcon,
  WifiHighIcon,
  // Phone / Communications
  DeviceMobileIcon,
  PhoneIcon,
  EnvelopeIcon,
  // Transport
  CarIcon,
  CarProfileIcon,
  TaxiIcon,
  TrainIcon,
  TramIcon,
  AirplaneTiltIcon,
  BicycleIcon,
  MotorcycleIcon,
  ScooterIcon,
  GasPumpIcon,
  ParkIcon,
  MapPinIcon,
  CompassIcon,
  // Food & Drink
  ForkKnifeIcon,
  ShoppingCartIcon,
  CoffeeIcon,
  BeerSteinIcon,
  WineIcon,
  PizzaIcon,
  HamburgerIcon,
  IceCreamIcon,
  CakeIcon,
  CookieIcon,
  CarrotIcon,
  // Shopping
  ShoppingBagIcon,
  TShirtIcon,
  PackageIcon,
  HandbagIcon,
  TagIcon,
  // Subscriptions / Tech
  ArrowsClockwiseIcon,
  TelevisionIcon,
  LaptopIcon,
  DesktopIcon,
  HeadphonesIcon,
  MusicNoteIcon,
  PlayCircleIcon,
  CloudIcon,
  // Health
  HeartIcon,
  HeartbeatIcon,
  PillIcon,
  FirstAidKitIcon,
  StethoscopeIcon,
  ToothIcon,
  EyeIcon,
  BarbellIcon,
  PersonSimpleRunIcon,
  YinYangIcon,
  // Entertainment
  FilmStripIcon,
  ConfettiIcon,
  GameControllerIcon,
  PuzzlePieceIcon,
  GuitarIcon,
  PaintBrushIcon,
  PaletteIcon,
  CameraIcon,
  BookIcon,
  BookOpenIcon,
  NewspaperIcon,
  // Travel
  SuitcaseRollingIcon,
  TentIcon,
  IslandIcon,
  MountainsIcon,
  GlobeIcon,
  BedIcon,
  // Personal / Education
  GraduationCapIcon,
  StudentIcon,
  BackpackIcon,
  PencilIcon,
  ScissorsIcon,
  UserIcon,
  UsersIcon,
  BabyIcon,
  // Pets
  DogIcon,
  CatIcon,
  PawPrintIcon,
  // Hobbies / Misc
  FlowerIcon,
  TreeIcon,
  SoccerBallIcon,
  BasketballIcon,
  StarIcon,
  SparkleIcon,
  FireIcon,
  SunIcon,
  MoonIcon,
  UmbrellaIcon,
  ToolboxIcon,
  HammerIcon,
  GearIcon,
  // Generic
  FolderIcon,
  ListBulletsIcon,
  QuestionIcon,
} from '@phosphor-icons/react';

/**
 * Curated Phosphor icon catalog for user-created category icons.
 *
 * Keys are the bare Phosphor icon name (no "Icon" suffix), e.g. "Wallet".
 * `Category.icon` stores `phosphor:Wallet`, which `<CategoryIcon>` resolves
 * back to a component via this map.
 *
 * We import a curated subset (~100 icons) instead of the full ~1500-icon
 * catalog to keep the bundle small. Add new entries here as needed.
 */
export const PHOSPHOR_CATALOG: Record<string, Icon> = {
  // Money
  Wallet: WalletIcon,
  Coins: CoinsIcon,
  Bank: BankIcon,
  CreditCard: CreditCardIcon,
  Money: MoneyIcon,
  PiggyBank: PiggyBankIcon,
  Receipt: ReceiptIcon,
  HandCoins: HandCoinsIcon,
  ChartLine: ChartLineIcon,
  ChartPie: ChartPieIcon,
  CurrencyEur: CurrencyEurIcon,
  // Work / Income
  Briefcase: BriefcaseIcon,
  Buildings: BuildingsIcon,
  Gift: GiftIcon,
  // Housing / Utilities
  House: HouseIcon,
  HouseLine: HouseLineIcon,
  Key: KeyIcon,
  Lightning: LightningIcon,
  Flame: FlameIcon,
  Drop: DropIcon,
  Wrench: WrenchIcon,
  Trash: TrashIcon,
  Broom: BroomIcon,
  Plug: PlugIcon,
  WifiHigh: WifiHighIcon,
  // Phone / Comms
  DeviceMobile: DeviceMobileIcon,
  Phone: PhoneIcon,
  Envelope: EnvelopeIcon,
  // Transport
  Car: CarIcon,
  CarProfile: CarProfileIcon,
  Taxi: TaxiIcon,
  Train: TrainIcon,
  Tram: TramIcon,
  AirplaneTilt: AirplaneTiltIcon,
  Bicycle: BicycleIcon,
  Motorcycle: MotorcycleIcon,
  Scooter: ScooterIcon,
  GasPump: GasPumpIcon,
  Park: ParkIcon,
  MapPin: MapPinIcon,
  Compass: CompassIcon,
  // Food & Drink
  ForkKnife: ForkKnifeIcon,
  ShoppingCart: ShoppingCartIcon,
  Coffee: CoffeeIcon,
  BeerStein: BeerSteinIcon,
  Wine: WineIcon,
  Pizza: PizzaIcon,
  Hamburger: HamburgerIcon,
  IceCream: IceCreamIcon,
  Cake: CakeIcon,
  Cookie: CookieIcon,
  Carrot: CarrotIcon,
  // Shopping
  ShoppingBag: ShoppingBagIcon,
  TShirt: TShirtIcon,
  Package: PackageIcon,
  Handbag: HandbagIcon,
  Tag: TagIcon,
  // Subscriptions / Tech
  ArrowsClockwise: ArrowsClockwiseIcon,
  Television: TelevisionIcon,
  Laptop: LaptopIcon,
  Desktop: DesktopIcon,
  Headphones: HeadphonesIcon,
  MusicNote: MusicNoteIcon,
  PlayCircle: PlayCircleIcon,
  Cloud: CloudIcon,
  // Health
  Heart: HeartIcon,
  Heartbeat: HeartbeatIcon,
  Pill: PillIcon,
  FirstAidKit: FirstAidKitIcon,
  Stethoscope: StethoscopeIcon,
  Tooth: ToothIcon,
  Eye: EyeIcon,
  Barbell: BarbellIcon,
  PersonSimpleRun: PersonSimpleRunIcon,
  YinYang: YinYangIcon,
  // Entertainment
  FilmStrip: FilmStripIcon,
  Confetti: ConfettiIcon,
  GameController: GameControllerIcon,
  PuzzlePiece: PuzzlePieceIcon,
  Guitar: GuitarIcon,
  PaintBrush: PaintBrushIcon,
  Palette: PaletteIcon,
  Camera: CameraIcon,
  Book: BookIcon,
  BookOpen: BookOpenIcon,
  Newspaper: NewspaperIcon,
  // Travel
  SuitcaseRolling: SuitcaseRollingIcon,
  Tent: TentIcon,
  Island: IslandIcon,
  Mountains: MountainsIcon,
  Globe: GlobeIcon,
  Bed: BedIcon,
  // Personal / Education
  GraduationCap: GraduationCapIcon,
  Student: StudentIcon,
  Backpack: BackpackIcon,
  Pencil: PencilIcon,
  Scissors: ScissorsIcon,
  User: UserIcon,
  Users: UsersIcon,
  Baby: BabyIcon,
  // Pets
  Dog: DogIcon,
  Cat: CatIcon,
  PawPrint: PawPrintIcon,
  // Hobbies / Misc
  Flower: FlowerIcon,
  Tree: TreeIcon,
  SoccerBall: SoccerBallIcon,
  Basketball: BasketballIcon,
  Star: StarIcon,
  Sparkle: SparkleIcon,
  Fire: FireIcon,
  Sun: SunIcon,
  Moon: MoonIcon,
  Umbrella: UmbrellaIcon,
  Toolbox: ToolboxIcon,
  Hammer: HammerIcon,
  Gear: GearIcon,
  // Generic
  Folder: FolderIcon,
  ListBullets: ListBulletsIcon,
  Question: QuestionIcon,
};

/**
 * Ordered list of catalog keys, used by the picker to render a stable grid.
 * Order roughly matches the import groupings above so related icons cluster.
 */
export const PHOSPHOR_CATALOG_ORDER: readonly string[] = Object.keys(PHOSPHOR_CATALOG);

/**
 * Returns the Phosphor component for a stored `phosphor:Name` icon string,
 * or undefined if the prefix is missing or the name isn't in the catalog.
 */
export function resolvePhosphorIcon(icon: string | undefined): Icon | undefined {
  if (!icon || !icon.startsWith('phosphor:')) return undefined;
  return PHOSPHOR_CATALOG[icon.slice('phosphor:'.length)];
}
