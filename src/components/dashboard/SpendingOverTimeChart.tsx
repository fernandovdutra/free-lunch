import { BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { formatAmount, cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import type { TimelineData } from '@/types';

interface SpendingOverTimeChartProps {
  data: TimelineData[];
  isLoading?: boolean;
  className?: string;
}

export function SpendingOverTimeChart({ data, isLoading, className }: SpendingOverTimeChartProps) {
  if (isLoading) {
    return <Skeleton className={cn('h-[300px] w-full', className)} />;
  }

  if (data.length === 0 || data.every((d) => d.expenses === 0 && d.income === 0)) {
    return (
      <div className={cn('flex h-[300px] items-center justify-center', className)}>
        <p className="text-muted-foreground">No transaction data for this period</p>
      </div>
    );
  }

  // Limit number of bars for readability (show every nth day if too many)
  const chartData =
    data.length > 15 ? data.filter((_, i) => i % Math.ceil(data.length / 15) === 0) : data;

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
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
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

interface TooltipPayload {
  value: number;
}

interface TooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
}

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
