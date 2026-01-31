# Hudl UI Design System Reference

A comprehensive guide for building Hudl-branded web applications with consistent visual design, interactions, and user experience patterns.

---

## Table of Contents

1. [Brand Foundation](#1-brand-foundation)
2. [Color System](#2-color-system)
3. [Typography](#3-typography)
4. [Spacing & Layout](#4-spacing--layout)
5. [Border Radius & Shadows](#5-border-radius--shadows)
6. [Components](#6-components)
7. [Navigation & Headers](#7-navigation--headers)
8. [Tables & Data Grids](#8-tables--data-grids)
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

Hudl's visual identity emphasizes clarity, professionalism, and performance. The design system balances a modern tech aesthetic with sports-focused energy.

### Core Design Principles

| Principle | Description |
|-----------|-------------|
| **Clarity** | Information hierarchy is clear; users can scan and understand quickly |
| **Performance** | Fast, responsive interactions that feel snappy and professional |
| **Consistency** | Same patterns and components across all views and applications |
| **Accessibility** | WCAG AA compliant; works for all users |
| **Collaboration** | Real-time feedback and presence awareness in multi-user contexts |

### Logo Usage

**Logo Files:**
- `hudl-logo-white.svg` - For dark backgrounds
- `hudl-logo-dark.svg` - For light backgrounds
- `hudl-icon.svg` - Icon-only variant

**Logo Sizing:**
- Header logo: `h-5` (20px height)
- Login/splash screens: `h-10` (40px height)
- Favicon: 32x32px

**Clear Space:** Maintain minimum padding of 1x logo height around the logo.

---

## 2. Color System

### Brand Colors (Primary Palette)

| Color | Name | Hex | RGB | HSL | Usage |
|-------|------|-----|-----|-----|-------|
| ![#FF6300](https://via.placeholder.com/20/FF6300/FF6300) | **Orange** | `#FF6300` | `rgb(255, 99, 0)` | `24 100% 50%` | Primary accent, highlights, active states, brand identity |
| ![#009CE3](https://via.placeholder.com/20/009CE3/009CE3) | **Electric** | `#009CE3` | `rgb(0, 156, 227)` | `198 100% 45%` | Primary buttons, links, interactive elements, focus rings |
| ![#232A31](https://via.placeholder.com/20/232A31/232A31) | **Ink** | `#232A31` | `rgb(35, 42, 49)` | `210 17% 16%` | Dark headers, primary text, top navigation |
| ![#38434F](https://via.placeholder.com/20/38434F/38434F) | **Evening** | `#38434F` | `rgb(56, 67, 79)` | `210 17% 26%` | Secondary navigation, dark backgrounds |
| ![#4E5D6C](https://via.placeholder.com/20/4E5D6C/4E5D6C) | **Slate** | `#4E5D6C` | `rgb(78, 93, 108)` | `210 16% 36%` | Muted text, tertiary elements |

### Utility/Semantic Colors

| Color | Name | Hex | RGB | Usage |
|-------|------|-----|-----|-------|
| ![#78A100](https://via.placeholder.com/20/78A100/78A100) | **Confirmation** | `#78A100` | `rgb(120, 161, 0)` | Success states, approved items, positive indicators |
| ![#F2B600](https://via.placeholder.com/20/F2B600/F2B600) | **Warning** | `#F2B600` | `rgb(242, 182, 0)` | Warning states, pending items, cautions |
| ![#E81C00](https://via.placeholder.com/20/E81C00/E81C00) | **Critical** | `#E81C00` | `rgb(232, 28, 0)` | Error states, destructive actions, critical alerts |
| ![#4D6680](https://via.placeholder.com/20/4D6680/4D6680) | **Information** | `#4D6680` | `rgb(77, 102, 128)` | Info states, secondary actions |

### Light Environment Text Colors

| Level | Hex | RGB | Usage |
|-------|-----|-----|-------|
| **Contrast** | `#13293F` | `rgb(19, 41, 63)` | Highest contrast text, headings |
| **Default** | `#3A4D5F` | `rgb(58, 77, 95)` | Standard body text |
| **Subtle** | `#506277` | `rgb(80, 98, 119)` | Secondary text, labels |
| **Non-essential** | `rgba(19, 41, 63, 0.4)` | - | Placeholder text, disabled text |

### Dark Environment Text Colors

| Level | Hex | RGB | Usage |
|-------|-----|-----|-------|
| **Contrast** | `#E6F2FF` | `rgb(230, 242, 255)` | Highest contrast text |
| **Default** | `#C3CEDB` | `rgb(195, 206, 219)` | Standard body text |
| **Subtle** | `#9DAAB8` | `rgb(157, 170, 184)` | Secondary text |
| **Non-essential** | `rgba(230, 242, 255, 0.4)` | - | Placeholder text |

### Background Colors

| Context | Light Mode | Dark Mode |
|---------|------------|-----------|
| **Page Background** | `#FFFFFF` | `#232A31` (Ink) |
| **Card Background** | `#FFFFFF` | `hsl(210, 17%, 20%)` |
| **Muted/Secondary** | `hsl(210, 20%, 96%)` | `#38434F` (Evening) |
| **Row Hover** | `rgb(255, 245, 235)` | - |
| **Row Changed** | `rgb(254, 249, 195)` | - |

### CSS Variables

```css
:root {
  /* Brand Colors */
  --hudl-orange: 24 100% 50%;
  --hudl-electric: 198 100% 45%;
  --hudl-ink: 210 17% 16%;
  --hudl-evening: 210 17% 26%;
  --hudl-slate: 210 16% 36%;

  /* Utility Colors */
  --hudl-confirmation: 74 100% 32%;
  --hudl-warning: 45 100% 47%;
  --hudl-critical: 7 100% 45%;

  /* Semantic Mappings */
  --primary: 198 100% 45%;           /* Electric - buttons, links */
  --accent: 24 100% 50%;             /* Orange - highlights */
  --destructive: 7 100% 45%;         /* Critical - errors */
  --ring: 198 100% 45%;              /* Electric - focus rings */
}
```

### TypeScript Color Helper

```typescript
// src/lib/hudlColors.ts
export const hudlColors = {
  brand: {
    orange: 'rgb(255, 99, 0)',
    electric: 'rgb(0, 156, 227)',
    ink: 'rgb(35, 42, 49)',
    evening: 'rgb(56, 67, 79)',
    slate: 'rgb(78, 93, 108)',
  },
  utility: {
    action: 'rgb(0, 156, 227)',
    information: 'rgb(77, 102, 128)',
    confirmation: 'rgb(120, 161, 0)',
    warning: 'rgb(242, 182, 0)',
    critical: 'rgb(232, 28, 0)',
  },
  light: {
    contrast: 'rgb(19, 41, 63)',
    default: 'rgb(58, 77, 95)',
    subtle: 'rgb(80, 98, 119)',
    nonessential: 'rgba(19, 41, 63, 0.4)',
  },
  dark: {
    contrast: 'rgb(230, 242, 255)',
    default: 'rgb(195, 206, 219)',
    subtle: 'rgb(157, 170, 184)',
    nonessential: 'rgba(230, 242, 255, 0.4)',
  },
} as const;
```

---

## 3. Typography

### Font Family

**Primary Font:** Barlow

```css
font-family: 'Barlow', Helvetica, Arial, sans-serif;
font-feature-settings: "rlig" 1, "calt" 1;
```

**Font Loading:**
```html
<link href="https://fonts.googleapis.com/css2?family=Barlow:wght@300;400;500;600;700&display=swap" rel="stylesheet">
```

### Font Weights

| Weight | Value | Usage |
|--------|-------|-------|
| Light | 300 | Large display headings, quotes |
| Regular | 400 | Body text, labels |
| Medium | 500 | Labels, form labels, emphasized text |
| Semibold | 600 | Headings, card titles, buttons |
| Bold | 700 | Strong emphasis, key metrics |

### Type Scale

| Name | Size | Tailwind | Weight | Line Height | Usage |
|------|------|----------|--------|-------------|-------|
| **Display** | 60px | - | 300 | 0.8 | Hero sections only |
| **H1** | 30px | `text-3xl` | 700 | 36px | Page titles |
| **H2** | 24px | `text-2xl` | 600 | 32px | Section headings, card titles |
| **H3** | 20px | `text-xl` | 600 | 28px | Subsection headings |
| **H4** | 18px | `text-lg` | 600 | 28px | Dialog titles |
| **Body Large** | 16px | `text-base` | 400 | 24px | Body text, paragraphs |
| **Body** | 14px | `text-sm` | 400 | 20px | Default text, form labels |
| **Small** | 12px | `text-xs` | 400 | 16px | Captions, badges, table cells |

### Typography Components

**Card Title:**
```jsx
<h3 className="text-2xl font-semibold leading-none tracking-tight">
  {title}
</h3>
```

**Card Description:**
```jsx
<p className="text-sm text-muted-foreground">
  {description}
</p>
```

**Form Label:**
```jsx
<label className="text-sm font-medium leading-none">
  {label}
</label>
```

**Dialog Title:**
```jsx
<h2 className="text-lg font-semibold leading-none tracking-tight">
  {title}
</h2>
```

---

## 4. Spacing & Layout

### Spacing Scale

Based on 4px base unit (Tailwind default):

| Scale | Pixels | Tailwind | Usage |
|-------|--------|----------|-------|
| 0.5 | 2px | `p-0.5` | Minimal gaps |
| 1 | 4px | `p-1` | Tight spacing |
| 1.5 | 6px | `p-1.5` | Small gaps |
| 2 | 8px | `p-2` | Default gap, button padding-y |
| 3 | 12px | `p-3` | Comfortable spacing, button padding-x |
| 4 | 16px | `p-4` | Standard padding, card content gaps |
| 6 | 24px | `p-6` | Card padding, section spacing |
| 8 | 32px | `p-8` | Large section spacing |
| 12 | 48px | `p-12` | Major section breaks |

### Component Spacing

| Component | Padding | Gap |
|-----------|---------|-----|
| Card | `p-6` (24px) | - |
| CardHeader | `p-6` | `space-y-1.5` |
| CardContent | `p-6 pt-0` | - |
| Button (default) | `px-4 py-2` | - |
| Button (sm) | `px-3` | - |
| Input | `px-3 py-2` | - |
| Dialog Content | `p-6` | `space-y-4` |
| Form Groups | - | `space-y-4` |

### Container & Layout

**Container:**
```jsx
<div className="container mx-auto px-4">
  {/* Content */}
</div>
```

**Full-Width Breakout:**
```css
.full-width-breakout {
  width: 100vw;
  position: relative;
  left: 50%;
  right: 50%;
  margin-left: -50vw;
  margin-right: -50vw;
  padding-left: 1.5rem;
  padding-right: 1.5rem;
}
```

### Responsive Breakpoints

| Breakpoint | Min Width | Tailwind |
|------------|-----------|----------|
| Mobile | 0 | (default) |
| Small | 640px | `sm:` |
| Medium | 768px | `md:` |
| Large | 1024px | `lg:` |
| XL | 1280px | `xl:` |
| 2XL | 1536px | `2xl:` |

---

## 5. Border Radius & Shadows

### Border Radius

**Base Radius:** 5px (0.3125rem) - Hudl standard

```css
--radius: 0.3125rem; /* 5px */
```

| Size | Value | Tailwind | Usage |
|------|-------|----------|-------|
| Small | 1px | `rounded-sm` | Pills, small elements |
| Medium | 3px | `rounded-md` | Buttons, inputs |
| Large | 5px | `rounded-lg` | Cards, dialogs |
| Full | 9999px | `rounded-full` | Badges, avatars |

### Tailwind Config

```javascript
borderRadius: {
  lg: "var(--radius)",             // 5px
  md: "calc(var(--radius) - 2px)", // 3px
  sm: "calc(var(--radius) - 4px)", // 1px
}
```

### Shadows

| Level | Tailwind | Usage |
|-------|----------|-------|
| None | `shadow-none` | Flat elements |
| Small | `shadow-sm` | Cards (default) |
| Medium | `shadow-md` | Popovers, dropdowns |
| Large | `shadow-lg` | Dialogs, modals |
| XL | `shadow-xl` | Elevated modals |
| 2XL | `shadow-2xl` | Login card, hero elements |

**Login Card Special:**
```css
.login-card {
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(10px);
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
}
```

---

## 6. Components

### Button

**Variants:**

| Variant | Background | Text | Usage |
|---------|------------|------|-------|
| `default` | Electric (`#009CE3`) | White | Primary actions |
| `destructive` | Critical (`#E81C00`) | White | Destructive actions |
| `outline` | Transparent | Foreground | Secondary actions |
| `secondary` | Muted gray | Foreground | Tertiary actions |
| `ghost` | Transparent | Foreground | Minimal actions |
| `link` | Transparent | Primary | Text links |

**Sizes:**

| Size | Height | Padding | Font |
|------|--------|---------|------|
| `sm` | 36px (`h-9`) | `px-3` | `text-xs` |
| `default` | 40px (`h-10`) | `px-4 py-2` | `text-sm` |
| `lg` | 44px (`h-11`) | `px-8` | `text-sm` |
| `icon` | 40px (`h-10 w-10`) | - | - |

**Interaction States:**
```css
/* Hover */
button:hover { opacity: 0.9; }

/* Active/Press */
button:active:not(:disabled) {
  transform: scale3d(0.98, 0.98, 0.98);
}

/* Focus */
button:focus-visible {
  outline: none;
  ring: 2px;
  ring-color: var(--ring); /* Electric */
  ring-offset: 2px;
}

/* Disabled */
button:disabled {
  pointer-events: none;
  opacity: 0.5;
}
```

**Implementation:**
```jsx
import { cva } from 'class-variance-authority';

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);
```

### Card

**Structure:**
```jsx
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>
    {/* Content */}
  </CardContent>
  <CardFooter>
    {/* Actions */}
  </CardFooter>
</Card>
```

**Styling:**
```jsx
// Card container
"rounded-lg border bg-card text-card-foreground shadow-sm"

// CardHeader
"flex flex-col space-y-1.5 p-6"

// CardTitle
"text-2xl font-semibold leading-none tracking-tight"

// CardDescription
"text-sm text-muted-foreground"

// CardContent
"p-6 pt-0"

// CardFooter
"flex items-center p-6 pt-0"
```

### Badge

**Variants:**

| Variant | Background | Text |
|---------|------------|------|
| `default` | Primary | White |
| `secondary` | Muted | Foreground |
| `destructive` | Critical | White |
| `outline` | Transparent + border | Foreground |
| `success` | `#22c55e` | White |
| `warning` | `#eab308` | White |
| `contractor` | `#fb923c` | White |

**Styling:**
```jsx
"inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold"
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
      <DialogTitle>Title</DialogTitle>
      <DialogDescription>Description</DialogDescription>
    </DialogHeader>
    {/* Content */}
    <DialogFooter>
      <Button type="submit">Save</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

**Overlay:**
```jsx
"fixed inset-0 z-50 bg-black/80"
```

**Content:**
```jsx
"fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg sm:rounded-lg"
```

### Select/Dropdown

**Trigger:**
```jsx
"flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
```

**Content:**
```jsx
"relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md"
```

**Item:**
```jsx
"relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground"
```

### Toast/Notification

**Types:**

| Type | Background | Border | Icon Color |
|------|------------|--------|------------|
| `success` | `rgb(220, 252, 231)` | Confirmation | Green |
| `warning` | `rgb(254, 249, 195)` | Warning | Yellow |
| `info` | White | Electric | Blue |

**Positioning:**
```jsx
"fixed bottom-4 right-4 z-50 max-w-sm"
```

**Animation:**
```jsx
"animate-in slide-in-from-right-5 duration-200"
```

**Auto-dismiss:** 4 seconds

---

## 7. Navigation & Headers

### Two-Level Header Structure

```
┌──────────────────────────────────────────────────────────────┐
│  Logo    Resource Command Center           [Users] [Sign Out]│  ← Top Bar (darkest)
├──────────────────────────────────────────────────────────────┤
│  Dashboard | People | Roster | Demand | Recruitment | Budget │  ← Nav Bar (dark)
│     ▔▔▔▔▔▔                                                   │     (active underline)
└──────────────────────────────────────────────────────────────┘
```

### Top Bar

```jsx
<div className="bg-[#1a1f24]">
  <div className="container mx-auto px-4 py-3">
    <div className="flex items-center justify-between">
      {/* Left: Logo + Title */}
      <div className="flex items-center gap-6">
        <img src="/hudl-logo-white.svg" alt="Hudl" className="h-5" />
        <span className="text-white/70 text-sm font-medium hover:text-white cursor-pointer">
          App Title
        </span>
      </div>

      {/* Right: Status + Actions */}
      <div className="flex items-center gap-4">
        {/* Sync status */}
        {isSaving && (
          <span className="text-white/70 text-sm flex items-center">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            Saving...
          </span>
        )}
        <OnlineUsers />
        <button className="text-white/70 text-sm hover:text-white flex items-center gap-1">
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </div>
  </div>
</div>
```

### Navigation Bar

```jsx
<div className="bg-[#232A31] border-b border-white/10">
  <div className="container mx-auto px-4">
    <nav className="flex items-center gap-1">
      {navItems.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          className={`
            px-4 py-3 text-sm font-medium transition-colors
            flex items-center gap-2 border-b-2 -mb-px
            ${currentView === id
              ? 'text-white border-[#FF6300]'
              : 'text-white/70 border-transparent hover:text-white hover:bg-white/5'
            }
          `}
          onClick={() => setCurrentView(id)}
        >
          <Icon className="h-4 w-4" />
          {label}
        </button>
      ))}
    </nav>
  </div>
</div>
```

### Active Tab Indicator

- **Border:** 2px solid `#FF6300` (Hudl Orange)
- **Position:** Bottom of tab
- **Text:** `text-white` (full opacity)

---

## 8. Tables & Data Grids

### Table Structure

```jsx
<table className="w-full">
  <thead>
    <tr className="bg-muted">
      <th className="px-2 py-1 text-left text-sm font-semibold">Header</th>
    </tr>
  </thead>
  <tbody>
    <tr className="roster-row border-b">
      <td className="px-2 py-1 text-sm">Cell</td>
    </tr>
  </tbody>
</table>
```

### Row Hover Styles

```css
.roster-row,
.people-row,
.budget-row {
  transition: background-color 0.2s ease;
}

.roster-row:hover,
.people-row:hover,
.budget-row:hover {
  background-color: rgb(255, 245, 235) !important;
}
```

### Row Changed State (Real-time Updates)

```css
.roster-row--changed,
.people-row--changed {
  background-color: rgb(254, 249, 195); /* Light yellow */
}
```

### Editable Cell Pattern

```jsx
function EditableCell({ value, onChange, type = 'text' }) {
  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value);

  if (isEditing) {
    return (
      <input
        type={type}
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={() => {
          setIsEditing(false);
          onChange(localValue);
        }}
        className="h-7 text-xs min-w-[60px] px-2 py-1 rounded border"
        autoFocus
      />
    );
  }

  return (
    <div
      onClick={() => setIsEditing(true)}
      className="cursor-pointer hover:bg-muted/50 px-2 py-1 rounded min-h-[28px]"
    >
      {value || '-'}
    </div>
  );
}
```

### Numeric Cell Color Coding

**FTE/Demand Values:**

| Range | Background | Text Color |
|-------|------------|------------|
| 0 | Transparent | Subtle gray |
| 0-1 | `rgb(220, 252, 231)` | Confirmation green |
| 1-2 | `rgb(254, 249, 195)` | Ink |
| 2+ | `rgb(254, 226, 226)` | Critical red |

### Utilization Color Coding

| Level | Color | Meaning |
|-------|-------|---------|
| 100% | Confirmation Green | Fully allocated |
| <100% | Warning Yellow | Available capacity (bench) |
| >100% | Critical Red | Over-allocated |

---

## 9. Forms & Inputs

### Input

```jsx
<input
  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
/>
```

### Textarea

```jsx
<textarea
  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
/>
```

### Label

```jsx
<label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
  {label}
</label>
```

### Form Group Pattern

```jsx
<div className="space-y-4">
  <div className="space-y-2">
    <Label htmlFor="name">Name</Label>
    <Input id="name" placeholder="Enter name" />
  </div>

  <div className="space-y-2">
    <Label htmlFor="type">Type</Label>
    <Select>
      <SelectTrigger id="type">
        <SelectValue placeholder="Select type" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="option1">Option 1</SelectItem>
      </SelectContent>
    </Select>
  </div>
</div>
```

### Number Input (Hide Spinners)

```jsx
<input
  type="number"
  className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
/>
```

### Date Picker

```jsx
<Popover>
  <PopoverTrigger asChild>
    <Button variant="outline" className="w-full justify-start text-left font-normal">
      <CalendarIcon className="mr-2 h-4 w-4" />
      {date ? format(date, "PPP") : "Pick a date"}
    </Button>
  </PopoverTrigger>
  <PopoverContent className="w-auto p-0">
    <Calendar
      mode="single"
      selected={date}
      onSelect={setDate}
    />
  </PopoverContent>
</Popover>
```

---

## 10. Icons

### Icon Library

**Package:** `lucide-react` (v0.562.0)

### Icon Sizes

| Size | Class | Pixels | Usage |
|------|-------|--------|-------|
| XS | `h-3 w-3` | 12px | Inline indicators |
| SM | `h-4 w-4` | 16px | Navigation, buttons |
| MD | `h-5 w-5` | 20px | KPI cards, headers |
| LG | `h-6 w-6` | 24px | Empty states |
| XL | `h-8 w-8` | 32px | Loading spinners |

### Common Icons by Usage

| Category | Icons |
|----------|-------|
| **Navigation** | `LayoutDashboard`, `Users`, `Target`, `Briefcase`, `UserCheck`, `DollarSign`, `Settings` |
| **Actions** | `Plus`, `Trash2`, `Edit`, `X`, `Check`, `RotateCcw` |
| **Status** | `Loader2` (spinner), `AlertTriangle`, `AlertCircle`, `HelpCircle` |
| **Chevrons** | `ChevronDown`, `ChevronUp`, `ChevronLeft`, `ChevronRight` |
| **Misc** | `Filter`, `Search`, `Clock`, `Calendar`, `RefreshCw`, `LogOut` |

### Usage Pattern

```jsx
import { Users, Plus, Loader2 } from 'lucide-react';

// In navigation
<Users className="h-4 w-4" />

// In button
<Button>
  <Plus className="h-4 w-4 mr-2" />
  Add Item
</Button>

// Loading spinner
<Loader2 className="h-8 w-8 animate-spin" />
```

---

## 11. Charts & Visualizations

### Chart Library

**Package:** `recharts` (v3.6.0)

### Chart Colors

```typescript
const CHART_COLORS = [
  hudlColors.brand.orange,           // #FF6300
  hudlColors.brand.electric,         // #009CE3
  hudlColors.utility.confirmation,   // #78A100
  hudlColors.utility.warning,        // #F2B600
  hudlColors.brand.slate,            // #4E5D6C
  hudlColors.utility.information,    // #4D6680
  '#8884D8', '#82ca9d', '#ffc658',   // Extended palette
  '#ff7c43', '#a05195', '#665191',
  '#2f4b7c', '#003f5c'
];
```

### Category-Specific Colors

**Chapter Colors:**
| Chapter | Color |
|---------|-------|
| Engineering | Electric (`#009CE3`) |
| Quality | Confirmation (`#78A100`) |
| UX | Information (`#4D6680`) |
| Scrum | Slate (`#4E5D6C`) |
| Product Mgmt | Orange (`#FF6300`) |

**Person Type Colors:**
| Type | Color |
|------|-------|
| Employee | Electric (`#009CE3`) |
| Contractor | Warning (`#F2B600`) |
| Intern | Information (`#4D6680`) |

**Status Colors:**
| Status | Color |
|--------|-------|
| Filled | Confirmation (`#78A100`) |
| Vacancy | Warning (`#F2B600`) |
| Terminated | Slate (`#4E5D6C`) |

**Budget Category Colors:**
| Category | Color |
|----------|-------|
| Travel | `#3b82f6` |
| Software | `#8b5cf6` |
| R&D | `#10b981` |
| Consulting | `#fb923c` |
| Contractors | `#ef4444` |

### Common Chart Patterns

**Bar Chart:**
```jsx
<ResponsiveContainer width="100%" height={300}>
  <BarChart data={data}>
    <CartesianGrid strokeDasharray="3 3" />
    <XAxis dataKey="name" />
    <YAxis />
    <Tooltip />
    <Bar dataKey="value" fill={hudlColors.brand.electric} />
  </BarChart>
</ResponsiveContainer>
```

**Pie Chart:**
```jsx
<ResponsiveContainer width="100%" height={300}>
  <PieChart>
    <Pie
      data={data}
      cx="50%"
      cy="50%"
      innerRadius={60}
      outerRadius={100}
      dataKey="value"
    >
      {data.map((entry, index) => (
        <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
      ))}
    </Pie>
    <Tooltip />
    <Legend />
  </PieChart>
</ResponsiveContainer>
```

---

## 12. Animation & Motion

### Durations

| Speed | Duration | Usage |
|-------|----------|-------|
| Fast | 150ms | Micro-interactions, hover |
| Default | 200-300ms | Transitions, toasts |
| Slow | 450ms | Complex animations |

### Easing Functions

| Type | Value | Usage |
|------|-------|-------|
| Static | `linear` | Spinners |
| Moving | `ease-in-out` | General transitions |
| Entering | `cubic-bezier(0.175, 0.885, 0.32, 1.275)` | Popovers, modals |

### Button Press Effect

```css
button:active:not(:disabled) {
  transform: scale3d(0.98, 0.98, 0.98);
}
```

### Row Hover Transition

```css
transition: background-color 0.2s ease;
```

### Dialog/Popover Animations

```css
/* Open */
data-[state=open]:animate-in
data-[state=open]:fade-in-0
data-[state=open]:zoom-in-95

/* Close */
data-[state=closed]:animate-out
data-[state=closed]:fade-out-0
data-[state=closed]:zoom-out-95
```

### Toast Animation

```css
animate-in slide-in-from-right-5 duration-200
```

### Loading Spinner

```jsx
<Loader2 className="h-8 w-8 animate-spin" />
```

### Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 13. Accessibility

### Focus States

```css
focus-visible:outline-none
focus-visible:ring-2
focus-visible:ring-ring         /* Electric blue */
focus-visible:ring-offset-2
```

### Disabled States

```css
disabled:pointer-events-none
disabled:opacity-50
disabled:cursor-not-allowed
```

### Screen Reader Text

```jsx
<span className="sr-only">Close dialog</span>
```

### Keyboard Navigation

- All interactive elements must be focusable
- Support `Tab`, `Enter`, `Space`, `Escape`
- Dialogs trap focus
- Escape closes modals/popovers

### ARIA Patterns

```jsx
// Dialog
<div role="dialog" aria-modal="true" aria-labelledby="dialog-title">

// Alert
<div role="alert" aria-live="polite">

// Button states
<button aria-pressed={isActive} aria-expanded={isOpen}>

// Labels
<button aria-label="Close dialog">
  <X className="h-4 w-4" />
</button>
```

### Color Contrast

Minimum contrast ratios (WCAG AA):
- Normal text: 4.5:1
- Large text (18px+): 3:1
- UI components: 3:1

| Combination | Contrast |
|-------------|----------|
| White on Electric | 4.5:1+ |
| White on Orange | 5.5:1+ |
| Ink on White | 8:1+ |
| Slate on White | 5.5:1+ |

---

## 14. Dark Mode

### CSS Variables (Dark)

```css
.dark {
  --background: 210 17% 16%;         /* Ink */
  --foreground: 210 20% 96%;
  --card: 210 17% 20%;
  --card-foreground: 210 20% 96%;
  --primary: 198 100% 45%;           /* Electric */
  --primary-foreground: 0 0% 100%;
  --secondary: 210 17% 26%;          /* Evening */
  --secondary-foreground: 210 20% 96%;
  --muted: 210 17% 26%;
  --muted-foreground: 210 16% 60%;
  --accent: 24 100% 50%;             /* Orange */
  --accent-foreground: 0 0% 100%;
  --border: 210 17% 26%;
  --input: 210 17% 26%;
}
```

### Enabling Dark Mode

```jsx
// Using Tailwind class strategy
<html className="dark">
  {/* App content */}
</html>
```

### Component Considerations

- Use CSS variables, not hardcoded colors
- Test all color combinations for contrast
- Shadows may need adjustment (lighter in dark mode)
- Charts may need color adjustments

---

## 15. Implementation Guide

### Required Dependencies

```json
{
  "dependencies": {
    "react": "^19.0.0",
    "tailwindcss": "^3.4.0",
    "@radix-ui/react-dialog": "^1.1.0",
    "@radix-ui/react-select": "^2.0.0",
    "@radix-ui/react-popover": "^1.0.0",
    "@radix-ui/react-label": "^2.0.0",
    "@radix-ui/react-slider": "^1.0.0",
    "lucide-react": "^0.400.0",
    "recharts": "^3.0.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.0.0",
    "tailwind-merge": "^2.0.0",
    "date-fns": "^3.0.0",
    "react-day-picker": "^9.0.0"
  }
}
```

### Tailwind Config

```javascript
// tailwind.config.js
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        // ... other semantic colors
      },
    },
  },
  plugins: [],
};
```

### Font Loading

```html
<!-- index.html -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Barlow:wght@300;400;500;600;700&display=swap" rel="stylesheet">
```

### Base CSS

```css
/* src/index.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* All CSS variables from Section 2 */
  }

  * {
    @apply border-border;
  }

  body {
    @apply bg-background text-foreground;
    font-family: 'Barlow', Helvetica, Arial, sans-serif;
    font-feature-settings: "rlig" 1, "calt" 1;
  }
}

@layer components {
  button:active:not(:disabled) {
    transform: scale3d(0.98, 0.98, 0.98);
  }

  /* Row hover styles */
  .data-row {
    transition: background-color 0.2s ease;
  }
  .data-row:hover {
    background-color: rgb(255, 245, 235) !important;
  }
}
```

### Utility Function

```typescript
// src/lib/utils.ts
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

### Component Directory Structure

```
src/
├── components/
│   └── ui/
│       ├── button.tsx
│       ├── card.tsx
│       ├── dialog.tsx
│       ├── input.tsx
│       ├── label.tsx
│       ├── select.tsx
│       ├── badge.tsx
│       ├── popover.tsx
│       ├── calendar.tsx
│       ├── date-picker.tsx
│       ├── slider.tsx
│       ├── textarea.tsx
│       └── toast.tsx
├── lib/
│   ├── hudlColors.ts
│   ├── utils.ts
│   └── constants.ts
└── index.css
```

---

## Quick Reference Card

### Colors (Hex)
| Name | Hex | Usage |
|------|-----|-------|
| Orange | `#FF6300` | Accent, active tabs |
| Electric | `#009CE3` | Buttons, links, focus |
| Ink | `#232A31` | Dark text, headers |
| Confirmation | `#78A100` | Success |
| Warning | `#F2B600` | Caution |
| Critical | `#E81C00` | Error |

### Spacing
| Value | Pixels | Usage |
|-------|--------|-------|
| 2 | 8px | Small gaps |
| 4 | 16px | Standard |
| 6 | 24px | Card padding |

### Typography
| Style | Size | Weight |
|-------|------|--------|
| H2 | 24px | 600 |
| Body | 14px | 400 |
| Small | 12px | 400 |

### Radius
- Standard: 5px (`rounded-lg`)
- Buttons/Inputs: 3px (`rounded-md`)

---

*This document is based on Hudl's official brand guidelines and the Resource Command Center implementation. Last updated: January 2026.*
