import { useQuery } from '@tanstack/react-query';
import apiClient from '../client';
import type { OverviewData, TimeSeriesData } from '../../types/api';

export function useOverview() {
  return useQuery({
    queryKey: ['overview'],
    queryFn: async () => {
      const { data } = await apiClient.get<OverviewData>('/overview');
      return data;
    },
    refetchInterval: 30000,
  });
}

export function useOverviewTimeSeries(hours: number = 24) {
  return useQuery({
    queryKey: ['overview', 'timeseries', hours],
    queryFn: async () => {
      const { data } = await apiClient.get<TimeSeriesData>(`/overview/timeseries`, {
        params: { hours },
      });
      return data;
    },
    refetchInterval: 60000,
  });
}