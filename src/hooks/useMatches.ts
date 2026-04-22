import { useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as gasApi from '../lib/gasApi';
import { buildPlayerMap, mapAndSortMatches, mapRawMatchToRecord } from '../lib/mappers';
import type { MatchRecord } from '../types';

export function useMatches(targetDate: string) {
  const queryClient = useQueryClient();

  const matchesQuery = useQuery({
    queryKey: ['matches', targetDate],
    queryFn: async () => {
      const [rawMatches, basePlayers] = await Promise.all([
        queryClient.ensureQueryData({
          queryKey: ['matches-raw', targetDate],
          queryFn: () => gasApi.fetchMatches(targetDate),
          staleTime: 2000,
        }),
        queryClient.ensureQueryData({
          queryKey: ['players-base'],
          queryFn: gasApi.fetchPlayers,
          staleTime: 2000,
        }),
      ]);

      const playerMap = buildPlayerMap(basePlayers);
      return mapAndSortMatches(rawMatches, playerMap);
    },
    refetchInterval: 60000,
  });

  const allMatchesQuery = useQuery({
    queryKey: ['matches', 'all'],
    queryFn: async () => {
      const [rawMatches, basePlayers] = await Promise.all([
        gasApi.fetchMatches(),
        queryClient.ensureQueryData({
          queryKey: ['players-base'],
          queryFn: gasApi.fetchPlayers,
          staleTime: 60_000,
        }),
      ]);

      const playerMap = buildPlayerMap(basePlayers);
      return rawMatches.map(m => mapRawMatchToRecord(m, playerMap));
    },
  });

  const recordMatchMutation = useMutation({
    mutationFn: gasApi.recordMatchAndUpdate,
    /** 須 await：confirmWinner 的 mutateAsync 會等 onSuccess 跑完，球員頁／安柏教練才能讀到與 Sheet 一致的快取 */
    onSuccess: async () => {
      // 僅 invalidate，React Query 會自動針對畫面上 active 的組件進行重新整理
      // 且因為我們在各 Hook 內使用了 ensureQueryData + staleTime，這波重新整理會自動合併請求
      await queryClient.invalidateQueries({ queryKey: ['matches-raw'] });
      await queryClient.invalidateQueries({ queryKey: ['players-base'] });
      await queryClient.invalidateQueries({ queryKey: ['playerStats'] });
      
      // 最後 invalidate 衍生資料
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      queryClient.invalidateQueries({ queryKey: ['players'] });
      queryClient.invalidateQueries({ queryKey: ['playerProfile'] });
    },
    onError: (err) => {
      console.error('GAS 寫入失敗:', err);
      // 勿在此 invalidate matches：會把 confirmWinner 的樂觀對戰沖掉，使用者以為紀錄憑空消失。
      // 場地／分數仍以樂觀更新為準，待網路恢復後使用者可重新整理或重試寫入。
    },
  });

  /**
   * 本地樂觀更新：直接將新比賽注入 React Query 快取
   * 不需等待 GAS 回應，UI 立即反映
   */
  const addLocalMatch = (match: MatchRecord) => {
    queryClient.setQueryData<MatchRecord[]>(['matches', targetDate], (old) => {
      const existing = old || [];
      // 計算 matchNo
      const sameDay = existing.filter(m => m.matchDate === match.matchDate);
      const newMatch = { ...match, matchNo: sameDay.length + 1 };
      // 新比賽放最前面（由新到舊）
      return [newMatch, ...existing];
    });
    // 同步更新 'all' 快取
    queryClient.setQueryData<MatchRecord[]>(['matches', 'all'], (old) => [match, ...(old || [])]);
  };

  const refetch = useCallback(() => {
    matchesQuery.refetch();
    allMatchesQuery.refetch();
  }, [matchesQuery.refetch, allMatchesQuery.refetch]);

  return useMemo(() => ({
    matches: matchesQuery.data || [],
    allMatches: allMatchesQuery.data || [],
    isLoading: matchesQuery.isLoading || allMatchesQuery.isLoading,
    isFetching: matchesQuery.isFetching || allMatchesQuery.isFetching,
    error: matchesQuery.error,
    refetch,
    recordMatch: recordMatchMutation.mutateAsync,
    isSubmitting: recordMatchMutation.isPending,
    addLocalMatch,
  }), [
    matchesQuery.data, matchesQuery.isLoading, matchesQuery.isFetching, matchesQuery.error,
    allMatchesQuery.data, allMatchesQuery.isLoading, allMatchesQuery.isFetching,
    refetch, recordMatchMutation.mutateAsync, recordMatchMutation.isPending
  ]);
}
