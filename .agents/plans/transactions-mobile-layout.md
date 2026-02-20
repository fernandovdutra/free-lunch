# Transactions Page — Mobile Layout Fix

## Problem

On iPhone portrait (~390px), the `TransactionList` uses a fixed-width flex table layout that overflows:

- `w-28` (112px) Date + `flex-1` Description + `w-36` (144px) Category + `w-6` Split + `w-24` (96px) Amount + `w-8` (32px) Actions = **408px minimum**, before description
- Columns overlap and text is clipped (see screenshot: "DeSetegdory" overlap, "Amo..." cut off)
- The actions button is `opacity-0 group-hover:opacity-100` — hover doesn't exist on mobile

## Solution

Responsive layout using Tailwind breakpoints:
- **Mobile** (`< sm`, < 640px): Two-line card layout
  - Line 1: Description (flex-1, truncated) + Amount (right-aligned, bold)
  - Line 2: Date (muted, small) + Category badge + badges (ICS, reimbursement, etc.)
  - Actions: Always-visible `⋯` button on mobile (no hover)
- **Desktop** (`sm:`, ≥ 640px): Keep existing table layout unchanged

## Files to Modify

- `src/components/transactions/TransactionRow.tsx` — main change
- `src/components/transactions/TransactionList.tsx` — hide header row on mobile

## Context References

- `src/components/transactions/TransactionRow.tsx` — full row layout
- `src/components/transactions/TransactionList.tsx` — header row
- `.claude/reference/free-lunch-design-system.md` — design tokens (Forest/Gold theme)

---

## Implementation

### Task 1: TransactionRow — responsive layout

**File:** `src/components/transactions/TransactionRow.tsx`

Replace the entire `return (` JSX with a responsive version:

**Current structure:**
```tsx
<div className="group flex items-center gap-4 ...">
  {/* Date: w-28 */}
  {/* Description: flex-1 */}
  {/* Category: w-36 */}
  {/* Split: w-6 */}
  {/* Amount: w-24 */}
  {/* Actions: w-8, opacity-0 hover:opacity-100 */}
</div>
```

**New structure:**
```tsx
<div className={cn('group border-b border-border px-4 py-3 transition-colors hover:bg-muted/50', isExcluded && 'opacity-50')} ...>

  {/* ── MOBILE LAYOUT (hidden on sm+) ── */}
  <div className="flex flex-col gap-1 sm:hidden">
    {/* Row 1: Description + Amount + Actions */}
    <div className="flex items-start gap-2">
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">
          {description}
        </p>
        {/* Counterparty */}
        {transaction.counterparty && (
          <Link ...>{transaction.counterparty}</Link>
        )}
      </div>
      {/* Amount */}
      <div className={cn('flex-shrink-0 font-medium tabular-nums text-sm', amountColor)}>
        {isIncome ? <ArrowUpRight .../> : isExpense ? <ArrowDownRight .../> : null}
        {formatAmount(transaction.amount)}
      </div>
      {/* Actions - always visible on mobile */}
      <div className="flex-shrink-0">
        {/* ... button and dropdown (same as current) */}
      </div>
    </div>
    {/* Row 2: Date + Badges + Category */}
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-xs text-muted-foreground">
        {formatDate(transaction.transactionDate ?? transaction.date, 'short')}
      </span>
      {/* All badges: reimbursement, ICS, etc. */}
      {isPendingReimbursement && <span ...>IOU</span>}
      {isClearedReimbursement && <span ...>Cleared</span>}
      {isIcsImport && <span ...>ICS</span>}
      {isIcsLumpSum && <button ...>💳 ICS →</button>}
      {/* Category */}
      {isPickingCategory ? <CategoryPicker .../> : category ? <button onClick={handleCategoryClick}><CategoryBadge .../></button> : <button onClick={handleCategoryClick}>? Uncategorized</button>}
    </div>
  </div>

  {/* ── DESKTOP LAYOUT (hidden on mobile, flex on sm+) ── */}
  <div className="hidden sm:flex sm:items-center sm:gap-4">
    {/* Date: w-28 */}
    {/* Description: flex-1 */}
    {/* Category: w-36 */}
    {/* Split: w-6 */}
    {/* Amount: w-24 */}
    {/* Actions: w-8, opacity-0 group-hover:opacity-100 */}
    {/* (exact same as current code) */}
  </div>

</div>
```

**Key implementation notes:**
- Mobile actions button: remove `opacity-0 group-hover:opacity-100`, always show on mobile. On desktop keep hover behavior.
- Use `sm:hidden` and `hidden sm:flex` (Tailwind v3 syntax) to switch layouts
- `formatDate` call for mobile row 2: use `'short'` format (e.g., "20 Feb 20:47") — check what formats are available in `src/lib/utils.ts`
- Keep ALL existing functionality: category picker, reimbursement, split indicator, ICS badges, dropdown menu

### Task 2: TransactionList — hide header on mobile

**File:** `src/components/transactions/TransactionList.tsx`

Add `hidden sm:flex` to the header row:

```tsx
{/* CHANGE: was "flex items-center..." — add hidden sm:flex */}
<div className="hidden sm:flex items-center gap-4 bg-muted/50 px-4 py-2 text-sm font-medium text-muted-foreground">
  <div className="w-28 flex-shrink-0">Date</div>
  <div className="min-w-0 flex-1">Description</div>
  <div className="w-36 flex-shrink-0">Category</div>
  <div className="w-6 flex-shrink-0" />
  <div className="w-24 flex-shrink-0 text-right">Amount</div>
  <div className="w-8 flex-shrink-0" />
</div>
```

---

## Validation Commands

```bash
cd /home/yusuke/.openclaw/workspace/repos/free-lunch
npm run build
npm run lint
```

Expected: zero TypeScript errors, successful Vite build.

---

## Manual Validation

After deploying to https://free-lunch-85447.web.app:

1. Open on iPhone Safari (portrait mode) → Transactions page
2. ✅ Each transaction shows as a 2-line card
3. ✅ Description + amount on first line (no overflow)
4. ✅ Date + category badge on second line
5. ✅ Actions button visible without hover
6. ✅ Tapping category badge opens picker
7. ✅ On desktop browser: original table layout unchanged

---

## Acceptance Criteria

- [ ] No horizontal overflow / text clipping on iPhone portrait (390px)
- [ ] Description readable, amount visible, category accessible
- [ ] All existing actions work on mobile (edit, delete, category change)
- [ ] Desktop table layout unchanged
- [ ] `npm run build` passes

---

## Notes

- Check `src/lib/utils.ts` for available `formatDate` format options before choosing mobile date format
- The `isExcluded` opacity and title should apply to both mobile and desktop wrappers
- The split indicator (`<Split />` icon) can be shown inline on mobile row 2 if the transaction is split (small icon after badges)
- Don't add `overflow-x: auto` to the container — that's a workaround, not a fix
