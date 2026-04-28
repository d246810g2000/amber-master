import { API_URL } from './config';

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

function translateNetworkError(err: unknown): Error {
  const msg = err instanceof Error ? err.message : String(err);
  if (
    err instanceof TypeError ||
    /failed to fetch|load failed|networkerror|network request failed/i.test(msg)
  ) {
    return new Error(
      "無法連上後端。請稍候再試；請確認 VITE_API_URL 設定正確，並確保後端伺服器正在運行。"
    );
  }
  return err instanceof Error ? err : new Error(String(err));
}

async function fetchWithRetry(
  input: string,
  init: RequestInit,
  opts?: { retries?: number; baseDelayMs?: number }
): Promise<Response> {
  const retries = opts?.retries ?? 2;
  const base = opts?.baseDelayMs ?? 600;
  let last: unknown;
  for (let i = 0; i <= retries; i++) {
    try {
      return await fetch(input, init);
    } catch (e) {
      last = e;
      if (i < retries) {
        await new Promise((r) => setTimeout(r, base * (i + 1)));
      }
    }
  }
  throw last;
}

async function apiGet<T>(
  path: string,
  params: Record<string, string | undefined> | undefined,
  schema: z.ZodType<T>,
  netOpts?: { retries?: number; baseDelayMs?: number }
): Promise<T> {
  const baseUrl = API_URL || window.location.origin;
  const fullPath = path.startsWith('/') ? path : `/${path}`;
  const urlStr = API_URL.startsWith('http') 
    ? new URL(path.startsWith('/') ? path.slice(1) : path, API_URL).toString()
    : `${baseUrl}${fullPath}`;

  const urlObj = new URL(urlStr, window.location.origin);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== "") urlObj.searchParams.set(k, String(v));
    });
  }
  const finalUrlStr = urlObj.toString();
  let res: Response;
  try {
    const r = netOpts?.retries ?? 0;
    res =
      r > 0
        ? await fetchWithRetry(finalUrlStr, { method: "GET" }, { retries: r, baseDelayMs: netOpts?.baseDelayMs ?? 450 })
        : await fetch(finalUrlStr);
  } catch (e) {
    throw translateNetworkError(e);
  }
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

async function apiPost<T>(path: string, body: unknown, schema: z.ZodType<T>, method: string = 'POST', retries: number = 0): Promise<T> {
  const baseUrl = API_URL || window.location.origin;
  const fullPath = path.startsWith('/') ? path : `/${path}`;
  const finalUrlStr = API_URL.startsWith('http') 
    ? new URL(path.startsWith('/') ? path.slice(1) : path, API_URL).toString()
    : `${baseUrl}${fullPath}`;
  let res: Response;
  try {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    };
    res = retries > 0 ? await fetchWithRetry(finalUrlStr, opts, { retries, baseDelayMs: 500 }) : await fetch(finalUrlStr, opts);
  } catch (e) {
    throw translateNetworkError(e);
  }
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
  return apiGet('/players', undefined, z.array(RawPlayerSchema));
}

export async function fetchRatingDistribution(date?: string) {
  const params: Record<string, string> = {};
  if (date) params.target_date = date;
  return apiGet('/players/rating_distribution', params, z.object({
    instant: z.array(z.object({ name: z.string(), mu: z.number() })),
    comprehensive: z.array(z.object({ name: z.string(), mu: z.number() }))
  }));
}

export async function fetchDailyAnalytics(date?: string) {
  const params: Record<string, string> = {};
  if (date) params.target_date = date;
  return apiGet('/admin/daily_analytics', params, z.object({
    gainers: z.array(z.object({ name: z.string(), diff: z.number() })),
    losers: z.array(z.object({ name: z.string(), diff: z.number() })),
    bestPartners: z.array(z.object({ names: z.string(), wins: z.number(), total: z.number() })),
    tiers: z.object({
      Elite: z.object({ count: z.number(), names: z.array(z.string()) }),
      Advanced: z.object({ count: z.number(), names: z.array(z.string()) }),
      Normal: z.object({ count: z.number(), names: z.array(z.string()) })
    })
  }));
}

/** 取得 PlayerStats 快照 */
export async function fetchPlayerStats(date?: string): Promise<RawPlayerStat[]> {
  const params: Record<string, string> = {};
  if (date) params.date = date;
  try {
    return await apiGet('/player_stats', params, z.array(RawPlayerStatSchema));
  } catch (err) {
    console.warn('Failed to fetch stats snapshots:', err);
    return [];
  }
}

/** 取得特定球員的完整 Profile 與分析 */
export async function fetchPlayerProfile(playerId: string): Promise<any> {
  return apiGet(`/players/${playerId}/profile`, undefined, z.any());
}

/** 取得 AI 教練所需的對話上下文 */
export async function fetchChatContext(playerId?: string, date?: string): Promise<any> {
  const params: Record<string, string> = {};
  if (playerId) params.playerId = playerId;
  if (date) params.date = date;
  return apiGet('/chat/context', params, z.any());
}

export async function fetchDashboardSummary(date?: string) {
  return apiGet('/dashboard/summary', { date }, z.any());
}

export async function fetchActiveMatchDates() {
  return apiGet('/matches/active-dates', undefined, z.array(z.string()));
}

/** 取得對戰紀錄 */
export async function fetchMatches(date?: string): Promise<RawMatch[]> {
  const params: Record<string, string> = {};
  if (date) params.date = date;
  try {
    return await apiGet('/matches', params, z.array(RawMatchSchema));
  } catch (err) {
    console.warn('Failed to fetch matches:', err);
    return [];
  }
}

/** 呼叫後端進行進階配對 */
export async function matchmake(
  selectedIds: string[], 
  ignoreFatigue: boolean = false,
  targetDate?: string
): Promise<any[]> {
  try {
    const res = await apiPost('/matchmake', {
      selectedIds,
      ignoreFatigue,
      targetDate
    }, z.any());
    return (res as any) || [];
  } catch (err) {
    console.error('Matchmaking API failed:', err);
    throw err;
  }
}

/** 新增球員 */
export async function addPlayer(name: string, avatar?: string, type?: 'resident' | 'guest') {
  return apiPost('/players', { name, avatar, type }, z.any());
}

/** 批次新增球員 */
export async function addPlayersBatch(players: { name: string, avatar?: string, type?: 'resident' | 'guest' }[]) {
  return apiPost('/players/batch', { names: players }, z.any());
}

/** 更新球員名稱與頭像 */
export async function updatePlayer(id: string, name?: string, avatar?: string, type?: 'resident' | 'guest') {
  return apiPost(`/players/${id}`, { name, avatar, type }, z.any(), 'PUT');
}

/** 刪除球員 */
export async function deletePlayer(id: string) {
  return apiPost(`/players/${id}`, undefined, z.any(), 'DELETE');
}

/** 批次刪除球員 */
export async function deletePlayersBatch(ids: string[]) {
  return apiPost('/players/batch', { ids }, z.any(), 'DELETE');
}

/** 記錄比賽結果並更新 */
export async function recordMatchAndUpdate(data: {
  matchId?: string;
  date: string;
  matchDate?: string;
  t1p1: string;
  t1p2: string;
  t2p1: string;
  t2p2: string;
  winnerTeam: 'Team 1' | 'Team 2';
  updatedPlayers?: unknown[];
  updatedStats?: unknown[];
  duration?: string;
  score?: string;
  courtName?: string;
  matchNo?: number;
}) {
  return apiPost('/matches', data, z.any(), 'POST', 2);
}

/** 批次更新球員屬性 */
export async function batchUpdatePlayers(updates: { id: string, mu: number, sigma: number }[]) {
  return apiPost('/players/batch_update', { updates }, z.any());
}

export async function updateMatch(matchId: string, data: {
  winner?: number;
  score?: string;
  duration?: string;
  court_name?: string;
}) {
  return apiPost(`/matches/${matchId}`, data, z.any(), 'PUT');
}

export async function deleteMatch(matchId: string) {
  return apiPost(`/matches/${matchId}`, undefined, z.any(), 'DELETE');
}

export async function batchUpdateMatches(updates: { id: string, winner?: number, score?: string }[]) {
  return apiPost('/matches/batch_update', { updates }, z.any());
}

export async function batchDeleteMatches(matchIds: string[]) {
  return apiPost('/matches/batch_delete', { match_ids: matchIds }, z.any());
}

export async function bindPlayer(playerId: string, userEmail: string) {
  return apiPost('/players/bind', { playerId, userEmail }, z.any());
}

export async function unbindPlayer(playerId: string, userEmail: string) {
  return apiPost('/players/unbind', { playerId, userEmail }, z.any());
}

export async function getPlayerBinding(playerId: string, userEmail: string) {
  return apiGet(`/players/${playerId}/binding`, { email: userEmail }, PlayerBindingSchema);
}

export async function getUserBinding(userEmail: string) {
  try {
    return await apiGet('/players/user_binding', { email: userEmail }, UserBindingSchema);
  } catch (err: any) {
    if (err.message?.includes('USER_NOT_BOUND')) {
      return { isBound: false };
    }
    throw err;
  }
}

export async function getCourtState(date?: string) {
  const params: Record<string, string | undefined> = { date };
  return apiGet('/court_state', params, z.any(), { retries: 1, baseDelayMs: 450 });
}

export async function updateCourtState(data: { expectedVersion: number; state: any; updatedBy: string; date?: string; takeover?: boolean; updaterName?: string; enableLine?: boolean }) {
  if (!API_URL) throw new Error("未設定 VITE_API_URL");
  
  let res: Response;
  try {
  const baseUrl = API_URL || window.location.origin;
  const fullPath = '/court_state';
  const requestUrl = API_URL.startsWith('http') 
    ? new URL('court_state', API_URL.replace(/\/$/, '')).toString()
    : `${baseUrl}${fullPath}`;
    
    res = await fetchWithRetry(
      requestUrl,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      },
      { retries: 2, baseDelayMs: 700 }
    );
  } catch (e) {
    throw translateNetworkError(e);
  }
  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw new Error("後端回應無法解析（可能逾時或中斷），請重試。");
  }
  const parsed = GasResponseSchema(z.any()).safeParse(json);
  
  if (!parsed.success) {
    throw new Error('API Response format invalid');
  }
  
  return {
    status: parsed.data.status,
    data: parsed.data.data,
    message: parsed.data.message
  };
}

export type UserBinding = z.infer<typeof UserBindingSchema>;
export type { RawPlayer, RawPlayerStat, RawMatch };
export async function recalibrateRatings(): Promise<string> {
  return apiPost('/admin/recalibrate-ratings', {}, z.string());
}
