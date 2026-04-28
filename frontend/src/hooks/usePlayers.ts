import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as gasApi from '../lib/gasApi';
import * as matchEngine from '../lib/matchEngine';
import { getTaipeiDateString } from '../lib/utils';
import type { Player } from '../types';
import type { DerivedPlayer } from '../lib/matchEngine';

export type PlayerStatus = "ready" | "resting" | "playing" | "finishing";

const EMPTY_PLAYERS: DerivedPlayer[] = [];

export function usePlayers(targetDate: string = getTaipeiDateString()) {
  const queryClient = useQueryClient();
  const [playerStatus, setPlayerStatus] = useState<Record<string, PlayerStatus>>({});

  // 1. 原始資料抓取 (Base Queries)
  const playersBaseQuery = useQuery({
    queryKey: ['players-base'],
    queryFn: gasApi.fetchPlayers,
    staleTime: 30000,
  });

  const playerStatsQuery = useQuery({
    queryKey: ['playerStats', targetDate],
    queryFn: () => gasApi.fetchPlayerStats(targetDate),
    staleTime: 5000,
  });

  // 2. 衍生資料計算 (Derived Data)
  const players = useMemo(() => {
    if (!playersBaseQuery.data) return EMPTY_PLAYERS;
    
    const statsMap = new Map();
    if (playerStatsQuery.data) {
      playerStatsQuery.data.forEach((s: any) => statsMap.set(s.id, s));
    }

    return playersBaseQuery.data.map((p: Player) => {
      const s = statsMap.get(p.id);
      return {
        ...p,
        mu: s ? s.mu : (p.mu || 25.0),
        sigma: s ? s.sigma : (p.sigma || 8.333),
        matchCount: s ? s.matchCount : 0,
        winCount: s ? s.winCount : 0,
        winRate: s ? s.winRate : 0,
        streak: 0, // 暫不計算連勝，以後由後端提供
      } as DerivedPlayer;
    }).sort((a: any, b: any) => b.mu - a.mu);
  }, [playersBaseQuery.data, playerStatsQuery.data]);

  const isLoading = playersBaseQuery.isLoading || playerStatsQuery.isLoading;
  const isFetching = playersBaseQuery.isFetching || playerStatsQuery.isFetching;
  const error = playersBaseQuery.error || playerStatsQuery.error;

  const refetch = useCallback(async () => {
    await Promise.all([
      playersBaseQuery.refetch(),
      playerStatsQuery.refetch(),
    ]);
  }, [playersBaseQuery, playerStatsQuery]);

  // 當切換日期時，重置本地球員狀態，確保重新從同步狀態讀取或根據新日期初始化
  const lastDateRef = useRef(targetDate);

  // Initialize player status when players are loaded or date changes
  useEffect(() => {
    const isDateChanged = lastDateRef.current !== targetDate;
    if (isDateChanged) {
      lastDateRef.current = targetDate;
    }

    if (players.length > 0) {
      setPlayerStatus(prev => {
        // 如果日期變了，我們強制從空狀態開始，防止舊日期的狀態（如 KL/Louis 是備戰）洩漏到新日期
        const next = isDateChanged ? {} : { ...prev };
        let changed = isDateChanged; 

        players.forEach(p => {
          if (!next[p.id]) {
            // 常駐球員預設備戰，零打球員預設休息
            next[p.id] = p.type === 'resident' ? "ready" : "resting";
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    }
  }, [players, targetDate]);

  const togglePlayerStatus = useCallback((playerId: string) => {
    setPlayerStatus((prev) => {
      const current = prev[playerId];
      if (current === "playing" || current === "finishing") return prev;
      return {
        ...prev,
        [playerId]: current === "resting" ? "ready" : "resting",
      };
    });
  }, []);

  const setStatus = useCallback((playerId: string, status: PlayerStatus) => {
    setPlayerStatus(prev => ({ ...prev, [playerId]: status }));
  }, []);

  const setMultipleStatus = useCallback((updates: Record<string, PlayerStatus>) => {
    setPlayerStatus(prev => ({ ...prev, ...updates }));
  }, []);

  const updateLocalPlayers = useCallback((updates: {
    id: string; mu: number; sigma: number;
    matchCount: number; winCount: number; winRate: number;
  }[]) => {
    // 這裡我們不直接修改衍生後的 'players'，而是應該 invalidating 原始資料
    // 但為了極致流暢，可以先手動更新衍生資料的 cache (如果有的話)
    // 由於我們改用扁平結構，衍生資料是基於原始資料算出來的，
    // 最好的做法是讓原始資料重新整理。
    refetch();
  }, [refetch]);

  return useMemo(() => ({
    players,
    playerStatus,
    setPlayerStatus,
    togglePlayerStatus,
    setStatus,
    setMultipleStatus,
    isLoading,
    isFetching,
    error,
    refetch,
    updateLocalPlayers,
  }), [
    players, playerStatus, togglePlayerStatus, setStatus, setMultipleStatus,
    isLoading, isFetching, error,
    refetch, updateLocalPlayers
  ]);
}
