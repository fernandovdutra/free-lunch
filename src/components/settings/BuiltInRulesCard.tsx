import { useState } from 'react';
import { ChevronDown, ChevronRight, Search, Database } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

// Built-in merchant database (mirrors backend)
// Categories are grouped by their slug prefix
const MERCHANT_GROUPS: Record<string, { name: string; merchants: string[] }> = {
  groceries: {
    name: 'Groceries & Supermarkets',
    merchants: [
      'Albert Heijn',
      'AH to Go',
      'AH XL',
      'Jumbo',
      'Lidl',
      'Aldi',
      'Plus',
      'Dirk',
      'Coop',
      'Hoogvliet',
      'Spar',
      'Dekamarkt',
      'Vomar',
      'Nettorama',
      'Boni',
      'Poiesz',
      'Jan Linders',
      'Picnic',
      'Crisp',
      'Ekoplaza',
      'Marqt',
      'Stach',
      'Makro',
      'Sligro',
      'Gorillas',
      'Getir',
      'Flink',
    ],
  },
  'transport.public': {
    name: 'Public Transport',
    merchants: [
      'NS (Dutch Railways)',
      'GVB',
      'RET',
      'HTM',
      'Connexxion',
      'Arriva',
      'Qbuzz',
      'OV-Chipkaart',
      'Translink',
      'Breng',
      'Keolis',
      'EBS',
      'Syntus',
      'FlixBus',
      'OV-Fiets',
    ],
  },
  'transport.fuel': {
    name: 'Fuel & EV Charging',
    merchants: [
      'Shell',
      'BP',
      'Esso',
      'Tinq',
      'Tango',
      'Total',
      'TotalEnergies',
      'Texaco',
      'Gulf',
      'Firezone',
      'Tamoil',
      'Fastned',
      'Allego',
      'Shell Recharge',
    ],
  },
  transport: {
    name: 'Transport & Car',
    merchants: [
      'Q-Park',
      'Interparking',
      'ParkBee',
      'Yellowbrick',
      'Parkmobile',
      'ANWB',
      'Carglass',
      'Kwik Fit',
      'Halfords',
      'Euromaster',
      'Uber',
      'Bolt',
      'Swapfiets',
    ],
  },
  'shopping.general': {
    name: 'General Shopping',
    merchants: [
      'Bol.com',
      'Amazon',
      'Hema',
      'Action',
      'Xenos',
      'Blokker',
      'Bijenkorf',
      'Wehkamp',
      'AliExpress',
      'Temu',
      'Shein',
      'Flying Tiger',
      'Pets Place',
      'Intertoys',
    ],
  },
  'shopping.electronics': {
    name: 'Electronics',
    merchants: [
      'Coolblue',
      'MediaMarkt',
      'BCC',
      'Expert',
      'Apple Store',
      'Samsung',
      'Amac',
      'Belsimpel',
      'Mobiel.nl',
    ],
  },
  'shopping.home': {
    name: 'Home & Furniture',
    merchants: [
      'IKEA',
      'Leen Bakker',
      'Jysk',
      'Goossens',
      'Swiss Sense',
      'Beter Bed',
      'Kwantum',
      'Gamma',
      'Karwei',
      'Praxis',
      'Hornbach',
      'Hubo',
      'Intratuin',
      'Groenrijk',
    ],
  },
  'shopping.clothing': {
    name: 'Fashion & Clothing',
    merchants: [
      'Zara',
      'H&M',
      'Primark',
      'Uniqlo',
      'C&A',
      'Zeeman',
      'WE Fashion',
      'Mango',
      'Bershka',
      'G-Star',
      'Nike',
      'Adidas',
      'Decathlon',
      'Zalando',
      'ASOS',
      'TK Maxx',
    ],
  },
  'food.restaurants': {
    name: 'Restaurants & Fast Food',
    merchants: [
      'Thuisbezorgd',
      'Uber Eats',
      'Deliveroo',
      'Just Eat',
      "McDonald's",
      'Burger King',
      'KFC',
      'Subway',
      "Domino's",
      'New York Pizza',
      'Febo',
      'La Place',
      'Vapiano',
      'Wagamama',
    ],
  },
  'food.coffee': {
    name: 'Coffee & Bakery',
    merchants: [
      'Starbucks',
      'Coffee Company',
      'Doppio Espresso',
      'Anne&Max',
      'Bagels & Beans',
      "Brownies & Downies",
      'Dunkin',
    ],
  },
  'health.pharmacy': {
    name: 'Pharmacy & Drugstore',
    merchants: [
      'Kruidvat',
      'Etos',
      'DA Drogist',
      'Trekpleister',
      'Holland & Barrett',
    ],
  },
  health: {
    name: 'Health & Opticians',
    merchants: [
      'Specsavers',
      'Pearle',
      'Hans Anders',
      'Eyewish',
    ],
  },
  'health.fitness': {
    name: 'Fitness & Gym',
    merchants: [
      'Basic-Fit',
      'SportCity',
      'Anytime Fitness',
      'Fit for Free',
      'TrainMore',
      'Fitland',
    ],
  },
  entertainment: {
    name: 'Entertainment & Streaming',
    merchants: [
      'Netflix',
      'Spotify',
      'Disney+',
      'HBO Max',
      'Amazon Prime',
      'Apple TV',
      'Apple Music',
      'YouTube Premium',
      'Videoland',
      'NPO Plus',
      'Viaplay',
      'PlayStation',
      'Xbox',
      'Steam',
      'Pathé',
      'Kinepolis',
      'Ticketmaster',
    ],
  },
  'housing.utilities': {
    name: 'Utilities & Telecom',
    merchants: [
      'Vattenfall',
      'Eneco',
      'Essent',
      'Greenchoice',
      'Budget Energie',
      'Frank Energie',
      'KPN',
      'Vodafone',
      'T-Mobile',
      'Odido',
      'Ziggo',
      'Simpel',
      'Waternet',
      'Vitens',
    ],
  },
  insurance: {
    name: 'Insurance',
    merchants: [
      'Zilveren Kruis',
      'CZ',
      'VGZ',
      'Menzis',
      'ONVZ',
      'DSW',
      'Centraal Beheer',
      'Univé',
      'Nationale Nederlanden',
      'Aegon',
      'ASR',
      'Interpolis',
      'InShared',
    ],
  },
  travel: {
    name: 'Travel & Airlines',
    merchants: [
      'Booking.com',
      'Airbnb',
      'Hotels.com',
      'Expedia',
      'Transavia',
      'KLM',
      'EasyJet',
      'Ryanair',
      'Eurostar',
      'TUI',
      'Corendon',
      'Sunweb',
    ],
  },
  fees: {
    name: 'Government & Fees',
    merchants: [
      'Belastingdienst',
      'Gemeente',
      'CJIB',
      'RDW',
      'CAK',
      'ING Bank',
      'ABN AMRO',
      'Rabobank',
      'Bunq',
      'Revolut',
    ],
  },
};

export function BuiltInRulesCard() {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const toggleGroup = (group: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(group)) {
        next.delete(group);
      } else {
        next.add(group);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedGroups(new Set(Object.keys(MERCHANT_GROUPS)));
  };

  const collapseAll = () => {
    setExpandedGroups(new Set());
  };

  // Filter merchants based on search
  const filteredGroups = Object.entries(MERCHANT_GROUPS)
    .map(([key, group]) => ({
      key,
      name: group.name,
      merchants: searchTerm
        ? group.merchants.filter((m) => m.toLowerCase().includes(searchTerm.toLowerCase()))
        : group.merchants,
    }))
    .filter((group) => group.merchants.length > 0);

  const totalMerchants = Object.values(MERCHANT_GROUPS).reduce(
    (sum, group) => sum + group.merchants.length,
    0
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Built-in Merchant Database
            </CardTitle>
            <CardDescription>
              {totalMerchants} Dutch merchants are automatically recognized
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search and expand/collapse controls */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search merchants..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
              }}
              className="pl-9"
            />
          </div>
          <button
            onClick={expandAll}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Expand all
          </button>
          <span className="text-muted-foreground">|</span>
          <button
            onClick={collapseAll}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Collapse all
          </button>
        </div>

        {/* Groups */}
        <div className="max-h-80 space-y-1 overflow-y-auto">
          {filteredGroups.map((group) => (
            <div key={group.key} className="rounded-lg border">
              <button
                onClick={() => {
                  toggleGroup(group.key);
                }}
                className="flex w-full items-center justify-between p-3 text-left hover:bg-muted/50"
              >
                <div className="flex items-center gap-2">
                  {expandedGroups.has(group.key) ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="font-medium">{group.name}</span>
                </div>
                <span className="text-sm text-muted-foreground">{group.merchants.length}</span>
              </button>
              {expandedGroups.has(group.key) && (
                <div className="border-t bg-muted/30 px-4 py-2">
                  <div className="flex flex-wrap gap-1.5">
                    {group.merchants.map((merchant) => (
                      <span
                        key={merchant}
                        className="rounded-full bg-background px-2 py-0.5 text-xs"
                      >
                        {merchant}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {filteredGroups.length === 0 && (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No merchants found matching &ldquo;{searchTerm}&rdquo;
          </p>
        )}

        <p className="text-xs text-muted-foreground">
          These merchants are automatically categorized. Your custom rules take priority over
          built-in rules.
        </p>
      </CardContent>
    </Card>
  );
}
