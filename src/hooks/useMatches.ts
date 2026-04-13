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
        gasApi.fetchMatches(targetDate),
        // 使用 ensureQueryData 重複利用已快取的球員資料，避免重複 API 呼叫
        queryClient.ensureQueryData({
          queryKey: ['players-base'],
          queryFn: gasApi.fetchPlayers,
          staleTime: 60_000, // 1 分鐘內重複使用快取
        }),
      ]);

      const playerMap = buildPlayerMap(basePlayers);
      return mapAndSortMatches(rawMatches, playerMap);
    },
    refetchInterval: 30000,
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
    onSuccess: () => {
      // GAS 已持久化：重抓戰力／對戰／個人檔案，讓排點、儀表板與安柏教練與後端一致
      void queryClient.invalidateQueries({ queryKey: ['matches'] });
      void queryClient.invalidateQueries({ queryKey: ['players'] });
      void queryClient.invalidateQueries({ queryKey: ['players-base'] });
      void queryClient.invalidateQueries({ queryKey: ['playerProfile'] });
    },
    onError: (err) => {
      console.error('GAS 寫入失敗:', err);
      // 寫入失敗時，強制重新抓取以回復正確狀態
      queryClient.invalidateQueries({ queryKey: ['players'] });
      queryClient.invalidateQueries({ queryKey: ['matches'] });
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

  return {
    matches: matchesQuery.data || [],
    allMatches: allMatchesQuery.data || [],
    isLoading: matchesQuery.isLoading || allMatchesQuery.isLoading,
    isFetching: matchesQuery.isFetching || allMatchesQuery.isFetching,
    error: matchesQuery.error,
    refetch: () => {
      matchesQuery.refetch();
      allMatchesQuery.refetch();
    },
    recordMatch: recordMatchMutation.mutateAsync,
    isSubmitting: recordMatchMutation.isPending,
    addLocalMatch,
  };
}
