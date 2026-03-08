import type { MerchantMapping } from './types.js';

/**
 * Comprehensive Dutch merchant patterns mapped to category slugs.
 * These slugs are resolved to actual category IDs at runtime based on user's categories.
 *
 * Categories follow the hierarchy: parent.child (e.g., 'transport.public')
 * Confidence scores: 0.95 = very confident, 0.9 = confident, 0.85 = likely
 */
export const DUTCH_MERCHANTS: MerchantMapping[] = [
  // =============================================
  // GROCERIES & SUPERMARKETS
  // =============================================
  // Major chains
  { pattern: 'ALBERT HEIJN', categorySlug: 'groceries', confidence: 0.95 },
  { pattern: 'AH TO GO', categorySlug: 'groceries', confidence: 0.95 },
  { pattern: 'AH XL', categorySlug: 'groceries', confidence: 0.95 },
  { pattern: 'JUMBO', categorySlug: 'groceries', confidence: 0.95 },
  { pattern: 'LIDL', categorySlug: 'groceries', confidence: 0.95 },
  { pattern: 'ALDI', categorySlug: 'groceries', confidence: 0.95 },
  { pattern: 'PLUS SUPERMARKT', categorySlug: 'groceries', confidence: 0.95 },
  { pattern: 'PLUS ', categorySlug: 'groceries', confidence: 0.85 },
  { pattern: 'DIRK', categorySlug: 'groceries', confidence: 0.95 },
  { pattern: 'COOP ', categorySlug: 'groceries', confidence: 0.9 },
  { pattern: 'HOOGVLIET', categorySlug: 'groceries', confidence: 0.95 },
  { pattern: 'SPAR ', categorySlug: 'groceries', confidence: 0.9 },
  { pattern: 'DEKAMARKT', categorySlug: 'groceries', confidence: 0.95 },
  { pattern: 'VOMAR', categorySlug: 'groceries', confidence: 0.95 },
  { pattern: 'NETTORAMA', categorySlug: 'groceries', confidence: 0.95 },
  { pattern: 'BONI', categorySlug: 'groceries', confidence: 0.9 },
  { pattern: 'POIESZ', categorySlug: 'groceries', confidence: 0.95 },
  { pattern: 'JAN LINDERS', categorySlug: 'groceries', confidence: 0.95 },
  { pattern: 'PICNIC', categorySlug: 'groceries', confidence: 0.95 },
  { pattern: 'CRISP', categorySlug: 'groceries', confidence: 0.9 },
  // Specialty food
  { pattern: 'EKOPLAZA', categorySlug: 'groceries', confidence: 0.95 },
  { pattern: 'MARQT', categorySlug: 'groceries', confidence: 0.95 },
  { pattern: 'STACH', categorySlug: 'groceries', confidence: 0.9 },
  // Wholesale
  { pattern: 'MAKRO', categorySlug: 'groceries', confidence: 0.9 },
  { pattern: 'SLIGRO', categorySlug: 'groceries', confidence: 0.9 },

  // =============================================
  // TRANSPORT - PUBLIC
  // =============================================
  { pattern: 'NS REIZIGERS', categorySlug: 'transport.public', confidence: 0.95 },
  { pattern: 'NS.NL', categorySlug: 'transport.public', confidence: 0.95 },
  { pattern: 'NS GROEP', categorySlug: 'transport.public', confidence: 0.95 },
  { pattern: 'NEDERLANDSE SPOORWEGEN', categorySlug: 'transport.public', confidence: 0.95 },
  { pattern: 'GVB', categorySlug: 'transport.public', confidence: 0.95 },
  { pattern: 'RET ', categorySlug: 'transport.public', confidence: 0.95 },
  { pattern: 'HTM', categorySlug: 'transport.public', confidence: 0.95 },
  { pattern: 'CONNEXXION', categorySlug: 'transport.public', confidence: 0.95 },
  { pattern: 'ARRIVA', categorySlug: 'transport.public', confidence: 0.95 },
  { pattern: 'QBUZZ', categorySlug: 'transport.public', confidence: 0.95 },
  { pattern: 'OV-CHIPKAART', categorySlug: 'transport.public', confidence: 0.95 },
  { pattern: 'TRANSLINK', categorySlug: 'transport.public', confidence: 0.9 },
  { pattern: 'BRENG', categorySlug: 'transport.public', confidence: 0.95 },
  { pattern: 'KEOLIS', categorySlug: 'transport.public', confidence: 0.95 },
  { pattern: 'EBS ', categorySlug: 'transport.public', confidence: 0.9 },
  { pattern: 'SYNTUS', categorySlug: 'transport.public', confidence: 0.95 },
  { pattern: 'FLIXBUS', categorySlug: 'transport.public', confidence: 0.95 },

  // =============================================
  // TRANSPORT - FUEL & CAR
  // =============================================
  { pattern: 'SHELL', categorySlug: 'transport.fuel', confidence: 0.95 },
  { pattern: 'BP ', categorySlug: 'transport.fuel', confidence: 0.95 },
  { pattern: 'ESSO', categorySlug: 'transport.fuel', confidence: 0.95 },
  { pattern: 'TINQ', categorySlug: 'transport.fuel', confidence: 0.95 },
  { pattern: 'TANGO', categorySlug: 'transport.fuel', confidence: 0.95 },
  { pattern: 'TOTAL ', categorySlug: 'transport.fuel', confidence: 0.9 },
  { pattern: 'TOTALENERGIES', categorySlug: 'transport.fuel', confidence: 0.95 },
  { pattern: 'TEXACO', categorySlug: 'transport.fuel', confidence: 0.95 },
  { pattern: 'GULF ', categorySlug: 'transport.fuel', confidence: 0.9 },
  { pattern: 'FIREZONE', categorySlug: 'transport.fuel', confidence: 0.95 },
  { pattern: 'TAMOIL', categorySlug: 'transport.fuel', confidence: 0.95 },
  { pattern: 'ARGOS ', categorySlug: 'transport.fuel', confidence: 0.85 },
  // EV Charging
  { pattern: 'FASTNED', categorySlug: 'transport.fuel', confidence: 0.95 },
  { pattern: 'ALLEGO', categorySlug: 'transport.fuel', confidence: 0.95 },
  { pattern: 'VATTENFALL CHARGING', categorySlug: 'transport.fuel', confidence: 0.95 },
  { pattern: 'SHELL RECHARGE', categorySlug: 'transport.fuel', confidence: 0.95 },
  // Parking
  { pattern: 'Q-PARK', categorySlug: 'transport.parking', confidence: 0.95 },
  { pattern: 'INTERPARKING', categorySlug: 'transport.parking', confidence: 0.95 },
  { pattern: 'PARKBEE', categorySlug: 'transport.parking', confidence: 0.95 },
  { pattern: 'YELLOWBRICK', categorySlug: 'transport.parking', confidence: 0.95 },
  { pattern: 'PARKMOBILE', categorySlug: 'transport.parking', confidence: 0.95 },
  // Car services
  { pattern: 'ANWB', categorySlug: 'transport.car', confidence: 0.9 },
  { pattern: 'CARGLASS', categorySlug: 'transport.car', confidence: 0.95 },
  { pattern: 'KWIK FIT', categorySlug: 'transport.car', confidence: 0.95 },
  { pattern: 'HALFORDS', categorySlug: 'transport.car', confidence: 0.9 },
  { pattern: 'EUROMASTER', categorySlug: 'transport.car', confidence: 0.95 },
  { pattern: 'PROFILE TYRECENTRE', categorySlug: 'transport.car', confidence: 0.95 },
  // Rideshare & Taxi
  { pattern: 'UBER ', categorySlug: 'transport.taxi', confidence: 0.95 },
  { pattern: 'UBER TRIP', categorySlug: 'transport.taxi', confidence: 0.95 },
  { pattern: 'BOLT.EU', categorySlug: 'transport.taxi', confidence: 0.95 },
  // Bike
  { pattern: 'SWAPFIETS', categorySlug: 'transport.car', confidence: 0.95 },
  { pattern: 'OV-FIETS', categorySlug: 'transport.public', confidence: 0.95 },

  // =============================================
  // SHOPPING - GENERAL & DEPARTMENT STORES
  // =============================================
  { pattern: 'BOL.COM', categorySlug: 'shopping.general', confidence: 0.9 },
  { pattern: 'BOL COM', categorySlug: 'shopping.general', confidence: 0.9 },
  { pattern: 'AMAZON', categorySlug: 'shopping.general', confidence: 0.9 },
  { pattern: 'HEMA', categorySlug: 'shopping.general', confidence: 0.9 },
  { pattern: 'ACTION', categorySlug: 'shopping.general', confidence: 0.9 },
  { pattern: 'XENOS', categorySlug: 'shopping.general', confidence: 0.9 },
  { pattern: 'BLOKKER', categorySlug: 'shopping.general', confidence: 0.9 },
  { pattern: 'BIJENKORF', categorySlug: 'shopping.general', confidence: 0.9 },
  { pattern: 'WEHKAMP', categorySlug: 'shopping.general', confidence: 0.9 },
  { pattern: 'OTTO', categorySlug: 'shopping.general', confidence: 0.85 },
  { pattern: 'ALIEXPRESS', categorySlug: 'shopping.general', confidence: 0.9 },
  { pattern: 'WISH.COM', categorySlug: 'shopping.general', confidence: 0.9 },
  { pattern: 'TEMU', categorySlug: 'shopping.general', confidence: 0.9 },
  { pattern: 'SHEIN', categorySlug: 'shopping.general', confidence: 0.9 },
  { pattern: 'FLYING TIGER', categorySlug: 'shopping.general', confidence: 0.9 },
  { pattern: 'SOSTRENE GRENE', categorySlug: 'shopping.general', confidence: 0.9 },

  // =============================================
  // SHOPPING - ELECTRONICS
  // =============================================
  { pattern: 'COOLBLUE', categorySlug: 'shopping.electronics', confidence: 0.95 },
  { pattern: 'MEDIAMARKT', categorySlug: 'shopping.electronics', confidence: 0.95 },
  { pattern: 'MEDIA MARKT', categorySlug: 'shopping.electronics', confidence: 0.95 },
  { pattern: 'BCC ', categorySlug: 'shopping.electronics', confidence: 0.95 },
  { pattern: 'EXPERT ', categorySlug: 'shopping.electronics', confidence: 0.9 },
  { pattern: 'ELECTRO WORLD', categorySlug: 'shopping.electronics', confidence: 0.95 },
  { pattern: 'APPLE STORE', categorySlug: 'shopping.electronics', confidence: 0.95 },
  { pattern: 'APPLE.COM', categorySlug: 'shopping.electronics', confidence: 0.95 },
  { pattern: 'SAMSUNG', categorySlug: 'shopping.electronics', confidence: 0.9 },
  { pattern: 'AMAC', categorySlug: 'shopping.electronics', confidence: 0.95 },
  { pattern: 'BELSIMPEL', categorySlug: 'shopping.electronics', confidence: 0.95 },
  { pattern: 'MOBIEL.NL', categorySlug: 'shopping.electronics', confidence: 0.95 },

  // =============================================
  // SHOPPING - HOME & FURNITURE
  // =============================================
  { pattern: 'IKEA', categorySlug: 'shopping.home', confidence: 0.95 },
  { pattern: 'LEEN BAKKER', categorySlug: 'shopping.home', confidence: 0.95 },
  { pattern: 'JYSK', categorySlug: 'shopping.home', confidence: 0.95 },
  { pattern: 'GOOSSENS', categorySlug: 'shopping.home', confidence: 0.95 },
  { pattern: 'SWISS SENSE', categorySlug: 'shopping.home', confidence: 0.95 },
  { pattern: 'BETER BED', categorySlug: 'shopping.home', confidence: 0.95 },
  { pattern: 'KWANTUM', categorySlug: 'shopping.home', confidence: 0.95 },
  { pattern: 'TRENDHOPPER', categorySlug: 'shopping.home', confidence: 0.95 },
  { pattern: 'WOONEXPRESS', categorySlug: 'shopping.home', confidence: 0.95 },
  { pattern: 'AUPING', categorySlug: 'shopping.home', confidence: 0.95 },
  { pattern: 'LOODS 5', categorySlug: 'shopping.home', confidence: 0.95 },
  { pattern: 'WESTWING', categorySlug: 'shopping.home', confidence: 0.9 },
  { pattern: 'HOME24', categorySlug: 'shopping.home', confidence: 0.9 },
  { pattern: 'FONQ', categorySlug: 'shopping.home', confidence: 0.9 },

  // =============================================
  // SHOPPING - DIY & GARDEN
  // =============================================
  { pattern: 'GAMMA', categorySlug: 'shopping.home', confidence: 0.95 },
  { pattern: 'KARWEI', categorySlug: 'shopping.home', confidence: 0.95 },
  { pattern: 'PRAXIS', categorySlug: 'shopping.home', confidence: 0.95 },
  { pattern: 'HORNBACH', categorySlug: 'shopping.home', confidence: 0.95 },
  { pattern: 'HUBO', categorySlug: 'shopping.home', confidence: 0.95 },
  { pattern: 'INTRATUIN', categorySlug: 'shopping.home', confidence: 0.95 },
  { pattern: 'TUINCENTRUM', categorySlug: 'shopping.home', confidence: 0.9 },
  { pattern: 'GROENRIJK', categorySlug: 'shopping.home', confidence: 0.95 },

  // =============================================
  // SHOPPING - FASHION & CLOTHING
  // =============================================
  { pattern: 'ZARA', categorySlug: 'shopping.clothing', confidence: 0.95 },
  { pattern: 'H&M', categorySlug: 'shopping.clothing', confidence: 0.95 },
  { pattern: 'HENNES', categorySlug: 'shopping.clothing', confidence: 0.95 },
  { pattern: 'PRIMARK', categorySlug: 'shopping.clothing', confidence: 0.95 },
  { pattern: 'UNIQLO', categorySlug: 'shopping.clothing', confidence: 0.95 },
  { pattern: 'C&A', categorySlug: 'shopping.clothing', confidence: 0.95 },
  { pattern: 'ZEEMAN', categorySlug: 'shopping.clothing', confidence: 0.95 },
  { pattern: 'WE FASHION', categorySlug: 'shopping.clothing', confidence: 0.95 },
  { pattern: 'AMERICA TODAY', categorySlug: 'shopping.clothing', confidence: 0.95 },
  { pattern: 'WIBRA', categorySlug: 'shopping.clothing', confidence: 0.9 },
  { pattern: 'MANGO', categorySlug: 'shopping.clothing', confidence: 0.95 },
  { pattern: 'BERSHKA', categorySlug: 'shopping.clothing', confidence: 0.95 },
  { pattern: 'PULL&BEAR', categorySlug: 'shopping.clothing', confidence: 0.95 },
  { pattern: 'MASSIMO DUTTI', categorySlug: 'shopping.clothing', confidence: 0.95 },
  { pattern: 'STRADIVARIUS', categorySlug: 'shopping.clothing', confidence: 0.95 },
  { pattern: 'ONLY', categorySlug: 'shopping.clothing', confidence: 0.85 },
  { pattern: 'VERO MODA', categorySlug: 'shopping.clothing', confidence: 0.95 },
  { pattern: 'JACK & JONES', categorySlug: 'shopping.clothing', confidence: 0.95 },
  { pattern: 'SCOTCH & SODA', categorySlug: 'shopping.clothing', confidence: 0.95 },
  { pattern: 'G-STAR', categorySlug: 'shopping.clothing', confidence: 0.95 },
  { pattern: 'NIKE', categorySlug: 'shopping.clothing', confidence: 0.9 },
  { pattern: 'ADIDAS', categorySlug: 'shopping.clothing', confidence: 0.9 },
  { pattern: 'PUMA', categorySlug: 'shopping.clothing', confidence: 0.9 },
  { pattern: 'FOOT LOCKER', categorySlug: 'shopping.clothing', confidence: 0.95 },
  { pattern: 'SNIPES', categorySlug: 'shopping.clothing', confidence: 0.95 },
  { pattern: 'JD SPORTS', categorySlug: 'shopping.clothing', confidence: 0.95 },
  { pattern: 'DECATHLON', categorySlug: 'shopping.clothing', confidence: 0.95 },
  { pattern: 'PERRY SPORT', categorySlug: 'shopping.clothing', confidence: 0.95 },
  { pattern: 'INTERSPORT', categorySlug: 'shopping.clothing', confidence: 0.95 },
  { pattern: 'ZALANDO', categorySlug: 'shopping.clothing', confidence: 0.95 },
  { pattern: 'ABOUT YOU', categorySlug: 'shopping.clothing', confidence: 0.95 },
  { pattern: 'ASOS', categorySlug: 'shopping.clothing', confidence: 0.95 },
  { pattern: 'BRISTOL', categorySlug: 'shopping.clothing', confidence: 0.9 },
  { pattern: 'TK MAXX', categorySlug: 'shopping.clothing', confidence: 0.95 },

  // =============================================
  // FOOD & RESTAURANTS
  // =============================================
  // Delivery services
  { pattern: 'THUISBEZORGD', categorySlug: 'food.restaurants', confidence: 0.95 },
  { pattern: 'UBER EATS', categorySlug: 'food.restaurants', confidence: 0.95 },
  { pattern: 'DELIVEROO', categorySlug: 'food.restaurants', confidence: 0.95 },
  { pattern: 'JUST EAT', categorySlug: 'food.restaurants', confidence: 0.95 },
  { pattern: 'GORILLAS', categorySlug: 'groceries', confidence: 0.9 },
  { pattern: 'GETIR', categorySlug: 'groceries', confidence: 0.9 },
  { pattern: 'FLINK', categorySlug: 'groceries', confidence: 0.9 },
  // Fast food
  { pattern: 'MCDONALDS', categorySlug: 'food.restaurants', confidence: 0.95 },
  { pattern: "MCDONALD'S", categorySlug: 'food.restaurants', confidence: 0.95 },
  { pattern: 'BURGER KING', categorySlug: 'food.restaurants', confidence: 0.95 },
  { pattern: 'KFC ', categorySlug: 'food.restaurants', confidence: 0.95 },
  { pattern: 'KENTUCKY FRIED', categorySlug: 'food.restaurants', confidence: 0.95 },
  { pattern: 'SUBWAY', categorySlug: 'food.restaurants', confidence: 0.9 },
  { pattern: 'TACO BELL', categorySlug: 'food.restaurants', confidence: 0.95 },
  { pattern: 'FIVE GUYS', categorySlug: 'food.restaurants', confidence: 0.95 },
  { pattern: 'FEBO', categorySlug: 'food.restaurants', confidence: 0.95 },
  { pattern: 'SMULLERS', categorySlug: 'food.restaurants', confidence: 0.95 },
  { pattern: 'KWALITARIA', categorySlug: 'food.restaurants', confidence: 0.95 },
  // Pizza
  { pattern: "DOMINO'S", categorySlug: 'food.restaurants', confidence: 0.95 },
  { pattern: 'DOMINOS', categorySlug: 'food.restaurants', confidence: 0.95 },
  { pattern: 'NEW YORK PIZZA', categorySlug: 'food.restaurants', confidence: 0.95 },
  { pattern: 'PIZZA HUT', categorySlug: 'food.restaurants', confidence: 0.95 },
  { pattern: 'PAPA JOHNS', categorySlug: 'food.restaurants', confidence: 0.95 },
  // Coffee & Bakery
  { pattern: 'STARBUCKS', categorySlug: 'food.coffee', confidence: 0.95 },
  { pattern: 'COFFEE COMPANY', categorySlug: 'food.coffee', confidence: 0.95 },
  { pattern: 'DOPPIO ESPRESSO', categorySlug: 'food.coffee', confidence: 0.95 },
  { pattern: 'ANNE&MAX', categorySlug: 'food.coffee', confidence: 0.95 },
  { pattern: 'BAGELS & BEANS', categorySlug: 'food.coffee', confidence: 0.95 },
  { pattern: 'BROWNIES & DOWNIES', categorySlug: 'food.coffee', confidence: 0.95 },
  { pattern: 'DUNKIN', categorySlug: 'food.coffee', confidence: 0.95 },
  { pattern: 'LA PLACE', categorySlug: 'food.restaurants', confidence: 0.95 },
  { pattern: 'VAPIANO', categorySlug: 'food.restaurants', confidence: 0.95 },
  { pattern: 'WAGAMAMA', categorySlug: 'food.restaurants', confidence: 0.95 },
  { pattern: 'HAPPY ITALY', categorySlug: 'food.restaurants', confidence: 0.95 },
  { pattern: 'HAPPY TOSTI', categorySlug: 'food.restaurants', confidence: 0.95 },
  { pattern: 'SUMO', categorySlug: 'food.restaurants', confidence: 0.9 },

  // =============================================
  // HEALTH & PHARMACY
  // =============================================
  { pattern: 'KRUIDVAT', categorySlug: 'health.pharmacy', confidence: 0.95 },
  { pattern: 'ETOS', categorySlug: 'health.pharmacy', confidence: 0.95 },
  { pattern: 'APOTHEEK', categorySlug: 'health.pharmacy', confidence: 0.9 },
  { pattern: 'PHARMACY', categorySlug: 'health.pharmacy', confidence: 0.9 },
  { pattern: 'DROGIST', categorySlug: 'health.pharmacy', confidence: 0.9 },
  { pattern: 'DA DROGIST', categorySlug: 'health.pharmacy', confidence: 0.95 },
  { pattern: 'TREKPLEISTER', categorySlug: 'health.pharmacy', confidence: 0.95 },
  { pattern: 'HOLLAND & BARRETT', categorySlug: 'health.pharmacy', confidence: 0.95 },
  { pattern: 'SPECSAVERS', categorySlug: 'health', confidence: 0.95 },
  { pattern: 'PEARLE', categorySlug: 'health', confidence: 0.95 },
  { pattern: 'HANS ANDERS', categorySlug: 'health', confidence: 0.95 },
  { pattern: 'EYEWISH', categorySlug: 'health', confidence: 0.95 },
  { pattern: 'DENTIST', categorySlug: 'health', confidence: 0.9 },
  { pattern: 'TANDARTS', categorySlug: 'health', confidence: 0.9 },
  { pattern: 'HUISARTS', categorySlug: 'health', confidence: 0.9 },
  { pattern: 'FYSIO', categorySlug: 'health', confidence: 0.9 },

  // =============================================
  // FITNESS & GYM
  // =============================================
  { pattern: 'BASIC-FIT', categorySlug: 'health.fitness', confidence: 0.95 },
  { pattern: 'BASIC FIT', categorySlug: 'health.fitness', confidence: 0.95 },
  { pattern: 'SPORTCITY', categorySlug: 'health.fitness', confidence: 0.95 },
  { pattern: 'ANYTIME FITNESS', categorySlug: 'health.fitness', confidence: 0.95 },
  { pattern: 'FIT FOR FREE', categorySlug: 'health.fitness', confidence: 0.95 },
  { pattern: 'TRAINMORE', categorySlug: 'health.fitness', confidence: 0.95 },
  { pattern: 'FITLAND', categorySlug: 'health.fitness', confidence: 0.95 },
  { pattern: 'SPORTSCHOOL', categorySlug: 'health.fitness', confidence: 0.9 },

  // =============================================
  // ENTERTAINMENT & SUBSCRIPTIONS
  // =============================================
  // Streaming subscriptions
  { pattern: 'NETFLIX', categorySlug: 'subscriptions.streaming', confidence: 0.95 },
  { pattern: 'SPOTIFY', categorySlug: 'subscriptions.streaming', confidence: 0.95 },
  { pattern: 'DISNEY PLUS', categorySlug: 'subscriptions.streaming', confidence: 0.95 },
  { pattern: 'DISNEY+', categorySlug: 'subscriptions.streaming', confidence: 0.95 },
  { pattern: 'HBO MAX', categorySlug: 'subscriptions.streaming', confidence: 0.95 },
  { pattern: 'AMAZON PRIME', categorySlug: 'subscriptions.streaming', confidence: 0.95 },
  { pattern: 'PRIME VIDEO', categorySlug: 'subscriptions.streaming', confidence: 0.95 },
  { pattern: 'APPLE TV', categorySlug: 'subscriptions.streaming', confidence: 0.95 },
  { pattern: 'APPLE MUSIC', categorySlug: 'subscriptions.streaming', confidence: 0.95 },
  { pattern: 'YOUTUBE PREMIUM', categorySlug: 'subscriptions.streaming', confidence: 0.95 },
  { pattern: 'VIDEOLAND', categorySlug: 'subscriptions.streaming', confidence: 0.95 },
  { pattern: 'NPO PLUS', categorySlug: 'subscriptions.streaming', confidence: 0.95 },
  { pattern: 'VIAPLAY', categorySlug: 'subscriptions.streaming', confidence: 0.95 },
  { pattern: 'DAZN', categorySlug: 'subscriptions.streaming', confidence: 0.95 },
  { pattern: 'PARAMOUNT', categorySlug: 'subscriptions.streaming', confidence: 0.9 },
  { pattern: 'TIDAL', categorySlug: 'subscriptions.streaming', confidence: 0.95 },
  { pattern: 'DEEZER', categorySlug: 'subscriptions.streaming', confidence: 0.95 },
  { pattern: 'AUDIBLE', categorySlug: 'subscriptions.streaming', confidence: 0.95 },
  { pattern: 'STORYTEL', categorySlug: 'subscriptions.streaming', confidence: 0.95 },
  // Gaming
  { pattern: 'PLAYSTATION', categorySlug: 'entertainment.hobbies', confidence: 0.95 },
  { pattern: 'XBOX', categorySlug: 'entertainment.hobbies', confidence: 0.95 },
  { pattern: 'NINTENDO', categorySlug: 'entertainment.hobbies', confidence: 0.95 },
  { pattern: 'STEAM', categorySlug: 'entertainment.hobbies', confidence: 0.95 },
  { pattern: 'EPIC GAMES', categorySlug: 'entertainment.hobbies', confidence: 0.95 },
  { pattern: 'GAME MANIA', categorySlug: 'entertainment.hobbies', confidence: 0.95 },
  // Cinema & Events
  { pattern: 'PATHE', categorySlug: 'entertainment.events', confidence: 0.95 },
  { pattern: 'KINEPOLIS', categorySlug: 'entertainment.events', confidence: 0.95 },
  { pattern: 'VUE CINEMA', categorySlug: 'entertainment.events', confidence: 0.95 },
  { pattern: 'FILMHUIS', categorySlug: 'entertainment.events', confidence: 0.9 },
  { pattern: 'TICKETMASTER', categorySlug: 'entertainment.events', confidence: 0.95 },
  { pattern: 'EVENTIM', categorySlug: 'entertainment.events', confidence: 0.95 },
  { pattern: 'EVENTBRITE', categorySlug: 'entertainment.events', confidence: 0.9 },

  // =============================================
  // HOUSING - UTILITIES
  // =============================================
  // Energy
  { pattern: 'VATTENFALL', categorySlug: 'housing.utilities', confidence: 0.95 },
  { pattern: 'ENECO', categorySlug: 'housing.utilities', confidence: 0.95 },
  { pattern: 'ESSENT', categorySlug: 'housing.utilities', confidence: 0.95 },
  { pattern: 'GREENCHOICE', categorySlug: 'housing.utilities', confidence: 0.95 },
  { pattern: 'BUDGET ENERGIE', categorySlug: 'housing.utilities', confidence: 0.95 },
  { pattern: 'OXXIO', categorySlug: 'housing.utilities', confidence: 0.95 },
  { pattern: 'VANDEBRON', categorySlug: 'housing.utilities', confidence: 0.95 },
  { pattern: 'ENERGIEDIRECT', categorySlug: 'housing.utilities', confidence: 0.95 },
  { pattern: 'FRANK ENERGIE', categorySlug: 'housing.utilities', confidence: 0.95 },
  { pattern: 'TIBBER', categorySlug: 'housing.utilities', confidence: 0.95 },
  { pattern: 'ENGIE', categorySlug: 'housing.utilities', confidence: 0.95 },
  { pattern: 'NUON', categorySlug: 'housing.utilities', confidence: 0.95 },
  // Telecom & Internet
  { pattern: 'KPN', categorySlug: 'housing.communications', confidence: 0.95 },
  { pattern: 'VODAFONE', categorySlug: 'housing.communications', confidence: 0.95 },
  { pattern: 'T-MOBILE', categorySlug: 'housing.communications', confidence: 0.95 },
  { pattern: 'ODIDO', categorySlug: 'housing.communications', confidence: 0.95 },
  { pattern: 'TELE2', categorySlug: 'housing.communications', confidence: 0.95 },
  { pattern: 'ZIGGO', categorySlug: 'housing.communications', confidence: 0.95 },
  { pattern: 'SIMPEL', categorySlug: 'housing.communications', confidence: 0.95 },
  { pattern: 'BEN ', categorySlug: 'housing.communications', confidence: 0.9 },
  { pattern: 'HOLLANDSNIEUWE', categorySlug: 'housing.communications', confidence: 0.95 },
  { pattern: 'LEBARA', categorySlug: 'housing.communications', confidence: 0.95 },
  { pattern: 'LYCAMOBILE', categorySlug: 'housing.communications', confidence: 0.95 },
  { pattern: 'YOUFONE', categorySlug: 'housing.communications', confidence: 0.95 },
  { pattern: 'DELTA', categorySlug: 'housing.communications', confidence: 0.85 },
  { pattern: 'ONLINE.NL', categorySlug: 'housing.communications', confidence: 0.95 },
  // Water
  { pattern: 'WATERNET', categorySlug: 'housing.utilities', confidence: 0.95 },
  { pattern: 'VITENS', categorySlug: 'housing.utilities', confidence: 0.95 },
  { pattern: 'BRABANT WATER', categorySlug: 'housing.utilities', confidence: 0.95 },
  { pattern: 'PWN', categorySlug: 'housing.utilities', confidence: 0.95 },
  { pattern: 'EVIDES', categorySlug: 'housing.utilities', confidence: 0.95 },
  { pattern: 'DUNEA', categorySlug: 'housing.utilities', confidence: 0.95 },
  { pattern: 'OASEN', categorySlug: 'housing.utilities', confidence: 0.95 },
  { pattern: 'WATERBEDRIJF', categorySlug: 'housing.utilities', confidence: 0.9 },
  { pattern: 'WATERSCHAP', categorySlug: 'housing.utilities', confidence: 0.9 },

  // =============================================
  // INSURANCE
  // =============================================
  // Health insurance
  { pattern: 'ZILVEREN KRUIS', categorySlug: 'health.insurance', confidence: 0.95 },
  { pattern: 'CZ ', categorySlug: 'health.insurance', confidence: 0.9 },
  { pattern: 'CZ.NL', categorySlug: 'health.insurance', confidence: 0.95 },
  { pattern: 'VGZ', categorySlug: 'health.insurance', confidence: 0.95 },
  { pattern: 'MENZIS', categorySlug: 'health.insurance', confidence: 0.95 },
  { pattern: 'ONVZ', categorySlug: 'health.insurance', confidence: 0.95 },
  { pattern: 'DSW', categorySlug: 'health.insurance', confidence: 0.95 },
  { pattern: 'ZORG EN ZEKERHEID', categorySlug: 'health.insurance', confidence: 0.95 },
  { pattern: 'ANDERZORG', categorySlug: 'health.insurance', confidence: 0.95 },
  { pattern: 'OHRA', categorySlug: 'housing.insurance', confidence: 0.95 },
  { pattern: 'INTERPOLIS', categorySlug: 'housing.insurance', confidence: 0.95 },
  { pattern: 'DITZO', categorySlug: 'housing.insurance', confidence: 0.95 },
  { pattern: 'JUST VERZEKERING', categorySlug: 'housing.insurance', confidence: 0.95 },
  // General insurance
  { pattern: 'CENTRAAL BEHEER', categorySlug: 'housing.insurance', confidence: 0.95 },
  { pattern: 'UNIVE', categorySlug: 'housing.insurance', confidence: 0.95 },
  { pattern: 'NATIONALE NEDERLANDEN', categorySlug: 'housing.insurance', confidence: 0.95 },
  { pattern: 'AEGON', categorySlug: 'housing.insurance', confidence: 0.95 },
  { pattern: 'ASR', categorySlug: 'housing.insurance', confidence: 0.95 },
  { pattern: 'ALLIANZ', categorySlug: 'housing.insurance', confidence: 0.95 },
  { pattern: 'REAAL', categorySlug: 'housing.insurance', confidence: 0.95 },
  { pattern: 'INSHARED', categorySlug: 'housing.insurance', confidence: 0.95 },
  { pattern: 'ALLSECUR', categorySlug: 'housing.insurance', confidence: 0.95 },

  // =============================================
  // PETS
  // =============================================
  { pattern: 'PETS PLACE', categorySlug: 'pets', confidence: 0.95 },
  { pattern: 'JUMPER DIER', categorySlug: 'pets', confidence: 0.95 },
  { pattern: 'DISCUS', categorySlug: 'pets', confidence: 0.85 },
  { pattern: 'DIERENARTS', categorySlug: 'pets', confidence: 0.9 },
  { pattern: 'VETERINAIR', categorySlug: 'pets', confidence: 0.9 },

  // =============================================
  // CHILDREN & EDUCATION
  // =============================================
  { pattern: 'INTERTOYS', categorySlug: 'shopping.general', confidence: 0.95 },
  { pattern: 'BART SMIT', categorySlug: 'shopping.general', confidence: 0.95 },
  { pattern: 'TOYCHAMP', categorySlug: 'shopping.general', confidence: 0.95 },
  { pattern: 'KINDEROPVANG', categorySlug: 'personal.education', confidence: 0.95 },
  { pattern: 'KINDERDAGVERBLIJF', categorySlug: 'personal.education', confidence: 0.95 },
  { pattern: 'BSO ', categorySlug: 'personal.education', confidence: 0.85 },
  { pattern: 'DUO ', categorySlug: 'personal.education', confidence: 0.85 },
  { pattern: 'STUDIELINK', categorySlug: 'personal.education', confidence: 0.95 },

  // =============================================
  // BANKS (for fees, not transfers)
  // =============================================
  { pattern: 'ING BANK', categorySlug: 'financial.fees', confidence: 0.9 },
  { pattern: 'ABN AMRO', categorySlug: 'financial.fees', confidence: 0.9 },
  { pattern: 'RABOBANK', categorySlug: 'financial.fees', confidence: 0.9 },
  { pattern: 'SNS BANK', categorySlug: 'financial.fees', confidence: 0.9 },
  { pattern: 'ASN BANK', categorySlug: 'financial.fees', confidence: 0.9 },
  { pattern: 'REGIOBANK', categorySlug: 'financial.fees', confidence: 0.9 },
  { pattern: 'TRIODOS', categorySlug: 'financial.fees', confidence: 0.9 },
  { pattern: 'BUNQ', categorySlug: 'financial.fees', confidence: 0.9 },
  { pattern: 'N26', categorySlug: 'financial.fees', confidence: 0.9 },
  { pattern: 'REVOLUT', categorySlug: 'financial.fees', confidence: 0.9 },

  // =============================================
  // TRAVEL & HOSPITALITY
  // =============================================
  { pattern: 'BOOKING.COM', categorySlug: 'entertainment.travel', confidence: 0.95 },
  { pattern: 'AIRBNB', categorySlug: 'entertainment.travel', confidence: 0.95 },
  { pattern: 'HOTELS.COM', categorySlug: 'entertainment.travel', confidence: 0.95 },
  { pattern: 'EXPEDIA', categorySlug: 'entertainment.travel', confidence: 0.95 },
  { pattern: 'TRIVAGO', categorySlug: 'entertainment.travel', confidence: 0.95 },
  { pattern: 'TRANSAVIA', categorySlug: 'entertainment.travel', confidence: 0.95 },
  { pattern: 'KLM', categorySlug: 'entertainment.travel', confidence: 0.95 },
  { pattern: 'EASYJET', categorySlug: 'entertainment.travel', confidence: 0.95 },
  { pattern: 'RYANAIR', categorySlug: 'entertainment.travel', confidence: 0.95 },
  { pattern: 'VUELING', categorySlug: 'entertainment.travel', confidence: 0.95 },
  { pattern: 'SCHIPHOL', categorySlug: 'entertainment.travel', confidence: 0.9 },
  { pattern: 'EUROSTAR', categorySlug: 'entertainment.travel', confidence: 0.95 },
  { pattern: 'THALYS', categorySlug: 'entertainment.travel', confidence: 0.95 },
  { pattern: 'TUI ', categorySlug: 'entertainment.travel', confidence: 0.95 },
  { pattern: 'CORENDON', categorySlug: 'entertainment.travel', confidence: 0.95 },
  { pattern: 'SUNWEB', categorySlug: 'entertainment.travel', confidence: 0.95 },
  { pattern: 'D-REIZEN', categorySlug: 'entertainment.travel', confidence: 0.95 },

  // =============================================
  // GOVERNMENT & MUNICIPAL
  // =============================================
  { pattern: 'BELASTINGDIENST', categorySlug: 'financial.taxes', confidence: 0.95 },
  { pattern: 'GEMEENTE', categorySlug: 'housing.taxes', confidence: 0.9 },
  { pattern: 'CJIB', categorySlug: 'financial.taxes', confidence: 0.95 },
  { pattern: 'RDW', categorySlug: 'transport.car', confidence: 0.95 },
  { pattern: 'CAK', categorySlug: 'financial.taxes', confidence: 0.95 },
  { pattern: 'SVB', categorySlug: 'income', confidence: 0.9 },
  { pattern: 'UWV', categorySlug: 'income', confidence: 0.9 },
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
