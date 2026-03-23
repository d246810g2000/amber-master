import { useState, useCallback, useEffect, useRef } from 'react';
import * as gasApi from '../lib/gasApi';

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
  const [isInitialized, setIsInitialized] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  // 用 ref 追蹤最新狀態避免 closure 裡的狀態過期
  const stateRef = useRef(syncState);
  stateRef.current = syncState;

  // 當日期切換時，先清空舊的本地狀態，觸發重新抓取
  useEffect(() => {
    setSyncState({
      version: 0,
      state: null,
      updatedAt: '',
      updatedBy: ''
    });
    setIsInitialized(false);
  }, [targetDate]);

  // 定時輪詢 (Polling) 取得最新狀態
  const fetchState = useCallback(async () => {
    setIsFetching(true);
    setSyncError(null);
    try {
      // gasApi.getCourtState 透過 gasGet 回傳的是 parsed.data.data
      const data = await gasApi.getCourtState(targetDate);
      
      // 只有當遠端版本高於本地版本時，才觸發更新
      // 或者當尚未初次讀取完成時 (state 為 null)
      const isNewer = data && data.version > stateRef.current.version;
      const isFirstLoad = !isInitialized;

      if (data && (isNewer || isFirstLoad)) {
        setSyncState(data);
      }
      setIsInitialized(true);
    } catch (err: any) {
      // 如果是 404 或找不到日期，gasApi 可能會拋出錯誤，這裡捕捉並顯示
      console.error('[Sync] Fetch failed:', err);
      setSyncError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsFetching(false);
    }
  }, [enabled, targetDate, isInitialized]);

  useEffect(() => {
    fetchState(); // 初始化抓取 (無論是否啟用 polling 都抓一次，為了歷史資料)
  }, [fetchState]);

  useEffect(() => {
    if (!enabled) return;
    const timer = setInterval(fetchState, pollingInterval);
    return () => clearInterval(timer);
  }, [enabled, pollingInterval, fetchState]);

  // 更新狀態到後端 (含樂觀鎖與重試邏輯)
  const pushState = useCallback(async (
    newState: NonNullable<CourtSyncState['state']>,
    updatedBy: string = 'user',
    takeover: boolean = false,
    updaterName?: string
  ) => {
    setIsPushing(true);
    setSyncError(null);
    try {
      let expectedVersion = stateRef.current.version;
      let retries = 3;

      while (retries > 0) {
        const response = await gasApi.updateCourtState({
          expectedVersion,
          state: newState,
          updatedBy,
          takeover,
          updaterName
        });

        if (response.status === 'success') {
          // 寫入成功，更新本地版本號與狀態 (優先使用伺服器回傳的狀態，確保 controller 等資訊正確)
          setSyncState({
            version: response.data.version,
            state: response.data.state || newState,
            updatedAt: response.data.updatedAt || new Date().toISOString(),
            updatedBy: response.data.updatedBy || updatedBy
          });
          break; // 跳出重試迴圈
        } else if (response.status === 'conflict' || response.status === 'error' && response.message === 'VERSION_CONFLICT') {
          // 發生衝突
          console.warn('Court state conflict! Fetching latest state and retrying...');
          
          // 更新本地狀態為伺服器最新狀態
          setSyncState({
            version: response.data.version,
            state: response.data.state,
            updatedAt: response.data.updatedAt,
            updatedBy: response.data.updatedBy
          });
          
          throw new Error('VERSION_CONFLICT');
        } else {
          throw new Error(response.message || 'Unknown sync error');
        }
      }
    } catch (err: any) {
      if (err.message === 'VERSION_CONFLICT') {
        throw err; // 讓外層處理
      }
      console.error('Push state failed:', err);
      setSyncError(err.message || 'Sync failed');
      throw err;
    } finally {
      setIsPushing(false);
    }
  }, []);

  return {
    syncState,
    isFetching,
    isPushing,
    isSyncing: isFetching || isPushing, // For backward compatibility if needed
    isSyncInitialized: isInitialized,
    syncError,
    fetchState,
    pushState
  };
}
