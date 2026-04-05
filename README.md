# Free Lunch

A free, open-source personal finance management app inspired by the beloved Grip app from the Netherlands.

## Features

- **Multi-Bank Sync** - Connect to ABN AMRO, ING, or Rabobank via Enable Banking API (PSD2)
- **3-Tier Smart Categorization** - User rules, merchant database, and Claude AI categorization with confidence scoring
- **Custom Categories** - Hierarchical categories that match your mental model
- **Split Transactions** - Divide purchases across multiple categories
- **Reimbursement Tracking** - Track work expenses and personal IOUs separately, clear with income
- **Budget Management** - Set monthly spending limits per category with customizable alert thresholds
- **ICS Credit Card Import** - Import and categorize credit card statements from PDF
- **Spending Explorer** - Drill-down analytics by category, subcategory, and counterparty
- **Counterparty Analytics** - Per-merchant spending patterns and trends over time
- **Dashboard** - Summary cards, spending charts, budget overview, and recent transactions
- **Data Export** - Export transactions as CSV or JSON
- **PWA Support** - Installable as a web app with offline indicator

## Tech Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS
- **UI Components:** shadcn/ui, Radix UI
- **State Management:** TanStack Query (server state), React Context (auth, month selection)
- **Backend:** Firebase (Auth, Firestore, Cloud Functions)
- **Bank API:** Enable Banking (PSD2)
- **AI:** Anthropic Claude (transaction categorization)
- **Charts:** Recharts
- **PDF Parsing:** pdfjs-dist (ICS import)
- **Forms:** React Hook Form + Zod
- **Testing:** Vitest, React Testing Library, Playwright

## Getting Started

### Prerequisites

- Node.js 20+
- npm 10+
- Firebase CLI (`npm install -g firebase-tools`)
- Java 11+ (for Firebase Emulators)

### Installation

```bash
# Clone the repository
git clone https://github.com/fernandovdutra/free-lunch.git
cd free-lunch

# Install dependencies
npm install
cd functions && npm install && cd ..

# Copy environment variables
cp .env.example .env.local

# Start development server
npm run dev
```

### Development with Firebase Emulators

```bash
# Start Firebase emulators (Auth, Firestore, Functions)
npm run firebase:emulators

# In another terminal
npm run dev
```

The Firebase Emulator UI is available at `http://localhost:4000`.

## Scripts

| Script                    | Description                          |
| ------------------------- | ------------------------------------ |
| `npm run dev`             | Start Vite dev server (port 5173)    |
| `npm run build`           | TypeScript compile + Vite build      |
| `npm run preview`         | Preview production build             |
| `npm run lint`            | Run ESLint                           |
| `npm run lint:fix`        | ESLint with auto-fix                 |
| `npm run format`          | Prettier format                      |
| `npm run typecheck`       | Run TypeScript type checking         |
| `npm run test`            | Run Vitest unit tests                |
| `npm run test:watch`      | Watch mode                           |
| `npm run test:coverage`   | Coverage report                      |
| `npm run e2e`             | Run Playwright E2E tests             |
| `npm run e2e:headed`      | E2E with visible browser             |
| `npm run firebase:emulators` | Start Firebase emulators          |
| `npm run firebase:deploy` | Deploy all Firebase services         |

## Project Structure

```
src/
├── components/
│   ├── ui/              # shadcn/ui + Radix base components
│   ├── layout/          # AppLayout, Header, Sidebar, BottomNav, MonthSelector
│   ├── dashboard/       # SummaryCards, charts, RecentTransactions, BudgetOverview
│   ├── transactions/    # TransactionList, filters, CategoryPicker, ApplyToSimilar
│   ├── categories/      # CategoryTree, CategoryForm, CategoryBadge
│   ├── budgets/         # BudgetList, BudgetCard, BudgetForm
│   ├── reimbursements/  # Pending/cleared lists, mark/clear dialogs
│   ├── spending/        # SpendingHeader, MonthlyBarChart, CategoryRow
│   ├── analytics/       # Counterparty charts and summary cards
│   └── settings/        # BankConnectionCard, IcsImportCard, BuiltInRulesCard, and more
├── pages/               # Route pages (16 pages including drill-downs)
├── hooks/               # TanStack Query hooks (queries + mutations split by domain)
├── data/                # Static data (merchant groups database)
├── lib/                 # Firebase init, utilities, transaction grouping, exports
├── types/               # TypeScript type definitions
├── contexts/            # AuthContext, MonthContext
└── test/                # Test utilities and fixtures

functions/src/
├── handlers/            # Cloud Function handlers (15+ endpoints)
├── categorization/      # 3-tier engine (rules, merchant DB, LLM)
├── enableBanking/       # Enable Banking API integration
├── shared/              # Transaction aggregation utilities
└── validation/          # Zod input validation schemas
```

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting a PR.

## License

MIT License - see [LICENSE](LICENSE) for details.

---

**Free Lunch** - Know where your money went.
