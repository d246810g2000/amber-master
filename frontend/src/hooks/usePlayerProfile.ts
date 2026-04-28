import { useQuery } from '@tanstack/react-query';
import * as gasApi from '../lib/gasApi';
import { getTaipeiDateString } from '../lib/utils';

/** 趨勢圖上的單一數據點 */
export interface CombinedTrendPoint {
  date: string;
  mu: number;
  matchId?: string;
  chartKey: string;
  matchMu: number;
  dailyMu: number;
  formHigh: number;
  formLow: number;
  isHot: boolean;
}

/**
 * 使用後端 API 獲取完整的球員 Profile 與分析數據
 */
export function usePlayerProfile(playerId: string) {
  return useQuery<any>({
    queryKey: ['playerProfile', playerId],
    enabled: Boolean(playerId),
    queryFn: async () => {
      const profile = await gasApi.fetchPlayerProfile(playerId);
      
      // 映射到前端原有結構以相容 UI 組件
      const today = profile.today || { totalMatches: 0, winCount: 0, winRate: 0 };
      const career = profile.career || { totalMatches: 0, winCount: 0, lossCount: 0, winRate: 0 };
      
      const result = {
        player: profile.player || { id: playerId, name: "Unknown", mu: 25, sigma: 8.333 },
        stats: career,
        todayStats: {
          ...today,
          date: getTaipeiDateString(),
          lossCount: today.totalMatches - today.winCount
        },
        teammateStats: profile.partners || [],
        matchHistory: profile.history || [],
        history: profile.history || []
      };

      const combinedTrend: CombinedTrendPoint[] = (profile.trend || []).map((t: any) => {
        const muVal = t.mu || 25.0;
        const dailyMuVal = t.dailyMu || muVal;
        return {
          date: t.date || getTaipeiDateString(),
          mu: muVal,
          matchId: t.matchId,
          chartKey: t.date || getTaipeiDateString(),
          matchMu: muVal,
          dailyMu: dailyMuVal,
          formHigh: Math.max(muVal, dailyMuVal),
          formLow: Math.min(muVal, dailyMuVal),
          isHot: false
        };
      });

      return {
        data: result,
        instantMu: profile.today.mu,
        comprehensiveMu: profile.player.mu,
        combinedTrend,
        bestPartner: profile.bestPartner,
        teammateStats: profile.partners || [],
        matchHistory: profile.history || [],
        playerMap: {} 
      };
    },
    staleTime: 30000, 
    refetchOnWindowFocus: false,
  });
}
