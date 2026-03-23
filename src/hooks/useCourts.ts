import { useState } from 'react';
import { getTaipeiDateString, getTaipeiISOString } from '../lib/utils';
import * as matchEngine from '../lib/matchEngine';
import type { DerivedPlayer } from '../lib/matchEngine';
import { Player } from '../types';
import type { PlayerStatus } from './usePlayers';
import type { RawMatch } from '../lib/gasApi';
import type { MatchRecord } from '../types';

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
}

export function useCourts({
  players, playerStatus, setMultipleStatus, matchHistory,
  recordMatch, addLocalMatch, updateLocalPlayers, ignoreFatigue
}: UseCourtsDeps) {
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

    if (sourceCourtId === courtId) {
      const updated = [...sourcePlayers];
      updated[sourceIndex] = pTarget;
      updated[index] = pSource;
      if (isSourceRec) setRecommendedPlayers(updated);
      else setCourts(prev => prev.map(c => c.id === courtId ? { ...c, players: updated } : c));
    } else {
      const updatedSource = [...sourcePlayers];
      const updatedTarget = [...targetPlayers];
      updatedSource[sourceIndex] = pTarget;
      updatedTarget[index] = pSource;

      if (isSourceRec) setRecommendedPlayers(updatedSource);
      else setCourts(prev => prev.map(c => c.id === sourceCourtId ? { ...c, players: updatedSource } : c));

      if (isTargetRec) setRecommendedPlayers(updatedTarget);
      else setCourts(prev => prev.map(c => c.id === courtId ? { ...c, players: updatedTarget } : c));
    }
    setSelectedCourtSlot(null);
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
        setRecommendedPlayers([suggestions[0].team1[0], suggestions[0].team1[1], suggestions[0].team2[0], suggestions[0].team2[1]]);
      } else {
        setRecommendedPlayers([null, null, null, null]);
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
    setRecommendedPlayers([null, null, null, null]);
    setSelectedCourtSlot(null);
  };

  const toggleManualSelection = (playerId: string) => {
    const player = players.find(p => p.id === playerId);
    if (!player) return;
    setRecommendedPlayers(prev => {
      const isAlreadySelected = prev.some(p => p?.id === playerId);
      if (isAlreadySelected) {
        const next = [...prev];
        const idx = next.findIndex(p => p?.id === playerId);
        next[idx] = null;
        return next;
      } else {
        const next = [...prev];
        const emptyIdx = next.findIndex(p => p === null);
        if (emptyIdx !== -1) {
          next[emptyIdx] = player as matchEngine.DerivedPlayer;
          return next;
        }
        return prev;
      }
    });
  };

  const handleGoToCourt = () => {
    if (recommendedPlayers.some((p) => p === null)) return;
    const emptyCourtIndex = courts.findIndex((c) => c.players.every((p) => p === null));
    if (emptyCourtIndex === -1) {
      setError("沒有空場地可以上場");
      return;
    }
    const matchId = Date.now().toString();
    setCourts(prev => {
      const next = [...prev];
      next[emptyCourtIndex] = { ...next[emptyCourtIndex], players: [...recommendedPlayers] as Player[], startTime: new Date(), matchId };
      return next;
    });

    const newStatus: Record<string, PlayerStatus> = {};
    recommendedPlayers.forEach((p) => { if (p) newStatus[p.id] = "playing"; });
    setMultipleStatus(newStatus);
    setRecommendedPlayers([null, null, null, null]);
    setSelectedCourtSlot(null);
  };

  const handleEndMatch = (courtId: string) => {
    setActiveCourtForWinner(courtId);
    setWinnerModalOpen(true);
  };

  const confirmWinner = (winner: 1 | 2, score: string) => {
    if (!activeCourtForWinner) return;
    const court = courts.find((c) => c.id === activeCourtForWinner);
    if (!court || court.players.some((p) => p === null)) return;

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

      const finStatus: Record<string, PlayerStatus> = {};
      participants.forEach(p => { finStatus[p.id] = "finishing"; });
      setMultipleStatus(finStatus);

      setWinnerModalOpen(false);
      setCourts(prev => prev.map(c => c.id === activeCourtForWinner ? { ...c, players: [null, null, null, null], startTime: null } : c));

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
        setError('寫入後端失敗，請稍後重新整理: ' + (err.message || '未知錯誤'));
      });

      setTimeout(() => {
        const releases: Record<string, PlayerStatus> = {};
        participants.forEach((p) => { releases[p.id] = "ready"; });
        setMultipleStatus(releases);
      }, 1500);

    } catch (err: any) {
      setError(err.message || "記錄比賽失敗");
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
  };
}
