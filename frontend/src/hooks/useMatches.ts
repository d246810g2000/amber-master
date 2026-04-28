import { useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as gasApi from '../lib/gasApi';
import { buildPlayerMap, mapAndSortMatches, mapRawMatchToRecord } from '../lib/mappers';
import type { MatchRecord } from '../types';

export function useMatches(targetDate: string) {
  const queryClient = useQueryClient();

  // 1. 原始資料抓取 (Base Queries)
  const playersBaseQuery = useQuery({
    queryKey: ['players-base'],
    queryFn: gasApi.fetchPlayers,
    staleTime: 30000,
  });

  const matchesRawQuery = useQuery({
    queryKey: ['matches-raw', targetDate],
    queryFn: () => gasApi.fetchMatches(targetDate),
    staleTime: 5000,
  });

  // 2. 衍生資料計算 (Derived Data)
  const matches = useMemo(() => {
    if (!matchesRawQuery.data || !playersBaseQuery.data) return [];
    const playerMap = buildPlayerMap(playersBaseQuery.data);
    return mapAndSortMatches(matchesRawQuery.data, playerMap);
  }, [matchesRawQuery.data, playersBaseQuery.data]);

  const activeDatesQuery = useQuery({
    queryKey: ['activeMatchDates'],
    queryFn: gasApi.fetchActiveMatchDates,
    staleTime: 60000,
  });

  const activeDates = useMemo(() => new Set(activeDatesQuery.data || []), [activeDatesQuery.data]);

  const isLoading = matchesRawQuery.isLoading || playersBaseQuery.isLoading;
  const isFetching = matchesRawQuery.isFetching || playersBaseQuery.isFetching;
  const error = matchesRawQuery.error || playersBaseQuery.error;

  const refetch = useCallback(async () => {
    await Promise.all([
      matchesRawQuery.refetch(),
      activeDatesQuery.refetch(),
      playersBaseQuery.refetch(),
    ]);
  }, [matchesRawQuery, activeDatesQuery, playersBaseQuery]);

  const recordMatchMutation = useMutation({
    mutationFn: gasApi.recordMatchAndUpdate,
    onSuccess: async () => {
      // 全面強制重新抓取原始資料
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['matches-raw'] }),
        queryClient.refetchQueries({ queryKey: ['playerStats'] }),
        queryClient.refetchQueries({ queryKey: ['players-base'] }),
      ]);
    },
    onError: (err) => {
      console.error('API 寫入失敗:', err);
    },
  });

  /**
   * 本地樂觀更新：直接將新比賽注入 React Query 快取
   */
  const addLocalMatch = (match: MatchRecord) => {
    queryClient.setQueryData<MatchRecord[]>(['matches', targetDate], (old) => {
      const existing = old || [];
      const sameDay = existing.filter(m => m.matchDate === match.matchDate);
      const newMatch = { ...match, matchNo: sameDay.length + 1 };
      return [newMatch, ...existing];
    });
  };

  return useMemo(() => ({
    matches,
    activeDates,
    activeMatchDates: activeDates, // 相容舊命名
    isLoading,
    isFetching,
    error,
    refetch,
    recordMatch: recordMatchMutation.mutateAsync,
    isSubmitting: recordMatchMutation.isPending,
    addLocalMatch,
  }), [
    matches, activeDates, isLoading, isFetching, error,
    refetch, recordMatchMutation.mutateAsync, recordMatchMutation.isPending
  ]);
}
