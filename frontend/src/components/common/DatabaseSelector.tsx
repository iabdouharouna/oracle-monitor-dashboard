import React from 'react';
import { Menu, MenuItem, Button, Box, Typography, Chip } from '@mui/material';
import { Storage, Add, KeyboardArrowDown } from '@mui/icons-material';
import { useState } from 'react';
import type { DatabaseInfo } from '../../api/hooks/useDatabases';

interface DatabaseSelectorProps {
  databases: DatabaseInfo[];
  selected?: string;
  onChange: (name: string) => void;
  onAdd?: () => void;
}

export const DatabaseSelector: React.FC<DatabaseSelectorProps> = ({
  databases,
  selected,
  onChange,
  onAdd,
}) => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleSelect = (name: string) => {
    onChange(name);
    handleMenuClose();
  };

  const selectedDb = databases.find((d) => d.configName === selected) || databases[0];

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Button
        variant="contained"
        size="small"
        color="primary"
        startIcon={<Storage fontSize="small" />}
        onClick={handleMenuOpen}
        endIcon={<KeyboardArrowDown fontSize="small" />}
        sx={{
          borderRadius: 2,
          px: 1.5,
          py: 0.75,
          textTransform: 'none',
          fontWeight: 600,
          boxShadow: 1,
          '&:hover': { boxShadow: 2 },
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1.15, mr: 0.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                bgcolor: selectedDb?.status === 'ONLINE' ? '#4caf50' : '#f44336',
                boxShadow: (theme) => `0 0 0 2px ${theme.palette.common.white}33`,
              }}
            />
            <Typography variant="body2">{selectedDb?.name || 'Select database'}</Typography>
          </Box>
          <Typography variant="caption" sx={{ color: 'inherit', opacity: 0.8 }}>
            {selectedDb ? `${selectedDb.host}:${selectedDb.port}` : 'No database'}
          </Typography>
        </Box>
      </Button>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem disabled sx={{ fontWeight: 600, py: 1 }}>
          <Typography variant="caption">Available databases</Typography>
        </MenuItem>
        {!databases.length && (
          <MenuItem disabled>
            <Typography variant="body2" color="text.secondary">
              No database configured
            </Typography>
          </MenuItem>
        )}
        {databases.map((db) => (
          <MenuItem
            key={db.configName}
            onClick={() => handleSelect(db.configName)}
            selected={selected === db.configName}
            disabled={db.status !== 'ONLINE'}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.2, width: '100%' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" fontWeight={500}>
                  {db.name}
                </Typography>
                {db.configName !== db.name && (
                  <Typography variant="caption" color="text.disabled">
                    ({db.configName})
                  </Typography>
                )}
                {db.isDefault && (
                  <Chip label="default" size="small" color="primary" sx={{ height: 18, fontSize: 10 }} />
                )}
                <Chip
                  label={db.status}
                  size="small"
                  color={db.status === 'ONLINE' ? 'success' : 'error'}
                  sx={{ height: 18, fontSize: 10 }}
                />
              </Box>
              <Typography variant="caption" color="text.secondary">
                {db.host}:{db.port} · {db.serviceName || 'service'} ·{' '}
                {db.latencyMs != null ? `${db.latencyMs}ms` : 'n/a'}
              </Typography>
            </Box>
          </MenuItem>
        ))}
        {onAdd && (
          <>
            <MenuItem onClick={onAdd}>
              <Add fontSize="small" sx={{ mr: 1 }} />
              Add database...
            </MenuItem>
          </>
        )}
      </Menu>
    </Box>
  );
};