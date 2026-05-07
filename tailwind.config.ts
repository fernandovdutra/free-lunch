import type { Config } from 'tailwindcss';

/*
 * Calm Terminal theme. Token names mirror README §Color tokens + §Typography.
 * Shadcn-compat keys (background, foreground, card, …) are kept so existing
 * components render sensibly until they're rebuilt.
 */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // --- Calm Terminal (canonical) ---
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        surfaceHi: 'var(--surface-hi)',
        rule: 'var(--rule)',
        ruleHi: 'var(--rule-hi)',
        textHi: 'var(--text-hi)',
        textMid: 'var(--text-mid)',
        textLo: 'var(--text-lo)',
        textDim: 'var(--text-dim)',
        accent: {
          DEFAULT: 'var(--accent)',
          dim: 'var(--accent-dim)',
          // shadcn compat: components reference `accent-foreground`
          foreground: 'var(--bg)',
        },
        warn: {
          DEFAULT: 'var(--warn)',
          dim: 'var(--warn-dim)',
        },
        alert: {
          DEFAULT: 'var(--alert)',
          dim: 'var(--alert-dim)',
        },

        // --- Shadcn compatibility layer (HSL-backed) ---
        background: 'hsl(var(--color-background))',
        foreground: 'hsl(var(--color-foreground))',
        card: {
          DEFAULT: 'hsl(var(--color-card))',
          foreground: 'hsl(var(--color-card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--color-popover))',
          foreground: 'hsl(var(--color-popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--color-primary))',
          foreground: 'hsl(var(--color-primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--color-secondary))',
          foreground: 'hsl(var(--color-secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--color-muted))',
          foreground: 'hsl(var(--color-muted-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--color-destructive))',
          foreground: 'hsl(var(--color-destructive-foreground))',
        },
        border: 'hsl(var(--color-border))',
        input: 'hsl(var(--color-input))',
        ring: 'hsl(var(--color-ring))',
      },
      borderRadius: {
        card: '10px',
        sheet: '20px',
        pill: '9999px',
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'ui-monospace', 'SF Mono', 'Menlo', 'monospace'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      fontSize: {
        // Calm Terminal type scale (README §Typography)
        'ct-headline': ['48px', { lineHeight: '1', letterSpacing: '-0.02em', fontWeight: '500' }],
        'ct-section': ['14px', { lineHeight: '1', letterSpacing: '0.08em', fontWeight: '500' }],
        'ct-row': ['13px', { lineHeight: '1', fontWeight: '500' }],
        'ct-meta': ['10px', { lineHeight: '1.2', letterSpacing: '0.08em', fontWeight: '400' }],
        'ct-tab': ['9px', { lineHeight: '1', letterSpacing: '0.12em', fontWeight: '500' }],
      },
      letterSpacing: {
        tight2: '-0.02em',
        'upper-tight': '0.08em',
        'upper-wide': '0.12em',
      },
      spacing: {
        'ct-topbar': '44px',
        'ct-tabbar': '68px',
        'ct-safe-top': '54px',
      },
      transitionTimingFunction: {
        'ct-out': 'cubic-bezier(0.2, 0.6, 0.2, 1)',
      },
      transitionDuration: {
        180: '180ms',
        220: '220ms',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'fade-out': {
          from: { opacity: '1' },
          to: { opacity: '0' },
        },
        'slide-in-from-top': {
          from: { transform: 'translateY(-10px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        'slide-in-from-bottom': {
          from: { transform: 'translateY(10px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        'slide-in-from-right': {
          from: { transform: 'translateX(10px)', opacity: '0' },
          to: { transform: 'translateX(0)', opacity: '1' },
        },
        'sheet-up': {
          from: { transform: 'translateY(100%)' },
          to: { transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 180ms cubic-bezier(0.2, 0.6, 0.2, 1)',
        'fade-out': 'fade-out 150ms ease-in',
        'slide-in-from-top': 'slide-in-from-top 180ms cubic-bezier(0.2, 0.6, 0.2, 1)',
        'slide-in-from-bottom': 'slide-in-from-bottom 180ms cubic-bezier(0.2, 0.6, 0.2, 1)',
        'slide-in-from-right': 'slide-in-from-right 180ms cubic-bezier(0.2, 0.6, 0.2, 1)',
        'sheet-up': 'sheet-up 220ms cubic-bezier(0.2, 0.6, 0.2, 1)',
      },
    },
  },
  plugins: [],
} satisfies Config;
