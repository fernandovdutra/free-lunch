import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { formatAmount, cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import type { CategorySpending } from '@/types';

interface SpendingByCategoryChartProps {
  data: CategorySpending[];
  isLoading?: boolean;
  className?: string;
}

interface ChartDataEntry {
  name: string;
  value: number;
  color: string;
  percentage: number;
}

export function SpendingByCategoryChart({
  data,
  isLoading,
  className,
}: SpendingByCategoryChartProps) {
  if (isLoading) {
    return <Skeleton className={cn('h-[300px] w-full', className)} />;
  }

  if (data.length === 0) {
    return (
      <div className={cn('flex h-[300px] items-center justify-center', className)}>
        <p className="text-muted-foreground">No spending data for this period</p>
      </div>
    );
  }

  // Prepare data for Recharts (top 7 categories, rest grouped as "Other")
  const chartData = prepareChartData(data);

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={2}
            dataKey="value"
            nameKey="name"
          >
            {chartData.map((entry) => (
              <Cell key={entry.name} fill={entry.color} stroke="white" strokeWidth={2} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap justify-center gap-4">
        {chartData.slice(0, 5).map((entry) => (
          <div key={entry.name} className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-sm text-muted-foreground">{entry.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ payload: ChartDataEntry }>;
}

function CustomTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length || !payload[0]) return null;

  const data = payload[0].payload;
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-lg">
      <p className="font-medium text-gray-900">{data.name}</p>
      <p className="text-lg font-bold tabular-nums text-gray-900">
        {formatAmount(data.value, { showSign: false })}
      </p>
      <p className="text-sm text-gray-500">{data.percentage.toFixed(1)}%</p>
    </div>
  );
}

function prepareChartData(data: CategorySpending[]): ChartDataEntry[] {
  const top = data.slice(0, 7);
  const rest = data.slice(7);

  const chartData: ChartDataEntry[] = top.map((d) => ({
    name: d.categoryName,
    value: d.amount,
    color: d.categoryColor,
    percentage: d.percentage,
  }));

  if (rest.length > 0) {
    const otherAmount = rest.reduce((sum, d) => sum + d.amount, 0);
    const otherPercentage = rest.reduce((sum, d) => sum + d.percentage, 0);
    chartData.push({
      name: 'Other',
      value: otherAmount,
      color: '#9CA3AF',
      percentage: otherPercentage,
    });
  }

  return chartData;
}
