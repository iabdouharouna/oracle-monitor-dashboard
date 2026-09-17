import React from 'react';
import { AppBar, Toolbar, Typography, Box, IconButton, Avatar, Menu, MenuItem, Tooltip, Badge, Divider } from '@mui/material';
import { Notifications, Person, Settings, Logout } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCheckThresholds } from '../../api/hooks/useAlerts';
import { RefreshControl } from '../common/RefreshControl';
import { TimeRangeSelector } from '../common/TimeRangeSelector';
import { DatabaseSelector } from '../common/DatabaseSelector';
import type { DatabaseInfo } from '../../api/hooks/useDatabases';

export const Header: React.FC<{ 
  onManualRefresh?: () => void;
  timeRange?: string;
  onTimeRangeChange?: (value: string) => void;
  databases?: DatabaseInfo[];
  selectedDatabase?: string;
  onDatabaseChange?: (name: string) => void;
  onAddDatabase?: () => void;
}> = ({ 
  onManualRefresh,
  timeRange,
  onTimeRangeChange,
  databases = [],
  selectedDatabase,
  onDatabaseChange,
  onAddDatabase,
}) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = React.useState<HTMLElement | null>(null);
  const [notifAnchor, setNotifAnchor] = React.useState<HTMLElement | null>(null);
  const { data: activeAlerts = [] } = useCheckThresholds();

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setNotifAnchor(null);
  };

  const handleLogout = () => {
    handleMenuClose();
    logout();
  };

  const handleNavigate = (path: string) => {
    handleMenuClose();
    navigate(path);
  };

  return (
    <AppBar position="sticky" sx={{ zIndex: 1100, backgroundColor: 'background.paper', borderBottom: 1, borderColor: 'divider' }}>
      <Toolbar sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1, minWidth: 0 }}>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 600,
              color: 'primary.main',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              flexShrink: 1,
              minWidth: 0,
              maxWidth: { xs: '24%', sm: '30%', md: '100%' },
            }}
          >
            Oracle Monitor Dashboard
          </Typography>
          
          <DatabaseSelector
            databases={databases}
            selected={selectedDatabase}
            onChange={onDatabaseChange || (() => {})}
            onAdd={user?.role === 'DBA' ? onAddDatabase : undefined}
          />
          
          <TimeRangeSelector
            value={timeRange || '1h'}
            onChange={onTimeRangeChange || (() => {})}
          />
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <RefreshControl onManualRefresh={onManualRefresh} />
          
          <Tooltip title="Notifications">
            <IconButton onClick={(e) => { setNotifAnchor(e.currentTarget); }} aria-label="Notifications">
              <Badge badgeContent={activeAlerts.length} color="error">
                <Notifications fontSize="large" />
              </Badge>
            </IconButton>
          </Tooltip>

          <Tooltip title="Profile">
            <IconButton onClick={handleProfileMenuOpen} aria-label="Profile">
              <Avatar sx={{ width: 32, height: 32 }}>
                {user?.username?.charAt(0).toUpperCase()}
              </Avatar>
            </IconButton>
          </Tooltip>
        </Box>

        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        >
          {/* Menu items navigate to real pages */}
          <MenuItem disabled>
            <Typography variant="caption">{user?.username} ({user?.role})</Typography>
          </MenuItem>
          <MenuItem onClick={() => handleNavigate('/settings')}>
            <Person fontSize="small" sx={{ mr: 1 }} />
            Profile
          </MenuItem>
          <MenuItem onClick={() => handleNavigate('/settings')}>
            <Settings fontSize="small" sx={{ mr: 1 }} />
            Settings
          </MenuItem>
          <Divider />
          <MenuItem onClick={handleLogout}>
            <Logout fontSize="small" sx={{ mr: 1, color: 'error.main' }} />
            Logout
          </MenuItem>
        </Menu>

        <Menu
          anchorEl={notifAnchor}
          open={Boolean(notifAnchor)}
          onClose={handleMenuClose}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          PaperProps={{ sx: { minWidth: 300 } }}
        >
          <MenuItem disabled>
            <Typography variant="subtitle2">
              Notifications {activeAlerts.length > 0 ? `(${activeAlerts.length})` : ''}
            </Typography>
          </MenuItem>
          {activeAlerts.length === 0 && (
            <MenuItem disabled>
              <Typography variant="body2" color="text.secondary">No active threshold alerts</Typography>
            </MenuItem>
          )}
          {activeAlerts.map((alert, i) => (
            <MenuItem key={i} disabled>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                <Typography variant="body2">{alert.message}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {alert.severity} • threshold {alert.threshold}
                </Typography>
              </Box>
            </MenuItem>
          ))}
        </Menu>
      </Toolbar>
    </AppBar>
  );
};