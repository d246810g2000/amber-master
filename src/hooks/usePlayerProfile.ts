import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as gasApi from '../lib/gasApi';
import * as matchEngine from '../lib/matchEngine';
import type { PlayerHistoryResult } from '../lib/matchEngine';
import type { RawPlayer, RawPlayerStat } from '../lib/gasApi';

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
    queryFn: async () => {
      const [basePlayers, allMatches, snapshots] = await Promise.all([
        // 重複利用已快取的球員資料
        queryClient.ensureQueryData({
          queryKey: ['players-base'],
          queryFn: gasApi.fetchPlayers,
          staleTime: 60_000,
        }),
        gasApi.fetchMatches(),
        gasApi.fetchPlayerStats(),
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
    staleTime: 120_000, // 2 分鐘內重複使用快取
  });
}
