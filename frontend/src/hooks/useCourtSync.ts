import { useState, useCallback, useEffect, useRef } from 'react';
import * as gasApi from '../lib/gasApi';
import { WS_URL } from '../lib/config';

export interface CourtSyncState {
  version: number;
  state: {
    courts: any[];
    playerStatus: Record<string, string>;
    recommendedPlayers: any[];
    controller?: string | null;
    controllerName?: string | null;
  } | null;
  updatedAt: string;
  updatedBy: string;
}

interface UseCourtSyncOptions {
  pollingInterval?: number; // 預設 5000 毫秒
  enabled?: boolean;
  targetDate: string;
}

export function useCourtSync({
  pollingInterval = 5000,
  enabled = true,
  targetDate
}: UseCourtSyncOptions) {

  const [syncState, setSyncState] = useState<CourtSyncState>({
    version: 0,
    state: null,
    updatedAt: '',
    updatedBy: ''
  });
  const [isFetching, setIsFetching] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  /** 供 UI（例如 Dashboard 初次載入）；與 fetch 邏輯解耦，不依賴於此 state 重建 fetchState */
  const [isSyncInitialized, setIsSyncInitialized] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  // 用 ref 追蹤最新狀態避免 closure 裡的狀態過期
  const stateRef = useRef(syncState);
  stateRef.current = syncState;

  /** 換日後第一次成功拉完 getCourtState 前為 false；避免把 isInitialized 放進 fetchState 依賴造成 effect 重跑 */
  const hasFetchedOnceForDateRef = useRef(false);

  /** 與 setSyncState 同步寫入 ref，避免下一個 push（佇列／微任務）在 re-render 前讀到舊 version */
  const commitSyncState = useCallback((next: CourtSyncState) => {
    stateRef.current = next;
    setSyncState(next);
  }, []);

  // 當日期切換時，先清空舊的本地狀態，觸發重新抓取
  useEffect(() => {
    commitSyncState({
      version: 0,
      state: null,
      updatedAt: '',
      updatedBy: ''
    });
    setIsSyncInitialized(false);
    hasFetchedOnceForDateRef.current = false;
  }, [targetDate, commitSyncState]);

  // 定時輪詢 (Polling) 取得最新狀態
  const fetchState = useCallback(async () => {
    setIsFetching(true);
    setSyncError(null);
    try {
      // gasApi.getCourtState 透過 gasGet 回傳的是 parsed.data.data
      const data = await gasApi.getCourtState(targetDate);

      // 只有當遠端版本高於本地版本時，才觸發更新
      // 或者當該日期下尚未完成過第一次成功抓取時 (state 可能仍為 null)
      const isNewer = data && data.version > stateRef.current.version;
      const isFirstLoad = !hasFetchedOnceForDateRef.current;

      if (data && (isNewer || isFirstLoad)) {
        commitSyncState(data);
      }
      hasFetchedOnceForDateRef.current = true;
      setIsSyncInitialized(true);
    } catch (err: any) {
      // 如果是 404 或找不到日期，gasApi 可能會拋出錯誤，這裡捕捉並顯示
      console.error('[Sync] Fetch failed:', err);
      setSyncError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsFetching(false);
    }
  }, [targetDate, commitSyncState]);

  useEffect(() => {
    fetchState(); // 初始化抓取 (無論是否啟用 polling 都抓一次，為了歷史資料)
  }, [fetchState]);

  useEffect(() => {
    if (!enabled) return;
    const timer = setInterval(fetchState, pollingInterval);
    return () => clearInterval(timer);
  }, [enabled, pollingInterval, fetchState]);

  // 新增：WebSocket 即時同步
  useEffect(() => {
    if (!enabled) return;

    let ws: WebSocket | null = null;
    let reconnectTimeout: any = null;

    const connect = () => {
      try {
        ws = new WebSocket(WS_URL);

        ws.onopen = () => {
          console.log('[WS] Connected to real-time server');
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'version_update') {
              console.log('[WS] Version update received:', data.version);
              // 立即觸發 fetchState
              fetchState();
            }
          } catch (e) {
            // 忽略非 JSON 訊息
          }
        };

        ws.onclose = () => {
          console.log('[WS] Disconnected, retrying in 3s...');
          reconnectTimeout = setTimeout(connect, 3000);
        };

        ws.onerror = (err) => {
          console.error('[WS] Error:', err);
          ws?.close();
        };
      } catch (err) {
        console.error('[WS] Connection failed:', err);
        reconnectTimeout = setTimeout(connect, 3000);
      }
    };

    connect();

    return () => {
      if (ws) {
        ws.onclose = null; // 關鍵修正：防止主動關閉觸發重連邏輯
        ws.onerror = null;
        ws.close();
      }
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [enabled, fetchState]);

  // 更新狀態到後端 (樂觀鎖)；VERSION_CONFLICT 時先併入伺服器快照再自動重送一次（常見於賽後 bump 版號與手動操作競態）
  // silent: 不觸發 isPushing，供僅改 playerStatus 等輕量同步，避免整頁鎖操作
  const pushState = useCallback(async (
    newState: NonNullable<CourtSyncState['state']>,
    updatedBy: string = 'user',
    takeover: boolean = false,
    updaterName?: string,
    options?: { silent?: boolean, enableLine?: boolean, forceVersion?: number }
  ) => {
    const silent = options?.silent === true;
    if (!silent) setIsPushing(true);
    setSyncError(null);
    try {
      for (let attempt = 0; attempt < 2; attempt++) {
        // 如果有指定 forceVersion（例如賽後剛 bump 過），優先使用它避免 VERSION_CONFLICT
        const expectedVersion = options?.forceVersion !== undefined ? options.forceVersion : stateRef.current.version;
        const response = await gasApi.updateCourtState({
          expectedVersion,
          state: newState,
          updatedBy,
          date: targetDate,
          takeover,
          updaterName,
          enableLine: options?.enableLine
        });

        if (response.status === 'success') {
          commitSyncState({
            version: response.data.version,
            state: response.data.state || newState,
            updatedAt: response.data.updatedAt || new Date().toISOString(),
            updatedBy: response.data.updatedBy || updatedBy
          });
          setSyncError(null);
          return;
        }

        const isVersionConflict =
          response.status === 'conflict' ||
          (response.status === 'error' && response.message === 'VERSION_CONFLICT');

        if (isVersionConflict && response.data) {
          console.warn(
            attempt === 0
              ? '[Sync] VERSION_CONFLICT：已套用伺服器版本並將自動重試同一筆寫入'
              : '[Sync] VERSION_CONFLICT：重試後仍衝突'
          );
          commitSyncState({
            version: response.data.version,
            state: response.data.state,
            updatedAt: response.data.updatedAt,
            updatedBy: response.data.updatedBy
          });
          if (attempt === 0) {
            try {
              await fetchState();
            } catch {
              /* 重試 push 不依賴 GET 成功 */
            }
            continue;
          }
          throw new Error('VERSION_CONFLICT');
        }

        throw new Error(response.message || 'Unknown sync error');
      }
    } catch (err: any) {
      if (err.message === 'VERSION_CONFLICT') {
        throw err;
      }
      console.error('Push state failed:', err);
      setSyncError(err.message || 'Sync failed');
      throw err;
    } finally {
      if (!silent) setIsPushing(false);
    }
  }, [commitSyncState, fetchState]);

  return {
    syncState,
    isFetching,
    isPushing,
    isSyncing: isFetching || isPushing, // For backward compatibility if needed
    isSyncInitialized,
    syncError,
    fetchState,
    pushState
  };
}
