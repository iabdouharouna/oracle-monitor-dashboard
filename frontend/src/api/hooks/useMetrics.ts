import { useQuery } from '@tanstack/react-query';
import apiClient from '../client';
import type { MetricsHistoryResponse, MetricsAvailableResponse } from '../../types/api';

export function useMetricsSeries(metricNames: string[], hours: number = 24, stepSeconds: number = 0) {
  return useQuery({
    queryKey: ['metrics', 'history', metricNames, hours, stepSeconds],
    queryFn: async () => {
      const params: Record<string, string | number> = { hours };
      if (metricNames.length > 0) params.metrics = metricNames.join(',');
      if (stepSeconds > 0) params.stepSeconds = stepSeconds;
      const { data } = await apiClient.get<MetricsHistoryResponse>('/metrics/history', { params });
      return data;
    },
    refetchInterval: 60000,
    refetchIntervalInBackground: true,
  });
}

export function useAvailableMetrics() {
  return useQuery({
    queryKey: ['metrics', 'available'],
    queryFn: async () => {
      const { data } = await apiClient.get<MetricsAvailableResponse>('/metrics/available');
      return data.metrics;
    },
    staleTime: 300000,
  });
}