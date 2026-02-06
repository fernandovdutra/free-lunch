import {
  BarChart,
  Bar,
  XAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { formatAmount } from '@/lib/utils';
import type { MonthlyTotal } from '@/lib/bankingFunctions';

interface MonthlyBarChartProps {
  data: MonthlyTotal[];
  selectedMonthKey: string;
  onMonthClick: (monthKey: string) => void;
  isLoading?: boolean;
  color?: string;
}

const DEFAULT_COLOR = '#1D4739';
const SELECTED_OPACITY = 1;
const UNSELECTED_OPACITY = 0.4;

export function MonthlyBarChart({
  data,
  selectedMonthKey,
  onMonthClick,
  isLoading,
  color = DEFAULT_COLOR,
}: MonthlyBarChartProps) {
  if (isLoading) {
    return (
      <div className="flex h-[150px] items-end justify-around gap-2 px-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex flex-1 flex-col items-center gap-1">
            <Skeleton
              className="w-full rounded-t"
              style={{ height: `${30 + Math.random() * 80}px` }}
            />
            <Skeleton className="h-3 w-8" />
          </div>
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex h-[150px] items-center justify-center">
        <p className="text-sm text-muted-foreground">No data available</p>
      </div>
    );
  }

  // Shorten month labels: "Jan 2024" → "Jan"
  const chartData = data.map((d) => ({
    ...d,
    shortMonth: d.month.split(' ')[0],
  }));

  return (
    <ResponsiveContainer width="100%" height={150}>
      <BarChart
        data={chartData}
        margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
      >
        <XAxis
          dataKey="shortMonth"
          tick={{ fontSize: 12, fill: '#5C6661' }}
          tickLine={false}
          axisLine={false}
          interval={0}
        />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }} />
        <Bar
          dataKey="amount"
          radius={[4, 4, 0, 0]}
          cursor="pointer"
          onClick={(barData: { monthKey?: string }) => {
            if (barData.monthKey) {
              onMonthClick(barData.monthKey);
            }
          }}
        >
          {chartData.map((entry) => (
            <Cell
              key={entry.monthKey}
              fill={color}
              fillOpacity={
                entry.monthKey === selectedMonthKey
                  ? SELECTED_OPACITY
                  : UNSELECTED_OPACITY
              }
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ payload: MonthlyTotal }>;
}

function ChartTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length || !payload[0]) return null;

  const data = payload[0].payload;
  return (
    <div className="rounded-lg border border-border bg-card p-2 shadow-lg">
      <p className="text-sm font-medium">{data.month}</p>
      <p className="text-base font-bold tabular-nums">
        {formatAmount(data.amount, { showSign: false })}
      </p>
      <p className="text-xs text-muted-foreground">
        {data.transactionCount} transaction{data.transactionCount !== 1 ? 's' : ''}
      </p>
    </div>
  );
}
