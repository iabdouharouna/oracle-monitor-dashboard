import React, { useState } from 'react';
import { Box, Typography, Paper, Grid, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { useASHAAS, useASHWaitClasses, useASHDDrilldown, useASHTopSQL } from '../api/hooks/usePerformance';
import { AASChart, WaitClassChart, DataTable, TimeRangeSelector } from '../components/common';

const DIMENSIONS = [
  { value: 'wait_class', label: 'Wait Class' },
  { value: 'event', label: 'Wait Event' },
  { value: 'sql_id', label: 'SQL ID' },
  { value: 'username', label: 'Username' },
  { value: 'machine', label: 'Machine' },
  { value: 'module', label: 'Module' },
  { value: 'action', label: 'Action' },
];

export const PerformanceHub: React.FC = () => {
  const [timeRange, setTimeRange] = useState('1h');
  const [dimension, setDimension] = useState('wait_class');
  const [filterDimension, setFilterDimension] = useState('sql_id');
  const [selectedWaitClasses, setSelectedWaitClasses] = useState<string[]>([]);

  const hours = { '5m': 5/60, '15m': 15/60, '1h': 1, '6h': 6, '24h': 24 }[timeRange] || 1;

  const { data: aasData } = useASHAAS(hours, dimension);
  const { data: waitClasses } = useASHWaitClasses(hours);
  const { data: drilldown, isLoading: ddLoading } = useASHDDrilldown(dimension, filterDimension, hours);
  const { data: topSql, isLoading: topSqlLoading } = useASHTopSQL(hours);

  const handleTimeRangeChange = (value: string) => {
    setTimeRange(value);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight={600}>Performance Hub</Typography>
          <Typography variant="body2" color="text.secondary">
            Active Session History (ASH) Analytics
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <TimeRangeSelector value={timeRange} onChange={handleTimeRangeChange} />
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Dimension</InputLabel>
            <Select value={dimension} label="Dimension" onChange={(e) => setDimension(e.target.value)}>
              {DIMENSIONS.map(d => <MenuItem key={d.value} value={d.value}>{d.label}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Filter By</InputLabel>
            <Select value={filterDimension} label="Filter By" onChange={(e) => setFilterDimension(e.target.value)}>
              {DIMENSIONS.map(d => <MenuItem key={d.value} value={d.value}>{d.label}</MenuItem>)}
            </Select>
          </FormControl>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* AAS Chart */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Average Active Sessions (AAS)</Typography>
              <Typography variant="caption" color="text.secondary">
                Click legend to filter wait classes
              </Typography>
            </Box>
            <AASChart 
              data={aasData || []} 
              height={400}
              selectedWaitClasses={selectedWaitClasses}
              onSelectionChange={setSelectedWaitClasses}
            />
          </Paper>
        </Grid>

        {/* Wait Class Breakdown */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Wait Class Breakdown</Typography>
            <WaitClassChart data={waitClasses || []} height={350} />
          </Paper>
        </Grid>

        {/* Drilldown Tables */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, minHeight: 400 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">{dimension} by {filterDimension}</Typography>
            </Box>
            <DataTable
              rows={drilldown?.data || []}
              columns={[
                { field: 'dimensionValue', headerName: dimension, flex: 1, renderCell: (p) => p.value?.substring(0, 50) },
                { field: 'filterValue', headerName: filterDimension, flex: 1, renderCell: (p) => p.value?.substring(0, 50) },
                { field: 'samples', headerName: 'Samples', type: 'number', width: 100 },
                { field: 'aas', headerName: 'AAS', type: 'number', width: 100, renderCell: (p) => p.value.toFixed(2) },
                { field: 'pctTotal', headerName: '% Total', type: 'number', width: 100, renderCell: (p) => `${p.value.toFixed(1)}%` },
              ]}
              loading={ddLoading}
            />
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, minHeight: 400 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Top SQL by AAS</Typography>
            <DataTable
              rows={topSql || []}
              columns={[
                { field: 'sqlId', headerName: 'SQL ID', width: 140 },
                { field: 'aas', headerName: 'AAS', type: 'number', width: 100, renderCell: (p) => p.value.toFixed(2) },
                { field: 'pctDBTime', headerName: '% DB Time', type: 'number', width: 100, renderCell: (p) => `${p.value.toFixed(1)}%` },
                { field: 'sqlText', headerName: 'SQL Text', flex: 1, renderCell: (p) => p.value?.substring(0, 100) },
              ]}
              loading={topSqlLoading}
            />
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};