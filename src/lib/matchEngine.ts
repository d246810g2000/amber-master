/**
 * Match Engine — 前端化的 TrueSkill 計算、配對邏輯、球員戰力推算。
 * 移植自 server.ts 的核心邏輯。
 */

import { Rating, rate, quality } from 'ts-trueskill';
import { Player, MatchRecord } from '../types';
import { getTaipeiDateString, getTaipeiISOString } from './utils';
import type { RawPlayer, RawPlayerStat, RawMatch } from './gasApi';

export const INITIAL_MU = 25.0;
export const INITIAL_SIGMA = 8.333;
export const BASE_MU = INITIAL_MU;
export const BASE_SIGMA = INITIAL_SIGMA;

// ─── Helpers ───
 
/**
 * 取得陣列的所有子集組合 (k-combinations)
 */
function getCombinations<T>(array: T[], k: number): T[][] {
  const result: T[][] = [];
  function backtrack(start: number, current: T[]) {
    if (current.length === k) {
      result.push([...current]);
      return;
    }
    for (let i = start; i < array.length; i++) {
        current.push(array[i]);
        backtrack(i + 1, current);
        current.pop();
    }
  }
  backtrack(0, []);
  return result;
}

/**
 * 根據比分計算權重 Multiplier (M)
 * 公式: M = (2 * WinnerScore) / (WinnerScore + LoserScore)
 * 範圍限制在 [1.0, 1.5] 之間。
 */
export function calculateScoreMultiplier(scoreStr?: string): number {
  if (!scoreStr) return 1.0;
  
  // 解析比分 (支援 21:10, 21-10, 21 10)
  const parts = scoreStr.split(/[:\-\s]+/).map(Number).filter(n => !isNaN(n));
  if (parts.length < 2) return 1.0;

  const w = Math.max(parts[0], parts[1]);
  const l = Math.min(parts[0], parts[1]);
  
  if (w === 0) return 1.0; // 避免除以 0

  const rawM = (2 * w) / (w + l);
  // 限制在 1.0 (最小) 到 1.5 (最大加權) 之間
  return Math.max(1.0, Math.min(1.5, rawM));
}

function getLocalDateString(dateVal?: unknown): string {
  if (typeof dateVal === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateVal)) return dateVal;
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(dateVal)) return dateVal.split(' ')[0];
    if (dateVal.includes('T')) return dateVal.split('T')[0];
  }
  const d = dateVal ? new Date(dateVal as string) : new Date();
  if (isNaN(d.getTime())) return '';
  return getTaipeiDateString(d);
}

function getSafeTime(dateVal: unknown): number {
  if (!dateVal) return 0;
  const d = new Date(dateVal as string);
  if (isNaN(d.getTime())) return 0;
  return d.getTime();
}

function getTaipeiDateTimeString(): string {
  return getTaipeiISOString();
}

// ─── Core: getDerivedPlayers ───

export interface DerivedPlayer extends Player {
  winCount?: number;
}

/**
 * 從 GAS 原始資料推算即時戰力。
 * 邏輯移植自 server.ts 的 getDerivedPlayers()。
 */
export function getDerivedPlayers(
  basePlayers: RawPlayer[],
  statsSnapshots: RawPlayerStat[],
  allMatches: RawMatch[],
  targetDate: string,
): DerivedPlayer[] {
  const today = getTaipeiDateString();

  // 0. 先針對 basePlayers 去重（避免 GAS 回傳重複 ID）
  const uniqueBasePlayers = Array.from(new Map(basePlayers.map(p => [p.id, p])).values());

  // 1. 建立快照字典
  const dailySnapshots: Record<string, {
    mu: number; sigma: number; matchCount: number; winCount: number; winRate: number;
  }> = {};

  statsSnapshots.forEach((stat) => {
    const statDate = getLocalDateString(stat.date);
    if (statDate === targetDate) {
      const idVal = stat.id;
      if (idVal) {
        dailySnapshots[idVal] = {
          mu: stat.mu ?? INITIAL_MU,
          sigma: stat.sigma ?? INITIAL_SIGMA,
          matchCount: stat.matchCount ?? 0,
          winCount: stat.winCount ?? 0,
          winRate: stat.winRate ?? 0,
        };
      }
    }
  });

  // 篩選當日比賽
  const dailyMatches = allMatches
    .filter((m) => {
      const mDate = m.matchDate || getLocalDateString(m.date);
      return mDate === targetDate;
    })
    .sort((a, b) => getSafeTime(a.date) - getSafeTime(b.date));

  // 決定初始狀態
  const useSnapshot = targetDate !== today && Object.keys(dailySnapshots).length > 0;
  const dailyState: Record<string, DerivedPlayer> = {};

  uniqueBasePlayers.forEach((p) => {
    if (useSnapshot && dailySnapshots[p.id]) {
      dailyState[p.id] = { ...p, ...dailySnapshots[p.id] };
    } else {
      dailyState[p.id] = {
        ...p,
        mu: INITIAL_MU,
        sigma: INITIAL_SIGMA,
        matchCount: 0,
        winCount: 0,
        winRate: 0,
      };
    }
  });

  // 今天或沒有快照 → 逐場計算
  if (!useSnapshot) {
    dailyMatches.forEach((match) => {
      const t1p1 = dailyState[match.team1?.[0]?.id || ""];
      const t1p2 = dailyState[match.team1?.[1]?.id || ""];
      const t2p1 = dailyState[match.team2?.[0]?.id || ""];
      const t2p2 = dailyState[match.team2?.[1]?.id || ""];

      if (t1p1 && t1p2 && t2p1 && t2p2) {
        const team1Ratings = [new Rating(t1p1.mu, t1p1.sigma), new Rating(t1p2.mu, t1p2.sigma)];
        const team2Ratings = [new Rating(t2p1.mu, t2p1.sigma), new Rating(t2p2.mu, t2p2.sigma)];

        const winnerVal = match.winner;
        const ranks = (Number(winnerVal) === 1) ? [0, 1] : [1, 0];
        const [newTeam1, newTeam2] = rate([team1Ratings, team2Ratings], ranks);

        const multiplier = calculateScoreMultiplier(match.score);

        // 套用加權後的 Mu (Delta * M)
        t1p1.mu = t1p1.mu + (newTeam1[0].mu - t1p1.mu) * multiplier;
        t1p1.sigma = newTeam1[0].sigma;
        t1p2.mu = t1p2.mu + (newTeam1[1].mu - t1p2.mu) * multiplier;
        t1p2.sigma = newTeam1[1].sigma;
        t2p1.mu = t2p1.mu + (newTeam2[0].mu - t2p1.mu) * multiplier;
        t2p1.sigma = newTeam2[0].sigma;
        t2p2.mu = t2p2.mu + (newTeam2[1].mu - t2p2.mu) * multiplier;
        t2p2.sigma = newTeam2[1].sigma;

        [t1p1, t1p2, t2p1, t2p2].forEach((p) => p.matchCount = (p.matchCount || 0) + 1);
        if (winnerVal === 1) { t1p1.winCount = (t1p1.winCount || 0) + 1; t1p2.winCount = (t1p2.winCount || 0) + 1; }
        else { t2p1.winCount = (t2p1.winCount || 0) + 1; t2p2.winCount = (t2p2.winCount || 0) + 1; }

        [t1p1, t1p2, t2p1, t2p2].forEach((p) => {
          p.winRate = (p.matchCount || 0) > 0 ? Math.round(((p.winCount || 0) / (p.matchCount || 1)) * 100) : 0;
        });
      }
    });
  }

  return Object.values(dailyState);
}

// ─── Matchmaking ───

export interface MatchSuggestion {
  team1: DerivedPlayer[];
  team2: DerivedPlayer[];
  quality: number;
}

/**
 * 配對演算法：實現絕對公平輪替、體力連打平衡與對戰多樣性。
 */
export const ENGINE_CONFIG = {
  MODE: 'Hard-Constraint (Anti-Bench Mode)',
  WAIT_WEIGHT: 10,
  BONUS_THRESHOLD: 3,
  BONUS_MULTIPLIER: 1000,
  FATIGUE_PENALTY_PER_GAME: 2, // 每多連打一場，戰力計算時扣除的分數
};

export function matchmake(
  allPlayers: DerivedPlayer[], 
  playerIds: string[], 
  recentMatches: MatchRecord[] = [],
  ignoreFatigue = false,
  targetDate: string = getTaipeiDateString()
): (MatchSuggestion & { effectiveQuality: number })[] {
  const stringPlayerIds = playerIds.map(id => String(id));
  const targetPlayers = allPlayers.filter((p) => stringPlayerIds.includes(String(p.id)));
  if (targetPlayers.length < 4) throw new Error('每場比賽至少需要 4 名球員');

  // 0. 計算每位球員的等候時間 (Rounds Since Played) 與 連打次數 (Consecutive Matches)
  const waitCountMap: Record<string, number> = {};
  const consecutiveCountMap: Record<string, number> = {};
  stringPlayerIds.forEach(id => {
    waitCountMap[id] = 0;
    consecutiveCountMap[id] = 0;
  });
  
  // 遍歷最近對戰
  let stillConsecutive: Record<string, boolean> = {};
  stringPlayerIds.forEach(id => stillConsecutive[id] = true);

  for (let i = 0; i < recentMatches.length; i++) {
    const match = recentMatches[i];
    const participants = new Set([...match.team1, ...match.team2].map(p => String(p.id)));
    stringPlayerIds.forEach(id => {
      if (participants.has(id)) {
        if (waitCountMap[id] === 0) waitCountMap[id] = i + 1;
        if (stillConsecutive[id]) consecutiveCountMap[id]++;
      } else {
        stillConsecutive[id] = false; // 只要有一場沒打，連打就中斷
      }
    });
  }
  
  // 對於從未上場的人 (剛到)，給予模擬的中等等待
  stringPlayerIds.forEach(id => {
    if (waitCountMap[id] === 0) {
        waitCountMap[id] = 2;
        consecutiveCountMap[id] = 0;
    }
  });

  // 1. 給予權重排序：等候感優先 (Social-Diversity Mode)
  // Score = matchCount * 10 - waitCount * 3
  const playerScores = targetPlayers.map(p => {
    const wait = waitCountMap[String(p.id)] || 0;
    const match = p.matchCount || 0;
    // 連休 2 場 (wait >= 3) -> 給予極高優先權 (核彈級權重)
    // 確保任何連休 2 場的人在下一場空位出現時必定上場
    const bonus = wait >= 3 ? 1000 : 0; 
    return {
      player: p,
      score: (match * 10) - (wait * 10) - bonus
    };
  });

  playerScores.sort((a, b) => a.score - b.score || Math.random() - 0.5);
  
  // 2. 挑選候選池 (前 12 名)
  // 這樣能保證連休的人一定在前 12 名內被選中，進入全組合掃描
  const pool = playerScores.slice(0, 12).map(s => s.player);
  
  // 3. 獲取直接疲勞 ID (最後 1 場共 4 人)，避免連打
  // 即使在 pool 內，排點組合評分時仍會避開剛打完的人
  const lastMatchIds = new Set<string>();
  if (recentMatches.length > 0) {
    const m = recentMatches[0];
    [...m.team1, ...m.team2].forEach(p => lastMatchIds.add(String(p.id)));
  }

  const finalists = pool.slice(0, 12);
  const n = finalists.length;
  const matches: (MatchSuggestion & { effectiveQuality: number })[] = [];

  // 評估組合多樣性的輔助函式
  const getPenalty = (t1: DerivedPlayer[], t2: DerivedPlayer[]) => {
    let penalty = 0;
    const currentFourIds = new Set([...t1, ...t2].map(p => String(p.id)));

    // 歷史多樣性懲罰 (隊友重複、對手重複)
    // 掃描範圍擴大至 20 場或當天所有比賽
    const scanLimit = Math.max(15, recentMatches.length);
    recentMatches.slice(0, scanLimit).forEach((m, idx) => {
      const m1Ids = new Set(m.team1.map(p => String(p.id)));
      const m2Ids = new Set(m.team2.map(p => String(p.id)));
      const allMIds = new Set([...m1Ids, ...m2Ids]);
      
      const isToday = m.matchDate === targetDate;
      // 當天活動的權重極高 (1.2x)，確保在 24 場以內絕不輕易重複
      const weight = isToday ? 1.2 : Math.max(0.1, (scanLimit - idx) / scanLimit);

      // A. 四人組重複：極重罰 (0.6 -> 0.8)
      let sameQuartetCount = 0;
      allMIds.forEach(id => { if (currentFourIds.has(id)) sameQuartetCount++; });
      if (sameQuartetCount === 4) penalty += 0.8 * weight;

      // B. 固定搭檔重複：重罰 (0.35 -> 0.4)
      const t1Repeat = t1.every(p => m1Ids.has(String(p.id))) || t1.every(p => m2Ids.has(String(p.id)));
      const t2Repeat = t2.every(p => m1Ids.has(String(p.id))) || t2.every(p => m2Ids.has(String(p.id)));
      if (t1Repeat) penalty += 0.4 * weight;
      if (t2Repeat) penalty += 0.4 * weight;
      
      // C. 互動重複：只要 4 人中有 2 人以上在同一場出現過，就給予累進懲罰
      if (sameQuartetCount >= 2) {
        penalty += (sameQuartetCount - 1) * 0.15 * weight;
      }
    });

    // 3. 連場疲勞懲罰 (除非開啟無視疲勞)
    if (!ignoreFatigue) {
      const fatigueCount = [...currentFourIds].filter(id => lastMatchIds.has(id)).length;
      if (fatigueCount > 0) {
        // 連打一場基礎罰 0.35，連打兩場（全場 4 人都在）極重罰
        penalty += 0.35 * fatigueCount;
      }
    }

    return penalty;
  };

  const processGroup = (group: DerivedPlayer[]) => {
    const candidates: [DerivedPlayer[], DerivedPlayer[]][] = [
      [[group[0], group[3]], [group[1], group[2]]],
      [[group[0], group[2]], [group[1], group[3]]],
      [[group[0], group[1]], [group[2], group[3]]],
    ];

    candidates.forEach(([t1, t2]) => {
      // 考慮連打疲勞後的「有效戰力」進行平衡分組
      const getEffectiveRating = (p: DerivedPlayer) => {
        const count = consecutiveCountMap[String(p.id)] || 0;
        const penalty = (!ignoreFatigue && count >= 1) ? count * ENGINE_CONFIG.FATIGUE_PENALTY_PER_GAME : 0;
        return new Rating(p.mu - penalty, p.sigma);
      };

      const team1Ratings = t1.map(p => getEffectiveRating(p));
      const team2Ratings = t2.map(p => getEffectiveRating(p));
      
      const q = quality([team1Ratings, team2Ratings]);
      const penalty = getPenalty(t1, t2);
      
      // 有效品質評級 (考慮歷史重複與疲勞懲罰)
      const effectiveQuality = q - penalty + (Math.random() * 0.02);
      matches.push({ team1: t1, team2: t2, quality: q, effectiveQuality });
    });
  };

  if (finalists.length === 4) {
    processGroup(finalists);
  } else {
    // 改用全組合掃描 (Exhaustive Scan)
    // C(12, 4) = 495 組，每組 3 種分隊 = 1485 種可能，計算量極小但能徹底解決重複問題
    const allQuartets = getCombinations(finalists, 4);
    
    // 如果組合太多 (例如 > 20 人)，則進行隨機抽樣以保全效能
    const sampledQuartets = allQuartets.length > 1000 
      ? allQuartets.sort(() => Math.random() - 0.5).slice(0, 1000)
      : allQuartets;

    sampledQuartets.forEach(group => {
      processGroup(group);
    });
  }

  matches.sort((a, b) => b.effectiveQuality - a.effectiveQuality);
  return matches.slice(0, 10);
}

// ─── Calculate Match Result ───

export interface MatchResultData {
  matchRecord: MatchRecord;
  updatedPlayers: {
    id: string; name: string; muBefore: number; muAfter: number; mu: number; sigma: number;
  }[];
  updatedStats: {
    Date: string; ID: string; Name: string; Mu: number; Sigma: number;
    MatchCount: number; WinCount: number; WinRate: number;
  }[];
}

/**
 * 計算比賽結果 — 移植自 server.ts 的 POST /api/matches 邏輯。
 */
export function calculateMatchResult(
  allPlayers: DerivedPlayer[],
  team1Ids: string[],
  team2Ids: string[],
  winner: 1 | 2,
  matchDate: string,
  score?: string,
  duration?: string,
  matchId?: string,
  quality?: number
): MatchResultData {
  const getPlayer = (id: string) => allPlayers.find((p) => p.id === id);

  const t1p1 = getPlayer(team1Ids[0]);
  const t1p2 = getPlayer(team1Ids[1]);
  const t2p1 = getPlayer(team2Ids[0]);
  const t2p2 = getPlayer(team2Ids[1]);

  if (!t1p1 || !t1p2 || !t2p1 || !t2p2) {
    throw new Error('One or more players not found');
  }

  const team1Ratings = [new Rating(t1p1.mu, t1p1.sigma), new Rating(t1p2.mu, t1p2.sigma)];
  const team2Ratings = [new Rating(t2p1.mu, t2p1.sigma), new Rating(t2p2.mu, t2p2.sigma)];

  const ranks = winner === 1 ? [0, 1] : [1, 0];
  const [newTeam1, newTeam2] = rate([team1Ratings, team2Ratings], ranks);

  const multiplier = calculateScoreMultiplier(score);

  const updatedPlayers = [
    { id: t1p1.id, name: t1p1.name, muBefore: t1p1.mu, muAfter: t1p1.mu + (newTeam1[0].mu - t1p1.mu) * multiplier, mu: t1p1.mu + (newTeam1[0].mu - t1p1.mu) * multiplier, sigma: newTeam1[0].sigma },
    { id: t1p2.id, name: t1p2.name, muBefore: t1p2.mu, muAfter: t1p2.mu + (newTeam1[1].mu - t1p2.mu) * multiplier, mu: t1p2.mu + (newTeam1[1].mu - t1p2.mu) * multiplier, sigma: newTeam1[1].sigma },
    { id: t2p1.id, name: t2p1.name, muBefore: t2p1.mu, muAfter: t2p1.mu + (newTeam2[0].mu - t2p1.mu) * multiplier, mu: t2p1.mu + (newTeam2[0].mu - t2p1.mu) * multiplier, sigma: newTeam2[0].sigma },
    { id: t2p2.id, name: t2p2.name, muBefore: t2p2.mu, muAfter: t2p2.mu + (newTeam2[1].mu - t2p2.mu) * multiplier, mu: t2p2.mu + (newTeam2[1].mu - t2p2.mu) * multiplier, sigma: newTeam2[1].sigma },
  ];

  const makeStatEntry = (p: DerivedPlayer, newMu: number, newSigma: number, isWin: boolean) => {
    const mc = (p.matchCount || 0) + 1;
    const wc = (p.winCount || 0) + (isWin ? 1 : 0);
    return {
      Date: matchDate,
      ID: p.id,
      Name: p.name,
      Mu: newMu,
      Sigma: newSigma,
      MatchCount: mc,
      WinCount: wc,
      WinRate: Math.round((wc / mc) * 100),
    };
  };

  const updatedStats = [
    makeStatEntry(t1p1, updatedPlayers[0].mu, updatedPlayers[0].sigma, winner === 1),
    makeStatEntry(t1p2, updatedPlayers[1].mu, updatedPlayers[1].sigma, winner === 1),
    makeStatEntry(t2p1, updatedPlayers[2].mu, updatedPlayers[2].sigma, winner === 2),
    makeStatEntry(t2p2, updatedPlayers[3].mu, updatedPlayers[3].sigma, winner === 2),
  ];

  const matchRecord: MatchRecord = {
    id: matchId || Date.now().toString(),
    date: getTaipeiDateTimeString(),
    matchDate,
    team1: [
      { id: t1p1.id, name: t1p1.name, avatar: t1p1.avatar, muBefore: t1p1.mu, muAfter: updatedPlayers[0].mu, sigma: updatedPlayers[0].sigma },
      { id: t1p2.id, name: t1p2.name, avatar: t1p2.avatar, muBefore: t1p2.mu, muAfter: updatedPlayers[1].mu, sigma: updatedPlayers[1].sigma },
    ],
    team2: [
      { id: t2p1.id, name: t2p1.name, avatar: t2p1.avatar, muBefore: t2p1.mu, muAfter: updatedPlayers[2].mu, sigma: updatedPlayers[2].sigma },
      { id: t2p2.id, name: t2p2.name, avatar: t2p2.avatar, muBefore: t2p2.mu, muAfter: updatedPlayers[3].mu, sigma: updatedPlayers[3].sigma },
    ],
    winner,
    score: score || '',
    duration: duration || '',
    quality: quality,
  };

  return { matchRecord, updatedPlayers, updatedStats };
}

// ─── Player History ───

export interface PlayerHistoryResult {
  player: RawPlayer & { mu?: number; sigma?: number };
  stats: { totalMatches: number; winCount: number; lossCount: number; winRate: string };
  history: MatchRecord[];
  trend: { date: string; mu: number; matchId: string }[];
}

/**
 * 組合球員歷史資料 — 移植自 server.ts 的 GET /api/players/:id/history。
 */
export function getPlayerHistory(
  playerId: string,
  basePlayers: RawPlayer[],
  allMatches: RawMatch[],
): PlayerHistoryResult {
  const player = basePlayers.find((p) => String(p.id) === playerId);
  if (!player) throw new Error('Player not found');

  // 篩選該球員的對戰
  const playerMatches: MatchRecord[] = allMatches
    .filter((m) => {
      const t1 = m.team1 || [];
      const t2 = m.team2 || [];
      return (
        t1.some((p) => String(p.id) === playerId || p.name === player.name) ||
        t2.some((p) => String(p.id) === playerId || p.name === player.name)
      );
    })
    .map((m) => ({
      id: m.id,
      date: m.date,
      matchDate: m.matchDate || getLocalDateString(m.date),
      team1: m.team1.map((p) => {
        const found = basePlayers.find(bp => bp.name === p.name);
        return { id: p.id || found?.id || '', name: p.name, muBefore: p.muBefore, muAfter: p.muAfter };
      }),
      team2: m.team2.map((p) => {
        const found = basePlayers.find(bp => bp.name === p.name);
        return { id: p.id || found?.id || '', name: p.name, muBefore: p.muBefore, muAfter: p.muAfter };
      }),
      winner: m.winner as 1 | 2,
      score: m.score || '',
      duration: m.duration || '',
    }));

  // 排序：由舊到新
  playerMatches.sort((a, b) => getSafeTime(a.date) - getSafeTime(b.date));

  let winCount = 0;
  const trend: { date: string; mu: number; matchId: string }[] = [];

  playerMatches.forEach((m) => {
    const isTeam1 = m.team1.some((p) => String(p.id) === playerId || p.name === player.name);
    const w = Number(m.winner);
    if ((w === 1 && isTeam1) || (w === 2 && !isTeam1)) winCount++;

    const pInMatch = isTeam1
      ? m.team1.find((p) => String(p.id) === playerId || p.name === player.name)
      : m.team2.find((p) => String(p.id) === playerId || p.name === player.name);

    if (pInMatch?.muAfter !== undefined) {
      trend.push({ date: m.matchDate || getLocalDateString(m.date), mu: pInMatch.muAfter, matchId: m.id });
    }
  });

  // 排序回由新到舊
  const sortedHistory = [...playerMatches].sort((a, b) => getSafeTime(b.date) - getSafeTime(a.date));

  return {
    player,
    stats: {
      totalMatches: playerMatches.length,
      winCount,
      lossCount: playerMatches.length - winCount,
      winRate: playerMatches.length > 0 ? (winCount / playerMatches.length * 100).toFixed(1) : '0',
    },
    history: sortedHistory,
    trend,
  };
}

/**
 * 計算生涯戰力 (從歷史第一場到最後一場逐場推算)
 */
export function calculateComprehensiveMu(
  basePlayers: RawPlayer[],
  allMatches: RawMatch[]
): Record<string, { mu: number; sigma: number }> {
  // 建立「姓名 -> 當前戰力」的對應表
  const state: Record<string, { mu: number; sigma: number }> = {};
  
  // 初始化
  basePlayers.forEach((p) => {
    state[p.name] = { mu: INITIAL_MU, sigma: INITIAL_SIGMA };
  });

  // 排序：由舊到新
  const sortedMatches = [...allMatches].sort((a, b) => getSafeTime(a.date) - getSafeTime(b.date));

  sortedMatches.forEach((match) => {
    const t1Names = (match.team1 || []).map(p => p.name);
    const t2Names = (match.team2 || []).map(p => p.name);

    if (t1Names.length < 2 || t2Names.length < 2) return;

    const t1p1 = state[t1Names[0]];
    const t1p2 = state[t1Names[1]];
    const t2p1 = state[t2Names[0]];
    const t2p2 = state[t2Names[1]];

    if (t1p1 && t1p2 && t2p1 && t2p2) {
      const team1Ratings = [new Rating(t1p1.mu, t1p1.sigma), new Rating(t1p2.mu, t1p2.sigma)];
      const team2Ratings = [new Rating(t2p1.mu, t2p1.sigma), new Rating(t2p2.mu, t2p2.sigma)];

      const winnerVal = match.winner === 1 ? 1 : 2;
      const ranks = winnerVal === 1 ? [0, 1] : [1, 0];
      const [newTeam1, newTeam2] = rate([team1Ratings, team2Ratings], ranks);

      const multiplier = calculateScoreMultiplier(match.score);

      t1p1.mu = t1p1.mu + (newTeam1[0].mu - t1p1.mu) * multiplier;
      t1p1.sigma = newTeam1[0].sigma;
      t1p2.mu = t1p2.mu + (newTeam1[1].mu - t1p2.mu) * multiplier;
      t1p2.sigma = newTeam1[1].sigma;
      t2p1.mu = t2p1.mu + (newTeam2[0].mu - t2p1.mu) * multiplier;
      t2p1.sigma = newTeam2[0].sigma;
      t2p2.mu = t2p2.mu + (newTeam2[1].mu - t2p2.mu) * multiplier;
      t2p2.sigma = newTeam2[1].sigma;
    }
  });

  // 返回 ID -> 戰力 的對應
  const idToResult: Record<string, { mu: number; sigma: number }> = {};
  basePlayers.forEach(p => {
    idToResult[p.id] = state[p.name] || { mu: INITIAL_MU, sigma: INITIAL_SIGMA };
  });
  return idToResult;
}

export function calculateComprehensiveTrend(
  playerId: string,
  basePlayers: RawPlayer[],
  allMatches: RawMatch[]
): { date: string; mu: number; matchId: string }[] {
  const state: Record<string, { mu: number; sigma: number }> = {};
  basePlayers.forEach((p) => {
    state[p.name] = { mu: INITIAL_MU, sigma: INITIAL_SIGMA };
  });

  const sortedMatches = [...allMatches].sort((a, b) => getSafeTime(a.date) - getSafeTime(b.date));
  const trend: { date: string; mu: number; matchId: string }[] = [];
  
  const targetPlayer = basePlayers.find(p => String(p.id) === playerId);
  if (!targetPlayer) return [];

  sortedMatches.forEach((match) => {
    const t1Names = (match.team1 || []).map(p => p.name);
    const t2Names = (match.team2 || []).map(p => p.name);
    if (t1Names.length < 2 || t2Names.length < 2) return;

    const t1p1 = state[t1Names[0]];
    const t1p2 = state[t1Names[1]];
    const t2p1 = state[t2Names[0]];
    const t2p2 = state[t2Names[1]];

    if (t1p1 && t1p2 && t2p1 && t2p2) {
      const winnerVal = match.winner === 1 ? 1 : 2;
      const ranks = winnerVal === 1 ? [0, 1] : [1, 0];
      const [newTeam1, newTeam2] = rate([
        [new Rating(t1p1.mu, t1p1.sigma), new Rating(t1p2.mu, t1p2.sigma)],
        [new Rating(t2p1.mu, t2p1.sigma), new Rating(t2p2.mu, t2p2.sigma)]
      ], ranks);

        const multiplier = calculateScoreMultiplier(match.score);

        t1p1.mu = t1p1.mu + (newTeam1[0].mu - t1p1.mu) * multiplier;
        t1p1.sigma = newTeam1[0].sigma;
        t1p2.mu = t1p2.mu + (newTeam1[1].mu - t1p2.mu) * multiplier;
        t1p2.sigma = newTeam1[1].sigma;
        t2p1.mu = t2p1.mu + (newTeam2[0].mu - t2p1.mu) * multiplier;
        t2p1.sigma = newTeam2[0].sigma;
        t2p2.mu = t2p2.mu + (newTeam2[1].mu - t2p2.mu) * multiplier;
        t2p2.sigma = newTeam2[1].sigma;

      if (t1Names.includes(targetPlayer.name) || t2Names.includes(targetPlayer.name)) {
        trend.push({
          date: match.matchDate || getLocalDateString(match.date),
          mu: state[targetPlayer.name].mu,
          matchId: match.id
        });
      }
    }
  });

  return trend;
}
