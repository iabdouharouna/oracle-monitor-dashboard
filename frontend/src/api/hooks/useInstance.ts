import { useQuery } from '@tanstack/react-query';
import apiClient from '../client';
import type { InstanceInfo } from '../../types/api';

export function useInstanceInfo() {
  return useQuery({
    queryKey: ['instance', 'info'],
    queryFn: async () => {
      const { data } = await apiClient.get<InstanceInfo['database']>('/instance/info');
      return data;
    },
    refetchInterval: 300000, // 5 min
  });
}

export function useClients() {
  return useQuery({
    queryKey: ['instance', 'clients'],
    queryFn: async () => {
      const { data } = await apiClient.get<InstanceInfo['clients']>('/instance/clients');
      return data;
    },
    refetchInterval: 60000,
  });
}

export function useProcesses() {
  return useQuery({
    queryKey: ['instance', 'processes'],
    queryFn: async () => {
      const { data } = await apiClient.get<InstanceInfo['processes']>('/instance/processes');
      return data;
    },
    refetchInterval: 30000,
  });
}

export function useMemory() {
  return useQuery({
    queryKey: ['instance', 'memory'],
    queryFn: async () => {
      const { data } = await apiClient.get<InstanceInfo['memory']>('/instance/memory');
      return data;
    },
    refetchInterval: 60000,
  });
}

export function useStorage() {
  return useQuery({
    queryKey: ['instance', 'storage'],
    queryFn: async () => {
      const { data } = await apiClient.get<InstanceInfo['storage']>('/instance/storage');
      return data;
    },
    refetchInterval: 60000,
  });
}

export function useCPURatio() {
  return useQuery({
    queryKey: ['instance', 'cpu-ratio'],
    queryFn: async () => {
      const { data } = await apiClient.get<InstanceInfo['cpuRatio']>('/instance/cpu-ratio');
      return data;
    },
    refetchInterval: 30000,
  });
}

export function useTopSQL(limit: number = 10) {
  return useQuery({
    queryKey: ['instance', 'top-sql', limit],
    queryFn: async () => {
      const { data } = await apiClient.get<InstanceInfo['topSql']>(`/instance/top-sql`, {
        params: { limit },
      });
      return data;
    },
    refetchInterval: 30000,
  });
}

export function useAllInstanceData() {
  return useQuery({
    queryKey: ['instance', 'all'],
    queryFn: async () => {
      const { data } = await apiClient.get<InstanceInfo>('/instance/all');
      return data;
    },
    refetchInterval: 30000,
  });
}