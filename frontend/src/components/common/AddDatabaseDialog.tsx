import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  Alert,
  CircularProgress,
} from '@mui/material';
import { useAddDatabase } from '../../api/hooks/useDatabases';

interface AddDatabaseDialogProps {
  open: boolean;
  onClose: () => void;
}

const initialForm = {
  name: '',
  host: '',
  port: '1521',
  serviceName: '',
  username: '',
  password: '',
};

export const AddDatabaseDialog: React.FC<AddDatabaseDialogProps> = ({ open, onClose }) => {
  const addDatabase = useAddDatabase();
  const [form, setForm] = useState(initialForm);
  const [tested, setTested] = useState(false);

  const set = (key: keyof typeof initialForm) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setForm((prev) => ({ ...prev, [key]: event.target.value }));
    setTested(false);
  };

  const reset = () => {
    setForm(initialForm);
    setTested(false);
    addDatabase.reset();
    onClose();
  };

  const handleAdd = async () => {
    try {
      await addDatabase.mutateAsync({
        name: form.name,
        host: form.host,
        port: parseInt(form.port, 10) || 1521,
        serviceName: form.serviceName,
        username: form.username,
        password: form.password,
        isDefault: false,
      });
      setTested(true);
      setTimeout(reset, 1200);
    } catch {
      // error surfaced via addDatabase.isError
    }
  };

  const canSubmit =
    form.name.trim() &&
    form.host.trim() &&
    form.serviceName.trim() &&
    form.username.trim() &&
    form.password.trim();

  return (
    <Dialog open={open} onClose={reset} fullWidth maxWidth="sm">
      <DialogTitle>Add database connection</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField label="Name" value={form.name} onChange={set('name')} required />
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="Host"
              value={form.host}
              onChange={set('host')}
              required
              sx={{ flex: 2 }}
            />
            <TextField
              label="Port"
              value={form.port}
              onChange={set('port')}
              type="number"
              sx={{ flex: 1 }}
            />
          </Box>
          <TextField
            label="Service name"
            value={form.serviceName}
            onChange={set('serviceName')}
            required
          />
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="Username"
              value={form.username}
              onChange={set('username')}
              required
              sx={{ flex: 1 }}
            />
            <TextField
              label="Password"
              type="password"
              value={form.password}
              onChange={set('password')}
              required
              sx={{ flex: 1 }}
            />
          </Box>

          <Typography variant="caption" color="text.secondary">
            The connection is tested before being saved. Only reachable databases are added.
          </Typography>

          {tested && !addDatabase.isError && (
            <Alert severity="success">Connection tested successfully.</Alert>
          )}
          {addDatabase.isError && (
            <Alert severity="error">
              {(addDatabase.error as Error)?.message || 'Failed to add database'}
            </Alert>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={reset}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleAdd}
          disabled={!canSubmit || addDatabase.isPending}
          startIcon={addDatabase.isPending ? <CircularProgress size={16} /> : undefined}
        >
          {addDatabase.isPending ? 'Testing & adding...' : 'Add database'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};