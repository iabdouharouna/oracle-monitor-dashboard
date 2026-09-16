import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Box } from '@mui/material';
import { useAuth } from './context/AuthContext';
import { PageLayout } from './components/layout/PageLayout';
import { AddDatabaseDialog } from './components/common/AddDatabaseDialog';
import { useDatabases } from './api/hooks';
import { setActiveDatabase } from './api/dbSelection';
import { 
  Login, 
  Dashboard, 
  InstanceViewer, 
  PerformanceHub, 
  SQLMonitor, 
  Sessions, 
  Storage, 
  Memory, 
  WaitEvents, 
  LiveMonitor,
  Alerts, 
  Settings, 
  Reports,
  Monitoring,
} from './pages';

const ProtectedRoute: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        Loading...
      </Box>
    );
  }

  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
};

const PublicRoute: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        Loading...
      </div>
    );
  }

  return isAuthenticated ? <Navigate to="/" replace /> : <Outlet />;
};

const App: React.FC = () => {
  const [timeRange, setTimeRange] = useState('1h');
  const { data: databases = [] } = useDatabases();
  const [selectedDatabase, setSelectedDatabase] = useState<string>(
    () => localStorage.getItem('selectedDatabase') || ''
  );
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  useEffect(() => {
    if (!selectedDatabase && databases.length > 0) {
      const fallback = databases.find((db) => db.isDefault) || databases[0];
      if (fallback) {
        setSelectedDatabase(fallback.configName);
      }
    }
  }, [databases, selectedDatabase]);

  useEffect(() => {
    setActiveDatabase(selectedDatabase);
  }, [selectedDatabase]);

  return (
    <>
      <Routes>
        <Route element={<PublicRoute />}>
          <Route path="/login" element={<Login />} />
        </Route>
        <Route element={<ProtectedRoute />}>
          <Route element={
            <PageLayout
              timeRange={timeRange}
              onTimeRangeChange={setTimeRange}
              databases={databases}
              selectedDatabase={selectedDatabase}
              onDatabaseChange={setSelectedDatabase}
              onAddDatabase={() => setAddDialogOpen(true)}
            />
          }>
          <Route path="/" element={<Dashboard />} />
          <Route path="/instance" element={<InstanceViewer />} />
          <Route path="/performance" element={<PerformanceHub />} />
          <Route path="/sql-monitor" element={<SQLMonitor />} />
          <Route path="/sessions" element={<Sessions />} />
          <Route path="/storage" element={<Storage />} />
          <Route path="/memory" element={<Memory />} />
          <Route path="/waits" element={<WaitEvents />} />
          <Route path="/live" element={<LiveMonitor />} />
          <Route path="/alerts" element={<Alerts />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/monitoring" element={<Monitoring />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <AddDatabaseDialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} />
    </>
  );
};

export default App;