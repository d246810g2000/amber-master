import React, { useState, useMemo, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getTaipeiDateString } from "../lib/utils";
import * as matchEngine from "../lib/matchEngine";
import type { DerivedPlayer } from "../lib/matchEngine";
import { usePlayers, type PlayerStatus } from "../hooks/usePlayers";
import { useMatches } from "../hooks/useMatches";
import { useCourts } from "../hooks/useCourts";
import { useCourtSync } from "../hooks/useCourtSync";
import { MatchHistory, MatchHistorySkeleton } from "../components/MatchHistory";
import { SettingsModal } from "../components/SettingsModal";
import { WinnerModal } from "../components/WinnerModal";
import { DashboardHeader } from "../components/dashboard/DashboardHeader";
import { PlayerZones, PlayerZonesSkeleton } from "../components/dashboard/PlayerZones";
import { CourtCard, CourtCardSkeleton } from "../components/CourtCard";
import { useNavigate } from 'react-router-dom';
import RefreshCw from "lucide-react/dist/esm/icons/refresh-cw";
import { GeminiBot } from "../components/chat/GeminiBot";
import { DailyBattleSummaryModal } from "../components/dashboard/DailyBattleSummaryModal";
import ImageDown from "lucide-react/dist/esm/icons/image-down";

export function DashboardPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentFilterDate, setCurrentFilterDate] = useState(getTaipeiDateString());
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [filterPlayerIds, setFilterPlayerIds] = useState<string[]>([]);
  const [showBannerEgg, setShowBannerEgg] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);
  const [dailySummaryOpen, setDailySummaryOpen] = useState(false);

  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - scrollRef.current.offsetLeft);
    setScrollLeft(scrollRef.current.scrollLeft);
  }, []);

  const handleMouseLeaveOrUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX) * 2;
    scrollRef.current.scrollLeft = scrollLeft - walk;
  }, [isDragging, startX, scrollLeft]);

  const {
    players, playerStatus, togglePlayerStatus, setMultipleStatus,
    isLoading: playersLoading, isFetching: playersFetching,
    refetch: refetchPlayers, updateLocalPlayers,
  } = usePlayers(currentFilterDate);

  const {
    matches: matchHistory, allMatches,
    isLoading: historyLoading, isFetching: historyFetching,
    recordMatch, refetch: refetchMatches, addLocalMatch,
  } = useMatches(currentFilterDate);

  const { 
    syncState, 
    isFetching,
    isPushing,
    isSyncInitialized,
    pushState, 
    fetchState 
  } = useCourtSync({
    pollingInterval: 5000, 
    enabled: currentFilterDate === getTaipeiDateString(), // 只有當天需要同步狀態
    targetDate: currentFilterDate
  });

  // 當遠端同步狀態的版本號更新時，主動重新整理球員數據與對戰紀錄，達成即時同步分數
  React.useEffect(() => {
    if (syncState.version > 0 && isSyncInitialized) {
      refetchPlayers();
      refetchMatches();
      // recordMatch 會 bump CourtState 版本；球員頁若未掛 Dashboard 需靠此無效化才會跟上
      void queryClient.invalidateQueries({ queryKey: ['playerProfile'] });
    }
  }, [syncState.version, isSyncInitialized, refetchPlayers, refetchMatches, queryClient]);

  const loading = playersLoading || historyLoading || playersFetching || historyFetching;

  const {
    courts, recommendedPlayers, isMatchmaking, selectedCourtSlot,
    winnerModalOpen, setWinnerModalOpen, activeCourt,
    submittingMatch, error, setError,
    handleCourtSlotClick, handleMatchmake, handleResetRecommended,
    toggleManualSelection, handleGoToCourt, handleEndMatch, confirmWinner, handleCancelMatch,
    getPlayerTeamColor,
    handleTakeover, hasControl, isLockedByMe, isLockedByOther, currentControllerName, isSyncing, isLocalSyncing, syncingCourtIds, isGuest,
    syncToRemote,
    isAutoMode, setIsAutoMode,
    ignoreFatigue, setIgnoreFatigue
  } = useCourts({
    players: players as DerivedPlayer[],
    playerStatus, setMultipleStatus, matchHistory,
    recordMatch, addLocalMatch, updateLocalPlayers,
    syncState, isFetching, isPushing, pushState,
    fetchCourtState: fetchState,
    targetDate: currentFilterDate
  });

  // 錯誤橫幅多數人只會忽略；自動關閉減少必須手動點「關閉」
  React.useEffect(() => {
    if (!error) return;
    const id = window.setTimeout(() => setError(null), 14_000);
    return () => window.clearTimeout(id);
  }, [error, setError]);

  const isInitialLoading = playersLoading || historyLoading || !isSyncInitialized;

  const readyPlayers: typeof players = [];
  const restingPlayers: typeof players = [];
  const playingPlayers: typeof players = [];
  for (const p of players) {
    const status = playerStatus[p.id];
    if (status === "ready") readyPlayers.push(p);
    else if (status === "resting") restingPlayers.push(p);
    else if (status === "playing" || status === "finishing") playingPlayers.push(p);
  }

  const fatiguedPlayerIds = useMemo(() => {
    const set = new Set<string>();
    const latest = matchHistory[0];
    if (latest) {
      [...latest.team1, ...latest.team2].forEach((p) => set.add(p.id));
    }
    return set;
  }, [matchHistory]);

  const playerCourtMap = useMemo(() => {
    const map: Record<string, string> = {};
    courts.forEach(c => {
      c.players.forEach(p => {
        if (p) map[p.id] = c.name;
      });
    });
    return map;
  }, [courts]);

  const missedStreakByPlayerId = useMemo(() => {
    const map: Record<string, number | null> = {};
    for (const p of players) {
      const playedToday = matchHistory.some((m) =>
        [...m.team1, ...m.team2].some((x) => String(x.id) === String(p.id)),
      );
      map[p.id] = playedToday ? matchEngine.getConsecutiveMissedMatches(p.id, matchHistory) : null;
    }
    return map;
  }, [players, matchHistory]);

  
  const handleAllReady = () => {
    const updates: Record<string, PlayerStatus> = {};
    restingPlayers.forEach(p => { updates[p.id] = "ready"; });
    syncToRemote(courts, recommendedPlayers, updates);
  };

  const handleAllResting = () => {
    const updates: Record<string, PlayerStatus> = {};
    readyPlayers.forEach(p => { updates[p.id] = "resting"; });
    syncToRemote(courts, recommendedPlayers, updates);
  };
  
  const handleTogglePlayerStatus = (id: string) => {
    const current = playerStatus[id];
    if (current === "playing" || current === "finishing") return;
    const newStatus = current === "resting" ? "ready" : "resting";
    syncToRemote(courts, recommendedPlayers, { [id]: newStatus });
  };

  const allMatchDates = useMemo(() => {
    const dates = new Set<string>();
    allMatches.forEach(m => {
      if (m.date) dates.add(m.date.split(' ')[0]);
      if (m.matchDate) dates.add(m.matchDate);
    });
    return dates;
  }, [allMatches]);

  const handleToggleFilterPlayer = useCallback((id: string) => {
    setFilterPlayerIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else if (document.exitFullscreen) {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-[#F0F4F1] dark:bg-slate-950 p-3 md:p-4 font-sans text-slate-800 dark:text-slate-100 flex flex-col selection:bg-emerald-100 dark:selection:bg-emerald-900 overflow-x-hidden overflow-y-auto md:h-screen md:overflow-hidden safe-bottom">
      <DashboardHeader
        loading={loading}
        showBannerEgg={showBannerEgg}
        isFullscreen={isFullscreen}
        onToggleBanner={() => setShowBannerEgg(!showBannerEgg)}
        onToggleFullscreen={toggleFullscreen}
        onRefresh={() => { refetchPlayers(); refetchMatches(); fetchState(); }}
        onSettings={() => setIsSettingsOpen(true)}
        hasControl={hasControl}
        currentControllerName={currentControllerName}
        onTakeover={handleTakeover}
        isSyncing={isSyncing}
        isGuest={isGuest}
        isLockedByMe={isLockedByMe}
        isLockedByOther={isLockedByOther}
      />


      {error && (
        <div className="bg-red-500/90 dark:bg-red-900/90 text-white p-4 rounded-xl mb-6 shadow-lg backdrop-blur-sm flex justify-between items-center border border-red-400 dark:border-red-700 shrink-0">
          <span className="font-medium">{error}</span>
          <button type="button" onClick={() => setError(null)} className="text-white/80 hover:text-white bg-red-600/50 dark:bg-red-800/50 px-3 py-1 rounded-lg shrink-0">關閉</button>
        </div>
      )}

      <div className="flex-1 flex flex-col md:flex-row gap-4 md:gap-6 min-h-0 pb-6 md:pb-0">
        <div className="w-full md:w-[60%] flex flex-col gap-4 md:gap-6 h-auto md:h-full md:overflow-y-auto md:pr-2 custom-scrollbar min-w-0">
          <div
            ref={scrollRef}
            onMouseDown={handleMouseDown}
            onMouseLeave={handleMouseLeaveOrUp}
            onMouseUp={handleMouseLeaveOrUp}
            onMouseMove={handleMouseMove}
            className={`flex overflow-x-auto ${isDragging ? 'snap-none cursor-grabbing' : 'snap-x snap-mandatory md:cursor-auto cursor-grab'} md:grid md:grid-cols-3 gap-4 shrink-0 pb-4 md:pb-0 scrollbar-hide touch-auto -mx-3 px-3 md:mx-0 md:px-0`}
          >
            {isInitialLoading ? (
              <>
                {[1, 2, 3].map(i => <div key={i} className="p-1"><CourtCardSkeleton /></div>)}
              </>
            ) : (
              <>
                {courts.map((court) => (
                  <div key={court.id} className="snap-center shrink-0 w-[45%] max-w-[240px] md:w-auto md:max-w-none p-1">
                    <CourtCard
                      key={court.id}
                      title={court.name}
                      players={court.players}
                      actionText="結束"
                      onAction={() => handleEndMatch(court.id)}
                      onCancel={() => handleCancelMatch(court.id)}
                      startTime={court.startTime}
                      isLoading={syncingCourtIds.includes(court.id) || submittingMatch && activeCourt?.id === court.id}
                      isActionDisabled={submittingMatch || isLocalSyncing || !hasControl}
                      onSlotClick={(idx) => hasControl && handleCourtSlotClick(court.id, idx)}
                      selectedSlotIndex={
                        hasControl && selectedCourtSlot?.courtId === court.id
                          ? selectedCourtSlot.index
                          : null
                      }
                      hasControl={hasControl}
                    />
                  </div>
                ))}
                <div className="snap-center shrink-0 w-[45%] max-w-[240px] md:w-auto md:max-w-none p-1">
                  <CourtCard
                    title="推薦"
                    isRecommended
                    players={recommendedPlayers}
                    actionText="上場"
                    onAction={handleGoToCourt}
                    onSelectPlayers={handleMatchmake}
                    onReset={handleResetRecommended}
                    isLoading={
                      isMatchmaking ||
                      syncingCourtIds.includes('recommended')
                    }
                    isActionDisabled={submittingMatch || isLocalSyncing || !hasControl}
                    isPrimaryActionLocked={
                      isMatchmaking || syncingCourtIds.includes('recommended')
                    }
                    onSlotClick={(idx) => hasControl && handleCourtSlotClick('recommended', idx)}
                    selectedSlotIndex={
                      hasControl && selectedCourtSlot?.courtId === 'recommended'
                        ? selectedCourtSlot.index
                        : null
                    }
                    hasControl={hasControl}
                    isAutoMode={isAutoMode}
                    onToggleAuto={() => setIsAutoMode(!isAutoMode)}
                    missedStreakByPlayerId={missedStreakByPlayerId}
                  />
                </div>
              </>
            )}
          </div>

          {isInitialLoading ? (
            <PlayerZonesSkeleton />
          ) : (
            <PlayerZones
              readyPlayers={readyPlayers}
              restingPlayers={restingPlayers}
              playingPlayers={playingPlayers}
              playerStatus={playerStatus}
              recommendedPlayers={recommendedPlayers}
              fatiguedPlayerIds={fatiguedPlayerIds}
              isMatchmaking={isMatchmaking}
              submittingMatch={submittingMatch}
              getPlayerTeamColor={getPlayerTeamColor}
              onToggleManualSelection={toggleManualSelection}
              onTogglePlayerStatus={handleTogglePlayerStatus}
              onProfileClick={(id) => navigate(`/players/${id}`)}
              onAllReady={handleAllReady}
              onAllResting={handleAllResting}
              hasControl={hasControl}
              playerCourtMap={playerCourtMap}
              missedStreakByPlayerId={missedStreakByPlayerId}
              ignoreFatigue={ignoreFatigue}
              onToggleIgnoreFatigue={() => setIgnoreFatigue(!ignoreFatigue)}
            />
          )}
        </div>

        <div className="w-full md:w-[40%] bg-white dark:bg-slate-900 rounded-[1.5rem] p-4 shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col h-auto min-h-[400px] md:h-full relative shrink-0">
          <div className="flex items-center justify-between mb-2 shrink-0 gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">對戰紀錄</h2>
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">History</span>
            </div>
            {!isInitialLoading && (
              <button
                type="button"
                onClick={() => setDailySummaryOpen(true)}
                className="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl border border-emerald-200 dark:border-emerald-800/80 bg-emerald-50/90 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-[10px] sm:text-[11px] font-black tracking-tight hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors shadow-sm"
              >
                <ImageDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                <span className="hidden sm:inline">匯出摘要圖</span>
                <span className="sm:hidden">匯出</span>
              </button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
            {isInitialLoading ? (
              <MatchHistorySkeleton />
            ) : (
              <MatchHistory
                history={matchHistory}
                loading={historyLoading}
                filterDate={currentFilterDate}
                players={players}
                selectedPlayerIds={filterPlayerIds}
                onTogglePlayerId={handleToggleFilterPlayer}
                onClearPlayers={() => setFilterPlayerIds([])}
                onDateChange={(date) => { setCurrentFilterDate(date); refetchPlayers(); refetchMatches(); }}
                onPlayerClick={(id) => navigate(`/players/${id}`)}
                allMatchDates={allMatchDates}
              />
            )}
          </div>
        </div>
      </div>

      {isSettingsOpen && (
        <SettingsModal
          players={players}
          onUpdate={() => { refetchPlayers(); refetchMatches(); }}
          onSelectPlayer={(id) => navigate(`/players/${id}`)}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}

      {activeCourt && activeCourt.players.every(p => p !== null) && (
        <WinnerModal
          isOpen={winnerModalOpen}
          onClose={() => setWinnerModalOpen(false)}
          onConfirm={confirmWinner}
          team1={[activeCourt.players[0]!, activeCourt.players[1]!]}
          team2={[activeCourt.players[2]!, activeCourt.players[3]!]}
          isSubmitting={submittingMatch}
        />
      )}
      
      <GeminiBot 
        players={players as any} 
        playerStatus={playerStatus}
        courts={courts}
        recommendedPlayers={recommendedPlayers as any}
      />

      <DailyBattleSummaryModal
        isOpen={dailySummaryOpen}
        onClose={() => setDailySummaryOpen(false)}
        filterDate={currentFilterDate}
        matchHistory={matchHistory}
        players={players}
      />
    </div>
  );
}
