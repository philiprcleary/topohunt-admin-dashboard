import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import type { ActivityPoint } from '../types';
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
}

const DEFAULT_SERIES: ChartSeries[] = [
  { dataKey: 'count', color: '#2563eb', name: 'Collections' },
];

export default function ActivityChart({
  data,
  title = 'Collections over time',
  series,
}: ActivityChartProps) {
  const chartSeries = series ?? DEFAULT_SERIES;

  if (data.length === 0) {
    return <div className="chart-empty">No activity data yet</div>;
  }

  return (
    <div className="chart-card">
      <h3>{title}</h3>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12 }}
            tickFormatter={formatIsoDate}
          />
          <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
          <Tooltip
            labelFormatter={(label) =>
              typeof label === 'string' ? formatIsoDate(label) : ''
            }
          />
          {chartSeries.map((item) => (
            <Line
              key={item.dataKey}
              type="monotone"
              dataKey={item.dataKey}
              stroke={item.color}
              strokeWidth={2}
              dot={{ r: 3, fill: item.color }}
              activeDot={{ r: 5 }}
              name={item.name}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export type { ActivityPoint };
