import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../client';
import type { SessionInfo, BlockingChain } from '../../types/api';

export function useSessions(
  status?: string,
  username?: string,
  machine?: string,
  minDuration?: number
) {
  return useQuery({
    queryKey: ['sessions', { status, username, machine, minDuration }],
    queryFn: async () => {
      const { data } = await apiClient.get<SessionInfo[]>('/sessions', {
        params: { status, username, machine, min_duration: minDuration },
      });
      return data;
    },
    refetchInterval: 15000,
  });
}

export function useBlockingChains() {
  return useQuery({
    queryKey: ['sessions', 'blocking'],
    queryFn: async () => {
      const { data } = await apiClient.get<BlockingChain[]>('/sessions/blocking');
      return data;
    },
    refetchInterval: 15000,
  });
}

export function useLongOperations() {
  return useQuery({
    queryKey: ['sessions', 'long-ops'],
    queryFn: async () => {
      const { data } = await apiClient.get('/sessions/long-ops');
      return (data as Record<string, unknown>[]).map((r) => ({
        sid: r.sid,
        serial: r['serial#'] ?? r.serial,
        opname: r.opname,
        target: r.target,
        pctDone: r.pct_done ?? r.pctDone,
        elapsedSec: r.elapsed_sec ?? r.elapsedSec,
        remainingSec: r.remaining_sec ?? r.remainingSec,
        message: r.message,
      })) as any;
    },
    refetchInterval: 15000,
  });
}

export function useKillSession() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ sid, serial }: { sid: number; serial: number }) => {
      await apiClient.post(`/sessions/${sid}/${serial}/kill`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['sessions', 'blocking'] });
    },
  });
}