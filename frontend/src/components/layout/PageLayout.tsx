import React from 'react';
import { Box, Container } from '@mui/material';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { Footer } from './Footer';
import { Outlet } from 'react-router-dom';
import type { DatabaseInfo } from '../../api/hooks/useDatabases';

export const PageLayout: React.FC<{ 
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
}) => (
  <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
    <Header
      onManualRefresh={onManualRefresh}
      timeRange={timeRange}
      onTimeRangeChange={onTimeRangeChange}
      databases={databases}
      selectedDatabase={selectedDatabase}
      onDatabaseChange={onDatabaseChange}
      onAddDatabase={onAddDatabase}
    />
    <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
      <Sidebar />
      <Box
        component="main"
        sx={{ flexGrow: 1, p: 3, overflow: 'auto', bgcolor: 'background.default' }}
      >
        <Container maxWidth={false}>
          <Outlet />
        </Container>
      </Box>
    </Box>
    <Footer />
  </Box>
);