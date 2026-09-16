import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../client';
import type { AlertLogEntry, ThresholdConfig, TriggeredAlert } from '../../types/api';

export function useAlertLog(hours: number = 24, limit: number = 100) {
  return useQuery({
    queryKey: ['alerts', 'log', hours, limit],
    queryFn: async () => {
      const { data } = await apiClient.get<AlertLogEntry[]>('/alerts/log', {
        params: { hours, limit },
      });
      return data;
    },
    refetchInterval: 60000,
  });
}

export function useThresholds() {
  return useQuery({
    queryKey: ['alerts', 'thresholds'],
    queryFn: async () => {
      const { data } = await apiClient.get<ThresholdConfig>('/alerts/thresholds');
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateThresholds() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (thresholds: Partial<ThresholdConfig>) => {
      const { data } = await apiClient.put<ThresholdConfig>('/alerts/thresholds', thresholds);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts', 'thresholds'] });
    },
  });
}

export function useCheckThresholds() {
  return useQuery({
    queryKey: ['alerts', 'check'],
    queryFn: async () => {
      const { data } = await apiClient.get<TriggeredAlert[]>('/alerts/check');
      return data;
    },
    refetchInterval: 60000,
  });
}