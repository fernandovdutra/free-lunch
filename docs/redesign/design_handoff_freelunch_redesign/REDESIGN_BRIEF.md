# Redesign Brief — What Changes vs the Current App

This document is a **diff**: what's different between the current Free Lunch app (as shown in `reference/current_ui_main.jpeg` and `reference/current_ui_settings.jpeg`) and the redesign in `designs/Free Lunch v8.html`.

Read this after the README. The README tells you what to build; this tells you what to **rip out** and **keep**.

---

## TL;DR

- **Functionality unchanged.** Every feature in the PRD is preserved. No features removed, no features added.
- **Visual language replaced.** Current: generic finance-app (rounded cards, colorful accent, light theme, icons everywhere). New: "Calm Terminal" (mono type, tabular numbers, minimal iconography, dark-only, phosphor-green accent, hairline dividers).
- **IA reorganized, mostly in Settings.** Current Settings is one long scroll of 8 cards. New Settings is a hub → sub-page structure grouped by verb.
- **New structural primitives** on Home and Transactions (sticky month header, per-row progress bars, pending banner, bar-scrubber on drill).

---

## Screen-by-screen diff

### Home — current

- Light theme, rounded large cards
- Hero = balance across all accounts
- Bank-account list takes the top third
- Categories shown as a bar chart + legend
- Recent transactions at the bottom

### Home — redesign

- Dark theme, hairline dividers between sections
- Hero = **SPENT this month** (not balance — this is the number that matters for budgeting)
- Balance reduced to a 1-line row
- Pending-reimbursements banner surfaces at the top **only when non-zero**
- Categories shown as ranked rows with inline progress bars (not a separate chart)
- `+ X MORE CATEGORIES ›` CTA → drill
- Over-budget state redesigned: only the budget-related visuals flip to `warn` (red), not the whole chrome

**What to keep from current:** the balance number, the recent-transactions section. Everything else is reorganized.

### Transactions — current

- Flat list, no filters visible
- Month separator = plain text heading
- Rows have full merchant name, date, amount

### Transactions — redesign

- Sticky filter chips (ALL / UNCAT / REIMB / date / category)
- Sticky month header with running total updating on scroll
- Same row shape as current (merchant, amount, date, category)
- Tap row → edit sheet (current app probably already does this)

**What to build new:** filters, sticky month header with live total, updated edit sheet.

### Budget — current

- Possibly doesn't exist as a dedicated tab in current app (categories + amounts edited inline somewhere in Settings)

### Budget — redesign

- First-class tab in the TabBar
- Separates **planning** from **tracking** (tracking lives on Home + Drill)
- Allocation strip visualizes how total cap is sliced
- Read mode + Edit mode toggle
- No rollover in v1

**What to build:** most of this screen is new. Port any existing budget-editing UI into the Edit mode.

### Drill-in (L1/L2/L3) — current

- No equivalent in current app. Categories are shown as a chart but there's no drill interaction.

### Drill-in — redesign

- Three levels, same shape: Expenses → Category → Subcategory
- Month scrubber at top (shared across levels)
- Per-row progress bars (categories only — subs have no budget in v1)
- Breadcrumb in TopBar

**What to build:** all of it. This is the biggest net-new surface.

### Reimbursements — current

- May not exist as a dedicated screen. Per the PRD, reimbursement tracking is a core feature but UX may be buried in Transactions filtering.

### Reimbursements — redesign

- Dedicated screen reached from MORE menu AND from the Home pending banner
- Big total up top, ML-match suggestions, open/closed sections

**What to build:** if no dedicated screen exists, build it. If one exists, replace it.

### Settings — current

8 cards in one long scroll:
1. Bank Connection
2. ICS Import
3. Account
4. Preferences (empty placeholder)
5. Data Export
6. Auto-Categorization
7. Categorization Rules
8. Merchant Database

### Settings — redesign

Hub + 6 sub-pages grouped by verb:

| Old card | New location |
|---|---|
| Bank Connection | Settings → Accounts & Sync |
| Auto-Categorization | Settings → Categorization (merged) |
| Categorization Rules | Settings → Categorization (merged) |
| Merchant Database | Settings → Categorization (merged, as collapsible section) |
| Preferences (empty) | Settings → Preferences (populated with Locale, Fiscal Month Start, Notifications, Appearance) |
| Data Export | Settings → Data Export |
| ICS Import | Settings → Data Export (as sub-section) |
| Account | Settings → Account |
| — | Settings → Danger Zone (new — extracted destructive actions) |

**Motivation:** the current screen is a flat bag. The redesign groups by what you're doing (Manage / Data / Danger) so scary things are separated from routine config.

### Login — current

Unknown — likely a standard email/password or Google button screen.

### Login — redesign

- Google-only (no email/password, no signup link)
- Blinking cursor + wordmark
- Tagline: `PERSONAL FINANCE, SMARTLY.`
- No footer

**What to change:** remove any email/password path, remove signup entirely.

### Transaction Edit Sheet — current

Unknown details. Likely a modal with fields for category, note, etc.

### Edit Sheet — redesign

- Bottom sheet (not full modal)
- Sections: Headline · Category · Flags · Note · Merchant Rules · Manual Resolve
- Note is **not** auto-prompted
- Reimbursable is a **binary toggle**, no free-text "who" field — matching happens automatically when the reimbursement lands
- Delete action at bottom in `warn` color

---

## Cross-cutting changes

### Theme

- Current app appears to support **light theme** (primary) and possibly dark. New: **dark only in v1**. Keep theme toggle infrastructure; just don't ship a light palette.

### Typography

- Current app likely uses a neutral sans (SF Pro / Roboto / Inter). New: **JetBrains Mono for numbers and all UI chrome**, Inter for long-form copy only.
- Add `font-variant-numeric: tabular-nums` to every numeric component.

### Color

- Current palette: standard blue/green/grey. New: `#0E0F11` bg, `#C4F25A` accent, `#FF6B4A` warn. See README for full token list.

### Icons

- If the current app uses a Lucide/Feather/Material icon set, **keep the imports but stop using them** in the redesigned screens. Replace with unicode glyphs or text labels per the new spec. Flag any place an icon is functionally necessary (e.g. share, download) so we can decide case by case.

### Motion

- Remove any ambient animation or parallax. Keep only functional transitions (route changes, sheet slides, cursor blink).

---

## Routing changes

Current routes (inferred) likely flat. New structure adds:

- `/expenses`, `/expenses/:catId`, `/expenses/:catId/:subId` — new drill routes
- `/reimbursements` — new (or promoted from buried flow)
- `/settings/*` — sub-routes split out of the current flat Settings

Set up redirects from any current Settings deep-link to the new sub-routes so existing bookmarks/links don't break.

---

## Data model — unchanged

No schema changes are implied by this redesign. Every new UI element reads data that the PRD already defines:

- Transactions with `category_id`, `is_reimbursable`, `reimbursed_at`, `note`
- Categories with optional `parent_id` (hierarchy) and `monthly_budget`
- Banks with sync state and last-sync timestamp
- User preferences (locale, fiscal month, notifications)

If the pending banner on Home needs a `pending_reimbursement_total` field, it can be computed from `transactions WHERE is_reimbursable AND reimbursed_at IS NULL`.

---

## Migration strategy (suggested)

1. **Palette + tokens first.** Define the new color, type, and spacing tokens in the codebase. Ship dark-only. This one change alone will make the app feel ~60% redesigned.
2. **Shell + navigation.** Replace the top bar / tab bar with the new Shell component. Swap TabBar items to the new set (HOME / TXNS / CAT / BUDGET / MORE).
3. **Home.** Rebuild per the new spec — this is the screen users see every day.
4. **Transactions.** Add filters and sticky month header. Edit sheet redesign.
5. **Budget.** Promote to a tab, split into read/edit modes.
6. **Drill.** Build L1/L2/L3 as a single parameterized component (as the mock does).
7. **Reimbursements.** Build the dedicated screen. Wire the pending banner on Home.
8. **Settings.** Break the flat scroll into hub + sub-pages. Add Danger Zone.
9. **Login.** Replace with the new Google-only screen.

Each step ships independently. The app remains usable after every step.

---

## Non-goals

Explicitly **not** changing:

- Backend / API contracts
- Data model
- Auth provider (still Google per PRD)
- Bank integration (still Enable Banking API)
- Test strategy
- Feature scope

If any of the above need to change to support the redesign, raise it — don't invent scope.
