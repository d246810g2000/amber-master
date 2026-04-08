import { GAS_URL } from './config';

import { 
  RawPlayerSchema, 
  RawPlayerStatSchema, 
  RawMatchSchema, 
  PlayerBindingSchema,
  UserBindingSchema,
  GasResponseSchema,
  type RawPlayer,
  type RawPlayerStat,
  type RawMatch
} from './apiSchema.ts';
import { z } from 'zod';

interface ApiError extends Error {
  code?: string;
}

const ERROR_TRANSLATIONS: Record<string, string> = {
  'This account is already bound to another player': '此帳號已綁定其他球員',
  'This player is already bound to another account': '此球員已被其他帳號綁定',
  'Player not found': '找不到球員',
  'Invalid parameters': '參數錯誤',
  'Unauthorized': '未經授權',
};

function createApiError(message: string, code?: string): ApiError {
  const translatedMessage = ERROR_TRANSLATIONS[message] || message;
  const err = new Error(translatedMessage) as ApiError;
  if (code) err.code = code;
  return err;
}

async function gasGet<T>(params: Record<string, string> | undefined, schema: z.ZodType<T>): Promise<T> {
  const url = new URL(GAS_URL);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
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
  throw createApiError(parsed.data.message || 'API Error', (parsed.data as any).code);
}

async function gasPost<T>(body: Record<string, unknown>, schema: z.ZodType<T>): Promise<T> {
  const res = await fetch(GAS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify(body),
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
  throw createApiError(parsed.data.message || 'API Error', (parsed.data as any).code);
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
export async function addPlayer(name: string, avatar?: string, type?: 'resident' | 'guest') {
  return gasPost({ action: 'addPlayer', name, avatar, type }, z.any());
}

/** 批次新增球員 */
export async function addPlayersBatch(players: { name: string, avatar?: string, type?: 'resident' | 'guest' }[]) {
  return gasPost({ action: 'addPlayersBatch', names: players }, z.any());
}

/** 更新球員名稱與頭像 */
export async function updatePlayer(id: string, name?: string, avatar?: string, type?: 'resident' | 'guest') {
  return gasPost({ action: 'updatePlayer', id, name, avatar, type }, z.any());
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

export async function bindPlayer(playerId: string, userEmail: string) {
  return gasPost({ action: 'bindPlayer', playerId, userEmail }, z.any());
}

export async function unbindPlayer(playerId: string, userEmail: string) {
  return gasPost({ action: 'unbindPlayer', playerId, userEmail }, z.any());
}

export async function getPlayerBinding(playerId: string, userEmail: string) {
  return gasGet({ action: 'getPlayerBinding', playerId, userEmail }, PlayerBindingSchema);
}

export async function getUserBinding(userEmail: string) {
  return gasGet({ action: 'getUserBinding', userEmail }, UserBindingSchema);
}


export async function getCourtState(date?: string) {
  const params: Record<string, any> = { action: 'getCourtState' };
  if (date) params.date = date;
  return gasGet(params, z.any());
}

export async function updateCourtState(data: { expectedVersion: number; state: any; updatedBy: string; takeover?: boolean; updaterName?: string; enableLine?: boolean }) {
  // 這裡不使用 gasPost 解析 success/error，因為 conflict 時我們也要拿 data
  const res = await fetch(GAS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ action: 'updateCourtState', ...data }),
  });
  const json = await res.json();
  const parsed = GasResponseSchema(z.any()).safeParse(json);
  
  if (!parsed.success) {
    throw new Error('API Response format invalid');
  }
  
  // conflict 也是一種預期的回應，所以直接打包回傳
  return {
    status: parsed.data.status,
    data: parsed.data.data,
    message: parsed.data.message
  };
}


export type UserBinding = z.infer<typeof UserBindingSchema>;
export type { RawPlayer, RawPlayerStat, RawMatch };
