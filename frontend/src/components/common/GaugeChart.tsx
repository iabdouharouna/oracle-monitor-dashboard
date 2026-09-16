import React from 'react';
import { PieChart, Pie, Cell, Tooltip } from 'recharts';

interface GaugeChartProps {
  value: number;
  label: string;
  unit?: string;
  thresholds?: { warn: number; crit: number };
  size?: number;
  showLegend?: boolean;
  onClick?: () => void;
  sx?: React.CSSProperties;
}

const COLORS = {
  normal: '#00A651',
  warning: '#FF8C00',
  critical: '#D13438',
};

export const GaugeChart: React.FC<GaugeChartProps> = ({
  value,
  label,
  unit = '%',
  thresholds = { warn: 80, crit: 90 },
  size = 120,
  showLegend = false,
  onClick,
  sx,
}) => {
  const getColor = (v: number) => {
    if (v >= thresholds.crit) return COLORS.critical;
    if (v >= thresholds.warn) return COLORS.warning;
    return COLORS.normal;
  };

  const color = getColor(value);
  const normalizedValue = Math.min(100, Math.max(0, value));

  const pieData = [
    { name: 'Used', value: normalizedValue / 2 },
    { name: 'Free', value: (100 - normalizedValue) / 2 },
    { name: 'Hidden', value: 50 },
  ];

  const COLORS_PIE = [color, '#E1E4E8', 'transparent'];

  return (
    <div
      style={{
        width: size,
        height: size * 0.6,
        position: 'relative',
        cursor: onClick ? 'pointer' : undefined,
        ...sx,
      }}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
    >
      <PieChart width={size} height={size * 0.6}>
        <Pie
          data={pieData}
          cx={size / 2}
          cy={size * 0.6}
          innerRadius={size * 0.35}
          outerRadius={size * 0.45}
          startAngle={180}
          endAngle={360}
          paddingAngle={2}
          dataKey="value"
        >
          {pieData.map((_, index) => (
            <Cell key={`cell-${index}`} fill={COLORS_PIE[index]} />
          ))}
        </Pie>
        <Tooltip
          content={<CustomTooltip value={value} unit={unit} />}
        />
      </PieChart>
      
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -20%)',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: size * 0.18, fontWeight: 600, color: color }}>
          {value.toFixed(1)}{unit}
        </div>
        <div style={{ fontSize: size * 0.09, color: '#605E5C', marginTop: 2 }}>
          {label}
        </div>
      </div>

      {showLegend && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 8 }}>
          <LegendItem color={COLORS.normal} label={`< ${thresholds.warn}%`} />
          <LegendItem color={COLORS.warning} label={`${thresholds.warn}-${thresholds.crit}%`} />
          <LegendItem color={COLORS.critical} label={`> ${thresholds.crit}%`} />
        </div>
      )}
    </div>
  );
};

const LegendItem: React.FC<{ color: string; label: string }> = ({ color, label }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#605E5C' }}>
    <span style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: color }} />
    {label}
  </div>
);

const CustomTooltip: React.FC<{ value: number; unit: string }> = ({ value, unit }) => (
  <div style={{ padding: '8px 12px', background: '#fff', border: '1px solid #E1E4E8', borderRadius: 4 }}>
    <p style={{ margin: 0, fontWeight: 600 }}>{value.toFixed(1)}{unit}</p>
  </div>
);