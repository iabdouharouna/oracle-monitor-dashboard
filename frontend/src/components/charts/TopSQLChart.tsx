import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface TopSQLChartProps {
  data: Array<{ 
    sqlId: string; 
    sqlText: string; 
    cpuTimeSec: number; 
    elapsedTimeSec: number;
    executions: number;
  }>;
  height?: number;
  metric?: 'cpuTimeSec' | 'elapsedTimeSec' | 'executions' | 'bufferGets';
}

export const TopSQLChart: React.FC<TopSQLChartProps> = ({ 
  data, 
  height = 300,
  metric = 'cpuTimeSec'
}) => {
  if (!data.length) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#605E5C' }}>
        No SQL data available
      </div>
    );
  }

  const metricLabels: Record<string, string> = {
    cpuTimeSec: 'CPU Time (s)',
    elapsedTimeSec: 'Elapsed Time (s)',
    executions: 'Executions',
    bufferGets: 'Buffer Gets',
  };

  const chartData = data
    .slice(0, 10)
    .map((d, i) => ({
      ...d,
      label: `${d.sqlId.substring(0, 8)}...`,
      value: d[metric],
    }))
    .reverse();

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={chartData} layout="vertical" margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E1E4E8" horizontal={false} />
        <XAxis
          type="number"
          tick={{ fontSize: 11, fill: '#605E5C' }}
          axisLine={{ stroke: '#E1E4E8' }}
          tickLine={false}
          label={{ value: metricLabels[metric], position: 'insideTop', offset: -20, fill: '#605E5C', fontSize: 11 }}
        />
        <YAxis
          type="category"
          dataKey="label"
          width={120}
          tick={{ fontSize: 11, fill: '#605E5C' }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{ backgroundColor: '#fff', border: '1px solid #E1E4E8', borderRadius: 4 }}
          formatter={(value: number) => [value.toFixed(2), metricLabels[metric]]}
          labelFormatter={(label) => {
            const item = data.find(d => `${d.sqlId.substring(0, 8)}...` === label);
            return item ? item.sqlText.substring(0, 100) : label;
          }}
        />
        <Bar
          dataKey="value"
          name={metricLabels[metric]}
          radius={[0, 4, 4, 0]}
          maxBarSize={30}
        >
          {chartData.map((_, index) => (
            <Cell key={`cell-${index}`} fill={`hsl(210, 70%, ${45 + index * 3}%)`} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};