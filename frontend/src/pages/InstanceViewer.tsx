import React, { useState } from 'react';
import { Tab, Box, Typography, Paper, Grid } from '@mui/material';
import { TabContext, TabList, TabPanel } from '@mui/lab';
import { useAllInstanceData } from '../api/hooks/useInstance';
import { KPICard, DataTable, LoadingSkeleton } from '../components/common';
import { MemoryBreakdown, CPURatioChart } from '../components/charts';
import { Dns as Database, People, Memory, Storage, Speed as SpeedIcon, Code, CheckCircle } from '@mui/icons-material';

export const InstanceViewer: React.FC = () => {
  const [tab, setTab] = useState('0');
  const { data, isLoading, error } = useAllInstanceData();

  if (isLoading && !data) {
    return <LoadingSkeleton variant="card" />;
  }

  if (error) {
    return <Box sx={{ p: 2, color: 'error.main' }}>Error loading instance data: {error.message}</Box>;
  }

  const db = data?.database;
  const clients = data?.clients || [];
  const processes = data?.processes;
  const memory = data?.memory;
  const storage = data?.storage;
  const cpu = data?.cpuRatio;
  const topSQL = data?.topSql || [];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" fontWeight={600}>Instance Viewer</Typography>
        <Typography variant="body2" color="text.secondary">
          {db?.name} • {db?.host} • {db?.status}
        </Typography>
      </Box>

      <TabContext value={tab}>
        <TabList sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }} onChange={(_, v) => setTab(String(v))}>
          <Tab label="Database" icon={<Database />} />
          <Tab label="Clients" icon={<People />} />
          <Tab label="Processes" icon={<SpeedIcon />} />
          <Tab label="Memory" icon={<Memory />} />
          <Tab label="Storage" icon={<Storage />} />
          <Tab label="CPU Ratio" icon={<SpeedIcon />} />
          <Tab label="Top SQL" icon={<Code />} />
        </TabList>

        {/* Database Tab */}
        <TabPanel value="0" sx={{ p: 0 }}>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={3}>
              <KPICard title="Database Name" value={db?.name} icon={<Database />} />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <KPICard title="Version" value={db?.version} icon={<Code />} />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <KPICard title="Status" value={db?.status} icon={<Database />} color={db?.status === 'OPEN' ? 'success' : 'warning'} />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <KPICard title="Role" value={db?.role} icon={<People />} />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <KPICard title="Host" value={db?.host} icon={<Database />} />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <KPICard title="Platform" value={db?.platform} icon={<SpeedIcon />} />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <KPICard title="Startup Time" value={db?.startupTime} icon={<SpeedIcon />} />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <KPICard title="Uptime" value={Math.floor((db?.uptimeSeconds || 0) / 3600)} unit="h" icon={<SpeedIcon />} />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <KPICard title="Log Mode" value={db?.logMode} icon={<Code />} />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <KPICard title="Instance #" value={db?.instanceNumber} icon={<Code />} />
            </Grid>
          </Grid>
        </TabPanel>

        {/* Clients Tab */}
        <TabPanel value="1" sx={{ p: 0 }}>
          <DataTable
            rows={clients.map((c, i) => ({ id: i, ...c }))}
            columns={[
              { field: 'machine', headerName: 'Machine', flex: 1 },
              { field: 'program', headerName: 'Program', flex: 1 },
              { field: 'module', headerName: 'Module', flex: 1 },
              { field: 'sessionCount', headerName: 'Sessions', type: 'number', width: 100 },
            ]}
          />
        </TabPanel>

        {/* Processes Tab */}
        <TabPanel value="2" sx={{ p: 0 }}>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={3}>
              <KPICard title="Process Count" value={processes?.processCount || 0} icon={<SpeedIcon />} />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <KPICard title="Exec Rate" value={processes?.execRate?.toFixed(1) || 0} unit="/s" icon={<SpeedIcon />} />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <KPICard title="Parse Rate" value={processes?.parseRate?.toFixed(1) || 0} unit="/s" icon={<Code />} />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <KPICard title="Open Cursors" value={processes?.openCursors || 0} icon={<SpeedIcon />} />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <KPICard title="Commit Rate" value={processes?.commitRate?.toFixed(1) || 0} unit="/s" icon={<CheckCircle />} />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <KPICard title="Rollback Rate" value={processes?.rollbackRate?.toFixed(1) || 0} unit="/s" icon={<SpeedIcon />} />
            </Grid>
          </Grid>
        </TabPanel>

        {/* Memory Tab */}
        <TabPanel value="3" sx={{ p: 0 }}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              <Paper sx={{ p: 2, height: '100%' }}>
                <Typography variant="h6" sx={{ mb: 2 }}>Memory Breakdown</Typography>
                <MemoryBreakdown 
                  sga={memory?.sga ?? { bufferCacheMB: 0, sharedPoolMB: 0, largePoolMB: 0, javaPoolMB: 0, streamsPoolMB: 0, redoLogBufferMB: 0 }} 
                  pga={memory?.pga ?? { totalAllocatedMB: 0, totalUsedMB: 0 }} 
                />
              </Paper>
            </Grid>
            <Grid item xs={12} md={4}>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <KPICard title="Buffer Cache Hit" value={memory?.bufferCacheHitRatio?.toFixed(1) || 0} unit="%" icon={<Memory />} />
                </Grid>
                <Grid item xs={6}>
                  <KPICard title="Library Cache Hit" value={memory?.libraryCacheHitRatio?.toFixed(1) || 0} unit="%" icon={<Code />} />
                </Grid>
                <Grid item xs={6}>
                  <KPICard title="SGA Total" value={memory?.sga?.totalMB?.toFixed(1) || 0} unit="MB" icon={<Storage />} />
                </Grid>
                <Grid item xs={6}>
                  <KPICard title="PGA Allocated" value={memory?.pga?.totalAllocatedMB?.toFixed(1) || 0} unit="MB" icon={<Memory />} />
                </Grid>
                <Grid item xs={6}>
                  <KPICard title="PGA Used" value={memory?.pga?.totalUsedMB?.toFixed(1) || 0} unit="MB" icon={<Memory />} />
                </Grid>
                <Grid item xs={6}>
                  <KPICard title="PGA Cache Hit" value={memory?.pga?.cacheHitPercentage?.toFixed(1) || 0} unit="%" icon={<Memory />} />
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Storage Tab */}
        <TabPanel value="4" sx={{ p: 0 }}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              <Paper sx={{ p: 2, height: '100%' }}>
                <Typography variant="h6" sx={{ mb: 2 }}>Tablespaces</Typography>
                <DataTable
                  rows={storage?.tablespaces?.map((t, i) => ({ id: i, ...t })) || []}
                  columns={[
                    { field: 'name', headerName: 'Tablespace', flex: 1 },
                    { field: 'type', headerName: 'Type', width: 120 },
                    { field: 'status', headerName: 'Status', width: 100, renderCell: (params) => params.value },
                    { field: 'sizeMB', headerName: 'Size (MB)', type: 'number', width: 120 },
                    { field: 'usedMB', headerName: 'Used (MB)', type: 'number', width: 120 },
                    { field: 'freeMB', headerName: 'Free (MB)', type: 'number', width: 120 },
                    { field: 'pctUsed', headerName: 'Used %', type: 'number', width: 100, renderCell: (params) => `${params.value.toFixed(1)}%` },
                    { field: 'autoextensible', headerName: 'Auto', width: 60, renderCell: (params) => params.value ? 'Yes' : 'No' },
                  ]}
                />
              </Paper>
            </Grid>
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 2, height: '100%' }}>
                <Typography variant="h6" sx={{ mb: 2 }}>Redo Logs</Typography>
                <DataTable
                  rows={storage?.redoLogs?.map((r, i) => ({ id: i, ...r })) || []}
                  columns={[
                    { field: 'group', headerName: 'Group', width: 80 },
                    { field: 'members', headerName: 'Members', width: 80 },
                    { field: 'sizeMB', headerName: 'Size (MB)', type: 'number', width: 100 },
                    { field: 'status', headerName: 'Status', width: 100 },
                    { field: 'switchesPerHour', headerName: 'Switches/hr', type: 'number', width: 120 },
                  ]}
                />
              </Paper>
            </Grid>
          </Grid>
        </TabPanel>

        {/* CPU Ratio Tab */}
        <TabPanel value="5" sx={{ p: 0 }}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              <Paper sx={{ p: 2, height: '100%' }}>
                <Typography variant="h6" sx={{ mb: 2 }}>CPU Ratio</Typography>
                <CPURatioChart 
                  dbCpuPct={cpu?.dbCpuPct || 0} 
                  osCpuPct={cpu?.osCpuPct || 0} 
                  dbTimePerSec={cpu?.dbTimePerSec || 0} 
                  height={300} 
                />
              </Paper>
            </Grid>
            <Grid item xs={12} md={4}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <KPICard title="DB CPU %" value={cpu?.dbCpuPct?.toFixed(1) || 0} unit="%" icon={<SpeedIcon />} />
                </Grid>
                <Grid item xs={12}>
                  <KPICard title="OS CPU %" value={cpu?.osCpuPct?.toFixed(1) || 0} unit="%" icon={<SpeedIcon />} />
                </Grid>
                <Grid item xs={12}>
                  <KPICard title="DB Time/sec" value={cpu?.dbTimePerSec?.toFixed(1) || 0} unit="s" icon={<SpeedIcon />} />
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Top SQL Tab */}
        <TabPanel value="6" sx={{ p: 0 }}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Top SQL by CPU Time</Typography>
            <DataTable
              rows={topSQL.map((s, i) => ({ id: i, ...s }))}
              columns={[
                { field: 'sqlId', headerName: 'SQL ID', width: 140 },
                { field: 'planHashValue', headerName: 'Plan Hash', type: 'number', width: 120 },
                { field: 'executions', headerName: 'Executions', type: 'number', width: 100 },
                { field: 'cpuTimeSec', headerName: 'CPU Time (s)', type: 'number', width: 120, renderCell: (p) => p.value.toFixed(2) },
                { field: 'elapsedTimeSec', headerName: 'Elapsed (s)', type: 'number', width: 120, renderCell: (p) => p.value.toFixed(2) },
                { field: 'bufferGets', headerName: 'Buffer Gets', type: 'number', width: 120 },
                { field: 'diskReads', headerName: 'Disk Reads', type: 'number', width: 120 },
                { field: 'rowsProcessed', headerName: 'Rows', type: 'number', width: 100 },
                { field: 'sqlText', headerName: 'SQL Text', flex: 1, renderCell: (p) => p.value.substring(0, 80) + '...' },
              ]}
            />
          </Paper>
        </TabPanel>
      </TabContext>
    </Box>
  );
};