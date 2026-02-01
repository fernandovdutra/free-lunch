import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { formatAmount } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import type { MonthlySpending } from '@/hooks/useCounterpartyAnalytics';

interface CounterpartyTrendChartProps {
  data: MonthlySpending[];
  isLoading?: boolean;
}

export function CounterpartyTrendChart({
  data,
  isLoading,
}: CounterpartyTrendChartProps) {
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
      <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E2E5E3" />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 11, fill: '#5C6661' }}
          tickLine={false}
          axisLine={{ stroke: '#E2E5E3' }}
          interval={1}
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
        <Tooltip content={<CustomTooltip />} />
        <Line
          type="monotone"
          dataKey="amount"
          stroke="#1D4739"
          strokeWidth={2}
          dot={{ fill: '#1D4739', strokeWidth: 0, r: 4 }}
          activeDot={{ fill: '#1D4739', strokeWidth: 0, r: 6 }}
        />
      </LineChart>
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
      <p className="text-lg font-bold tabular-nums text-primary">
        {formatAmount(-data.amount, { showSign: false })}
      </p>
      <p className="text-sm text-muted-foreground">
        {data.transactionCount} transaction{data.transactionCount !== 1 ? 's' : ''}
      </p>
    </div>
  );
}
