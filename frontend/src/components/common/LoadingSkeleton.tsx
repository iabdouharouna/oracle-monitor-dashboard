import React from 'react';
import { Skeleton, Box, Grid } from '@mui/material';

export const LoadingSkeleton: React.FC<{ variant?: 'card' | 'table' | 'chart' }> = ({ 
  variant = 'card' 
}) => {
  if (variant === 'card') {
    return (
      <Box sx={{ p: 2 }}>
        <Skeleton variant="rectangular" width="60%" height={24} sx={{ mb: 1 }} />
        <Skeleton variant="rectangular" width="40%" height={32} sx={{ mb: 1 }} />
        <Skeleton variant="rectangular" width="30%" height={16} />
      </Box>
    );
  }
  if (variant === 'table') {
    return (
      <Box sx={{ p: 2 }}>
        {[...Array(5)].map((_, i) => (
          <Box key={i} sx={{ display: 'flex', gap: 2, mb: 1 }}>
            <Skeleton variant="rectangular" width="15%" height={20} />
            <Skeleton variant="rectangular" width="20%" height={20} />
            <Skeleton variant="rectangular" width="25%" height={20} />
            <Skeleton variant="rectangular" width="15%" height={20} />
            <Skeleton variant="rectangular" width="15%" height={20} />
          </Box>
        ))}
      </Box>
    );
  }
  return (
    <Box sx={{ height: 300, p: 2 }}>
      <Skeleton variant="rectangular" width="100%" height="100%" />
    </Box>
  );
};

export const KPISkeleton: React.FC = () => (
  <Grid container spacing={2}>
    {[1, 2, 3, 4].map((i) => (
      <Grid item xs={12} sm={6} md={3} key={i}>
        <LoadingSkeleton variant="card" />
      </Grid>
    ))}
  </Grid>
);

export const TableSkeleton: React.FC = () => (
  <LoadingSkeleton variant="table" />
);

export const ChartSkeleton: React.FC = () => (
  <LoadingSkeleton variant="chart" />
);