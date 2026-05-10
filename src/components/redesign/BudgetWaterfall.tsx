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

const SLICE_OPACITIES = [0.95, 0.87, 0.78, 0.7, 0.62, 0.53, 0.45, 0.37, 0.28, 0.2];

const VB = { w: 312, h: 96 };
const PAD = { l: 4, r: 4, t: 6, b: 4 };
const innerW = VB.w - PAD.l - PAD.r;
const innerH = VB.h - PAD.t - PAD.b;
const GAP = 2;

interface Step {
  id: string;
  label: string;
  value: number;
  cumBefore: number;
  cumAfter: number;
  isFree?: boolean;
}

export function BudgetWaterfall({ slices, total, className }: BudgetWaterfallProps) {
  const positive = slices.filter((s) => s.value > 0);
  const allocated = positive.reduce((sum, s) => sum + s.value, 0);
  const free = Math.max(0, total - allocated);

  const steps: Step[] = [];
  let running = 0;
  for (const s of positive) {
    steps.push({
      id: s.id,
      label: s.label,
      value: s.value,
      cumBefore: running,
      cumAfter: running + s.value,
    });
    running += s.value;
  }
  if (free > 0) {
    steps.push({
      id: '__free__',
      label: 'Free',
      value: free,
      cumBefore: running,
      cumAfter: running + free,
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

  const ariaLabel = `Budget waterfall: ${steps
    .map((s) => `${s.label} ${formatAmount(s.value, { showSign: false, noCents: true })}`)
    .join(', ')}. Total ${formatAmount(total, { showSign: false, noCents: true })}.`;

  return (
    <svg
      className={cn('block', className)}
      viewBox={`0 0 ${VB.w} ${VB.h}`}
      width="100%"
      preserveAspectRatio="none"
      role="img"
      aria-label={ariaLabel}
    >
      {/* Top rule at total cap */}
      <line
        x1={PAD.l}
        x2={VB.w - PAD.r}
        y1={yOf(total)}
        y2={yOf(total)}
        stroke="var(--rule-hi)"
        strokeWidth="1"
        strokeDasharray="3 3"
      />

      {/* Baseline */}
      <line
        x1={PAD.l}
        x2={VB.w - PAD.r}
        y1={yOf(0)}
        y2={yOf(0)}
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
          strokeOpacity="0.5"
          strokeWidth="1"
        />
      ))}

      {/* Bars */}
      {steps.map((s, i) => {
        const x = xOf(i);
        const yTop = yOf(s.cumAfter);
        const yBot = yOf(s.cumBefore);
        const h = Math.max(0.5, yBot - yTop);
        const titleText = `${s.label}: ${formatAmount(s.value, {
          showSign: false,
          noCents: true,
        })}`;

        if (s.isFree) {
          return (
            <rect
              key={s.id}
              x={x}
              y={yTop}
              width={slotW}
              height={h}
              fill="rgba(255,255,255,0.04)"
              stroke="rgba(255,255,255,0.28)"
              strokeDasharray="3 3"
              strokeWidth="1"
            >
              <title>{titleText}</title>
            </rect>
          );
        }

        const op = SLICE_OPACITIES[Math.min(i, SLICE_OPACITIES.length - 1)];
        return (
          <rect
            key={s.id}
            x={x}
            y={yTop}
            width={slotW}
            height={h}
            fill="var(--accent)"
            opacity={op}
          >
            <title>{titleText}</title>
          </rect>
        );
      })}
    </svg>
  );
}
