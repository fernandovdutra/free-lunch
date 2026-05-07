# Phase 7 — handoff for next session

## What's done

`origin/ui-redesign` is at **`3f34852`**. Phase 7a + 7b + 7e are
landed and iPhone-verified after two corrective rounds:

- `cac244f` — primitives (Scrubber, Breadcrumb, DrillRow, DrillHeadline,
  buildDrillBreadcrumb), TopBar drill chrome, SpendingExplorer (L1)
  rewrite.
- `b0c9bc5` — QA round 1: TopBar drill mode reverted to month-nav
  (same chrome as main), hairline below Scrubber, BY CATEGORY shrunk
  to 9.5px, drill row meta = full README format
  `N TXN · X% OF MMM · €Y LEFT`, Scrubber tap decoupled from
  MonthContext (window stays anchored, only headline + rows refresh).
- `3f34852` — QA round 2: selected month renders as a fully-painted
  accent bar (was a 2-px tip — misread of v8); bars + selected
  indicator + headline label all source from `data.monthlyTotals`
  / `data.currentMonth` instead of recomputing from local time
  (works around a pre-existing app-wide TZ quirk).

User signed off on the L1 page after round 2.

## What's next: 7c (L2) + 7d (L3)

Both routes already exist; the page bodies need rewriting against the
primitives that already shipped.

### 7c — `/expenses/:categoryId` — `src/pages/SpendingCategory.tsx`

Compose the same shape as L1:
```
[Breadcrumb: ← EXPENSES › <CATEGORY_NAME>]
[DrillHeadline: €919.00 · APR 2026 · BUDGET €950]
[Scrubber] (this category's budget for the dashed line)
[hairline]
[BY SUBCATEGORY · N TOTAL]
[Numbered DrillRow list — bars scaled vs PARENT category budget]
```

Key differences vs L1:
- Breadcrumb segments come from `buildDrillBreadcrumb` (already
  handles category-name lookup via `useCategories`).
- Scrubber `budget` prop = the category's `monthlyLimit` from
  `useBudgetProgress` (look up by `categoryId`).
- Subcategory rows: `progress = subcat.amount`, `max = parent
  category budget`. **No `over` variant** for subcategories
  (subcats can't be "over budget" individually; parent owns the
  budget). Drop the `LEFT`/`OVER` tail in meta.
- **Leaf-category special case**: when `data.categories` is empty
  but `data.transactions` is present (a category with no
  subcategories — see existing `SpendingCategory.tsx` line 19 for
  the data shape), render the L3 layout (TRANSACTIONS section,
  day-grouped TransactionRows) inside the L2 page. This mirrors
  the existing fall-through.

### 7d — `/expenses/:categoryId/:subcategoryId` — `src/pages/SpendingSubcategory.tsx`

Same shape, with:
- Breadcrumb shows last 2 segments only (the Breadcrumb primitive
  already truncates) → `← <CATEGORY> › <SUBCATEGORY>`.
- DrillHeadline has **no** `budgetCaption` (subcats have no budget).
- Scrubber gets **no `budget` prop** (no dashed line, no alert
  state — bars + labels only).
- Section header: `TRANSACTIONS · N TXN`.
- Rows: day-grouped Transactions list. Reuse:
  - `groupByMonthThenDay` from
    `src/components/transactions/groupTransactions.ts`
  - `DayHeader` from `src/components/redesign/DayHeader`
  - `TransactionRow` from `src/components/redesign/TransactionRow`
- Tap a transaction → open Phase 6 Edit Sheet via the `?id=…`
  pattern. Copy the deep-link mechanism from
  `src/pages/Transactions.tsx` (search for `searchParams.get('id')`
  and the `<TransactionForm>` mount). Closing the sheet returns
  to the drill page (URL clears `id`).

`SpendingCounterparty.tsx` stays as-is in the route table but
becomes orphaned from the drill funnel. Phase 11 decides whether to
restyle, redirect, or delete.

## Primitives & helpers ready to reuse

All exported from `@/components/redesign`:
- `Scrubber({ bars, selectedMonthKey, budget?, budgetCaption?, onSelectMonth })`
- `Breadcrumb({ segments, onBack, onSegmentClick? })` — auto-truncates to last 2
- `buildDrillBreadcrumb({ pathname, categories })` — returns full chain;
  Breadcrumb does the truncate.
- `DrillHeadline({ amountFormatted, monthLabel, budgetCaption? })` —
  split-cents
- `DrillRow({ index, name, amount, meta?, progress?, max?, variant?, onClick? })`
- `DrillSectionHeader` — local to `SpendingExplorer.tsx`; if 7c/7d
  also need it, lift it into `redesign/`.

## Backend-driven scrubber pattern (USE THIS, don't reinvent)

L1 wires this; copy into 7c/7d:

```ts
const [highlightedMonth, setHighlightedMonth] = useState<string | undefined>();
const { data } = useSpendingExplorer({
  direction,
  categoryId,         // 7c/7d
  subcategoryId,      // 7d
  ...(highlightedMonth ? { breakdownMonthKey: highlightedMonth } : {}),
});

// scrubberBars from data.monthlyTotals (NOT recomputed from local time)
const scrubberBars = useMemo(() => {
  const totals = data?.monthlyTotals ?? [];
  if (totals.length === 6) {
    return totals.map(t => ({
      monthKey: t.monthKey,
      label: format(parseISO(`${t.monthKey}-01`), 'MMM').toUpperCase(),
      amount: t.amount,
    }));
  }
  return Array.from({ length: 6 }, (_, i) => ({
    monthKey: `placeholder-${i}`, label: '', amount: 0
  }));
}, [data]);

const backendCurrentMonthKey = scrubberBars.at(-1)?.monthKey ?? '';
const selectedMonthKey = highlightedMonth ?? backendCurrentMonthKey;
const handleSelectMonth = (mk: string) => {
  setHighlightedMonth(mk === backendCurrentMonthKey ? undefined : mk);
};

// breakdownLabel from data.currentMonth (e.g. "March 2026" → "MAR 2026")
const breakdownLabel = useMemo(() => {
  const cm = data?.currentMonth;
  if (!cm) return '';
  const parsed = new Date(`${cm} 1`);
  return Number.isNaN(parsed.getTime())
    ? cm.toUpperCase()
    : format(parsed, 'MMM yyyy').toUpperCase();
}, [data]);
```

The reason for backend-driven: a frontend-vs-Functions-emulator TZ
quirk shifts months by one at boundaries. Sourcing from the response
keeps the page internally consistent. Out of Phase 7 scope to fix
properly — flagged for Phase 11.

## Stack startup (still running)

Emulators are running; `.env.local` exists and points at
`192.168.68.59:5173`. Vite dev is bound to that LAN URL. If
anything is down, follow `docs/PHONE_DEV_WORKFLOW.md`. The user
seed is in place — `test@freelunch.local` / `test1234`,
`?dev=1` reveals the dev login form.

If the test user vanished (sometimes the emulator-data export
drops on hard kill), re-seed with `node scripts/seed-emulator.mjs`.

## Verification protocol

1. `npm run typecheck` + `npm run lint` clean on touched files
2. Browser preview at `http://localhost:5180/expenses/:cat` etc.
   via the running `dev-preview` server. iPhone walkthrough on
   `http://192.168.68.59:5173`.
3. Log into the dev preview using the dev form, then visit the
   drill routes directly. The iPhone uses the LAN URL.
4. Wait for "looks good" before committing each sub-checkpoint.

## Known TZ quirk (Phase 11 ticket)

The Functions emulator runs in UTC; the frontend sends
`selectedMonth.toISOString()` which converts CEST start-of-month
to UTC end-of-prev-month. Backend buckets by UTC, so when local =
APR, backend sees MAR. TopBar still shows local-month label,
drill pages now show backend-month label — they disagree by one
month. User accepts this for now. Document this in the Phase 11
state snapshot when we get there.

## Commit cadence

One commit per sub-checkpoint, prefixed `ui-redesign(drill-7c)` /
`ui-redesign(drill-7d)`. Push to `origin/ui-redesign` after each.
Update `docs/redesign/IMPLEMENTATION_PLAN.md` Phase 7 state
snapshot with each landing — the `◐` status row at the top should
flip to `☑` once 7d ships.
