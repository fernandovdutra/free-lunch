# Free Lunch Design System

A comprehensive guide for building the Free Lunch personal finance app with consistent visual design, interactions, and user experience patterns.

---

## Table of Contents

1. [Brand Foundation](#1-brand-foundation)
2. [Color System](#2-color-system)
3. [Typography](#3-typography)
4. [Spacing & Layout](#4-spacing--layout)
5. [Border Radius & Shadows](#5-border-radius--shadows)
6. [Components](#6-components)
7. [Navigation & Layout](#7-navigation--layout)
8. [Data Display](#8-data-display)
9. [Forms & Inputs](#9-forms--inputs)
10. [Icons](#10-icons)
11. [Charts & Visualizations](#11-charts--visualizations)
12. [Animation & Motion](#12-animation--motion)
13. [Accessibility](#13-accessibility)
14. [Dark Mode](#14-dark-mode)
15. [Implementation Guide](#15-implementation-guide)

---

## 1. Brand Foundation

### Brand Identity

Free Lunch is a personal finance app that emphasizes **clarity**, **simplicity**, and **user empowerment**. The visual design should feel trustworthy like a bank, but approachable and modern—never intimidating or overwhelming.

The name "Free Lunch" carries a playful, libertarian undertone. The design balances this personality with the seriousness of financial data.

### Core Design Principles

| Principle         | Description                                                                            |
| ----------------- | -------------------------------------------------------------------------------------- |
| **Clarity**       | Financial data is complex; our UI makes it simple. Clear hierarchy, scannable layouts. |
| **Calm**          | Money can be stressful. Use soothing colors and generous whitespace to reduce anxiety. |
| **Honesty**       | Show real numbers. No gamification, no hidden fees, no dark patterns.                  |
| **Efficiency**    | Users check their finances quickly. Optimize for fast comprehension, not engagement.   |
| **Accessibility** | Everyone deserves financial clarity. WCAG AA compliant minimum.                        |

### Brand Voice

- **Friendly but not casual** - "Your groceries spending is up 15% this month" not "Whoa, you're spending a lot on food!"
- **Informative not preachy** - Show data, don't lecture about spending habits
- **Clear not clever** - "Uncategorized" not "Mystery Money"

### Logo Usage

**Logo Concept:** A simple, friendly wordmark with a subtle visual element suggesting growth or freedom.

**Logo Variations:**

- `free-lunch-logo.svg` - Full color for light backgrounds
- `free-lunch-logo-dark.svg` - For dark backgrounds
- `free-lunch-icon.svg` - App icon, favicon

**Logo Sizing:**

- Header: `h-6` (24px height)
- Login/splash: `h-10` (40px height)
- Favicon: 32x32px

**Clear Space:** Maintain minimum padding of 1x logo height around the logo.

---

## 2. Color System

### Philosophy

We use a "Professional Forest" color palette—deep forest green represents stability, wealth, and trustworthiness, while avoiding the harsh "money green" of cheap finance apps. The warm gold secondary adds premium warmth, and terracotta replaces harsh red for a softer, less anxiety-inducing approach to negative amounts. Warm-toned neutrals create a welcoming, professional feel.

### Primary Palette - Deep Forest Green

| Color                                                    | Name            | Hex       | HSL           | Usage                                              |
| -------------------------------------------------------- | --------------- | --------- | ------------- | -------------------------------------------------- |
| ![#E8F0ED](https://via.placeholder.com/20/E8F0ED/E8F0ED) | **Forest 50**   | `#E8F0ED` | `150 28% 93%` | Very light backgrounds                             |
| ![#D1E1DA](https://via.placeholder.com/20/D1E1DA/D1E1DA) | **Forest 100**  | `#D1E1DA` | `150 25% 85%` | Light backgrounds                                  |
| ![#A3C4B5](https://via.placeholder.com/20/A3C4B5/A3C4B5) | **Forest 200**  | `#A3C4B5` | `150 22% 70%` | Borders, dividers                                  |
| ![#75A790](https://via.placeholder.com/20/75A790/75A790) | **Forest 300**  | `#75A790` | `150 22% 55%` | -                                                  |
| ![#478A6B](https://via.placeholder.com/20/478A6B/478A6B) | **Forest 400**  | `#478A6B` | `150 32% 41%` | -                                                  |
| ![#2D5A4A](https://via.placeholder.com/20/2D5A4A/2D5A4A) | **Forest 500**  | `#2D5A4A` | `155 33% 26%` | Medium emphasis                                    |
| ![#1D4739](https://via.placeholder.com/20/1D4739/1D4739) | **Forest 600**  | `#1D4739` | `158 41% 20%` | **PRIMARY** - buttons, links                       |
| ![#163829](https://via.placeholder.com/20/163829/163829) | **Forest 700**  | `#163829` | `158 44% 15%` | Hover states                                       |
| ![#0F291D](https://via.placeholder.com/20/0F291D/0F291D) | **Forest 800**  | `#0F291D` | `158 47% 11%` | Active states                                      |
| ![#081A11](https://via.placeholder.com/20/081A11/081A11) | **Forest 900**  | `#081A11` | `158 50% 7%`  | Dark mode backgrounds                              |

### Secondary Palette - Rich Gold

| Color                                                    | Name           | Hex       | HSL           | Usage                                              |
| -------------------------------------------------------- | -------------- | --------- | ------------- | -------------------------------------------------- |
| ![#FDF6E3](https://via.placeholder.com/20/FDF6E3/FDF6E3) | **Gold 50**    | `#FDF6E3` | `45 85% 94%`  | Subtle warning backgrounds                         |
| ![#F9E9C0](https://via.placeholder.com/20/F9E9C0/F9E9C0) | **Gold 100**   | `#F9E9C0` | `43 85% 86%`  | Light gold backgrounds                             |
| ![#E6C66A](https://via.placeholder.com/20/E6C66A/E6C66A) | **Gold 200**   | `#E6C66A` | `45 72% 66%`  | Medium gold                                        |
| ![#C9A227](https://via.placeholder.com/20/C9A227/C9A227) | **Gold 500**   | `#C9A227` | `45 70% 47%`  | **SECONDARY** - CTAs, warnings, pending            |
| ![#A88520](https://via.placeholder.com/20/A88520/A88520) | **Gold 600**   | `#A88520` | `45 70% 39%`  | Hover states                                       |
| ![#876A1A](https://via.placeholder.com/20/876A1A/876A1A) | **Gold 700**   | `#876A1A` | `45 70% 31%`  | -                                                  |

### Neutral Palette - Warm Toned

| Color                                                    | Name         | Hex       | Usage                            |
| -------------------------------------------------------- | ------------ | --------- | -------------------------------- |
| ![#1A1D1C](https://via.placeholder.com/20/1A1D1C/1A1D1C) | **Gray 900** | `#1A1D1C` | Primary text, headings           |
| ![#454B48](https://via.placeholder.com/20/454B48/454B48) | **Gray 700** | `#454B48` | Secondary text, labels           |
| ![#5C6661](https://via.placeholder.com/20/5C6661/5C6661) | **Gray 600** | `#5C6661` | Body text                        |
| ![#6B7C72](https://via.placeholder.com/20/6B7C72/6B7C72) | **Gray 500** | `#6B7C72` | Muted text, placeholders         |
| ![#9CA3A0](https://via.placeholder.com/20/9CA3A0/9CA3A0) | **Gray 400** | `#9CA3A0` | Disabled text, borders           |
| ![#C9CDCB](https://via.placeholder.com/20/C9CDCB/C9CDCB) | **Gray 300** | `#C9CDCB` | Borders, dividers                |
| ![#E2E5E3](https://via.placeholder.com/20/E2E5E3/E2E5E3) | **Gray 200** | `#E2E5E3` | Light borders, backgrounds       |
| ![#F5F5F3](https://via.placeholder.com/20/F5F5F3/F5F5F3) | **Gray 100** | `#F5F5F3` | Subtle backgrounds, hover states |
| ![#FAFAF8](https://via.placeholder.com/20/FAFAF8/FAFAF8) | **Gray 50**  | `#FAFAF8` | Page background (warm white)     |
| ![#FFFFFF](https://via.placeholder.com/20/FFFFFF/FFFFFF) | **White**    | `#FFFFFF` | Card backgrounds, inputs         |

### Semantic Colors

| Color                                                    | Name              | Hex       | Usage                                    |
| -------------------------------------------------------- | ----------------- | --------- | ---------------------------------------- |
| ![#2D5A4A](https://via.placeholder.com/20/2D5A4A/2D5A4A) | **Success**       | `#2D5A4A` | Positive amounts, income, success states |
| ![#C45C4A](https://via.placeholder.com/20/C45C4A/C45C4A) | **Expense/Error** | `#C45C4A` | Negative amounts, expenses, errors       |
| ![#C9A227](https://via.placeholder.com/20/C9A227/C9A227) | **Warning**       | `#C9A227` | Pending items, warnings, reimbursables   |
| ![#4A6FA5](https://via.placeholder.com/20/4A6FA5/4A6FA5) | **Info**          | `#4A6FA5` | Information, links, neutral indicators   |

### Amount Colors (Critical)

These colors are specifically for displaying monetary amounts:

| Context               | Color                   | Example            |
| --------------------- | ----------------------- | ------------------ |
| Income (positive)     | `#2D5A4A` (Forest 500)  | +€2,500.00         |
| Expense (negative)    | `#C45C4A` (Terracotta)  | -€45.50            |
| Neutral/Zero          | `#5C6661` (Gray 600)    | €0.00              |
| Pending Reimbursement | `#C9A227` (Gold 500)    | -€125.00 (pending) |

### Category Colors

Predefined colors for spending categories (harmonized with the Professional Forest palette):

```typescript
export const CATEGORY_COLORS = {
  income: '#2D5A4A',      // Forest green
  housing: '#5B6E8A',     // Slate
  transport: '#4A6FA5',   // Slate blue
  food: '#C9A227',        // Gold
  shopping: '#A67B8A',    // Dusty mauve
  entertainment: '#7B6B8A', // Muted purple
  health: '#4A9A8A',      // Teal
  personal: '#B87D4B',    // Warm bronze
  utilities: '#6B7C72',   // Moss gray
  other: '#9CA3A0',       // Neutral gray
} as const;
```

### CSS Variables

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

### TypeScript Color Helper

```typescript
// src/lib/colors.ts
export const colors = {
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
  semantic: {
    success: '#2D5A4A',
    error: '#C45C4A',
    warning: '#C9A227',
    info: '#4A6FA5',
  },
  amount: {
    positive: '#2D5A4A',
    negative: '#C45C4A',
    neutral: '#5C6661',
    pending: '#C9A227',
  },
} as const;

export function getAmountColor(amount: number, isPending = false): string {
  if (isPending) return colors.amount.pending;
  if (amount > 0) return colors.amount.positive;
  if (amount < 0) return colors.amount.negative;
  return colors.amount.neutral;
}
```

---

## 3. Typography

### Font Family

**Primary Font:** Inter

Inter is a highly legible, modern sans-serif designed for screens. It has excellent support for tabular numbers (critical for financial data).

```css
font-family:
  'Inter',
  -apple-system,
  BlinkMacSystemFont,
  'Segoe UI',
  Roboto,
  sans-serif;
font-feature-settings:
  'cv11' 1,
  'ss01' 1; /* Stylistic alternates */
```

**Font Loading:**

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link
  href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
  rel="stylesheet"
/>
```

**Monospace Font (for amounts):**

```css
font-family: 'JetBrains Mono', 'SF Mono', Menlo, monospace;
font-feature-settings: 'tnum' 1; /* Tabular numbers */
```

### Font Weights

| Weight   | Value | Usage                                  |
| -------- | ----- | -------------------------------------- |
| Regular  | 400   | Body text, descriptions                |
| Medium   | 500   | Labels, emphasized text, table headers |
| Semibold | 600   | Headings, card titles, buttons         |
| Bold     | 700   | Page titles, key metrics               |

### Type Scale

| Name             | Size | Tailwind    | Weight | Line Height | Letter Spacing | Usage                |
| ---------------- | ---- | ----------- | ------ | ----------- | -------------- | -------------------- |
| **H1**           | 30px | `text-3xl`  | 700    | 1.2         | -0.02em        | Page titles          |
| **H2**           | 24px | `text-2xl`  | 600    | 1.25        | -0.01em        | Section headings     |
| **H3**           | 20px | `text-xl`   | 600    | 1.3         | -0.01em        | Card titles          |
| **H4**           | 18px | `text-lg`   | 600    | 1.4         | 0              | Subsections          |
| **Body Large**   | 16px | `text-base` | 400    | 1.5         | 0              | Important body text  |
| **Body**         | 14px | `text-sm`   | 400    | 1.5         | 0              | Default text, forms  |
| **Small**        | 12px | `text-xs`   | 400    | 1.4         | 0              | Captions, timestamps |
| **Amount Large** | 28px | `text-2xl`  | 700    | 1.2         | -0.02em        | Dashboard totals     |
| **Amount**       | 16px | `text-base` | 500    | 1           | 0              | Transaction amounts  |

### Typography Components

**Page Title:**

```jsx
<h1 className="text-3xl font-bold tracking-tight text-gray-900">Dashboard</h1>
```

**Section Heading:**

```jsx
<h2 className="text-2xl font-semibold text-gray-900">Recent Transactions</h2>
```

**Card Title:**

```jsx
<h3 className="text-lg font-semibold text-gray-900">Spending by Category</h3>
```

**Amount Display (Large):**

```jsx
<span className="text-2xl font-bold tabular-nums tracking-tight text-emerald-600">+€2,500.00</span>
```

**Amount Display (Inline):**

```jsx
<span className="font-medium tabular-nums text-red-500">-€45.50</span>
```

**Muted Text:**

```jsx
<p className="text-sm text-gray-500">Last synced 5 minutes ago</p>
```

### Number Formatting

**Currency Display Rules:**

- Always show currency symbol: `€`
- Use comma for thousands: `€1,234.56`
- Always show 2 decimal places: `€45.00` not `€45`
- Prefix with sign for clarity: `+€100.00` or `-€45.50`
- Use tabular figures for alignment: `font-variant-numeric: tabular-nums`

```typescript
// src/lib/format.ts
export function formatAmount(amount: number, showSign = true): string {
  const formatted = new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(amount));

  if (!showSign) return formatted;
  if (amount > 0) return `+${formatted}`;
  if (amount < 0) return `-${formatted.replace('-', '')}`;
  return formatted;
}
```

---

## 4. Spacing & Layout

### Spacing Scale

Based on 4px base unit (Tailwind default):

| Scale | Pixels | Tailwind | Usage                       |
| ----- | ------ | -------- | --------------------------- |
| 1     | 4px    | `p-1`    | Minimal spacing             |
| 2     | 8px    | `p-2`    | Tight spacing, icon gaps    |
| 3     | 12px   | `p-3`    | Compact padding             |
| 4     | 16px   | `p-4`    | Standard padding, form gaps |
| 5     | 20px   | `p-5`    | Comfortable spacing         |
| 6     | 24px   | `p-6`    | Card padding, section gaps  |
| 8     | 32px   | `p-8`    | Large section spacing       |
| 10    | 40px   | `p-10`   | Major section breaks        |
| 12    | 48px   | `p-12`   | Page-level spacing          |

### Component Spacing

| Component        | Padding                                      | Gap         |
| ---------------- | -------------------------------------------- | ----------- |
| Page             | `px-4 py-6` (mobile) / `px-8 py-8` (desktop) | -           |
| Card             | `p-6`                                        | -           |
| Card Header      | `pb-4`                                       | `space-y-1` |
| Card Content     | -                                            | `space-y-4` |
| Button (default) | `px-4 py-2`                                  | -           |
| Button (sm)      | `px-3 py-1.5`                                | -           |
| Input            | `px-3 py-2`                                  | -           |
| Form Groups      | -                                            | `space-y-4` |
| List Items       | `py-3 px-4`                                  | -           |
| Transaction Row  | `py-4 px-4`                                  | -           |

### Container & Layout

**Max Content Width:** 1280px

```jsx
<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">{/* Page content */}</div>
```

**Dashboard Grid:**

```jsx
<div className="grid grid-cols-1 gap-6 lg:grid-cols-3">{/* Summary cards */}</div>
```

### Responsive Breakpoints

| Breakpoint | Min Width | Usage                  |
| ---------- | --------- | ---------------------- |
| `sm`       | 640px     | Large phones landscape |
| `md`       | 768px     | Tablets                |
| `lg`       | 1024px    | Desktop                |
| `xl`       | 1280px    | Large desktop          |
| `2xl`      | 1536px    | Extra large screens    |

### Layout Patterns

**Sidebar Layout (Desktop):**

```
┌──────────────────────────────────────────────────────────┐
│ Header (fixed)                                    [User] │
├────────────┬─────────────────────────────────────────────┤
│            │                                             │
│  Sidebar   │  Main Content                               │
│  (240px)   │  (flex-1)                                   │
│            │                                             │
│            │                                             │
└────────────┴─────────────────────────────────────────────┘
```

**Mobile Layout:**

```
┌──────────────────────┐
│ Header        [Menu] │
├──────────────────────┤
│                      │
│    Main Content      │
│    (full width)      │
│                      │
├──────────────────────┤
│ Bottom Nav (fixed)   │
└──────────────────────┘
```

---

## 5. Border Radius & Shadows

### Border Radius

**Base Radius:** 8px (0.5rem)

```css
--radius: 0.5rem;
```

| Size   | Value  | Tailwind       | Usage                            |
| ------ | ------ | -------------- | -------------------------------- |
| None   | 0      | `rounded-none` | Tables, specific edges           |
| Small  | 4px    | `rounded`      | Badges, small elements           |
| Medium | 6px    | `rounded-md`   | Buttons, inputs                  |
| Large  | 8px    | `rounded-lg`   | Cards, dialogs                   |
| XL     | 12px   | `rounded-xl`   | Large cards, modals              |
| Full   | 9999px | `rounded-full` | Pills, avatars, circular buttons |

### Shadows

| Level  | Tailwind      | CSS                           | Usage               |
| ------ | ------------- | ----------------------------- | ------------------- |
| None   | `shadow-none` | -                             | Flat elements       |
| XS     | `shadow-xs`   | `0 1px 2px rgba(0,0,0,0.05)`  | Subtle lift         |
| Small  | `shadow-sm`   | `0 1px 3px rgba(0,0,0,0.1)`   | Cards (default)     |
| Medium | `shadow-md`   | `0 4px 6px rgba(0,0,0,0.1)`   | Dropdowns, popovers |
| Large  | `shadow-lg`   | `0 10px 15px rgba(0,0,0,0.1)` | Dialogs, modals     |
| XL     | `shadow-xl`   | `0 20px 25px rgba(0,0,0,0.1)` | Elevated modals     |

**Card Shadow:**

```css
.card {
  box-shadow:
    0 1px 3px rgba(0, 0, 0, 0.08),
    0 1px 2px rgba(0, 0, 0, 0.06);
}
```

**Elevated Card (hover):**

```css
.card:hover {
  box-shadow:
    0 4px 6px rgba(0, 0, 0, 0.1),
    0 2px 4px rgba(0, 0, 0, 0.06);
}
```

---

## 6. Components

### Button

**Variants:**

| Variant       | Background  | Text        | Border   | Usage             |
| ------------- | ----------- | ----------- | -------- | ----------------- |
| `default`     | Emerald 500 | White       | None     | Primary actions   |
| `secondary`   | Gray 100    | Gray 900    | None     | Secondary actions |
| `outline`     | Transparent | Gray 700    | Gray 300 | Tertiary actions  |
| `ghost`       | Transparent | Gray 700    | None     | Minimal actions   |
| `destructive` | Red 500     | White       | None     | Delete, remove    |
| `link`        | Transparent | Emerald 600 | None     | Inline links      |

**Sizes:**

| Size      | Height | Padding       | Font |
| --------- | ------ | ------------- | ---- |
| `sm`      | 32px   | `px-3 py-1.5` | 12px |
| `default` | 40px   | `px-4 py-2`   | 14px |
| `lg`      | 48px   | `px-6 py-3`   | 16px |
| `icon`    | 40px   | `p-2`         | -    |

**States:**

```css
/* Hover */
.btn-primary:hover {
  background-color: #059669; /* Emerald 600 */
}

/* Active/Press */
.btn:active:not(:disabled) {
  transform: scale(0.98);
}

/* Focus */
.btn:focus-visible {
  outline: 2px solid #10b981;
  outline-offset: 2px;
}

/* Disabled */
.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

**Implementation:**

```jsx
const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]',
  {
    variants: {
      variant: {
        default: 'bg-emerald-500 text-white hover:bg-emerald-600',
        secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200',
        outline: 'border border-gray-300 bg-transparent hover:bg-gray-50',
        ghost: 'hover:bg-gray-100',
        destructive: 'bg-red-500 text-white hover:bg-red-600',
        link: 'text-emerald-600 underline-offset-4 hover:underline',
      },
      size: {
        sm: 'h-8 px-3 text-xs',
        default: 'h-10 px-4',
        lg: 'h-12 px-6 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);
```

### Card

**Structure:**

```jsx
<Card>
  <CardHeader>
    <CardTitle>Spending This Month</CardTitle>
    <CardDescription>Your expenses by category</CardDescription>
  </CardHeader>
  <CardContent>{/* Content */}</CardContent>
  <CardFooter>{/* Optional actions */}</CardFooter>
</Card>
```

**Styling:**

```jsx
// Card container
'rounded-lg border border-gray-200 bg-white shadow-sm';

// CardHeader
'flex flex-col space-y-1 p-6 pb-4';

// CardTitle
'text-lg font-semibold text-gray-900';

// CardDescription
'text-sm text-gray-500';

// CardContent
'p-6 pt-0';

// CardFooter
'flex items-center p-6 pt-0';
```

### Badge

**Variants:**

| Variant       | Background  | Text        | Usage             |
| ------------- | ----------- | ----------- | ----------------- |
| `default`     | Emerald 100 | Emerald 700 | Default, positive |
| `secondary`   | Gray 100    | Gray 700    | Neutral           |
| `destructive` | Red 100     | Red 700     | Negative, error   |
| `warning`     | Amber 100   | Amber 700   | Pending, warning  |
| `outline`     | Transparent | Gray 700    | Minimal           |

**Styling:**

```jsx
'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium';
```

**Category Badge:**

```jsx
function CategoryBadge({ category }: { category: Category }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{
        backgroundColor: `${category.color}15`,
        color: category.color,
      }}
    >
      <span>{category.icon}</span>
      {category.name}
    </span>
  );
}
```

### Dialog/Modal

**Structure:**

```jsx
<Dialog>
  <DialogTrigger asChild>
    <Button>Open</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Split Transaction</DialogTitle>
      <DialogDescription>Divide this transaction across multiple categories.</DialogDescription>
    </DialogHeader>
    {/* Content */}
    <DialogFooter>
      <Button variant="outline">Cancel</Button>
      <Button>Save</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

**Overlay:**

```jsx
'fixed inset-0 z-50 bg-black/50 backdrop-blur-sm';
```

**Content:**

```jsx
'fixed left-[50%] top-[50%] z-50 w-full max-w-lg translate-x-[-50%] translate-y-[-50%] rounded-xl border border-gray-200 bg-white p-6 shadow-xl';
```

### Toast/Notification

**Types:**

| Type      | Background | Icon                  | Border      |
| --------- | ---------- | --------------------- | ----------- |
| `success` | Emerald 50 | CheckCircle (Emerald) | Emerald 200 |
| `error`   | Red 50     | XCircle (Red)         | Red 200     |
| `warning` | Amber 50   | AlertTriangle (Amber) | Amber 200   |
| `info`    | Blue 50    | Info (Blue)           | Blue 200    |

**Positioning:** Bottom-right, fixed

**Animation:** Slide in from right, fade out

**Auto-dismiss:** 4 seconds (errors: 6 seconds)

---

## 7. Navigation & Layout

### Header

**Desktop Header:**

```jsx
<header className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur">
  <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
    {/* Logo */}
    <div className="flex items-center gap-8">
      <Logo />
      <nav className="hidden items-center gap-1 md:flex">{/* Nav items */}</nav>
    </div>

    {/* Right side */}
    <div className="flex items-center gap-4">
      <SyncStatus />
      <UserMenu />
    </div>
  </div>
</header>
```

### Sidebar Navigation (Desktop)

```jsx
<aside className="fixed inset-y-0 left-0 z-30 w-60 border-r border-gray-200 bg-white">
  <div className="flex h-16 items-center border-b border-gray-200 px-6">
    <Logo />
  </div>
  <nav className="flex flex-col gap-1 p-4">
    {navItems.map((item) => (
      <NavLink
        key={item.href}
        href={item.href}
        className={({ isActive }) =>
          cn(
            'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
            isActive
              ? 'bg-emerald-50 text-emerald-700'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
          )
        }
      >
        <item.icon className="h-5 w-5" />
        {item.label}
      </NavLink>
    ))}
  </nav>
</aside>
```

### Bottom Navigation (Mobile)

```jsx
<nav className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white md:hidden">
  <div className="flex h-16 items-center justify-around">
    {navItems.map((item) => (
      <NavLink
        key={item.href}
        href={item.href}
        className={({ isActive }) =>
          cn(
            'flex flex-col items-center gap-1 px-3 py-2 text-xs font-medium',
            isActive ? 'text-emerald-600' : 'text-gray-500'
          )
        }
      >
        <item.icon className="h-5 w-5" />
        {item.label}
      </NavLink>
    ))}
  </div>
</nav>
```

### Navigation Items

| Item           | Icon              | Path              |
| -------------- | ----------------- | ----------------- |
| Dashboard      | `LayoutDashboard` | `/`               |
| Transactions   | `ArrowLeftRight`  | `/transactions`   |
| Categories     | `Tags`            | `/categories`     |
| Reimbursements | `Receipt`         | `/reimbursements` |
| Settings       | `Settings`        | `/settings`       |

### Active State

- **Desktop sidebar:** `bg-emerald-50 text-emerald-700`
- **Mobile bottom nav:** `text-emerald-600` with filled icon variant

---

## 8. Data Display

### Transaction List

**Transaction Row:**

```
┌─────────────────────────────────────────────────────────────────────────┐
│  📅        Description                   Category           Amount     │
│  Jan 15    Albert Heijn 1234             🛒 Groceries      -€45.50    │
│            Amsterdam                                                    │
└─────────────────────────────────────────────────────────────────────────┘
```

**Row Structure:**

```jsx
<div className="flex items-center gap-4 border-b border-gray-100 px-4 py-3 transition-colors hover:bg-gray-50">
  {/* Date */}
  <div className="w-16 flex-shrink-0 text-sm text-gray-500">Jan 15</div>

  {/* Description */}
  <div className="min-w-0 flex-1">
    <p className="truncate font-medium text-gray-900">Albert Heijn 1234</p>
    <p className="truncate text-sm text-gray-500">Amsterdam</p>
  </div>

  {/* Category */}
  <div className="flex-shrink-0">
    <CategoryBadge category={category} />
  </div>

  {/* Amount */}
  <div className="w-24 flex-shrink-0 text-right">
    <span className="font-medium tabular-nums text-red-500">-€45.50</span>
  </div>

  {/* Actions (on hover) */}
  <div className="w-8 flex-shrink-0 opacity-0 group-hover:opacity-100">
    <MoreMenu />
  </div>
</div>
```

### Summary Cards

**Metric Card:**

```jsx
<Card>
  <CardContent className="p-6">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-500">Total Expenses</p>
        <p className="mt-1 text-2xl font-bold tabular-nums text-gray-900">€1,234.56</p>
        <p className="mt-1 text-sm text-gray-500">
          <span className="text-red-500">+12%</span> vs last month
        </p>
      </div>
      <div className="rounded-full bg-red-50 p-3">
        <TrendingDown className="h-6 w-6 text-red-500" />
      </div>
    </div>
  </CardContent>
</Card>
```

### Empty States

**No Transactions:**

```jsx
<div className="flex flex-col items-center justify-center py-12 text-center">
  <div className="rounded-full bg-gray-100 p-4">
    <Receipt className="h-8 w-8 text-gray-400" />
  </div>
  <h3 className="mt-4 text-lg font-medium text-gray-900">No transactions yet</h3>
  <p className="mt-2 max-w-sm text-sm text-gray-500">
    Connect your bank account to start seeing your transactions automatically.
  </p>
  <Button className="mt-6">Connect Bank Account</Button>
</div>
```

### Loading States

**Skeleton for Transaction Row:**

```jsx
<div className="flex items-center gap-4 px-4 py-3">
  <div className="h-4 w-12 animate-pulse rounded bg-gray-200" />
  <div className="flex-1 space-y-2">
    <div className="h-4 w-3/4 animate-pulse rounded bg-gray-200" />
    <div className="h-3 w-1/2 animate-pulse rounded bg-gray-200" />
  </div>
  <div className="h-6 w-20 animate-pulse rounded-full bg-gray-200" />
  <div className="h-4 w-16 animate-pulse rounded bg-gray-200" />
</div>
```

---

## 9. Forms & Inputs

### Input

```jsx
<input className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:opacity-50" />
```

### Select

```jsx
<Select>
  <SelectTrigger className="h-10 rounded-md border border-gray-300 bg-white px-3">
    <SelectValue placeholder="Select category" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="groceries">Groceries</SelectItem>
    <SelectItem value="transport">Transport</SelectItem>
  </SelectContent>
</Select>
```

### Label

```jsx
<label className="text-sm font-medium text-gray-700">Category</label>
```

### Form Group Pattern

```jsx
<div className="space-y-4">
  <div className="space-y-2">
    <Label htmlFor="amount">Amount</Label>
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">€</span>
      <Input
        id="amount"
        type="number"
        step="0.01"
        className="pl-7 tabular-nums"
        placeholder="0.00"
      />
    </div>
  </div>

  <div className="space-y-2">
    <Label htmlFor="category">Category</Label>
    <Select>
      <SelectTrigger id="category">
        <SelectValue placeholder="Select category" />
      </SelectTrigger>
      <SelectContent>
        {categories.map((cat) => (
          <SelectItem key={cat.id} value={cat.id}>
            <span className="flex items-center gap-2">
              <span>{cat.icon}</span>
              {cat.name}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
</div>
```

### Amount Input

```jsx
<div className="relative">
  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
    €
  </span>
  <input
    type="number"
    step="0.01"
    min="0"
    className="h-10 w-full rounded-md border border-gray-300 bg-white pl-7 pr-3 text-right tabular-nums [appearance:textfield] focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
    placeholder="0.00"
  />
</div>
```

### Search Input

```jsx
<div className="relative">
  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
  <input
    type="search"
    className="h-10 w-full rounded-md border border-gray-300 bg-white pl-10 pr-3 text-sm placeholder:text-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
    placeholder="Search transactions..."
  />
</div>
```

### Date Range Picker

```jsx
<div className="flex items-center gap-2">
  <Button variant="outline" size="sm">
    <Calendar className="mr-2 h-4 w-4" />
    Jan 1 - Jan 31, 2026
    <ChevronDown className="ml-2 h-4 w-4" />
  </Button>
  <div className="flex rounded-md border border-gray-300">
    <Button variant="ghost" size="sm" className="rounded-r-none">
      This Month
    </Button>
    <Button variant="ghost" size="sm" className="rounded-none border-x">
      Last Month
    </Button>
    <Button variant="ghost" size="sm" className="rounded-l-none">
      This Year
    </Button>
  </div>
</div>
```

---

## 10. Icons

### Icon Library

**Package:** `lucide-react`

### Icon Sizes

| Size | Class     | Pixels | Usage                  |
| ---- | --------- | ------ | ---------------------- |
| XS   | `h-3 w-3` | 12px   | Inline with small text |
| SM   | `h-4 w-4` | 16px   | Buttons, inputs        |
| MD   | `h-5 w-5` | 20px   | Navigation, list items |
| LG   | `h-6 w-6` | 24px   | Cards, headers         |
| XL   | `h-8 w-8` | 32px   | Empty states           |

### Icon Categories

**Navigation:**

- `LayoutDashboard` - Dashboard
- `ArrowLeftRight` - Transactions
- `Tags` - Categories
- `Receipt` - Reimbursements
- `Settings` - Settings

**Actions:**

- `Plus` - Add
- `Pencil` - Edit
- `Trash2` - Delete
- `Check` - Confirm
- `X` - Close/Cancel
- `MoreHorizontal` - More actions
- `Download` - Export
- `Upload` - Import
- `RefreshCw` - Sync/Refresh

**Finance:**

- `Wallet` - Account
- `CreditCard` - Card
- `Banknote` - Cash
- `PiggyBank` - Savings
- `TrendingUp` - Increase
- `TrendingDown` - Decrease
- `ArrowUpRight` - Income
- `ArrowDownRight` - Expense

**Status:**

- `CheckCircle` - Success
- `XCircle` - Error
- `AlertTriangle` - Warning
- `Info` - Information
- `Loader2` - Loading (animated)
- `Clock` - Pending

**UI:**

- `ChevronDown` / `ChevronUp` / `ChevronLeft` / `ChevronRight`
- `Search` - Search
- `Filter` - Filter
- `Calendar` - Date
- `Eye` / `EyeOff` - Show/Hide

### Usage Example

```jsx
import { ArrowLeftRight, TrendingDown, Loader2 } from 'lucide-react';

// In navigation
<ArrowLeftRight className="h-5 w-5" />

// In button
<Button>
  <Plus className="mr-2 h-4 w-4" />
  Add Transaction
</Button>

// Loading spinner
<Loader2 className="h-5 w-5 animate-spin" />

// Colored icon
<TrendingDown className="h-6 w-6 text-red-500" />
```

---

## 11. Charts & Visualizations

### Chart Library

**Package:** `recharts`

### Chart Colors

Use category colors for consistency:

```typescript
export const CHART_COLORS = [
  '#2D5A4A', // Forest green
  '#5B6E8A', // Slate
  '#4A6FA5', // Slate blue
  '#C9A227', // Gold
  '#A67B8A', // Dusty mauve
  '#7B6B8A', // Muted purple
  '#4A9A8A', // Teal
  '#B87D4B', // Warm bronze
  '#6B7C72', // Moss gray
  '#C45C4A', // Terracotta
];
```

### Spending by Category (Donut Chart)

```jsx
<ResponsiveContainer width="100%" height={300}>
  <PieChart>
    <Pie
      data={categoryData}
      cx="50%"
      cy="50%"
      innerRadius={60}
      outerRadius={100}
      paddingAngle={2}
      dataKey="value"
    >
      {categoryData.map((entry, index) => (
        <Cell key={entry.name} fill={entry.color} stroke="white" strokeWidth={2} />
      ))}
    </Pie>
    <Tooltip
      content={({ payload }) => (
        <div className="rounded-lg border bg-white p-3 shadow-lg">
          <p className="font-medium">{payload?.[0]?.name}</p>
          <p className="text-lg font-bold tabular-nums">{formatAmount(payload?.[0]?.value)}</p>
        </div>
      )}
    />
  </PieChart>
</ResponsiveContainer>
```

### Spending Over Time (Bar Chart)

```jsx
<ResponsiveContainer width="100%" height={300}>
  <BarChart data={timelineData}>
    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
    <XAxis
      dataKey="date"
      tick={{ fontSize: 12, fill: '#6B7280' }}
      tickLine={false}
      axisLine={{ stroke: '#E5E7EB' }}
    />
    <YAxis
      tick={{ fontSize: 12, fill: '#6B7280' }}
      tickLine={false}
      axisLine={false}
      tickFormatter={(value) => `€${value}`}
    />
    <Tooltip
      content={({ payload, label }) => (
        <div className="rounded-lg border bg-white p-3 shadow-lg">
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-lg font-bold tabular-nums text-red-500">
            {formatAmount(payload?.[0]?.value)}
          </p>
        </div>
      )}
    />
    <Bar dataKey="expenses" fill="#EF4444" radius={[4, 4, 0, 0]} />
  </BarChart>
</ResponsiveContainer>
```

### Income vs Expenses (Comparison)

```jsx
<ResponsiveContainer width="100%" height={300}>
  <BarChart data={comparisonData} layout="vertical">
    <XAxis type="number" hide />
    <YAxis
      type="category"
      dataKey="name"
      tick={{ fontSize: 14, fill: '#374151' }}
      tickLine={false}
      axisLine={false}
      width={80}
    />
    <Bar dataKey="income" fill="#10B981" radius={[0, 4, 4, 0]} />
    <Bar dataKey="expenses" fill="#EF4444" radius={[0, 4, 4, 0]} />
  </BarChart>
</ResponsiveContainer>
```

### Chart Styling Guidelines

- Use `strokeDasharray="3 3"` for grid lines
- Grid lines: `#E5E7EB` (Gray 200)
- Axis text: `#6B7280` (Gray 500), 12px
- Tooltips: White background, rounded-lg, shadow-lg
- Bar radius: `[4, 4, 0, 0]` for top corners
- Consistent padding: 20px on all sides

---

## 12. Animation & Motion

### Principles

- **Purposeful:** Every animation should have a reason
- **Quick:** Most interactions under 200ms
- **Subtle:** Enhance, don't distract from financial data

### Durations

| Speed      | Duration | Usage                           |
| ---------- | -------- | ------------------------------- |
| Instant    | 75ms     | Micro-feedback (button press)   |
| Fast       | 150ms    | Hover states, small transitions |
| Normal     | 200ms    | Most transitions                |
| Slow       | 300ms    | Modals, page transitions        |
| Deliberate | 500ms    | Complex animations              |

### Easing Functions

```css
/* Default - smooth deceleration */
transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);

/* Enter - start slow, end fast */
transition-timing-function: cubic-bezier(0, 0, 0.2, 1);

/* Exit - start fast, end slow */
transition-timing-function: cubic-bezier(0.4, 0, 1, 1);

/* Spring - slight overshoot */
transition-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1);
```

### Common Animations

**Hover Transitions:**

```css
.interactive {
  transition:
    background-color 150ms,
    color 150ms,
    transform 75ms;
}

.interactive:hover {
  background-color: var(--hover-bg);
}

.interactive:active {
  transform: scale(0.98);
}
```

**Fade In:**

```css
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.fade-in {
  animation: fadeIn 200ms ease-out;
}
```

**Slide Up (for toasts, modals):**

```css
@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.slide-up {
  animation: slideUp 200ms ease-out;
}
```

**Loading Spinner:**

```jsx
<Loader2 className="h-5 w-5 animate-spin" />
```

**Skeleton Pulse:**

```css
@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.skeleton {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
```

### Reduced Motion

Always respect user preferences:

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 13. Accessibility

### Color Contrast

All text meets WCAG AA standards (4.5:1 for normal text, 3:1 for large text):

| Combination          | Contrast Ratio |
| -------------------- | -------------- |
| Gray 900 on White    | 16:1           |
| Gray 700 on White    | 8.5:1          |
| Gray 500 on White    | 4.6:1          |
| Emerald 600 on White | 4.5:1          |
| Red 500 on White     | 4.5:1          |
| White on Emerald 500 | 4.5:1          |

### Focus States

All interactive elements have visible focus indicators:

```css
:focus-visible {
  outline: 2px solid #10b981;
  outline-offset: 2px;
}
```

### Keyboard Navigation

- All interactive elements are focusable via Tab
- Dialogs trap focus
- Escape closes modals/dropdowns
- Enter/Space activates buttons
- Arrow keys navigate menus

### Screen Reader Support

```jsx
// Hidden labels for icons
<button aria-label="Close dialog">
  <X className="h-4 w-4" />
</button>

// Live regions for updates
<div role="status" aria-live="polite">
  Syncing transactions...
</div>

// Descriptive labels
<input
  type="number"
  aria-label="Split amount in euros"
  aria-describedby="amount-help"
/>
<p id="amount-help" className="sr-only">
  Enter the amount for this split
</p>
```

### ARIA Patterns

**Dialog:**

```jsx
<div
  role="dialog"
  aria-modal="true"
  aria-labelledby="dialog-title"
  aria-describedby="dialog-description"
>
```

**Navigation:**

```jsx
<nav aria-label="Main navigation">
  <ul role="list">
    <li>
      <a href="/" aria-current={isActive ? 'page' : undefined}>
        Dashboard
      </a>
    </li>
  </ul>
</nav>
```

**Loading States:**

```jsx
<div aria-busy="true" aria-label="Loading transactions">
  <Loader2 className="animate-spin" aria-hidden="true" />
</div>
```

---

## 14. Dark Mode

### Color Mappings

```css
.dark {
  /* Backgrounds */
  --color-background: 220 14% 10%; /* Near black */
  --color-foreground: 210 20% 98%; /* Off white */
  --color-card: 220 14% 14%; /* Slightly lighter */
  --color-muted: 220 14% 18%;

  /* Text */
  --color-muted-foreground: 215 14% 60%;

  /* Borders */
  --color-border: 220 14% 20%;
  --color-input: 220 14% 20%;

  /* Primary stays the same */
  --color-primary: 160 84% 39%;
  --color-primary-foreground: 0 0% 100%;

  /* Semantic colors - slightly lighter for visibility */
  --color-success: 160 72% 45%;
  --color-error: 0 72% 55%;
  --color-warning: 38 80% 55%;
}
```

### Component Adjustments

**Cards:**

```jsx
// Light
'border-gray-200 bg-white';
// Dark
'dark:border-gray-800 dark:bg-gray-900';
```

**Text:**

```jsx
// Primary text
'text-gray-900 dark:text-gray-100';
// Secondary text
'text-gray-500 dark:text-gray-400';
```

**Shadows (reduce in dark mode):**

```jsx
'shadow-sm dark:shadow-none dark:ring-1 dark:ring-gray-800';
```

### Implementation

```jsx
// Toggle dark mode
function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
    >
      <Sun className="h-5 w-5 rotate-0 scale-100 transition-transform dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-transform dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
```

---

## 15. Implementation Guide

### Required Dependencies

```json
{
  "dependencies": {
    "react": "^19.0.0",
    "tailwindcss": "^4.0.0",
    "@radix-ui/react-dialog": "^1.1.0",
    "@radix-ui/react-select": "^2.0.0",
    "@radix-ui/react-popover": "^1.0.0",
    "@radix-ui/react-label": "^2.0.0",
    "@radix-ui/react-dropdown-menu": "^2.0.0",
    "@radix-ui/react-toast": "^1.0.0",
    "lucide-react": "^0.400.0",
    "recharts": "^2.12.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.0.0",
    "tailwind-merge": "^2.0.0",
    "date-fns": "^3.0.0"
  }
}
```

### Tailwind Config

```javascript
// tailwind.config.js
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        background: 'hsl(var(--color-background))',
        foreground: 'hsl(var(--color-foreground))',
        primary: {
          DEFAULT: 'hsl(var(--color-primary))',
          foreground: 'hsl(var(--color-primary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--color-muted))',
          foreground: 'hsl(var(--color-muted-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--color-card))',
          foreground: 'hsl(var(--color-card-foreground))',
        },
        border: 'hsl(var(--color-border))',
        input: 'hsl(var(--color-input))',
        ring: 'hsl(var(--color-primary))',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};
```

### Base CSS

```css
/* src/index.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --color-background: 210 20% 98%;
    --color-foreground: 221 39% 11%;
    --color-card: 0 0% 100%;
    --color-card-foreground: 221 39% 11%;
    --color-primary: 160 84% 39%;
    --color-primary-foreground: 0 0% 100%;
    --color-muted: 220 14% 96%;
    --color-muted-foreground: 220 9% 46%;
    --color-border: 220 13% 91%;
    --color-input: 220 13% 91%;
    --radius: 0.5rem;
  }

  .dark {
    --color-background: 220 14% 10%;
    --color-foreground: 210 20% 98%;
    --color-card: 220 14% 14%;
    --color-card-foreground: 210 20% 98%;
    --color-muted: 220 14% 18%;
    --color-muted-foreground: 215 14% 60%;
    --color-border: 220 14% 20%;
    --color-input: 220 14% 20%;
  }

  * {
    @apply border-border;
  }

  body {
    @apply bg-background text-foreground antialiased;
    font-family: 'Inter', system-ui, sans-serif;
  }
}

@layer utilities {
  .tabular-nums {
    font-variant-numeric: tabular-nums;
  }
}
```

### Utility Function

```typescript
// src/lib/utils.ts
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

### Component Directory Structure

```
src/
├── components/
│   ├── ui/                    # Base UI components (shadcn style)
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── input.tsx
│   │   ├── select.tsx
│   │   ├── badge.tsx
│   │   ├── toast.tsx
│   │   └── ...
│   ├── layout/
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx
│   │   ├── BottomNav.tsx
│   │   └── PageContainer.tsx
│   ├── dashboard/
│   │   ├── SummaryCards.tsx
│   │   ├── SpendingChart.tsx
│   │   └── CategoryBreakdown.tsx
│   ├── transactions/
│   │   ├── TransactionList.tsx
│   │   ├── TransactionRow.tsx
│   │   └── CategoryPicker.tsx
│   └── ...
├── lib/
│   ├── utils.ts
│   ├── colors.ts
│   └── format.ts
└── index.css
```

---

## Quick Reference

### Colors (Hex)

| Name          | Hex       | Usage                    |
| ------------- | --------- | ------------------------ |
| Forest 600    | `#1D4739` | Primary, success, income |
| Forest 700    | `#163829` | Primary hover            |
| Terracotta    | `#C45C4A` | Expenses, errors         |
| Gold 500      | `#C9A227` | Warnings, pending        |
| Warm Gray 900 | `#1A1D1C` | Primary text             |
| Warm Gray 600 | `#5C6661` | Muted text               |
| Warm Gray 200 | `#E2E5E3` | Borders                  |
| Warm Gray 50  | `#FAFAF8` | Page background          |

### Spacing

| Value | Pixels | Usage           |
| ----- | ------ | --------------- |
| 2     | 8px    | Tight spacing   |
| 4     | 16px   | Standard        |
| 6     | 24px   | Card padding    |
| 8     | 32px   | Section spacing |

### Typography

| Style | Size | Weight |
| ----- | ---- | ------ |
| H1    | 30px | 700    |
| H2    | 24px | 600    |
| Body  | 14px | 400    |
| Small | 12px | 400    |

### Radius

| Size    | Value                   |
| ------- | ----------------------- |
| Default | 8px (`rounded-lg`)      |
| Buttons | 6px (`rounded-md`)      |
| Badges  | 9999px (`rounded-full`) |

---

_Document Version: 2.0_
_Created: January 2026_
_Last Updated: February 2026_
