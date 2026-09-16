import React from 'react';
import { Menu, MenuItem, Button, Box, Typography, InputAdornment, TextField, IconButton } from '@mui/material';
import { Schedule, CalendarToday } from '@mui/icons-material';
import { useState } from 'react';
import { format } from 'date-fns';

const TIME_RANGES = [
  { value: '5m', label: 'Last 5 minutes', hours: 5/60 },
  { value: '15m', label: 'Last 15 minutes', hours: 15/60 },
  { value: '1h', label: 'Last hour', hours: 1 },
  { value: '6h', label: 'Last 6 hours', hours: 6 },
  { value: '24h', label: 'Last 24 hours', hours: 24 },
  { value: '7d', label: 'Last 7 days', hours: 168 },
  { value: '30d', label: 'Last 30 days', hours: 720 },
];

interface TimeRangeSelectorProps {
  value: string;
  onChange: (value: string) => void;
  customRange?: { start: Date; end: Date };
  onCustomRangeChange?: (range: { start: Date; end: Date }) => void;
}

export const TimeRangeSelector: React.FC<TimeRangeSelectorProps> = ({ 
  value, 
  onChange, 
  customRange,
  onCustomRangeChange,
}) => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [showCustom, setShowCustom] = useState(false);
  const [customStart, setCustomStart] = useState<Date | null>(customRange?.start || null);
  const [customEnd, setCustomEnd] = useState<Date | null>(customRange?.end || null);

  const isCustom = !TIME_RANGES.some(r => r.value === value);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
    setShowCustom(isCustom);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setShowCustom(false);
  };

  const handleRangeSelect = (rangeValue: string) => {
    onChange(rangeValue);
    handleMenuClose();
  };

  const handleCustomApply = () => {
    if (customStart && customEnd) {
      onChange('custom');
      onCustomRangeChange?.({ start: customStart, end: customEnd });
      handleMenuClose();
    }
  };

  const selectedRange = TIME_RANGES.find(r => r.value === value);
  const displayValue = selectedRange?.label || (isCustom ? 'Custom range' : value);

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Button
        variant="outlined"
        size="small"
        startIcon={<Schedule fontSize="small" />}
        onClick={handleMenuOpen}
      >
        {displayValue}
      </Button>

      <IconButton
        size="small"
        aria-label="Custom time range"
        onClick={(e) => { setAnchorEl(e.currentTarget); setShowCustom(true); }}
      >
        <CalendarToday fontSize="small" />
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        PaperProps={{ sx: { minWidth: 280 } }}
      >
        {showCustom ? (
          <Box sx={{ p: 2 }}>
            <Typography variant="subtitle2" gutterBottom>Custom time range</Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
              <TextField
                size="small"
                label="Start"
                type="datetime-local"
                value={customStart ? format(customStart, "yyyy-MM-dd'T'HH:mm") : ''}
                onChange={(e) => setCustomStart(e.target.value ? new Date(e.target.value) : null)}
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                size="small"
                label="End"
                type="datetime-local"
                value={customEnd ? format(customEnd, "yyyy-MM-dd'T'HH:mm") : ''}
                onChange={(e) => setCustomEnd(e.target.value ? new Date(e.target.value) : null)}
                InputLabelProps={{ shrink: true }}
              />
            </Box>
            <Button variant="contained" onClick={handleCustomApply} fullWidth>
              Apply
            </Button>
          </Box>
        ) : (
          <>
            <MenuItem disabled sx={{ fontWeight: 600, py: 1 }}>
              <Typography variant="caption">Quick ranges</Typography>
            </MenuItem>
            {TIME_RANGES.map((range) => (
              <MenuItem
                key={range.value}
                onClick={() => handleRangeSelect(range.value)}
                selected={value === range.value && !isCustom}
              >
                {range.label}
                {value === range.value && !isCustom && ' ✓'}
              </MenuItem>
            ))}
            <MenuItem onClick={() => { setShowCustom(true); }}>
              Custom range...
            </MenuItem>
          </>
        )}
      </Menu>
    </Box>
  );
};