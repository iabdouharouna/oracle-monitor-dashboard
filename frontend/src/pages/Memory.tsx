import React, { useState } from 'react';
import { Box, Typography, Paper, Grid, Tab } from '@mui/material';
import { TabContext, TabList, TabPanel } from '@mui/lab';
import { useAllMemoryAdvice } from '../api/hooks/useMemory';
import { useMemory } from '../api/hooks/useInstance';
import { MemoryBreakdown, DataTable, KPICard, LoadingSkeleton } from '../components/common';
import { Memory as MemoryIcon, TrendingUp, Assessment, Settings } from '@mui/icons-material';

export const Memory: React.FC = () => {
  const [tab, setTab] = useState('0');
  const { data: allAdvice, isLoading } = useAllMemoryAdvice();
  const { data: memory } = useMemory();

  if (isLoading && !allAdvice) {
    return <LoadingSkeleton variant="card" />;
  }

  const sga = allAdvice?.find(a => a.parameter === 'SGA Target');
  const pga = allAdvice?.find(a => a.parameter === 'PGA Target');
  const memTarget = allAdvice?.find(a => a.parameter === 'Memory Target');

  const sharedPoolFreeMB = memory?.sga?.sharedPoolFreeMB || 0;
  const sharedPoolTotalMB = memory?.sga?.sharedPoolMB || 0;
  const sharedPoolFreePct = sharedPoolTotalMB > 0 ? (sharedPoolFreeMB / sharedPoolTotalMB) * 100 : 0;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" fontWeight={600}>Memory</Typography>
        <Typography variant="body2" color="text.secondary">
          SGA / PGA configuration and advisor recommendations
        </Typography>
      </Box>

      {/* Memory Breakdown - would come from Instance Viewer */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Current Memory Configuration</Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, height: '100%' }}>
              <Typography variant="h6" sx={{ mb: 2 }}>SGA Breakdown</Typography>
              <MemoryBreakdown 
                sga={{ 
                  bufferCacheMB: memory?.sga?.bufferCacheMB || 0, 
                  sharedPoolMB: memory?.sga?.sharedPoolMB || 0, 
                  largePoolMB: memory?.sga?.largePoolMB || 0, 
                  javaPoolMB: memory?.sga?.javaPoolMB || 0, 
                  streamsPoolMB: memory?.sga?.streamsPoolMB || 0, 
                  redoLogBufferMB: memory?.sga?.redoLogBufferMB || 0 
                }} 
                pga={{ totalAllocatedMB: memory?.pga?.totalAllocatedMB || 0, totalUsedMB: memory?.pga?.totalUsedMB || 0 }} 
              />
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, height: '100%' }}>
              <Typography variant="h6" sx={{ mb: 2 }}>PGA Breakdown</Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <KPICard title="Aggregate Target" value={String(memory?.pga?.aggregateTargetMB?.toFixed(1) || '0')} unit="MB" icon={<MemoryIcon />} />
                </Grid>
                <Grid item xs={6}>
                  <KPICard title="Total Allocated" value={String(memory?.pga?.totalAllocatedMB?.toFixed(1) || '0')} unit="MB" icon={<MemoryIcon />} />
                </Grid>
                <Grid item xs={6}>
                  <KPICard title="Total Used" value={String(memory?.pga?.totalUsedMB?.toFixed(1) || '0')} unit="MB" icon={<MemoryIcon />} />
                </Grid>
                <Grid item xs={6}>
                  <KPICard title="Cache Hit %" value={String(memory?.pga?.cacheHitPercentage?.toFixed(1) || '0')} unit="%" icon={<MemoryIcon />} />
                </Grid>
                <Grid item xs={6}>
                  <KPICard title="Max Allocated" value={String(memory?.pga?.maxAllocatedMB?.toFixed(1) || '0')} unit="MB" icon={<MemoryIcon />} />
                </Grid>
              </Grid>
            </Paper>
          </Grid>
        </Grid>
      </Paper>

      {/* Advisors */}
      <TabContext value={tab}>
        <TabList sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }} onChange={(_, v) => setTab(String(v))}>
          <Tab label="SGA Advisor" icon={<Assessment />} />
          <Tab label="PGA Advisor" icon={<Assessment />} />
          <Tab label="Memory Target Advisor" icon={<Assessment />} />
        </TabList>

        <TabPanel value="0" sx={{ p: 0 }}>
          {sga && (
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>SGA Target Advisor</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Current SGA size factor: 1.0 (100%). Values &gt;100% indicate benefit of increasing SGA.
              </Typography>
              <DataTable
                rows={sga.advice || []}
                columns={[
                  { field: 'parameterValue', headerName: 'SGA Size Factor (%)', type: 'number', width: 180, renderCell: (p) => `${p.value}%` },
                  { field: 'estdDBTime', headerName: 'Est. DB Time Factor (%)', type: 'number', width: 180, renderCell: (p) => `${p.value}%` },
                  { field: 'estdPhysicalReads', headerName: 'Est. Physical Reads Factor (%)', type: 'number', width: 220, renderCell: (p) => `${p.value}%` },
                  { field: 'benefitPct', headerName: 'Benefit (%)', type: 'number', width: 120, renderCell: (p) => `${p.value >= 0 ? '+' : ''}${p.value.toFixed(1)}%` },
                ]}
              />
            </Paper>
          )}
        </TabPanel>

        <TabPanel value="1" sx={{ p: 0 }}>
          {pga && (
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>PGA Target Advisor</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Current PGA target factor: 1.0 (100%).
              </Typography>
              <DataTable
                rows={pga.advice || []}
                columns={[
                  { field: 'parameterValue', headerName: 'PGA Target Factor (%)', type: 'number', width: 180, renderCell: (p) => `${p.value}%` },
                  { field: 'estdDBTime', headerName: 'Est. DB Time Factor (%)', type: 'number', width: 180, renderCell: (p) => `${p.value}%` },
                  { field: 'estdPhysicalReads', headerName: 'Est. Physical Reads Factor (%)', type: 'number', width: 220, renderCell: (p) => `${p.value}%` },
                  { field: 'benefitPct', headerName: 'Benefit (%)', type: 'number', width: 120, renderCell: (p) => `${p.value >= 0 ? '+' : ''}${p.value.toFixed(1)}%` },
                ]}
              />
            </Paper>
          )}
        </TabPanel>

        <TabPanel value="2" sx={{ p: 0 }}>
          {memTarget && (
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>Memory Target Advisor (AMM)</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Automatic Memory Management target advisor.
              </Typography>
              <DataTable
                rows={memTarget.advice || []}
                columns={[
                  { field: 'parameterValue', headerName: 'Memory Size Factor (%)', type: 'number', width: 180, renderCell: (p) => `${p.value}%` },
                  { field: 'estdDBTime', headerName: 'Est. DB Time Factor (%)', type: 'number', width: 180, renderCell: (p) => `${p.value}%` },
                  { field: 'estdPhysicalReads', headerName: 'Est. Physical Reads Factor (%)', type: 'number', width: 220, renderCell: (p) => `${p.value}%` },
                  { field: 'benefitPct', headerName: 'Benefit (%)', type: 'number', width: 120, renderCell: (p) => `${p.value >= 0 ? '+' : ''}${p.value.toFixed(1)}%` },
                ]}
              />
            </Paper>
          )}
        </TabPanel>
      </TabContext>

      {/* Key Metrics */}
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Key Ratios</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <KPICard title="Buffer Cache Hit Ratio" value={String(memory?.bufferCacheHitRatio?.toFixed(2) || '0')} unit="%" icon={<MemoryIcon />} />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <KPICard title="Library Cache Hit Ratio" value={String(memory?.libraryCacheHitRatio?.toFixed(2) || '0')} unit="%" icon={<Settings />} />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <KPICard title="PGA Cache Hit Ratio" value={String(memory?.pga?.cacheHitPercentage?.toFixed(2) || '0')} unit="%" icon={<MemoryIcon />} />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <KPICard title="Shared Pool Free %" value={String(sharedPoolFreePct.toFixed(2))} unit="%" icon={<TrendingUp />} />
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
};