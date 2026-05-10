import { cn, formatAmount } from '@/lib/utils';

export interface AllocationSlice {
  id: string;
  label: string;
  value: number;
  /** Optional category emoji icon to render under the bar. */
  icon?: string;
}

interface BudgetWaterfallProps {
  slices: AllocationSlice[];
  total: number;
  className?: string;
}

/**
 * Sea-green family, ordered darkest → lightest. Bars are sorted descending
 * by value upstream, so the heaviest bar gets the deepest tone and shades
 * fade as the staircase climbs.
 */
const GREEN_SHADES = [
  '#1F4A3A',
  '#2D5A4A',
  '#3A6F5C',
  '#4A8474',
  '#5E9888',
  '#7AAE9E',
  '#96C2B4',
  '#B3D5C9',
];

const VB = { w: 320, h: 122 };
const PAD = { l: 6, r: 6, t: 22, b: 20 };
const innerW = VB.w - PAD.l - PAD.r;
const innerH = VB.h - PAD.t - PAD.b;
const GAP = 3;
const ICON_SIZE = 13;

interface Step {
  id: string;
  label: string;
  value: number;
  cumBefore: number;
  cumAfter: number;
  color: string;
  icon?: string;
  isFree?: boolean;
}

export function BudgetWaterfall({ slices, total, className }: BudgetWaterfallProps) {
  const positive = slices.filter((s) => s.value > 0);
  const allocated = positive.reduce((sum, s) => sum + s.value, 0);
  const free = Math.max(0, total - allocated);

  const steps: Step[] = [];
  let running = 0;
  positive.forEach((s, i) => {
    const color = GREEN_SHADES[i % GREEN_SHADES.length] ?? '#2D5A4A';
    steps.push({
      id: s.id,
      label: s.label,
      value: s.value,
      cumBefore: running,
      cumAfter: running + s.value,
      color,
      ...(s.icon ? { icon: s.icon } : {}),
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
      {/* Cap label sits above the line, replacing the duplicated hero number */}
      <text
        x={VB.w - PAD.r}
        y={capY - 8}
        textAnchor="end"
        fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
        fontSize="10"
        fill="var(--text-mid)"
        style={{ letterSpacing: '0.04em' }}
      >
        {formatAmount(total, { showSign: false, noCents: true })}
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
                fill={s.color}
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

            {/* Icon (or FREE marker) under the bar */}
            {s.isFree ? (
              <text
                x={cx}
                y={baselineY + 11}
                textAnchor="middle"
                dominantBaseline="central"
                fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                fontSize="8"
                fill="var(--text-lo)"
                style={{ letterSpacing: '0.06em' }}
              >
                FREE
              </text>
            ) : s.icon ? (
              <text
                x={cx}
                y={baselineY + 12}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={ICON_SIZE}
              >
                {s.icon}
              </text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}
