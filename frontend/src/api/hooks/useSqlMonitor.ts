import { useQuery } from '@tanstack/react-query';
import apiClient from '../client';
import type { SQLMonitorEntry, SQLMonitorDetail, ExecutionPlanStep } from '../../types/api';

export function useActiveSQL() {
  return useQuery({
    queryKey: ['sql-monitor', 'active'],
    queryFn: async () => {
      const { data } = await apiClient.get<SQLMonitorEntry[]>('/sql-monitor/active');
      return data;
    },
    refetchInterval: 5000,
  });
}

export function useSQLMonitorDetail(sqlId: string | null, sqlExecId: number | null) {
  return useQuery({
    queryKey: ['sql-monitor', 'detail', sqlId, sqlExecId],
    queryFn: async () => {
      if (!sqlId || !sqlExecId) return null;
      const { data } = await apiClient.get<SQLMonitorDetail>('/sql-monitor/detail', {
        params: { sql_id: sqlId, sql_exec_id: sqlExecId },
      });
      return data;
    },
    enabled: !!sqlId && !!sqlExecId,
    refetchInterval: 5000,
  });
}

export function useExecutionPlan(sqlId: string | null, planHashValue: number | null) {
  return useQuery({
    queryKey: ['sql-monitor', 'plan', sqlId, planHashValue],
    queryFn: async () => {
      if (!sqlId || !planHashValue) return [];
      const { data } = await apiClient.get<ExecutionPlanStep[]>('/sql-monitor/plan', {
        params: { sql_id: sqlId, plan_hash_value: planHashValue },
      });
      return data;
    },
    enabled: !!sqlId && !!planHashValue,
  });
}