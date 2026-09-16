import React, { useState } from 'react';
import { Box, Typography, Paper, Grid, Button, Tabs, Tab, Chip } from '@mui/material';
import { useActiveSQL, useSQLMonitorDetail, useExecutionPlan } from '../api/hooks/useSqlMonitor';
import { DataTable, LoadingSkeleton, ErrorDisplay } from '../components/common';
import { ExecutionPlan } from '../components/charts/ExecutionPlan';
import { Visibility, Code, TableChart, ArrowBack } from '@mui/icons-material';

export const SQLMonitor: React.FC = () => {
  const [selectedSQL, setSelectedSQL] = useState<{ sqlId: string; sqlExecId: number } | null>(null);
  const [detailTab, setDetailTab] = useState(0);

  const { data: activeSQL, isLoading, error, refetch } = useActiveSQL();
  const { data: detail } = useSQLMonitorDetail(selectedSQL?.sqlId || null, selectedSQL?.sqlExecId || null);
  const { data: plan } = useExecutionPlan(detail?.sqlId || null, detail?.planHashValue || null);

  const handleRowClick = (row: any) => {
    setSelectedSQL({ sqlId: row.sqlId, sqlExecId: row.sqlExecId });
    setDetailTab(0);
  };

  const handleBack = () => {
    setSelectedSQL(null);
  };

  if (isLoading && !activeSQL) {
    return <LoadingSkeleton variant="table" />;
  }

  if (error) {
    return <ErrorDisplay error={error} onRetry={refetch} />;
  }

  if (selectedSQL && detail) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button variant="outlined" startIcon={<ArrowBack />} onClick={handleBack}>
            Back to List
          </Button>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h5" fontWeight={600} sx={{ mb: 0.5 }}>
              SQL Monitor Detail
            </Typography>
            <Typography variant="body2" color="text.secondary">
              SQL ID: {detail.sqlId} • Exec ID: {detail.sqlExecId} • {detail.status}
            </Typography>
          </Box>
          <Button variant="contained" onClick={() => refetch()} startIcon={<Code />}>
            Refresh
          </Button>
        </Box>

        {/* Summary Cards */}
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="caption" color="text.secondary">Status</Typography>
              <Typography variant="h6" color={detail.status === 'EXECUTING' ? 'primary' : detail.status.includes('ERROR') ? 'error' : 'success'}>
                {detail.status}
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="caption" color="text.secondary">Duration</Typography>
              <Typography variant="h6">{(detail.durationSec || 0).toFixed(1)}s</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="caption" color="text.secondary">CPU Time</Typography>
              <Typography variant="h6">{(detail.cpuTimeSec || 0).toFixed(1)}s</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="caption" color="text.secondary">I/O Time</Typography>
              <Typography variant="h6">{(detail.ioTimeSec || 0).toFixed(1)}s</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="caption" color="text.secondary">PX Servers</Typography>
              <Typography variant="h6">{detail.pxServers || 0}</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="caption" color="text.secondary">Buffer Gets</Typography>
              <Typography variant="h6">{detail.bufferGets?.toLocaleString()}</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="caption" color="text.secondary">Disk Reads</Typography>
              <Typography variant="h6">{detail.diskReads?.toLocaleString()}</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="caption" color="text.secondary">Start Time</Typography>
              <Typography variant="body2">{detail.startTime}</Typography>
            </Paper>
          </Grid>
        </Grid>

        {/* Tabs for detail */}
        <Tabs value={detailTab} onChange={(_, v) => setDetailTab(v)} sx={{ mb: 2 }}>
          <Tab label="SQL Text" icon={<Code />} />
          <Tab label="Execution Plan" icon={<TableChart />} />
          <Tab label="Parallelism" icon={<TableChart />} />
          <Tab label="Statistics" icon={<Visibility />} />
        </Tabs>

        {detailTab === 0 && (
          <Paper sx={{ p: 2, overflow: 'auto', maxHeight: 400, fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
            {detail.sqlText}
          </Paper>
        )}

        {detailTab === 1 && (
          <Paper sx={{ p: 2 }}>
            <ExecutionPlan plan={plan || []} />
          </Paper>
        )}

        {detailTab === 2 && (
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Parallelism Details</Typography>
            <DataTable
              rows={detail.parallelism || []}
              columns={[
                { field: 'dfoNumber', headerName: 'DFO', type: 'number', width: 80 },
                { field: 'tqId', headerName: 'TQ', type: 'number', width: 80 },
                { field: 'serverType', headerName: 'Server Type', width: 120 },
                { field: 'numRows', headerName: 'Rows', type: 'number', width: 100 },
                { field: 'bytes', headerName: 'Bytes', type: 'number', width: 120, renderCell: (p) => (p.value / 1024 / 1024).toFixed(1) + ' MB' },
                { field: 'openTime', headerName: 'Open Time (s)', type: 'number', width: 120, renderCell: (p) => p.value.toFixed(2) },
                { field: 'avgLatency', headerName: 'Avg Latency', type: 'number', width: 100, renderCell: (p) => p.value.toFixed(2) },
              ]}
            />
          </Paper>
        )}

        {detailTab === 3 && (
          <Paper sx={{ p: 2 }}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" sx={{ mb: 2 }}>Execution Statistics</Typography>
                <DataTable
                  rows={[
                    { metric: 'Duration', value: `${(detail.durationSec || 0).toFixed(2)}s` },
                    { metric: 'CPU Time', value: `${(detail.cpuTimeSec || 0).toFixed(2)}s` },
                    { metric: 'I/O Time', value: `${(detail.ioTimeSec || 0).toFixed(2)}s` },
                    { metric: 'Executions', value: (detail.executions || 0).toLocaleString() },
                    { metric: 'Buffer Gets', value: (detail.bufferGets || 0).toLocaleString() },
                    { metric: 'Disk Reads', value: (detail.diskReads || 0).toLocaleString() },
                    { metric: 'Disk Writes', value: (detail.diskWrites || 0).toLocaleString() },
                    { metric: 'Physical Read Requests', value: (detail.physicalReadRequests || 0).toLocaleString() },
                    { metric: 'Physical Read Bytes', value: `${((detail.physicalReadBytes || 0) / 1024 / 1024).toFixed(1)} MB` },
                    { metric: 'Physical Write Requests', value: (detail.physicalWriteRequests || 0).toLocaleString() },
                    { metric: 'Physical Write Bytes', value: `${((detail.physicalWriteBytes || 0) / 1024 / 1024).toFixed(1)} MB` },
                  ]}
                  columns={[
                    { field: 'metric', headerName: 'Metric', flex: 1 },
                    { field: 'value', headerName: 'Value', flex: 1 },
                  ]}
                />
              </Grid>
            </Grid>
          </Paper>
        )}
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" fontWeight={600}>SQL Monitor</Typography>
          <Typography variant="body2" color="text.secondary">
            Real-time monitored SQL executions
          </Typography>
        </Box>
        <Button variant="contained" onClick={() => refetch()} startIcon={<Code />}>
          Refresh
        </Button>
      </Box>

      <Paper sx={{ p: 0 }}>
        <DataTable
          rows={activeSQL || []}
          columns={[
            { field: 'status', headerName: 'Status', width: 150, renderCell: (params) => (
              <Chip label={params.value} size="small" color={
                params.value === 'EXECUTING' ? 'primary' : 
                params.value.includes('ERROR') ? 'error' : 'success'
              } />
            )},
            { field: 'sqlId', headerName: 'SQL ID', width: 140 },
            { field: 'sqlExecId', headerName: 'Exec ID', type: 'number', width: 100 },
            { field: 'username', headerName: 'User', width: 120 },
            { field: 'module', headerName: 'Module', width: 150 },
            { field: 'durationSec', headerName: 'Duration (s)', type: 'number', width: 120, renderCell: (p) => p.value.toFixed(2) },
            { field: 'cpuTimeSec', headerName: 'CPU (s)', type: 'number', width: 100, renderCell: (p) => p.value.toFixed(2) },
            { field: 'ioTimeSec', headerName: 'I/O (s)', type: 'number', width: 100, renderCell: (p) => p.value.toFixed(2) },
            { field: 'pxServers', headerName: 'PX', type: 'number', width: 60 },
            { field: 'startTime', headerName: 'Start Time', width: 160 },
            { field: 'sqlText', headerName: 'SQL Text', flex: 1, renderCell: (p) => p.value?.substring(0, 100) + '...' },
          ]}
          onRowClick={handleRowClick}
          loading={isLoading}
        />
      </Paper>
    </Box>
  );
};