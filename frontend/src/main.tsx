import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { Toaster } from 'react-hot-toast';
import { BrowserRouter } from 'react-router-dom';

import App from './App';
import { createAppTheme } from './theme/theme';
import { AuthProvider } from './context/AuthContext';
import { ConnectionProvider } from './context/ConnectionContext';
import { SettingsProvider, useSettings } from './context/SettingsContext';
import { queryClient } from './api/queryClient';

const ThemedApp: React.FC = () => {
  const { settings } = useSettings();
  const theme = createAppTheme(settings.theme);
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <AuthProvider>
          <ConnectionProvider>
            <App />
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: { background: '#333', color: '#fff' },
                success: { iconTheme: { primary: '#00A651', secondary: '#fff' } },
                error: { iconTheme: { primary: '#D13438', secondary: '#fff' } },
              }}
            />
            <ReactQueryDevtools initialIsOpen={false} />
          </ConnectionProvider>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <SettingsProvider>
        <ThemedApp />
      </SettingsProvider>
    </QueryClientProvider>
  </React.StrictMode>
);