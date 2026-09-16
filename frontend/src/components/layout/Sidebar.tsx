import React, { useState } from 'react';
import { Drawer, List, ListItem, ListItemIcon, ListItemText, Divider, Box, Typography, IconButton, useMediaQuery, useTheme } from '@mui/material';
import { Menu, ChevronLeft, Dashboard, Storage, Memory, Speed, BugReport, Terminal, Settings, Assessment, Timeline, MonitorHeart, ShowChart } from '@mui/icons-material';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const menuItems = [
  { path: '/', label: 'Dashboard', icon: <Dashboard /> },
  { path: '/instance', label: 'Instance Viewer', icon: <Speed /> },
  { path: '/performance', label: 'Performance Hub', icon: <Assessment /> },
  { path: '/sql-monitor', label: 'SQL Monitor', icon: <BugReport /> },
  { path: '/sessions', label: 'Sessions', icon: <Terminal /> },
  { path: '/storage', label: 'Storage', icon: <Storage /> },
  { path: '/memory', label: 'Memory', icon: <Memory /> },
  { path: '/waits', label: 'Wait Events', icon: <Timeline /> },
  { path: '/live', label: 'Live Monitor', icon: <MonitorHeart /> },
  { path: '/alerts', label: 'Alerts', icon: <BugReport /> },
  { path: '/monitoring', label: 'Monitoring', icon: <ShowChart /> },
  { path: '/reports', label: 'Reports', icon: <Assessment /> },
  { path: '/settings', label: 'Settings', icon: <Settings /> },
];

export const Sidebar: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout } = useAuth();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const drawer = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', p: 1 }}>
      <Box sx={{ px: 1, py: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="h6" sx={{ fontWeight: 600, color: 'primary.main' }}>
          Oracle Monitor
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {user?.username} ({user?.role})
        </Typography>
      </Box>
      <Divider sx={{ my: 1 }} />
      <List sx={{ flex: 1, overflow: 'auto' }}>
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            style={({ isActive }) => ({
              textDecoration: 'none',
              color: isActive ? 'primary.main' : 'inherit',
              '& .MuiListItemIcon-root': { color: isActive ? 'primary.main' : 'text.secondary' },
            })}
          >
            <ListItem button sx={{ mb: 0.5, borderRadius: 1 }}>
              <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItem>
          </NavLink>
        ))}
      </List>
      <Divider sx={{ my: 1 }} />
      <List>
        <ListItem button onClick={logout} sx={{ color: 'error.main' }}>
          <ListItemIcon sx={{ minWidth: 40 }}>
            <ChevronLeft fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Logout" />
        </ListItem>
      </List>
    </Box>
  );

  return (
    <>
      <IconButton
        color="inherit"
        edge="start"
        onClick={handleDrawerToggle}
        sx={{ mr: 2, display: { xs: 'flex', md: 'none' } }}
        aria-label="Open sidebar"
      >
        <Menu />
      </IconButton>
      <Drawer
        variant={isMobile ? 'temporary' : 'permanent'}
        open={isMobile ? mobileOpen : true}
        onClose={handleDrawerToggle}
        sx={{
          width: 250,
          flexShrink: { xs: 0, md: 0 },
          '& .MuiDrawer-paper': {
            width: 250,
            boxSizing: 'border-box',
            borderRight: '1px solid',
            borderColor: 'divider',
            backgroundColor: 'background.paper',
            ...(isMobile
              ? {}
              : {
                  top: 64,
                  height: 'calc(100% - 64px)',
                  zIndex: 1090,
                }),
          },
        }}
      >
        {drawer}
      </Drawer>
    </>
  );
};