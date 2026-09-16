import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { MetricPoint } from '../../types/api';

interface MetricsTrendChartProps {
  series: Record<string, MetricPoint[]>;
  metricNames: string[];
  labels?: Record<string, string>;
  units?: Record<string, string>;
  height?: number;
}

const DEFAULT_COLORS = ['#0066CC', '#D13438', '#007A3D', '#FF8C00', '#875692', '#767676'];
const DEFAULT_LABELS: Record<string, string> = {
  db_cpu_pct: 'DB CPU %',
  db_sessions_total: 'Sessions (total)',
  db_sessions_active: 'Sessions (active)',
  db_storage_pct: 'Storage usage %',
  db_io_read_mbps: 'IO read (MB/s)',
  db_io_write_mbps: 'IO write (MB/s)',
  api_requests_total: 'API requests',
  api_latency_avg_ms: 'API latency (ms)',
  api_errors_total: 'API errors',
  host_cpu_pct: 'Host CPU %',
  host_ram_pct: 'Host RAM %',
  host_ram_used_mb: 'Host RAM used (MB)',
  host_disk_pct: 'Host disk %',
};

export const MetricsTrendChart: React.FC<MetricsTrendChartProps> = ({
  series,
  metricNames,
  labels,
  units,
  height = 300,
}) => {
  const names = metricNames.filter((m) => (series[m] || []).length > 0);
  if (!names.length) {
    return (
      <div
        style={{
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#605E5C',
        }}
      >
        No data yet - metrics will appear once collection runs (up to 30s).
      </div>
    );
  }

  const chartData = names.map((m) => series[m]).reduce(
    (acc, points) => {
      for (const pt of points) {
        acc[pt.timestamp] = { timestamp: pt.timestamp };
      }
      return acc;
    },
    {} as Record<string, Record<string, unknown>>
  );
  for (const m of names) {
    for (const pt of series[m]) {
      chartData[pt.timestamp][m] = pt.value;
    }
  }
  const data = Object.values(chartData).sort((a, b) =>
    String(a.timestamp).localeCompare(String(b.timestamp))
  );

  const labelOf = (m: string) => labels?.[m] ?? DEFAULT_LABELS[m] ?? m;
  const unitOf = (m: string) => units?.[m] ?? '';

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E1E4E8" />
        <XAxis
          dataKey="timestamp"
          tick={{ fontSize: 11, fill: '#605E5C' }}
          axisLine={{ stroke: '#E1E4E8' }}
          tickLine={false}
          tickFormatter={(value) => {
            const d = new Date(value);
            return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleTimeString();
          }}
          interval="preserveStartEnd"
          minTickGap={40}
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#605E5C' }}
          axisLine={false}
          tickLine={false}
          width={70}
          label={
            names.length === 1 && unitOf(names[0])
              ? {
                  value: unitOf(names[0]),
                  angle: -90,
                  position: 'insideLeft',
                  offset: -5,
                  fill: '#605E5C',
                  fontSize: 11,
                }
              : undefined
          }
        />
        <Tooltip
          contentStyle={{ backgroundColor: '#fff', border: '1px solid #E1E4E8', borderRadius: 4 }}
          labelFormatter={(value) => {
            const d = new Date(value as string);
            return Number.isNaN(d.getTime())
              ? String(value)
              : d.toLocaleString();
          }}
        />
        <Legend layout="horizontal" align="center" verticalAlign="top" />
        {names.map((m, idx) => (
          <Area
            key={m}
            type="monotone"
            dataKey={m}
            name={labelOf(m)}
            stroke={DEFAULT_COLORS[idx % DEFAULT_COLORS.length]}
            fill={DEFAULT_COLORS[idx % DEFAULT_COLORS.length]}
            fillOpacity={0.15}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 3 }}
            isAnimationActive={false}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
};