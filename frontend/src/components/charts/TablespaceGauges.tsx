import React, { useState } from 'react';
import { Grid, Box, Button } from '@mui/material';
import { GaugeChart } from '../common/GaugeChart';
import type { TablespaceInfo } from '../../types/api';

interface TablespaceGaugesProps {
  tablespaces: TablespaceInfo[];
  onClick?: (ts: TablespaceInfo) => void;
  /** Number of gauges shown before the "show all" toggle (default 12). */
  initialCount?: number;
}

const fmtPct = (v: number) => (v > 0 && v < 0.1 ? '<0.1' : v.toFixed(1));

export const TablespaceGauges: React.FC<TablespaceGaugesProps> = ({
  tablespaces,
  onClick,
  initialCount = 12,
}) => {
  const [showAll, setShowAll] = useState(false);

  const sorted = tablespaces
    .filter((t) => t.type !== 'TEMPORARY')
    .slice()
    .sort((a, b) => b.pctUsed - a.pctUsed);

  const visible = showAll ? sorted : sorted.slice(0, initialCount);

  return (
    <Box>
      <Grid container spacing={2}>
        {visible.map((ts) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={ts.name}>
            <GaugeChart
              value={ts.pctUsed}
              colorValue={ts.pctUsedMax}
              label={ts.name}
              subLabel={`vs max ${fmtPct(ts.pctUsedMax)}%`}
              unit="%"
              thresholds={{ warn: 80, crit: 90 }}
              size={140}
              onClick={() => onClick?.(ts)}
              sx={{ cursor: onClick ? 'pointer' : 'default' }}
            />
          </Grid>
        ))}
      </Grid>
      {sorted.length > initialCount && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <Button size="small" onClick={() => setShowAll((v) => !v)}>
            {showAll ? 'Show less' : `Show all (${sorted.length})`}
          </Button>
        </Box>
      )}
    </Box>
  );
};
