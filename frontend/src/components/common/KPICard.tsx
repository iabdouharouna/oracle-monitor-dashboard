import React from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';

interface KPICardProps {
  title: string;
  value?: string | number | null;
  unit?: string;
  trend?: number;
  trendLabel?: string;
  color?: 'primary' | 'success' | 'warning' | 'error' | 'info';
  icon?: React.ReactNode;
  subtext?: string;
}

export const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  unit = '',
  trend,
  trendLabel,
  icon,
  subtext,
}) => {
  const trendColor = trend !== undefined 
    ? (trend >= 0 ? 'success' : 'error') 
    : 'default';

  return (
    <Card sx={{ height: '100%', transition: 'box-shadow 0.2s', '&:hover': { boxShadow: 3 } }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
            {title}
          </Typography>
          {icon && <Box sx={{ color: 'text.disabled' }}>{icon}</Box>}
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 0.5 }}>
          <Typography variant="h4" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
            {value}
          </Typography>
          {unit && <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{unit}</Typography>}
        </Box>
        {(trend !== undefined || subtext) && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
            {trend !== undefined && (
              <Typography 
                variant="caption" 
                color={trendColor}
                sx={{ display: 'flex', alignItems: 'center', gap: 0.3, fontWeight: 500 }}
              >
                {trend >= 0 ? '↑' : '↓'} {Math.abs(trend).toFixed(1)}%
                {trendLabel && <Typography component="span" variant="caption" sx={{ color: 'text.secondary', fontWeight: 400 }}>{trendLabel}</Typography>}
              </Typography>
            )}
            {subtext && (
              <Typography variant="caption" color="text.secondary">
                {subtext}
              </Typography>
            )}
          </Box>
        )}
      </CardContent>
    </Card>
  );
};