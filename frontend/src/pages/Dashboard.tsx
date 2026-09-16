import React from 'react';
import { Grid, Box, Typography, Paper, Chip, Alert, AlertTitle } from '@mui/material';
import { useQueryClient } from '@tanstack/react-query';
import { useOverview } from '../api/hooks/useOverview';
import { useASHAAS, useASHWaitClasses } from '../api/hooks/usePerformance';
import { useCPURatio, useTopSQL } from '../api/hooks/useInstance';
import { useTablespaces } from '../api/hooks/useStorage';
import { KPICard, GaugeChart, RefreshControl, ErrorDisplay } from '../components/common';
import { AASChart, WaitClassChart, TopSQLChart, CPURatioChart } from '../components/charts';
import { Storage, Speed, Memory, Dns as Database } from '@mui/icons-material';
import { format } from 'date-fns';

export const Dashboard: React.FC = () => {
  const hours = 1;
  const queryClient = useQueryClient();
  const { data, isLoading, error, refetch } = useOverview();
  const { data: aasData } = useASHAAS(hours);
  const { data: waitClasses } = useASHWaitClasses(hours);
  const { data: cpuRatio } = useCPURatio();
  const { data: topSql } = useTopSQL(5);
  const { data: tablespaces } = useTablespaces();

  const handleRefresh = () => {
    refetch();
    queryClient.refetchQueries({ type: 'active' });
  };

  if (isLoading && !data) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <KPICard title="Loading..." value="—" />
        <KPICard title="Loading..." value="—" />
        <KPICard title="Loading..." value="—" />
        <KPICard title="Loading..." value="—" />
      </Box>
    );
  }

  if (error) {
    return <ErrorDisplay error={error} onRetry={handleRefresh} />;
  }

  const db = data?.database;
  const storage = data?.storage;
  const sessions = data?.sessions;
  const io = data?.io;
  const alerts = data?.alerts;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Header with refresh */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight={600}>Dashboard Overview</Typography>
          <Typography variant="body2" color="text.secondary">
            {db?.name} • {db?.status} • Last updated: {data?.timestamp ? format(new Date(data.timestamp), 'HH:mm:ss') : format(new Date(), 'HH:mm:ss')}
          </Typography>
        </Box>
        <RefreshControl onManualRefresh={handleRefresh} />
      </Box>

      {/* Alert banner */}
      {(alerts?.critical || alerts?.warning) && (
        <Alert severity={alerts.critical ? 'error' : 'warning'} sx={{ mb: 2 }}>
          <AlertTitle>{alerts.critical ? 'Critical' : 'Warning'} Alerts Detected</AlertTitle>
          {alerts.critical} critical, {alerts.warning} warning
        </Alert>
      )}

      {/* KPI Cards */}
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={3}>
          <KPICard
            title="Database Status"
            value={db?.status || 'UNKNOWN'}
            icon={<Database />}
            color={db?.status === 'OPEN' ? 'success' : 'warning'}
            subtext={`Uptime: ${Math.floor((db?.uptimeSeconds || 0) / 3600)}h`}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KPICard
            title="Storage Used"
            value={storage?.pctUsed?.toFixed(1) || 0}
            unit="%"
            icon={<Storage />}
            color={storage && storage.pctUsed >= 90 ? 'error' : storage && storage.pctUsed >= 80 ? 'warning' : 'success'}
            subtext={`${storage?.usedGB || 0}GB / ${storage?.totalGB || 0}GB`}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KPICard
            title="Active Sessions"
            value={sessions?.active || 0}
            unit={` / ${sessions?.total || 0}`}
            icon={<Speed />}
            color={sessions && sessions.pctActive >= 85 ? 'error' : sessions && sessions.pctActive >= 70 ? 'warning' : 'success'}
            subtext={`${sessions?.pctActive || 0}% active`}
          />
        </Grid>
        {/* DB CPU card now uses real cpuRatio */}
        <Grid item xs={12} sm={6} md={3}>
          <KPICard
            title="DB CPU"
            value={cpuRatio?.dbCpuPct?.toFixed(1) ?? '—'}
            unit="%"
            icon={<Memory />}
            color={cpuRatio && cpuRatio.dbCpuPct >= 90 ? 'error' : cpuRatio && cpuRatio.dbCpuPct >= 80 ? 'warning' : 'primary'}
            subtext={`${cpuRatio?.osCpuPct?.toFixed(1) || 0}% OS CPU`}
          />
        </Grid>
      </Grid>

      {/* Main Charts */}
      <Grid container spacing={3}>
        {/* ASH Chart */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Average Active Sessions (ASH)</Typography>
            </Box>
            <AASChart data={aasData || []} height={300} />
          </Paper>
        </Grid>

        {/* Wait Classes */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Top Wait Classes</Typography>
            </Box>
            <WaitClassChart data={waitClasses || []} height={300} />
          </Paper>
        </Grid>

        {/* Top SQL */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Top SQL by CPU</Typography>
            </Box>
            <TopSQLChart data={topSql || []} height={300} />
          </Paper>
        </Grid>

        {/* CPU Ratio */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">CPU Utilization</Typography>
            </Box>
            <CPURatioChart dbCpuPct={cpuRatio?.dbCpuPct || 0} osCpuPct={cpuRatio?.osCpuPct || 0} dbTimePerSec={cpuRatio?.dbTimePerSec || 0} height={300} />
          </Paper>
        </Grid>

        {/* Storage Gauges */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Tablespace Usage</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              {tablespaces
              ?.filter(t => t.type !== 'TEMPORARY')
              .map(ts => (
                <GaugeChart
                  key={ts.name}
                  value={ts.pctUsed}
                  label={ts.name}
                  size={150}
                />
              ))}
            </Box>
          </Paper>
        </Grid>

        {/* I/O Summary */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>I/O Performance</Typography>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <KPICard title="Read" value={io?.readMBps?.toFixed(1) || 0} unit="MB/s" icon={<Speed />} />
              </Grid>
              <Grid item xs={6}>
                <KPICard title="Write" value={io?.writeMBps?.toFixed(1) || 0} unit="MB/s" icon={<Speed />} />
              </Grid>
              <Grid item xs={6}>
                <KPICard title="Read Latency" value={io?.avgReadLatencyMs?.toFixed(1) || 0} unit="ms" icon={<Speed />} />
              </Grid>
              <Grid item xs={6}>
                <KPICard title="Write Latency" value={io?.avgWriteLatencyMs?.toFixed(1) || 0} unit="ms" icon={<Speed />} />
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Quick Stats */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Quick Stats</Typography>
            <Grid container spacing={1}>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">Version</Typography>
                <Typography variant="body1" fontWeight={500}>{db?.version}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">Platform</Typography>
                <Typography variant="body1" fontWeight={500}>{db?.platform}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">Host</Typography>
                <Typography variant="body1" fontWeight={500}>{db?.host}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">Role</Typography>
                <Box>
                  <Chip label={db?.role} size="small" color={db?.role === 'PRIMARY' ? 'success' : 'default'} />
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">Blocked Sessions</Typography>
                <Typography variant="body1" fontWeight={500} color={sessions?.blocked ? 'error' : 'success'}>
                  {sessions?.blocked || 0}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">Critical Tablespaces</Typography>
                <Typography variant="body1" fontWeight={500} color={storage?.criticalTablespaces ? 'error' : 'success'}>
                  {storage?.criticalTablespaces || 0}
                </Typography>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};