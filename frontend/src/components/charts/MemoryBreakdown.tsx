import React from 'react';
import { Treemap, Tooltip, ResponsiveContainer } from 'recharts';

interface MemoryBreakdownProps {
  sga: {
    bufferCacheMB: number;
    sharedPoolMB: number;
    largePoolMB: number;
    javaPoolMB: number;
    streamsPoolMB: number;
    redoLogBufferMB: number;
  };
  pga: {
    totalAllocatedMB: number;
    totalUsedMB: number;
  };
}

const POOL_COLORS: Record<string, string> = {
  'Buffer Cache': '#0066CC',
  'Shared Pool': '#00A651',
  'Large Pool': '#FF8C00',
  'Java Pool': '#8B5CF6',
  'Streams Pool': '#EC4899',
  'Redo Log Buffer': '#F59E0B',
  'PGA Allocated': '#6B7280',
  'PGA Used': '#06B6D4',
};

interface TileProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  name?: string;
  value?: number;
  total?: number;
}

const TreemapContent: React.FC<TileProps> = ({ x, y, width, height, name, value, total }) => {
  if (x === undefined || y === undefined || !width || !height) return null;
  if (width < 40 || height < 20) return null;
  const pct = ((value || 0) / (total || 1) * 100).toFixed(1);
  const color = POOL_COLORS[name || ''] || '#888';
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={color}
        stroke="#fff"
        strokeWidth={2}
      />
      <text
        x={x + width / 2}
        y={y + height / 2}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#fff"
        fontSize={12}
        fontWeight={600}
        pointerEvents="none"
      >
        {name}
      </text>
      <text
        x={x + width / 2}
        y={y + height / 2 + 16}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#fff"
        fontSize={10}
        opacity={0.9}
        pointerEvents="none"
      >
        {(value || 0).toFixed(1)} MB ({pct}%)
      </text>
    </g>
  );
};

export const MemoryBreakdown: React.FC<MemoryBreakdownProps> = ({ sga, pga }) => {
  const data = [
    { name: 'Buffer Cache', value: sga.bufferCacheMB, group: 'SGA' },
    { name: 'Shared Pool', value: sga.sharedPoolMB, group: 'SGA' },
    { name: 'Large Pool', value: sga.largePoolMB, group: 'SGA' },
    { name: 'Java Pool', value: sga.javaPoolMB, group: 'SGA' },
    { name: 'Streams Pool', value: sga.streamsPoolMB, group: 'SGA' },
    { name: 'Redo Log Buffer', value: sga.redoLogBufferMB, group: 'SGA' },
    { name: 'PGA Allocated', value: pga.totalAllocatedMB, group: 'PGA' },
    { name: 'PGA Used', value: pga.totalUsedMB, group: 'PGA' },
  ].filter((d) => d.value > 0);

  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <ResponsiveContainer width="100%" height={350}>
      <Treemap
        data={data}
        dataKey="value"
        ratio={0.6 * (1 + Math.sqrt(5)) / 2}
        stroke="#fff"
        strokeWidth={2}
        fill="#888"
        content={<TreemapContent total={total} />}
      >
        <Tooltip
          formatter={(value: number | string, name: string) =>
            [`${Number(value).toFixed(2)}`, 'MB']
          }
          contentStyle={{ backgroundColor: '#fff', border: '1px solid #E1E4E8', borderRadius: 4 }}
        />
      </Treemap>
    </ResponsiveContainer>
  );
};