# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Free Lunch is a personal finance management app for the Netherlands market. It connects to ABN AMRO via Enable Banking API, auto-categorizes transactions, and provides spending insights. Built with React 19, Firebase, and Tailwind CSS.

## Key Documentation

- **docs/PRD.md** - Full product requirements document with user stories, feature specs, data models, API specs, and implementation phases
- **docs/TESTING.md** - How to test without touching prod: unit/functions/E2E layers, emulator-stack bootstrap (works in Claude's cloud sandbox too), and the verification policy Claude must follow before opening a PR
- **docs/PHONE_DEV_WORKFLOW.md** - How to develop with Claude from an iPhone (LAN emulator stack + Vite proxy + seeded test data). Trigger phrases: "phone dev", "test on my phone", "start the emulator stack". Login that fails after idle = background processes got reaped; restart the stack per that doc.
- **.claude/reference/free-lunch-design-system.md** - Comprehensive design system (colors, typography, components, accessibility)

## Commands

```bash
# Development
npm run dev                 # Start Vite dev server on port 5173
npm run firebase:emulators  # Start Firebase emulators (Auth, Firestore, Functions)

# Testing
npm run test                # Run Vitest unit tests
npm run test:watch          # Watch mode
npm run test:coverage       # Coverage report
npm run test src/hooks/__tests__/useTransactions.test.ts  # Run single test file
npm run e2e                 # Run Playwright E2E tests
npm run e2e:headed          # E2E with visible browser

# Code Quality
npm run lint                # ESLint
npm run lint:fix            # ESLint with auto-fix
npm run format              # Prettier format
npm run typecheck           # TypeScript check

# Build & Deploy
npm run build               # TypeScript compile + Vite build
npm run firebase:deploy     # Deploy all Firebase services
```

## Architecture

### Frontend Stack

- **React 19** with TypeScript and Vite
- **TanStack Query** for server state (stale times vary per query)
- **React Router v7** for routing with nested layouts
- **Tailwind CSS** with shadcn/ui components (Radix UI primitives)
- **React Hook Form + Zod** for forms and validation

### Backend (Firebase)

- **Firebase Auth** - Email/password and Google sign-in
- **Cloud Firestore** - NoSQL database with user-scoped collections
- **Cloud Functions** - Bank sync, auto-categorization, scheduled jobs
- **Firebase Hosting** - Static hosting with CDN

### Key Patterns

- Path alias `@/` maps to `src/`
- Auth state managed via `AuthContext` with `useAuth()` hook
- Protected routes wrap content in `ProtectedRoute` component
- Date range selection via `MonthContext` with `useMonth()` hook - components read selected month for filtering
- Transaction mutations are in `src/hooks/useTransactionMutations.ts`, queries in `src/hooks/useTransactions.ts`
- Merchant data lives in `src/data/merchantGroups.ts`, shared utility functions in `src/lib/`
- Build uses manual chunks: vendor, firebase, charts, ui
- Firebase emulator UI available at `http://localhost:4000` when running emulators

## Data Model

Firestore collections are user-scoped under `users/{userId}/`:

- **transactions** - Bank transactions with categorization, splits, reimbursement info
- **categories** - Hierarchical categories with parentId references
- **rules** - Categorization rules (pattern matching, learned from corrections)

Key transaction fields: `categoryId`, `categorySource` (auto/manual/rule), `isSplit`, `splits[]`, `reimbursement` (type, status, linkedTransactionId)

## Testing

- **Unit tests**: Vitest with jsdom, test categorization logic and utilities
- **Integration tests**: React Testing Library, mock Firebase with `vi.mock()`
- **E2E tests**: Playwright against the Firebase emulators (Auth + Firestore + Functions). Login uses the seeded user from `scripts/seed-emulator.mjs`; specs stage their own data through `e2e/fixtures/emulator.ts` (emulator REST APIs, `e2e-`-prefixed doc IDs). Full bootstrap + sandbox notes in **docs/TESTING.md**.
- The transactions list is virtualized — E2E specs find rows via the search box, never by scrolling.

### Verification policy (Claude: do this before every PR)

The user's expectation is that reviewing/approving the PR is their **only**
step — Claude runs all verification first, in the sandbox, against the
emulator stack (never prod):

1. `npm run typecheck` + `npm run lint` clean on touched files
2. `npm run test -- --run` green (known env-dependent exception: `useCategories.test.ts` needs Firebase env config)
3. UI or Cloud Functions changes: boot emulators (`--project demo-freelunch`), seed, run `npm run e2e` (in the sandbox: `PLAYWRIGHT_CHROMIUM_PATH=/opt/pw-browsers/chromium`, `--workers=2`), and drive the changed flow once in the browser — attach screenshots to the PR
4. State in the PR body exactly what was run and what passed; ship new user-visible flows with an E2E spec and semantic fixes with a pinning unit test

## Code Style

- Functional components with hooks
- TanStack Query for all async data (avoid useEffect for fetching)
- Optimistic updates for user actions via mutation callbacks
- Use `clsx` for conditional Tailwind classes
