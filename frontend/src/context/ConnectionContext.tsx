import React, { createContext, useContext, useState, ReactNode } from 'react';

interface ConnectionInfo {
  host: string;
  port: number;
  serviceName: string;
}

interface ConnectionContextType {
  connection: ConnectionInfo | null;
  setConnection: (conn: ConnectionInfo) => void;
  isConnected: boolean;
}

const ConnectionContext = createContext<ConnectionContextType | undefined>(undefined);

export function ConnectionProvider({ children }: { children: ReactNode }) {
  const [connection, setConnection] = useState<ConnectionInfo | null>(() => {
    const stored = localStorage.getItem('oracle_monitor_connection');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return null;
      }
    }
    return null;
  });

  const updateConnection = (conn: ConnectionInfo) => {
    setConnection(conn);
    localStorage.setItem('oracle_monitor_connection', JSON.stringify(conn));
  };

  return (
    <ConnectionContext.Provider value={{ connection, setConnection: updateConnection, isConnected: !!connection }}>
      {children}
    </ConnectionContext.Provider>
  );
}

export function useConnection() {
  const context = useContext(ConnectionContext);
  if (!context) {
    throw new Error('useConnection must be used within a ConnectionProvider');
  }
  return context;
}