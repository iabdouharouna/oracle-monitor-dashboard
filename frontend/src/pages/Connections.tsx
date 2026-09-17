import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Card,
  CardContent,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import { Add, LinkOff, Storage, CheckCircle, Error as ErrorIcon } from '@mui/icons-material';
import { useDatabases, useRemoveDatabase } from '../api/hooks/useDatabases';
import { AddDatabaseDialog } from '../components/common/AddDatabaseDialog';
import { useAuth } from '../context/AuthContext';

export const Connections: React.FC = () => {
  const { user } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [snackbar, setSnackbar] = useState<string | null>(null);
  const { data: databases = [], isLoading } = useDatabases();
  const removeDatabase = useRemoveDatabase();

  const isDBA = user?.role === 'DBA';

  const handleRemove = async (configName: string) => {
    try {
      await removeDatabase.mutateAsync(configName);
      setSnackbar(`Database '${configName}' removed`);
    } catch {
      setSnackbar(`Failed to remove '${configName}'`);
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (databases.length === 0) {
    return (
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
          Database Connections
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
          No Oracle database is configured yet. Enroll your first database to start monitoring.
        </Typography>

        <Card sx={{ maxWidth: 560, mx: 'auto', mt: 6, borderRadius: 3, boxShadow: 3 }}>
          <CardContent sx={{ textAlign: 'center', p: 5 }}>
            <Box sx={{ bgcolor: 'primary.main', width: 72, height: 72, borderRadius: '50%', mx: 'auto', mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Storage sx={{ fontSize: 40, color: 'common.white' }} />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
              No databases registered
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Enroll your Oracle databases to enable monitoring: metrics, sessions, storage,
              wait events and alerts will start flowing automatically.
            </Typography>
            {isDBA ? (
              <Button variant="contained" size="large" startIcon={<Add />} onClick={() => setDialogOpen(true)}>
                Enroll your first database
              </Button>
            ) : (
              <Alert severity="info" sx={{ mx: 'auto', maxWidth: 380 }}>
                You have read-only access. Ask an administrator (DBA) to enroll a database.
              </Alert>
            )}
          </CardContent>
        </Card>

        <AddDatabaseDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            Database Connections
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {databases.length} database{databases.length > 1 ? 's' : ''} enrolled
          </Typography>
        </Box>
        {isDBA && (
          <Button variant="contained" startIcon={<Add />} onClick={() => setDialogOpen(true)}>
            Add database
          </Button>
        )}
      </Box>

      <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Connection</TableCell>
              <TableCell>Endpoint</TableCell>
              <TableCell>Username</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Latency</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {databases.map((db) => (
              <TableRow key={db.configName} hover>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Storage fontSize="small" color="action" />
                    <Box>
                      <Typography variant="body2" fontWeight={600}>
                        {db.name}
                      </Typography>
                      {db.configName !== db.name && (
                        <Typography variant="caption" color="text.secondary">
                          alias: {db.configName}
                        </Typography>
                      )}
                    </Box>
                    {db.isDefault && <Chip label="default" size="small" color="primary" sx={{ height: 18, fontSize: 10 }} />}
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {db.host}:{db.port}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {db.serviceName || 'no service'}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">{db.username}</Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    icon={db.status === 'ONLINE' ? <CheckCircle /> : <ErrorIcon />}
                    label={db.status}
                    size="small"
                    color={db.status === 'ONLINE' ? 'success' : 'error'}
                    variant="outlined"
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2">{db.latencyMs != null ? `${db.latencyMs} ms` : 'n/a'}</Typography>
                </TableCell>
                <TableCell align="right">
                  {isDBA && (
                    <Tooltip title={`Remove '${db.configName}'`}>
                      <IconButton size="small" color="error" onClick={() => handleRemove(db.configName)}>
                        <LinkOff fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <AddDatabaseDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
      <Snackbar open={Boolean(snackbar)} autoHideDuration={3000} onClose={() => setSnackbar(null)} message={snackbar} />
    </Box>
  );
};