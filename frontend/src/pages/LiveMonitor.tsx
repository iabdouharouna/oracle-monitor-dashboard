import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Box, Typography, Paper, Grid, Chip, Alert } from '@mui/material';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useLiveWaits } from '../api/hooks/useWaits';
import { LiveWaits } from '../types/api';
import { DataTable } from '../components/common';
import { WAIT_CLASS_COLORS, WAIT_CLASSES, gradientId } from '../components/charts/waitClassColors';
import { Memory, People, Timer } from '@mui/icons-material';

const MAX_SAMPLES = 200;
const POLL_MS = 1500;
const ACTIVE_WINDOW_SAMPLES = 80; // ~2 minutes at 1.5s

export const LiveMonitor: React.FC = () => {
  const { data, error } = useLiveWaits(POLL_MS);
  const samplesRef = useRef<Array<Record<string, any>>>([]);
  const [samples, setSamples] = useState<Array<Record<string, any>>>([]);
  const [showAllClasses, setShowAllClasses] = useState(false);
  const unknownClassesRef = useRef<Set<string>>(new Set());
  const lastDataRef = useRef<LiveWaits | null>(null);

  const pushSample = () => {
    const src = lastDataRef.current;
    if (!src) return;
    const ts = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const entry: Record<string, any> = { timestamp: ts };
    for (const wc of src.waitClasses) {
      entry[wc.waitClass] = wc.sessionCount;
      if (!WAIT_CLASSES.includes(wc.waitClass)) unknownClassesRef.current.add(wc.waitClass);
    }
    const arr = [...samplesRef.current, entry];
    if (arr.length > MAX_SAMPLES) arr.shift();
    samplesRef.current = arr;
    setSamples(arr);
  };

  useEffect(() => {
    if (!data) return;
    lastDataRef.current = data;
    pushSample();
  }, [data]);

  useEffect(() => {
    const id = window.setInterval(pushSample, POLL_MS);
    return () => window.clearInterval(id);
  }, []);

  const allClasses = useMemo(() => {
    const s = new Set<string>(WAIT_CLASSES);
    for (const sample of samples) {
      for (const k of Object.keys(sample)) {
        if (k !== 'timestamp') s.add(k);
      }
    }
    for (const k of unknownClassesRef.current) s.add(k);
    return Array.from(s);
  }, [samples]);

  const activeClasses = useMemo(() => {
    const windowEnd = samples.length;
    const windowStart = Math.max(0, windowEnd - ACTIVE_WINDOW_SAMPLES);
    const count = new Map<string, number>();
    for (let i = windowStart; i < windowEnd; i++) {
      for (const [k, v] of Object.entries(samples[i])) {
        if (k === 'timestamp') continue;
        if (typeof v === 'number' && v > 0) count.set(k, (count.get(k) || 0) + v);
      }
    }
    return Array.from(count.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([k]) => k);
  }, [samples]);

  const visibleClasses = showAllClasses ? allClasses : activeClasses;

  const normalizedSamples = useMemo(
    () => samples.map((sn) => {
      const row: Record<string, any> = { timestamp: sn.timestamp };
      for (const wc of visibleClasses) row[wc] = sn[wc] ?? 0;
      return row;
    }),
    [samples, visibleClasses],
  );

  const currentWaits = data?.waitClasses || [];
  const activeSessions = data?.sessions || [];
  const totalActive = data?.totalActive || 0;
  const totalOnCpu = currentWaits.find(w => w.waitClass === 'ON CPU')?.sessionCount || 0;
  const totalWaiting = totalActive - totalOnCpu;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" fontWeight={600}>Live Wait Monitor</Typography>
          <Typography variant="body2" color="text.secondary">
            Real-time wait event sampling (1.5s) · DBTimeMonitor-style view
          </Typography>
        </Box>
        <Chip
          label={<span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#26A269', display: 'inline-block', animation: 'pulse 2s infinite' }} />
            LIVE
          </span>}
          color="success"
          variant="outlined"
          sx={{ fontWeight: 600 }}
        />
      </Box>

      {error && <Alert severity="error">Connection error: {(error as Error).message}</Alert>}

      {/* KPI row */}
      <Grid container spacing={2}>
        {[
          { label: 'Active Sessions', value: totalActive, icon: <People />, color: totalActive > 10 ? 'error' : totalActive > 5 ? 'warning' : 'success' as const },
          { label: 'On CPU', value: totalOnCpu, icon: <Memory />, color: 'success' as const },
          { label: 'Waiting', value: totalWaiting, icon: <Timer />, color: 'warning' as const },
          ...currentWaits
            .filter(w => w.waitClass !== 'ON CPU')
            .slice(0, 4)
            .map(w => ({
              label: w.waitClass,
              value: w.sessionCount,
              icon: <span style={{ width: 12, height: 12, borderRadius: 3, background: WAIT_CLASS_COLORS[w.waitClass] || '#999', display: 'inline-block' }} />,
              color: 'default' as const,
            })),
        ].map((kpi, i) => (
          <Grid item xs={6} sm={4} md={2} key={i}>
            <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 0.5, height: '100%' }}>
              <Typography variant="caption" color="text.secondary">{kpi.label}</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {kpi.icon}
                <Typography variant="h5" fontWeight={700}>{kpi.value}</Typography>
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Stacked area chart — rolling timeline */}
      <Paper sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, gap: 2, flexWrap: 'wrap' }}>
          <Typography variant="h6">Database Time Distribution (last {Math.round(normalizedSamples.length * 1.5 / 60)} min)</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip
              label={visibleClasses.length === 0 ? 'No active waits' : `${visibleClasses.length} class${visibleClasses.length > 1 ? 'es' : ''} active`}
              size="small"
              color={activeClasses.length > 0 ? 'info' : 'default'}
              variant="outlined"
            />
            <Chip
              label={showAllClasses ? 'Hide idle classes' : 'Show all classes'}
              size="small"
              color={showAllClasses ? 'secondary' : 'default'}
              variant={showAllClasses ? 'filled' : 'outlined'}
              onClick={() => setShowAllClasses(v => !v)}
              sx={{ cursor: 'pointer' }}
            />
          </Box>
        </Box>
        <Box sx={{ height: 320 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={normalizedSamples} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
              <defs>
                {visibleClasses.map((wc) => (
                  <linearGradient key={wc} id={gradientId(wc)} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={WAIT_CLASS_COLORS[wc] || '#9CA3AF'} stopOpacity={0.9} />
                    <stop offset="95%" stopColor={WAIT_CLASS_COLORS[wc] || '#9CA3AF'} stopOpacity={0.6} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E1E4E8" vertical={false} />
              <XAxis
                dataKey="timestamp"
                tick={{ fontSize: 10, fill: '#605E5C' }}
                axisLine={{ stroke: '#E1E4E8' }}
                tickLine={false}
                interval={Math.max(0, Math.floor(samples.length / 15))}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#605E5C' }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
                label={{ value: 'Active Sessions', angle: -90, position: 'insideLeft', offset: -10, fill: '#605E5C', fontSize: 11 }}
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #E1E4E8', borderRadius: 4 }}
                formatter={(value: number, name: string) => [value, name]}
                labelFormatter={(label) => `Time: ${label}`}
              />
              <Legend
                layout="horizontal"
                align="center"
                verticalAlign="top"
                iconType="circle"
                wrapperStyle={{ paddingBottom: 10 }}
              />
              {visibleClasses.map((wc) => (
                <Area
                  key={wc}
                  type="monotone"
                  dataKey={wc}
                  stackId="live"
                  stroke={WAIT_CLASS_COLORS[wc] || '#9CA3AF'}
                  fill={`url(#${gradientId(wc)})`}
                  strokeWidth={1.5}
                  isAnimationActive={false}
                  connectNulls={false}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </Box>
      </Paper>

      {/* Sessions table */}
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Active Sessions ({activeSessions.length})</Typography>
        <DataTable
          rows={activeSessions.map((s, i) => ({ id: i, ...s }))}
          columns={[
            { field: 'sid', headerName: 'SID', width: 70 },
            { field: 'username', headerName: 'User', width: 100 },
            { field: 'waitClass', headerName: 'Wait Class', width: 130, renderCell: (p) => (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: WAIT_CLASS_COLORS[p.value as string] || '#999', display: 'inline-block' }} />
                {p.value}
              </Box>
            )},
            { field: 'event', headerName: 'Event', flex: 1, minWidth: 160 },
            { field: 'state', headerName: 'State', width: 110 },
            { field: 'secondsInWait', headerName: 'Sec Wait', type: 'number', width: 90 },
            { field: 'program', headerName: 'Program', width: 150, renderCell: (p) => (p.value || '').replace('/app/.venv/bin/python', 'python') },
            { field: 'sqlId', headerName: 'SQL ID', width: 110 },
          ]}
          pageSize={20}
        />
      </Paper>

      {/* Style pulse animation */}
      <style>{`@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
    </Box>
  );
};
