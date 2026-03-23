import { useState, useCallback, useMemo, useEffect } from 'react';
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

  const playersQuery = useQuery({
    queryKey: ['players', targetDate],
    queryFn: async () => {
      const [basePlayers, stats, matches] = await Promise.all([
        gasApi.fetchPlayers(),
        gasApi.fetchPlayerStats(),
        gasApi.fetchMatches(targetDate),
      ]);
      
      const derived = matchEngine.getDerivedPlayers(basePlayers, stats, matches, targetDate);
      return derived.sort((a, b) => b.mu - a.mu);
    },
  });

  const players = playersQuery.data || EMPTY_PLAYERS;

  // Initialize player status when players are loaded
  useEffect(() => {
    if (players.length > 0) {
      setPlayerStatus(prev => {
        const next = { ...prev };
        let changed = false;
        players.forEach(p => {
          if (!next[p.id]) {
            next[p.id] = "resting";
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    }
  }, [players]);

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

  /**
   * 本地樂觀更新：直接修改快取中的球員戰力數值
   * 不需等待 GAS 回應，UI 立即反映
   */
  const updateLocalPlayers = useCallback((updates: {
    id: string; mu: number; sigma: number;
    matchCount: number; winCount: number; winRate: number;
  }[]) => {
    queryClient.setQueryData<DerivedPlayer[]>(['players', targetDate], (old) => {
      if (!old) return old;
      const updateMap = new Map(updates.map(u => [u.id, u]));
      const updated = old.map(p => {
        const u = updateMap.get(p.id);
        if (u) {
          return {
            ...p,
            mu: u.mu,
            sigma: u.sigma,
            matchCount: u.matchCount,
            winCount: u.winCount,
            winRate: u.winRate,
          };
        }
        return p;
      });
      // 重新排序（按 mu 高到低）
      return updated.sort((a, b) => b.mu - a.mu);
    });
  }, [queryClient, targetDate]);

  return {
    players,
    playerStatus,
    setPlayerStatus,
    togglePlayerStatus,
    setStatus,
    setMultipleStatus,
    isLoading: playersQuery.isLoading,
    isFetching: playersQuery.isFetching,
    error: playersQuery.error,
    refetch: playersQuery.refetch,
    updateLocalPlayers,
  };
}
