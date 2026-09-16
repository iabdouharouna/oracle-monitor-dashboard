import { useQuery } from '@tanstack/react-query';
import apiClient from '../client';
import type { SystemWaitEvent, SessionWait, LiveWaits } from '../../types/api';

export function useLiveWaits(intervalMs: number = 1500) {
  return useQuery({
    queryKey: ['waits', 'live'],
    queryFn: async () => {
      const { data } = await apiClient.get<LiveWaits>('/waits/live');
      return data;
    },
    refetchInterval: intervalMs,
    refetchIntervalInBackground: true,
  });
}

export function useSystemWaits() {
  return useQuery({
    queryKey: ['waits', 'system'],
    queryFn: async () => {
      const { data } = await apiClient.get<SystemWaitEvent[]>('/waits/system');
      return data;
    },
    refetchInterval: 30000,
  });
}

export function useSessionWaits() {
  return useQuery({
    queryKey: ['waits', 'session'],
    queryFn: async () => {
      const { data } = await apiClient.get<SessionWait[]>('/waits/session');
      return data;
    },
    refetchInterval: 15000,
  });
}

export function useIOMetrics() {
  return useQuery({
    queryKey: ['waits', 'io-metrics'],
    queryFn: async () => {
      const { data } = await apiClient.get('/waits/io-metrics');
      return data;
    },
    refetchInterval: 30000,
  });
}

export function useMetricsHistory(hours: number = 24) {
  return useQuery({
    queryKey: ['waits', 'history', hours],
    queryFn: async () => {
      const { data } = await apiClient.get('/waits/history', {
        params: { hours },
      });
      return data;
    },
    refetchInterval: 60000,
  });
}