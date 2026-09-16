import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { WAIT_CLASS_COLORS } from './waitClassColors';

interface WaitClassChartProps {
  data: Array<{ waitClass: string; samples: number; aas: number; pctTotal: number }>;
  height?: number;
}

export const WaitClassChart: React.FC<WaitClassChartProps> = ({ 
  data, 
  height = 300 
}) => {
  if (!data.length) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#605E5C' }}>
        No wait data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          cx="42%"
          cy="50%"
          innerRadius={60}
          outerRadius={90}
          paddingAngle={2}
          dataKey="samples"
          nameKey="waitClass"
          isAnimationActive={true}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={WAIT_CLASS_COLORS[entry.waitClass] || '#9CA3AF'} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: number, name: string) => [value.toLocaleString(), name]}
          contentStyle={{ backgroundColor: '#fff', border: '1px solid #E1E4E8', borderRadius: 4 }}
        />
        <Legend
          layout="vertical"
          verticalAlign="middle"
          align="right"
          iconType="circle"
          wrapperStyle={{ paddingLeft: 8 }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
};