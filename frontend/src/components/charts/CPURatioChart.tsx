import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

interface CPURatioChartProps {
  dbCpuPct: number;
  osCpuPct: number;
  dbTimePerSec: number;
  height?: number;
}

export const CPURatioChart: React.FC<CPURatioChartProps> = ({ 
  dbCpuPct, 
  osCpuPct, 
  dbTimePerSec,
  height = 200 
}) => {
  const data = [
    { name: 'DB CPU %', value: dbCpuPct, color: '#0066CC' },
    { name: 'OS CPU %', value: osCpuPct, color: '#00A651' },
    { name: 'DB Time/sec', value: Math.min(dbTimePerSec * 10, 100), color: '#FF8C00' },
  ];

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E1E4E8" horizontal={false} />
        <XAxis
          type="number"
          domain={[0, 100]}
          tick={{ fontSize: 11, fill: '#605E5C' }}
          axisLine={{ stroke: '#E1E4E8' }}
          tickLine={false}
          label={{ value: 'Percentage / Scaled', position: 'insideTop', offset: -20, fill: '#605E5C', fontSize: 11 }}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={100}
          tick={{ fontSize: 11, fill: '#605E5C' }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{ backgroundColor: '#fff', border: '1px solid #E1E4E8', borderRadius: 4 }}
          formatter={(value: number, name: string) => [value.toFixed(1), name]}
        />
        <Legend layout="horizontal" align="center" verticalAlign="top" />
        <Bar
          dataKey="value"
          radius={[0, 4, 4, 0]}
          maxBarSize={30}
        >
          {data.map((_, index) => (
            <Cell key={`cell-${index}`} fill={data[index].color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};