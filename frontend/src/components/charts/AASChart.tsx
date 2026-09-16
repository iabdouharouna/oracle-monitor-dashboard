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
import type { AASDataPoint } from '../../types/api';
import { WAIT_CLASS_COLORS, gradientId } from './waitClassColors';

interface AASChartProps {
  data: AASDataPoint[];
  height?: number;
  selectedWaitClasses?: string[];
  onSelectionChange?: (classes: string[]) => void;
}

export const AASChart: React.FC<AASChartProps> = ({
  data,
  height = 300,
  selectedWaitClasses,
  onSelectionChange,
}) => {
  if (!data.length) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#605E5C' }}>
        No ASH data available for the selected period
      </div>
    );
  }

  const waitClasses = Array.from(new Set(data.map((d) => d.waitClass))).filter(
    (c) => c !== 'Idle'
  );
  
  const chartData = data.reduce((acc, point) => {
    const existing = acc.find((d) => d.timestamp === point.timestamp);
    if (existing) {
      existing[point.waitClass] = point.aas;
    } else {
      acc.push({ timestamp: point.timestamp, [point.waitClass]: point.aas });
    }
    return acc;
  }, [] as Record<string, any>[]);

  const handleLegendClick = (data: { value?: string | number }) => {
    if (!onSelectionChange || data.value === undefined) return;
    const waitClass = String(data.value);
    const newSelection = selectedWaitClasses?.includes(waitClass)
      ? selectedWaitClasses.filter((c) => c !== waitClass)
      : [...(selectedWaitClasses || []), waitClass];
    onSelectionChange(newSelection);
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
        <defs>
          {waitClasses.map((wc) => (
            <linearGradient key={wc} id={gradientId(wc)} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={WAIT_CLASS_COLORS[wc] || '#9CA3AF'} stopOpacity={0.3} />
              <stop offset="95%" stopColor={WAIT_CLASS_COLORS[wc] || '#9CA3AF'} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#E1E4E8" vertical={false} />
        <XAxis
          dataKey="timestamp"
          tickFormatter={(value) => new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          tick={{ fontSize: 11, fill: '#605E5C' }}
          axisLine={{ stroke: '#E1E4E8' }}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#605E5C' }}
          axisLine={false}
          tickLine={false}
          label={{ value: 'Avg Active Sessions', angle: -90, position: 'insideLeft', offset: -10, fill: '#605E5C', fontSize: 11 }}
        />
        <Tooltip
          contentStyle={{ backgroundColor: '#fff', border: '1px solid #E1E4E8', borderRadius: 4, boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
          labelFormatter={(value) => new Date(value).toLocaleString()}
          formatter={(value: number, name: string) => [value.toFixed(2), name]}
        />
        <Legend
          layout="horizontal"
          align="center"
          verticalAlign="top"
          iconType="circle"
          wrapperStyle={{ paddingTop: 10 }}
          onClick={handleLegendClick}
        />
        {waitClasses.map((wc) => (
          <Area
            key={wc}
            type="monotone"
            dataKey={wc}
            name={wc}
            stroke={WAIT_CLASS_COLORS[wc] || '#9CA3AF'}
            fillOpacity={selectedWaitClasses?.includes(wc) !== false ? 1 : 0.1}
            fill={`url(#${gradientId(wc)})`}
            strokeWidth={2}
            isAnimationActive={false}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
};