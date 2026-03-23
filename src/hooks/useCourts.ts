import { useState, useEffect, useCallback, useRef } from 'react';
import { getTaipeiDateString, getTaipeiISOString } from '../lib/utils';
import * as matchEngine from '../lib/matchEngine';
import type { DerivedPlayer } from '../lib/matchEngine';
import { Player } from '../types';
import type { PlayerStatus } from './usePlayers';
import type { MatchRecord } from '../types';
import type { CourtSyncState } from './useCourtSync';

interface ActiveCourt {
  id: string;
  name: string;
  players: (Player | null)[];
  startTime: Date | null;
  matchId?: string;
}

interface UseCourtsDeps {
  players: DerivedPlayer[];
  playerStatus: Record<string, PlayerStatus>;
  setMultipleStatus: (updates: Record<string, PlayerStatus>) => void;
  matchHistory: MatchRecord[];
  recordMatch: (data: any) => Promise<any>;
  addLocalMatch: (match: any) => void;
  updateLocalPlayers: (updates: any[]) => void;
  ignoreFatigue: boolean;
  syncState: CourtSyncState;
  pushState: (state: NonNullable<CourtSyncState['state']>) => Promise<void>;
}

export function useCourts({
  players, playerStatus, setMultipleStatus, matchHistory,
  recordMatch, addLocalMatch, updateLocalPlayers, ignoreFatigue,
  syncState, pushState
}: UseCourtsDeps) {

  // Local state as fallback or before sync
  const [courts, setCourts] = useState<ActiveCourt[]>([
    { id: "1", name: "1", players: [null, null, null, null], startTime: null },
    { id: "2", name: "2", players: [null, null, null, null], startTime: null },
  ]);
  const [recommendedPlayers, setRecommendedPlayers] = useState<(Player | null)[]>([null, null, null, null]);
  const lastHydratedVersion = useRef(0);

  // Sync state from remote when available
  useEffect(() => {
    if (syncState.state && syncState.version > lastHydratedVersion.current) {
      lastHydratedVersion.current = syncState.version;
      
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
      
      if (syncState.state.recommendedPlayers) {
        setRecommendedPlayers(rehydratePlayers(syncState.state.recommendedPlayers));
      }

      if (syncState.state.playerStatus) {
        setMultipleStatus(syncState.state.playerStatus as Record<string, PlayerStatus>);
      }
    }
  }, [syncState, players]);

  // 統一封裝：每次狀態變更後，打包並推送到 GAS
  const syncToRemote = useCallback(async (
    newCourts: ActiveCourt[], 
    newRecPlayers: (Player | null)[], 
    newStatusOverrides: Record<string, PlayerStatus> = {}
  ) => {
    // 1. 先處理本地狀態（包含暫時性的 finishing）
    setCourts(newCourts);
    setRecommendedPlayers(newRecPlayers);
    if (Object.keys(newStatusOverrides).length > 0) {
      setMultipleStatus(newStatusOverrides);
    }

    // 2. 準備推送給遠端的狀態：排除 finishing 這種短暫的本地狀態
    const currentStatus = { ...playerStatus, ...newStatusOverrides };
    const remoteStatus: Record<string, PlayerStatus> = {};
    Object.entries(currentStatus).forEach(([id, status]) => {
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
      playerStatus: remoteStatus // 推送過濾後的狀態
    };

    try {
      await pushState(statePayload);
      setError(null);
    } catch (err: any) {
      if (err.message === 'VERSION_CONFLICT') {
        setError("狀態已被其他人修改，已為您同步最新狀態，請重新操作");
      } else {
        setError("同步失敗: " + err.message);
      }
    }
  }, [playerStatus, pushState, setMultipleStatus]);


  const [isMatchmaking, setIsMatchmaking] = useState(false);
  const [selectedCourtSlot, setSelectedCourtSlot] = useState<{ courtId: string, index: number } | null>(null);
  const [winnerModalOpen, setWinnerModalOpen] = useState(false);
  const [activeCourtForWinner, setActiveCourtForWinner] = useState<string | null>(null);
  const [submittingMatch, setSubmittingMatch] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCourtSlotClick = (courtId: string, index: number) => {
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
    syncToRemote(newCourts, newRecPlayers);
  };

  const handleMatchmake = async () => {
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
        ignoreFatigue
      );
      
      if (suggestions.length > 0) {
        const newRecs = [suggestions[0].team1[0], suggestions[0].team1[1], suggestions[0].team2[0], suggestions[0].team2[1]];
        await syncToRemote(courts, newRecs as Player[]);
      } else {
        await syncToRemote(courts, [null, null, null, null]);
        setError("排點失敗：找不到合適的配對");
      }
      setSelectedCourtSlot(null);
    } catch (err: any) {
      setError(err.message || "排點失敗");
    } finally {
      setIsMatchmaking(false);
    }
  };

  const handleResetRecommended = () => {
    setSelectedCourtSlot(null);
    syncToRemote(courts, [null, null, null, null]);
  };

  const toggleManualSelection = (playerId: string) => {
    const player = players.find(p => p.id === playerId);
    if (!player) return;
    
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
    
    syncToRemote(courts, newRecs);
  };

  const handleGoToCourt = () => {
    if (recommendedPlayers.some((p) => p === null)) return;
    const emptyCourtIndex = courts.findIndex((c) => c.players.every((p) => p === null));
    if (emptyCourtIndex === -1) {
      setError("沒有空場地可以上場");
      return;
    }
    
    const matchId = Date.now().toString();
    const newCourts = [...courts];
    newCourts[emptyCourtIndex] = { 
      ...newCourts[emptyCourtIndex], 
      players: [...recommendedPlayers] as Player[], 
      startTime: new Date(), 
      matchId 
    };

    const newStatus: Record<string, PlayerStatus> = {};
    recommendedPlayers.forEach((p) => { if (p) newStatus[p.id] = "playing"; });
    
    setSelectedCourtSlot(null);
    syncToRemote(newCourts, [null, null, null, null], newStatus);
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
      
      const newCourts = courts.map(c => 
        c.id === activeCourtForWinner 
          ? { ...c, players: [null, null, null, null], startTime: null, matchId: undefined } 
          : c
      );

      await syncToRemote(newCourts, recommendedPlayers, finStatus);
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
        const releases: Record<string, PlayerStatus> = {};
        participants.forEach((p) => { releases[p.id] = "ready"; });
        syncToRemote(newCourts, recommendedPlayers, releases);
      }, 1500);

    } catch (err: any) {
      setError(err.message || "記錄比賽失敗");
    } finally {
      setSubmittingMatch(false);
    }
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
    toggleManualSelection, handleGoToCourt, handleEndMatch, confirmWinner,
    getPlayerTeamColor,
    syncToRemote // Expose for Dashboard to update global player zones
  };
}
