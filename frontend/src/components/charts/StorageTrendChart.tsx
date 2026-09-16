import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
} from 'recharts';

interface StorageTrendChartProps {
  data: Array<{ date: string; usedMB: number; allocatedMB: number }>;
  tablespaceName: string;
  warnThreshold?: number;
  critThreshold?: number;
  maxSize?: number;
  height?: number;
}

export const StorageTrendChart: React.FC<StorageTrendChartProps> = ({ 
  data, 
  tablespaceName,
  warnThreshold,
  critThreshold,
  maxSize,
  height = 300 
}) => {
  if (!data.length) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#605E5C' }}>
        No growth data available for {tablespaceName}
      </div>
    );
  }

  const chartData = data.map(d => ({
    date: new Date(d.date).toLocaleDateString(),
    used: d.usedMB,
    allocated: d.allocatedMB,
    warn: warnThreshold,
    crit: critThreshold,
    max: maxSize,
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E1E4E8" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: '#605E5C' }}
          axisLine={{ stroke: '#E1E4E8' }}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#605E5C' }}
          axisLine={false}
          tickLine={false}
          label={{ value: 'MB', angle: -90, position: 'insideLeft', offset: -10, fill: '#605E5C', fontSize: 11 }}
        />
        <Tooltip
          contentStyle={{ backgroundColor: '#fff', border: '1px solid #E1E4E8', borderRadius: 4 }}
          labelFormatter={(value) => value}
        />
        <Legend layout="horizontal" align="center" verticalAlign="top" />
        {warnThreshold && (
          <Line
            type="monotone"
            dataKey="warn"
            stroke="#FF8C00"
            strokeDasharray="5 5"
            strokeWidth={1}
            dot={false}
            name="Warning"
            isAnimationActive={false}
          />
        )}
        {critThreshold && (
          <Line
            type="monotone"
            dataKey="crit"
            stroke="#D13438"
            strokeDasharray="5 5"
            strokeWidth={1}
            dot={false}
            name="Critical"
            isAnimationActive={false}
          />
        )}
        {maxSize && (
          <Line
            type="monotone"
            dataKey="max"
            stroke="#9CA3AF"
            strokeDasharray="5 5"
            strokeWidth={1}
            dot={false}
            name="Max Size"
            isAnimationActive={false}
          />
        )}
        <Area
          type="monotone"
          dataKey="allocated"
          name="Allocated"
          stroke="#9CA3AF"
          fill="#F5F5F5"
          fillOpacity={0.5}
          strokeWidth={1}
          dot={false}
          isAnimationActive={false}
        />
        <Line
          type="monotone"
          dataKey="used"
          name="Used"
          stroke="#0066CC"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};