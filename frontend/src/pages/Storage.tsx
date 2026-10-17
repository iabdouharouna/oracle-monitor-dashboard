import React, { useMemo, useState } from 'react';
import { Box, Typography, Paper, Grid, Tab, Button, Divider, LinearProgress } from '@mui/material';
import { TabContext, TabList, TabPanel } from '@mui/lab';
import type { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { useTablespaces, useTablespaceDetail, useCapacityPlanning } from '../api/hooks/useStorage';
import { TablespaceGauges, DataTable, StorageTrendChart, LoadingSkeleton, KPICard, GaugeChart, statusChip } from '../components/common';
import { Storage as StorageIcon, TrendingUp, Warning, Error as ErrorIcon } from '@mui/icons-material';
import type { TablespaceInfo } from '../types/api';

const fmtPct = (v: number) => (v > 0 && v < 0.1 ? '<0.1' : v.toFixed(1));

const riskColor = (pctMax: number): 'error' | 'warning' | 'success' => {
  if (pctMax >= 90) return 'error';
  if (pctMax >= 80) return 'warning';
  return 'success';
};

const usageCell = (p: GridRenderCellParams) => {
  const pct = p.row.pctUsed as number;
  const pctMax = p.row.pctUsedMax as number;
  return (
    <Box sx={{ width: '100%', py: 0.5 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, mb: 0.25 }}>
        <span>{fmtPct(pct)}%</span>
        <span style={{ color: '#605E5C' }}>max {fmtPct(pctMax)}%</span>
      </Box>
      <LinearProgress
        variant="determinate"
        value={Math.min(Math.max(pct, 0), 100)}
        color={riskColor(pctMax)}
        sx={{ height: 6, borderRadius: 3 }}
      />
    </Box>
  );
};

const BASE_COLUMNS: GridColDef[] = [
  { field: 'name', headerName: 'Tablespace', flex: 1, minWidth: 180 },
  { field: 'type', headerName: 'Type', width: 110 },
  { field: 'status', headerName: 'Status', width: 110, renderCell: (p) => statusChip(p.value) },
  {
    field: 'used',
    headerName: 'Usage vs Max',
    width: 180,
    valueGetter: (_value, row) => row.pctUsedMax,
    sortingOrder: ['desc', 'asc'],
    renderCell: usageCell,
  },
  { field: 'usedMB', headerName: 'Used (MB)', type: 'number', width: 110 },
  { field: 'sizeMB', headerName: 'Size (MB)', type: 'number', width: 110 },
  { field: 'maxSizeMB', headerName: 'Max (MB)', type: 'number', width: 120 },
  {
    field: 'autoextensible',
    headerName: 'Auto',
    width: 80,
    renderCell: (p) => (p.value ? 'Yes' : 'No'),
  },
];

export const Storage: React.FC = () => {
  const [tab, setTab] = useState('0');
  const [selectedTablespace, setSelectedTablespace] = useState<string | null>(null);

  const { data: tablespaces, isLoading, error, refetch } = useTablespaces();
  const { data: detail } = useTablespaceDetail(selectedTablespace);
  const { data: capacity } = useCapacityPlanning();

  const permTablespaces = useMemo(
    () => (tablespaces || []).filter((t) => t.type !== 'TEMPORARY').sort((a, b) => b.pctUsedMax - a.pctUsedMax),
    [tablespaces]
  );
  const tempTablespaces = useMemo(
    () => (tablespaces || []).filter((t) => t.type === 'TEMPORARY').sort((a, b) => b.pctUsedMax - a.pctUsedMax),
    [tablespaces]
  );

  if (isLoading && !tablespaces) {
    return <LoadingSkeleton variant="card" />;
  }

  if (error) {
    return <Box sx={{ p: 2, color: 'error.main' }}>Error: {error.message}</Box>;
  }

  const critCount = (tablespaces || []).filter((t) => t.pctUsedMax >= 90).length;
  const warnCount = (tablespaces || []).filter((t) => t.pctUsedMax >= 80 && t.pctUsedMax < 90).length;
  const okCount = (tablespaces || []).filter((t) => t.pctUsedMax < 80).length;

  const withIds = (rows: TablespaceInfo[]) => rows.map((t, i) => ({ id: i, ...t }));

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
          <KPICard title="Critical" value={critCount} icon={<ErrorIcon />} color="error" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KPICard title="Warning" value={warnCount} icon={<Warning />} color="warning" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KPICard title="OK" value={okCount} icon={<TrendingUp />} color="success" />
        </Grid>
      </Grid>

      {/* Tablespace Gauges */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 2, flexWrap: 'wrap', gap: 1 }}>
          <Typography variant="h6">Tablespace Usage</Typography>
          <Typography variant="caption" color="text.secondary">
            Sorted by allocated usage · color reflects usage vs max capacity (autoextend-aware)
          </Typography>
        </Box>
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
            rows={withIds(permTablespaces)}
            columns={BASE_COLUMNS}
            pageSize={10}
            onRowClick={(row) => setSelectedTablespace((row as TablespaceInfo).name)}
          />
        </TabPanel>

        <TabPanel value="1" sx={{ p: 0 }}>
          <DataTable
            rows={withIds(tempTablespaces)}
            columns={BASE_COLUMNS}
            pageSize={10}
            onRowClick={(row) => setSelectedTablespace((row as TablespaceInfo).name)}
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
          </Grid>
        </TabPanel>

        {/* Detail Panel — shown for any tab so row clicks always reveal it */}
        {selectedTablespace && detail && (
          <Paper sx={{ p: 2, mt: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Tablespace Detail: {detail.name}</Typography>
              <Button onClick={() => setSelectedTablespace(null)}>Close</Button>
            </Box>

            <Grid container spacing={3} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={6} md={3}>
                <GaugeChart
                  value={detail.pctUsed}
                  colorValue={detail.pctUsedMax}
                  label="Usage"
                  subLabel={`vs max ${fmtPct(detail.pctUsedMax)}%`}
                  size={150}
                  thresholds={{ warn: 80, crit: 90 }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <KPICard title="Size" value={detail.sizeMB.toFixed(1)} unit="MB" icon={<StorageIcon />} />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <KPICard title="Used" value={detail.usedMB.toFixed(1)} unit="MB" icon={<StorageIcon />} />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <KPICard title="Max" value={detail.maxSizeMB.toFixed(1)} unit="MB" icon={<StorageIcon />} />
              </Grid>
            </Grid>

            {/* Growth Trend */}
            {!!detail.growthTrend?.length && (
              <StorageTrendChart
                data={detail.growthTrend}
                tablespaceName={detail.name}
                warnThreshold={detail.maxSizeMB * 0.8}
                critThreshold={detail.maxSizeMB * 0.9}
                maxSize={detail.maxSizeMB || undefined}
                height={350}
              />
            )}

            {/* Datafiles */}
            {!!detail.datafiles?.length && (
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
            {!!detail.segments?.length && (
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
        )}
      </TabContext>
    </Box>
  );
};
