import React, { useState } from 'react';
import { Box, Typography, Paper, Grid, TextField, Button, Dialog, DialogTitle, DialogContent, DialogActions, Divider, Chip } from '@mui/material';
import { useSessions, useBlockingChains, useLongOperations, useKillSession } from '../api/hooks/useSessions';
import { DataTable, LoadingSkeleton, ErrorDisplay, BlockingTree } from '../components/common';
import { FilterList, Delete, Refresh, Speed } from '@mui/icons-material';
import { format } from 'date-fns';
import { useAuth } from '../context/AuthContext';

export const Sessions: React.FC = () => {
  const [filters, setFilters] = useState({ status: '', username: '', machine: '', minDuration: '' });
  const [selectedSessions, setSelectedSessions] = useState<number[]>([]);
  const { user } = useAuth();
  const canKill = user?.role === 'DBA';

  const { data: sessions, isLoading, error, refetch } = useSessions(
    filters.status || undefined,
    filters.username || undefined,
    filters.machine || undefined,
    filters.minDuration ? parseInt(filters.minDuration) : undefined
  );
  const { data: blockingChains } = useBlockingChains();
  const { data: longOps } = useLongOperations();
  const killMutation = useKillSession();

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleKill = async (sid: number, serial: number) => {
    if (window.confirm(`Kill session ${sid},${serial}?`)) {
      try {
        await killMutation.mutateAsync({ sid, serial });
      } catch (e) {
        // Error handled by mutation
      }
    }
  };

  const handleKillSelected = async () => {
    const chosen = selectedSessions.map((id) => {
      const [sid, serial] = String(id).split(',');
      return { sid: parseInt(sid, 10), serial: parseInt(serial, 10) };
    }).filter((s) => !isNaN(s.sid) && !isNaN(s.serial));
    if (chosen.length === 0) return;
    if (!window.confirm(`Kill ${chosen.length} selected session(s)?`)) return;
    for (const s of chosen) {
      try {
        await killMutation.mutateAsync(s);
      } catch (e) {
        // continue with next
      }
    }
    setSelectedSessions([]);
  };

  if (isLoading && !sessions) {
    return <LoadingSkeleton variant="table" />;
  }

  if (error) {
    return <ErrorDisplay error={error} onRetry={refetch} />;
  }

  const activeSessions = sessions?.filter(s => s.status === 'ACTIVE') || [];
  const inactiveSessions = sessions?.filter(s => s.status === 'INACTIVE') || [];
  const blockedSessions = sessions?.filter(s => s.blockingSession) || [];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight={600}>Sessions</Typography>
          <Typography variant="body2" color="text.secondary">
            {sessions?.length || 0} total • {activeSessions.length} active • {blockedSessions.length} blocked
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <TextField
            size="small"
            placeholder="Filter username"
            value={filters.username}
            onChange={(e) => handleFilterChange('username', e.target.value)}
            InputProps={{ startAdornment: <FilterList fontSize="small" color="action" /> }}
            sx={{ minWidth: 180 }}
          />
          <TextField
            size="small"
            placeholder="Filter machine"
            value={filters.machine}
            onChange={(e) => handleFilterChange('machine', e.target.value)}
            sx={{ minWidth: 180 }}
          />
          <TextField
            size="small"
            type="number"
            placeholder="Min duration (s)"
            value={filters.minDuration}
            onChange={(e) => handleFilterChange('minDuration', e.target.value)}
            sx={{ minWidth: 150 }}
          />
          <Button variant="outlined" onClick={refetch} startIcon={<Refresh />}>Refresh</Button>
          {canKill && (
            <Button
              variant="contained"
              color="error"
              onClick={handleKillSelected}
              disabled={selectedSessions.length === 0 || killMutation.isPending}
              startIcon={<Delete />}
            >
              Kill Selected{selectedSessions.length > 0 ? ` (${selectedSessions.length})` : ''}
            </Button>
          )}
        </Box>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="caption" color="text.secondary">Total Sessions</Typography>
            <Typography variant="h5" fontWeight={600}>{sessions?.length || 0}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="caption" color="text.secondary">Active</Typography>
            <Typography variant="h5" color="primary" fontWeight={600}>{activeSessions.length}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="caption" color="text.secondary">Blocked</Typography>
            <Typography variant="h5" color="error" fontWeight={600}>{blockedSessions.length}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="caption" color="text.secondary">Long Ops</Typography>
            <Typography variant="h5" color="warning" fontWeight={600}>{longOps?.length || 0}</Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Blocking Tree */}
      {(blockingChains && blockingChains.length > 0) && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Blocking Sessions</Typography>
            <Chip label={blockingChains.length} color="error" size="small" />
          </Box>
          <BlockingTree chains={blockingChains} />
        </Paper>
      )}

      {/* Sessions Table */}
      <Paper sx={{ p: 0 }}>
        <DataTable
          rows={sessions?.map(s => ({ 
            id: `${s.sid},${s.serial}`,
            ...s,
            logonTimeFormatted: s.logonTime ? format(new Date(s.logonTime), 'HH:mm:ss') : '',
          })) || []}
          columns={[
            { field: 'sid', headerName: 'SID', type: 'number', width: 80 },
            { field: 'serial', headerName: 'Serial#', type: 'number', width: 100 },
            { field: 'username', headerName: 'Username', width: 120 },
            { field: 'machine', headerName: 'Machine', flex: 1, minWidth: 150 },
            { field: 'program', headerName: 'Program', width: 150 },
            { field: 'module', headerName: 'Module', width: 120 },
            { field: 'logonTimeFormatted', headerName: 'Logon', width: 100 },
            { field: 'lastCallEt', headerName: 'Last Call (s)', type: 'number', width: 120 },
            { field: 'status', headerName: 'Status', width: 100, renderCell: (params) => <Chip label={params.value} size="small" /> },
            { field: 'state', headerName: 'State', width: 100 },
            { field: 'waitClass', headerName: 'Wait Class', width: 120 },
            { field: 'event', headerName: 'Event', width: 200 },
            { field: 'secondsInWait', headerName: 'Wait (s)', type: 'number', width: 100 },
            { field: 'blockingSession', headerName: 'Blocker SID', type: 'number', width: 100 },
            { field: 'sqlId', headerName: 'SQL ID', width: 140 },
            { field: 'pgaUsedMB', headerName: 'PGA (MB)', type: 'number', width: 100, renderCell: (p) => (p.value != null ? (p.value as number).toFixed(1) : '-') },
          ]}
          loading={isLoading}
          error={error}
          checkboxSelection={canKill}
          onSelectionChange={setSelectedSessions}
        />
      </Paper>

      {/* Long Operations */}
      {(longOps && longOps.length > 0) && (
        <Paper sx={{ p: 2, mt: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Long Operations</Typography>
          <DataTable
            rows={longOps}
            columns={[
              { field: 'sid', headerName: 'SID', type: 'number', width: 80 },
              { field: 'serial', headerName: 'Serial', type: 'number', width: 100 },
              { field: 'opname', headerName: 'Operation', width: 150 },
              { field: 'target', headerName: 'Target', width: 200 },
              { field: 'pctDone', headerName: '% Done', type: 'number', width: 100, renderCell: (p) => `${p.value}%` },
              { field: 'elapsedSec', headerName: 'Elapsed (s)', type: 'number', width: 100, renderCell: (p) => (p.value != null ? (p.value as number).toFixed(1) : '-') },
              { field: 'remainingSec', headerName: 'Remaining (s)', type: 'number', width: 120, renderCell: (p) => (p.value != null ? (p.value as number).toFixed(1) : '-') },
              { field: 'message', headerName: 'Message', flex: 1 },
            ]}
          />
        </Paper>
      )}

      {/* Kill Session Dialog - handled inline via confirm */}
    </Box>
  );
};