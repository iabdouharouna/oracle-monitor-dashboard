import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getAuthTokens, setAuthTokens, clearAuthTokens } from '../utils/helpers';
import apiClient from '../api/client';

interface User {
  id: number;
  username: string;
  email: string;
  role: 'DBA' | 'VIEWER';
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const tokens = getAuthTokens();
      if (tokens.accessToken) {
        try {
          const response = await apiClient.get('/auth/me');
          setUser(response.data);
        } catch {
          clearAuthTokens();
        }
      }
      setIsLoading(false);
    };
    initAuth();
  }, []);

  const login = async (username: string, password: string) => {
    const body = new URLSearchParams({ username, password });
    const response = await apiClient.post('/auth/login', body, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    const { access_token, refresh_token } = response.data;
    setAuthTokens(access_token, refresh_token);
    const me = await apiClient.get('/auth/me');
    setUser(me.data);
  };

  const logout = () => {
    clearAuthTokens();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}