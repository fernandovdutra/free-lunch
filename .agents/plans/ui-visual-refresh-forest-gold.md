# Feature: UI Visual Refresh - Forest Green & Gold Theme

The following plan should be complete, but it's important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils types and models. Import from the right files etc.

## Feature Description

A comprehensive visual refresh of the Free Lunch app, transitioning from the current generic Emerald green theme to a sophisticated "Professional Forest" palette. This includes:

1. **New Color Palette**: Deep forest green primary, rich gold secondary, warm neutrals
2. **Updated Logo/Icon**: Refined plate+coin icon in the new color scheme
3. **Category Colors**: Harmonized palette that works with the new theme
4. **Dark Mode**: Properly adjusted colors for dark mode
5. **Consistent Application**: All hardcoded colors updated to use the new semantic system

The goal is to create a clean, professional aesthetic inspired by Stripe and Wise - trustworthy but not cold, welcoming but not casual.

## User Story

As a Free Lunch user
I want a visually appealing and professional-looking app
So that I feel confident and comfortable managing my finances

## Problem Statement

The current UI uses a generic Emerald green (#10B981) theme that feels "stock" and lacks personality. The cold gray neutrals make the app feel clinical rather than welcoming. There's no strong brand identity, and the favicon/logo are placeholder-quality.

## Solution Statement

Implement a cohesive "Professional Forest" design system featuring:
- **Primary**: Deep Forest Green (#1D4739) - sophisticated, trustworthy, premium
- **Secondary**: Rich Gold (#C9A227) - warm accent for CTAs, warnings, highlights
- **Info**: Slate Blue (#4A6FA5) - calm, trustworthy for informational elements
- **Error**: Terracotta (#C45C4A) - warm red that's firm but not harsh
- **Neutrals**: Warm-toned grays and whites for backgrounds and text

## Feature Metadata

**Feature Type**: Enhancement
**Estimated Complexity**: Medium
**Primary Systems Affected**:
- `src/index.css` - CSS variables
- `tailwind.config.ts` - Tailwind color definitions
- `src/lib/colors.ts` - Color constants and utilities
- `src/lib/utils.ts` - Amount color utility
- `public/favicon.svg` - App favicon
- `index.html` - Theme color meta tag
- Multiple components with hardcoded colors
- `.claude/reference/free-lunch-design-system.md` - Documentation

**Dependencies**: None (internal styling changes only)

---

## CONTEXT REFERENCES

### Relevant Codebase Files - IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

**Core Color Definition Files:**
- `src/index.css` (lines 1-133) - CSS variables for light/dark mode themes
- `tailwind.config.ts` (lines 1-107) - Tailwind color mappings and category colors
- `src/lib/colors.ts` (lines 1-96) - Color constants, CATEGORY_COLORS, CHART_COLORS, utilities

**Files with Hardcoded Colors (must update):**
- `src/lib/utils.ts` (lines 65-70) - `getAmountColor()` returns Tailwind classes
- `src/components/budgets/BudgetCard.tsx` (lines 15-25) - Status color maps
- `src/components/dashboard/SpendingOverTimeChart.tsx` (lines 33-50) - Chart stroke/fill colors
- `src/components/dashboard/SpendingByCategoryChart.tsx` (lines 84-91, 111) - Tooltip and "Other" color
- `src/components/transactions/TransactionRow.tsx` (lines 87-96, 197-210) - Reimbursement badge colors
- `src/components/dashboard/BudgetOverview.tsx` - Budget status colors (if exists, similar to BudgetCard)

**Logo/Favicon Files:**
- `public/favicon.svg` (lines 1-6) - Current emerald favicon
- `public/free_lunch_icon_vector.svg` (lines 1-76) - Reference icon with plate+coin concept
- `index.html` (line 11) - `theme-color` meta tag

**Documentation:**
- `.claude/reference/free-lunch-design-system.md` - Design system docs (needs update)

### New Files to Create

- `public/logo.svg` - New wordmark logo
- `public/logo-icon.svg` - Simplified icon-only version for small sizes

### Relevant Documentation

- [Color Psychology for Finance Apps](https://www.figma.com/colors/forest-green/)
  - Why: Forest green conveys stability, wealth, and trustworthiness
- [Stripe's Accessible Color System](https://stripe.com/blog/accessible-color-systems)
  - Why: Contrast and accessibility considerations for the new palette
- [60-30-10 Color Rule](https://www.patrickhuijs.com/blog/fintech-brand-colors-guide)
  - Why: Proper color distribution in UI

### Patterns to Follow

**CSS Variable Pattern (from index.css):**
```css
:root {
  --color-primary: 160 84% 39%;  /* HSL format without hsl() wrapper */
  --color-primary-foreground: 0 0% 100%;
}
```

**Tailwind Color Mapping Pattern (from tailwind.config.ts):**
```typescript
colors: {
  primary: {
    DEFAULT: 'hsl(var(--color-primary))',
    foreground: 'hsl(var(--color-primary-foreground))',
  },
}
```

**Color Utility Pattern (from colors.ts):**
```typescript
export const colors = {
  primary: {
    50: '#hex',
    500: '#hex',
    // ... full scale
  },
} as const;
```

**Amount Color Class Pattern (from utils.ts):**
```typescript
export function getAmountColor(amount: number, isPending = false): string {
  if (isPending) return 'text-amber-500';  // Returns Tailwind class
  // ...
}
```

---

## NEW COLOR PALETTE REFERENCE

### Primary - Deep Forest Green
| Shade | Hex | HSL | Usage |
|-------|-----|-----|-------|
| 50 | #E8F0ED | 150 28% 93% | Very light backgrounds |
| 100 | #D1E1DA | 150 25% 85% | Light backgrounds |
| 200 | #A3C4B5 | 150 22% 70% | Borders, dividers |
| 300 | #75A790 | 150 22% 55% | - |
| 400 | #478A6B | 150 32% 41% | - |
| 500 | #2D5A4A | 155 33% 26% | Medium emphasis |
| 600 | #1D4739 | 158 41% 20% | **PRIMARY** - buttons, links |
| 700 | #163829 | 158 44% 15% | Hover states |
| 800 | #0F291D | 158 47% 11% | Active states |
| 900 | #081A11 | 158 50% 7% | Dark mode backgrounds |

### Secondary - Rich Gold
| Shade | Hex | HSL | Usage |
|-------|-----|-----|-------|
| 50 | #FDF6E3 | 45 85% 94% | Subtle warning backgrounds |
| 100 | #F9E9C0 | 43 85% 86% | Light gold backgrounds |
| 200 | #E6C66A | 45 72% 66% | Medium gold |
| 500 | #C9A227 | 45 70% 47% | **SECONDARY** - CTAs, warnings |
| 600 | #A88520 | 45 70% 39% | Hover states |
| 700 | #876A1A | 45 70% 31% | - |

### Info - Slate Blue
| Shade | Hex | Usage |
|-------|-----|-------|
| 50 | #EEF2F7 | Info backgrounds |
| 500 | #4A6FA5 | **INFO** - links, informational |
| 600 | #3D5C8A | Hover states |

### Error - Terracotta
| Shade | Hex | Usage |
|-------|-----|-------|
| 50 | #FBEAE7 | Error backgrounds |
| 500 | #C45C4A | **ERROR/EXPENSE** - negative amounts, errors |
| 600 | #A84D3D | Hover states |

### Neutrals - Warm Toned
| Name | Hex | Usage |
|------|-----|-------|
| Background | #FAFAF8 | Page background (warm white) |
| Card | #FFFFFF | Card surfaces |
| Text Primary | #1A1D1C | Headings, important text |
| Text Secondary | #5C6661 | Body text, labels |
| Text Muted | #8A918D | Placeholder, hints |
| Border | #E2E5E3 | Card borders, dividers |
| Input | #E2E5E3 | Form input borders |

### Category Colors (Harmonized)
| Category | Old Hex | New Hex | Rationale |
|----------|---------|---------|-----------|
| Income | #10B981 | #2D5A4A | Forest green (positive = growth) |
| Housing | #6366F1 | #5B6E8A | Muted slate (stability) |
| Transport | #3B82F6 | #4A6FA5 | Slate blue (movement) |
| Food | #F59E0B | #C9A227 | Rich gold (nourishment) |
| Shopping | #EC4899 | #A67B8A | Dusty mauve (retail) |
| Entertainment | #8B5CF6 | #7B6B8A | Muted purple |
| Health | #14B8A6 | #4A9A8A | Teal (wellness) |
| Personal | #F97316 | #B87D4B | Warm bronze |
| Utilities | #64748B | #6B7C72 | Moss gray |
| Other | #9CA3AF | #9CA3A0 | Neutral gray |

---

## IMPLEMENTATION PLAN

### Phase 1: Core Color Definitions

Update the foundational color system files that cascade to all components.

**Tasks:**
- Update CSS variables in index.css (light and dark modes)
- Update Tailwind config color mappings
- Update colors.ts constants and utilities

### Phase 2: Utility Functions

Update helper functions that return color classes or values.

**Tasks:**
- Update getAmountColor() in utils.ts
- Update any other color-returning utilities

### Phase 3: Component Hardcoded Colors

Fix components that have hardcoded color values instead of using semantic tokens.

**Tasks:**
- Update BudgetCard status colors
- Update chart components (SpendingOverTimeChart, SpendingByCategoryChart)
- Update TransactionRow reimbursement badges
- Update BudgetOverview if it has hardcoded colors

### Phase 4: Logo & Favicon

Create new brand assets in the new color scheme.

**Tasks:**
- Create new favicon.svg with forest green
- Create simplified logo-icon.svg
- Update theme-color in index.html

### Phase 5: Documentation

Update design system documentation to reflect new colors.

**Tasks:**
- Update .claude/reference/free-lunch-design-system.md

---

## STEP-BY-STEP TASKS

IMPORTANT: Execute every task in order, top to bottom. Each task is atomic and independently testable.

---

### Task 1: UPDATE `src/index.css` - Light Mode CSS Variables

- **IMPLEMENT**: Replace the `:root` CSS variables (lines 6-46) with the new Professional Forest palette:

```css
:root {
  /* Background & Foreground - Warm Neutrals */
  --color-background: 40 20% 98%;
  --color-foreground: 160 8% 11%;

  /* Card */
  --color-card: 0 0% 100%;
  --color-card-foreground: 160 8% 11%;

  /* Popover */
  --color-popover: 0 0% 100%;
  --color-popover-foreground: 160 8% 11%;

  /* Primary - Deep Forest Green */
  --color-primary: 158 41% 20%;
  --color-primary-foreground: 0 0% 100%;

  /* Secondary - Rich Gold */
  --color-secondary: 45 70% 47%;
  --color-secondary-foreground: 160 8% 11%;

  /* Muted */
  --color-muted: 150 8% 95%;
  --color-muted-foreground: 155 8% 45%;

  /* Accent - Warm background for hover */
  --color-accent: 150 15% 95%;
  --color-accent-foreground: 160 8% 11%;

  /* Destructive - Terracotta */
  --color-destructive: 10 50% 53%;
  --color-destructive-foreground: 0 0% 100%;

  /* Border & Input - Warm Gray */
  --color-border: 140 8% 89%;
  --color-input: 140 8% 89%;
  --color-ring: 158 41% 20%;

  /* Radius */
  --radius: 0.5rem;
}
```

- **PATTERN**: HSL values without `hsl()` wrapper, following existing pattern
- **GOTCHA**: Don't change the `.dark` section yet - that's Task 2
- **VALIDATE**: `npm run dev` and check that the app loads without errors

---

### Task 2: UPDATE `src/index.css` - Dark Mode CSS Variables

- **IMPLEMENT**: Replace the `.dark` CSS variables (lines 48-85) with dark mode variants:

```css
.dark {
  /* Background & Foreground */
  --color-background: 158 30% 8%;
  --color-foreground: 40 20% 95%;

  /* Card */
  --color-card: 158 25% 12%;
  --color-card-foreground: 40 20% 95%;

  /* Popover */
  --color-popover: 158 25% 12%;
  --color-popover-foreground: 40 20% 95%;

  /* Primary - Slightly lighter forest for dark mode */
  --color-primary: 155 33% 32%;
  --color-primary-foreground: 0 0% 100%;

  /* Secondary - Gold (same, pops on dark) */
  --color-secondary: 45 70% 47%;
  --color-secondary-foreground: 160 8% 11%;

  /* Muted */
  --color-muted: 158 20% 18%;
  --color-muted-foreground: 150 10% 55%;

  /* Accent */
  --color-accent: 158 20% 18%;
  --color-accent-foreground: 40 20% 95%;

  /* Destructive - Lighter terracotta for dark mode */
  --color-destructive: 10 55% 58%;
  --color-destructive-foreground: 0 0% 100%;

  /* Border & Input */
  --color-border: 158 15% 22%;
  --color-input: 158 15% 22%;
  --color-ring: 155 33% 40%;
}
```

- **PATTERN**: Follow light mode structure exactly
- **VALIDATE**: `npm run dev`, toggle dark mode in browser DevTools, verify colors change appropriately

---

### Task 3: UPDATE `tailwind.config.ts` - Amount Colors

- **IMPLEMENT**: Update the `amount` colors object (lines 45-50):

```typescript
amount: {
  positive: '#2D5A4A',  // Forest green for income
  negative: '#C45C4A',  // Terracotta for expenses
  neutral: '#5C6661',   // Warm gray
  pending: '#C9A227',   // Gold for pending
},
```

- **PATTERN**: Direct hex values, same as existing
- **VALIDATE**: `npm run typecheck`

---

### Task 4: UPDATE `tailwind.config.ts` - Category Colors

- **IMPLEMENT**: Update the `category` colors object (lines 53-64):

```typescript
category: {
  income: '#2D5A4A',      // Forest green
  housing: '#5B6E8A',     // Slate
  transport: '#4A6FA5',   // Slate blue
  food: '#C9A227',        // Gold
  shopping: '#A67B8A',    // Dusty mauve
  entertainment: '#7B6B8A', // Muted purple
  health: '#4A9A8A',      // Teal
  personal: '#B87D4B',    // Warm bronze
  utilities: '#6B7C72',   // Moss gray
  other: '#9CA3A0',       // Neutral
},
```

- **VALIDATE**: `npm run typecheck`

---

### Task 5: UPDATE `src/lib/colors.ts` - Primary Color Scale

- **IMPLEMENT**: Replace the `primary` object in `colors` (lines 7-18):

```typescript
primary: {
  50: '#E8F0ED',
  100: '#D1E1DA',
  200: '#A3C4B5',
  300: '#75A790',
  400: '#478A6B',
  500: '#2D5A4A',
  600: '#1D4739',
  700: '#163829',
  800: '#0F291D',
  900: '#081A11',
},
```

- **PATTERN**: Full 50-900 scale like existing
- **VALIDATE**: `npm run typecheck`

---

### Task 6: UPDATE `src/lib/colors.ts` - Gray Scale (Warm)

- **IMPLEMENT**: Replace the `gray` object (lines 19-30):

```typescript
gray: {
  50: '#FAFAF8',
  100: '#F5F5F3',
  200: '#E2E5E3',
  300: '#C9CDCB',
  400: '#9CA3A0',
  500: '#6B7C72',
  600: '#5C6661',
  700: '#454B48',
  800: '#2E3331',
  900: '#1A1D1C',
},
```

- **VALIDATE**: `npm run typecheck`

---

### Task 7: UPDATE `src/lib/colors.ts` - Semantic Colors

- **IMPLEMENT**: Replace the `semantic` object (lines 31-36):

```typescript
semantic: {
  success: '#2D5A4A',   // Forest green
  error: '#C45C4A',     // Terracotta
  warning: '#C9A227',   // Gold
  info: '#4A6FA5',      // Slate blue
},
```

- **VALIDATE**: `npm run typecheck`

---

### Task 8: UPDATE `src/lib/colors.ts` - Amount Colors

- **IMPLEMENT**: Replace the `amount` object (lines 37-42):

```typescript
amount: {
  positive: '#2D5A4A',  // Forest green
  negative: '#C45C4A',  // Terracotta
  neutral: '#5C6661',   // Warm gray
  pending: '#C9A227',   // Gold
},
```

- **VALIDATE**: `npm run typecheck`

---

### Task 9: UPDATE `src/lib/colors.ts` - Category Colors

- **IMPLEMENT**: Replace the `CATEGORY_COLORS` object (lines 48-59):

```typescript
export const CATEGORY_COLORS: Record<string, string> = {
  income: '#2D5A4A',
  housing: '#5B6E8A',
  transport: '#4A6FA5',
  food: '#C9A227',
  shopping: '#A67B8A',
  entertainment: '#7B6B8A',
  health: '#4A9A8A',
  personal: '#B87D4B',
  utilities: '#6B7C72',
  other: '#9CA3A0',
};
```

- **VALIDATE**: `npm run typecheck`

---

### Task 10: UPDATE `src/lib/colors.ts` - Chart Colors

- **IMPLEMENT**: Replace the `CHART_COLORS` array (lines 64-75):

```typescript
export const CHART_COLORS = [
  '#2D5A4A',  // Forest green
  '#5B6E8A',  // Slate
  '#4A6FA5',  // Slate blue
  '#C9A227',  // Gold
  '#A67B8A',  // Dusty mauve
  '#7B6B8A',  // Muted purple
  '#4A9A8A',  // Teal
  '#B87D4B',  // Warm bronze
  '#6B7C72',  // Moss gray
  '#C45C4A',  // Terracotta
];
```

- **VALIDATE**: `npm run typecheck`

---

### Task 11: UPDATE `src/lib/utils.ts` - getAmountColor Function

- **IMPLEMENT**: Replace the `getAmountColor` function (lines 65-70):

```typescript
export function getAmountColor(amount: number, isPending = false): string {
  if (isPending) return 'text-secondary';      // Gold
  if (amount > 0) return 'text-primary';       // Forest green
  if (amount < 0) return 'text-destructive';   // Terracotta
  return 'text-muted-foreground';              // Warm gray
}
```

- **PATTERN**: Use semantic Tailwind classes instead of hardcoded colors
- **GOTCHA**: This changes from `text-emerald-500` etc. to semantic classes
- **VALIDATE**: `npm run typecheck`

---

### Task 12: UPDATE `src/components/budgets/BudgetCard.tsx` - Status Colors

- **IMPLEMENT**: Replace the status color maps (lines 15-25):

```typescript
const statusColors = {
  safe: 'bg-primary',        // Forest green
  warning: 'bg-secondary',   // Gold
  exceeded: 'bg-destructive', // Terracotta
};

const statusTextColors = {
  safe: 'text-primary',
  warning: 'text-secondary',
  exceeded: 'text-destructive',
};
```

- **IMPLEMENT**: Also update the icon colors in the JSX (lines 40-48):

```tsx
{status === 'exceeded' && (
  <AlertTriangle className="h-4 w-4 text-destructive" />
)}
{status === 'warning' && (
  <TrendingUp className="h-4 w-4 text-secondary" />
)}
{status === 'safe' && percentage > 0 && (
  <TrendingDown className="h-4 w-4 text-primary" />
)}
```

- **PATTERN**: Use semantic classes instead of hardcoded colors
- **VALIDATE**: `npm run typecheck && npm run lint`

---

### Task 13: UPDATE `src/components/dashboard/SpendingOverTimeChart.tsx` - Chart Colors

- **IMPLEMENT**: Update the hardcoded colors in the chart (lines 33-50):

```tsx
<CartesianGrid strokeDasharray="3 3" stroke="#E2E5E3" vertical={false} />
<XAxis
  dataKey="date"
  tick={{ fontSize: 12, fill: '#5C6661' }}
  tickLine={false}
  axisLine={{ stroke: '#E2E5E3' }}
/>
<YAxis
  tick={{ fontSize: 12, fill: '#5C6661' }}
  tickLine={false}
  axisLine={false}
  tickFormatter={(value) =>
    value >= 1000 ? `€${(value / 1000).toFixed(1)}k` : `€${value}`
  }
  width={60}
/>
<Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }} />
<Bar dataKey="expenses" fill="#C45C4A" radius={[4, 4, 0, 0]} isAnimationActive={true} />
```

- **IMPLEMENT**: Also update the CustomTooltip colors (lines 70-77):

```tsx
function CustomTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length || !payload[0]) return null;

  return (
    <div className="rounded-lg border border-border bg-card p-3 shadow-lg">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-lg font-bold tabular-nums text-destructive">
        {formatAmount(-payload[0].value, { showSign: false })}
      </p>
    </div>
  );
}
```

- **GOTCHA**: The bar color (#C45C4A - terracotta) must be a hex value for Recharts
- **VALIDATE**: `npm run typecheck && npm run lint`

---

### Task 14: UPDATE `src/components/dashboard/SpendingByCategoryChart.tsx` - Tooltip & Other Color

- **IMPLEMENT**: Update the CustomTooltip component (lines 79-92):

```tsx
function CustomTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length || !payload[0]) return null;

  const data = payload[0].payload;
  return (
    <div className="rounded-lg border border-border bg-card p-3 shadow-lg">
      <p className="font-medium text-foreground">{data.name}</p>
      <p className="text-lg font-bold tabular-nums text-foreground">
        {formatAmount(data.value, { showSign: false })}
      </p>
      <p className="text-sm text-muted-foreground">{data.percentage.toFixed(1)}%</p>
    </div>
  );
}
```

- **IMPLEMENT**: Update the "Other" category color (line 111):

```typescript
chartData.push({
  name: 'Other',
  value: otherAmount,
  color: '#9CA3A0',  // Updated neutral gray
  percentage: otherPercentage,
});
```

- **VALIDATE**: `npm run typecheck && npm run lint`

---

### Task 15: UPDATE `src/components/transactions/TransactionRow.tsx` - Reimbursement Badge Colors

- **IMPLEMENT**: Find and update the reimbursement badge classes. Look for `bg-amber-100 text-amber-700` and `bg-emerald-100 text-emerald-700` patterns and replace with semantic classes:

For pending reimbursement badge:
```tsx
className="... bg-secondary/15 text-secondary dark:bg-secondary/20 ..."
```

For cleared reimbursement badge:
```tsx
className="... bg-primary/15 text-primary dark:bg-primary/20 ..."
```

For action text colors (around lines 197, 210):
```tsx
className="text-secondary dark:text-secondary"  // For reimbursable action
className="text-primary dark:text-primary"      // For clear reimbursement action
```

- **GOTCHA**: Preserve all other classes, only change the color-related ones
- **VALIDATE**: `npm run typecheck && npm run lint`

---

### Task 16: CHECK and UPDATE `src/components/dashboard/BudgetOverview.tsx`

- **IMPLEMENT**: If this file contains hardcoded color classes similar to BudgetCard.tsx, update them to use semantic classes:

Look for patterns like:
- `bg-emerald-500` → `bg-primary`
- `bg-amber-500` → `bg-secondary`
- `bg-red-500` → `bg-destructive`
- `text-emerald-500` → `text-primary`
- `text-amber-500` → `text-secondary`
- `text-red-500` → `text-destructive`

- **VALIDATE**: `npm run typecheck && npm run lint`

---

### Task 17: CREATE `public/favicon.svg` - New Forest Green Favicon

- **IMPLEMENT**: Replace the entire favicon.svg content with a new design:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <!-- Background -->
  <rect width="32" height="32" rx="6" fill="#1D4739"/>

  <!-- Simplified plate ring -->
  <circle cx="16" cy="16" r="10" fill="none" stroke="#FFFFFF" stroke-width="1.5" opacity="0.9"/>
  <circle cx="16" cy="16" r="7" fill="none" stroke="#FFFFFF" stroke-width="1" opacity="0.6"/>

  <!-- Gold coin center -->
  <circle cx="16" cy="16" r="4.5" fill="#C9A227"/>

  <!-- Euro symbol on coin -->
  <text x="16" y="18.5" font-family="system-ui, sans-serif" font-size="6" font-weight="600" fill="#1D4739" text-anchor="middle">€</text>
</svg>
```

- **PATTERN**: Simple, recognizable at 16x16, uses new brand colors
- **VALIDATE**: Open `public/favicon.svg` in browser to preview

---

### Task 18: UPDATE `index.html` - Theme Color Meta Tag

- **IMPLEMENT**: Update the theme-color meta tag (line 11):

```html
<meta name="theme-color" content="#1D4739" />
```

- **VALIDATE**: `npm run build` succeeds

---

### Task 19: UPDATE `.claude/reference/free-lunch-design-system.md` - Color Documentation

- **IMPLEMENT**: Update the Color System section (around lines 71-230) to reflect the new palette. Key updates:

1. Replace the "Philosophy" section to explain the Professional Forest concept
2. Update all color tables with new hex values
3. Update the CSS Variables code block
4. Update the TypeScript Color Helper code block
5. Update the Category Colors code block
6. Update the Chart Colors section

- **GOTCHA**: This is documentation - ensure accuracy for future development
- **VALIDATE**: Review the markdown renders correctly

---

### Task 20: RUN Full Validation Suite

- **IMPLEMENT**: Execute all validation commands:

```bash
# Level 1: Syntax & Style
npm run lint
npm run typecheck
npm run format:check

# Level 2: Unit Tests
npm run test

# Level 3: Build
npm run build

# Level 4: Visual Check
npm run dev
# Manually verify:
# - Dashboard renders with new colors
# - Charts use new color palette
# - Dark mode works correctly
# - Buttons, badges, and status indicators use correct colors
```

- **VALIDATE**: All commands pass with zero errors

---

## TESTING STRATEGY

### Visual Regression Testing (Manual)

Since this is primarily a visual change, manual testing is critical:

1. **Light Mode Checklist:**
   - [ ] Primary buttons are forest green
   - [ ] Positive amounts are forest green
   - [ ] Negative amounts are terracotta
   - [ ] Pending items are gold
   - [ ] Background is warm white (not cold gray)
   - [ ] Text is readable with proper contrast

2. **Dark Mode Checklist:**
   - [ ] Colors adjust appropriately
   - [ ] Sufficient contrast maintained
   - [ ] Primary color slightly lighter
   - [ ] Gold pops against dark backgrounds

3. **Component Checklist:**
   - [ ] Dashboard summary cards
   - [ ] Spending charts (donut and bar)
   - [ ] Transaction list with amounts
   - [ ] Budget progress bars and status
   - [ ] Reimbursement badges
   - [ ] Navigation active states
   - [ ] Buttons (all variants)
   - [ ] Form inputs and labels

### Unit Tests

Run existing tests to ensure no functionality broke:
```bash
npm run test
```

### E2E Tests

Run existing E2E tests to ensure UI still functions:
```bash
npm run firebase:emulators &
sleep 10
npm run e2e
```

---

## VALIDATION COMMANDS

### Level 1: Syntax & Style

```bash
npm run lint
npm run typecheck
npm run format:check
```

### Level 2: Unit Tests

```bash
npm run test
```

### Level 3: Build

```bash
npm run build
```

### Level 4: E2E Tests

```bash
npm run firebase:emulators &
sleep 10
npm run e2e
```

### Level 5: Manual Visual Validation

1. Start dev server: `npm run dev`
2. Open http://localhost:5173
3. Check each page in both light and dark modes
4. Verify color consistency across all components
5. Test on mobile viewport sizes

---

## ACCEPTANCE CRITERIA

- [ ] Primary color is deep forest green (#1D4739) throughout the app
- [ ] Secondary/accent color is rich gold (#C9A227) for CTAs, warnings, pending states
- [ ] Positive amounts display in forest green
- [ ] Negative amounts display in terracotta
- [ ] Backgrounds are warm-toned (not cold gray)
- [ ] Charts use the new harmonized category colors
- [ ] Dark mode functions correctly with adjusted colors
- [ ] Favicon updated to new design
- [ ] Theme color meta tag updated
- [ ] All hardcoded color values replaced with semantic tokens where possible
- [ ] Design system documentation updated
- [ ] All validation commands pass with zero errors
- [ ] No visual regressions in existing functionality

---

## COMPLETION CHECKLIST

- [ ] All 20 tasks completed in order
- [ ] Each task validation passed immediately
- [ ] All validation commands executed successfully
- [ ] Manual visual testing confirms new colors look correct
- [ ] Dark mode tested and working
- [ ] Design system documentation updated
- [ ] No linting or type checking errors
- [ ] Build succeeds

---

## NOTES

### Design Decisions

1. **Forest Green over Emerald**: The current emerald (#10B981) is too "stock" and bright. Forest green (#1D4739) is more sophisticated and premium-feeling, like private banking.

2. **Terracotta over Pure Red**: The standard red (#EF4444) feels harsh and alarming. Terracotta (#C45C4A) is still clearly "negative" but warmer and less anxiety-inducing for a finance app.

3. **Gold as Secondary**: Gold (#C9A227) replaces amber for warnings/pending. It's more premium and works as a proper accent color, not just for warnings.

4. **Warm Neutrals**: Cold grays (the default) make apps feel clinical. Warm neutrals (#FAFAF8 background) feel more welcoming while remaining professional.

5. **Semantic Classes over Hardcoded**: Where possible, we're replacing hardcoded color classes with semantic ones (text-primary, text-secondary, etc.) for better maintainability.

### Known Limitations

- Recharts requires hex values for colors, so chart fills can't use CSS variables
- Some component libraries may have their own color opinions that need overriding
- Category colors in existing data won't change automatically (only new categories)

### Future Improvements

- Add a color mode toggle (light/dark) in the header
- Consider adding a high-contrast mode for accessibility
- Add subtle gradients to buttons and cards for more depth
- Create proper logo wordmark with custom typography

### Color Accessibility Notes

All color combinations should meet WCAG AA standards:
- Text on backgrounds: minimum 4.5:1 contrast ratio
- Large text/UI: minimum 3:1 contrast ratio
- Interactive elements: clearly distinguishable states

The forest green (#1D4739) on white has a contrast ratio of ~10:1, well above requirements.
