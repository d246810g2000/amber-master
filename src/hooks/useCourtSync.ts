import { useState, useCallback, useEffect, useRef } from 'react';
import * as gasApi from '../lib/gasApi';

export interface CourtSyncState {
  version: number;
  state: {
    courts: any[];
    playerStatus: Record<string, string>;
    recommendedPlayers: any[];
  } | null;
  updatedAt: string;
  updatedBy: string;
}

interface UseCourtSyncOptions {
  pollingInterval?: number; // 預設 5000 毫秒
  enabled?: boolean;
}

export function useCourtSync(options: UseCourtSyncOptions = {}) {
  const { pollingInterval = 10000, enabled = true } = options;
  
  const [syncState, setSyncState] = useState<CourtSyncState>({
    version: 0,
    state: null,
    updatedAt: '',
    updatedBy: ''
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  // 用 ref 追蹤最新狀態避免 closure 裡的狀態過期
  const stateRef = useRef(syncState);
  stateRef.current = syncState;

  // 定時輪詢 (Polling) 取得最新狀態
  const fetchState = useCallback(async () => {
    if (!enabled) return;
    try {
      const data = await gasApi.getCourtState();
      
      // 只有當遠端版本高於本地版本時，才觸發更新
      if (data && data.version > stateRef.current.version && data.state) {
        setSyncState({
          version: data.version,
          state: data.state,
          updatedAt: data.updatedAt,
          updatedBy: data.updatedBy
        });
      }
      setSyncError(null);
    } catch (err: any) {
      console.warn('Sync fetch failed:', err);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    fetchState(); // 初始化抓取
    const timer = setInterval(fetchState, pollingInterval);
    return () => clearInterval(timer);
  }, [enabled, pollingInterval, fetchState]);

  // 更新狀態到後端 (含樂觀鎖與重試邏輯)
  const pushState = useCallback(async (
    newState: NonNullable<CourtSyncState['state']>,
    updatedBy: string = 'user'
  ) => {
    setIsSyncing(true);
    setSyncError(null);
    try {
      let expectedVersion = stateRef.current.version;
      let retries = 3;

      while (retries > 0) {
        const response = await gasApi.updateCourtState({
          expectedVersion,
          state: newState,
          updatedBy
        });

        if (response.status === 'success') {
          // 寫入成功，更新本地版本號
          setSyncState({
            version: response.data.version,
            state: newState,
            updatedAt: new Date().toISOString(),
            updatedBy
          });
          break; // 跳出重試迴圈
        } else if (response.status === 'conflict') {
          // 發生衝突
          console.warn('Court state conflict! Fetching latest state and retrying...');
          
          // 更新本地狀態為伺服器最新狀態
          setSyncState({
            version: response.data.version,
            state: response.data.state,
            updatedAt: response.data.updatedAt,
            updatedBy: response.data.updatedBy
          });
          
          // 此時前端應該要合併狀態，但因為這裡只負責 API 溝通，
          // 我們會拋出錯誤讓呼叫端 (useCourts / 畫面) 處理狀態合併，或提示使用者
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
      setIsSyncing(false);
    }
  }, []);

  return {
    syncState,
    isSyncing,
    syncError,
    fetchState,
    pushState
  };
}
