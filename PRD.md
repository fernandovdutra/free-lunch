# Free Lunch - Product Requirements Document

A free, open-source personal finance management app inspired by the beloved Grip app, built initially for the Netherlands market with a focus on clarity, control, and user freedom.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Mission](#2-mission)
3. [Target Users](#3-target-users)
4. [MVP Scope](#4-mvp-scope)
5. [User Stories](#5-user-stories)
6. [Core Architecture & Patterns](#6-core-architecture--patterns)
7. [Features](#7-features)
8. [Technology Stack](#8-technology-stack)
9. [Security & Configuration](#9-security--configuration)
10. [API Specification](#10-api-specification)
11. [Testing Strategy](#11-testing-strategy)
12. [Environment & Deployment](#12-environment--deployment)
13. [Success Criteria](#13-success-criteria)
14. [Implementation Phases](#14-implementation-phases)
15. [Future Considerations](#15-future-considerations)
16. [Risks & Mitigations](#16-risks--mitigations)
17. [Appendix](#17-appendix)

---

## 1. Executive Summary

### Product Overview

Free Lunch is a free, open-source personal finance management application designed to fill the void left by ABN AMRO's Grip app, which was discontinued in December 2022. While Grip's core features were absorbed into ABN AMRO's main app (limiting access to ABN AMRO customers only), Free Lunch aims to provide the same beloved functionality—and more—to anyone in the Netherlands, regardless of their bank.

The app automatically syncs transactions from Dutch banks (starting with ABN AMRO), intelligently categorizes spending, and provides clear insights into where money goes. Unlike Grip, Free Lunch addresses key user frustrations: it supports custom hierarchical categories, transaction splitting, and a unique reimbursement tracking system for work expenses and personal IOUs.

### Core Value Proposition

- **Free & Open Source:** No subscription fees, no premium tiers, no data monetization
- **Automatic Bank Sync:** Direct connection to ABN AMRO via Enable Banking API
- **Smart Categorization:** AI-powered merchant recognition that learns from user corrections
- **Flexibility Grip Lacked:** Custom categories, split transactions, reimbursement tracking
- **User Data Ownership:** Export your data anytime, interoperable with other tools

### MVP Goal Statement

Deliver a functional web application that connects to ABN AMRO, automatically categorizes transactions into user-defined hierarchical categories, supports transaction splitting, and provides a clear dashboard showing spending patterns—all within a clean, minimal interface.

---

## 2. Mission

### Mission Statement

> Empower individuals to understand and control their personal finances through a free, transparent, and user-friendly tool—because financial clarity should not be a luxury.

### Core Principles

| Principle | Description |
|-----------|-------------|
| **Freedom** | Open source, free forever, no vendor lock-in. Users own their data. |
| **Clarity** | Information hierarchy is clear; users can scan and understand quickly. |
| **Simplicity** | Do one thing well. Avoid feature bloat. Every feature must earn its place. |
| **Privacy** | Minimal data collection. No selling user data. EU data protection compliant. |
| **Flexibility** | What Grip lacked—custom categories, split transactions, works your way. |

---

## 3. Target Users

### Primary Persona: The Financially Aware Professional

**Name:** Pieter, 32, Amsterdam
**Occupation:** Software Developer
**Banking:** ABN AMRO (primary), ICS credit card
**Technical Comfort:** High - comfortable with web apps, understands APIs

**Context:**
- Former Grip user who misses the app's simplicity and multi-bank support
- Has work expenses that get reimbursed, needs to track these separately
- Occasionally pays for friends/family and gets paid back
- Wants to understand spending patterns without manual spreadsheet work

**Pain Points:**
- ABN AMRO's built-in tools lack Grip's elegance and are ABN-only
- Existing alternatives (Dyme, iBilly) are paid or limited
- Can't create custom categories that match his mental model
- Reimbursable expenses pollute his personal spending view

**Needs:**
- Automatic transaction import (no manual CSV uploads)
- Categories that make sense for his life (not generic banking categories)
- Clear separation of personal vs. reimbursable expenses
- Simple, fast, no-nonsense interface

### Secondary Persona: The Budget-Conscious Expat

**Name:** Maria, 28, Rotterdam
**Occupation:** Marketing Manager
**Banking:** ABN AMRO
**Technical Comfort:** Medium - uses apps daily, not technical

**Context:**
- Moved to Netherlands 2 years ago, still learning Dutch financial systems
- Wants to understand where her money goes each month
- Heard about Grip from Dutch colleagues but it was already discontinued

**Pain Points:**
- Dutch bank apps are confusing, partly in Dutch
- Doesn't know if her spending is "normal" for Netherlands
- Subscriptions pile up without her noticing

**Needs:**
- Clean English interface
- Easy-to-understand spending breakdowns
- Visual charts and dashboards

---

## 4. MVP Scope

### In Scope (MVP v1.0)

**Core Functionality**
- ✅ User authentication (Email + Password, Google Sign-in)
- ✅ ABN AMRO bank account connection via Enable Banking API
- ✅ Automatic transaction import (as far back as API allows)
- ✅ Automatic transaction categorization using ML/rules
- ✅ User-defined hierarchical categories (parent + sub-categories)
- ✅ Manual category override with learning
- ✅ Transaction splitting across multiple categories
- ✅ Reimbursement tracking workflow
- ✅ Dashboard with spending overview
- ✅ Category-based spending breakdown (charts)
- ✅ Monthly/weekly/custom date range views

**Technical**
- ✅ Web application (responsive, works on mobile browsers)
- ✅ Firebase Firestore database
- ✅ Firebase Cloud Functions backend
- ✅ Firebase Authentication
- ✅ Firebase Hosting

**User Experience**
- ✅ Clean, minimal design (green color palette)
- ✅ Fast, responsive interactions
- ✅ Dutch and English language support

### Out of Scope (Post-MVP)

**Features Deferred**
- ❌ Native mobile apps (iOS/Android)
- ❌ Budget setting and alerts
- ❌ Fixed costs / subscription tracking
- ❌ Predictions (30-day forecast)
- ❌ Tags/labels (beyond categories)
- ❌ Household/benchmark comparison
- ❌ Multi-bank support (ING, Rabobank, etc.)
- ❌ ICS credit card support
- ❌ Multi-currency support
- ❌ Shared/family accounts
- ❌ Recurring transaction detection
- ❌ Bill reminders
- ❌ Savings goals

**Technical Deferred**
- ❌ Offline support / PWA
- ❌ Public API for third-party integrations
- ❌ Self-hosting option (Docker)
- ❌ Data export to Firefly III format

---

## 5. User Stories

### Primary User Stories

#### US-1: Bank Connection
> As a user, I want to connect my ABN AMRO account securely, so that my transactions are automatically imported without manual work.

**Acceptance Criteria:**
- User can initiate bank connection from settings
- Redirected to ABN AMRO's secure authentication (via Enable Banking)
- After auth, transactions start importing automatically
- Historical transactions imported (as far back as API provides)
- Connection status visible in app

**Example Flow:**
1. User clicks "Connect Bank Account"
2. Selects "ABN AMRO" from bank list
3. Redirected to ABN AMRO login page
4. Authenticates with their bank credentials
5. Grants consent for transaction access
6. Redirected back to Free Lunch
7. Sees "Syncing transactions..." then dashboard populates

---

#### US-2: Automatic Categorization
> As a user, I want my transactions to be automatically categorized, so that I don't have to manually organize hundreds of transactions.

**Acceptance Criteria:**
- New transactions receive automatic category suggestions
- Categorization based on merchant name recognition
- Common Dutch merchants pre-mapped (Albert Heijn → Groceries, NS → Transport, etc.)
- Confidence indicator on auto-categorized transactions
- Uncategorizable transactions flagged for manual review

**Example:**
- Transaction: "Albert Heijn 1234 Amsterdam" → Auto-categorized as "Groceries"
- Transaction: "TIKKIE VAN PIETER" → Flagged as "Uncategorized" (needs manual input)

---

#### US-3: Custom Categories
> As a user, I want to create my own category hierarchy, so that I can organize spending in a way that makes sense for my life.

**Acceptance Criteria:**
- User can create parent categories (e.g., "Transport")
- User can create sub-categories under parents (e.g., "Transport > Fuel", "Transport > Public Transit")
- Default category set provided on first use
- Categories can be renamed, reordered, deleted
- Deleting a category prompts to reassign transactions

**Example Category Structure:**
```
📁 Housing
   ├── Rent/Mortgage
   ├── Utilities
   └── Insurance
📁 Transport
   ├── Fuel
   ├── Public Transit
   └── Car Maintenance
📁 Food & Drink
   ├── Groceries
   ├── Restaurants
   └── Coffee & Snacks
```

---

#### US-4: Transaction Splitting
> As a user, I want to split a single transaction across multiple categories, so that I can accurately track mixed purchases.

**Acceptance Criteria:**
- Any transaction can be split into 2+ parts
- Each part has: amount, category, optional note
- Split amounts must equal original transaction amount
- Split transactions display as expandable in transaction list
- Category totals reflect split allocations

**Example:**
- Original: "Albert Heijn €85.50"
- Split into:
  - €65.00 → Groceries
  - €20.50 → Household Supplies

---

#### US-5: Reimbursement Tracking
> As a user, I want to track expenses that will be reimbursed (work or personal), so that they don't distort my personal spending view.

**Acceptance Criteria:**
- Any expense can be marked as "Reimbursable"
- Reimbursable types: "Work Expense" or "Paid for Someone"
- Optional note field (e.g., "Train to client meeting" or "Dinner for John")
- Reimbursable expenses shown in separate section
- When reimbursement arrives, user can link/match it to original expense(s)
- Matched pairs are "cleared" - visible in history but excluded from personal totals
- Dashboard shows: Personal Expenses | Pending Reimbursements | Net Total

**Example Workflow:**
1. User sees transaction: "NS Business Travel €45.00"
2. Marks as "Reimbursable" → Type: "Work Expense" → Note: "Client visit Amsterdam"
3. Transaction moves to "Pending Reimbursements" section
4. Days later: Incoming transfer "SALARY + EXPENSES €2,545.00"
5. User opens the incoming transfer, clicks "Contains reimbursement"
6. Selects the €45.00 NS transaction from pending list
7. Both transactions are now "cleared" and linked

---

#### US-6: Spending Dashboard
> As a user, I want to see a clear dashboard of my spending, so that I can quickly understand my financial situation.

**Acceptance Criteria:**
- Overview shows total income and expenses for selected period
- Pie/donut chart showing spending by category
- Bar chart showing spending over time (daily/weekly/monthly)
- Top spending categories highlighted
- Comparison to previous period (e.g., "€150 more on restaurants than last month")
- Quick filters: This month, Last month, This year, Custom range

---

#### US-7: Category Correction & Learning
> As a user, I want to correct mis-categorized transactions, and have the app learn from my corrections.

**Acceptance Criteria:**
- Easy one-click category change on any transaction
- When correcting, option to "Apply to all similar transactions"
- App learns: "JUMBO 1234" should always be "Groceries"
- User can view and manage learned rules
- Can reset/delete learned rules

---

#### US-8: Data Export
> As a user, I want to export my transaction data, so that I own my data and can use it elsewhere.

**Acceptance Criteria:**
- Export to CSV format
- Export to JSON format
- Selectable date range
- Includes: date, description, amount, category, notes, reimbursement status
- Download triggers immediately (no email required)

---

## 6. Core Architecture & Patterns

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT (Browser)                        │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    React SPA (Vite)                       │  │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────────────┐  │  │
│  │  │Dashboard│ │Transact.│ │Settings │ │  Auth Context   │  │  │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────────────┘  │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      FIREBASE SERVICES                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   Hosting   │  │    Auth     │  │      Cloud Functions    │  │
│  │  (Web App)  │  │ (Email/Ggl) │  │  ┌───────────────────┐  │  │
│  └─────────────┘  └─────────────┘  │  │ Bank Sync Worker  │  │  │
│                                     │  │ Categorization ML │  │  │
│  ┌─────────────────────────────┐   │  │ Scheduled Jobs    │  │  │
│  │         Firestore           │   │  └───────────────────┘  │  │
│  │  ┌───────┐ ┌───────────┐    │   └─────────────────────────┘  │
│  │  │ Users │ │Transactions│   │                                │
│  │  ├───────┤ ├───────────┤   │                                │
│  │  │Categs │ │  Rules    │   │                                │
│  │  └───────┘ └───────────┘   │                                │
│  └─────────────────────────────┘                                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    EXTERNAL SERVICES                            │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                  Enable Banking API                      │    │
│  │           (PSD2 Bank Connection - ABN AMRO)              │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

### Directory Structure

```
free-lunch/
├── src/
│   ├── components/
│   │   ├── ui/                    # shadcn/ui components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   └── ...
│   │   ├── layout/
│   │   │   ├── Header.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── PageContainer.tsx
│   │   ├── dashboard/
│   │   │   ├── SpendingChart.tsx
│   │   │   ├── CategoryBreakdown.tsx
│   │   │   └── SummaryCards.tsx
│   │   ├── transactions/
│   │   │   ├── TransactionList.tsx
│   │   │   ├── TransactionRow.tsx
│   │   │   ├── TransactionSplit.tsx
│   │   │   └── CategoryPicker.tsx
│   │   ├── categories/
│   │   │   ├── CategoryTree.tsx
│   │   │   └── CategoryEditor.tsx
│   │   └── reimbursements/
│   │       ├── ReimbursementList.tsx
│   │       └── MatchDialog.tsx
│   ├── pages/
│   │   ├── Dashboard.tsx
│   │   ├── Transactions.tsx
│   │   ├── Categories.tsx
│   │   ├── Reimbursements.tsx
│   │   ├── Settings.tsx
│   │   └── Auth/
│   │       ├── Login.tsx
│   │       └── Register.tsx
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useTransactions.ts
│   │   ├── useCategories.ts
│   │   └── useBankSync.ts
│   ├── lib/
│   │   ├── firebase.ts           # Firebase initialization
│   │   ├── categorizer.ts        # Categorization logic
│   │   ├── utils.ts              # Utility functions
│   │   └── colors.ts             # Design system colors
│   ├── types/
│   │   ├── transaction.ts
│   │   ├── category.ts
│   │   └── user.ts
│   ├── contexts/
│   │   ├── AuthContext.tsx
│   │   └── TransactionContext.tsx
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── functions/                     # Firebase Cloud Functions
│   ├── src/
│   │   ├── index.ts
│   │   ├── bankSync.ts           # Enable Banking integration
│   │   ├── categorize.ts         # Auto-categorization
│   │   └── scheduled.ts          # Cron jobs
│   ├── package.json
│   └── tsconfig.json
├── public/
├── .env.example
├── firebase.json
├── firestore.rules
├── package.json
├── tailwind.config.js
├── tsconfig.json
├── vite.config.ts
└── README.md
```

### Key Design Patterns

| Pattern | Usage |
|---------|-------|
| **Context API** | Global state for auth, transactions, categories |
| **Custom Hooks** | Encapsulate Firebase queries and business logic |
| **Optimistic Updates** | Update UI immediately, sync with Firestore in background |
| **Rule-based + ML Categorization** | Merchant rules first, ML fallback for unknowns |
| **Hierarchical Data** | Categories stored with parent references, queried with compound queries |
| **Soft Delete** | Transactions/categories marked deleted, not removed (for audit) |

### Firestore Data Model

```typescript
// Collection: users/{userId}
interface User {
  email: string;
  displayName: string;
  createdAt: Timestamp;
  settings: {
    language: 'en' | 'nl';
    currency: 'EUR';
    defaultDateRange: 'month' | 'week' | 'year';
  };
  bankConnections: BankConnection[];
}

interface BankConnection {
  id: string;
  provider: 'enable_banking';
  bankId: 'abn_amro';
  status: 'active' | 'expired' | 'error';
  lastSync: Timestamp;
  consentExpiresAt: Timestamp;
}

// Collection: users/{userId}/categories/{categoryId}
interface Category {
  id: string;
  name: string;
  icon: string;                    // Emoji or icon name
  color: string;                   // Hex color
  parentId: string | null;         // null for root categories
  order: number;                   // For sorting
  isSystem: boolean;               // true for default categories
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Collection: users/{userId}/transactions/{transactionId}
interface Transaction {
  id: string;
  externalId: string;              // Bank's transaction ID
  date: Timestamp;
  description: string;             // Original bank description
  amount: number;                  // Negative for expenses
  currency: 'EUR';
  counterparty: string | null;     // Merchant/person name

  // Categorization
  categoryId: string | null;
  categoryConfidence: number;      // 0-1, how confident auto-categorization was
  categorySource: 'auto' | 'manual' | 'rule';

  // Splitting
  isSplit: boolean;
  splits: TransactionSplit[] | null;

  // Reimbursement
  reimbursement: ReimbursementInfo | null;

  // Meta
  bankAccountId: string;
  importedAt: Timestamp;
  updatedAt: Timestamp;
}

interface TransactionSplit {
  amount: number;
  categoryId: string;
  note: string | null;
}

interface ReimbursementInfo {
  type: 'work' | 'personal';
  note: string | null;
  status: 'pending' | 'cleared';
  linkedTransactionId: string | null;  // The reimbursement transfer
  clearedAt: Timestamp | null;
}

// Collection: users/{userId}/rules/{ruleId}
interface CategorizationRule {
  id: string;
  pattern: string;                 // Regex or exact match
  matchType: 'contains' | 'exact' | 'regex';
  categoryId: string;
  priority: number;
  isLearned: boolean;              // Auto-created from user corrections
  createdAt: Timestamp;
}
```

---

## 7. Features

### 7.1 Dashboard

**Purpose:** Provide at-a-glance understanding of financial situation.

**Components:**
- **Summary Cards:** Total income, total expenses, net change for period
- **Spending by Category:** Donut/pie chart with clickable segments
- **Spending Over Time:** Bar chart (daily/weekly/monthly granularity)
- **Recent Transactions:** Quick list of last 5-10 transactions
- **Pending Reimbursements:** Count and total of outstanding reimbursables

**Interactions:**
- Click category in chart → Filter transactions to that category
- Date range picker in header → Updates all charts
- Quick period buttons: "This Month", "Last Month", "This Year"

---

### 7.2 Transaction List

**Purpose:** Browse, search, and manage all transactions.

**Features:**
- Infinite scroll with virtualization (for performance)
- Search by description, amount, category
- Filter by: category, date range, reimbursement status
- Sort by: date (default), amount, category
- Bulk actions: categorize multiple, mark as reimbursable

**Transaction Row:**
```
┌────────────────────────────────────────────────────────────────┐
│ 📅 Jan 15  │ Albert Heijn 1234      │ Groceries 🍎 │  -€45.50 │
│            │ ▼ Split (2 items)       │              │          │
├────────────────────────────────────────────────────────────────┤
│            │ ├─ Groceries            │              │  -€35.00 │
│            │ └─ Household            │              │  -€10.50 │
└────────────────────────────────────────────────────────────────┘
```

---

### 7.3 Category Management

**Purpose:** Create and organize personal category hierarchy.

**Features:**
- Tree view of categories with drag-and-drop reordering
- Add/edit/delete categories
- Color and icon picker for each category
- "Merge" function to combine two categories
- View transaction count per category
- Default categories provided on signup

**Default Category Set:**
```
📁 Income
   ├── 💰 Salary
   ├── 🎁 Gifts
   └── 💵 Other Income
📁 Housing
   ├── 🏠 Rent/Mortgage
   ├── ⚡ Utilities
   └── 🛡️ Insurance
📁 Transport
   ├── ⛽ Fuel
   ├── 🚇 Public Transit
   └── 🚗 Car Expenses
📁 Food & Drink
   ├── 🛒 Groceries
   ├── 🍽️ Restaurants
   └── ☕ Coffee & Snacks
📁 Shopping
   ├── 👕 Clothing
   ├── 🖥️ Electronics
   └── 🛍️ General
📁 Entertainment
   ├── 🎬 Movies & Shows
   ├── 🎮 Games
   └── 📚 Books
📁 Health
   ├── 💊 Pharmacy
   ├── 🏥 Medical
   └── 🏋️ Fitness
📁 Personal
   ├── 💇 Self Care
   └── 🎓 Education
📁 Other
   └── ❓ Uncategorized
```

---

### 7.4 Transaction Splitting

**Purpose:** Divide single transactions across multiple categories.

**Flow:**
1. Click "Split" on any transaction
2. Dialog opens with original amount shown
3. Add split rows: amount + category + optional note
4. Validation: splits must equal original amount
5. Save → Transaction shows as expandable in list

**UI Mockup:**
```
┌─────────────────────────────────────────────────────────────┐
│ Split Transaction                                      [X]  │
├─────────────────────────────────────────────────────────────┤
│ Original: Albert Heijn 1234              Total: €85.50     │
├─────────────────────────────────────────────────────────────┤
│ Split 1:  [€65.00    ] [Groceries      ▼] [Note...      ]  │
│ Split 2:  [€20.50    ] [Household      ▼] [cleaning     ]  │
│                                            [+ Add Split]   │
├─────────────────────────────────────────────────────────────┤
│ Remaining: €0.00                          [Cancel] [Save]  │
└─────────────────────────────────────────────────────────────┘
```

---

### 7.5 Reimbursement Tracking

**Purpose:** Separate work/personal reimbursable expenses from true personal spending.

**Mark as Reimbursable Flow:**
1. On transaction, click "Mark as Reimbursable"
2. Select type: "Work Expense" or "Paid for Someone"
3. Add optional note
4. Transaction moves to "Pending Reimbursements" section
5. Personal expense totals update to exclude this

**Clear Reimbursement Flow:**
1. When incoming transfer arrives (salary + expenses, Tikkie, etc.)
2. User opens the incoming transaction
3. Clicks "Contains Reimbursement"
4. Selects from list of pending reimbursements
5. Can match multiple expenses to one incoming transfer
6. Matched transactions are "cleared"

**Dashboard Impact:**
```
┌─────────────────────────────────────────────────────────────┐
│ January 2026                                                │
├──────────────────┬──────────────────┬──────────────────────┤
│ Personal Expenses│ Pending Reimb.   │ Net Expenses         │
│ €1,234.56        │ €145.00 (3)      │ €1,234.56            │
└──────────────────┴──────────────────┴──────────────────────┘
```

---

### 7.6 Auto-Categorization Engine

**Purpose:** Minimize manual work for users.

**Approach:**
1. **Rule Matching (First):** Check user-defined and system rules
2. **Merchant Database:** Pre-populated Dutch merchant → category mappings
3. **ML Fallback:** For unknown merchants, use transaction description patterns
4. **User Learning:** When user corrects, create learned rule

**Dutch Merchant Database (Examples):**
| Merchant Pattern | Category |
|------------------|----------|
| `ALBERT HEIJN` | Groceries |
| `JUMBO` | Groceries |
| `NS `, `SPRINTER`, `INTERCITY` | Public Transit |
| `SHELL`, `BP`, `ESSO` | Fuel |
| `HEMA` | Shopping > General |
| `BOL.COM` | Shopping > General |
| `THUISBEZORGD`, `UBER EATS` | Restaurants |
| `NETFLIX`, `SPOTIFY` | Entertainment |
| `KRUIDVAT`, `ETOS` | Health > Pharmacy |
| `TIKKIE` | Uncategorized (needs manual) |
| `IDEAL` | Uncategorized (generic) |

---

### 7.7 Bank Sync

**Purpose:** Automatically import transactions from ABN AMRO.

**Technology:** Enable Banking API

**Flow:**
1. User initiates connection in Settings
2. Redirect to Enable Banking → ABN AMRO OAuth
3. User authenticates with bank
4. Consent granted (typically 90 days per PSD2)
5. Webhook triggers initial sync
6. Daily scheduled sync for new transactions
7. Re-auth flow when consent expires

**Sync Behavior:**
- On initial connect: Fetch all available history (typically 90+ days)
- Daily: Fetch new transactions
- On user request: Manual "Sync Now" button
- Handle duplicates: Match by external transaction ID

---

### 7.8 Data Export

**Purpose:** User data ownership and interoperability.

**Formats:**
- **CSV:** Excel-compatible, human-readable
- **JSON:** Full data with nested structures

**Fields Included:**
- Date, Description, Amount, Currency
- Category (full path for hierarchical)
- Notes
- Reimbursement status and type
- Split details (for JSON)

---

## 8. Technology Stack

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 19.x | UI framework |
| TypeScript | 5.x | Type safety |
| Vite | 6.x | Build tool, dev server |
| Tailwind CSS | 3.4+ | Utility-first styling |
| shadcn/ui | latest | Component library |
| React Router | 7.x | Client-side routing |
| TanStack Query | 5.x | Server state management |
| Recharts | 2.x | Charts and visualizations |
| date-fns | 3.x | Date manipulation |
| Lucide React | latest | Icons |
| React Hook Form | 7.x | Form handling |
| Zod | 3.x | Schema validation |

### Backend (Firebase)

| Service | Purpose |
|---------|---------|
| Firebase Authentication | User auth (Email, Google) |
| Cloud Firestore | NoSQL database |
| Cloud Functions (Node.js 20) | Serverless backend logic |
| Firebase Hosting | Web app hosting with CDN |
| Cloud Scheduler | Daily sync jobs |

### External Services

| Service | Purpose |
|---------|---------|
| Enable Banking | PSD2 bank connection API |

### Development Tools

| Tool | Purpose |
|------|---------|
| ESLint | Code linting |
| Prettier | Code formatting |
| Vitest | Unit testing |
| Playwright | E2E testing |
| GitHub Actions | CI/CD |

---

## 9. Security & Configuration

### Authentication

**Supported Methods:**
- Email + Password (Firebase Auth)
- Google Sign-In (Firebase Auth)

**Session Management:**
- Firebase handles session tokens
- Auto-refresh of tokens
- Logout clears all local state

### Authorization (Firestore Rules)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;

      match /transactions/{transactionId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }

      match /categories/{categoryId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }

      match /rules/{ruleId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

### Environment Variables

```bash
# .env.local (frontend - public)
VITE_FIREBASE_API_KEY=xxx
VITE_FIREBASE_AUTH_DOMAIN=xxx.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=xxx
VITE_FIREBASE_STORAGE_BUCKET=xxx.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=xxx
VITE_FIREBASE_APP_ID=xxx

# Firebase Functions environment (secret)
ENABLE_BANKING_CLIENT_ID=xxx
ENABLE_BANKING_CLIENT_SECRET=xxx
ENABLE_BANKING_REDIRECT_URI=https://app.freelunch.app/callback
```

### Security Scope

**In Scope (MVP):**
- ✅ User authentication required for all features
- ✅ Users can only access their own data (Firestore rules)
- ✅ HTTPS only (Firebase Hosting enforced)
- ✅ Bank credentials never touch our servers (OAuth flow)
- ✅ Sensitive config in environment variables
- ✅ Input validation on all forms

**Out of Scope (MVP):**
- ❌ Two-factor authentication
- ❌ Account recovery via SMS
- ❌ Audit logging
- ❌ Rate limiting (beyond Firebase defaults)
- ❌ Penetration testing

### GDPR Compliance

- Users can export all their data (Data Portability)
- Users can delete their account (Right to Erasure)
- Clear privacy policy explaining data usage
- No selling or sharing of user data
- Data stored in EU (Firebase europe-west1)

---

## 10. API Specification

### Enable Banking Integration

The app integrates with Enable Banking's Accounts API for PSD2-compliant bank connections.

**Authentication Flow:**

```
┌─────────────┐     ┌───────────────┐     ┌─────────────┐     ┌──────────┐
│  Free Lunch │     │Enable Banking │     │  ABN AMRO   │     │   User   │
└──────┬──────┘     └───────┬───────┘     └──────┬──────┘     └────┬─────┘
       │                    │                    │                  │
       │ 1. Init session    │                    │                  │
       │ ──────────────────>│                    │                  │
       │                    │                    │                  │
       │ 2. Auth URL        │                    │                  │
       │ <──────────────────│                    │                  │
       │                    │                    │                  │
       │ 3. Redirect user   │                    │                  │
       │ ───────────────────────────────────────────────────────────>
       │                    │                    │                  │
       │                    │ 4. User authenticates                 │
       │                    │ <──────────────────────────────────────
       │                    │                    │                  │
       │ 5. Callback with code                   │                  │
       │ <───────────────────────────────────────────────────────────
       │                    │                    │                  │
       │ 6. Exchange code   │                    │                  │
       │ ──────────────────>│                    │                  │
       │                    │                    │                  │
       │ 7. Access token    │                    │                  │
       │ <──────────────────│                    │                  │
       │                    │                    │                  │
       │ 8. Fetch accounts  │                    │                  │
       │ ──────────────────>│                    │                  │
       │                    │                    │                  │
       │ 9. Account data    │                    │                  │
       │ <──────────────────│                    │                  │
```

**Key Endpoints (Enable Banking):**

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/sessions` | POST | Create auth session |
| `/sessions/{id}/authorize` | GET | Get bank auth URL |
| `/sessions/{id}/accounts` | GET | List connected accounts |
| `/accounts/{id}/transactions` | GET | Fetch transactions |

### Internal Cloud Functions API

**Sync Transactions:**
```typescript
// POST /syncTransactions
// Called by scheduler or manual trigger
{
  userId: string;
}

// Response
{
  success: boolean;
  newTransactions: number;
  updatedTransactions: number;
  errors: string[];
}
```

**Categorize Transaction:**
```typescript
// POST /categorize
// Called after transaction import
{
  transactionId: string;
  description: string;
  amount: number;
  counterparty: string | null;
}

// Response
{
  categoryId: string;
  confidence: number;
  source: 'rule' | 'merchant_db' | 'ml';
}
```

---

## 11. Testing Strategy

### Testing Philosophy

We follow the **Testing Trophy** approach (Kent C. Dodds): prioritize integration tests that provide the best confidence-to-effort ratio, supplemented by unit tests for complex logic and E2E tests for critical user journeys.

```
        ╱╲
       ╱  ╲         E2E Tests (Playwright)
      ╱────╲        - Critical user flows
     ╱      ╲       - 5-10 key scenarios
    ╱────────╲
   ╱          ╲     Integration Tests (Vitest + Testing Library)
  ╱────────────╲    - Component + hook behavior
 ╱              ╲   - API mocking
╱────────────────╲
        ▓▓        Unit Tests (Vitest)
        ▓▓        - Pure functions
        ▓▓        - Categorization logic
        ▓▓        - Utilities
```

### Test Levels

#### Unit Tests (Vitest)

**Scope:** Pure functions, utilities, business logic with no side effects.

**What to Test:**
- Categorization matching algorithm
- Amount formatting and currency utilities
- Date range calculations
- Transaction splitting validation
- Reimbursement matching logic
- Firestore data transformations

**Example:**
```typescript
// src/lib/__tests__/categorizer.test.ts
import { describe, it, expect } from 'vitest';
import { matchMerchant, calculateConfidence } from '../categorizer';

describe('matchMerchant', () => {
  it('matches Albert Heijn to groceries', () => {
    const result = matchMerchant('ALBERT HEIJN 1234 AMSTERDAM');
    expect(result.categoryId).toBe('groceries');
    expect(result.confidence).toBeGreaterThan(0.9);
  });

  it('returns null for unknown merchants', () => {
    const result = matchMerchant('RANDOM SHOP XYZ');
    expect(result).toBeNull();
  });
});

describe('splitValidation', () => {
  it('validates splits equal original amount', () => {
    const splits = [
      { amount: 65.00, categoryId: 'groceries' },
      { amount: 20.50, categoryId: 'household' },
    ];
    expect(validateSplits(85.50, splits)).toBe(true);
  });

  it('rejects splits that do not sum correctly', () => {
    const splits = [
      { amount: 50.00, categoryId: 'groceries' },
      { amount: 20.00, categoryId: 'household' },
    ];
    expect(validateSplits(85.50, splits)).toBe(false);
  });
});
```

**Tools:**
- `vitest` - Test runner
- `@vitest/coverage-v8` - Coverage reporting

**Commands:**
```bash
npm run test           # Run all unit tests
npm run test:watch     # Watch mode during development
npm run test:coverage  # Generate coverage report
```

---

#### Integration Tests (Vitest + React Testing Library)

**Scope:** React components, hooks, and their interactions with mocked services.

**What to Test:**
- Component rendering and user interactions
- Form submissions and validation
- State management (contexts, hooks)
- API call flows with mocked responses
- Error states and loading states

**Example:**
```typescript
// src/components/transactions/__tests__/TransactionList.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { TransactionList } from '../TransactionList';
import { TransactionProvider } from '@/contexts/TransactionContext';

// Mock Firestore
vi.mock('@/lib/firebase', () => ({
  db: {},
  collection: vi.fn(),
  query: vi.fn(),
}));

const mockTransactions = [
  {
    id: '1',
    description: 'Albert Heijn',
    amount: -45.50,
    date: new Date('2026-01-15'),
    categoryId: 'groceries',
  },
];

describe('TransactionList', () => {
  it('renders transactions correctly', async () => {
    render(
      <TransactionProvider initialData={mockTransactions}>
        <TransactionList />
      </TransactionProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Albert Heijn')).toBeInTheDocument();
      expect(screen.getByText('-€45.50')).toBeInTheDocument();
    });
  });

  it('filters by category when clicked', async () => {
    render(
      <TransactionProvider initialData={mockTransactions}>
        <TransactionList />
      </TransactionProvider>
    );

    const categoryFilter = screen.getByRole('combobox', { name: /category/i });
    fireEvent.change(categoryFilter, { target: { value: 'groceries' } });

    await waitFor(() => {
      expect(screen.getByText('Albert Heijn')).toBeInTheDocument();
    });
  });

  it('opens split dialog when split button clicked', async () => {
    render(
      <TransactionProvider initialData={mockTransactions}>
        <TransactionList />
      </TransactionProvider>
    );

    const splitButton = screen.getByRole('button', { name: /split/i });
    fireEvent.click(splitButton);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Split Transaction')).toBeInTheDocument();
    });
  });
});
```

**Tools:**
- `@testing-library/react` - Component testing
- `@testing-library/user-event` - User interaction simulation
- `msw` (Mock Service Worker) - API mocking

**Firebase Mocking Strategy:**
```typescript
// src/test/mocks/firebase.ts
import { vi } from 'vitest';

export const mockFirestore = {
  collection: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  addDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  onSnapshot: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
};

vi.mock('firebase/firestore', () => mockFirestore);
```

---

#### End-to-End Tests (Playwright)

**Scope:** Critical user journeys through the real application.

**What to Test:**
- User registration and login
- Bank connection flow (mocked Enable Banking)
- Transaction categorization workflow
- Split transaction workflow
- Reimbursement workflow (mark → clear)
- Dashboard data accuracy
- Data export

**Test Scenarios:**

| Scenario | Priority | Description |
|----------|----------|-------------|
| `auth.spec.ts` | P0 | Register, login, logout, password reset |
| `bank-connection.spec.ts` | P0 | Connect bank, sync transactions |
| `transactions.spec.ts` | P0 | View, filter, search, categorize |
| `split-transaction.spec.ts` | P1 | Split and verify totals |
| `reimbursement.spec.ts` | P1 | Mark, clear, verify exclusion |
| `dashboard.spec.ts` | P1 | Charts render, totals correct |
| `categories.spec.ts` | P2 | Create, edit, delete, reassign |
| `export.spec.ts` | P2 | CSV and JSON export |

**Example:**
```typescript
// e2e/transactions.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Transaction Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login with test account
    await page.goto('/login');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'testpassword123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/dashboard');
  });

  test('can view and filter transactions', async ({ page }) => {
    await page.goto('/transactions');

    // Verify transactions load
    await expect(page.locator('.transaction-row')).toHaveCount.greaterThan(0);

    // Filter by category
    await page.click('[data-testid="category-filter"]');
    await page.click('text=Groceries');

    // Verify filter applied
    const rows = page.locator('.transaction-row');
    for (const row of await rows.all()) {
      await expect(row.locator('.category-badge')).toHaveText('Groceries');
    }
  });

  test('can categorize a transaction', async ({ page }) => {
    await page.goto('/transactions');

    // Find uncategorized transaction
    const uncategorized = page.locator('.transaction-row:has-text("Uncategorized")').first();
    await uncategorized.click();

    // Change category
    await page.click('[data-testid="category-picker"]');
    await page.click('text=Groceries');
    await page.click('button:has-text("Save")');

    // Verify category updated
    await expect(uncategorized.locator('.category-badge')).toHaveText('Groceries');
  });

  test('can split a transaction', async ({ page }) => {
    await page.goto('/transactions');

    // Click split on a transaction
    const transaction = page.locator('.transaction-row').first();
    await transaction.locator('[data-testid="split-button"]').click();

    // Fill split form
    await page.fill('[data-testid="split-amount-0"]', '50.00');
    await page.click('[data-testid="split-category-0"]');
    await page.click('text=Groceries');

    await page.click('button:has-text("Add Split")');
    await page.fill('[data-testid="split-amount-1"]', '35.50');
    await page.click('[data-testid="split-category-1"]');
    await page.click('text=Household');

    await page.click('button:has-text("Save")');

    // Verify split indicator shown
    await expect(transaction.locator('[data-testid="split-indicator"]')).toBeVisible();
  });
});
```

**Playwright Configuration:**
```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});
```

**Commands:**
```bash
npm run e2e              # Run all E2E tests
npm run e2e:headed       # Run with browser visible
npm run e2e:debug        # Debug mode
npm run e2e:report       # Open HTML report
```

---

### Test Data Management

**Firebase Emulator for Testing:**
```bash
# Start Firebase emulators for local testing
firebase emulators:start --only auth,firestore,functions

# Run tests against emulators
FIRESTORE_EMULATOR_HOST=localhost:8080 npm run test
```

**Test Fixtures:**
```typescript
// src/test/fixtures/transactions.ts
export const testTransactions = [
  {
    id: 'tx-001',
    externalId: 'abn-12345',
    description: 'ALBERT HEIJN 1234 AMSTERDAM',
    amount: -85.50,
    date: new Date('2026-01-15'),
    categoryId: 'groceries',
    categorySource: 'auto',
    categoryConfidence: 0.95,
  },
  {
    id: 'tx-002',
    externalId: 'abn-12346',
    description: 'NS TREINREIS',
    amount: -25.00,
    date: new Date('2026-01-14'),
    categoryId: 'transport.public',
    categorySource: 'auto',
    categoryConfidence: 0.98,
  },
  // ... more fixtures
];
```

**Seeding Test Database:**
```typescript
// e2e/setup/seed-database.ts
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { testTransactions } from './fixtures/transactions';
import { testCategories } from './fixtures/categories';

export async function seedTestUser(userId: string) {
  const db = getFirestore();

  // Create user document
  await db.doc(`users/${userId}`).set({
    email: 'test@example.com',
    displayName: 'Test User',
    createdAt: new Date(),
  });

  // Seed categories
  for (const category of testCategories) {
    await db.doc(`users/${userId}/categories/${category.id}`).set(category);
  }

  // Seed transactions
  for (const transaction of testTransactions) {
    await db.doc(`users/${userId}/transactions/${transaction.id}`).set(transaction);
  }
}
```

---

### Coverage Requirements

| Area | Target Coverage | Rationale |
|------|-----------------|-----------|
| Categorization logic | > 90% | Core business logic, critical |
| Utility functions | > 80% | Reused across app |
| React components | > 60% | Integration tests cover behavior |
| API/Firebase code | > 50% | Mocked in most tests |
| Overall | > 70% | Balance of coverage and velocity |

---

### CI/CD Testing Pipeline

```yaml
# .github/workflows/test.yml
name: Test

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v3

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npx playwright install --with-deps
      - name: Start Firebase Emulators
        run: |
          npm install -g firebase-tools
          firebase emulators:start --only auth,firestore &
          sleep 10
      - run: npm run e2e
        env:
          E2E_BASE_URL: http://localhost:5173
          FIRESTORE_EMULATOR_HOST: localhost:8080
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

---

## 12. Environment & Deployment

### Environment Overview

| Environment | Purpose | URL | Firebase Project |
|-------------|---------|-----|------------------|
| **Local** | Development | `localhost:5173` | Emulators |
| **Preview** | PR previews | `pr-123--free-lunch.web.app` | `free-lunch-dev` |
| **Staging** | Pre-production testing | `staging.freelunch.app` | `free-lunch-staging` |
| **Production** | Live users | `app.freelunch.app` | `free-lunch-prod` |

---

### Local Development

**Prerequisites:**
- Node.js 20.x
- npm 10.x
- Firebase CLI (`npm install -g firebase-tools`)
- Java 11+ (for Firebase Emulators)

**Setup:**
```bash
# Clone repository
git clone https://github.com/your-username/free-lunch.git
cd free-lunch

# Install dependencies
npm install
cd functions && npm install && cd ..

# Copy environment template
cp .env.example .env.local

# Start Firebase emulators
firebase emulators:start

# In another terminal, start dev server
npm run dev
```

**Environment Variables (Local):**
```bash
# .env.local
VITE_FIREBASE_API_KEY=demo-api-key
VITE_FIREBASE_AUTH_DOMAIN=localhost
VITE_FIREBASE_PROJECT_ID=demo-project
VITE_FIREBASE_STORAGE_BUCKET=demo-bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=123456
VITE_FIREBASE_APP_ID=demo-app-id

# Use emulators
VITE_USE_EMULATORS=true
VITE_EMULATOR_AUTH_URL=http://localhost:9099
VITE_EMULATOR_FIRESTORE_HOST=localhost:8080
VITE_EMULATOR_FUNCTIONS_URL=http://localhost:5001
```

**Emulator Configuration:**
```json
// firebase.json
{
  "emulators": {
    "auth": {
      "port": 9099
    },
    "firestore": {
      "port": 8080
    },
    "functions": {
      "port": 5001
    },
    "ui": {
      "enabled": true,
      "port": 4000
    }
  }
}
```

---

### Preview Environments (PR Previews)

**Trigger:** Every pull request automatically gets a preview deployment.

**Configuration:**
```yaml
# .github/workflows/preview.yml
name: Preview Deployment

on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  preview:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run build
        env:
          VITE_FIREBASE_PROJECT_ID: free-lunch-dev
          # ... other env vars
      - uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: '${{ secrets.GITHUB_TOKEN }}'
          firebaseServiceAccount: '${{ secrets.FIREBASE_SERVICE_ACCOUNT_DEV }}'
          projectId: free-lunch-dev
          channelId: 'pr-${{ github.event.pull_request.number }}'
```

**Features:**
- Unique URL per PR (e.g., `pr-42--free-lunch.web.app`)
- Uses dev Firebase project (separate data)
- Auto-deletes when PR is merged/closed
- Enable Banking in sandbox mode

---

### Staging Environment

**Purpose:** Final testing before production release.

**Differences from Production:**
- Uses `free-lunch-staging` Firebase project
- Enable Banking in sandbox mode
- Test bank accounts available
- Synthetic test data for demos

**Deployment:**
```bash
# Deploy to staging (manual)
npm run deploy:staging

# Or via GitHub Actions on merge to develop branch
```

**Staging-Specific Config:**
```bash
# .env.staging
VITE_FIREBASE_PROJECT_ID=free-lunch-staging
VITE_ENABLE_BANKING_SANDBOX=true
VITE_SENTRY_ENVIRONMENT=staging
```

---

### Production Environment

**Deployment Strategy:** Continuous Deployment from `main` branch.

**Deployment Pipeline:**
```yaml
# .github/workflows/deploy-production.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run test
      - run: npm run e2e

  deploy:
    needs: test
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run build
        env:
          VITE_FIREBASE_PROJECT_ID: free-lunch-prod
          VITE_ENABLE_BANKING_SANDBOX: false
          VITE_SENTRY_DSN: ${{ secrets.SENTRY_DSN }}
      - uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          firebaseServiceAccount: '${{ secrets.FIREBASE_SERVICE_ACCOUNT_PROD }}'
          projectId: free-lunch-prod
          channelId: live
      - name: Deploy Cloud Functions
        run: firebase deploy --only functions --project free-lunch-prod
        env:
          FIREBASE_TOKEN: ${{ secrets.FIREBASE_TOKEN }}
```

**Production Environment Variables:**
```bash
# Set via Firebase Functions config (secrets)
firebase functions:secrets:set ENABLE_BANKING_CLIENT_ID
firebase functions:secrets:set ENABLE_BANKING_CLIENT_SECRET

# Accessible in functions via process.env
```

---

### Firebase Project Setup

**Create Projects:**
```bash
# Development
firebase projects:create free-lunch-dev

# Staging
firebase projects:create free-lunch-staging

# Production
firebase projects:create free-lunch-prod
```

**Firestore Indexes:**
```json
// firestore.indexes.json
{
  "indexes": [
    {
      "collectionGroup": "transactions",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "date", "order": "DESCENDING" },
        { "fieldPath": "categoryId", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "transactions",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "reimbursement.status", "order": "ASCENDING" },
        { "fieldPath": "date", "order": "DESCENDING" }
      ]
    }
  ]
}
```

**Firestore Security Rules Deployment:**
```bash
firebase deploy --only firestore:rules --project free-lunch-prod
```

---

### Monitoring & Observability

**Error Tracking (Sentry):**
```typescript
// src/lib/sentry.ts
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.VITE_SENTRY_ENVIRONMENT || 'development',
  integrations: [
    Sentry.browserTracingIntegration(),
  ],
  tracesSampleRate: 0.1,
});
```

**Firebase Performance Monitoring:**
```typescript
// src/lib/firebase.ts
import { getPerformance } from 'firebase/performance';

const perf = getPerformance(app);
```

**Uptime Monitoring:**
- Use Firebase Hosting built-in metrics
- Optional: UptimeRobot or similar for external monitoring

---

### Rollback Procedure

**Quick Rollback (Firebase Hosting):**
```bash
# List recent deployments
firebase hosting:channel:list --project free-lunch-prod

# Rollback to previous version
firebase hosting:rollback --project free-lunch-prod
```

**Full Rollback (including Functions):**
```bash
# Revert to previous git tag
git checkout v1.0.0
npm ci
npm run build
firebase deploy --project free-lunch-prod
```

---

### Domain & SSL

**Custom Domain Setup:**
1. Add domain in Firebase Console → Hosting → Custom domains
2. Verify ownership via DNS TXT record
3. Update DNS A/AAAA records to Firebase IPs
4. SSL certificate auto-provisioned by Firebase

**DNS Configuration:**
```
app.freelunch.app    A      199.36.158.100
app.freelunch.app    AAAA   2607:f8b0:4004:800::2004
```

---

## 13. Success Criteria

### MVP Success Definition

The MVP is successful when:
1. A user can connect their ABN AMRO account
2. Transactions are automatically imported and categorized
3. User can create custom categories and re-categorize transactions
4. User can split transactions and track reimbursements
5. Dashboard provides clear spending insights
6. App performs well (<2s initial load, <500ms interactions)

### Functional Requirements

**Bank Connection:**
- ✅ User can connect ABN AMRO account via OAuth flow
- ✅ Connection status visible in settings
- ✅ Manual "Sync Now" button works
- ✅ Daily automatic sync runs without user action
- ✅ Handles expired consent gracefully (prompts re-auth)

**Transaction Management:**
- ✅ All transactions display with date, description, amount
- ✅ Search and filter works across all transactions
- ✅ Category assignment persists correctly
- ✅ Split transactions calculate correctly
- ✅ Reimbursement workflow completes end-to-end

**Categories:**
- ✅ User can create, edit, delete categories
- ✅ Hierarchical categories display correctly
- ✅ Default categories provided on signup
- ✅ Deleting category prompts for transaction reassignment

**Dashboard:**
- ✅ Summary shows correct totals for selected period
- ✅ Charts render without errors
- ✅ Date range changes update all components
- ✅ Category click filters transactions

### Quality Indicators

| Metric | Target |
|--------|--------|
| Initial page load | < 2 seconds |
| Interaction response | < 500ms |
| Lighthouse Performance | > 80 |
| Lighthouse Accessibility | > 90 |
| Test coverage | > 70% |
| Uptime | > 99% |

### User Experience Goals

- User can understand their spending in < 30 seconds from opening app
- New user can complete bank connection in < 3 minutes
- Zero training required - intuitive for anyone who used Grip
- Works well on both desktop and mobile browsers

---

## 14. Implementation Phases

### Phase 1: Foundation (Weeks 1-2)

**Goal:** Set up project infrastructure and basic app shell.

**Deliverables:**
- ✅ Repository setup with Vite + React + TypeScript
- ✅ Tailwind CSS and shadcn/ui configured
- ✅ Firebase project created (Auth, Firestore, Functions, Hosting)
- ✅ Basic routing (Login, Dashboard, Transactions, Settings)
- ✅ Authentication flow (Email + Google)
- ✅ Design system document created
- ✅ CI/CD pipeline with GitHub Actions

**Validation:**
- User can register, login, and logout
- App deploys to Firebase Hosting
- All pages render with placeholder content

---

### Phase 2: Core Features (Weeks 3-5)

**Goal:** Implement transaction management and categorization.

**Deliverables:**
- ✅ Firestore data models implemented
- ✅ Category management (CRUD, hierarchy)
- ✅ Manual transaction entry (for testing without bank)
- ✅ Transaction list with search/filter
- ✅ Category assignment on transactions
- ✅ Auto-categorization engine (rules + merchant DB)
- ✅ Transaction splitting UI and logic
- ✅ Default category set on user creation

**Validation:**
- User can create custom category hierarchy
- Transactions can be categorized and split
- Auto-categorization works for common Dutch merchants

---

### Phase 3: Bank Integration (Weeks 6-7)

**Goal:** Connect to ABN AMRO via Enable Banking.

**Deliverables:**
- ✅ Enable Banking account setup and API integration
- ✅ OAuth flow for bank connection
- ✅ Transaction import from bank
- ✅ Duplicate detection and handling
- ✅ Scheduled daily sync (Cloud Scheduler)
- ✅ Manual "Sync Now" functionality
- ✅ Consent expiry handling and re-auth flow

**Validation:**
- User can connect real ABN AMRO account
- Historical transactions import correctly
- Daily sync brings in new transactions
- No duplicate transactions created

---

### Phase 4: Dashboard & Reimbursements (Weeks 8-9)

**Goal:** Complete dashboard and reimbursement tracking.

**Deliverables:**
- ✅ Dashboard summary cards
- ✅ Spending by category chart
- ✅ Spending over time chart
- ✅ Date range selector
- ✅ Reimbursement marking workflow
- ✅ Reimbursement clearing/matching
- ✅ Dashboard exclusion of pending reimbursements
- ✅ Data export (CSV, JSON)

**Validation:**
- Dashboard accurately reflects transaction data
- Reimbursement workflow works end-to-end
- Export produces valid, complete files

---

### Phase 5: Polish & Launch (Weeks 10-11)

**Goal:** Bug fixes, performance optimization, launch preparation.

**Deliverables:**
- ✅ Performance optimization (lazy loading, virtualization)
- ✅ Error handling and user feedback
- ✅ Empty states and onboarding
- ✅ Responsive design testing
- ✅ Accessibility audit and fixes
- ✅ Privacy policy and terms of service
- ✅ README and documentation
- ✅ Beta testing with 5-10 users
- ✅ Bug fixes from beta feedback
- ✅ Production deployment

**Validation:**
- Lighthouse scores meet targets
- No critical bugs from beta testing
- App works on Chrome, Firefox, Safari, Edge
- Works on mobile browsers

---

## 15. Future Considerations

### Post-MVP Enhancements (v2.0)

| Feature | Priority | Complexity |
|---------|----------|------------|
| Budget setting and alerts | High | Medium |
| Fixed costs / subscription tracking | High | Medium |
| ICS credit card support | High | Low |
| Additional Dutch banks (ING, Rabobank) | High | Medium |
| Native mobile app (React Native) | Medium | High |
| Predictions / forecasting | Medium | High |
| Tags system (in addition to categories) | Medium | Low |
| Recurring transaction detection | Medium | Medium |
| Dark mode | Low | Low |
| Multi-currency | Low | Medium |

### Integration Opportunities

- **Firefly III Export:** Generate Firefly III-compatible import files
- **YNAB Export:** Export in YNAB format for users switching
- **Home Assistant:** Webhook notifications for large transactions
- **Notion/Sheets:** Export spending summaries

### Advanced Features (v3.0+)

- **Shared Households:** Multiple users sharing finances
- **Savings Goals:** Track progress toward financial goals
- **Bill Negotiation:** Identify subscriptions that can be optimized
- **Investment Tracking:** Connect to investment accounts
- **Tax Helper:** Categorize deductible expenses for tax filing

---

## 16. Risks & Mitigations

### Risk 1: Enable Banking API Access

**Risk:** Enable Banking may change pricing, limit free tier, or discontinue personal use access (like GoCardless/Salt Edge did).

**Impact:** High - Core functionality depends on bank sync

**Mitigation:**
- Design with abstraction layer for bank providers
- Document alternative providers (GoCardless if existing account, Tink trial)
- Implement robust CSV import as fallback
- Consider building direct PSD2 connector long-term

---

### Risk 2: PSD2 Consent Expiry

**Risk:** PSD2 requires re-authentication every 90 days. Users may churn if this is annoying.

**Impact:** Medium - UX friction

**Mitigation:**
- Send email reminder 7 days before expiry
- Make re-auth flow as smooth as possible
- Clearly explain why re-auth is needed (EU regulation)
- Track consent expiry dates prominently

---

### Risk 3: Auto-Categorization Accuracy

**Risk:** Poor categorization accuracy leads to user frustration and manual work.

**Impact:** Medium - Core value proposition affected

**Mitigation:**
- Start with curated Dutch merchant database (high confidence)
- Make correction flow very easy (one click)
- Learn from corrections immediately
- Show confidence level on auto-categorized transactions
- Allow users to "train" on bulk transactions

---

### Risk 4: Firebase Costs at Scale

**Risk:** If app becomes popular, Firebase costs could grow significantly.

**Impact:** Medium - Sustainability concern

**Mitigation:**
- Optimize Firestore reads with caching
- Use Firebase Blaze plan only when needed
- Set up billing alerts
- Design for potential migration to self-hosted if needed
- Consider implementing read quotas per user

---

### Risk 5: Competition from Banks

**Risk:** ABN AMRO or other banks improve their built-in finance tools, reducing need for Free Lunch.

**Impact:** Low - Banks are slow, we offer cross-bank view

**Mitigation:**
- Differentiate on custom categories and reimbursements
- Focus on features banks won't build (open source, export)
- Build community around project
- Multi-bank support makes us valuable regardless

---

## 17. Appendix

### A. Related Documents

| Document | Location |
|----------|----------|
| Design System | `.claude/reference/free-lunch-design-system.md` |
| Research Notes | (Grip app research from PRD creation) |

### B. Key Dependencies

| Dependency | Documentation |
|------------|---------------|
| Enable Banking | https://enablebanking.com/docs/ |
| Firebase | https://firebase.google.com/docs |
| shadcn/ui | https://ui.shadcn.com/ |
| Recharts | https://recharts.org/ |
| TanStack Query | https://tanstack.com/query/ |

### C. Dutch Merchant Database (Initial)

```typescript
const DUTCH_MERCHANTS: Record<string, string> = {
  // Groceries
  'ALBERT HEIJN': 'groceries',
  'JUMBO': 'groceries',
  'LIDL': 'groceries',
  'ALDI': 'groceries',
  'PLUS': 'groceries',
  'DIRK': 'groceries',
  'COOP': 'groceries',

  // Transport
  'NS ': 'transport.public',
  'GVB': 'transport.public',
  'RET': 'transport.public',
  'HTM': 'transport.public',
  'SHELL': 'transport.fuel',
  'BP ': 'transport.fuel',
  'ESSO': 'transport.fuel',
  'TINQ': 'transport.fuel',
  'TANGO': 'transport.fuel',

  // Shopping
  'BOL.COM': 'shopping.general',
  'HEMA': 'shopping.general',
  'IKEA': 'shopping.home',
  'ACTION': 'shopping.general',
  'COOLBLUE': 'shopping.electronics',
  'MEDIAMARKT': 'shopping.electronics',

  // Food & Drink
  'THUISBEZORGD': 'food.restaurants',
  'UBER EATS': 'food.restaurants',
  'DELIVEROO': 'food.restaurants',
  'MCDONALDS': 'food.restaurants',
  'STARBUCKS': 'food.coffee',

  // Health
  'KRUIDVAT': 'health.pharmacy',
  'ETOS': 'health.pharmacy',
  'APOTHEEK': 'health.pharmacy',

  // Entertainment
  'NETFLIX': 'entertainment',
  'SPOTIFY': 'entertainment',
  'PATHE': 'entertainment',

  // Utilities
  'VATTENFALL': 'housing.utilities',
  'ENECO': 'housing.utilities',
  'ESSENT': 'housing.utilities',
  'KPN': 'housing.utilities',
  'VODAFONE': 'housing.utilities',
  'T-MOBILE': 'housing.utilities',
  'ZIGGO': 'housing.utilities',
};
```

### D. Glossary

| Term | Definition |
|------|------------|
| **PSD2** | EU Payment Services Directive 2 - regulation enabling open banking |
| **AISP** | Account Information Service Provider - licensed to access bank data |
| **Reimbursable** | Expense paid by user that will be paid back by employer or other person |
| **Split Transaction** | Single bank transaction divided into multiple category allocations |
| **Consent** | User authorization for app to access bank data (expires per PSD2) |

---

*Document Version: 1.0*
*Created: January 2026*
*Last Updated: January 2026*
