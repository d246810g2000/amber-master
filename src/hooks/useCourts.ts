import { useState, useEffect, useCallback, useRef } from 'react';
import { getTaipeiDateString, getTaipeiISOString } from '../lib/utils';
import * as matchEngine from '../lib/matchEngine';
import type { DerivedPlayer } from '../lib/matchEngine';
import { Player } from '../types';
import type { PlayerStatus } from './usePlayers';
import type { MatchRecord } from '../types';
import type { CourtSyncState } from './useCourtSync';
import { useAuth } from '../context/AuthContext';

interface ActiveCourt {
  id: string;
  name: string;
  players: (Player | null)[];
  startTime: Date | null;
  matchId?: string;
}

/**
 * 輪詢或 push 完成會 bump syncState.version，但推薦列在「本地草稿」或「遠端寫入佇列中」時不要用遠端快照覆寫。
 */
function canApplyRecommendedFromRemote(
  pendingRemoteWrites: number,
  localRecommendedDraftUnsynced: boolean
): boolean {
  return pendingRemoteWrites === 0 && !localRecommendedDraftUnsynced;
}

/** 將球員放入某一格時，同列（同一推薦列或同一球場）其他格不得再出現同一人 */
function placePlayerUniqueInRow(
  row: (Player | null)[],
  index: number,
  player: Player
): (Player | null)[] {
  const out = [...row];
  for (let i = 0; i < out.length; i++) {
    if (i !== index && out[i]?.id === player.id) {
      out[i] = null;
    }
  }
  out[index] = player;
  return out;
}

interface UseCourtsDeps {
  players: DerivedPlayer[];
  playerStatus: Record<string, PlayerStatus>;
  setMultipleStatus: (updates: Record<string, PlayerStatus>) => void;
  matchHistory: MatchRecord[];
  recordMatch: (data: any) => Promise<any>;
  addLocalMatch: (match: any) => void;
  updateLocalPlayers: (updates: any[]) => void;
  syncState: CourtSyncState;
  isFetching: boolean;
  isPushing: boolean;
  pushState: (
    state: NonNullable<CourtSyncState['state']>,
    updatedBy?: string,
    takeover?: boolean,
    updaterName?: string,
    options?: { silent?: boolean, enableLine?: boolean }
  ) => Promise<void>;
  targetDate: string;
}

export function useCourts({
  players, playerStatus, setMultipleStatus, matchHistory,
  recordMatch, addLocalMatch, updateLocalPlayers,
  syncState, isFetching, isPushing, pushState, targetDate
}: UseCourtsDeps) {

  const { currentUser } = useAuth();

  // States
  const [courts, setCourts] = useState<ActiveCourt[]>([
    { id: "1", name: "1", players: [null, null, null, null], startTime: null },
    { id: "2", name: "2", players: [null, null, null, null], startTime: null },
  ]);
  const [recommendedPlayers, setRecommendedPlayers] = useState<(Player | null)[]>([null, null, null, null]);
  const [isMatchmaking, setIsMatchmaking] = useState(false);
  const [selectedCourtSlot, setSelectedCourtSlot] = useState<{ courtId: string, index: number } | null>(null);
  const [winnerModalOpen, setWinnerModalOpen] = useState(false);
  const [activeCourtForWinner, setActiveCourtForWinner] = useState<string | null>(null);
  const [submittingMatch, setSubmittingMatch] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLocalSyncing, setIsLocalSyncing] = useState(false);
  const [syncingCourtIds, setSyncingCourtIds] = useState<string[]>([]);

  // Auto mode states
  const [isAutoMode, setIsAutoMode] = useState(false);
  const [autoActionReady, setAutoActionReady] = useState(true);
  const autoCooldownTimer = useRef<NodeJS.Timeout | null>(null);

  const triggerCooldown = useCallback(() => {
    setAutoActionReady(false);
    if (autoCooldownTimer.current) clearTimeout(autoCooldownTimer.current);
    autoCooldownTimer.current = setTimeout(() => {
      setAutoActionReady(true);
    }, 3000);
  }, []);

  // Derived state
  // isLocalSyncing: useCourts 的主動同步 (syncToRemote, Takeover)
  // isPushing: useCourtSync 的主動推送
  // isSyncing: 用於按鈕與操作鎖定，僅在「推送中」時為 true
  const isSyncing = isPushing || isLocalSyncing;

  // Refs
  const lastHydratedVersion = useRef(0);
  const wasPlayersEmpty = useRef(true);
  /** 連點備戰／休息時合併狀態用，避免 closure 內 playerStatus 尚未更新 */
  const playerStatusRef = useRef(playerStatus);
  /** 序列化寫入 GAS，避免並發 push 造成版本衝突 */
  const pushQueueRef = useRef(Promise.resolve());
  /** 尚未完成的遠端寫入次數（含佇列中）；唯一權威在 state，供 UI 重繪 */
  const [pendingRemoteSyncCount, setPendingRemoteSyncCount] = useState(0);
  /** 與上一致，供 effect／handler 同步讀取（避免閉包讀到舊的 pending state） */
  const pendingRemoteMirrorRef = useRef(0);
  /**
   * 備戰區僅本地變更、尚未寫入後端（1～3 人階段 batch 時）。
   * 為 true 時不要用遠端快照覆寫推薦區。
   */
  const localRecommendedUnsyncedRef = useRef(false);

  // 【核心優化】：使用 Ref 追蹤絕對最新的狀態，防止非同步回調（如 setTimeout）中的 stale closure 導致回滾／覆寫
  const courtsRef = useRef(courts);
  const recommendedPlayersRef = useRef(recommendedPlayers);

  useEffect(() => {
    courtsRef.current = courts;
  }, [courts]);

  useEffect(() => {
    recommendedPlayersRef.current = recommendedPlayers;
  }, [recommendedPlayers]);

  useEffect(() => {
    playerStatusRef.current = playerStatus;
  }, [playerStatus]);

  /** 序列化 pushState、統一 pending 計數（syncToRemote、handleTakeover 共用） */
  const enqueueRemoteWrite = useCallback(async (run: () => Promise<void>) => {
    setPendingRemoteSyncCount((c) => {
      const n = c + 1;
      pendingRemoteMirrorRef.current = n;
      return n;
    });
    try {
      const prev = pushQueueRef.current;
      const next = prev.then(() => run());
      pushQueueRef.current = next.catch(() => {});
      await next;
    } finally {
      setPendingRemoteSyncCount((c) => {
        const n = Math.max(0, c - 1);
        pendingRemoteMirrorRef.current = n;
        return n;
      });
    }
  }, []);

  // 當日期切換時，重置追蹤狀態，強制重新從 syncState 同步
  useEffect(() => {
    lastHydratedVersion.current = 0;
    pendingRemoteMirrorRef.current = 0;
    setPendingRemoteSyncCount(0);
    localRecommendedUnsyncedRef.current = false;
    wasPlayersEmpty.current = true;
    // 重置球場與推薦名單為空白，等待 fetchState 回來
    setCourts([
      { id: "1", name: "1", players: [null, null, null, null], startTime: null },
      { id: "2", name: "2", players: [null, null, null, null], startTime: null },
    ]);
    setRecommendedPlayers([null, null, null, null]);
  }, [targetDate]);

  // Sync state from remote when available
  useEffect(() => {
    if (!syncState.state) return;

    // 如果版本更新，或者之前球員名單是空的（但現在有了），就重新 rehydrate
    const isNewVersion = syncState.version > lastHydratedVersion.current;
    const isNowPopulated = wasPlayersEmpty.current && players.length > 0;

    if (isNewVersion || isNowPopulated) {
      lastHydratedVersion.current = syncState.version;
      if (players.length > 0) wasPlayersEmpty.current = false;

      // Rehydrate players from ID to objects
      const rehydratePlayers = (playerIds: any[]) =>
        playerIds.map(id => id ? (players.find(p => p.id === id) || null) : null);

      if (syncState.state.courts) {
        setCourts(syncState.state.courts.map(c => ({
          ...c,
          startTime: c.startTime ? new Date(c.startTime) : null,
          players: rehydratePlayers(c.players)
        })));
      }

      if (
        syncState.state.recommendedPlayers &&
        canApplyRecommendedFromRemote(
          pendingRemoteMirrorRef.current,
          localRecommendedUnsyncedRef.current
        )
      ) {
        setRecommendedPlayers(rehydratePlayers(syncState.state.recommendedPlayers));
      }

      if (syncState.state.playerStatus) {
        // 自我修復：確保同步下來的狀態與球場一致
        const incomingStatus = { ...syncState.state.playerStatus } as Record<string, PlayerStatus>;
        const playingIds = new Set<string>();

        // 從同步下來的球場資料中找出所有正在打球的人
        if (syncState.state.courts) {
          syncState.state.courts.forEach(c => {
            if (c.players) {
              c.players.forEach((pid: string) => { if (pid) playingIds.add(pid); });
            }
          });
        }

        // 修正邏輯
        Object.keys(incomingStatus).forEach(id => {
          if (incomingStatus[id] === "playing" && !playingIds.has(id)) {
            incomingStatus[id] = "ready";
          }
        });

        setMultipleStatus(incomingStatus);
      }
    }
  }, [syncState, players]);

  const hasControl = !!currentUser && (!syncState.state?.controller || syncState.state?.controller === currentUser?.email);
  const isLockedByMe = !!currentUser && syncState.state?.controller === currentUser?.email;
  const isLockedByOther = !!syncState.state?.controller && syncState.state?.controller !== currentUser?.email;
  const currentControllerName = syncState.state?.controllerName || syncState.state?.controller || "無";
  const isGuest = !currentUser;

  // Auto Mode Logic
  useEffect(() => {
    if (!isAutoMode || !hasControl || isSyncing || isMatchmaking || submittingMatch || isLocalSyncing || isPushing || isFetching || pendingRemoteSyncCount > 0) return;

    const hasEmptyCourt = courts.some(c => c.players.every(p => p === null));
    const isRecommendedFull = recommendedPlayers.length === 4 && recommendedPlayers.every(p => p !== null && p !== undefined);
    const isRecommendedEmpty = recommendedPlayers.length === 4 && recommendedPlayers.every(p => p === null || p === undefined);

    if (autoActionReady && hasEmptyCourt && isRecommendedFull) {
      handleGoToCourt();
      return;
    }

    if (isRecommendedEmpty) {
      const readyCount = Object.values(playerStatus).filter(s => s === "ready").length;
      if (readyCount >= 4) {
        handleMatchmake();
      }
    }
  }, [isAutoMode, hasControl, autoActionReady, courts, recommendedPlayers, playerStatus, isSyncing, isMatchmaking, submittingMatch, isLocalSyncing, isPushing, isFetching, pendingRemoteSyncCount]);

  // 統一封裝：每次狀態變更後，打包並推送到 GAS
  const syncToRemote = useCallback(async (
    newCourts: ActiveCourt[],
    newRecPlayers: (Player | null)[],
    newStatusOverrides: Record<string, PlayerStatus> = {},
    affectedCourtIds: string[] = []
  ) => {
    localRecommendedUnsyncedRef.current = false;
    await enqueueRemoteWrite(async () => {
      /** 有場地／推薦卡 id 時顯示 loading（blocking）；僅改狀態時 silent push，不鎖 isPushing／整頁操作 */
      const blocking = affectedCourtIds.length > 0;

      // 1. 先處理本地狀態（包含暫時性的 finishing）
      setCourts(newCourts);
      setRecommendedPlayers(newRecPlayers);

      // 自我修復：確保當前狀態與球場一致
      // 如果球員狀態是 "playing" 但不在任何球場上，則恢復為 "ready"
      const playingIds = new Set<string>();
      newCourts.forEach(c => c.players.forEach(p => { if (p) playingIds.add(p.id); }));

      const mergedStatus = { ...playerStatusRef.current, ...newStatusOverrides };
      const fixedStatus: Record<string, PlayerStatus> = {};
      (Object.entries(mergedStatus) as [string, PlayerStatus][]).forEach(([id, status]) => {
        if (status === "playing" && !playingIds.has(id)) {
          fixedStatus[id] = "ready";
        } else {
          fixedStatus[id] = status;
        }
      });

      if (Object.keys(fixedStatus).length > 0) {
        playerStatusRef.current = fixedStatus;
        setMultipleStatus(fixedStatus);
      }

      // 2. 準備推送給遠端的狀態：排除 finishing 這種短暫的本地狀態
      const remoteStatus: Record<string, PlayerStatus> = {};
      Object.entries(fixedStatus).forEach(([id, status]) => {
        // 如果是 finishing，遠端統統視為 ready
        remoteStatus[id] = status === "finishing" ? "ready" : status;
      });

      // 壓縮資料，只存 IDs，減輕網路負擔
      const statePayload = {
        courts: newCourts.map(c => ({
          ...c,
          startTime: c.startTime?.toISOString() || null,
          players: c.players.map(p => p?.id || null)
        })),
        recommendedPlayers: newRecPlayers.map(p => p?.id || null),
        playerStatus: remoteStatus,
        controller: syncState.state?.controller || currentUser?.email, // 如果未鎖定，預設為當前操作者
        controllerName: syncState.state?.controllerName || currentUser?.name || currentUser?.email
      };

      if (blocking) {
        setIsLocalSyncing(true);
        if (affectedCourtIds.length > 0) {
          setSyncingCourtIds(prev => Array.from(new Set([...prev, ...affectedCourtIds])));
        }
      }
      try {
        await pushState(
          statePayload,
          currentUser?.email || 'unknown',
          false,
          currentUser?.name,
          { 
            silent: !blocking,
            enableLine: localStorage.getItem('lineNotifications') !== 'false' // 預設為 true，除非明確設為 false
          }
        );
        setError(null);
      } catch (err: any) {
        if (err.message === 'VERSION_CONFLICT') {
          setError("狀態已被其他人修改，已為您同步最新狀態，請重新操作");
        } else if (err.code === 'NOT_CONTROLLER') {
          setError(err.message || "您目前沒有控制權，請先取得主動權");
        } else {
          setError("同步失敗: " + err.message);
        }
      } finally {
        if (blocking) {
          setIsLocalSyncing(false);
          if (affectedCourtIds.length > 0) {
            setSyncingCourtIds(prev => prev.filter(id => !affectedCourtIds.includes(id)));
          }
        }
      }
    });
  }, [enqueueRemoteWrite, pushState, setMultipleStatus, currentUser, syncState.state]);


  const handleTakeover = async () => {
    if (!currentUser) return;

    const remoteStatus: Record<string, PlayerStatus> = {};
    (Object.entries(playerStatusRef.current) as [string, PlayerStatus][]).forEach(([id, status]) => {
      remoteStatus[id] = status === "finishing" ? "ready" : status;
    });

    // 準備目前的狀態進行推送，但帶上 takeover 旗標
    const statePayload = {
      courts: courts.map(c => ({
        ...c,
        startTime: c.startTime?.toISOString() || null,
        players: c.players.map(p => p?.id || null)
      })),
      recommendedPlayers: recommendedPlayers.map(p => p?.id || null),
      playerStatus: remoteStatus
    };

    await enqueueRemoteWrite(async () => {
      setIsLocalSyncing(true);
      try {
        await pushState(statePayload, currentUser.email, true, currentUser.name, {
          enableLine: localStorage.getItem('lineNotifications') !== 'false'
        });
        setError(null);
      } catch (err: any) {
        setError("取得控制權失敗: " + err.message);
      } finally {
        setIsLocalSyncing(false);
      }
    });
  };



  const handleCourtSlotClick = async (courtId: string, index: number) => {
    if (isSyncing) return;
    if (!selectedCourtSlot) {
      const court = courtId === 'recommended'
        ? { id: 'recommended', players: recommendedPlayers }
        : courts.find(c => c.id === courtId);

      if (court?.players[index]) {
        setSelectedCourtSlot({ courtId, index });
      }
      return;
    }

    if (selectedCourtSlot.courtId === courtId && selectedCourtSlot.index === index) {
      setSelectedCourtSlot(null);
      return;
    }

    const sourceCourtId = selectedCourtSlot.courtId;
    const sourceIndex = selectedCourtSlot.index;
    const isSourceRec = sourceCourtId === 'recommended';
    const isTargetRec = courtId === 'recommended';

    const sourcePlayers = isSourceRec ? [...recommendedPlayers] : [...(courts.find(c => c.id === sourceCourtId)?.players || [])];
    const targetPlayers = isTargetRec ? [...recommendedPlayers] : [...(courts.find(c => c.id === courtId)?.players || [])];

    if (sourcePlayers.length === 0 || targetPlayers.length === 0) {
      setSelectedCourtSlot(null);
      return;
    }

    const pSource = sourcePlayers[sourceIndex];
    const pTarget = targetPlayers[index];

    let newRecPlayers = [...recommendedPlayers];
    let newCourts = courts.map(c => ({ ...c, players: [...c.players] }));

    if (sourceCourtId === courtId) {
      const updated = [...sourcePlayers];
      updated[sourceIndex] = pTarget;
      updated[index] = pSource;
      if (isSourceRec) newRecPlayers = updated;
      else newCourts = newCourts.map(c => c.id === courtId ? { ...c, players: updated } : c);
    } else {
      const updatedSource = [...sourcePlayers];
      const updatedTarget = [...targetPlayers];
      updatedSource[sourceIndex] = pTarget;
      updatedTarget[index] = pSource;

      if (isSourceRec) newRecPlayers = updatedSource;
      else newCourts = newCourts.map(c => c.id === sourceCourtId ? { ...c, players: updatedSource } : c);

      if (isTargetRec) newRecPlayers = updatedTarget;
      else newCourts = newCourts.map(c => c.id === courtId ? { ...c, players: updatedTarget } : c);
    }

    setSelectedCourtSlot(null);
    const slotSwapAffected = new Set(
      [sourceCourtId, courtId].filter((id) => id !== "recommended")
    );
    if (isSourceRec || isTargetRec) slotSwapAffected.add("recommended");
    await syncToRemote(newCourts, newRecPlayers, {}, Array.from(slotSwapAffected));
  };

  const handleMatchmake = async () => {
    if (!hasControl) {
      setError("您目前沒有控制權，請先取得主動權");
      return;
    }

    const readyPlayerIds = Object.entries(playerStatus)
      .filter(([_, status]) => status === "ready")
      .map(([id]) => id);

    if (readyPlayerIds.length < 4) {
      setError("備戰區至少需要 4 名球員才能進行排點");
      return;
    }

    try {
      setIsMatchmaking(true);
      setError(null);
      
      const suggestions = matchEngine.matchmake(
        players as matchEngine.DerivedPlayer[],
        readyPlayerIds,
        matchHistory,
        false,
        targetDate
      );

      if (suggestions.length > 0) {
        const newRecs = [suggestions[0].team1[0], suggestions[0].team1[1], suggestions[0].team2[0], suggestions[0].team2[1]];
        // 不配對推薦卡 loading：備戰區已有「配對中...」遮罩
        await syncToRemote(courtsRef.current, newRecs as Player[], {}, []);
      } else {
        await syncToRemote(courtsRef.current, [null, null, null, null], {}, []);
        setError("排點失敗：找不到合適的配對，已自動關閉自動上場模式");
        setIsAutoMode(false);
      }
      setSelectedCourtSlot(null);
    } catch (err: any) {
      setError(err.message || "排點失敗");
      setIsAutoMode(false);
    } finally {
      setIsMatchmaking(false);
    }
  };

  const handleResetRecommended = async () => {
    if (isSyncing) return;
    setSelectedCourtSlot(null);
    await syncToRemote(courts, [null, null, null, null], {}, ["recommended"]);
  };

  const toggleManualSelection = async (playerId: string) => {
    if (isSyncing) return;
    const player = players.find(p => p.id === playerId);
    if (!player) return;

    // 如果有選中場地位置，執行更換（Swap with Ready Zone）
    if (selectedCourtSlot) {
      const { courtId, index } = selectedCourtSlot;
      let newRecPlayers = [...recommendedPlayers];
      let newCourts = courts.map(c => ({ ...c, players: [...c.players] }));
      let newStatus: Record<string, PlayerStatus> = {};

      const isRec = courtId === 'recommended';
      const targetPlayers = isRec ? newRecPlayers : (newCourts.find(c => c.id === courtId)?.players || []);
      const oldPlayer = targetPlayers[index];

      // 執行替換（同列去重，避免同一人佔多格）
      if (isRec) {
        newRecPlayers = placePlayerUniqueInRow(newRecPlayers, index, player as Player);
      } else {
        newCourts = newCourts.map(c => {
          if (c.id === courtId) {
            return {
              ...c,
              players: placePlayerUniqueInRow(c.players, index, player as Player),
            };
          }
          return c;
        });
        // 狀態變更：新的人上場，舊的人休息
        newStatus[player.id] = "playing";
        if (oldPlayer) newStatus[oldPlayer.id] = "ready";
      }

      setSelectedCourtSlot(null);
      const swapAffected =
        courtId === "recommended" ? ["recommended"] : [courtId];
      await syncToRemote(newCourts, newRecPlayers, newStatus, swapAffected);
      return;
    }

    // 加入/移除推薦名單：僅在湊滿 4 人時寫入後端，其餘（含從滿員減人）只改本地
    let newRecs = [...recommendedPlayers];
    const isAlreadySelected = newRecs.some(p => p?.id === playerId);

    if (isAlreadySelected) {
      const idx = newRecs.findIndex(p => p?.id === playerId);
      newRecs[idx] = null;
    } else {
      const emptyIdx = newRecs.findIndex(p => p === null);
      if (emptyIdx !== -1) {
        newRecs[emptyIdx] = player as matchEngine.DerivedPlayer;
      }
    }

    const isRowFull = (row: (typeof newRecs)[number][]) =>
      row.length === 4 && row.every((p) => p !== null && p !== undefined);
    const isFull = isRowFull(newRecs);

    if (isFull) {
      await syncToRemote(courts, newRecs, {}, ["recommended"]);
    } else {
      setRecommendedPlayers(newRecs);
      localRecommendedUnsyncedRef.current = true;
    }
  };

  const handleGoToCourt = async () => {
    if (!hasControl) {
      setError("您目前沒有控制權，請先取得主動權");
      setIsAutoMode(false);
      return;
    }
    if (pendingRemoteMirrorRef.current > 0) {
      setError("推薦名單尚在同步，請稍候再按上場");
      return;
    }
    if (recommendedPlayers.some((p) => p === null)) return;
    const emptyCourtIndex = courts.findIndex((c) => c.players.every((p) => p === null));
    if (emptyCourtIndex === -1) {
      setError("沒有空場地可以上場");
      setIsAutoMode(false);
      return;
    }

    const matchId = Date.now().toString();
    const newCourts = [...courtsRef.current];
    newCourts[emptyCourtIndex] = {
      ...newCourts[emptyCourtIndex],
      players: [...recommendedPlayersRef.current] as Player[],
      startTime: new Date(),
      matchId
    };

    const newStatus: Record<string, PlayerStatus> = {};
    recommendedPlayersRef.current.forEach((p) => { if (p) newStatus[p.id] = "playing"; });

    setSelectedCourtSlot(null);
    await syncToRemote(newCourts, [null, null, null, null], newStatus, ['recommended', newCourts[emptyCourtIndex].id]);
    
    if (isAutoMode) {
      triggerCooldown();
    }
  };

  const handleEndMatch = (courtId: string) => {
    setActiveCourtForWinner(courtId);
    setWinnerModalOpen(true);
  };

  const confirmWinner = async (winner: 1 | 2, score: string) => {
    if (!activeCourtForWinner) return;
    const court = courts.find((c) => c.id === activeCourtForWinner);
    if (!court || court.players.some((p) => p === null)) return;

    setSubmittingMatch(true);

    const team1 = [court.players[0]!, court.players[1]!];
    const team2 = [court.players[2]!, court.players[3]!];

    let duration = "";
    if (court.startTime) {
      const diff = Math.floor((new Date().getTime() - new Date(court.startTime).getTime()) / 1000);
      duration = `${Math.floor(diff / 60)}分${diff % 60}秒`;
    }

    const participants = court.players.filter(p => p !== null) as Player[];
    const today = getTaipeiDateString();

    try {
      // 1. 本地計算並樂觀更新紀錄
      const result = matchEngine.calculateMatchResult(
        players as matchEngine.DerivedPlayer[],
        team1.map((p) => p.id),
        team2.map((p) => p.id),
        winner, today, score, duration, court.matchId,
      );

      const localMatchRecord = { ...result.matchRecord, courtName: court.name };
      addLocalMatch(localMatchRecord);

      updateLocalPlayers(result.updatedStats.map(s => ({
        id: s.ID, mu: s.Mu, sigma: s.Sigma,
        matchCount: s.MatchCount, winCount: s.WinCount, winRate: s.WinRate,
      })));

      // 2. 更新同步狀態 (清空場地，球員狀態設為 finishing)
      const finStatus: Record<string, PlayerStatus> = {};
      participants.forEach(p => { finStatus[p.id] = "finishing"; });

      const newCourts = courtsRef.current.map(c =>
        c.id === activeCourtForWinner
          ? { ...c, players: [null, null, null, null], startTime: null, matchId: undefined }
          : c
      );

      // 結束比賽時不重算推薦／下一場 target，維持目前備戰區四人組
      const affectedCourtIds = [activeCourtForWinner];
      const nextRecs = recommendedPlayers;

      if (isAutoMode) triggerCooldown();

      await syncToRemote(newCourts, nextRecs as Player[], finStatus, affectedCourtIds);
      setWinnerModalOpen(false);

      // 3. 寫入 GAS 對戰紀錄
      recordMatch({
        matchId: court.matchId,
        date: getTaipeiISOString(),
        matchDate: today,
        t1p1: team1[0].name, t1p2: team1[1].name,
        t2p1: team2[0].name, t2p2: team2[1].name,
        winnerTeam: winner === 1 ? 'Team 1' : 'Team 2',
        updatedPlayers: result.updatedPlayers as any,
        updatedStats: result.updatedStats as any,
        duration, score, courtName: court.name,
      }).catch(err => {
        setError('寫入對戰紀錄失敗，請重新整理重試: ' + (err.message || '未知錯誤'));
      });

      // 4. 清理：1.5秒後把球員狀態從 finishing 轉回 ready 並同步
      setTimeout(() => {
        const latestCourts = courtsRef.current;
        const latestRecs = recommendedPlayersRef.current;
        
        const releases: Record<string, PlayerStatus> = {};
        participants.forEach((p) => { releases[p.id] = "ready"; });
        
        // 只同步狀態，不重重複觸發該場地/備戰區的 loading 動畫
        syncToRemote(latestCourts, latestRecs, releases, []);
      }, 1500);

    } catch (err: any) {
      setError(err.message || "記錄比賽失敗");
    } finally {
      setSubmittingMatch(false);
      triggerCooldown();
    }
  };

  const handleCancelMatch = async (courtId: string) => {
    if (!hasControl) {
      setError("您目前沒有控制權，請先取得主動權");
      return;
    }
    const court = courts.find(c => c.id === courtId);
    if (!court) return;

    const participants = court.players.filter(p => p !== null) as Player[];
    const newStatus: Record<string, PlayerStatus> = {};
    participants.forEach(p => { newStatus[p.id] = "ready"; });

    const newCourts = courtsRef.current.map(c =>
      c.id === courtId
        ? { ...c, players: [null, null, null, null], startTime: null, matchId: undefined }
        : c
    );

    // 取消在場比賽：只清空該場、把球員改回 ready；不重算 Target／推薦四人（與結束比賽後行為一致）
    const nextRecs = recommendedPlayersRef.current;
    await syncToRemote(newCourts, nextRecs as Player[], newStatus, [courtId]);
  };

  const getPlayerTeamColor = (playerId: string): "red" | "blue" | undefined => {
    const recommendedIndex = recommendedPlayers.findIndex((p) => p?.id === playerId);
    if (recommendedIndex !== -1) return recommendedIndex < 2 ? "red" : "blue";
    return undefined;
  };

  const activeCourt = courts.find((c) => c.id === activeCourtForWinner);

  return {
    courts, recommendedPlayers, isMatchmaking, selectedCourtSlot,
    winnerModalOpen, setWinnerModalOpen, activeCourtForWinner, activeCourt,
    submittingMatch, error, setError,
    handleCourtSlotClick, handleMatchmake, handleResetRecommended,
    toggleManualSelection, handleGoToCourt, handleEndMatch, confirmWinner, handleCancelMatch,
    getPlayerTeamColor,
    handleTakeover, hasControl, isLockedByMe, isLockedByOther, currentControllerName, isSyncing, isFetching, isLocalSyncing, syncingCourtIds, isGuest,
    isRemoteSyncPending: pendingRemoteSyncCount > 0,
    syncToRemote, // Expose for Dashboard to update global player zones
    isAutoMode, setIsAutoMode
  };
}
