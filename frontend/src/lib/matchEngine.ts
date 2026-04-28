import { Player } from '../types';

/**
 * 戰力與配對邏輯已全面遷移至後端 FastAPI。
 * 前端僅保留必要的介面定義與輕量級顯示邏輯。
 */

export const INITIAL_MU = 25.0;
export const INITIAL_SIGMA = 25.0 / 3.0;

export interface DerivedPlayer extends Player {
  matchCount: number;
  winCount: number;
  lossCount: number;
  winRate: number;
  lastPlayed?: string;
  streak: number;
}

export interface PlayerHistoryResult {
  stats: {
    totalMatches: number;
    winCount: number;
    lossCount: number;
    winRate: number;
  };
  todayStats: {
    date: string;
    totalMatches: number;
    winCount: number;
    lossCount: number;
    winRate: number;
  };
  matches: any[];
}

export interface MatchSuggestion {
  team1: Player[];
  team2: Player[];
  quality: number;
}

/**
 * 將 Mu 值轉換為更易讀的戰力分數
 */
export function formatPowerScore(mu: number): string {
  return mu.toFixed(1);
}

/**
 * 計算勝率 (0-100)
 */
export function calculateWinRate(wins: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((wins / total) * 100);
}

/**
 * 計算連休場數 (UI 顯示用)
 */
export function getConsecutiveMissedMatches(matches: any[], playerId: string): number {
  if (!Array.isArray(matches)) return 0;
  let count = 0;
  for (const m of matches) {
    if (!m) continue;
    const isPlayerInMatch = [...(m.team1 || []), ...(m.team2 || [])].some(p => p && String(p.id) === playerId);
    if (isPlayerInMatch) break;
    count++;
  }
  return count;
}
