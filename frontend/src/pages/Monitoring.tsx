import React, { useState } from 'react';
import { Box, Typography, Paper, Chip } from '@mui/material';
import { useMetricsSeries, useAvailableMetrics } from '../api/hooks/useMetrics';
import { useAlertHistory } from '../api/hooks/useAlerts';
import { MetricsTrendChart } from '../components/charts';
import { TimeRangeSelector, LoadingSkeleton, ErrorDisplay } from '../components/common';
import { format } from 'date-fns';

const METRIC_GROUPS: Record<string, { label: string; metrics: string[]; units: Record<string, string> }> = {
  database: {
    label: 'Database (Oracle)',
    metrics: [
      'db_cpu_pct',
      'db_sessions_total',
      'db_sessions_active',
      'db_storage_pct',
      'db_io_read_mbps',
      'db_io_write_mbps',
    ],
    units: {
      db_cpu_pct: '%',
      db_sessions_total: 'sessions',
      db_sessions_active: 'sessions',
      db_storage_pct: '%',
      db_io_read_mbps: 'MB/s',
      db_io_write_mbps: 'MB/s',
    },
  },
  api: {
    label: 'API (backend)',
    metrics: ['api_requests_total', 'api_latency_avg_ms', 'api_errors_total'],
    units: {
      api_requests_total: 'req',
      api_latency_avg_ms: 'ms',
      api_errors_total: 'errors',
    },
  },
  infra: {
    label: 'Infrastructure (host)',
    metrics: [
      'host_cpu_pct',
      'host_ram_pct',
      'host_ram_used_mb',
      'host_disk_pct',
    ],
    units: {
      host_cpu_pct: '%',
      host_ram_pct: '%',
      host_ram_used_mb: 'MB',
      host_disk_pct: '%',
    },
  },
};

export const Monitoring: React.FC = () => {
  const [timeRange, setTimeRange] = useState('24h');
  const hours = { '5m': 5 / 60, '15m': 15 / 60, '1h': 1, '6h': 6, '24h': 24, '7d': 168 }[timeRange] || 24;

  const { data: available } = useAvailableMetrics();
  const metricNames = Array.from(new Set(Object.values(METRIC_GROUPS).flatMap((g) => g.metrics)));
  const { data: history, isLoading, isError, error } = useMetricsSeries(metricNames, hours, 60);
  const { data: alertHistory } = useAlertHistory(50);

  if (isLoading && !history) {
    return <LoadingSkeleton variant="table" />;
  }

  if (isError) {
    return <ErrorDisplay error={error instanceof Error ? error.message : 'Failed to load metrics'} />;
  }

  const dataTooNew = !available || available.length === 0;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight={600}>Monitoring</Typography>
          <Typography variant="body2" color="text.secondary">
            DB, API and host metric history (replaces Prometheus/Grafana)
          </Typography>
        </Box>
        <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
      </Box>

      {dataTooNew && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Metrics are collected periodically (every ~30 s). First points will appear automatically
            with the next collection.
          </Typography>
        </Paper>
      )}

      {Object.entries(METRIC_GROUPS).map(([key, group]) => (
        <Paper key={key} sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>{group.label}</Typography>
          <MetricsTrendChart
            series={history?.metrics || {}}
            metricNames={group.metrics}
            units={group.units}
            height={300}
          />
        </Paper>
      ))}

      <Paper sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Alert history</Typography>
        </Box>
        {alertHistory && alertHistory.length > 0 ? (
          <Box component="ul" sx={{ listStyle: 'none', p: 0, m: 0 }}>
            {alertHistory.map((alert) => (
              <Box component="li" key={alert.id} sx={{ py: 1, borderBottom: '1px solid #E1E4E8' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <Chip
                    label={alert.severity}
                    size="small"
                    color={alert.severity === 'CRITICAL' ? 'error' : 'warning'}
                  />
                  <Typography variant="body2" color="text.secondary">{alert.metric}</Typography>
                </Box>
                <Typography variant="body2" color="text.primary">{alert.message}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {format(new Date(alert.timestamp), 'dd/MM/yyyy HH:mm:ss')} · value {alert.value} / threshold {alert.threshold}
                </Typography>
              </Box>
            ))}
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary">No triggered alerts recorded.</Typography>
        )}
      </Paper>
    </Box>
  );
};