# Handoff: Free Lunch Redesign — Calm Terminal

## Overview

This is a full visual + IA redesign of the Free Lunch personal finance app for the Netherlands market (see `reference/PRD.md` for product context). The redesign applies a single committed aesthetic — **"Calm Terminal"** — across 14 screens covering the entire MVP surface: login, home, transactions, budget planning, category drill-in (3 levels), reimbursements, transaction edit sheet, and a redesigned settings area.

The app's **functional scope does not change.** Everything in the current PRD is preserved. What changes is the visual language, the information hierarchy on each screen, and the IA of Settings.

---

## About the Design Files

The files in `designs/` are **design references created in HTML** — React/Babel prototypes showing intended look, layout, and behavior. They are **not production code to copy directly.**

The task is to **recreate these designs in the Free Lunch target codebase** (the current app — tech stack per PRD §8) using its established patterns, component library, and routing. The HTML mocks exist to remove ambiguity about visuals, spacing, and interaction — not to dictate implementation.

### How to read the design file

Open `designs/Free Lunch v8.html` in a browser. It's a single-page gallery of all 14 screens arranged as iPhone mockups. Sections:

- **01 ENTRY** — Login
- **02 DAILY** — Home, Transactions
- **03 DEEP** — Drill L1 (Expenses), L2 (Category), L3 (Merchant), Budget, Reimbursements
- **04 ADMIN** — Settings Hub + 6 sub-pages

Each phone mockup is labeled and tagged. The whole page has a scale slider and a light/dark toggle (Tweaks); ignore those — they are gallery conveniences and are not part of the app.

---

## Fidelity

**High-fidelity.** All colors, typography, spacing, borders, and layouts in the mocks are intentional and should be matched as closely as the target codebase allows. Where the codebase's existing component library forces a compromise (e.g. a built-in Button can't be restyled to exactly match), prefer the codebase's primitive and document the delta — don't fork the library to chase pixels.

Dummy data (category names, amounts, transaction merchants, dates) is illustrative. Real data binding is the implementer's job.

---

## Design System

### Color tokens

The app runs in a **single dark theme**. No light mode for v1. A `--theme` var toggle exists in the HTML for preview, but the spec below is the authoritative dark palette.

| Token | Hex | Usage |
|---|---|---|
| `bg` | `#0E0F11` | App background |
| `surface` | `#16181B` | Cards, sheets, tab bar |
| `surfaceHi` | `#1C1F22` | Elevated rows, active states |
| `rule` | `rgba(255,255,255,0.07)` | Hairline dividers |
| `ruleHi` | `rgba(255,255,255,0.14)` | Emphasized dividers |
| `textHi` | `rgba(255,255,255,0.92)` | Primary text, numbers |
| `textMid` | `rgba(255,255,255,0.66)` | Secondary text |
| `textLo` | `rgba(255,255,255,0.40)` | Tertiary text, meta |
| `textDim` | `rgba(255,255,255,0.22)` | Disabled, de-emphasized |
| `accent` | `#C4F25A` | Primary accent (lime/phosphor) |
| `accentDim` | `rgba(196,242,90,0.18)` | Accent fills, selected bg |
| `warn` | `#FF6B4A` | Over-budget, danger, negatives |
| `warnDim` | `rgba(255,107,74,0.18)` | Warn fills |

**Accent rule:** `accent` is used sparingly — for the selected tab, primary CTAs, progress-bar fill, positive deltas, and phosphor-styled text on login. Never for large surfaces. `warn` is used strictly for budget overruns and destructive actions.

### Typography

Two families, both variable-friendly and free:

- **Mono:** `"JetBrains Mono", ui-monospace, monospace` — used for all numeric values, labels, code-like readouts, category rows, topbar, tab bar
- **Sans:** `"Inter", system-ui, sans-serif` — used only for long-form labels on sheets (e.g. section headings inside edit sheet), merchant names in lists, onboarding-style copy

**Type scale** (px, line-height = 1 unless noted):

| Use | Size | Weight | Letter-spacing |
|---|---|---|---|
| Big headline number (balance, spent) | 48 | 500 | -0.02em |
| Section title | 14 | 500 | 0.08em UPPER |
| Row primary | 13 | 500 | 0 |
| Row meta / caption | 10 | 400 | 0.08em UPPER |
| Tab bar label | 9 | 500 | 0.12em UPPER |
| Monospace inline number (row amount) | 13 | 500 | tabular-nums |

**Tabular numbers** (`font-variant-numeric: tabular-nums`) on every numeric value — balances, amounts, percentages.

### Spacing

Informal 4px grid. Common values used in the mocks:

- Card inner padding: `14px 16px`
- Section vertical gap: `20px` (same-context) / `32px` (between domains)
- Row horizontal padding: `16px` (top-level) / `20px` (inside cards)
- Page horizontal padding: `16px`
- Top safe area inside screen: `54px` (status bar) + `44px` (topbar) ≈ `98–132px` paddingTop for scroll content
- Tab bar height: `68px`
- Bottom safe area for content: `88px` paddingBottom so content clears the tab bar

### Borders & radii

- Hairlines: `1px solid rule`
- Card: `1px solid rule`, `border-radius: 10px`
- Sheet: `border-radius: 20px` top corners only
- Pills / chips: `border-radius: 999px`
- Progress bar: `height: 2px`, `border-radius: 1px`, `background: rule`, fill = `accent` or `warn`

### Iconography

The app deliberately **does not use a conventional icon library.** The aesthetic uses:

- **Glyphs** (unicode): `▤ ▣ ◎ ◐ ●○ ▸ › ✕ ▲▼ ┗` and similar — used sparingly for tab bar, state indicators, drill arrows, tree structure
- **Text labels** over icons wherever possible
- **Tabular ASCII blocks** for bar visualizations (drill screens use real HTML rects, not characters — but the visual language evokes terminal aesthetics)

Do not introduce lucide/feather/material icons — they break the voice.

### Motion

Keep motion minimal and functional. No easter-egg animations. Spec:

- Page transitions: 180ms ease-out (`cubic-bezier(0.2, 0.6, 0.2, 1)`)
- Sheet slide-up: 220ms ease-out
- Tap feedback: opacity 0.6 on press, 120ms
- Login cursor blink: 1.1s step-end loop (square block, `accent` color)
- No parallax, no ambient motion, no loading spinners — use phosphor-style progress bars instead

---

## Screens

Each screen below includes its purpose, layout, components, and implementation notes. Screen IDs match the labels in the gallery file.

### 01. Login (B — "Cursor")

**Purpose:** Sign in with Google. The only entry point.

**Layout:**
- Full-screen black
- Centered vertically: wordmark block, tagline, Google button
- Top-left: `READY ▤` status indicator (small, `textLo`)
- Cursor — a 28px `accent`-colored square — blinks immediately before the wordmark

**Components:**
- **Wordmark:** `FREE LUNCH` — mono, 40px, `textHi`, letter-spacing 0.08em, UPPER
- **Tagline:** `PERSONAL FINANCE, SMARTLY.` — mono, 11px, `textLo`, letter-spacing 0.12em, UPPER, margin-top 12px
- **Google button:** Full-width (inside a 280px centered column), 48px tall, `surface` background, `1px solid ruleHi`, border-radius 8px, mono 12px, label `▸ CONTINUE WITH GOOGLE`, letter-spacing 0.08em, UPPER. On press: bg = `surfaceHi`.
- **Cursor:** CSS `@keyframes blink { 50% { opacity: 0 } }` 1.1s step-end infinite

**Behavior:**
- On Google button tap → trigger OAuth flow → on success, navigate to Home
- No signup link, no email/password fallback
- No footer, no legal text on the screen itself (put ToS/Privacy behind a `?` glyph in the top-right if required by law — do not add them to the body)

### 02. Home

**Purpose:** The daily check-in. Answers "how am I doing this month?" in under 2 seconds.

**Layout (top → bottom, scrollable between topbar and tab bar):**

1. **TopBar** (fixed, 44px tall, top-inset 54px): `FREE LUNCH` wordmark left, current month (`APR`) right. Solid `bg` background, 1px bottom rule.
2. **Pending banner** (conditional — only renders when pending > 0): full-width strip, `accentDim` bg, `accent` text. Format: `+€84 PENDING · 2 ITEMS · ▸`. Tapping → Reimbursements screen.
3. **Balance card:** 1-row surface card. Left: `ABN AMRO BALANCE` (textLo, 10px UPPER). Right: `€3,284.56` (textHi, 18px, tabular-nums). No account mask, no icon.
4. **Spent headline block:** 2-column flex row, `borderBottom: 1px solid rule`, padding `22px 20px 16px`.
   - Left: `€2,318.42` (48px, `textHi`, tabular-nums). If over budget, `warn` color.
   - Right: stacked column, right-aligned. `▼ €380 vs MAR` (mono 10px, `accent` if under, `warn` if over). Below: `SPENT / BUDGET €4,292 / €5,000` (mono 9.5px, `textLo`, 2 lines).
5. **Budget bar block:** padding 0 20px 20px. Contains:
   - Thin progress bar (2px): fill width = `spent/budget`, color `accent` normally, `warn` when over. `rule` bg. Under budget shows a partial gradient tail that reaches full color near the fill edge.
   - Below the bar, a single line: `€708 LEFT · 8 DAYS LEFT` (mono 10px UPPER, `textLo`). Over-budget variant: `€42 OVER BUDGET · 8 DAYS LEFT`, in `warn`.
6. **BY CATEGORY** section (indented x=32, with an `┗` tether glyph on the left at the top of the block so it reads as a decomposition):
   - Section header: `BY CATEGORY` (mono 10px, `textLo`, letter-spacing 0.12em, UPPER), right side: `+ 3 MORE CATEGORIES ›` (tappable → Drill L1)
   - Top 4 categories as rows. Each row = 2 tiers:
     - **Top:** name (mono 13px, `textHi`), amount right-aligned (`€919`, tabular-nums). Below the name, meta line (mono 10px, `textLo`): `18 TXN · 21.4% OF APR · €31 LEFT`. Over-budget: `OVER €42` in `warn`.
     - **Bottom:** 2px progress bar with gradient fill (dim → full at the tip), `accent` normally, `warn` when over.
7. **RECENT TRANSACTIONS** section (same indent as BY CATEGORY):
   - Section header `RECENT TRANSACTIONS` · right `VIEW ALL ›` (→ Transactions)
   - 4 most recent transactions. Row = merchant name (sans 13px), amount right-aligned (mono 13px tabular-nums, with minus sign for expenses). Meta line below: date · category (mono 10px `textLo`).
8. **TabBar** (fixed, bottom, 68px): 4 tabs — HOME (active), TXNS, CAT, BUDGET, MORE. Each tab = vertical stack of glyph + label. Active tab: `accent` color and a 2px `accent` underline flush with the top of the tab bar. Inactive: `textLo`.

**Over-budget variant:** same layout, but:
- Spent number → `warn`
- Budget bar fill → `warn`
- Budget line → `€42 OVER BUDGET · 8 DAYS LEFT` in `warn`
- Groceries row (the category that tipped over) → `warn` bar + `OVER €42` label
- TopBar, TabBar, and all other accents stay their normal `accent` color — only budget-related visuals flip.

### 03. Transactions

**Purpose:** Scan, search, and edit transactions.

**Layout:**
- TopBar (solid, not gradient — has a thin bottom rule)
- Sticky filter bar (z-index 4, `top: 0` in scroll): horizontal-scroll row of pill filters — `ALL`, `UNCAT`, `REIMB`, `MAR-APR`, `CATEGORY`. Pills: mono 10px UPPER, 28px tall, `surface` bg, `1px solid rule`. Active: `accent` text, `accentDim` bg, `accent` border.
- Sticky month summary (z-index 3, `top: 41`): full-width strip, `surfaceHi` bg, `textHi` label, right-aligned running total + count. Format: `APR · €4,672 · 72 TXN`. Updates via IntersectionObserver as user scrolls past month boundaries.
- Transaction list: grouped by day. Day header is inline (mono 10px, `textLo`): `TUE · APR 8`. Rows are same shape as Home's Recent Transactions.

**Filters:**
- `UNCAT`: only uncategorized transactions (where category = null)
- `REIMB`: only transactions flagged reimbursable
- Date-range picker: simple month-range. Default = current month.
- Category: multi-select picker

**Tap a row → opens Edit sheet.**

### 04. Drill L1 — Expenses

**Purpose:** See all spend by top-level category, scrub across months.

**Layout:**
1. TopBar: back arrow left, `EXPENSES` title center, month label right
2. **Month scrubber** (top of scroll): horizontal strip of 6 columns (last 6 months). Each column: a vertical bar growing **up from a shared baseline** (all columns bottom-aligned), month label below. Current/selected month = `accent` bar. Others = `rule` bg. A dashed phosphor-green budget line spans the strip at `y = budget/maxScale` height. Tap a column → select that month and refresh rows.
3. Month header row: `APR · €4,292` (left, mono 14px) · right `12 CATEGORIES`.
4. **Category rows** (same visual as Home's BY CATEGORY rows but with more data):
   - Primary line: name + amount. Meta line: `18 TXN · 21.4% OF APR · €31 LEFT`. Progress bar underneath, same rules.
   - Tap → Drill L2 for that category.

### 05. Drill L2 — Category (e.g. Groceries)

**Purpose:** Break a category down into subcategories.

Same shape as L1 but:
- Title: the category name (e.g. `GROCERIES`)
- Breadcrumb visible in TopBar: `EXPENSES › GROCERIES`
- Budget line on scrubber is for this category's budget (€950)
- Rows = subcategories (Supermarket, Organic, Specialty…)
- Tap a subcategory → Drill L3

**Subcategories have no budget** in v1 (per PRD). So rows show the progress bar scaled against the **category's budget** proportionally, NOT a per-sub limit. Meta line drops the `LEFT` suffix.

### 06. Drill L3 — Subcategory (e.g. Supermarket)

**Purpose:** See individual merchants/transactions within a subcategory.

Same shape, with:
- Breadcrumb: `EXPENSES › GROCERIES › SUPERMARKET`
- Rows = individual merchants (Albert Heijn, Jumbo…) with txn count and total
- Tap a merchant → that merchant's transactions (filtered Transactions list)

### 07. Budget Breakdown

**Purpose:** **Plan** the budget. Not track it — that's what Home/Drill do.

**Layout:**
1. TopBar
2. **Header strip** (surface card): `MONTHLY PLAN · €5,000 TOTAL CAP · €292 UNALLOCATED` — mono 10px UPPER. No current-month spend. No progress bar.
3. **Allocation strip:** a horizontal stacked bar showing how the €5,000 is sliced across categories. Each slice colored sequentially from `accent` through muted tones. A dashed empty slot at the right visualizes unallocated space. Below the strip: `€4,708 ALLOCATED · €292 FREE · €156/DAY`.
4. **Category list:** each row = name, allocated amount (`€950/MO`), thin allocation bar showing this cat's share of the total. Expandable → shows subcategories nested.
5. **Edit toggle** (top-right): switches from read-mode to edit-mode. In edit mode:
   - Each row gets `+`/`−` steppers to adjust allocation
   - Unallocated pool updates live
   - `DISCARD` / `SAVE` buttons at the bottom
6. TabBar with BUDGET active

**No rollover** in v1. Unallocated money stays unallocated — it does not carry over to next month.

### 08. Reimbursements

**Purpose:** Track money owed to you for expenses you fronted.

**Layout:**
1. TopBar
2. **Big phosphor total:** `YOU'RE OWED €148` (mono 40px, `accent`, cents scaled to 60% and `accentDim`)
3. **Match suggestion banner** (conditional, when ML finds a probable match): `surface` card, left = icon glyph `◐`, body text `Match Mar 15 dinner (€48) ↔ Apr 2 deposit (€48)?`. Right side: `[✓]` and `[✕]` pill buttons.
4. **OPEN items section** (header: `OPEN · 3 ITEMS · €148`): list of pending-reimbursement transactions. Row = merchant, date, amount (tabular-nums, `accent` color). **No "RESOLVE ›" button** — tap the row to open the Edit sheet where manual resolve lives as one of the actions.
5. **CLOSED items section** (collapsible, default collapsed): header `CLOSED · 24 ITEMS · €2,340 THIS YEAR ▸`. On expand, shows resolved reimbursements.

### 09. Transaction Edit Sheet

**Purpose:** Edit one transaction. Slides up from the bottom of any list.

**Layout (sheet = bottom 85% of screen, `surface` bg, 20px top radius):**
1. Drag handle (4px tall, 40px wide, `textDim`, centered) + `✕` close button top-right
2. **Headline:** merchant name (sans 20px, `textHi`) · amount (mono 28px tabular-nums, `textHi`) · date (mono 10px, `textLo`)
3. **Sections** (separated by 1px rule):
   - **CATEGORY:** current value as a row with `›` arrow. Tap → opens category sub-picker (another sheet on top).
   - **FLAGS:** toggles — `Reimbursable` (binary), `Split` (deferred v1, not shown). Each toggle = label left, toggle switch right.
   - **NOTE:** textarea, 3-line, placeholder `Add a note…`. No auto-prompts.
   - **MERCHANT RULES:** `Always categorize [Merchant] as [Category] ›` — tap to create a rule
   - **MANUAL RESOLVE:** (only when on a reimbursable txn) — `Mark as reimbursed ›` → closes the pending state
4. **Delete button** at bottom: `warn` text, centered, `DELETE TRANSACTION`. Deleted txns are soft-deleted; recoverable from Settings → Danger Zone.

**Behavior:**
- Tap backdrop outside sheet → close (with unsaved-changes confirm if dirty)
- Category picker opens as a nested sheet: list of categories grouped by parent, search at top.

### 10. Settings · Hub

**Purpose:** Entry point to all settings. Organized by verb, not by feature.

**Layout:**
1. **Identity hero** (card): user email + Google avatar glyph, sync status (`LAST SYNC: 2 MIN AGO · ALL BANKS UP`)
2. **Rooms** (grouped sections, not pages — Settings uses drill-in navigation):
   - **MANAGE** — Accounts & Sync · Categorization · Preferences
   - **DATA** — Export · ICS Import
   - **DANGER** — Account · Danger Zone
3. Each room row = label + short meta line + `›` arrow. Tap → sub-screen.
4. App version + open-source link at the very bottom (mono 10px, `textLo`).

### 11. Settings · Accounts & Sync

**Purpose:** Manage bank connections.

**Layout:**
- Header: `ACCOUNTS & SYNC`, breadcrumb `SETTINGS ›`
- **Connected banks** list: each bank = card with name, last-4 of primary account, last sync timestamp, sync status indicator. Tap → bank detail (re-auth, disconnect).
- **+ CONNECT BANK** button at the bottom of the list
- **Sync schedule**: section with options — `Every 4h` / `Every 12h` / `Manual only`
- **Pending jobs** (collapsible, empty when idle)

### 12. Settings · Categorization

**Purpose:** Manage auto-categorization rules + merchant database.

**Layout:**
- Header + breadcrumb
- **AUTO-CATEGORIZATION** toggle (on by default)
- **RULES** list: each row = `if merchant contains [X] then [Category]`. Row actions: edit, delete, reorder.
- **+ NEW RULE** button
- **MERCHANT DATABASE** (collapsible): list of learned merchants with their default category. Searchable.
- **RETRAIN MODEL** button at bottom (re-runs categorization on historical data)

### 13. Settings · Preferences

**Purpose:** App-wide user preferences.

**Layout (simple list):**
- **LOCALE** — language, currency, date format
- **FISCAL MONTH START** — 1st (default) / 15th / custom day
- **NOTIFICATIONS** — budget alert threshold (90% / 100% / 110%), weekly digest on/off
- **APPEARANCE** — theme (Dark only in v1, but show the toggle disabled with a `Coming soon` label so users know light is planned)

### 14. Settings · Data Export

**Purpose:** Export transactions or the entire dataset.

**Layout:**
- **FORMAT** radio: CSV / JSON / OFX
- **RANGE** picker: All time / This year / This month / Custom
- **INCLUDE** checkboxes: transactions, categories, rules, budgets
- **EXPORT ›** primary button (generates + downloads)
- Below: **ICS IMPORT** sub-section for importing work-calendar expense tags

### 15. Settings · Account

**Purpose:** Logged-in user account. Minimal — since auth is Google-only.

**Layout:**
- Email (read-only)
- Connected Google account info
- **SIGN OUT** button (warn color)

### 16. Settings · Danger Zone

**Purpose:** Destructive actions. Reached intentionally.

**Layout:**
- Warning banner (`warn` bg tint) at top
- **RESET CATEGORIES** — clears all category assignments, keeps transactions
- **DELETE ALL DATA** — wipes everything, keeps account
- **DELETE ACCOUNT** — closes the account, exports data first

Each action has a 2-step confirm (type the action name to proceed).

---

## Interactions & Navigation

### Global nav

- **TabBar** (bottom, always visible on top-level screens): HOME / TXNS / CAT / BUDGET / MORE
- **MORE** → reveals a sheet with secondary destinations: Reimbursements, Settings, Reports (deferred — the slot is in the MORE menu but not implemented in v1)
- Drill screens (L1/L2/L3, sub-settings) **do not** show the tab bar — they have a back arrow in the topbar instead

### Routes (suggested)

```
/login
/                  → Home (protected)
/transactions
/transactions/:id  → Edit sheet (modal route)
/expenses          → Drill L1
/expenses/:catId   → Drill L2
/expenses/:catId/:subId → Drill L3
/budget
/reimbursements
/settings
/settings/accounts
/settings/categorization
/settings/preferences
/settings/export
/settings/account
/settings/danger
```

### State

Things that should live in client state (with persistent storage):

- Current month / date range (persists across screens)
- Filter selections on Transactions
- Collapsed/expanded state of Reimbursements Closed section
- Settings preferences (local overrides of server state)

Things that should refetch every visit:

- Transactions list (pull-to-refresh should also be supported on mobile)
- Pending reimbursements count (used in the Home banner)
- Sync status (used on Settings Hub)

---

## Implementation notes

### For a React/Next.js codebase

- The mocks use inline styles and one `<style>` block for keyframes. In the real app, prefer CSS Modules / Tailwind / your existing convention. Do **not** carry forward the inline-style approach.
- Font loading: use `next/font` or equivalent — avoid FOUT on the home screen's big number.
- The bottom-of-the-screen tab bar + top bar pattern is ubiquitous — implement once as a `<Shell>` component that renders children in the middle. Drill screens use a variant that replaces the tab bar with nothing (just the middle content grows to fill) and replaces the topbar with the back-arrow variant.

### For a SwiftUI / native iOS codebase

- Use SF Mono as a fallback for JetBrains Mono if bundling the TTF is inconvenient
- Haptic feedback (light tap) on tab changes and on row taps in drill screens
- Pull-to-refresh on Transactions and Home

### Common pitfalls to avoid

1. **Don't introduce a full icon set.** The aesthetic depends on the restraint. Use unicode glyphs or plain text labels.
2. **Don't soften the corners.** 10px radius on cards, 20px on sheets, 999px on pills. No 24px / 32px rounded-everything.
3. **Don't color surfaces with accent.** `accent` is for text, borders, and thin bars only. Filling a card with `accent` will break the voice.
4. **Don't use emoji.** Anywhere.
5. **Don't add drop shadows.** Depth is expressed with `surfaceHi` elevation, not shadows.
6. **Use tabular-nums everywhere numbers appear.** Ragged-width digits in a budget app look amateur.

---

## Files in this handoff

```
design_handoff_freelunch_redesign/
├── README.md                 ← this file
├── REDESIGN_BRIEF.md         ← diff from current app
├── designs/
│   └── Free Lunch v8.html    ← canonical gallery (14 screens)
└── reference/
    ├── PRD.md                ← product requirements (functional spec)
    ├── current_ui_main.jpeg  ← screenshot of current app home
    └── current_ui_settings.jpeg ← screenshot of current settings
```

## Open questions for the implementer

- **Reports screen:** deferred in v1 — confirm the MORE menu's "Reports" row should be hidden entirely, not greyed out, for launch.
- **Light theme:** the Preferences screen shows a light-mode toggle marked `Coming soon`. Confirm whether to ship it hidden or ship the toggle disabled as shown.
- **Match ML:** the Reimbursements match-suggestion banner assumes an ML model exists. If not ready, hide the banner and fall back to manual resolve only.
- **ICS Import:** lives under Data Export but could be its own Settings room if the feature grows. Flag if the scope expands.
