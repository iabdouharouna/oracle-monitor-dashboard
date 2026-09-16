import React, { useState } from 'react';
import { Box, Typography, Paper, Grid, Tab, Button, Divider, Chip } from '@mui/material';
import { TabContext, TabList, TabPanel } from '@mui/lab';
import { useTablespaces, useTablespaceDetail, useCapacityPlanning } from '../api/hooks/useStorage';
import { TablespaceGauges, DataTable, StorageTrendChart, LoadingSkeleton, KPICard, GaugeChart } from '../components/common';
import { Storage as StorageIcon, TrendingUp, Warning, Error as ErrorIcon } from '@mui/icons-material';

export const Storage: React.FC = () => {
  const [tab, setTab] = useState('0');
  const [selectedTablespace, setSelectedTablespace] = useState<string | null>(null);

  const { data: tablespaces, isLoading, error, refetch } = useTablespaces();
  const { data: detail } = useTablespaceDetail(selectedTablespace);
  const { data: capacity } = useCapacityPlanning();

  if (isLoading && !tablespaces) {
    return <LoadingSkeleton variant="card" />;
  }

  if (error) {
    return <Box sx={{ p: 2, color: 'error.main' }}>Error: {error.message}</Box>;
  }

  const permTablespaces = tablespaces?.filter(t => t.type !== 'TEMPORARY') || [];
  const tempTablespaces = tablespaces?.filter(t => t.type === 'TEMPORARY') || [];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight={600}>Storage</Typography>
          <Typography variant="body2" color="text.secondary">
            Tablespace usage and capacity planning
          </Typography>
        </Box>
        <Button variant="outlined" onClick={() => refetch()} startIcon={<StorageIcon />}>Refresh</Button>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={6} md={3}>
          <KPICard title="Total Tablespaces" value={tablespaces?.length || 0} icon={<StorageIcon />} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KPICard title="Critical" value={tablespaces?.filter(t => t.pctUsed >= 90).length || 0} icon={<ErrorIcon />} color="error" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KPICard title="Warning" value={tablespaces?.filter(t => t.pctUsed >= 80 && t.pctUsed < 90).length || 0} icon={<Warning />} color="warning" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KPICard title="OK" value={tablespaces?.filter(t => t.pctUsed < 80).length || 0} icon={<TrendingUp />} color="success" />
        </Grid>
      </Grid>

      {/* Tablespace Gauges */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Tablespace Usage</Typography>
        <TablespaceGauges 
          tablespaces={permTablespaces} 
          onClick={(ts) => setSelectedTablespace(ts.name)} 
        />
      </Paper>

      {/* Tables */}
      <TabContext value={tab}>
        <TabList sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }} onChange={(_, v) => setTab(String(v))}>
          <Tab label="Permanent/Undo" />
          <Tab label="Temporary" />
          <Tab label="Capacity Planning" />
        </TabList>

        <TabPanel value="0" sx={{ p: 0 }}>
          <DataTable
            rows={permTablespaces.map((t, i) => ({ id: i, ...t }))}
            columns={[
              { field: 'name', headerName: 'Tablespace', flex: 1, minWidth: 150 },
              { field: 'type', headerName: 'Type', width: 120 },
              { field: 'status', headerName: 'Status', width: 100, renderCell: (p) => <Chip label={p.value} size="small" /> },
              { field: 'sizeMB', headerName: 'Size (MB)', type: 'number', width: 120 },
              { field: 'usedMB', headerName: 'Used (MB)', type: 'number', width: 120 },
              { field: 'freeMB', headerName: 'Free (MB)', type: 'number', width: 120 },
              { field: 'pctUsed', headerName: 'Used %', type: 'number', width: 100, renderCell: (p) => `${p.value.toFixed(1)}%` },
              { field: 'autoextensible', headerName: 'Auto', width: 60, renderCell: (p) => p.value ? 'Yes' : 'No' },
              { field: 'maxSizeMB', headerName: 'Max (MB)', type: 'number', width: 120 },
            ]}
            onRowClick={(row) => setSelectedTablespace(row.name)}
          />
        </TabPanel>

        <TabPanel value="1" sx={{ p: 0 }}>
          <DataTable
            rows={tempTablespaces.map((t, i) => ({ id: i, ...t }))}
            columns={[
              { field: 'name', headerName: 'Tablespace', flex: 1, minWidth: 150 },
              { field: 'type', headerName: 'Type', width: 120 },
              { field: 'status', headerName: 'Status', width: 100 },
              { field: 'sizeMB', headerName: 'Size (MB)', type: 'number', width: 120 },
              { field: 'usedMB', headerName: 'Used (MB)', type: 'number', width: 120 },
              { field: 'freeMB', headerName: 'Free (MB)', type: 'number', width: 120 },
              { field: 'pctUsed', headerName: 'Used %', type: 'number', width: 100, renderCell: (p) => `${p.value.toFixed(1)}%` },
              { field: 'autoextensible', headerName: 'Auto', width: 60, renderCell: (p) => p.value ? 'Yes' : 'No' },
            ]}
          />
        </TabPanel>

        <TabPanel value="2" sx={{ p: 0 }}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" sx={{ mb: 2 }}>Capacity Projections</Typography>
              {capacity?.length === 0 ? (
                <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                  No capacity data available. Need at least 2 data points over 30 days.
                </Typography>
              ) : (
                <DataTable
                  rows={capacity?.map((c, i) => ({ id: i, ...c })) || []}
                  columns={[
                    { field: 'tablespaceName', headerName: 'Tablespace', flex: 1 },
                    { field: 'currentUsedMB', headerName: 'Current Used (MB)', type: 'number', width: 150 },
                    { field: 'growthRateMBPerDay', headerName: 'Growth (MB/day)', type: 'number', width: 150, renderCell: (p) => p.value.toFixed(2) },
                    { field: 'daysUntilWarning', headerName: 'Days to Warning', type: 'number', width: 130, renderCell: (p) => p.value || '—' },
                    { field: 'daysUntilCritical', headerName: 'Days to Critical', type: 'number', width: 130, renderCell: (p) => p.value || '—' },
                    { field: 'daysUntilFull', headerName: 'Days to Full', type: 'number', width: 130, renderCell: (p) => p.value || '—' },
                  ]}
                />
              )}
            </Grid>
            
            {/* Detail Panel */}
            {selectedTablespace && detail && (
              <Grid item xs={12}>
                <Paper sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6">Tablespace Detail: {detail.name}</Typography>
                    <Button onClick={() => setSelectedTablespace(null)}>Close</Button>
                  </Box>
                  
                  <Grid container spacing={3} sx={{ mb: 3 }}>
                    <Grid item xs={12} sm={6} md={3}>
                      <GaugeChart value={detail.pctUsed} label="Usage" size={150} thresholds={{ warn: 80, crit: 90 }} />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <KPICard title="Size" value={detail.sizeMB.toFixed(1)} unit="MB" icon={<StorageIcon />} />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <KPICard title="Used" value={detail.usedMB.toFixed(1)} unit="MB" icon={<StorageIcon />} />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <KPICard title="Free" value={detail.freeMB.toFixed(1)} unit="MB" icon={<StorageIcon />} />
                    </Grid>
                  </Grid>

                  {/* Growth Trend */}
                  {detail.growthTrend?.length && (
                    <StorageTrendChart 
                      data={detail.growthTrend} 
                      tablespaceName={detail.name}
                      warnThreshold={detail.sizeMB * 0.8}
                      critThreshold={detail.sizeMB * 0.9}
                      maxSize={detail.maxSizeMB || undefined}
                      height={350}
                    />
                  )}

                  {/* Datafiles */}
                  {detail.datafiles?.length && (
                    <>
                    <Divider sx={{ my: 3 }} />
                    <Typography variant="h6" sx={{ mb: 2 }}>Datafiles</Typography>
                    <DataTable
                      rows={detail.datafiles.map((d, i) => ({ id: i, ...d }))}
                      columns={[
                        { field: 'fileId', headerName: 'File#', type: 'number', width: 80 },
                        { field: 'fileName', headerName: 'File Name', flex: 1, minWidth: 300 },
                        { field: 'sizeMB', headerName: 'Size (MB)', type: 'number', width: 120 },
                        { field: 'maxSizeMB', headerName: 'Max (MB)', type: 'number', width: 120 },
                        { field: 'autoextensible', headerName: 'Auto', width: 60, renderCell: (p) => p.value ? 'Yes' : 'No' },
                        { field: 'incrementMB', headerName: 'Inc (MB)', type: 'number', width: 100 },
                        { field: 'status', headerName: 'Status', width: 100 },
                        { field: 'onlineStatus', headerName: 'Online', width: 100 },
                      ]}
                    />
                    </>
                  )}

                  {/* Top Segments */}
                  {detail.segments?.length && (
                    <>
                    <Divider sx={{ my: 3 }} />
                    <Typography variant="h6" sx={{ mb: 2 }}>Top Segments</Typography>
                    <DataTable
                      rows={detail.segments.map((s, i) => ({ id: i, ...s }))}
                      columns={[
                        { field: 'owner', headerName: 'Owner', width: 120 },
                        { field: 'segmentName', headerName: 'Segment', flex: 1 },
                        { field: 'segmentType', headerName: 'Type', width: 120 },
                        { field: 'sizeMB', headerName: 'Size (MB)', type: 'number', width: 120 },
                        { field: 'extents', headerName: 'Extents', type: 'number', width: 100 },
                      ]}
                    />
                    </>
                  )}
                </Paper>
              </Grid>
            )}
          </Grid>
        </TabPanel>
      </TabContext>
    </Box>
  );
};