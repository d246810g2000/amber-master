import { GAS_URL } from './config';

import { 
  RawPlayerSchema, 
  RawPlayerStatSchema, 
  RawMatchSchema, 
  GasResponseSchema,
  type RawPlayer,
  type RawPlayerStat,
  type RawMatch
} from './apiSchema.ts';
import { z } from 'zod';

async function gasGet<T>(params: Record<string, string> | undefined, schema: z.ZodType<T>): Promise<T> {
  const url = new URL(GAS_URL);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }
  const token = localStorage.getItem('amber_auth_token');
  if (token) {
    url.searchParams.set('token', token);
  }
  const res = await fetch(url.toString());
  const json = await res.json();
  const parsed = GasResponseSchema(schema).safeParse(json);
  
  if (!parsed.success) {
    console.error('API Parse Error:', parsed.error);
    throw new Error('API Response format invalid');
  }

  if (parsed.data.status === 'success' && parsed.data.data !== undefined) {
    return parsed.data.data;
  }
  throw new Error(parsed.data.message || 'API Error');
}

async function gasPost<T>(body: Record<string, unknown>, schema: z.ZodType<T>): Promise<T> {
  const token = localStorage.getItem('amber_auth_token');
  const payload = token ? { ...body, token } : body;

  const res = await fetch(GAS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  const parsed = GasResponseSchema(schema).safeParse(json);

  if (!parsed.success) {
    console.error('API Parse Error:', parsed.error);
    throw new Error('API Response format invalid');
  }

  if (parsed.data.status === 'success') {
    return parsed.data.data as T;
  }
  throw new Error(parsed.data.message || 'API Error');
}

/** 取得球員基本名單 */
export async function fetchPlayers(): Promise<RawPlayer[]> {
  return gasGet(undefined, z.array(RawPlayerSchema));
}

/** 取得 PlayerStats 快照 */
export async function fetchPlayerStats(): Promise<RawPlayerStat[]> {
  try {
    return await gasGet({ action: 'getPlayerStats' }, z.array(RawPlayerStatSchema));
  } catch (err) {
    console.warn('Failed to fetch stats snapshots:', err);
    return [];
  }
}

/** 取得對戰紀錄 */
export async function fetchMatches(date?: string): Promise<RawMatch[]> {
  const params: Record<string, string> = { action: 'getMatches' };
  if (date) params.date = date;
  try {
    return await gasGet(params, z.array(RawMatchSchema));
  } catch (err) {
    console.warn('Failed to fetch matches:', err);
    return [];
  }
}

/** 新增球員 */
export async function addPlayer(name: string) {
  return gasPost({ action: 'addPlayer', name }, z.any());
}

/** 批次新增球員 */
export async function addPlayersBatch(names: string[]) {
  return gasPost({ action: 'addPlayersBatch', names }, z.any());
}

/** 更新球員名稱與頭像 */
export async function updatePlayer(id: string, name: string, avatar?: string) {
  return gasPost({ action: 'updatePlayer', id, name, avatar }, z.any());
}

/** 刪除球員 */
export async function deletePlayer(id: string) {
  return gasPost({ action: 'deletePlayer', id }, z.any());
}

/** 批次刪除球員 */
export async function deletePlayersBatch(ids: string[]) {
  return gasPost({ action: 'deletePlayersBatch', ids }, z.any());
}

/** 記錄比賽結果並更新 GAS */
export async function recordMatchAndUpdate(data: {
  matchId?: string;
  date: string;
  matchDate?: string;
  t1p1: string;
  t1p2: string;
  t2p1: string;
  t2p2: string;
  winnerTeam: 'Team 1' | 'Team 2';
  updatedPlayers: unknown[];
  updatedStats: unknown[];
  duration?: string;
  score?: string;
  courtName?: string;
  matchNo?: number;
}) {
  return gasPost({ action: 'recordMatchAndUpdate', ...data }, z.any());
}

/** 批次更新球員屬性 (對應 GAS 的 batchUpdatePlayers) */
export async function batchUpdatePlayers(updates: { id: string, mu: number, sigma: number }[]) {
  return gasPost({ action: 'batchUpdatePlayers', updates }, z.any());
}


export type { RawPlayer, RawPlayerStat, RawMatch };
