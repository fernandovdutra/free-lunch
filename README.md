# Free Lunch

A free, open-source personal finance app for the Netherlands, inspired by the beloved Grip app.
It syncs your bank over PSD2, categorizes transactions automatically, and turns them into
budgets, spending analytics, wealth tracking and AI insights.

## Features

**Money in**

- **Bank sync (PSD2)** — connect Dutch banks via Enable Banking; scheduled sync four times daily
  plus manual sync. Writes are idempotent, so repeated or overlapping syncs never duplicate
  transactions, and per-account failures surface on the connection instead of being swallowed.
- **ICS credit-card import** — import a statement PDF, break it down by category, and reconcile
  the lump-sum direct debit against the statement.

**Making sense of it**

- **3-tier categorization** — user rules, a curated merchant database, then Claude as fallback,
  with confidence scores. Transactions the AI step fails on are flagged for review with a retry.
- **Hierarchical categories**, custom to your mental model.
- **Split transactions** — divide a purchase across categories; analytics credit each split.
- **Tags** — free-form tags with suggestions and filtering, shared with the MCP tools.
- **Reimbursement tracking** — work expenses and personal IOUs, cleared against income.

**Seeing it**

- **Dashboard** — spend card, burn-up, category breakdown, projection, recent activity.
- **Spending Explorer** — category → subcategory → counterparty drill-down, for spending and income.
- **Counterparty analytics** — per-merchant patterns and a rolling 12-month view.
- **Budgets** with alert thresholds and history-based suggestions; **savings goals**;
  **fixed-cost detection**.
- **Wealth** — holdings, investment transactions and net worth with live market data and FX.
- **AI insights** — daily and weekly, with advisor memory for longer-term context.
- **Export** — CSV or JSON.

**Beyond the app**

- **Household sharing** — invite others as editor or viewer; invitations arrive by email.
- **Remote MCP server** — 21 tools so an AI assistant can query and update your finances.
- **PWA** — installable, with an offline indicator and route-level code splitting.

Full detail: **[`docs/FEATURES.md`](docs/FEATURES.md)**.

## Tech Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS
- **UI:** in-repo primitive kit (`src/components/redesign/`) over Radix / shadcn base components
- **State:** TanStack Query (server state, centralized key factory), React Context (auth, month)
- **Backend:** Firebase — Auth, Firestore, Cloud Functions, Hosting
- **Bank API:** Enable Banking (PSD2)
- **AI:** Anthropic Claude (categorization, insights)
- **Charts:** Recharts · **PDF:** pdfjs-dist · **Forms:** React Hook Form + Zod
- **Testing:** Vitest, React Testing Library, Playwright

## Getting Started

### Prerequisites

- Node.js 20+, npm 10+
- Firebase CLI (`npm install -g firebase-tools`)
- Java 11+ (for the Firebase emulators)

### Installation

```bash
git clone https://github.com/fernandovdutra/free-lunch.git
cd free-lunch

# Root and functions have SEPARATE dependency trees — install both.
npm install
npm install --prefix functions

# Frontend environment
cp .env.example .env.local

# Required for hook tests (see Testing below)
cp .env.test.example .env.test

npm run dev
```

### Development with Firebase emulators

```bash
npm run firebase:emulators   # Auth, Firestore, Functions
npm run dev                  # in another terminal
```

Emulator UI: `http://localhost:4000`. For developing against a phone on your LAN, see
[`docs/PHONE_DEV_WORKFLOW.md`](docs/PHONE_DEV_WORKFLOW.md).

## Testing

```bash
npm run test           # Vitest (frontend + functions unit tests)
npm run test:coverage  # coverage report
npm run e2e            # Playwright against the emulators
```

Two setup requirements that will otherwise cost you an afternoon:

1. **`npm install --prefix functions` is mandatory.** The functions tests run through the root
   Vitest include glob; without their own `node_modules` they fail in confusing ways.
2. **Hook tests need `.env.test`** — copy it from `.env.test.example`.

More detail in [`docs/TESTING.md`](docs/TESTING.md).

## Scripts

| Script                       | Description                       |
| ---------------------------- | --------------------------------- |
| `npm run dev`                | Vite dev server (port 5173)       |
| `npm run build`              | TypeScript compile + Vite build   |
| `npm run preview`            | Preview the production build      |
| `npm run typecheck`          | TypeScript check                  |
| `npm run lint` / `lint:fix`  | ESLint                            |
| `npm run format`             | Prettier                          |
| `npm run test` / `:watch` / `:coverage` | Vitest                 |
| `npm run e2e` / `e2e:headed` | Playwright E2E                    |
| `npm run firebase:emulators` | Start Firebase emulators          |
| `npm run firebase:deploy`    | Deploy all Firebase services      |

## CI/CD

- **`.github/workflows/quality.yml`** runs on every pull request: typecheck, lint, the full unit
  test suite, and a Cloud Functions compile.
- **`.github/workflows/deploy-hosting.yml`** deploys Firestore rules, functions and hosting on
  push to `main` — and depends on the quality workflow, so `main` cannot deploy red.

## Project Structure

```
src/
├── components/
│   ├── redesign/        # live primitive kit (rows, pills, sheets, headers)
│   ├── layout/          # AppLayout, TopBar, TabBar, side rail, error boundaries
│   ├── transactions/    # list, filters, edit sheet, category picker, split editor, tags
│   ├── dashboard/ budgets/ reimbursements/ spending/ analytics/ wealth/ settings/
│   └── ui/              # Radix / shadcn base components
├── pages/               # route pages incl. drill-downs and settings sub-pages
├── hooks/               # TanStack Query hooks (queries and mutations by domain)
├── lib/                 # Firebase init, query-key factory, date/month helpers, exports
├── contexts/            # AuthContext, MonthContext
├── data/                # merchant database
└── types/               # shared TypeScript types

functions/src/
├── handlers/            # callable and scheduled Cloud Functions
├── categorization/      # 3-tier engine (rules, merchant DB, LLM)
├── enableBanking/       # PSD2 integration
├── marketData/          # quotes, FX, benchmarks
├── mcp/                 # remote MCP server (21 tools)
├── shared/              # sync, aggregation, Amsterdam time, email, throttling
└── ARCHITECTURE.md      # tenancy model and known constraints
```

## Documentation

| Document | What it is |
| --- | --- |
| [`docs/FEATURES.md`](docs/FEATURES.md) | **What the app does today** — start here |
| [`functions/src/ARCHITECTURE.md`](functions/src/ARCHITECTURE.md) | Backend tenancy model and constraints |
| [`docs/TESTING.md`](docs/TESTING.md) | Test setup and strategy |
| [`docs/PHONE_DEV_WORKFLOW.md`](docs/PHONE_DEV_WORKFLOW.md) | Developing against a phone on your LAN |
| [`docs/ASSESSMENT.md`](docs/ASSESSMENT.md) | July 2026 repository assessment and roadmap |
| [`docs/PRD.md`](docs/PRD.md) | Historical MVP planning document (not current state) |
| [`docs/redesign/`](docs/redesign/) | Historical redesign plan and handoffs |

## License

MIT License — see [LICENSE](LICENSE).

---

**Free Lunch** — Know where your money went.
