# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Free Lunch is a personal finance management app for the Netherlands market. It connects to ABN AMRO via Enable Banking API, auto-categorizes transactions, and provides spending insights. Built with React 19, Firebase, and Tailwind CSS.

## Key Documentation

- **PRD.md** - Full product requirements document with user stories, feature specs, data models, API specs, and implementation phases
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
- **TanStack Query** for server state (5-minute stale time default)
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
- Build uses manual chunks: vendor, firebase, charts, ui

## Data Model

Firestore collections are user-scoped under `users/{userId}/`:

- **transactions** - Bank transactions with categorization, splits, reimbursement info
- **categories** - Hierarchical categories with parentId references
- **rules** - Categorization rules (pattern matching, learned from corrections)

Key transaction fields: `categoryId`, `categorySource` (auto/manual/rule), `isSplit`, `splits[]`, `reimbursement` (type, status, linkedTransactionId)

## Testing

- **Unit tests**: Vitest with jsdom, test categorization logic and utilities
- **Integration tests**: React Testing Library, mock Firebase with `vi.mock()`
- **E2E tests**: Playwright, use Firebase emulators for isolated test data
- Test fixtures in `src/test/fixtures/`

## Code Style

- Functional components with hooks
- TanStack Query for all async data (avoid useEffect for fetching)
- Optimistic updates for user actions via mutation callbacks
- Use `clsx` for conditional Tailwind classes
