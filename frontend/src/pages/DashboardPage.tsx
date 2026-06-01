import React, { useState, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import * as gasApi from '../lib/gasApi';
import { useQueryClient } from '@tanstack/react-query';
import { getTaipeiDateString, cn } from "../lib/utils";
import * as matchEngine from "../lib/matchEngine";
import type { DerivedPlayer } from "../lib/matchEngine";
import { usePlayers, type PlayerStatus } from "../hooks/usePlayers";
import { useMatches } from "../hooks/useMatches";
import { useCourts } from "../hooks/useCourts";
import { useCourtSync } from "../hooks/useCourtSync";
import { useDialog } from "../context/DialogContext";
import { MatchHistory, MatchHistorySkeleton } from "../components/MatchHistory";
import { SettingsModal } from "../components/SettingsModal";
import { WinnerModal } from "../components/WinnerModal";
import { DashboardHeader } from "../components/dashboard/DashboardHeader";
import { GlobalChat } from "../components/dashboard/GlobalChat";
import { PlayerZones, PlayerZonesSkeleton } from "../components/dashboard/PlayerZones";
import { useDashboardSummary } from "../hooks/useDashboardSummary";
import { CourtCard, CourtCardSkeleton } from "../components/CourtCard";
import { useNavigate } from 'react-router-dom';
import RefreshCw from "lucide-react/dist/esm/icons/refresh-cw";
import { GeminiBot } from "../components/chat/GeminiBot";
import { DailyBattleSummaryModal } from "../components/dashboard/DailyBattleSummaryModal";
import ImageDown from "lucide-react/dist/esm/icons/image-down";
import { ShopModal, EGG_REQUIREMENTS, PETS_CATALOG, PET_ABILITIES } from "../components/dashboard/ShopModal";
import { EggRenderer } from "../components/EggRenderer";
import { PetRenderer } from "../components/PetRenderer";
import { motion, AnimatePresence } from 'framer-motion';
import Sparkles from "lucide-react/dist/esm/icons/sparkles";
import type { Player } from '../types';


export function DashboardPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { showConfirm } = useDialog();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentFilterDate, setCurrentFilterDate] = useState(getTaipeiDateString());
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [filterPlayerIds, setFilterPlayerIds] = useState<string[]>([]);
  const [showBannerEgg, setShowBannerEgg] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);
  const [dailySummaryOpen, setDailySummaryOpen] = useState(false);
  const [isShopOpen, setIsShopOpen] = useState(false);

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
    matches: matchHistory, activeMatchDates,
    isLoading: historyLoading, isFetching: historyFetching,
    recordMatch, refetch: refetchMatches, addLocalMatch,
  } = useMatches(currentFilterDate);

  const { data: summary } = useDashboardSummary(currentFilterDate);

  const { 
    syncState, 
    isFetching,
    isPushing,
    isSyncInitialized,
    pushState, 
    fetchState,
    onlineCount,
    betStatuses,
    setBetStatuses,
    chatMessages
  } = useCourtSync({
    pollingInterval: 5000, 
    enabled: currentFilterDate === getTaipeiDateString(), // 只有當天需要同步狀態
    targetDate: currentFilterDate
  });

  const { currentUser } = useAuth();
  
  const boundPlayer = useMemo(() => {
    if (!currentUser?.email) return undefined;
    return players.find((p: any) => p.email?.toLowerCase() === currentUser?.email?.toLowerCase()) as Player | undefined;
  }, [players, currentUser?.email]);

  const eggReadyToHatch = useMemo(() => {
    if (!boundPlayer?.active_egg_id) return false;
    const progress = boundPlayer.egg_progress_games || 0;
    return progress >= 100;
  }, [boundPlayer]);

  const [hatchingPetId, setHatchingPetId] = useState<string | null>(null);
  const [isHatchingActionLoading, setIsHatchingActionLoading] = useState(false);
  const [hatchingOverlayOpen, setHatchingOverlayOpen] = useState(false);
  const [hatchState, setHatchState] = useState<'shaking' | 'shuffling' | 'revealed'>('shaking');
  const [shufflingPetId, setShufflingPetId] = useState<string | null>(null);
  const [currentHatchEggId, setCurrentHatchEggId] = useState<string | null>(null);

  const handleHatchEgg = async () => {
    if (!currentUser?.email || !boundPlayer?.active_egg_id) return;
    const eggId = boundPlayer.active_egg_id;
    
    // Set overlay open, state shaking, and eggId immediately for UI response
    setCurrentHatchEggId(eggId);
    setHatchingOverlayOpen(true);
    setHatchState('shaking');
    setIsHatchingActionLoading(true);
    
    // Min shaking phase timer of 1.5 seconds
    const shakePromise = new Promise(resolve => setTimeout(resolve, 1500));
    
    try {
      const result = await gasApi.hatchEgg(currentUser.email!);
      if (result && result.hatched_pet) {
        const finalPetId = result.hatched_pet;
        
        // Wait for shaking to complete
        await shakePromise;
        
        // Phase 2: Shuffling
        setHatchState('shuffling');
        const candidates = PETS_CATALOG.filter(p => p.eggType === eggId).map(p => p.id);
        
        let shuffleCount = 0;
        const totalShuffles = 12;
        const shuffleInterval = 150;
        
        const shufflePromise = new Promise<void>((resolve) => {
          const interval = setInterval(() => {
            const nextPet = candidates[shuffleCount % candidates.length];
            setShufflingPetId(nextPet);
            shuffleCount++;
            if (shuffleCount >= totalShuffles) {
              clearInterval(interval);
              resolve();
            }
          }, shuffleInterval);
        });
        
        await shufflePromise;
        
        // Phase 3: Revealed!
        setHatchState('revealed');
        setHatchingPetId(finalPetId);
        toast.success(`破蛋成功！獲得了新夥伴！`);
        queryClient.invalidateQueries({ queryKey: ['players-base'] });
      } else {
        toast.error('孵化結果無效');
        setHatchingOverlayOpen(false);
      }
    } catch (err: any) {
      toast.error(err.message || '孵化失敗');
      setHatchingOverlayOpen(false);
    } finally {
      setIsHatchingActionLoading(false);
    }
  };

  const handleEquipPet = async (petId: string | null) => {
    if (!currentUser?.email) return;
    try {
      await gasApi.equipPet(currentUser.email!, petId);
      toast.success(petId ? '已邀請夥伴隨行！' : '已讓夥伴回窩休息');
      queryClient.invalidateQueries({ queryKey: ['players-base'] });
    } catch (err: any) {
      toast.error(err.message || '邀請隨行失敗');
    }
  };

  const handleBet = useCallback(async (matchId: string, team: number, amount: number, betType: string, lineValue: number) => {
    if (!currentUser?.email) {
      toast.info("請先登入以進行投注預測");
      return;
    }
    try {
      const res = await gasApi.placeBet({
        matchId,
        team,
        amount,
        betType,
        lineValue,
        playerEmail: currentUser.email
      });
      if (res.status === 'success') {
        toast.success(res.message);
        // 手動更新本地狀態，直到 WS 廣播到來
        const status = await gasApi.getBetStatus(matchId, currentUser.email);
        setBetStatuses(prev => ({ ...prev, [matchId]: status.data || status }));
        // 同步更新玩家羽毛
        queryClient.invalidateQueries({ queryKey: ['players-base'] });
      } else {
        toast.error(res.message);
      }
    } catch (err: any) {
      toast.error(err.message || "投注失敗");
    }
  }, [currentUser, setBetStatuses, queryClient]);

  // 為所有進行中的比賽抓取初始投注狀態
  React.useEffect(() => {
    if (!isSyncInitialized || !syncState.state?.courts) return;
    
    syncState.state.courts.forEach(async (court: any) => {
      if (court.matchId && !betStatuses[court.matchId]) {
        // 嘗試抓取盤口，包含簡單的重試機制（應對後端同步延遲）
        const fetchWithRetry = async (attempt = 0) => {
          try {
            const status = await gasApi.getBetStatus(court.matchId, currentUser?.email);
            setBetStatuses(prev => ({ ...prev, [court.matchId]: status.data || status }));
          } catch (e) {
            if (attempt < 2) {
              setTimeout(() => fetchWithRetry(attempt + 1), 1500 * (attempt + 1));
            }
          }
        };
        fetchWithRetry();
      }
    });
  }, [syncState.state?.courts, syncState.version, isSyncInitialized, currentUser?.email, setBetStatuses]);

  // 當遠端同步狀態的版本號更新時，主動強制抓取，達成即時同步
  React.useEffect(() => {
    if (syncState.version > 0 && isSyncInitialized) {
      // 使用 refetchQueries 強制立即發送網路請求，而非僅標記為 stale
      queryClient.refetchQueries({ queryKey: ['matches-raw'] });
      queryClient.refetchQueries({ queryKey: ['playerStats'] });
      queryClient.refetchQueries({ queryKey: ['players-base'] });
    }
  }, [syncState.version, isSyncInitialized, queryClient]);

  const loading = playersLoading || historyLoading || playersFetching || historyFetching;

  const {
    courts, recommendedPlayers, isMatchmaking, selectedCourtSlot,
    winnerModalOpen, setWinnerModalOpen, activeCourt,
    submittingMatch, error, setError,
    handleCourtSlotClick, handleMatchmake, handleResetRecommended,
    toggleManualSelection, handleGoToCourt, handleEndMatch, confirmWinner, handleCancelMatch,

    getPlayerTeamColor,
    handleTakeover, hasControl, isSyncing, isLocalSyncing, syncingCourtIds,
    syncToRemote,
    isAutoMode, setIsAutoMode,
    ignoreFatigue, setIgnoreFatigue,
    useCareerWeight, setUseCareerWeight
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
      [...(latest.team1 || []), ...(latest.team2 || [])].forEach((p) => set.add(p.id));
    }
    return set;
  }, [matchHistory]);

  const playerCourtMap = useMemo(() => {
    const map: Record<string, string> = {};
    courts.forEach(c => {
      (c.players || []).forEach(p => {
        if (p) map[p.id] = c.name;
      });
    });
    return map;
  }, [courts]);

  const missedStreakByPlayerId = useMemo(() => {
    const map: Record<string, number | null> = {};
    for (const p of players) {
      const playedToday = matchHistory.some((m) =>
        [...(m.team1 || []), ...(m.team2 || [])].some((x) => String(x.id) === String(p.id)),
      );
      map[p.id] = playedToday ? matchEngine.getConsecutiveMissedMatches(matchHistory, p.id) : null;
    }
    return map;
  }, [players, matchHistory]);

  
  const handleAllReady = () => {
    if (restingPlayers.length === 0) return;
    showConfirm(
      "全員備戰",
      `確定要將所有 ${restingPlayers.length} 位休息中的球員設為備戰狀態嗎？`,
      () => {
        const updates: Record<string, PlayerStatus> = {};
        restingPlayers.forEach(p => { updates[p.id] = "ready"; });
        syncToRemote(courts, recommendedPlayers, updates);
      }
    );
  };

  const handleAllResting = () => {
    if (readyPlayers.length === 0) return;
    showConfirm(
      "全員休息",
      `確定要將所有 ${readyPlayers.length} 位備戰中的球員設為休息狀態嗎？`,
      () => {
        const updates: Record<string, PlayerStatus> = {};
        readyPlayers.forEach(p => { updates[p.id] = "resting"; });
        syncToRemote(courts, recommendedPlayers, updates);
      }
    );
  };
  
  const handleTogglePlayerStatus = (id: string) => {
    const current = playerStatus[id];
    if (current === "playing" || current === "finishing") return;
    const newStatus = current === "resting" ? "ready" : "resting";
    syncToRemote(courts, recommendedPlayers, { [id]: newStatus });
  };

  const allMatchDates = activeMatchDates;

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
        onShop={() => setIsShopOpen(true)}

        summary={summary}
        onlineCount={onlineCount}


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
                      onCancel={() => {
                        showConfirm(
                          "取消比賽",
                          "確定要取消此場比賽嗎？已下注的羽毛將退還給玩家。",
                          () => handleCancelMatch(court.id)
                        );
                      }}
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
                      useCareerWeight={useCareerWeight}
                      matchId={court.matchId}
                      betStatus={court.matchId ? betStatuses[court.matchId] : null}
                      onBet={handleBet}
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
                    isCalculating={isMatchmaking}
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
                    useCareerWeight={useCareerWeight}
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
              useCareerWeight={useCareerWeight}
              onToggleUseCareerWeight={() => setUseCareerWeight(!useCareerWeight)}
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
                useCareerWeight={useCareerWeight}
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
          requireScore={
            activeCourt.matchId ? (
              (betStatuses[activeCourt.matchId]?.handicap?.team1Total || 0) > 0 ||
              (betStatuses[activeCourt.matchId]?.handicap?.team2Total || 0) > 0 ||
              (betStatuses[activeCourt.matchId]?.overUnder?.team1Total || 0) > 0 ||
              (betStatuses[activeCourt.matchId]?.overUnder?.team2Total || 0) > 0
            ) : false
          }
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
      
      {/* 楓之谷風格尬廣聊天室 */}
      <GlobalChat messages={chatMessages} />
      
      {isShopOpen && (
        <ShopModal
          onClose={() => setIsShopOpen(false)}
          onUpdate={() => {
            refetchPlayers();
            queryClient.invalidateQueries({ queryKey: ['players-base'] });
          }}
        />
      )}

      {/* Floating Egg Hatching Widget */}
      <AnimatePresence>
        {eggReadyToHatch && !hatchingPetId && boundPlayer?.active_egg_id && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 50 }}
            className="fixed bottom-20 right-6 z-[90] max-w-sm bg-white/90 dark:bg-slate-900/90 backdrop-blur-lg rounded-3xl p-5 border border-amber-250 dark:border-amber-900/50 shadow-[0_20px_50px_rgba(245,158,11,0.25)] flex items-center gap-4 animate-egg-float"
          >
            <div className="shrink-0 relative">
              <div className="absolute inset-0 bg-amber-400/20 rounded-full blur-md animate-pulse" />
              <EggRenderer
                eggType={boundPlayer.active_egg_id}
                progressPercent={100}
                className="w-16 h-20 scale-90"
              />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-black text-sm text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500 animate-spin-slow" />
                孵化能量已滿！
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-bold">
                您的【{EGG_REQUIREMENTS[boundPlayer.active_egg_id]?.name || '寵物蛋'}】已準備好破殼！
              </p>
              <button
                onClick={handleHatchEgg}
                disabled={isHatchingActionLoading}
                className="mt-3 w-full py-2 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-950 font-black text-xs rounded-xl shadow-md shadow-amber-500/10 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isHatchingActionLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    正在孵化...
                  </>
                ) : (
                  "✨ 立即點擊破蛋 ✨"
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hatching Pet Success Overlay */}
      <AnimatePresence>
        {hatchingOverlayOpen && currentHatchEggId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/95 backdrop-blur-md z-[200] flex flex-col items-center justify-center p-4 md:p-6 text-center select-none"
          >
            {/* Spinning background sunburst rays */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.15),transparent_60%)] animate-pulse pointer-events-none" />
            {hatchState === 'revealed' && (
              <div className="absolute w-[200%] h-[200%] rounded-full bg-[conic-gradient(from_0deg,transparent_20%,rgba(253,224,71,0.05)_40%,transparent_60%,rgba(253,224,71,0.05)_80%,transparent)] animate-[spin_20s_infinite_linear] pointer-events-none" />
            )}

            {/* Sparkles */}
            {hatchState === 'revealed' && (
              <>
                <div className="absolute animate-ping text-amber-400 text-4xl top-1/4 left-1/4">✦</div>
                <div className="absolute animate-ping text-cyan-400 text-3xl bottom-1/4 right-1/4 [animation-delay:0.7s]">✦</div>
                <div className="absolute animate-ping text-pink-400 text-2xl top-1/3 right-1/3 [animation-delay:1.3s]">✦</div>
              </>
            )}

            <motion.div
              initial={{ scale: 0.5, y: 100 }}
              animate={{ scale: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 15 } }}
              className="relative space-y-6 md:space-y-8 flex flex-col items-center w-full max-w-sm"
            >
              {/* Hatching Box */}
              <div className="w-28 h-28 md:w-32 md:h-32 bg-white/5 dark:bg-white/10 rounded-full border border-white/20 flex items-center justify-center p-4 shadow-2xl relative">
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 via-pink-400 to-amber-400 rounded-full blur-[8px] opacity-40 animate-pulse" />
                
                {hatchState === 'shaking' && (
                  <motion.div
                    animate={{
                      x: [0, -6, 6, -6, 6, -3, 3, -3, 3, 0],
                      rotate: [0, -5, 5, -5, 5, -2, 2, -2, 2, 0],
                    }}
                    transition={{
                      repeat: Infinity,
                      duration: 0.5,
                      ease: "easeInOut"
                    }}
                    className="relative w-20 h-24 flex items-center justify-center"
                  >
                    <EggRenderer
                      eggType={currentHatchEggId}
                      progressPercent={100}
                      className="w-full h-full scale-110"
                    />
                  </motion.div>
                )}

                {hatchState === 'shuffling' && shufflingPetId && (
                  <motion.div
                    animate={{
                      scale: [1, 1.15, 1],
                      y: [0, -8, 0]
                    }}
                    transition={{
                      repeat: Infinity,
                      duration: 0.15,
                      ease: "easeInOut"
                    }}
                    className="flex items-center justify-center"
                  >
                    <PetRenderer petId={shufflingPetId} className="w-16 h-16 scale-125" />
                  </motion.div>
                )}

                {hatchState === 'revealed' && hatchingPetId && (
                  <motion.div
                    initial={{ scale: 0.3, rotate: -45 }}
                    animate={{ scale: [1, 1.3, 1.2], rotate: 0 }}
                    transition={{ type: "spring", stiffness: 200, damping: 10 }}
                    className="flex items-center justify-center"
                  >
                    <PetRenderer petId={hatchingPetId} className="w-20 h-20 scale-150 animate-bounce" />
                  </motion.div>
                )}
              </div>

              {/* Title & Info */}
              <div className="space-y-2 px-4 w-full">
                {hatchState === 'shaking' && (
                  <>
                    <div className="text-[10px] font-black text-amber-500 uppercase tracking-[0.3em] animate-pulse">HATCHING...</div>
                    <h3 className="text-xl md:text-2xl font-black text-white">
                      蛋正在劇烈晃動...
                    </h3>
                    <p className="text-xs text-slate-400 mt-2 font-bold leading-relaxed">
                      守護的夥伴即將破殼而出，請耐心等待！
                    </p>
                  </>
                )}

                {hatchState === 'shuffling' && (
                  <>
                    <div className="text-[10px] font-black text-cyan-400 uppercase tracking-[0.3em] animate-pulse">CHOOSING...</div>
                    <h3 className="text-xl md:text-2xl font-black text-white">
                      破殼而出中！
                    </h3>
                    <p className="text-xs text-slate-400 mt-2 font-bold leading-relaxed">
                      正在呼喚契合的幻獸夥伴...
                    </p>
                  </>
                )}

                {hatchState === 'revealed' && hatchingPetId && (
                  <>
                    <div className="text-[10px] font-black text-amber-500 uppercase tracking-[0.3em] animate-pulse">HATCH SUCCESS!</div>
                    <h3 className="text-xl md:text-3xl font-black bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-300 bg-clip-text text-transparent drop-shadow-md">
                      ✨ 孵化成功！獲得新伴侶 ✨
                    </h3>
                    <p className="text-sm font-bold text-white mt-4">
                      恭喜獲得可愛寵物：
                      <span className="text-base font-black text-amber-400 bg-amber-400/10 px-3 py-1 rounded-full border border-amber-400/25 ml-1 inline-block whitespace-nowrap mt-1">
                        {PETS_CATALOG.find(p => p.id === hatchingPetId)?.name || '神祕寵物'}
                      </span>
                    </p>
                    <p className="text-[11px] text-slate-400 max-w-xs mx-auto leading-relaxed mt-2 font-bold">
                      {PETS_CATALOG.find(p => p.id === hatchingPetId)?.desc}
                    </p>
                    {(() => {
                      const ability = PET_ABILITIES[hatchingPetId];
                      if (!ability) return null;
                      return (
                        <div className="mt-4 inline-flex flex-col items-center gap-1 bg-white/5 border border-white/10 rounded-2xl p-2.5 w-full max-w-[240px] mx-auto shadow-inner">
                          <span className={cn(
                            "px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border shadow-sm",
                            ability.colorClass
                          )}>
                            {ability.badge}
                          </span>
                          <span className="text-xs text-amber-400 font-extrabold mt-1">
                            {ability.desc}
                          </span>
                        </div>
                      );
                    })()}
                  </>
                )}
              </div>

              {/* Possible Candidates Section */}
              <div className="w-[90%] max-w-[280px] bg-white/5 dark:bg-black/20 rounded-2xl p-4 border border-white/5 mx-auto">
                <div className="text-[9px] font-black text-slate-500 uppercase tracking-wider mb-3">
                  可能會孵化出的夥伴
                </div>
                <div className="flex justify-around items-center gap-2">
                  {PETS_CATALOG.filter(p => p.eggType === currentHatchEggId).map(candidate => {
                    const isCurrent = (hatchState === 'shuffling' && shufflingPetId === candidate.id) || (hatchState === 'revealed' && hatchingPetId === candidate.id);
                    return (
                      <div key={candidate.id} className="flex flex-col items-center min-w-[64px]">
                        <div className={cn(
                          "w-12 h-12 rounded-full border flex items-center justify-center p-2 transition-all duration-300",
                          isCurrent 
                            ? "bg-white/15 border-amber-400 scale-110 shadow-lg shadow-amber-500/10" 
                            : "bg-white/5 border-white/5 opacity-30 grayscale"
                        )}>
                          <PetRenderer petId={candidate.id} className="w-8 h-8" />
                        </div>
                        <span className={cn("text-[9px] font-bold mt-1.5 whitespace-nowrap", isCurrent ? "text-amber-400" : "text-slate-500")}>
                          {candidate.name}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action Button */}
              {hatchState === 'revealed' && hatchingPetId && (
                <button
                  onClick={() => {
                    handleEquipPet(hatchingPetId); // Auto equip the newly hatched pet!
                    setHatchingPetId(null);
                    setHatchingOverlayOpen(false);
                    setCurrentHatchEggId(null);
                  }}
                  className="w-[90%] max-w-[240px] py-3 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-950 font-black text-xs rounded-xl shadow-xl shadow-amber-500/10 active:scale-95 transition-all tracking-widest cursor-pointer mt-2"
                >
                  太棒了，帶牠去打球！
                </button>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

