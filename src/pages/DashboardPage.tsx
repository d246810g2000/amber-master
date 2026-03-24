import React, { useState, useMemo, useCallback } from 'react';
import { getTaipeiDateString } from "../lib/utils";
import type { DerivedPlayer } from "../lib/matchEngine";
import { usePlayers, type PlayerStatus } from "../hooks/usePlayers";
import { useMatches } from "../hooks/useMatches";
import { useCourts } from "../hooks/useCourts";
import { useCourtSync } from "../hooks/useCourtSync";
import { MatchHistory, MatchHistorySkeleton } from "../components/MatchHistory";
import { ManagePlayers } from "../components/ManagePlayers";
import { WinnerModal } from "../components/WinnerModal";
import { DashboardHeader } from "../components/dashboard/DashboardHeader";
import { PlayerZones, PlayerZonesSkeleton } from "../components/dashboard/PlayerZones";
import { CourtCard, CourtCardSkeleton } from "../components/CourtCard";
import { useNavigate } from 'react-router-dom';
import RefreshCw from "lucide-react/dist/esm/icons/refresh-cw";

export function DashboardPage() {
  const navigate = useNavigate();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentFilterDate, setCurrentFilterDate] = useState(getTaipeiDateString());
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [ignoreFatigue, setIgnoreFatigue] = useState(false);
  const [filterPlayerIds, setFilterPlayerIds] = useState<string[]>([]);
  const [showBannerEgg, setShowBannerEgg] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);

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

  const loading = playersLoading || historyLoading || playersFetching || historyFetching;

  const {
    courts, recommendedPlayers, isMatchmaking, selectedCourtSlot,
    winnerModalOpen, setWinnerModalOpen, activeCourt,
    submittingMatch, error, setError,
    handleCourtSlotClick, handleMatchmake, handleResetRecommended,
    toggleManualSelection, handleGoToCourt, handleEndMatch, confirmWinner, handleCancelMatch,
    getPlayerTeamColor,
    handleTakeover, hasControl, isLockedByMe, isLockedByOther, currentControllerName, isSyncing, isLocalSyncing, syncingCourtIds, isGuest,
    isRemoteSyncPending,
    syncToRemote,
    isAutoMode, setIsAutoMode
  } = useCourts({
    players: players as DerivedPlayer[],
    playerStatus, setMultipleStatus, matchHistory,
    recordMatch, addLocalMatch, updateLocalPlayers, ignoreFatigue,
    syncState, isFetching, isPushing, pushState,
    targetDate: currentFilterDate
  });

  const isInitialLoading = playersLoading || historyLoading || !isSyncInitialized;

  const isRecommendedFull =
    recommendedPlayers.length === 4 &&
    recommendedPlayers.every((p) => p !== null && p !== undefined);

  const readyPlayers: typeof players = [];
  const restingPlayers: typeof players = [];
  const playingPlayers: typeof players = [];
  for (const p of players) {
    const status = playerStatus[p.id];
    if (status === "ready") readyPlayers.push(p);
    else if (status === "resting") restingPlayers.push(p);
    else if (status === "playing" || status === "finishing") playingPlayers.push(p);
  }

  const fatiguedPlayerIds = new Set<string>();
  matchHistory.slice(0, 2).forEach(match => {
    [...match.team1, ...match.team2].forEach(p => fatiguedPlayerIds.add(p.id));
  });

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
    <div className="min-h-[100dvh] bg-[#F0F4F1] p-3 md:p-4 font-sans text-slate-800 flex flex-col selection:bg-emerald-100 overflow-x-hidden overflow-y-auto md:h-screen md:overflow-hidden safe-bottom">
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
        <div className="bg-red-500/90 text-white p-4 rounded-xl mb-6 shadow-lg backdrop-blur-sm flex justify-between items-center border border-red-400 shrink-0">
          <span className="font-medium">{error}</span>
          <button onClick={() => setError(null)} className="text-white/80 hover:text-white bg-red-600/50 px-3 py-1 rounded-lg">關閉</button>
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
                      selectedSlotIndex={selectedCourtSlot?.courtId === court.id ? selectedCourtSlot.index : null}
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
                      syncingCourtIds.includes('recommended') ||
                      (isRecommendedFull && isRemoteSyncPending)
                    }
                    isActionDisabled={submittingMatch || isLocalSyncing || !hasControl}
                    isPrimaryActionLocked={isRemoteSyncPending}
                    onSlotClick={(idx) => hasControl && handleCourtSlotClick('recommended', idx)}
                    selectedSlotIndex={selectedCourtSlot?.courtId === 'recommended' ? selectedCourtSlot.index : null}
                    hasControl={hasControl}
                    isAutoMode={isAutoMode}
                    onToggleAuto={() => setIsAutoMode(!isAutoMode)}
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
              ignoreFatigue={ignoreFatigue}
              isMatchmaking={isMatchmaking}
              submittingMatch={submittingMatch}
              getPlayerTeamColor={getPlayerTeamColor}
              onToggleManualSelection={toggleManualSelection}
              onTogglePlayerStatus={handleTogglePlayerStatus}
              onProfileClick={(id) => navigate(`/players/${id}`)}
              onSetIgnoreFatigue={setIgnoreFatigue}
              onAllReady={handleAllReady}
              onAllResting={handleAllResting}
              hasControl={hasControl}
            />
          )}
        </div>

        <div className="w-full md:w-[40%] bg-white rounded-[1.5rem] p-4 shadow-sm border border-slate-100 flex flex-col h-auto min-h-[400px] md:h-full relative shrink-0">
          <div className="flex items-center justify-between mb-2 shrink-0">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-slate-900 tracking-tight">對戰紀錄</h2>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">History</span>
            </div>
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
        <ManagePlayers
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
    </div>
  );
}
