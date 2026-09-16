import React from 'react';
import { Grid } from '@mui/material';
import { GaugeChart } from '../common/GaugeChart';
import type { TablespaceInfo } from '../../types/api';

interface TablespaceGaugesProps {
  tablespaces: TablespaceInfo[];
  onClick?: (ts: TablespaceInfo) => void;
}

export const TablespaceGauges: React.FC<TablespaceGaugesProps> = ({ 
  tablespaces, 
  onClick 
}) => {
  const permTablespaces = tablespaces.filter(t => t.type !== 'TEMPORARY');

  return (
    <Grid container spacing={2}>
      {permTablespaces.map((ts) => (
        <Grid item xs={12} sm={6} md={4} lg={3} key={ts.name}>
          <GaugeChart
            value={ts.pctUsed}
            label={ts.name}
            unit="%"
            thresholds={{ warn: 80, crit: 90 }}
            size={140}
            onClick={() => onClick?.(ts)}
            sx={{ cursor: onClick ? 'pointer' : 'default' }}
          />
        </Grid>
      ))}
    </Grid>
  );
};