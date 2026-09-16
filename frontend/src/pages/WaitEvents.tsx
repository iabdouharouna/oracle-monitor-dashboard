import React, { useState } from 'react';
import { Box, Typography, Paper, Grid, Tab } from '@mui/material';
import { TabContext, TabList, TabPanel } from '@mui/lab';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useSystemWaits, useSessionWaits, useIOMetrics, useMetricsHistory } from '../api/hooks/useWaits';
import { WaitClassChart, DataTable, TimeRangeSelector, KPICard } from '../components/common';
import { Speed, TrendingUp, BugReport, Timer } from '@mui/icons-material';

export const WaitEvents: React.FC = () => {
  const [tab, setTab] = useState('0');
  const [timeRange, setTimeRange] = useState('1h');
  const hours = { '5m': 5/60, '15m': 15/60, '1h': 1, '6h': 6, '24h': 24 }[timeRange] || 1;

  const { data: systemWaits, isLoading: swLoading } = useSystemWaits();
  const { data: sessionWaits } = useSessionWaits();
  const { data: ioMetrics } = useIOMetrics();
  const { data: history } = useMetricsHistory(hours);

  const waitClassSummary = (systemWaits || []).reduce<Record<string, { waitClass: string; samples: number; aas: number; pctTotal: number }>>((acc, w) => {
    const key = w.waitClass;
    if (!acc[key]) {
      acc[key] = { waitClass: key, samples: 0, aas: 0, pctTotal: 0 };
    }
    acc[key].samples += w.totalWaits;
    acc[key].aas += w.timeWaitedSec / 3600;
    acc[key].pctTotal += w.pctDBTime;
    return acc;
  }, {});
  const waitClassData = Object.values(waitClassSummary).sort((a, b) => b.pctTotal - a.pctTotal);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight={600}>Wait Events</Typography>
          <Typography variant="body2" color="text.secondary">
            System and session wait event analysis
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
        </Box>
      </Box>

      {/* I/O Metrics */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={6} md={3}>
          <KPICard title="Physical Reads/sec" value={ioMetrics?.physicalReadsPerSec?.toFixed(1) || 0} icon={<Speed />} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KPICard title="Physical Writes/sec" value={ioMetrics?.physicalWritesPerSec?.toFixed(1) || 0} icon={<Speed />} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KPICard title="Read Latency" value={ioMetrics?.avgReadLatencyMs?.toFixed(1) || 0} unit="ms" icon={<Timer />} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KPICard title="Write Latency" value={ioMetrics?.avgWriteLatencyMs?.toFixed(1) || 0} unit="ms" icon={<Timer />} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KPICard title="Redo Gen/sec" value={((ioMetrics?.redoGeneratedPerSec || 0) / 1024 / 1024).toFixed(1)} unit="MB/s" icon={<TrendingUp />} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KPICard title="DB Time/sec" value={ioMetrics?.databaseTimePerSec?.toFixed(1) || 0} icon={<BugReport />} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KPICard title="CPU Usage/sec" value={ioMetrics?.cpuUsagePerSec?.toFixed(1) || 0} icon={<Speed />} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KPICard title="Logons/sec" value={ioMetrics?.logonsPerSec?.toFixed(1) || 0} icon={<BugReport />} />
        </Grid>
      </Grid>

      <TabContext value={tab}>
        <TabList sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }} onChange={(_, v) => setTab(String(v))}>
          <Tab label="System Waits" />
          <Tab label="Session Waits" />
          <Tab label="Historical Trends" />
        </TabList>

        <TabPanel value="0" sx={{ p: 0 }}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={5}>
              <Paper sx={{ p: 2, height: '100%' }}>
                <Typography variant="h6" sx={{ mb: 2 }}>System Wait Events (Top by Time Waited)</Typography>
                <WaitClassChart 
                  data={waitClassData} 
                  height={400} 
                />
              </Paper>
            </Grid>
            <Grid item xs={12} md={7}>
              <Paper sx={{ p: 2, height: '100%' }}>
                <Typography variant="h6" sx={{ mb: 2 }}>Top Wait Events</Typography>
                <DataTable
                  rows={systemWaits?.slice(0, 20).map((w, i) => ({ id: i, ...w })) || []}
                  columns={[
                    { field: 'event', headerName: 'Event', flex: 1, minWidth: 140, renderCell: (p) => p.value.substring(0, 40) },
                    { field: 'waitClass', headerName: 'Class', width: 105 },
                    { field: 'totalWaits', headerName: 'Total Waits', type: 'number', width: 95 },
                    { field: 'timeWaitedSec', headerName: 'Time (s)', type: 'number', width: 85, renderCell: (p) => p.value.toFixed(2) },
                    { field: 'avgWaitMs', headerName: 'Avg (ms)', type: 'number', width: 90, renderCell: (p) => p.value.toFixed(2) },
                    { field: 'pctDBTime', headerName: '% DB Time', type: 'number', width: 90, renderCell: (p) => `${p.value.toFixed(1)}%` },
                  ]}
                  loading={swLoading}
                />
              </Paper>
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value="1" sx={{ p: 0 }}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Current Session Waits</Typography>
            <DataTable
              rows={sessionWaits?.slice(0, 50).map((w, i) => ({ id: i, ...w })) || []}
              columns={[
                { field: 'sid', headerName: 'SID', type: 'number', width: 80 },
                { field: 'serial', headerName: 'Serial#', type: 'number', width: 100 },
                { field: 'username', headerName: 'Username', width: 120 },
                { field: 'event', headerName: 'Event', flex: 1, minWidth: 200 },
                { field: 'waitClass', headerName: 'Class', width: 120 },
                { field: 'state', headerName: 'State', width: 100 },
                { field: 'secondsInWait', headerName: 'Sec in Wait', type: 'number', width: 100 },
                { field: 'p1Text', headerName: 'P1', width: 100, renderCell: (p) => `${p.value}: ${p.row.p1}` },
                { field: 'p2Text', headerName: 'P2', width: 100, renderCell: (p) => `${p.value}: ${p.row.p2}` },
                { field: 'p3Text', headerName: 'P3', width: 100, renderCell: (p) => `${p.value}: ${p.row.p3}` },
              ]}
            />
          </Paper>
        </TabPanel>

        <TabPanel value="2" sx={{ p: 0 }}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Historical Metrics (Last {timeRange})</Typography>
            {history && Object.keys(history).length > 0 ? (
              <Grid container spacing={3}>
                {Object.entries(history).map(([metric, points]) => (
                  <Grid item xs={12} md={6} key={metric}>
                    <Box sx={{ height: 250 }}>
                      <Typography variant="subtitle2" sx={{ mb: 1 }}>{metric}</Typography>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={points as unknown as Array<Record<string, unknown>> } margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#E1E4E8" />
                          <XAxis dataKey="timestamp" tick={{ fontSize: 10 }} tickFormatter={v => new Date(v).toLocaleTimeString()} />
                          <YAxis tick={{ fontSize: 10 }} />
                          <Tooltip />
                          <Line type="monotone" dataKey="value" stroke="#0066CC" strokeWidth={2} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            ) : (
              <Typography color="text.secondary" textAlign="center" sx={{ py: 4 }}>
                No historical data available
              </Typography>
            )}
          </Paper>
        </TabPanel>
      </TabContext>
    </Box>
  );
};