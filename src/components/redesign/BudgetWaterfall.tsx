import { useId } from 'react';
import { cn, formatAmount } from '@/lib/utils';

export interface AllocationSlice {
  id: string;
  label: string;
  value: number;
}

interface BudgetWaterfallProps {
  slices: AllocationSlice[];
  total: number;
  className?: string;
}

const CHART_COLORS = [
  '#2D5A4A',
  '#5B6E8A',
  '#4A6FA5',
  '#C9A227',
  '#A67B8A',
  '#7B6B8A',
  '#4A9A8A',
  '#B87D4B',
  '#6B7C72',
  '#C45C4A',
];

const VB = { w: 320, h: 138 };
const PAD = { l: 6, r: 6, t: 22, b: 36 };
const innerW = VB.w - PAD.l - PAD.r;
const innerH = VB.h - PAD.t - PAD.b;
const GAP = 3;
const MAX_LABEL_CHARS = 6;

interface Step {
  id: string;
  label: string;
  value: number;
  cumBefore: number;
  cumAfter: number;
  color: string;
  isFree?: boolean;
}

function lighten(hex: string, amount: number): string {
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  const lr = Math.round(r + (255 - r) * amount);
  const lg = Math.round(g + (255 - g) * amount);
  const lb = Math.round(b + (255 - b) * amount);
  return `#${lr.toString(16).padStart(2, '0')}${lg.toString(16).padStart(2, '0')}${lb.toString(16).padStart(2, '0')}`;
}

function shortLabel(name: string): string {
  const upper = name.toUpperCase();
  return upper.length <= MAX_LABEL_CHARS ? upper : upper.slice(0, MAX_LABEL_CHARS);
}

export function BudgetWaterfall({ slices, total, className }: BudgetWaterfallProps) {
  const idBase = useId().replace(/:/g, '');
  const positive = slices.filter((s) => s.value > 0);
  const allocated = positive.reduce((sum, s) => sum + s.value, 0);
  const free = Math.max(0, total - allocated);

  const steps: Step[] = [];
  let running = 0;
  positive.forEach((s, i) => {
    const color = CHART_COLORS[i % CHART_COLORS.length] ?? '#2D5A4A';
    steps.push({
      id: s.id,
      label: s.label,
      value: s.value,
      cumBefore: running,
      cumAfter: running + s.value,
      color,
    });
    running += s.value;
  });
  if (free > 0) {
    steps.push({
      id: '__free__',
      label: 'Free',
      value: free,
      cumBefore: running,
      cumAfter: running + free,
      color: 'rgba(255,255,255,0.32)',
      isFree: true,
    });
  }

  if (steps.length === 0 || total <= 0) return null;

  const slotW =
    steps.length === 1
      ? innerW
      : (innerW - GAP * (steps.length - 1)) / steps.length;
  const yOf = (v: number) => PAD.t + innerH - (v / total) * innerH;
  const xOf = (i: number) => PAD.l + i * (slotW + GAP);

  const baselineY = yOf(0);
  const capY = yOf(total);

  const ariaLabel = `Budget waterfall: ${steps
    .map((s) => `${s.label} ${formatAmount(s.value, { showSign: false, noCents: true })}`)
    .join(', ')}. Cap ${formatAmount(total, { showSign: false, noCents: true })}.`;

  return (
    <svg
      className={cn('block', className)}
      viewBox={`0 0 ${VB.w} ${VB.h}`}
      width="100%"
      preserveAspectRatio="none"
      role="img"
      aria-label={ariaLabel}
    >
      <defs>
        {steps.map((s, i) => {
          if (s.isFree) return null;
          return (
            <linearGradient
              key={`grad-${s.id}`}
              id={`bw-${idBase}-${i}`}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop offset="0%" stopColor={lighten(s.color, 0.45)} />
              <stop offset="100%" stopColor={s.color} />
            </linearGradient>
          );
        })}
      </defs>

      {/* Cap dashed line */}
      <line
        x1={PAD.l}
        x2={VB.w - PAD.r}
        y1={capY}
        y2={capY}
        stroke="var(--rule-hi)"
        strokeWidth="1"
        strokeDasharray="3 3"
      />
      {/* Cap label */}
      <text
        x={VB.w - PAD.r}
        y={capY - 8}
        textAnchor="end"
        fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
        fontSize="8"
        fill="var(--text-lo)"
        style={{ letterSpacing: '0.06em' }}
      >
        {`${formatAmount(total, { showSign: false, noCents: true })} CAP`}
      </text>

      {/* Baseline */}
      <line
        x1={PAD.l}
        x2={VB.w - PAD.r}
        y1={baselineY}
        y2={baselineY}
        stroke="var(--rule)"
        strokeWidth="1"
      />

      {/* Connectors between adjacent step tops */}
      {steps.slice(0, -1).map((s, i) => (
        <line
          key={`conn-${s.id}`}
          x1={xOf(i) + slotW}
          x2={xOf(i + 1)}
          y1={yOf(s.cumAfter)}
          y2={yOf(s.cumAfter)}
          stroke="var(--text-lo)"
          strokeOpacity="0.35"
          strokeWidth="1"
        />
      ))}

      {/* Bars + labels */}
      {steps.map((s, i) => {
        const x = xOf(i);
        const cx = x + slotW / 2;
        const yTop = yOf(s.cumAfter);
        const yBot = yOf(s.cumBefore);
        const h = Math.max(0.5, yBot - yTop);
        const valueText = formatAmount(s.value, { showSign: false, noCents: true });
        const titleText = `${s.label}: ${valueText}`;
        const xAxisText = s.isFree ? 'FREE' : shortLabel(s.label);

        return (
          <g key={s.id}>
            {s.isFree ? (
              <rect
                x={x}
                y={yTop}
                width={slotW}
                height={h}
                fill="rgba(255,255,255,0.04)"
                stroke="rgba(255,255,255,0.32)"
                strokeDasharray="3 3"
                strokeWidth="1"
              >
                <title>{titleText}</title>
              </rect>
            ) : (
              <rect
                x={x}
                y={yTop}
                width={slotW}
                height={h}
                fill={`url(#bw-${idBase}-${i})`}
              >
                <title>{titleText}</title>
              </rect>
            )}

            {/* Value above bar */}
            <text
              x={cx}
              y={yTop - 3}
              textAnchor="middle"
              fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
              fontSize="8"
              fill="var(--text-mid)"
              style={{ letterSpacing: '-0.02em' }}
            >
              {valueText}
            </text>

            {/* Category name on x-axis (tilted -45°) */}
            <text
              x={cx}
              y={baselineY + 8}
              textAnchor="end"
              transform={`rotate(-45 ${cx} ${baselineY + 8})`}
              fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
              fontSize="8"
              fill={s.isFree ? 'var(--text-lo)' : s.color}
              fillOpacity={s.isFree ? 1 : 0.85}
              style={{ letterSpacing: '0.04em' }}
            >
              {xAxisText}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
