import { useQuery } from '@tanstack/react-query';
import apiClient from '../client';
import type { TablespaceInfo, TablespaceDetail, CapacityProjection } from '../../types/api';

export function useTablespaces() {
  return useQuery({
    queryKey: ['storage', 'tablespaces'],
    queryFn: async () => {
      const { data } = await apiClient.get<TablespaceInfo[]>('/storage/tablespaces');
      return data;
    },
    refetchInterval: 60000,
  });
}

export function useTablespaceDetail(name: string | null) {
  return useQuery({
    queryKey: ['storage', 'tablespace', name],
    queryFn: async () => {
      if (!name) return null;
      const { data } = await apiClient.get<TablespaceDetail>(`/storage/tablespaces/${name}`);
      return data;
    },
    enabled: !!name,
    refetchInterval: 60000,
  });
}

export function useCapacityPlanning() {
  return useQuery({
    queryKey: ['storage', 'capacity'],
    queryFn: async () => {
      const { data } = await apiClient.get<CapacityProjection[]>('/storage/capacity');
      return data;
    },
    refetchInterval: 300000, // 5 min
  });
}