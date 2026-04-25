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
| 1 | Shell + nav (TopBar, TabBar, Sheet primitive, desktop side-rail) | ☐ | |
| 2 | Shared primitives (rows, section header, pill, progress bar, status glyph) | ☐ | |
| 3 | Login (Google-only, blinking cursor, delete Register) | ☐ | |
| 4 | Home | ☐ | |
| 5 | Transactions (sticky filters + month header) | ☐ | |
| 6 | Transaction Edit Sheet | ☐ | |
| 7 | Drill L1/L2/L3 **(large)** | ☐ | |
| 8 | Budget (read + edit modes) | ☐ | |
| 9 | Reimbursements | ☐ | |
| 10 | Settings hub + 6 sub-pages **(large)** | ☐ | |
| 11 | Polish, out-of-scope token pass, cleanup, tests | ☐ | |
| 12 | PR prep | ☐ | |

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
> *(empty)*

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
> *(empty)*

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
> *(empty)*

**Commit:** `ui-redesign(login): google-only login, blinking cursor, remove register`

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
> *(empty)*

**Commit:** `ui-redesign(home): rebuild dashboard with calm terminal layout`

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
> *(empty)*

**Commit:** `ui-redesign(transactions): sticky filters, sticky month summary, day groups`

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
> *(empty)*

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
> *(empty — expect notes per sub-checkpoint)*

**Commits:** one per sub-checkpoint, prefixed `ui-redesign(drill)`.

---

## Phase 8 — Budget

**Goal:** planning-first screen per README §07.

**Touches:**
- **Rewrite** `src/pages/Budgets.tsx`.
- Header strip (total cap, unallocated — no live spend).
- `AllocationStrip.tsx` — horizontal stacked bar, colored slices, dashed unallocated tail.
- Category list with expandable sub-rows showing allocation breakdown.
- Edit-mode toggle → rows get `+`/`−` steppers; SAVE/DISCARD footer.
- No rollover logic.

**State snapshot:**
> *(empty)*

**Commit:** `ui-redesign(budget): planning screen with read/edit modes`

---

## Phase 9 — Reimbursements

**Goal:** dedicated reimbursements screen per README §08.

**Touches:**
- **Rewrite** `src/pages/Reimbursements.tsx`.
- Big phosphor total (`YOU'RE OWED €X`, cents scaled to 60% in `accentDim`).
- Match suggestion banner — gated on ML availability (open question: confirm during this phase; default = hide when no model).
- Open items list — row-tap opens Edit sheet (Phase 6).
- Closed section collapsible (default collapsed). Persist collapse state.
- Wire Home `PendingBanner` to this screen.

**State snapshot:**
> *(empty)*

**Commit:** `ui-redesign(reimbursements): dedicated screen with open/closed sections`

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
