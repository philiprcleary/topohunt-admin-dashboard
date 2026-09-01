import { useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { enGB } from 'date-fns/locale';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import type { ActivityPoint } from '../types';
import { startOfUtcDay } from './DateRangeSelector';
import { formatIsoDate } from '../utils/formatDate';

export interface ChartSeries {
  dataKey: string;
  color: string;
  name: string;
}

interface ActivityChartProps {
  data: object[];
  title?: string;
  series?: ChartSeries[];
  startDate?: Date;
  endDate?: Date;
}

function formatUtcDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function fillDateRange(
  data: object[],
  startDate: Date,
  endDate: Date,
  dataKeys: string[],
): object[] {
  const byDate = new Map(
    data.map((point) => {
      const record = point as { date: string };
      return [record.date, point] as const;
    }),
  );
  const zeroPoint = Object.fromEntries(dataKeys.map((key) => [key, 0]));
  const start = startOfUtcDay(startDate);
  const end = startOfUtcDay(endDate);
  const filled: object[] = [];

  for (let time = start.getTime(); time <= end.getTime(); time += 86_400_000) {
    const date = formatUtcDate(new Date(time));
    filled.push(byDate.get(date) ?? { date, ...zeroPoint });
  }

  return filled;
}

function buildMonthLabels(dates: string[]): Map<string, string> {
  const labels = new Map<string, string>();
  const seenMonths = new Set<string>();
  const years = new Set(dates.map((date) => date.slice(0, 4)));
  const includeYear = years.size > 1;

  for (const date of dates) {
    const monthKey = date.slice(0, 7);
    if (seenMonths.has(monthKey)) {
      continue;
    }
    seenMonths.add(monthKey);
    labels.set(
      date,
      format(parseISO(date), includeYear ? 'MMMM yyyy' : 'MMMM', { locale: enGB }),
    );
  }

  return labels;
}

const DEFAULT_SERIES: ChartSeries[] = [
  { dataKey: 'count', color: '#2563eb', name: 'Collections' },
];

export default function ActivityChart({
  data,
  title = 'Collections over time',
  series,
  startDate,
  endDate,
}: ActivityChartProps) {
  const chartSeries = series ?? DEFAULT_SERIES;
  const chartData = useMemo(() => {
    if (!startDate || !endDate) {
      return data;
    }

    return fillDateRange(
      data,
      startDate,
      endDate,
      chartSeries.map((item) => item.dataKey),
    );
  }, [chartSeries, data, endDate, startDate]);

  const monthLabels = useMemo(() => {
    const dates = chartData.map((point) => (point as { date: string }).date);
    return buildMonthLabels(dates);
  }, [chartData]);

  if (chartData.length === 0) {
    return <div className="chart-empty">No activity data yet</div>;
  }

  const showAllDays = Boolean(startDate && endDate);

  return (
    <div className="chart-card">
      <h3>{title}</h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={chartData} margin={{ bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="date"
            height={32}
            tick={{ fontSize: 12 }}
            tickFormatter={(value) =>
              typeof value === 'string' ? (monthLabels.get(value) ?? '') : ''
            }
            interval={showAllDays ? 0 : undefined}
            minTickGap={showAllDays ? 0 : undefined}
          />
          <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
          <Tooltip
            labelFormatter={(label) =>
              typeof label === 'string' ? formatIsoDate(label) : ''
            }
          />
          {chartSeries.length > 1 && <Legend />}
          {chartSeries.map((item) => (
            <Bar
              key={item.dataKey}
              dataKey={item.dataKey}
              fill={item.color}
              name={item.name}
              stackId={chartSeries.length > 1 ? 'activity' : undefined}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export type { ActivityPoint };
