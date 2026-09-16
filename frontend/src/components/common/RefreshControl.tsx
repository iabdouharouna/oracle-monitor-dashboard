import React, { useState } from 'react';
import { Menu, MenuItem, IconButton, Tooltip, Box, Typography } from '@mui/material';
import { Refresh, Schedule, PauseCircleOutline, PlayCircleOutline } from '@mui/icons-material';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import { useSettings } from '../../context/SettingsContext';

const REFRESH_OPTIONS = [
  { value: 5, label: '5 seconds' },
  { value: 15, label: '15 seconds' },
  { value: 30, label: '30 seconds' },
  { value: 60, label: '1 minute' },
  { value: 0, label: 'Off' },
];

export const RefreshControl: React.FC<{
  defaultInterval?: number;
  onManualRefresh?: () => void;
}> = ({
  defaultInterval,
  onManualRefresh,
}) => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const { settings } = useSettings();
  const effectiveInterval = defaultInterval ?? settings.refreshInterval;
  const { interval, isEnabled, setInterval, toggleEnabled, lastRefresh, nextRefresh } = useAutoRefresh({
    defaultInterval: effectiveInterval,
    enabled: settings.autoRefresh,
    onRefresh: onManualRefresh,
  });

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleIntervalChange = (value: number) => {
    setInterval(value);
    handleMenuClose();
  };

  const formatTime = (date: Date | null) => {
    if (!date) return 'Never';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Tooltip title={isEnabled ? 'Pause auto-refresh' : 'Resume auto-refresh'}>
        <IconButton
          onClick={toggleEnabled}
          color={isEnabled ? 'primary' : 'default'}
          size="small"
          aria-label={isEnabled ? 'Pause' : 'Play'}
        >
          {isEnabled ? <PauseCircleOutline fontSize="small" /> : <PlayCircleOutline fontSize="small" />}
        </IconButton>
      </Tooltip>

      <Tooltip title="Refresh now">
        <IconButton onClick={onManualRefresh} size="small" aria-label="Refresh">
          <Refresh fontSize="small" />
        </IconButton>
      </Tooltip>

      <IconButton onClick={handleMenuOpen} size="small" aria-label="Refresh interval">
        <Schedule fontSize="small" />
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem disabled sx={{ fontWeight: 600, py: 1 }}>
          <Typography variant="caption">Auto-refresh interval</Typography>
        </MenuItem>
        {REFRESH_OPTIONS.map((opt) => (
          <MenuItem
            key={opt.value}
            onClick={() => handleIntervalChange(opt.value)}
            selected={interval === opt.value}
          >
            {opt.label}
            {interval === opt.value && ' ✓'}
          </MenuItem>
        ))}
        <MenuItem disabled sx={{ py: 1 }}>
          <Typography variant="caption" color="text.secondary">
            Last: {formatTime(lastRefresh)} | Next: {formatTime(nextRefresh)}
          </Typography>
        </MenuItem>
      </Menu>
    </Box>
  );
};