import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, Grid, Tab, Button, FormControl, InputLabel, Select, MenuItem, Chip, TextField, Dialog, DialogTitle, DialogContent, DialogActions, Alert, Snackbar } from '@mui/material';
import { TabContext, TabList, TabPanel } from '@mui/lab';
import { useAlertLog, useThresholds, useCheckThresholds, useUpdateThresholds } from '../api/hooks/useAlerts';
import { DataTable, LoadingSkeleton, ErrorDisplay, TimeRangeSelector, KPICard } from '../components/common';
import { Warning, Error as ErrorIcon, Info, Settings, Edit, Refresh } from '@mui/icons-material';
import { format } from 'date-fns';

export const Alerts: React.FC = () => {
  const [timeRange, setTimeRange] = useState('24h');
  const [editingThresholds, setEditingThresholds] = useState(false);
  const [thresholds, setThresholds] = useState({
    tablespaceWarn: 80,
    tablespaceCrit: 90,
    sessionsWarn: 70,
    sessionsCrit: 85,
    cpuWarn: 80,
    cpuCrit: 90,
    waitTimeMsWarn: 100,
    waitTimeMsCrit: 500,
  });
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const hours = { '5m': 5/60, '15m': 15/60, '1h': 1, '6h': 6, '24h': 24, '7d': 168 }[timeRange] || 24;

  const { data: alertLog, isLoading } = useAlertLog(hours);
  const { data: currentThresholds } = useThresholds();
  const { data: triggeredAlerts, refetch: refetchAlerts } = useCheckThresholds();
  const updateThresholds = useUpdateThresholds();

  useEffect(() => {
    if (currentThresholds) {
      setThresholds({
        tablespaceWarn: currentThresholds.tablespaceWarn,
        tablespaceCrit: currentThresholds.tablespaceCrit,
        sessionsWarn: currentThresholds.sessionsWarn,
        sessionsCrit: currentThresholds.sessionsCrit,
        cpuWarn: currentThresholds.cpuWarn,
        cpuCrit: currentThresholds.cpuCrit,
        waitTimeMsWarn: currentThresholds.waitTimeMsWarn,
        waitTimeMsCrit: currentThresholds.waitTimeMsCrit,
      });
    }
  }, [currentThresholds]);

  const handleThresholdChange = (key: string, value: number) => {
    setThresholds(prev => ({ ...prev, [key]: value }));
  };

  const handleSaveThresholds = async () => {
    try {
      await updateThresholds.mutateAsync(thresholds);
      setSaveMessage('Thresholds saved successfully');
      setEditingThresholds(false);
    } catch (err) {
      setSaveMessage(`Failed to save thresholds: ${err instanceof Error ? err.message : 'unknown error'}`);
    }
  };

  if (isLoading && !alertLog) {
    return <LoadingSkeleton variant="table" />;
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight={600}>Alerts</Typography>
          <Typography variant="body2" color="text.secondary">
            Alert log and threshold configuration
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
          <Button variant="outlined" onClick={refetchAlerts} startIcon={<Refresh />}>Refresh</Button>
        </Box>
      </Box>

      {/* Triggered Alerts */}
      {triggeredAlerts && triggeredAlerts.length > 0 && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Active Threshold Alerts</Typography>
            <Chip label={triggeredAlerts.length} color="error" size="small" />
          </Box>
          <DataTable
            rows={triggeredAlerts}
            columns={[
              { field: 'severity', headerName: 'Severity', width: 100, renderCell: (p) => (
                <Chip label={p.value} size="small" color={p.value === 'CRITICAL' ? 'error' : 'warning'} />
              )},
              { field: 'metric', headerName: 'Metric', width: 200 },
              { field: 'value', headerName: 'Value', type: 'number', width: 100, renderCell: (p) => p.value.toFixed(1) },
              { field: 'threshold', headerName: 'Threshold', type: 'number', width: 100, renderCell: (p) => p.value.toFixed(1) },
              { field: 'message', headerName: 'Message', flex: 1 },
              { field: 'timestamp', headerName: 'Time', width: 160 },
              { field: 'acknowledged', headerName: 'Acknowledged', width: 120, renderCell: (p) => p.value ? 'Yes' : 'No' },
            ]}
          />
        </Paper>
      )}

      {/* Thresholds Configuration */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Threshold Configuration</Typography>
          {editingThresholds ? (
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button variant="contained" onClick={handleSaveThresholds} startIcon={<Settings />}>Save</Button>
              <Button variant="outlined" onClick={() => setEditingThresholds(false)}>Cancel</Button>
            </Box>
          ) : (
            <Button variant="outlined" onClick={() => setEditingThresholds(true)} startIcon={<Edit />}>Edit</Button>
          )}
        </Box>

        <Grid container spacing={2}>
          {[
            { key: 'tablespaceWarn', label: 'Tablespace Warning %', icon: <Warning /> },
            { key: 'tablespaceCrit', label: 'Tablespace Critical %', icon: <ErrorIcon /> },
            { key: 'sessionsWarn', label: 'Sessions Warning %', icon: <Warning /> },
            { key: 'sessionsCrit', label: 'Sessions Critical %', icon: <ErrorIcon /> },
            { key: 'cpuWarn', label: 'CPU Warning %', icon: <Warning /> },
            { key: 'cpuCrit', label: 'CPU Critical %', icon: <ErrorIcon /> },
            { key: 'waitTimeMsWarn', label: 'Wait Time Warning (ms)', icon: <Warning /> },
            { key: 'waitTimeMsCrit', label: 'Wait Time Critical (ms)', icon: <ErrorIcon /> },
          ].map(({ key, label, icon }) => (
            <Grid item xs={12} sm={6} md={3} key={key}>
              <Paper sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  {icon}
                  <Typography variant="caption" color="text.secondary">{label}</Typography>
                </Box>
                {editingThresholds ? (
                  <TextField
                    type="number"
                    size="small"
                    fullWidth
                    value={thresholds[key as keyof typeof thresholds]}
                    onChange={(e) => handleThresholdChange(key, parseInt(e.target.value) || 0)}
                    InputProps={{ inputProps: { min: 0, max: key.includes('waitTime') ? 10000 : 100 } }}
                  />
                ) : (
                  <Typography variant="h5" fontWeight={600}>{thresholds[key as keyof typeof thresholds]}{key.includes('waitTime') ? 'ms' : '%'}</Typography>
                )}
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Paper>

      {/* Alert Log */}
      <Paper sx={{ p: 0 }}>
        <DataTable
          rows={alertLog?.map((a, i) => ({ id: i, ...a })) || []}
          columns={[
            { field: 'timestamp', headerName: 'Timestamp', width: 180 },
            { field: 'severity', headerName: 'Severity', width: 100, renderCell: (p) => (
              <Chip label={p.value} size="small" color={
                p.value === 'CRITICAL' ? 'error' : 
                p.value === 'ERROR' ? 'error' : 
                p.value === 'WARNING' ? 'warning' : 'info'
              } />
            )},
            { field: 'message', headerName: 'Message', flex: 1, minWidth: 300 },
            { field: 'facility', headerName: 'Facility', width: 150 },
          ]}
          loading={isLoading}
        />
      </Paper>

      <Snackbar
        open={!!saveMessage}
        autoHideDuration={4000}
        onClose={() => setSaveMessage(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSaveMessage(null)}
          severity={saveMessage?.includes('Failed') ? 'error' : 'success'}
          variant="filled"
        >
          {saveMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};