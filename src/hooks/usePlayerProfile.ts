import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as gasApi from '../lib/gasApi';
import * as matchEngine from '../lib/matchEngine';
import type { PlayerHistoryResult } from '../lib/matchEngine';
import type { RawPlayer } from '../lib/gasApi';

import { getTaipeiDateString } from '../lib/utils';

/** 趨勢圖上的單一數據點 */
export interface CombinedTrendPoint {
  date: string;
  mu: number;
  matchId: string;
  chartKey: string;
  matchMu: number;
  dailyMu: number;
  formHigh: number;
  formLow: number;
  isHot: boolean;
}

export interface PlayerProfileData {
  data: PlayerHistoryResult;
  instantMu: number;
  comprehensiveMu: number;
  combinedTrend: CombinedTrendPoint[];
  playerMap: Record<string, RawPlayer>;
}

/**
 * 使用 TanStack Query 取代手動 useState + useEffect 的資料獲取。
 * 自動獲得快取、重試、stale 管理等益處。
 */
export function usePlayerProfile(playerId: string) {
  const queryClient = useQueryClient();

  return useQuery<PlayerProfileData>({
    queryKey: ['playerProfile', playerId],
    enabled: Boolean(playerId),
    queryFn: async () => {
      // 使用 ensureQueryData 確保與 Dashboard 共享相同的 API 呼叫，避免重複請求
      const [basePlayers, allMatches, snapshots] = await Promise.all([
        queryClient.ensureQueryData({
          queryKey: ['players-base'],
          queryFn: gasApi.fetchPlayers,
          staleTime: 2000,
        }),
        queryClient.ensureQueryData({
          queryKey: ['matches-raw', 'all'],
          queryFn: gasApi.fetchMatches,
          staleTime: 2000,
        }),
        queryClient.ensureQueryData({
          queryKey: ['playerStats'],
          queryFn: gasApi.fetchPlayerStats,
          staleTime: 2000,
        }),
      ]);

      const result = matchEngine.getPlayerHistory(playerId, basePlayers, allMatches);

      // 1. 即時戰力 (僅限今日，若今日無對戰則回歸 25.0)
      const today = getTaipeiDateString();
      let latestInstant = 25.0;

      if (result.history && result.history.length > 0) {
        // 過濾出今天的比賽 (result.history 已經是由新到舊排序)
        const todayMatches = result.history.filter(m => m.matchDate === today);
        if (todayMatches.length > 0) {
          const latestM = todayMatches[0];
          const myP = [...latestM.team1, ...latestM.team2].find(p => String(p.id) === playerId);
          if (myP?.muAfter !== undefined) {
            latestInstant = myP.muAfter;
          }
        }
      }

      // 2. 生涯戰力
      let latestComp = result.player.mu || 25.0;

      // 3. 組合趨勢圖
      const playerSnapshots = snapshots.filter(s => s.id === playerId);
      const dailyMap: Record<string, number> = {};
      playerSnapshots.forEach(s => {
        if (s.date) dailyMap[s.date] = s.mu ?? 25.0;
      });

      const comprehensiveTrend = matchEngine.calculateComprehensiveTrend(playerId, basePlayers, allMatches);

      if (comprehensiveTrend.length > 0) {
        latestComp = comprehensiveTrend[comprehensiveTrend.length - 1].mu;
      }

      const combinedTrend: CombinedTrendPoint[] = comprehensiveTrend.map((t, idx) => {
        const snapshotMu = dailyMap[t.date];
        const matchMu = t.mu;
        const dailyMu = snapshotMu !== undefined ? snapshotMu : latestInstant;
        return {
          ...t,
          chartKey: `${t.date}-${t.matchId || idx}`,
          matchMu,
          dailyMu,
          formHigh: Math.max(matchMu, dailyMu),
          formLow: Math.min(matchMu, dailyMu),
          isHot: dailyMu > matchMu,
        };
      });

      const playerMap: Record<string, RawPlayer> = {};
      basePlayers.forEach(p => { playerMap[p.name] = p; });

      return {
        data: result,
        instantMu: latestInstant,
        comprehensiveMu: latestComp,
        combinedTrend,
        playerMap,
      };
    },
    // 0：賽後 invalidate／Court 版號 bump 後立刻視為 stale，避免「Sheet 已更新畫面仍舊」
    staleTime: 0,
    refetchOnWindowFocus: true,
    // 球員頁常開著不操作；Court 輪詢若與版號競態遺漏時，仍會在數秒內對齊後端
    refetchInterval: 12_000,
    refetchIntervalInBackground: false,
  });
}
