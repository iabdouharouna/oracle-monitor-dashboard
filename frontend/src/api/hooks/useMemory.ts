import { useQuery } from '@tanstack/react-query';
import apiClient from '../client';
import type { MemoryAdvisor } from '../../types/api';

export function useSGAAdvice() {
  return useQuery({
    queryKey: ['memory', 'sga-advice'],
    queryFn: async () => {
      const { data } = await apiClient.get<MemoryAdvisor[]>('/memory/sga-advice');
      return data;
    },
    refetchInterval: 300000,
  });
}

export function usePGAAdvice() {
  return useQuery({
    queryKey: ['memory', 'pga-advice'],
    queryFn: async () => {
      const { data } = await apiClient.get<MemoryAdvisor[]>('/memory/pga-advice');
      return data;
    },
    refetchInterval: 300000,
  });
}

export function useMemoryTargetAdvice() {
  return useQuery({
    queryKey: ['memory', 'memory-target-advice'],
    queryFn: async () => {
      const { data } = await apiClient.get<MemoryAdvisor[]>('/memory/memory-target-advice');
      return data;
    },
    refetchInterval: 300000,
  });
}

export function useAllMemoryAdvice() {
  return useQuery({
    queryKey: ['memory', 'all'],
    queryFn: async () => {
      const { data } = await apiClient.get<MemoryAdvisor[]>('/memory/all');
      return data;
    },
    refetchInterval: 300000,
  });
}