import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  TextField,
  Button,
  Divider,
  Switch,
  FormControlLabel,
  Slider,
  Tooltip,
  Alert,
  Snackbar,
} from '@mui/material';
import { useAuth } from '../context/AuthContext';
import {
  Person,
  Palette,
  Notifications,
  Security,
  Storage,
  Speed,
  Restore,
} from '@mui/icons-material';
import { useSettings } from '../context/SettingsContext';

const SNACKBAR_DURATION = 2500;

export const Settings: React.FC = () => {
  const { user } = useAuth();
  const { settings, updateSettings, resetSettings } = useSettings();
  const [snackbar, setSnackbar] = React.useState<string | null>(null);
  const notificationsSupported = 'Notification' in window;

  const showSaved = (message: string) => {
    setSnackbar(message);
    window.setTimeout(() => setSnackbar(null), SNACKBAR_DURATION);
  };

  const handleThemeChange = (dark: boolean) => {
    updateSettings({ theme: dark ? 'dark' : 'light' });
    showSaved('Theme preference saved');
  };

  const handleAutoRefresh = (enabled: boolean) => {
    updateSettings({ autoRefresh: enabled });
    showSaved(enabled ? 'Auto-refresh enabled' : 'Auto-refresh disabled');
  };

  const handleIntervalChange = (value: number | number[]) => {
    updateSettings({ refreshInterval: Array.isArray(value) ? value[0] : value });
  };

  const handleNotifications = async (enabled: boolean) => {
    if (enabled && notificationsSupported && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        updateSettings({ notifications: false });
        setSnackbar('Notifications permission denied by the browser');
        return;
      }
    }
    updateSettings({ notifications: enabled });
    showSaved(enabled ? 'Browser notifications enabled' : 'Browser notifications disabled');
  };

  const handleTestNotification = () => {
    if (!notificationsSupported) return;
    if (Notification.permission !== 'granted') {
      Notification.requestPermission().then((permission) => {
        if (permission === 'granted') {
          new Notification('Oracle Monitor', { body: 'Notifications are working.' });
        }
      });
      return;
    }
    new Notification('Oracle Monitor', { body: 'Notifications are working.' });
    showSaved('Test notification sent');
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" fontWeight={600}>Settings</Typography>
        <Button
          startIcon={<Restore />}
          onClick={() => { resetSettings(); showSaved('Settings reset to defaults'); }}
        >
          Reset to defaults
        </Button>
      </Box>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Person />
          Profile
        </Typography>
        <Divider sx={{ mb: 3 }} />
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="Username" value={user?.username} disabled />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="Email" value={user?.email} disabled />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="Role" value={user?.role} disabled />
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Palette />
          Appearance
        </Typography>
        <Divider sx={{ mb: 3 }} />
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Preferences are saved locally in your browser and applied automatically.
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.theme === 'dark'}
                  onChange={(e) => handleThemeChange(e.target.checked)}
                />
              }
              label="Dark Mode"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.compactMode}
                  onChange={(e) => updateSettings({ compactMode: e.target.checked })}
                />
              }
              label="Compact Mode"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              select
              label="Timezone"
              value={settings.timezone}
              onChange={(e) => updateSettings({ timezone: e.target.value })}
              fullWidth
              SelectProps={{ native: true }}
            >
              <option value="UTC">UTC</option>
              <option value="America/New_York">Eastern Time</option>
              <option value="America/Chicago">Central Time</option>
              <option value="America/Denver">Mountain Time</option>
              <option value="America/Los_Angeles">Pacific Time</option>
              <option value="Europe/London">London</option>
              <option value="Europe/Paris">Paris</option>
              <option value="Asia/Tokyo">Tokyo</option>
              <option value="Asia/Shanghai">Shanghai</option>
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              select
              label="Language"
              value={settings.language}
              onChange={(e) => updateSettings({ language: e.target.value })}
              fullWidth
              SelectProps={{ native: true }}
            >
              <option value="en">English</option>
              <option value="fr">French</option>
              <option value="de">German</option>
              <option value="es">Spanish</option>
              <option value="ja">Japanese</option>
              <option value="zh">Chinese</option>
            </TextField>
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Speed />
          Monitoring
        </Typography>
        <Divider sx={{ mb: 3 }} />
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.autoRefresh}
                  onChange={(e) => handleAutoRefresh(e.target.checked)}
                />
              }
              label="Auto Refresh Enabled"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.notifications}
                  onChange={(e) => handleNotifications(e.target.checked)}
                  disabled={!notificationsSupported}
                />
              }
              label="Browser Notifications"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.soundAlerts}
                  onChange={(e) => updateSettings({ soundAlerts: e.target.checked })}
                />
              }
              label="Sound Alerts"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="body2" sx={{ mb: 1 }}>
              Refresh Interval: {settings.refreshInterval}s
            </Typography>
            <Slider
              value={settings.refreshInterval}
              onChange={(_, v) => handleIntervalChange(v)}
              min={5}
              max={120}
              step={5}
              marks={[
                { value: 5, label: '5s' },
                { value: 15, label: '15s' },
                { value: 30, label: '30s' },
                { value: 60, label: '1m' },
                { value: 120, label: '2m' },
              ]}
              valueLabelDisplay="auto"
              sx={{ width: '100%', maxWidth: 400 }}
            />
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Security />
          Security
        </Typography>
        <Divider sx={{ mb: 3 }} />
        <Alert severity="info" sx={{ mb: 2 }}>
          Password, API key, and session management require server-side support and are not
          available in this deployment.
        </Alert>
        <Grid container spacing={3}>
          {['Change Password', 'Manage API Keys', 'Two-Factor Authentication', 'Session Management'].map((label) => (
            <Grid item xs={12} sm={6} key={label}>
              <Tooltip title="Requires server-side support (not available)">
                <span>
                  <Button variant="outlined" fullWidth startIcon={<Security />} disabled>
                    {label}
                  </Button>
                </span>
              </Tooltip>
            </Grid>
          ))}
        </Grid>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Storage />
          Data Retention
        </Typography>
        <Divider sx={{ mb: 3 }} />
        <Alert severity="info" sx={{ mb: 2 }}>
          Retention is configured by the server administrator.
        </Alert>
        <Grid container spacing={3}>
          {['Metrics Retention (days)', 'Alert History Retention (days)', 'SQL Monitor Retention (days)'].map((label) => (
            <Grid item xs={12} sm={6} key={label}>
              <TextField
                type="number"
                label={label}
                defaultValue={label.includes('SQL Monitor') ? 7 : 30}
                fullWidth
                disabled
                InputProps={{ inputProps: { min: 1, max: 365 } }}
              />
            </Grid>
          ))}
        </Grid>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Notifications />
          Notifications
        </Typography>
        <Divider sx={{ mb: 3 }} />
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <Button
              variant="outlined"
              fullWidth
              startIcon={<Notifications />}
              onClick={handleTestNotification}
              disabled={!notificationsSupported}
            >
              Send test notification
            </Button>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="body2" color="text.secondary" sx={{ pt: 1 }}>
              Permission status:{' '}
              {notificationsSupported
                ? Notification.permission === 'granted'
                  ? 'Granted'
                  : Notification.permission === 'denied'
                    ? 'Denied by browser'
                    : 'Not requested'
                : 'Not supported by this browser'}
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>About</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={4}>
            <Typography variant="body2" color="text.secondary">Version</Typography>
            <Typography variant="body1" fontWeight={500}>1.0.0</Typography>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Typography variant="body2" color="text.secondary">Frontend</Typography>
            <Typography variant="body1" fontWeight={500}>React 18 + MUI v5</Typography>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Typography variant="body2" color="text.secondary">Backend</Typography>
            <Typography variant="body1" fontWeight={500}>FastAPI + Oracle 23c</Typography>
          </Grid>
        </Grid>
      </Paper>

      <Snackbar
        open={Boolean(snackbar)}
        autoHideDuration={2000}
        onClose={() => setSnackbar(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        message={snackbar}
      />
    </Box>
  );
};