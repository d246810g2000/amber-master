import { useQuery } from '@tanstack/react-query';
import * as gasApi from '../lib/gasApi';

export interface DashboardSummary {
  totalMatches: number;
  activePlayerCount: number;
  averageInstantMu: number;
  controller: string;
  waitingCount: number;
  updatedAt: string;
}

export function useDashboardSummary(date?: string) {
  return useQuery({
    queryKey: ['dashboardSummary', date],
    queryFn: async () => {
      const response = await gasApi.fetchDashboardSummary(date);
      return response as DashboardSummary;
    },
    refetchInterval: 30000, // 每 30 秒自動更新一次統計
    staleTime: 15000,
  });
}
