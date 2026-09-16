import React, { useState } from 'react';
import { Box, Typography, Paper, Grid, Button, FormControl, InputLabel, Select, MenuItem, Dialog, DialogTitle, DialogContent, DialogActions, Divider } from '@mui/material';
import { PictureAsPdf, TableChart, Description, Download, Refresh } from '@mui/icons-material';
import { useAWRSnapshots, useGenerateAWRReport } from '../api/hooks/usePerformance';
import type { AWRReport } from '../types/api';

export const Reports: React.FC = () => {
  const [reportType, setReportType] = useState('awr');
  const [reportFormat, setReportFormat] = useState('html');
  const [selectedSnaps, setSelectedSnaps] = useState<{ start: number | null; end: number | null }>({ start: null, end: null });
  const [reportDialog, setReportDialog] = useState<AWRReport | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const { data: snapshots = [], isLoading: loadingSnapshots, refetch: refetchSnapshots } = useAWRSnapshots();
  const reportMutation = useGenerateAWRReport();

  const handleGenerate = async () => {
    if (!selectedSnaps.start || !selectedSnaps.end) return;
    setGenerateError(null);
    try {
      const report = await reportMutation.mutateAsync({
        snapIdStart: selectedSnaps.start,
        snapIdEnd: selectedSnaps.end,
        reportType: reportFormat,
      });
      setReportDialog(report);
    } catch (err) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setGenerateError(detail || (err instanceof Error ? err.message : 'Failed to generate report'));
      console.error('AWR report generation failed', err);
    }
  };

  const handleExport = (format: 'html' | 'text') => {
    if (!reportDialog) return;
    const content = reportDialog.html;
    const blob = new Blob([content], { type: format === 'html' ? 'text/html' : 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `AWR_Report_${reportDialog.snapIdStart}-${reportDialog.snapIdEnd}.${format === 'html' ? 'html' : 'txt'}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const isGenerating = reportMutation.isPending;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" fontWeight={600}>Reports</Typography>
        <Typography variant="body2" color="text.secondary">
          Generate and export performance reports
        </Typography>
      </Box>

      {/* Report Type Selection */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Select Report Type</Typography>
        <Grid container spacing={2}>
          {[
            { id: 'awr', label: 'AWR Report', icon: <Description />, desc: 'Automatic Workload Repository report for a snapshot range' },
            { id: 'ash', label: 'ASH Report', icon: <TableChart />, desc: 'Active Session History report for a time period' },
          ].map((r) => (
            <Grid item xs={12} sm={6} md={3} key={r.id}>
              <Paper
                sx={{ 
                  p: 2, 
                  cursor: 'pointer',
                  border: reportType === r.id ? '2px solid' : 1,
                  borderColor: reportType === r.id ? 'primary.main' : 'divider',
                  transition: 'all 0.2s',
                }}
                onClick={() => setReportType(r.id)}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  {r.icon}
                  <Typography variant="subtitle2" fontWeight={600}>{r.label}</Typography>
                </Box>
                <Typography variant="caption" color="text.secondary">{r.desc}</Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Paper>

      {/* AWR Report Config */}
      {reportType === 'awr' && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">AWR Report Configuration</Typography>
            <Button size="small" startIcon={<Refresh />} onClick={() => refetchSnapshots()}>Refresh Snapshots</Button>
          </Box>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Start Snapshot</InputLabel>
                <Select
                  value={selectedSnaps.start ?? ''}
                  label="Start Snapshot"
                  onChange={(e) => setSelectedSnaps({ ...selectedSnaps, start: e.target.value ? parseInt(e.target.value as string) : null })}
                  disabled={loadingSnapshots}
                >
                  {snapshots.map(s => <MenuItem key={s.snapId} value={s.snapId}>#{s.snapId} - {s.beginTime} ({s.durationMin} min)</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>End Snapshot</InputLabel>
                <Select
                  value={selectedSnaps.end ?? ''}
                  label="End Snapshot"
                  onChange={(e) => setSelectedSnaps({ ...selectedSnaps, end: e.target.value ? parseInt(e.target.value as string) : null })}
                  disabled={loadingSnapshots}
                >
                  {snapshots.map(s => <MenuItem key={s.snapId} value={s.snapId}>#{s.snapId} - {s.endTime} ({s.durationMin} min)</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Report Format</InputLabel>
                <Select value={reportFormat} label="Format" onChange={(e) => setReportFormat(e.target.value)}>
                  <MenuItem value="html">HTML</MenuItem>
                  <MenuItem value="text">Text</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
          {!loadingSnapshots && snapshots.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              No AWR snapshots found. Snapshots are captured hourly by Oracle.
            </Typography>
          )}
          <Divider sx={{ my: 2 }} />
          {generateError && (
            <Box component="div" role="alert" sx={{ mb: 2, p: 1.5, bgcolor: 'error.light', color: 'error.contrastText', borderRadius: 1, fontSize: '0.875rem' }}>
              {generateError}
            </Box>
          )}
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button variant="contained" onClick={handleGenerate} startIcon={<PictureAsPdf />} disabled={isGenerating || !selectedSnaps.start || !selectedSnaps.end}>
              {isGenerating ? 'Generating...' : 'Generate AWR Report'}
            </Button>
            {reportDialog && (
              <>
                <Button variant="outlined" onClick={() => handleExport('html')} startIcon={<Download />}>Export HTML</Button>
                <Button variant="outlined" onClick={() => handleExport('text')} startIcon={<Description />} disabled={reportDialog.reportType !== 'text'}>Export Text</Button>
                <Button variant="outlined" onClick={() => setReportDialog(null)}>Close</Button>
              </>
            )}
          </Box>
        </Paper>
      )}

      {/* ASH Report Config */}
      {reportType === 'ash' && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>ASH Report Configuration</Typography>
          <Typography variant="body2" color="text.secondary">
            ASH analysis is available in the Performance page. Use the ASH timeline there to inspect active session history.
          </Typography>
        </Paper>
      )}

      {/* Generated Report */}
      <Dialog open={!!reportDialog} onClose={() => setReportDialog(null)} maxWidth="lg" fullWidth>
        <DialogTitle>AWR Report - Snapshot {reportDialog?.snapIdStart} to {reportDialog?.snapIdEnd}</DialogTitle>
        <DialogContent dividers>
          {reportDialog && reportDialog.reportType === 'html' && reportDialog.html.includes('<html') ? (
            <iframe
              title="AWR Report"
              srcDoc={reportDialog.html}
              style={{ width: '100%', height: '70vh', border: 'none' }}
            />
          ) : (
            <Box component="pre" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: '70vh', overflow: 'auto', fontSize: '0.75rem' }}>
              {reportDialog?.html}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => handleExport('html')}>Export HTML</Button>
          <Button onClick={() => handleExport('text')}>Export Text</Button>
          <Button onClick={() => setReportDialog(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};