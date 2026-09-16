import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '../client';

export interface DatabaseInfo {
  name: string;
  configName: string;
  host: string;
  port: number;
  serviceName: string;
  username: string;
  isDefault: boolean;
  isActive: boolean;
  status: 'ONLINE' | 'OFFLINE';
  latencyMs: number | null;
}

export interface DatabaseInput {
  name: string;
  host: string;
  port: number;
  serviceName: string;
  username: string;
  password: string;
  isDefault: boolean;
}

export function useDatabases() {
  return useQuery({
    queryKey: ['databases'],
    queryFn: async () => {
      const { data } = await apiClient.get<DatabaseInfo[]>('/databases');
      return data;
    },
    refetchInterval: 30000,
  });
}

export function useAddDatabase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: DatabaseInput) => {
      const { data } = await apiClient.post<DatabaseInfo>('/databases', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['databases'] });
    },
  });
}

export function useRemoveDatabase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const { data } = await apiClient.delete(`/databases/${encodeURIComponent(name)}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['databases'] });
    },
  });
}