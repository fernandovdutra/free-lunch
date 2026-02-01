import {
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { formatAmount } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import type { MonthlySpending } from '@/hooks/useCounterpartyAnalytics';

interface CounterpartySpendingChartProps {
  data: MonthlySpending[];
  isLoading?: boolean;
}

export function CounterpartySpendingChart({
  data,
  isLoading,
}: CounterpartySpendingChartProps) {
  if (isLoading) {
    return <Skeleton className="h-[300px] w-full" />;
  }

  if (data.length === 0 || data.every((d) => d.amount === 0)) {
    return (
      <div className="flex h-[300px] items-center justify-center">
        <p className="text-muted-foreground">No spending data available</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E2E5E3" vertical={false} />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 11, fill: '#5C6661' }}
          tickLine={false}
          axisLine={{ stroke: '#E2E5E3' }}
          interval={0}
          angle={-45}
          textAnchor="end"
          height={60}
        />
        <YAxis
          tick={{ fontSize: 12, fill: '#5C6661' }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value: number) =>
            value >= 1000 ? `€${(value / 1000).toFixed(1)}k` : `€${value}`
          }
          width={60}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }} />
        <Bar dataKey="amount" fill="#C45C4A" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ payload: MonthlySpending }>;
}

function CustomTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length || !payload[0]) return null;

  const data = payload[0].payload;
  return (
    <div className="rounded-lg border border-border bg-card p-3 shadow-lg">
      <p className="font-medium">{data.month}</p>
      <p className="text-lg font-bold tabular-nums text-destructive">
        {formatAmount(-data.amount, { showSign: false })}
      </p>
      <p className="text-sm text-muted-foreground">
        {data.transactionCount} transaction{data.transactionCount !== 1 ? 's' : ''}
      </p>
    </div>
  );
}
