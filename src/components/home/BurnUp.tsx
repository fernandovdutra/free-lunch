import { useId, useMemo } from 'react';
import {
  computeExpected,
  computeProjection,
  type FixedCost,
} from '@/lib/burnUp';
import { formatAmount } from '@/lib/utils';

interface BurnUpProps {
  /** Cumulative € spent at end of each day. Index 0 = €0. */
  daily: number[];
  /** Full scheduled fixed costs in this month — drives the expected line. */
  fixed: FixedCost[];
  /** Schedule items whose matching transaction has already posted. */
  posted: FixedCost[];
  /** Schedule items still expected (upcoming or overdue). */
  unposted: FixedCost[];
  /** Monthly budget cap. */
  budget: number;
  /** Days in the visible month. */
  daysInMonth: number;
  /** 0-indexed day = `daily.length - 1`. */
  today: number;
  /** Actual line color: amber when over, green otherwise. */
  isOver: boolean;
  /** Projection line color: amber when projected over, green otherwise. */
  projOver: boolean;
}

const VB = { w: 312, h: 132 };
const PAD = { l: 4, r: 4, t: 14, b: 18 };
const innerW = VB.w - PAD.l - PAD.r;
const innerH = VB.h - PAD.t - PAD.b;

export function BurnUp({
  daily,
  fixed,
  posted,
  unposted,
  budget,
  daysInMonth,
  today,
  isOver,
  projOver,
}: BurnUpProps) {
  const fillId = useId();
  const gradientId = `bu-fill-${fillId.replace(/:/g, '')}`;

  const expected = useMemo(
    () => computeExpected(daysInMonth, fixed, budget),
    [daysInMonth, fixed, budget]
  );

  const projection = useMemo(
    () => computeProjection(daily, posted, unposted, today, daysInMonth),
    [daily, posted, unposted, today, daysInMonth]
  );

  const yMax = Math.max(budget, projection.projectedEnd, 1) * 1.06;

  const xOf = (d: number) => PAD.l + (d / daysInMonth) * innerW;
  const yOf = (v: number) => PAD.t + innerH - (v / yMax) * innerH;

  const actualColor = isOver ? 'var(--alert)' : 'var(--accent)';
  const projColor = projOver ? 'var(--alert)' : 'var(--accent)';

  // ---- Paths --------------------------------------------------------------

  const expectedPath = expected
    .map((v, d) => `${d === 0 ? 'M' : 'L'}${xOf(d).toFixed(2)},${yOf(v).toFixed(2)}`)
    .join(' ');

  const actualPath = daily
    .map((v, d) => `${d === 0 ? 'M' : 'L'}${xOf(d).toFixed(2)},${yOf(v).toFixed(2)}`)
    .join(' ');

  const baselineY = yOf(0);
  const actualArea = daily.length
    ? `${actualPath} L${xOf(today).toFixed(2)},${baselineY.toFixed(2)} L${xOf(0).toFixed(2)},${baselineY.toFixed(2)} Z`
    : '';

  const todayY = yOf(daily[today] ?? 0);

  // Per-day projection path so upcoming fixed-cost steps are visible
  // instead of being smoothed into a straight diagonal.
  const projectionPath = (() => {
    if (today <= 0 || today >= daysInMonth) return '';
    const segs: string[] = [];
    for (let d = today; d <= daysInMonth; d++) {
      const v = projection.perDay(d);
      segs.push(`${d === today ? 'M' : 'L'}${xOf(d).toFixed(2)},${yOf(v).toFixed(2)}`);
    }
    return segs.join(' ');
  })();

  // Markers on the expected line for fixed costs still expected to post.
  // Already-posted items disappear because the actual line has stepped
  // up at their position. Items past month-end are capped to the last day.
  const markerDay = (f: FixedCost) => Math.min(daysInMonth, f.d);
  const futureMarkers = unposted.map((f) => ({ ...f, dx: markerDay(f) }));

  // ---- Labels -------------------------------------------------------------

  const labelLeft = `D1`;
  const labelRight = `D${daysInMonth}`;
  const labelToday = today > 0 ? `TODAY · D${today}` : null;
  const labelY = VB.h - PAD.b + 10;

  // Drop an endpoint label when the centered TODAY label would overlap it
  // (e.g. "TODAY · D28" colliding with "D31" late in the month). Monospace
  // at fontSize 9 ≈ 0.6em per char.
  const CHAR_W = 5.4;
  const LABEL_GAP = 4;
  const todayCenter = xOf(today);
  const todayHalf = labelToday ? (labelToday.length * CHAR_W) / 2 : 0;
  const showLeft =
    !labelToday || todayCenter - todayHalf - LABEL_GAP > PAD.l + labelLeft.length * CHAR_W;
  const showRight =
    !labelToday ||
    todayCenter + todayHalf + LABEL_GAP < VB.w - PAD.r - labelRight.length * CHAR_W;

  return (
    <svg
      viewBox={`0 0 ${VB.w} ${VB.h}`}
      width="100%"
      preserveAspectRatio="none"
      className="block"
      role="img"
      aria-label={`Burn-up chart. Spent ${formatAmount(daily[today] ?? 0, { showSign: false, noCents: true })} of ${formatAmount(budget, { showSign: false, noCents: true })} budget. Projected ${formatAmount(projection.projectedEnd, { showSign: false, noCents: true })} by month-end.`}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={actualColor} stopOpacity="0.18" />
          <stop offset="100%" stopColor={actualColor} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Budget rule */}
      <line
        x1={PAD.l}
        x2={VB.w - PAD.r}
        y1={yOf(budget)}
        y2={yOf(budget)}
        stroke="var(--rule-hi)"
        strokeWidth="1"
        strokeDasharray="3 3"
      />
      <text
        x={VB.w - PAD.r}
        y={yOf(budget) - 3}
        textAnchor="end"
        fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
        fontSize="9"
        fill="var(--text-lo)"
      >
        {`${formatAmount(budget, { showSign: false, noCents: true })} BUDGET`}
      </text>

      {/* Today vertical */}
      {today > 0 && (
        <line
          x1={xOf(today)}
          x2={xOf(today)}
          y1={PAD.t}
          y2={VB.h - PAD.b}
          stroke="var(--rule-hi)"
          strokeWidth="1"
          strokeDasharray="3 3"
        />
      )}

      {/* Expected line */}
      <path
        d={expectedPath}
        fill="none"
        stroke="var(--text-lo)"
        strokeOpacity="0.7"
        strokeWidth="1"
        strokeDasharray="3 3"
      />

      {/* Future fixed-cost markers on the expected line */}
      {futureMarkers.map((f) => (
        <circle
          key={`fm-${f.d}-${f.l}-${f.a}`}
          cx={xOf(f.dx)}
          cy={yOf(expected[f.dx] ?? 0)}
          r="2.5"
          fill="var(--bg)"
          stroke="var(--text-lo)"
          strokeOpacity="0.7"
          strokeWidth="1"
        />
      ))}

      {/* Actual area */}
      {actualArea && <path d={actualArea} fill={`url(#${gradientId})`} stroke="none" />}

      {/* Actual line */}
      {daily.length > 1 && (
        <path
          d={actualPath}
          fill="none"
          stroke={actualColor}
          strokeWidth="1.6"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      )}

      {/* Projection path — steps up at each upcoming fixed-cost date,
          slopes by observed variable burn rate in between. */}
      {projectionPath && (
        <path
          d={projectionPath}
          fill="none"
          stroke={projColor}
          strokeWidth="1"
          strokeDasharray="3 3"
        />
      )}

      {/* Today dot + halo */}
      {today > 0 && (
        <>
          <circle cx={xOf(today)} cy={todayY} r="6" fill={actualColor} opacity="0.18" />
          <circle cx={xOf(today)} cy={todayY} r="3" fill={actualColor} />
        </>
      )}

      {/* Axis labels */}
      {showLeft && (
        <text
          x={PAD.l}
          y={labelY}
          textAnchor="start"
          fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
          fontSize="9"
          fill="var(--text-lo)"
        >
          {labelLeft}
        </text>
      )}
      {labelToday && (
        <text
          x={xOf(today)}
          y={labelY}
          textAnchor="middle"
          fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
          fontSize="9"
          fill="var(--text-lo)"
        >
          {labelToday}
        </text>
      )}
      {showRight && (
        <text
          x={VB.w - PAD.r}
          y={labelY}
          textAnchor="end"
          fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
          fontSize="9"
          fill="var(--text-lo)"
        >
          {labelRight}
        </text>
      )}
    </svg>
  );
}
