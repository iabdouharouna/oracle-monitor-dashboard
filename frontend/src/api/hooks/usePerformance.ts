import { useQuery, useMutation } from '@tanstack/react-query';
import apiClient from '../client';
import type { AASDataPoint, DrilldownData, AWRSnapshot, AWRReport } from '../../types/api';

export function useAWRSnapshots() {
  return useQuery({
    queryKey: ['performance', 'awr', 'snapshots'],
    queryFn: async () => {
      const { data } = await apiClient.get<AWRSnapshot[]>('/performance/awr/snapshots');
      return data;
    },
    staleTime: 5 * 60 * 1000,
    refetchInterval: 300000,
  });
}

export function useGenerateAWRReport() {
  return useMutation({
    mutationFn: async (params: { snapIdStart: number; snapIdEnd: number; reportType?: string }) => {
      const { data } = await apiClient.get<AWRReport>('/performance/awr/report', {
        params: {
          snap_id_start: params.snapIdStart,
          snap_id_end: params.snapIdEnd,
          report_type: params.reportType || 'html',
        },
      });
      return data;
    },
  });
}

export function useASHAAS(hours: number = 1, dimension: string = 'wait_class') {
  return useQuery({
    queryKey: ['performance', 'ash', 'aas', hours, dimension],
    queryFn: async () => {
      const { data } = await apiClient.get<AASDataPoint[]>('/performance/ash/aas', {
        params: { hours, dimension },
      });
      return data;
    },
    refetchInterval: 10000,
  });
}

export function useASHWaitClasses(hours: number = 1) {
  return useQuery({
    queryKey: ['performance', 'ash', 'wait-classes', hours],
    queryFn: async () => {
      const { data } = await apiClient.get('/performance/ash/wait-classes', {
        params: { hours },
      });
      return data;
    },
    refetchInterval: 10000,
  });
}

export function useASHTopSQL(hours: number = 1) {
  return useQuery({
    queryKey: ['performance', 'ash', 'top-sql', hours],
    queryFn: async () => {
      const { data } = await apiClient.get('/performance/ash/top-sql', {
        params: { hours },
      });
      return data;
    },
    refetchInterval: 30000,
  });
}

export function useASHDDrilldown(
  dimension: string,
  filterDimension: string,
  hours: number = 1
) {
  return useQuery({
    queryKey: ['performance', 'ash', 'drilldown', dimension, filterDimension, hours],
    queryFn: async () => {
      const { data } = await apiClient.get<DrilldownData>('/performance/ash/drilldown', {
        params: { dimension, filter_dimension: filterDimension, hours },
      });
      return data;
    },
    enabled: !!dimension && !!filterDimension,
    refetchInterval: 30000,
  });
}