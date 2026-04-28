/**
 * Shared data mappers — 統一的資料轉換工具函式。
 * 消除 useMatches.ts 與 matchEngine.ts 中重複的 resolvePlayer 邏輯。
 * 
 * Vercel Best Practice: `js-set-map-lookups` — 使用 Map 取代 Array.find 做 O(1) lookup。
 */

import type { MatchRecord, MatchPlayer } from '../types';
import type { RawPlayer, RawMatch } from './gasApi';

/**
 * 建立 player name → RawPlayer 的快速查找表 (O(1) lookup)
 */
export function buildPlayerMap(players: RawPlayer[]): Map<string, RawPlayer> {
  return new Map(players.map(p => [p.name, p]));
}

/**
 * 將 GAS 原始 match player 轉換為前端 MatchPlayer
 * 使用 Map lookup 代替 Array.find (O(1) vs O(n))
 */
export function resolveMatchPlayer(
  p: { id?: string; name: string; muBefore?: number; muAfter?: number; avatar?: string },
  playerMap: Map<string, RawPlayer>,
): MatchPlayer {
  const found = playerMap.get(p.name);
  return {
    id: p.id || found?.id || '',
    name: p.name,
    avatar: p.avatar || found?.avatar,
    muBefore: p.muBefore,
    muAfter: p.muAfter,
  };
}

/**
 * 將 GAS 原始 match 轉換為前端 MatchRecord
 */
export function mapRawMatchToRecord(
  m: RawMatch,
  playerMap: Map<string, RawPlayer>,
): MatchRecord {
  return {
    id: String(m.id),
    date: m.date || '',
    matchDate: m.matchDate || (m.date ? m.date.split('T')[0].split(' ')[0] : ''),
    team1: (m.team1 || []).map(p => resolveMatchPlayer(p, playerMap)),
    team2: (m.team2 || []).map(p => resolveMatchPlayer(p, playerMap)),
    winner: m.winner as 1 | 2,
    score: m.score || '',
    duration: m.duration || '',
    courtName: m.courtName,
  };
}

/**
 * 批量轉換 + 計算 matchNo + 排序
 */
export function mapAndSortMatches(
  rawMatches: RawMatch[],
  playerMap: Map<string, RawPlayer>,
): MatchRecord[] {
  const mapped = rawMatches.map(m => mapRawMatchToRecord(m, playerMap));

  // Calculate matchNo for each day
  const groupedByDay: Record<string, MatchRecord[]> = {};
  for (const m of mapped) {
    const day = m.matchDate || 'unknown';
    if (!groupedByDay[day]) groupedByDay[day] = [];
    groupedByDay[day].push(m);
  }

  for (const dayMatches of Object.values(groupedByDay)) {
    const sorted = [...dayMatches].sort((a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    sorted.forEach((m, idx) => {
      m.matchNo = idx + 1;
    });
  }

  // Sort newest first
  return mapped.sort((a, b) => {
    const ta = a.date ? new Date(a.date).getTime() : 0;
    const tb = b.date ? new Date(b.date).getTime() : 0;
    return tb - ta;
  });
}
