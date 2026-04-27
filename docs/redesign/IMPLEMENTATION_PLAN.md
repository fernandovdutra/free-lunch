# Free Lunch UI Redesign — Implementation Plan

**Aesthetic:** Calm Terminal (see [README.md](design_handoff_freelunch_redesign/README.md)).
**Branch:** `ui-redesign` (based on `origin/main` @ `b886cd5`).
**Delivery:** phased commits on `ui-redesign`, single PR to `main` at the end.
**Form factor:** mobile mocks are literal; desktop adapts by turning the TabBar into a side rail.
**Theme:** dark-only. Light-theme code to be deleted. Feel free to clean up obsolete design-language code encountered along the way.
**Out-of-scope pages** (Goals, Investments, Insights, ICS Breakdown, Categories browse, CounterpartyDetail): leave as-is during this migration. Minimum-effort token update in Phase 11 so they don't visually clash. Deep restyle is a future phase.

---

## Phasing (context-rot strategy)

Each phase is sized to fit in one focused session. Each phase ends with:
1. A commit with a clear scope-tagged message.
2. **An iPhone check on the house network with the user** (see below) — phase is not "done" until the user signs off.
3. An update to the **Phase status** table below (check off, add session notes).
4. A "state snapshot" paragraph in this file so a fresh session can pick up without re-reading the whole chat.

### iPhone check (end of every phase)

Before marking a phase complete:

1. Start the dev server bound to LAN: `npm run dev -- --host` (Vite serves on `0.0.0.0`, prints a Network URL like `http://192.168.x.x:5173`).
2. Share the Network URL with the user and wait for them to open it on iPhone (same Wi-Fi).
3. Walk the user through what changed in this phase and ask them to poke at it.
4. Capture any issues they raise as either:
   - quick fixes done in the same session before commit, or
   - follow-ups added to the phase's **State snapshot** (and addressed before the final PR in Phase 12).
5. User says "looks good" → commit and check the box.

Large phases (7, 10) do this check at **each sub-checkpoint**, not just at phase end.

For Phase 0 (tokens only, no layout) the check is lighter: just confirm colors/fonts render correctly on iPhone Safari — no feature walkthrough needed.

Sub-checkpoints with no visible change (e.g. pure route-splitting in 10a) can skip the check and batch with the next visible sub-checkpoint.

Phases are ordered so the app stays usable after each commit. A handoff to a new session mid-phase should include: (a) this file, (b) the phase's "state snapshot", (c) `git status`, (d) `git log ui-redesign..HEAD` relative to the phase's start.

Phases marked **(large)** should be expected to span two sessions and have internal sub-checkpoints.

### Phase status

| # | Phase | Status | Notes |
|---|-------|--------|-------|
| 0 | Foundations (tokens, fonts, tailwind, cleanup) | ☑ | desktop+iPhone verified 2026-04-25 |
| 1 | Shell + nav (TopBar, TabBar, Sheet primitive, desktop side-rail) | ☑ | desktop + iPhone verified 2026-04-25; TopBar reworked v8-fixes-1 (month-nav + sync indicator) |
| 2 | Shared primitives (rows, section header, pill, progress bar, status glyph) | ☑ | desktop verified 2026-04-26; v8-fixes-2 added TxnRow `time` slot + CategoryRow `amountTrailing` slot |
| 3 | Login (Google-only, blinking cursor, delete Register) | ☑ | iPhone-verified 2026-04-26 after 4 corrective rounds against v8.html |
| 4 | Home | ☑ | iPhone-verified 2026-04-26 after 4 corrective rounds against v8.html |
| 5 | Transactions (sticky filters + month header) | ☑ | desktop preview verified 2026-04-26; iPhone walkthrough pending |
| 6 | Transaction Edit Sheet | ☑ | desktop preview verified 2026-04-26; iPhone walkthrough pending |
| 7 | Drill L1/L2/L3 **(large)** | ◐ | 7a + 7b + 7e desktop-verified 2026-04-26; iPhone walkthrough pending. 7c/7d deferred to next session. |
| 8 | Budget (read + edit modes) | ☐ | |
| 9 | Reimbursements | ☐ | |
| 10 | Settings hub + 6 sub-pages **(large)** | ☐ | |
| 11 | Polish, out-of-scope token pass, cleanup, tests | ☐ | |
| 12 | PR prep | ☐ | |

### Process note (added after Phases 3 + 4)

**Always open `designs/Free Lunch v8.html` before starting a phase.** The
README is explicit that v8.html is the canonical visual source — the prose
spec is supplementary. Phases 3 + 4 were initially built from prose alone
and required **four** corrective rounds (`v8-fixes-1` through `v8-fixes-4`)
to converge with v8 once the gap was caught. The pattern that works:

1. Copy `designs/Free Lunch v8.html` to `public/__v8_preview.html` (Vite
   serves `public/` at the dev-server root) so it can be loaded into a
   preview iframe.
2. Use `preview_eval` on the canonical screen to read computed styles,
   border colors, font sizes, exact pixel positions — don't eyeball.
3. Implement against those measurements.
4. Delete `public/__v8_preview.html` before committing (it's a 1.8MB
   asset that doesn't belong in production).

The handoff README still says "high-fidelity, all colors / typography /
spacing / borders are intentional" — believe it. Differences that look
small at one resolution become visible on iPhone.

### Open questions to resolve as phases arrive
- **Phase 1 / MORE menu — Reports row:** hide entirely or show greyed-out with "Coming soon"? *(handoff open question)*
- **Phase 9 — ML match banner:** hide if no model exists, or always show a manual-match UI? *(handoff open question)*
- **Phase 10 — light-theme toggle in Preferences:** show disabled "Coming soon", or omit from UI entirely? *(handoff open question; leaning omit since we're deleting light code)*

---

## Phase 0 — Foundations

**Goal:** new tokens, fonts, and Tailwind wiring in place so every subsequent phase can use `bg-surface`, `text-textHi`, `font-mono`, `tracking-wide-upper`, etc. without further config.

**Touches:**
- [src/index.css](src/index.css) — replace palette with Calm Terminal tokens; delete `:root` light values and unused warm-neutral vars; keep only the dark palette at `:root`.
- `tailwind.config.*` — extend `colors` (bg, surface, surfaceHi, rule, ruleHi, textHi/Mid/Lo/Dim, accent, accentDim, warn, warnDim), `fontFamily.mono` (JetBrains Mono), `fontFamily.sans` (Inter), `borderRadius` (card 10px, sheet 20px, pill 9999px), `fontSize` scale from README §Typography.
- Font loading — add `@fontsource/jetbrains-mono` and `@fontsource/inter` (or `<link>` to Google Fonts in [index.html](index.html)); verify no FOUT on the headline number.
- New utility classes: `.text-upper-tight` (letter-spacing 0.08em uppercase), `.text-upper-wide` (0.12em), `.nums` (tabular-nums — already present, keep), `.hairline` / `.hairline-hi` convenience borders.
- Delete: `.dark` block, obsolete terracotta/forest/gold tokens, unused warm-neutral vars.

**Cleanup opportunities** (take if cheap, defer otherwise):
- Remove `prefers-color-scheme` wiring if any.
- Purge `lucide-react` imports on screens we're about to rebuild *only when we touch those screens* (don't drop the dep — Phase 11 decides).

**Verification:** `npm run dev`, open app, confirm bg/fg colors changed to dark terminal palette globally (screens will look broken — that's expected, they'll be rebuilt in later phases).

**State snapshot (fill after phase):**
> Session 2026-04-25: tokens, fonts, Tailwind extension, utility classes, body monospace default all in place. CSS vars exposed both as canonical Calm Terminal tokens and as a shadcn-compat HSL layer so un-rebuilt screens stay readable on the new dark bg. JetBrains Mono + Inter loaded via Google Fonts `<link>` (not `@fontsource/*`) — works fine, no FOUT observed. Login page renders correctly on iPhone Safari (lime "Sign In" button, monospace text). Existing Dashboard renders dark-on-dark blobs as expected by plan.
>
> Side fix landed in same session: vite.config.ts now uses `loadEnv` so `VITE_FIREBASE_PROJECT_ID` resolves at config-eval time — pre-existing bug that made the functions proxy return 404, blocking Dashboard data load. Committed separately as `fix(dev)`.
>
> Files: `index.html`, `src/index.css`, `tailwind.config.ts`.

**Commit:** `ui-redesign(foundations): calm terminal tokens, fonts, tailwind wiring`

---

## Phase 1 — Shell + navigation

**Goal:** new [AppLayout](src/components/layout/AppLayout.tsx), [TopBar](src/components/layout/Header.tsx)-replacement, new TabBar, Sheet primitive, desktop side-rail variant of TabBar. Existing pages will render inside it unchanged (they'll look broken until rebuilt).

**Touches:**
- **Replace** `src/components/layout/Header.tsx` → `TopBar.tsx`: 44px, wordmark left, month label right, `surface`/`bg` bg, 1px bottom rule. Variant prop `{ mode: 'main' | 'drill' }` — drill shows back arrow and breadcrumb instead of wordmark.
- **Replace** `src/components/layout/BottomNav.tsx` → `TabBar.tsx`: 5 slots (HOME / TXNS / CAT / BUDGET / MORE). Each slot = glyph + mono 9px UPPER label, 2px top underline on active in `accent`. Wire MORE to a bottom sheet that lists Reimbursements, Settings, (Reports?).
- **New** `src/components/layout/SideRail.tsx`: desktop (≥lg) variant — vertical strip of the same TabBar slots. Keeps desktop usable without jarring.
- **Rewrite** `src/components/layout/AppLayout.tsx`:
  - Mobile (`<lg`): TopBar fixed top, Outlet in middle, TabBar fixed bottom. Safe-area paddings per spec (top 98–132px, bottom 88px).
  - Desktop (`≥lg`): SideRail left, TopBar top, Outlet in a centered 420px-ish phone-width column — matches brief's "mobile is canonical". A wider content width can be added per-screen if a specific screen benefits.
- **New primitive** `src/components/ui/sheet.tsx`: bottom sheet (Radix Dialog under the hood), 20px top radius, drag handle, backdrop with tap-to-close, 220ms ease-out slide-up. Supports nested sheets (category picker on top of edit sheet).
- **Delete** `Sidebar.tsx` (old desktop sidebar) and its icon imports. `BottomNav.tsx` (old) removed as part of replacement.
- **Route housekeeping:** nothing to change in [App.tsx](src/App.tsx) yet; MORE menu links out to `/reimbursements`, `/settings`.

**Known migration risk:** existing pages (Dashboard etc.) use `Card`, `Button` heavily from shadcn with warm-neutral styling. They'll look terrible until rebuilt. That's expected and accepted.

**State snapshot:**
> Session 2026-04-25: shell rebuild landed. `TopBar` (main/drill modes; auto-detects drill from path prefix), `TabBar` (4 slots: HOME ▤ / TXNS ▣ / BUDGET ◐ / MORE …), `SideRail` (desktop ≥lg, 60px wide), `MoreSheet` (Reimbursements + Settings + Insights/Goals/Investments/Categories archive + greyed-out Reports), and `Sheet` primitive on Radix Dialog (no new deps). `AppLayout` rewired: mobile = TopBar+Outlet+TabBar, desktop = SideRail+TopBar+centered max-w-[420px]/lg:max-w-[480px] column. Old `Header.tsx`, `BottomNav.tsx`, `Sidebar.tsx` deleted; barrel updated.
>
> **Departures from plan:** TabBar shrinks to 4 slots (CAT dropped) — categories admin will be folded into Budget in Phase 8 per user direction. MORE menu carries the out-of-scope archive routes so nothing is orphaned during the migration. TopBar keeps a temporary `…` button for one-tap MORE access from any page; remove in Phase 10 once Settings/Sync/Logout are properly housed.
>
> **Verified:** desktop preview (mobile 375×812 + 1280×800) and iPhone walkthrough on the seeded emulator stack via `test@freelunch.local`. `npm run typecheck` and `npm run lint` clean for new files. Existing screens (Dashboard etc.) render inside the new shell with old shadcn styling — broken-looking by design until rebuilt in Phases 4–10.
>
> Files: `src/components/ui/sheet.tsx`, `src/components/layout/{TopBar,TabBar,SideRail,MoreSheet,AppLayout}.tsx`, `src/components/layout/index.ts`. Deleted: `src/components/layout/{Header,BottomNav,Sidebar}.tsx`.

**Commit:** `ui-redesign(shell): new topbar, tabbar, sheet primitive, desktop side rail`

---

## Phase 2 — Shared primitives

**Goal:** build the reusable row/section/progress/pill components every subsequent screen needs. Without this phase, later phases duplicate markup.

**New components (under `src/components/redesign/`):**
- `SectionHeader.tsx` — mono 10px UPPER label + optional right-side action (`+ 3 MORE ›`, `VIEW ALL ›`); optional `tether` prop renders the `┗` glyph for indented decomposition blocks.
- `CategoryRow.tsx` — name (mono 13px), amount (mono 13px tabular-nums), meta line (mono 10px UPPER, `textLo`), thin 2px progress bar with gradient fill. Props: `{ name, amount, meta, progress, variant: 'ok' | 'over' }`.
- `TransactionRow.tsx` — merchant (sans 13px), amount (mono 13px tabular-nums with sign), meta date · category. Tappable.
- `DayHeader.tsx` — mono 10px UPPER, `textLo`, inline with the list (not sticky).
- `Pill.tsx` — 28px chip, mono 10px UPPER, `surface`/`rule` default, `accentDim`/`accent` active.
- `ProgressBar.tsx` — 2px tall, gradient tail (dim→full at fill tip), variants `accent` / `warn`.
- `StatusGlyph.tsx` — small unicode glyph + text (READY ▤, LAST SYNC, etc.).
- `PhosphorButton.tsx` — primary CTA style used on Login (`surface` bg, `ruleHi` border, mono 12px UPPER, `▸` prefix).
- `Scrubber.tsx` — 6-month vertical bar strip (Phase 7 uses it; stub here if cheap, else defer).

**Replacement policy:** on redesigned screens, prefer these primitives over shadcn `Button`/`Card` when they'd require heavy restyling. Where shadcn primitives are close-enough (`Dialog`, `DropdownMenu`, `Select`), keep them but pass new token classes.

**State snapshot:**
> Session 2026-04-26: 8 primitives landed under `src/components/redesign/` — `SectionHeader`, `Pill`, `ProgressBar`, `CategoryRow`, `TransactionRow`, `DayHeader`, `StatusGlyph`, `PhosphorButton` — plus a barrel `index.ts`. All take pre-formatted strings (formatting belongs to the consumer); progress bars cap visually at 100% with a CSS gradient (dim → full at the tip) per spec. `TransactionRow` is a deliberate sibling of `src/components/transactions/TransactionRow.tsx`; the existing one stays for Phase 5 to migrate. New `Pill` warn-variant + `CategoryRow` over-variant verified to flip bar + meta tone to warn. `PhosphorButton` press flips bg to `surfaceHi`.
>
> Dev-only design-system reference page added at `/__dev/primitives` (gated by `import.meta.env.DEV` in `App.tsx`). Made it a **public** route — no auth gate — so it works as a low-friction visual check without seeded test data. Phase 11/12 cleanup removes both the route and the page.
>
> **Departures from plan:** `Scrubber` deferred to Phase 7a as planned (the IMPLEMENTATION_PLAN offered the option to stub or defer; defer is the right call — only Drill consumes it and a stubbed API would need rework once real data lands). No future-phase primitives pre-built (no `BalanceRow` / `SpentHeadline` / `PendingBanner` / `BudgetLine` — none clearly meet the "two future phases will both need this" bar).
>
> **Verified:** `npm run typecheck` clean. `npm run lint` clean across new files (the 14 remaining errors all pre-date Phase 2 — Investments, Transactions, IcsBreakdown*, etc.). Desktop preview at 375×812 (mobile) and 1280×800 (desktop) walked through `/__dev/primitives`: tokens render correctly (bg `#0e0f11`, JetBrains Mono, accent `#c4f25a`, warn `#ff6b4a`), tether `┗` glyph aligns at left:8px, progress-bar gradients render, all `CategoryRow` / `TransactionRow` variants flip tones as expected, `Pill` toggle interaction works. Existing `/` route still redirects to `/login` (ProtectedRoute unaffected).
>
> **iPhone walkthrough still pending** — user's running dev server is on a different worktree; to iPhone-check from this one, restart their LAN dev stack against the `serene-rhodes-bf9afb` worktree per [PHONE_DEV_WORKFLOW.md](docs/PHONE_DEV_WORKFLOW.md), then visit `/__dev/primitives` (no login needed). Will be done before commit per the phase protocol.
>
> Files: `src/components/redesign/{SectionHeader,Pill,ProgressBar,CategoryRow,TransactionRow,DayHeader,StatusGlyph,PhosphorButton,index}.ts(x)`, `src/pages/dev/PrimitivesPlayground.tsx`, `src/App.tsx` (added route + import). Local-only (gitignored): `.env.local` for emulator-mode standalone Vite startup.

**Commit:** `ui-redesign(primitives): section header, rows, pill, progress bar, phosphor button`

---

## Phase 3 — Login

**Goal:** Google-only login per spec. Delete Register entirely.

**Touches:**
- **Rewrite** `src/pages/auth/Login.tsx`: black bg, 28px accent cursor (CSS blink keyframes), `FREE LUNCH` wordmark, tagline, centered 280px column with `▸ CONTINUE WITH GOOGLE` button, top-left `READY ▤` status.
- **Delete** `src/pages/auth/Register.tsx` + route in [App.tsx](src/App.tsx).
- **Trim** [AuthContext](src/contexts/AuthContext.tsx) and any signup / email-password code paths (keep as-is if interleaved with Google path; only delete clearly-dead code).
- Add keyframes to [index.css](src/index.css): `@keyframes blink { 50% { opacity: 0 } }`.

**State snapshot:**
> Session 2026-04-26: Login rewritten to spec. Composes `StatusGlyph` (READY ▤ top-left) and `PhosphorButton` (▸ CONTINUE WITH GOOGLE). Black `bg-bg`, centered column max-w-[280px], 28px accent block above wordmark animated via the existing `.cursor-blink` class (1.1s step-end — the keyframe was already in src/index.css from Phase 0, no new CSS needed). Wordmark mono 40px / 0.08em / textHi, tagline mono 11px / 0.12em / textLo. All computed styles verified against spec via preview_eval. `/register` returns no-match (blank) — Phase 11 can add a proper 404 page.
>
> **Email/password fallback decision:** kept email/password in `AuthContext.login` (e2e fixtures and phone dev workflow both depend on it), gated the form UI behind `import.meta.env.DEV`. Production builds tree-shake the `DevLoginFallback` inline subcomponent out. The form uses `aria-label` on inputs so Playwright `getByLabel(/email/i)` keeps working.
>
> **Deletions:** `src/pages/auth/Register.tsx`, `/register` route + import in `src/App.tsx`, `register()` method + `createUserWithEmailAndPassword`/`updateProfile` imports in `AuthContext.tsx`.
>
> **E2E ripple (minimum surgery — Phase 11 owns the deeper cleanup):** removed `register()` helper from `e2e/fixtures/auth.ts`; `isAuthAvailable` and `authenticatedPage` fixtures now go straight to `login()` against the seeded `test@freelunch.local` user. Pruned register-page tests from `e2e/auth.spec.ts` and `e2e/smoke.spec.ts`; updated heading assertions to look for the new `FREE LUNCH` wordmark. Sign-in button selector swapped to `/dev login/i`.
>
> **Verified:** `npm run typecheck` clean, `npm run lint` clean on Phase 3 files (pre-existing warnings in unrelated files unchanged). Browser preview at `http://localhost:5180/login` (mobile 375×812) — wordmark, tagline, cursor block (animation `cursor-blink 1.1s`), Google PhosphorButton (48×280, surface bg `#16181b`), and DEV fallback all render with the correct calm-terminal tokens. Live emulator login confirmed: filled `test@freelunch.local` / `test1234` in the DEV form, click submitted, auth emulator returned 200, AuthContext.fetchOrCreateUser succeeded, and the page navigated to `/`.
>
> **Follow-ups:** none for Phase 3. The dev-fallback could later be hidden behind a 5-tap easter-egg for a cleaner production-feel even in dev — log here if requested.
>
> Files: `src/pages/auth/Login.tsx`, `src/contexts/AuthContext.tsx`, `src/App.tsx`, `e2e/fixtures/auth.ts`, `e2e/auth.spec.ts`, `e2e/smoke.spec.ts`. Deleted: `src/pages/auth/Register.tsx`.

**Commit:** `ui-redesign(login): google-only login, blinking cursor, remove register`

**Subsequent corrective commits:**
- `8232258 ui-redesign(login-fix): align Phase 3 Login with v8` — Inter Tight 42px wordmark, inline 10×14 cursor after READY label, full-width Google button pinned bottom with colored Google G SVG, dev fallback gated behind `?dev=1` query param
- `5faee4a ui-redesign(login-fix): point e2e fixture at /login?dev=1` — fixture follow-up
- `1424cca ui-redesign(v8-fixes-2): close remaining gaps from canonical mockup` — wordmark top-anchored (no vertical center), tagline directly below
- iPhone-verified 2026-04-26.

---

## Phase 4 — Home

**Goal:** the daily-check-in screen per README §02.

**Touches:**
- **Rewrite** `src/pages/Dashboard.tsx` (possibly rename to `Home.tsx`, keep route `/`).
- **Delete** old dashboard components as they're replaced: `SummaryCards`, `BudgetOverview`, `SpendingByCategoryChart`, `SpendingOverTimeChart`. Keep `RecentTransactions` logic but rebuild markup against `TransactionRow`.
- **New blocks:**
  - `PendingBanner.tsx` — conditional render when pending > 0; `accentDim` bg; tap → `/reimbursements`.
  - `BalanceRow.tsx` — label + right-aligned amount.
  - `SpentHeadline.tsx` — 48px number + right-stack delta/budget.
  - `BudgetLine.tsx` — progress bar + `€X LEFT · Y DAYS LEFT` line with over-budget variant.
  - `HomeCategoryList.tsx` — top-4 `CategoryRow`s in the indented-with-tether block; wires `+ N MORE CATEGORIES ›` to `/expenses`.
- **Data:** use existing `useTransactions`, category queries, budget queries. Compute spent/budget/delta/days-left client-side if not already surfaced.
- **Over-budget variant:** only Spent number, Budget bar fill, Budget line, and the tipped-over row flip to `warn`. Everything else stays `accent`.

**State snapshot:**
> Session 2026-04-26: Dashboard rebuilt as Home (renamed `src/pages/Dashboard.tsx` → `src/pages/Home.tsx` via `git mv` so blame is preserved). Composes the Phase 2 primitives `SectionHeader`, `CategoryRow`, `TransactionRow`, `ProgressBar` plus four new blocks under `src/components/home/`: `PendingBanner`, `SpentHeadline`, `BudgetLine`, `HomeCategoryList`. App.tsx route `/` rewired to `<Home />`.
>
> **Data wiring:** `useDashboardData` called twice (current + previous month, prev range memoized off `dateRange.startDate`) for the `▼ €X vs MAR` delta. `useBudgets` for the total budget cap (sum of `monthlyLimit` for active budgets). `useBudgetProgress` for per-category remaining/over. `useCategories` for the navigate-to-parent mapping on category-row taps. Days-left computed client-side as `differenceInDays(endOfMonth(now), now)` only when `isCurrentMonth` — historical months omit the `· N DAYS LEFT` suffix. Direction icon: `▼` (accent) when delta < 0, `▲` (warn) when > 0.
>
> **Over-budget logic:** `spent > budget && budget > 0` flips only `SpentHeadline` number, `BudgetLine` bar+text, and the specific `CategoryRow` whose amount exceeds its limit. Everything else (TopBar, TabBar, PendingBanner, other rows) stays accent — matches spec.
>
> **Deletions:** `src/components/dashboard/{SummaryCards,BudgetOverview,SpendingByCategoryChart,SpendingOverTimeChart,RecentTransactions,index}.{ts,tsx}`. `ApplyToSimilarDialog` lives in `src/components/transactions/` and is still used by Transactions.tsx — left in place. Dashboard's category-edit modal flow is dropped from Home; row taps now navigate to `/transactions?id={id}` (the edit sheet itself is Phase 6).
>
> **Departures from plan:** **BalanceRow not built.** Bank-account balance is not exposed by any current hook (`useBankConnections` returns connection status only; `useDashboardData.summary.netBalance` is income−expenses for the period, not a live account balance). Skipping the row is cleaner than rendering `netBalance` with a misleading label or shipping a placeholder. Phase 10 (Settings → Accounts) will surface the real balance; revisit Home then. Spec impact: Home is missing the top "ABN AMRO BALANCE €3,284.56" row — flag during iPhone walkthrough.
>
> **Known data gaps deferred:**
> - Fiscal-month-start preference still not in Firestore — days-left uses calendar month. Phase 10 introduces the field; Phase 4 will need a one-line follow-up to consume it.
> - Two `useDashboardData` calls add a round-trip on Home mount. TanStack Query caches both; subsequent month navigation reuses cache. Acceptable for now; future perf work could fold prev-month-spent into the existing Cloud Function.
>
> **Verified live on the seeded emulator (2026-04-26):**
> - `npm run typecheck` clean. `npm run lint` clean on Phase 4 files.
> - Logged in via the DEV fallback as `test@freelunch.local` and walked through Home for APR 2026:
>   - Spent headline `€ 7.034,72` rendered in `text-warn` (correctly — total spend exceeds the €1.620 sum of active budgets).
>   - Delta line `▼ € 81,42 vs MAR` rendered in `text-accent` (improvement direction). Confirms the second `useDashboardData` call resolves.
>   - BudgetLine showed `€ 5.414,72 OVER BUDGET · 4 DAYS LEFT` in warn; ProgressBar bg-image confirmed `linear-gradient(--warn-dim, --warn)` with `aria-valuenow=100`.
>   - `BY CATEGORY` section showed 4 rows (Rent/Mortgage, Travel, Groceries, Restaurants) with `+ 11 MORE CATEGORIES ›` action — correct count for the seeded data (15 categories with spend).
>   - Two budgeted categories (Groceries, Restaurants) flipped to `over` variant with warn meta + warn progress bar; the two un-budgeted rows (Rent/Mortgage, Travel) correctly omitted the bar.
>   - Recent Transactions section rendered 4 rows with mono date + uppercase category meta and `-€` sign on expenses.
>   - PendingBanner correctly hidden (seeded data has no pending reimbursements; `pendingReimbursements <= 0` short-circuits the render).
> - Tap targets verified: `VIEW ALL ›` → `/transactions`, `+ 11 MORE CATEGORIES ›` → `/expenses`, Groceries CategoryRow → `/expenses/food` (correct parent resolution via `categoryById.parentId` lookup).
> - Responsive: mobile (375×812) shows TabBar at bottom and TopBar at top; desktop (1280×800) shows the SideRail aside (60px wide), TopBar, hides the bottom TabBar (`lg:hidden`), and constrains Home to a 480px centered column.
> - Browser screenshot tool times out in this environment regardless of page state — verification done via accessibility-tree snapshot + computed-style queries instead, which is more rigorous than visual eyeballing.
>
> **Not exercised live:**
> - Under-budget variant (where spent < budget): no seeded month has under-budget data, and the TopBar in this phase has no month-prev/next nav (Phase 5 adds it). The accent-variant code paths are the symmetric default in `SpentHeadline` / `BudgetLine` / `CategoryRow`, so logic is trusted.
> - TransactionRow tap navigates to `/transactions`; the `?id={t.id}` query param is swallowed by the page's existing routing — the deep-link to the edit sheet is Phase 6 territory and was always going to be a placeholder.
>
> **Follow-ups:**
> - iPhone walkthrough pending (user-side).
> - Wire BalanceRow when bank-balance hook lands (Phase 10).
> - Fiscal-month-start once preference field exists (Phase 10).
> - `/transactions?id={id}` row-tap target is a placeholder until Phase 6 Edit Sheet ships — currently it just lands on the Transactions list.
>
> Files added: `src/components/home/{PendingBanner,SpentHeadline,BudgetLine,HomeCategoryList,index}.tsx/ts`. Files renamed: `src/pages/Dashboard.tsx` → `src/pages/Home.tsx` (full rewrite). Files edited: `src/App.tsx`. Files deleted: `src/components/dashboard/{SummaryCards,BudgetOverview,SpendingByCategoryChart,SpendingOverTimeChart,RecentTransactions,index}.tsx/ts`.

**Commit:** `ui-redesign(home): rebuild dashboard with calm terminal layout`

**Subsequent corrective commits (all iPhone-verified 2026-04-26):**
- `11bef73 ui-redesign(shell-fix): align Phase 1 TopBar with v8` — month-nav `‹ APRIL 2026 ›` + sync indicator with phosphor-glow dot + search/add stub buttons; drop legacy wordmark and `…` button
- `562f756 ui-redesign(primitives-fix): align Phase 2 row primitives with v8` — `time` slot on TransactionRow, `amountTrailing` on CategoryRow, sans for category names
- `eab5978 ui-redesign(home-fix): align Phase 4 Home with v8` — drop month-over-month delta in favour of PROJ APR linear-extrapolation forecast, `SPENT · APR` label, split-cents treatment
- `1424cca ui-redesign(v8-fixes-2): close remaining gaps from canonical mockup` — restored `┗` tether glyph (was dropped in error), full-width hairline below spent block, BY CATEGORY indented to `ml-11` with hairlines under header / each row / `+ N MORE CATEGORIES`, txn category meta tightened to 9.5px JBM
- `7dc3287 ui-redesign(v8-fixes-3): pending dot glow, balance bg, spent right-stack, tether radius, tab glyphs` — pending dot rounded with phosphor glow, BalanceRow `bg-surface` + `ABN AMRO BALANCE` label, SpentBlock right-stack anchored to top of big amount (not above SPENT label), tether `border-bottom-left-radius:4px` + height aligned to BY CATEGORY text vertical center, TabBar glyphs `≡ ◧ ⋯`
- `4c5c15a ui-redesign(v8-fixes-4): sync glow, balance all-borders, tether gap, tab text-only` — sync dot phosphor glow added, BalanceRow borders on all 4 sides (not just top+bottom), 6px gap between tether and previous hairline, TabBar active state stripped back to color-only (no border, no glow)

**Known gaps remaining:** BalanceRow renders `summary.netBalance` as a stand-in until Phase 10 wires a real bank-balance hook. Fiscal-month-start preference still calendar-only — Phase 10 introduces it.

**Dev tooling added:** `scripts/_dev_bump_budgets.mjs` — for visually verifying the Home under-budget state with the seeded emulator, since the default seed has spend > total budget. Run after `npm run firebase:emulators` + `node scripts/seed-emulator.mjs`. See `docs/PHONE_DEV_WORKFLOW.md`.

---

## Phase 5 — Transactions list

**Goal:** sticky filter bar + sticky month header + day-grouped rows per README §03.

**Touches:**
- **Rewrite** `src/pages/Transactions.tsx`.
- **Rebuild** `src/components/transactions/TransactionFilters.tsx` → horizontal-scroll pill row (ALL / UNCAT / REIMB / MAR-APR / CATEGORY). Category pill opens a multi-select sheet.
- **Rebuild** `src/components/transactions/TransactionList.tsx` → day-grouped with `DayHeader`; row markup delegates to `TransactionRow`.
- **New** `MonthSummaryStickyBar.tsx` — `APR · €4,672 · 72 TXN`; IntersectionObserver on day-group boundaries to swap the month as user scrolls.
- Row tap opens Edit sheet (Phase 6).

**State snapshot:**
> Session 2026-04-26: rewrite landed. New `TransactionFilters` is a horizontal-scroll Pill row with the v8 set (`! UNCAT / ◐ REIMB / ▸ <month> / ◱ ALL CATS`) — explicitly NOT the README §03 set, since v8 is canonical and shows no `ALL` pill, no date-range range, glyph-prefixed labels. Month pill is display-only (rendered as a span, not a button) per resolved Q2 — month nav lives in TopBar `‹ ›`. Category pill (`◱ ALL CATS`) opens a nested category sheet (single-select; multi-select gated on a future `categoryIds[]` query extension). New `TransactionList` consumes pre-grouped data via `groupByMonthThenDay` (extracted to `src/components/transactions/groupTransactions.ts` so the component file only exports components — fast-refresh friendly). Each day renders a `DayHeader` with right-aligned signed day total (em-dash `—` for self-canceling transfer days). Rows use the redesign `TransactionRow` primitive with `time` slot, variant mapping (`income | uncat | pending | transfer | default`), and reimbursable badge appended to meta as `· REIMB €X.XX`. New `MonthSummaryStickyBar` sticks below the filter row at `top: calc(44px + 46px)`; an IntersectionObserver in `Transactions.tsx` watches each `<section data-month>` and updates the bar's monthKey as users scroll.
>
> **Pill primitive v8 fixup landed in this commit** (no separate commit since the diff is tiny): `Pill.tsx` lost `rounded-pill`, dropped to `h-[25px]` / `px-2.5`, and uses `text-[10px] tracking-[0.06em] uppercase` directly (twMerge was collapsing `text-ct-meta` against `text-textMid` so the font-size class was being silently dropped). Result matches v8 measurements exactly: 25px height, square, 1px border-rule on all sides, `rgba(255,255,255,0.07)` border color, `text-textMid` color, 10px JBM, 0.6px letter-spacing.
>
> **Page wires `?id=…` deep link** — Phase 4's Home `RecentTransactions` row-tap (which navigated to `/transactions?id=X`) now opens the edit modal on mount. URL stays the source of truth; closing the modal clears `id`. Filter state still URL+sessionStorage-persisted via the same `transactions-filters` key.
>
> **Departures from plan / known regressions:**
> - The IntersectionObserver bar-swap is dormant in practice because `useTransactions` filters to `MonthContext.dateRange` (one month at a time). The IO code is in place — Phase 7 (or a small follow-up) can widen the date range to make multi-month scroll work; Phase 5 just defaults the bar to `format(selectedMonth, 'yyyy-MM')`.
> - **Edit happens via the existing `TransactionForm` Dialog** — Phase 6 swaps it for the bottom sheet. Reimbursement / merchant-rule / delete-from-row UX is temporarily unavailable between Phases 5 and 6 (the row action menu is gone; the new sheet hasn't shipped). On `ui-redesign` only, contained between two adjacent commits.
> - Old `TransactionRow.tsx` and `TransactionRowActions.tsx` deleted (the redesign primitive is the row now). Old dialogs (`MarkReimbursableDialog`, `ClearReimbursementDialog`, `ApplyToSimilarDialog`, `CounterpartyDialog`) stay in the tree until Phase 6 folds their logic into the edit sheet.
> - `.env.local` (gitignored) had to be created in this worktree — the file lives only in worktrees that previously ran the emulator stack.
>
> **Verified live (2026-04-26):**
> - `npm run typecheck` clean. `npm run lint` clean on touched files.
> - Browser preview at `http://localhost:5180/transactions` (mobile 375×812) against the seeded emulator stack:
>   - Filter pills computed-style verified vs v8: `h:25 / border:1px all / borderColor: rgba(255,255,255,0.07) / borderRadius:0 / fontSize:10px / letterSpacing:0.6px / color: textMid`. ✓
>   - Sticky filter row at top:44, sticky month bar at top:90 (44 + 46) — both keep position through 1500px of scroll.
>   - Pill toggles: `! UNCAT` flips bg to `bg-warn-dim` + text/border to warn + URL `?categorizationStatus=uncategorized` ✓; toggling off clears URL + sessionStorage ✓.
>   - Row tap on first APR row → URL becomes `/transactions?id=<txnId>` and the edit Dialog opens with that txn loaded.
>   - DayHeader signed totals (e.g. `SAT · APR 25  −€ 127,53`) rendered correctly; income-net days show `+€…` in textMid.
>   - Reimbursable rows append `· REIMB € 5,29` to category meta; income rows render with `+€…` accent; uncat rows would use the `'uncat'` variant (none in seed).
> - Browser screenshot tool times out in this environment regardless of state (same Phase 4 limitation) — verification is via accessibility-tree + computed-style queries.
>
> **Not exercised live:**
> - Multi-month scroll (data-layer scopes to `MonthContext.dateRange`).
> - iPhone walkthrough — pending user-side per the iPhone-check protocol.
>
> **Files added:** `src/components/transactions/MonthSummaryStickyBar.tsx`, `src/components/transactions/groupTransactions.ts`. **Files rewritten:** `src/pages/Transactions.tsx`, `src/components/transactions/TransactionFilters.tsx`, `src/components/transactions/TransactionList.tsx`, `src/components/transactions/index.ts`, `src/components/redesign/Pill.tsx`. **Files deleted:** `src/components/transactions/TransactionRow.tsx`, `src/components/transactions/TransactionRowActions.tsx`. **Untracked but required for emulator-mode dev (gitignored):** `.env.local`.

**Commit:** `ui-redesign(transactions): sticky filters, sticky month summary, day groups`

**Subsequent corrective commit:**
- `ui-redesign(transactions-fix): activate multi-month sticky bar` — widen page-level date range to a 6-month window ending at `selectedMonth` (Nov 2025 → Apr 2026 when APR is selected); replace the IO-only sticky-bar tracker with a triple mechanism (IO threshold callbacks + `window` `scroll`/`resize` rAF-throttled listener + recompute on `registerMonthSection` so the first read is correct as soon as sections mount) so the bar swaps `APR / MAR / FEB / …` as the user scrolls past month boundaries on real devices. Note: the headless preview tool here doesn't fire scroll events for programmatic scroll, so the swap is verified by inspection of the recompute logic + on iPhone walkthrough.

---

## Phase 6 — Transaction Edit Sheet

**Goal:** replace current `TransactionForm.tsx` modal with a bottom sheet per README §09.

**Touches:**
- **Rewrite** `src/components/transactions/TransactionForm.tsx` as a sheet (uses Phase 1 `Sheet` primitive).
- Sections: Headline · Category (row → nested category picker sheet) · Flags (Reimbursable toggle; Split deferred) · Note (textarea) · Merchant Rules (row → rule creation) · Manual Resolve (reimbursable only).
- Delete button in `warn` at bottom.
- Unsaved-changes confirm on backdrop tap.
- **Rebuild** `src/components/transactions/CategoryPicker.tsx` to render as a nested sheet (grouped by parent, search at top).
- Keep existing mutations wiring in TanStack Query; swap only markup and layout.

**State snapshot:**
> Session 2026-04-26: rewrite landed. `TransactionForm` is now a Phase 1 `Sheet` (Radix Dialog) with sections separated by hairlines: Headline (merchant + signed amount + date) · CATEGORY (row → nested CategoryPicker sheet) · FLAGS (Reimbursable toggle, Split deferred per resolved Q3) · NOTE (textarea, dirty-tracked) · MERCHANT RULES (row → bulk-update similar txns, only when both counterparty and category are set) · MANUAL RESOLVE (only when `reimbursement.status === 'pending'`, row → nested ManualResolveSheet) · DELETE TRANSACTION (warn-styled, with two-step confirm). Nested sheets stack natively via Radix; Esc closes the topmost only.
>
> **Dirty-state confirm-on-close:** the Note textarea is the only dirty-tracked field. `onPointerDownOutside` and `onEscapeKeyDown` intercept when dirty and show an inline `Unsaved note · Discard / Save` strip pinned just above the safe-inset padding (taps better than a stacked alert). Save → `useUpdateTransaction({ id, data: { note } })` → close. Discard → revert local note + close. All other fields (category, reimbursable, merchant rule, manual resolve, delete) are action-driven and persist immediately on tap with their own toasts.
>
> **Manual resolve UX:** `ManualResolveSheet` is a new nested sheet — opens above the Edit Sheet. Search input (300ms debounced) feeds `useRecentIncomeTransactions(searchText)`. List rows are `[ MMM D · Counterparty · +€<amount> ]`. Tap → `useClearReimbursement.mutate({ incomeTransactionId, expenseTransactionIds: [t.id] })`, then close both sheets (the txn is no longer pending so there's nothing to edit on the same view).
>
> **CategoryPicker rewrite:** the old shadcn-Select-based picker is replaced with a search-prefixed Radix-Dialog Sheet. Hierarchical layout (parent header → All <Parent> → indented children). Sentinel "Uncategorized" row at the top to clear the assignment. CURRENT badge marks the active row. Filter sheet on the Transactions page already had its own inline category sheet from Phase 5 — left as-is rather than parameterizing one component for two semantics (filter chooses what to filter BY; edit chooses what to ASSIGN).
>
> **Data model surgery:** added an optional top-level `note: string | null | undefined` field to `Transaction` (and `TransactionDocument`) so the README §09 generic Note section persists. Existing factories / fixtures don't need updating because the field is optional. Reading via `t.note ?? ''`. Writing via `useUpdateTransaction({ id, data: { note } })` (TransactionFormData.note widened from `string` to `string | null`).
>
> **Reimbursable type 'work' default:** toggling Reimbursable ON calls `useMarkAsReimbursable({ id, type: 'work', note: null })` per resolved Q (work as default; type-picker is a future enhancement). Toggling OFF calls `useUpdateTransaction({ id, data: { reimbursement: null } as never })` — the cast is needed because TransactionFormData doesn't include `reimbursement` but Firestore happily clears the field. Verified live (toggle OFF made the MANUAL RESOLVE section disappear).
>
> **Departures from plan:**
> - Toast on every action mutation (category change, reimbursable toggle, merchant rule, delete) — not in the plan, but matches the prior page-level UX and is cheap user-confidence signal.
> - Two-step confirm on Delete (`Delete Transaction` button → `Cancel / Confirm Delete` strip) instead of a separate alert dialog. Bottom-sheet ergonomics: stacking another modal on top of an already-stacked Edit Sheet is awkward.
>
> **Verified live (2026-04-26) on the seeded emulator:**
> - `npm run typecheck` clean. `npm run lint` clean on Phase 6 files (the 2 pre-existing `no-non-null-assertion` warnings in `useTransactions.ts` are out of scope).
> - Tap first APR row → `?id=<txnId>` URL → Edit Sheet opens with all six sections.
> - Tap CATEGORY row → nested CategoryPicker opens above. Type "groc" in the search → list filters down to `Food & Drink → Groceries`. Tap Groceries → picker closes, Edit Sheet category row updates to "Groceries", merchant-rules line updates to "Always categorize NS as Groceries". (Optimistic — no flicker.)
> - Toggle Reimbursable: aria-checked flips, MANUAL RESOLVE section appears. Toggle off → section disappears. Persistence verified across reopens.
> - Tap MANUAL RESOLVE → ManualResolveSheet opens, listing all candidate income txns by date. Search/debounce wired. Esc closes only the resolve picker, not the Edit Sheet.
> - Type a note in NOTE textarea → press Esc → close intercepted, inline `Unsaved note · Discard / Save` strip appears at sheet bottom. Tap Save → mutation runs, sheet closes, URL clears. Reopen the same row → textarea pre-filled with the saved note (note persists across `?id` reload).
> - Browser screenshot tool times out as before; verification via accessibility-tree + computed-style queries.
>
> **Not exercised live:**
> - Actual ManualResolveSheet pick-and-clear flow (would mutate seed data; deferred to iPhone walkthrough).
> - Delete confirm flow (same reason).
> - iPhone walkthrough — pending user-side per the iPhone-check protocol.
>
> **Files added:** `src/components/transactions/ManualResolveSheet.tsx`. **Files rewritten:** `src/components/transactions/TransactionForm.tsx`, `src/components/transactions/CategoryPicker.tsx`, `src/components/transactions/index.ts`, `src/components/reimbursements/index.ts`. **Files edited (additive `note` field):** `src/types/index.ts`, `src/hooks/useTransactions.ts`. **Files deleted:** `src/components/transactions/ApplyToSimilarDialog.tsx`, `src/components/reimbursements/MarkReimbursableDialog.tsx`, `src/components/reimbursements/ClearReimbursementDialog.tsx` — their UX is now inside the Edit Sheet. `CounterpartyDialog.tsx` left in place (unused but Phase 11 cleanup territory).

**Commit:** `ui-redesign(edit-sheet): bottom sheet with nested category picker`

---

## Phase 7 — Drill L1 / L2 / L3 **(large)**

**Goal:** single parameterized drill component covering Expenses → Category → Subcategory → Merchant (the last of which already exists as `SpendingCounterparty`).

**Sub-checkpoints** (commit each):
1. **7a** — `Scrubber.tsx` finalized + standalone story/playground check.
2. **7b** — L1 at `/expenses` (`SpendingExplorer.tsx` rewrite).
3. **7c** — L2 at `/expenses/:categoryId` (`SpendingCategory.tsx`).
4. **7d** — L3 at `/expenses/:categoryId/:subcategoryId` (`SpendingSubcategory.tsx`).
5. **7e** — Breadcrumb component in TopBar drill mode.

**Notes:**
- Reuse `CategoryRow` from Phase 2.
- Subcategories have no budget → scale bars against parent category budget, drop `LEFT` suffix.
- Keep merchant-level screen (`SpendingCounterparty`) as-is behaviorally; it can be restyled later in Phase 11 (it shows individual txns, which `TransactionRow` already handles).
- `/income/*` mirrors use the same drill component — parameterize on `kind: 'expenses' | 'income'`.

**State snapshot:**
> Session 2026-04-26 (1/2): 7a / 7b / 7e landed as one bundled commit (tight coupling; the trio together gives a usable top-of-funnel drill). Five new redesign primitives: `Scrubber`, `Breadcrumb`, `DrillRow`, `DrillHeadline`, plus a `buildDrillBreadcrumb` helper. `SpendingExplorer.tsx` rewritten as L1 `/expenses` + (via runtime detection) `/income`. `TopBar` drill-mode chrome flipped to v8 — same `‹ <PAGE_NAME> › ... SYNC ⌕ ⊕` layout as main mode, with the title slot showing the current drill page name; the dedicated `‹ BACK` button + `buildBreadcrumb …` placeholder are gone (back-arrow lives in-page on the new Breadcrumb).
>
> **v8 measurement decisions** (read off `designs/Free Lunch v8.html` DEEP frames 04/05/06 via `preview_eval`):
> - Scrubber: 6 columns × 52px wide × 6px gap (strip total 342px). Strip height 73px. Inactive bar = `border 1px solid var(--rule)`, transparent bg. Over-budget bar = `bg var(--alert-dim) + border 1px var(--alert)` (amber, NOT warn-red). Selected month = 2px solid-accent tip at the bar height (no border, no fill — just a ceiling). Dashed budget line = `border-top: 1px dashed rgba(196,242,90,0.55)` spanning the strip, hidden at L3.
> - Big number: 38px JBM tracking-tight + cents at 17px JBM textLo (split-cents), with a right-stack of `APR 2026` + (optional) `BUDGET €X` in 8.5px accent.
> - Drill row: `01` index (mono 10px textLo) + name (Inter Tight 14px textHi) + amount (mono 14px textHi) + chevron `›` (mono 12px textLo); meta line `· €31 LEFT` (or `· €58 OVER` for warn) on the second line; 2px progress bar below.
> - In-page breadcrumb: `← <parent> › <current>` truncated to last 2 segments at L3 (drops EXPENSES). Back-arrow in accent (lime). Mono 10px segments, parent textLo / current textHi tracking-1.2px.
> - **Major divergence from the prose README**: at L3 v8 shows day-grouped TRANSACTIONS, not merchant aggregations. README §06 ("Rows = individual merchants") loses; v8 wins. 7d will reuse Phase 5 primitives (`DayHeader`, `TransactionRow`, `groupByMonthThenDay`) and tap → Phase 6 Edit Sheet. `SpendingCounterparty` stays in the route table for direct URLs but becomes orphaned from the drill funnel; Phase 11 decides whether to restyle, redirect, or delete.
>
> **Departures from plan:**
> - Bundled 7a/7b/7e as a single commit instead of three. Per the plan's "If 7b and 7e land together cleanly, commit them as one — otherwise split" — they did. The brief's three-commit suggestion was relaxed because the bundles share `redesign/index.ts` and `dev/PrimitivesPlayground.tsx` edits, splitting them required tedious per-line staging.
> - **DrillRow built as a new primitive instead of extending CategoryRow.** v8 frame 04 puts `€31 LEFT` on the meta line (`· €31 LEFT`) — Home's CategoryRow puts the same data in an `amountTrailing` slot next to the amount. Two layouts diverge enough that extending CategoryRow with index/chevron/metaPrefix props would require conflicting layout branches. Separate component, no behavior change to the existing CategoryRow.
> - **DrillHeadline built as a new primitive** instead of reusing Phase 4's `SpentBlock` — the latter is Inter sans 44px with a projection right-stack; v8's drill headline is JBM mono 38px with a budget caption. Separate concerns.
> - **Income mirror routes preserved via runtime direction detection** (existing pattern in App.tsx). No `kind: 'expenses'|'income'` parameter on the component — that would have been pure architecture-for-architecture's-sake; runtime detection works.
> - **Constant-budget assumption** for the Scrubber: bars tinted alert-amber if their amount exceeds the *current* budget config (sourced from `useBudgets`). Historical-budget tracking is out of scope. Acceptable for v1.
>
> **Verified (desktop, 375×812):**
> - `npm run typecheck` clean. `npm run lint` clean on touched files (the 41 warnings/errors elsewhere all pre-date Phase 7 — Investments, Home, IcsBreakdown*, etc.).
> - `/__dev/primitives` smoke-checked via `preview_eval`: Scrubber renders 3 variants (under-budget L1 with €4500 line + 2 over-budget bars in alert-amber; L2 with €950 line; L3 no-line variant). All bar widths 52px, strip total 342px, dashed line 342px wide matching `rgba(196,242,90,0.55)`. Selected month tip = 2px accent fill. DrillRow renders index/name/amount/chevron + meta + bar; `over` variant flips meta to warn. Breadcrumb truncates to last 2 segments at the 3-segment example (`← GROCERIES › SUPERMARKET`, no `EXPENSES`). DrillHeadline split-cents render at 38px/17px JBM.
> - `/expenses` page itself NOT exercised live (the desktop dev preview at port 5180 has no firebase emulator backend; the user's emulator stack runs at 192.168.68.59:5173 from a different worktree). TypeScript + lint + the playground primitives are the only desktop signal here. **iPhone walkthrough is the live-data signal** and runs against the user's seeded emulator stack.
>
> **Files added:** `src/components/redesign/{Scrubber,Breadcrumb,DrillRow,DrillHeadline}.tsx`, `src/components/redesign/buildDrillBreadcrumb.ts`. **Files modified:** `src/components/redesign/index.ts` (5 new exports), `src/components/layout/TopBar.tsx` (drill chrome → v8), `src/pages/SpendingExplorer.tsx` (full rewrite to L1 v8 layout), `src/pages/dev/PrimitivesPlayground.tsx` (added 4 new sample blocks: Scrubber 3 variants, Breadcrumb 3 variants, DrillHeadline 3 variants, DrillRow 4 variants). `.env.local` re-created from a sibling worktree (gitignored, not part of the commit).
>
> **iPhone walkthrough pending** — needs the user's emulator stack running on the LAN dev server. Look for: TopBar shows `‹ EXPENSES ›` (not `‹ BACK`), in-page breadcrumb has accent `←` arrow, Scrubber tap on a different month updates the headline, indexed rows tap into the existing (Phase-7c-pending) SpendingCategory page.
>
> **Next: 7c (L2 SpendingCategory rewrite) + 7d (L3 SpendingSubcategory rewrite)**, deferred to next session per the brief's bundle recommendation. Both will reuse the primitives that just landed; 7c gets a category-scoped Scrubber budget line (`useBudgetProgress` lookup) + subcategory rows scaled against parent budget, 7d gets day-grouped transactions + Edit Sheet integration.

**Commits:** one per sub-checkpoint, prefixed `ui-redesign(drill)`.

---

## Phase 8 — Budget

**Goal:** planning-first screen per README §07.

**Sub-checkpoints:**
1. **8a** — `AllocationStrip` primitive + `Budgets.tsx` read-mode shell. EDIT pill stub, no mutations. ✅
2. **8b** — Edit-mode steppers, draft state, SAVE/DISCARD footer with batched mutation diff.

**Touches:**
- **Rewrite** `src/pages/Budgets.tsx`.
- Header (`MONTHLY PLAN` label + `○ EDIT` pill) + hero `€{cap}` `/MONTH`.
- `AllocationStrip.tsx` — horizontal stacked bar with flex-grow proportional slices, opacity-stepped accent fills, dashed unallocated tail.
- `BY CATEGORY` numbered list (`01`..`NN`), expandable to subcategory list (each child shows budget or `NO BUDGET`).
- Edit-mode toggle → rows get `+`/`−` steppers; SAVE/DISCARD footer.
- No rollover logic.

**State snapshot:**
> **8a landed (2026-04-27):** AllocationStrip primitive built with canonical opacity progression (0.95 → 0.20). Budgets page rewritten to match v8 frame: top header + EDIT pill, hero `€{cap}` + `/MONTH`, ALLOCATION section with strip + caption (`N CATEGORIES · €X/DAY`), `BY CATEGORY · N · TAP TO EXPAND` header, numbered DrillRow-style entries with `N SUBCATEGORIES` meta, tap-to-expand reveals child list with per-child amount or `NO BUDGET`. EDIT pill is a disabled stub for 8b. Read-mode uses `useBudgets` + `useCategories` only — no `useBudgetProgress` (planning, not tracking). Verified on iPhone walkthrough.
>
> **8b landed (2026-04-27):** EDIT pill toggles to `● EDITING` (active accent state); rows auto-expand and editing happens at the LEAF level (subcategories where they exist, top-level otherwise). When a parent category also carries its own direct budget, it is surfaced as a `(general)` leaf alongside the children so nothing gets dropped silently. Steppers (`−` / `+`, step €50, 28×28 tap targets) flank a tabular-nums amount; AllocationStrip + caption + cap recompute live from draft state. Sticky `DISCARD / SAVE` PhosphorButton footer above the TabBar; SAVE is the warn variant, disabled until dirty. Save semantics are batched: per changed leaf, single-doc updates if exactly one match exists, otherwise delete-all + create one fresh budget at the leaf's categoryId. `useBudgetProgress` still not consulted. Verified on iPhone walkthrough.

**Commit:** one per sub-checkpoint, prefixed `ui-redesign(budget-…)`.

---

## Phase 9 — Reimbursements

**Goal:** dedicated reimbursements screen per README §08.

**Sub-checkpoints:**
1. **9a** — Page rewrite: big phosphor total, OPEN list, row-tap → Phase 6 Edit Sheet. Closed header stub. ✅
2. **9b** — Collapsible CLOSED section with localStorage persistence. ✅
3. **9c** — Delete legacy `ClearFromReimbursementsDialog` + sibling components and dead utilities. ✅

**Touches:**
- **Rewrite** `src/pages/Reimbursements.tsx`.
- Big phosphor total (`YOU'RE OWED €X`, cents scaled to ~46% via `accent-dim`).
- Open items list — row-tap opens Edit Sheet (Phase 6 `TransactionForm`).
- Closed section collapsible (default collapsed); collapse state persisted in `localStorage`.
- Home `PendingBanner` already navigates to `/reimbursements` via `<Link>` — no rewiring needed.

**Decisions (resolved in plan mode):**
- ML match-suggestion banner — **removed entirely**, not stubbed, no feature flag. Future ML signals would surface inside the Edit Sheet rather than as a top-level banner.
- 3-step `ClearFromReimbursementsDialog` wizard — **deleted entirely**. Single-row resolution lives in the Edit Sheet's MANUAL RESOLVE section.

**State snapshot:**
> **9a landed (2026-04-27):** Reimbursements.tsx rewritten to v8 layout — `YOU'RE OWED` label + big phosphor total with cents-in-`accent-dim`, `N OPEN · €Y RESOLVED {MONTH}` subline, OPEN section with glow-dot rows showing merchant + `MMM D · Nd OPEN` meta + `+€amount`. Row tap opens TransactionForm; MANUAL RESOLVE auto-appears for pending rows. CLOSED header rendered but body stubbed. Verified on iPhone walkthrough.
>
> **9b landed (2026-04-27):** CLOSED section becomes a tappable header that toggles a list of recently-cleared reimbursements (last 90 days, limit 50). Default collapsed; right caption `N · +` where the `+` rotates 45° to render as `×` on expand. Persistence via localStorage key `freelunch:reimbursements:closed-expanded`. Cleared rows render dimmed (`opacity 0.65`, `textMid` type, neutral glow dot) with `MMM D · CLEARED MMM D` meta and tap into the same Edit Sheet for revert. Verified on iPhone walkthrough.
>
> **9c landed (2026-04-27):** Deleted `src/components/reimbursements/` (ClearFromReimbursementsDialog, PendingReimbursementList, ClearedReimbursementList, ReimbursementSummary, index.ts), `src/lib/reimbursementUtils.ts`, `src/hooks/__tests__/useReimbursements.test.ts`, and the trailing re-export block in `useReimbursements.ts`. Typecheck + lint clean.

**Commit:** one per sub-checkpoint, prefixed `ui-redesign(reimbursements-…)`.

---

## Phase 10 — Settings hub + sub-pages **(large)**

**Goal:** break current flat Settings into hub + 6 sub-pages, add Danger Zone, group by verb.

**Sub-checkpoints:**
1. **10a** — Routes split: `/settings`, `/settings/accounts`, `/settings/categorization`, `/settings/preferences`, `/settings/export`, `/settings/account`, `/settings/danger`. Add redirects from any old deep-links.
2. **10b** — Hub page (identity hero, MANAGE/DATA/DANGER rooms, version footer).
3. **10c** — Accounts & Sync (was `BankConnectionCard`): connected banks, sync schedule, pending jobs.
4. **10d** — Categorization (merge `AutoCategorizationCard` + `CategorizationRulesCard` + merchant DB + `BuiltInRulesCard` into one screen with sections + Retrain Model CTA).
5. **10e** — Preferences (NEW — Locale, Fiscal Month Start, Notifications, Appearance). Appearance: decide on light-theme open question.
6. **10f** — Data Export (was `DataExportCard`; add ICS Import as sub-section — merges `IcsImportCard`).
7. **10g** — Account (email, connected Google, Sign Out).
8. **10h** — Danger Zone (NEW — extracted from `DangerZoneCard`, plus Reset Categories and Delete All Data). 2-step confirms.
9. **10i** — Delete old `settings/*Card.tsx` files.

**State snapshot:**
> *(empty — notes per sub-checkpoint)*

**Commits:** one per sub-checkpoint, prefixed `ui-redesign(settings)`.

---

## Phase 11 — Polish, out-of-scope token pass, cleanup

**Goal:** ship-ready. Screens outside the 14-screen scope shouldn't look alien under the new tokens, even if their layout stays the same.

**Touches:**
- Out-of-scope pages (Goals, Investments, Insights, ICS Breakdown, Categories, CounterpartyDetail): run through each, replace any hard-coded warm-neutral colors with new tokens, tabular-nums on numeric values, swap shadcn Card shell to a `surface` card treatment. No layout surgery.
- Motion timings matched to spec (180ms page, 220ms sheet, 120ms tap opacity 0.6).
- Pull-to-refresh on Home and Transactions (mobile).
- Delete residual light-theme code, unused lucide imports on redesigned screens, dead tokens.
- `npm run lint`, `npm run typecheck`, `npm run test`, `npm run e2e` — fix any regressions from the redesign.
- Accessibility sweep: focus rings in mono style (`accent` 1px outline), keyboard nav on pills/tabs, ensure contrast on `textMid`/`textLo` text.

**State snapshot:**
> *(empty)*

**Commits:** split reasonably — e.g. `(polish)`, `(a11y)`, `(test-fixes)`, `(cleanup)`.

---

## Phase 12 — PR prep

- Final `git log main..ui-redesign` review — squash any noisy WIP commits if they snuck in; keep phase-level commits.
- Screenshots per redesigned screen (can use Claude Preview MCP).
- PR description: high-level "what changed" + phase checklist + open questions resolved + follow-ups (deep-restyle of out-of-scope pages, Reports screen, ML match banner if still deferred).
- Open PR to `main`.

---

## Session-handoff template

When a session ends mid-phase, append to the phase's **State snapshot** section a short note:

```
Session YYYY-MM-DD: completed sub-checkpoint 7b; L1 renders correctly with dummy data
but scrubber click doesn't refresh rows — TODO in next session. Files touched:
src/pages/SpendingExplorer.tsx, src/components/redesign/Scrubber.tsx.
Next: 7c (L2 rewrite).
```

A fresh session should be started with:
1. Read [docs/redesign/IMPLEMENTATION_PLAN.md](docs/redesign/IMPLEMENTATION_PLAN.md) (this file).
2. Read the relevant README section for the phase.
3. `git log main..HEAD` to see what's landed.
4. `git status` to see uncommitted work.

---

## Rough effort estimate

~12–15 focused sessions. Large phases (7, 10) probably two sessions each; others one.
