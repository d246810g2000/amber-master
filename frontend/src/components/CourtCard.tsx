import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Loader2 from "lucide-react/dist/esm/icons/loader-2";
import Users from "lucide-react/dist/esm/icons/users";
import RotateCcw from "lucide-react/dist/esm/icons/rotate-ccw";
import Zap from "lucide-react/dist/esm/icons/zap";
import Feather from "lucide-react/dist/esm/icons/feather";
import { cn, getAvatarUrl, isMobileDevice } from "../lib/utils";
import { Player } from "../types";
import { calculateWeightedMu } from "../lib/matchEngine";
import { RestStreakCornerBadge } from "./RestStreakCornerBadge";
import { PetRenderer } from "./PetRenderer";
import { getPetTier } from "../lib/petCatalog";
import {
  isFlowingFrame,
  getFlowingGradient,
  renderFrameOverlay,
  renderBackgroundEffects,
  getTitleStyle,
  getCardForegroundClasses,
} from "../lib/itemEffects";

interface CourtCardProps {
  title: string;
  players: (Player | null)[];
  actionText: string;
  onAction: () => void;
  onSelectPlayers?: () => void;
  isRecommended?: boolean;
  startTime?: Date | null;
  isLoading?: boolean;
  isActionDisabled?: boolean;
  /** 僅鎖定主按鈕（上場／結束），不影響選人；例如推薦名單尚在同步時 */
  isPrimaryActionLocked?: boolean;
  /** 是否正在進行長時間計算（如排點），用於顯示場地中央的 Loading */
  isCalculating?: boolean;
  onSlotClick?: (index: number) => void;
  selectedSlotIndex?: number | null;
  onReset?: () => void;
  hasControl?: boolean;
  onCancel?: () => void;
  isAutoMode?: boolean;
  onToggleAuto?: () => void;
  /** 連續未上場場次（僅 Target 推薦卡傳入）；`null` 表示當日尚未上場，角標顯示「無」 */
  missedStreakByPlayerId?: Record<string, number | null>;
  useCareerWeight?: boolean;
  matchId?: string | null;
  betStatus?: {
    matchId: string;
    moneyline: BetTypeInfo;
    handicap: BetTypeInfo;
    overUnder: BetTypeInfo;
  } | null;
  onBet?: (matchId: string, team: number, amount: number, betType: string, lineValue: number) => void;
}

const BET_AMOUNTS = [100, 200, 500, "自訂"];

interface BetTypeInfo {
  team1Total: number;
  team2Total: number;
  odds1: number;
  odds2: number;
  houseOdds1?: number;
  houseOdds2?: number;
  poolOdds1?: number;
  poolOdds2?: number;
  effectiveOdds1?: number;
  effectiveOdds2?: number;
  line: number;
  myBetAmount: number;
  myBetTeam: number | null;
  locked?: boolean;
}

const PlayerSlot = React.memo(({ 
  player, 
  teamColor, 
  onClick, 
  isSelected,
  className,
  restStreakCount = 0,
  interactive = true,
  useCareerWeight,
}: { 
  player: Player | null; 
  teamColor?: "red" | "blue";
  onClick?: () => void;
  isSelected?: boolean;
  className?: string;
  /** 未上場連續場次；`null` 顯示「無」（當日尚未上場）。空位請傳 `0` */
  restStreakCount?: number | null;
  /** 無控制權時改為純展示，避免誤觸與「以為能點」 */
  interactive?: boolean;
  useCareerWeight?: boolean;
}) => {
  const activeTitle = player?.active_title?.name;
  const activeFrame = player?.active_frame?.name;
  const activeBackground = player?.active_background?.name;

  const isFlowing = isFlowingFrame(activeFrame);
  const flowingGradient = getFlowingGradient(activeFrame);
  const isFallingFeathers = activeBackground === "終極：飄零羽落";
  const fg = getCardForegroundClasses(activeBackground, { isFallingFeathers });
  const hasCosmeticBg = !!activeBackground;

  return (
    <div 
      className={cn(
        "absolute transition-all duration-300", 
        isSelected && player && interactive ? "z-30 scale-[1.03]" : "z-10",
        interactive && "hover:z-20",
        className
      )}
    >
      {/* [頂層] 懸浮稱號 (不受裁切影響，移出 overflow-hidden 的 button 外) */}
      {isMobileDevice() ? (
        player && activeTitle && (
          <div className="absolute -top-4 left-0 w-full z-[50] flex flex-col items-center pointer-events-none">
            <div className="relative h-3 md:h-3.5 flex items-center px-1.5">
              {(() => {
                const titleStyle = getTitleStyle(activeTitle);
                return (
                  <>
                    <div className={cn(
                      "absolute inset-0 rounded-full border shadow-sm overflow-hidden transition-all duration-500",
                      !isMobileDevice() && "backdrop-blur-md",
                      titleStyle.bg
                    )}>
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full opacity-30" />
                    </div>
                    <span className={cn(
                      "relative text-[7px] md:text-[8.5px] font-black uppercase tracking-wider whitespace-nowrap leading-none",
                      titleStyle.text
                    )}>
                      {activeTitle}
                    </span>
                  </>
                );
              })()}
            </div>
          </div>
        )
      ) : (
        <AnimatePresence mode="wait">
          {player && activeTitle && (
            <div className="absolute -top-4 left-0 w-full z-[50] flex flex-col items-center pointer-events-none">
              <motion.div 
                key={activeTitle}
                initial={{ y: 2, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 2, opacity: 0 }}
                className="relative h-3 md:h-3.5 flex items-center px-1.5"
              >
                {(() => {
                  const titleStyle = getTitleStyle(activeTitle);
                  return (
                    <>
                      <div className={cn(
                        "absolute inset-0 rounded-full border shadow-sm overflow-hidden transition-all duration-500",
                        !isMobileDevice() && "backdrop-blur-md",
                        titleStyle.bg
                      )}>
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-shimmer opacity-30" />
                      </div>
                      <span className={cn(
                        "relative text-[7px] md:text-[8.5px] font-black uppercase tracking-wider whitespace-nowrap leading-none",
                        titleStyle.text
                      )}>
                        {activeTitle}
                      </span>
                    </>
                  );
                })()}
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      )}

      <button 
        onClick={interactive ? onClick : undefined}
        type="button"
        tabIndex={interactive ? undefined : -1}
        className={cn(
          "relative w-full h-full flex flex-col items-center justify-center rounded-xl transition-all duration-300 shadow-sm overflow-hidden",
          !interactive && "pointer-events-none cursor-default",
          player 
            ? (activeFrame || activeBackground)
              ? "bg-transparent opacity-100 ring-1 ring-black/5 dark:ring-white/10 border-2 border-transparent"
              : "bg-white dark:bg-slate-900 opacity-100 ring-1 ring-black/5 dark:ring-white/10 border-2 border-slate-200 dark:border-slate-800" 
            : "bg-black/5 dark:bg-white/5 opacity-0 hover:opacity-10 border-2 border-transparent",
          
          /* 選中狀態 */
          isSelected && player && interactive && cn(
            "shadow-2xl ring-4 ring-amber-400",
            !activeFrame && "border-amber-400"
          ),

          !activeFrame && !isSelected && "border-transparent",
          
          interactive && "active:scale-95 group/slot"
        )}
      >
        {player && (
          <>
            {/* [底層] 流光特效 */}
            {isFlowing && (
              <div className="absolute inset-0 z-0 overflow-hidden rounded-xl pointer-events-none">
                <div 
                  className="absolute top-1/2 left-1/2 w-[300%] h-[300%] -translate-x-1/2 -translate-y-1/2 animate-spin-slow"
                  style={{ background: flowingGradient }}
                />
              </div>
            )}

            {/* [中層] 內容遮罩 */}
            {isFlowing && (
              <div className={cn(
                "absolute inset-[2.5px] rounded-[8px] z-[5] pointer-events-none",
                "bg-white dark:bg-slate-900"
              )} />
            )}

            {/* [背景] 各種環境特效 */}
            {renderBackgroundEffects(activeBackground, activeFrame, "court")}
            
            {/* 邊框覆蓋層 */}
            {renderFrameOverlay(activeFrame, "court")}

            {hasCosmeticBg && fg.scrim && (
              <div className={cn("absolute inset-x-0 bottom-0 h-[50%] z-[8] pointer-events-none rounded-b-xl", fg.scrim)} />
            )}

            {/* 右上角未上場角標 (移至最外層 button 內以利 overflow-hidden 裁切角緣) */}
            <RestStreakCornerBadge count={restStreakCount} cardCorner="xl" />
          </>
        )}

        {player ? (
          <>
            {/* [上層] 內容層：大頭照、姓名、戰力 */}
            <div className="absolute inset-0 isolate flex flex-col items-center justify-center overflow-visible rounded-xl p-0.5 md:p-1 z-10">

              {/* Avatar + Pet Container */}
              <div className={cn(
                "relative mb-1 z-10 hidden md:flex items-center justify-center transition-all duration-300",
                player.active_pet_id 
                  ? "w-[44px] h-[38px]" 
                  : "w-7 h-7"
              )}>
                <img
                  src={getAvatarUrl(player.avatar, player.name)}
                  alt={player.name}
                  className={cn(
                    "rounded-full object-cover shadow-sm border transition-all duration-300",
                    player.active_pet_id 
                      ? "absolute top-0 left-0 w-6 h-6" 
                      : "w-full h-full",
                    activeBackground || isFlowing
                      ? cn("bg-white/10 border-white/20 shadow-sm", !isMobileDevice() && "backdrop-blur-[1px]") 
                      : "bg-white border-slate-200/50"
                  )}
                />
                {player.active_pet_id && (
                  <div className={cn(
                    "absolute bottom-0 right-0 shrink-0 origin-bottom flex items-center justify-center filter drop-shadow-[0_1.2px_1.2px_rgba(0,0,0,0.3)]",
                    !isMobileDevice() && "animate-bounce-slow"
                  )}>
                    {player.active_pet_id.startsWith('egg_') ? (
                      <div className="relative w-5 h-5 flex items-center justify-center">
                        <img
                          src={`/amber-master/assets/eggs/${player.active_pet_id}.png`}
                          alt="equipped egg"
                          className="w-full h-full object-contain"
                        />
                        {player.egg_progress_games !== undefined && player.egg_progress_games > 0 && player.egg_progress_games <= 100 && (
                          <div className={cn(
                            "absolute -bottom-1 -right-1.5 text-white text-[6px] font-black rounded-full px-0.5 min-w-[10px] h-[10px] flex items-center justify-center scale-90 transform origin-bottom-right shadow-sm border border-white dark:border-slate-900 leading-none",
                            player.egg_progress_games === 100 && !isMobileDevice() ? "bg-amber-500 animate-pulse" : "bg-sky-500"
                          )}>
                            {player.egg_progress_games}
                          </div>
                        )}
                      </div>
                    ) : (
                      <PetRenderer petId={player.active_pet_id} tier={getPetTier(player.active_pet_id)} className="w-5 h-5" />
                    )}
                  </div>
                )}
              </div>
              
              <div className="flex flex-col items-center w-full min-w-0 mb-0.5 md:mb-1 z-10">
                <div className={cn(
                  "font-black text-[11px] md:text-[13px] tracking-tighter truncate w-full text-center px-0.5 md:px-1 leading-none transition-colors",
                  fg.name
                )}>
                  {player.name}
                </div>
              </div>
              <div className="flex items-center gap-1 mt-0.5 md:mt-1 z-10">
                 <span className={cn(
                   "text-[9px] md:text-[10px] tabular-nums leading-none transition-colors",
                   fg.meta
                 )}>
                   {player.matchCount || 0}場
                 </span>
                 <span className={cn("text-[8px] font-bold", fg.divider)}>|</span>
                 <span className={cn(
                   "text-[9px] md:text-[10px] tabular-nums leading-none transition-colors",
                   fg.score
                 )}>
                   {Math.round((player.mu || 0) * 10)}
                   {useCareerWeight && ` (${Math.round(calculateWeightedMu(player.mu || 0, player.mu || 0) * 10)})`}
                 </span>
              </div>

              {/* Team Badge Badge */}
              {teamColor && (
                <div className={cn(
                  "absolute top-1 left-1 px-1.5 py-0.5 rounded text-[7px] font-black shadow-sm z-30",
                  teamColor === "red" ? "bg-rose-500 text-white" : "bg-blue-500 text-white"
                )}>
                  {teamColor === "red" ? "T1" : "T2"}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center opacity-40">
             <Users size={16} className="hidden md:block text-white mb-0.5" />
             <span className="text-[9px] md:text-[10px] font-black text-white uppercase tracking-widest leading-none">PICK</span>
          </div>
        )}
      </button>
    </div>
  );
});

export const CourtCard: React.FC<CourtCardProps> = React.memo(({
  title,
  players,
  actionText,
  onAction,
  onSelectPlayers,
  isRecommended,
  startTime,
  isLoading,
  isActionDisabled,
  isPrimaryActionLocked,
  onSlotClick,
  selectedSlotIndex,
  onReset,
  hasControl = true,
  onCancel,
  isAutoMode,
  onToggleAuto,
  missedStreakByPlayerId,
  isCalculating,
  useCareerWeight = false,
  matchId,
  betStatus,
  onBet,
}) => {
  const [bettingTeam, setBettingTeam] = useState<number | null>(null);
  const [activeBetType, setActiveBetType] = useState<"moneyline" | "handicap" | "overUnder">("moneyline");
  const [customAmountStr, setCustomAmountStr] = useState<string>("");
  const [showCustomInput, setShowCustomInput] = useState(false);
  const readOnly = hasControl === false;
  
  // 獲取目前選定類型的數據
  const currentStatus: BetTypeInfo = betStatus?.[activeBetType] || { odds1: 1, odds2: 1, team1Total: 0, team2Total: 0, myBetTeam: null, myBetAmount: 0, line: 0 };
  const selectedHouseOdds = bettingTeam === 1
    ? (currentStatus.houseOdds1 ?? currentStatus.odds1)
    : bettingTeam === 2
      ? (currentStatus.houseOdds2 ?? currentStatus.odds2)
      : 0;
  const selectedPoolOdds = bettingTeam === 1
    ? (currentStatus.poolOdds1 ?? currentStatus.odds1)
    : bettingTeam === 2
      ? (currentStatus.poolOdds2 ?? currentStatus.odds2)
      : 0;
  const selectedEffectiveOdds = bettingTeam === 1
    ? (currentStatus.effectiveOdds1 ?? currentStatus.odds1)
    : bettingTeam === 2
      ? (currentStatus.effectiveOdds2 ?? currentStatus.odds2)
      : 0;
  const totalPool = betStatus
    ? (betStatus.moneyline.team1Total || 0) + (betStatus.moneyline.team2Total || 0)
      + (betStatus.handicap.team1Total || 0) + (betStatus.handicap.team2Total || 0)
      + (betStatus.overUnder.team1Total || 0) + (betStatus.overUnder.team2Total || 0)
    : 0;

  const team1Score = players[0] && players[1] ? Math.round(((players[0].mu || 0) + (players[1].mu || 0)) * 10) : 0;
  const team2Score = players[2] && players[3] ? Math.round(((players[2].mu || 0) + (players[3].mu || 0)) * 10) : 0;

  const team1Weighted = players[0] && players[1] 
    ? Math.round((calculateWeightedMu(players[0].mu || 0, players[0].career_mu || players[0].mu || 0) + 
                  calculateWeightedMu(players[1].mu || 0, players[1].career_mu || players[1].mu || 0)) * 10) 
    : 0;
  const team2Weighted = players[2] && players[3] 
    ? Math.round((calculateWeightedMu(players[2].mu || 0, players[2].career_mu || players[2].mu || 0) + 
                  calculateWeightedMu(players[3].mu || 0, players[3].career_mu || players[3].mu || 0)) * 10) 
    : 0;

  const renderBetButton = (team: number) => {
    if (isRecommended || actionText !== "結束" || !matchId) return null;
    
    if (!betStatus) {
      return (
        <button
          disabled
          className="flex items-center justify-center px-2 py-1 rounded-full border border-white/10 bg-black/40 text-white/40 pointer-events-none min-w-[40px] animate-pulse"
        >
          <span className="text-[9px] md:text-[10px] font-black leading-none">載入中</span>
        </button>
      );
    }
    
    const betCount = [betStatus.moneyline, betStatus.handicap, betStatus.overUnder]
      .filter((s) => s.myBetTeam).length;
    const allTypesBet = betCount >= 3;

    const openBetting = (e: React.MouseEvent) => {
      e.stopPropagation();
      const types = ["moneyline", "handicap", "overUnder"] as const;
      const firstOpen = types.find((t) => !betStatus[t].myBetTeam && !betStatus[t].locked);
      if (firstOpen) setActiveBetType(firstOpen);
      setBettingTeam(1);
    };

    return (
      <button
        onClick={openBetting}
        disabled={allTypesBet}
        className={cn(
          "flex items-center justify-center px-2 py-1 rounded-full border transition-all pointer-events-auto min-w-[40px] shadow-lg",
          allTypesBet
            ? "bg-emerald-500/80 border-emerald-400 text-white cursor-default"
            : betCount > 0
              ? "bg-emerald-600 border-emerald-400 text-white hover:scale-105"
              : "bg-black/60 border-white/20 hover:bg-black/80 hover:scale-105 text-white/90"
        )}
      >
        <span className="text-[9px] md:text-[10px] font-black drop-shadow-sm leading-none">
          {allTypesBet ? "已投" : betCount > 0 ? `${betCount}/3` : "投注"}
        </span>
      </button>
    );
  };

  const [elapsed, setElapsed] = useState<string>("00:00");
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const isTimeLocked = elapsedSeconds > 180;

  useEffect(() => {
    if (!startTime) {
      setElapsed("00:00");
      setElapsedSeconds(0);
      return;
    }

    const updateTimer = () => {
      const now = new Date();
      const diff = Math.floor((now.getTime() - new Date(startTime).getTime()) / 1000);
      const minutes = Math.floor(diff / 60);
      const seconds = diff % 60;
      setElapsedSeconds(diff);
      setElapsed(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  // 自動切換分頁：如果目前選的分頁是被鎖定的，自動跳轉到第一個可用的分頁
  useEffect(() => {
    if (bettingTeam && betStatus) {
      const currentLocked = (betStatus as any)[activeBetType]?.locked;
      if (currentLocked) {
        const types = ["moneyline", "handicap", "overUnder"] as const;
        const firstAvailable = types.find(t => !(betStatus as any)[t]?.locked);
        if (firstAvailable) {
          setActiveBetType(firstAvailable);
        }
      }
    }
  }, [bettingTeam, betStatus, activeBetType]);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl overflow-hidden flex flex-col shadow-sm border border-slate-100 dark:border-slate-800 transition-all hover:shadow-lg w-full max-w-[340px] md:max-w-[220px] mx-auto group">
      {/* Court Header */}
      <div className="flex items-center justify-between px-3.5 py-2 bg-white dark:bg-slate-900 border-b border-slate-50 dark:border-slate-800 h-[42px] shrink-0">
        <div className="flex items-center gap-1.5 overflow-hidden">
          <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", isRecommended ? (isMobileDevice() ? "bg-indigo-500" : "bg-indigo-500 animate-pulse") : "bg-emerald-500")} />
          <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest truncate">
            {isRecommended ? "Target Match" : `Court ${title.replace("場地", "")}`}
          </span>
        </div>
        {!isRecommended && (
          <div className="bg-slate-900 dark:bg-slate-100 px-2 py-0.5 rounded shadow-sm scale-90 origin-right shrink-0">
            <span className="font-mono text-xs font-black text-white dark:text-slate-900 tracking-widest whitespace-nowrap">
              {elapsed}
            </span>
          </div>
        )}
        {isRecommended && onReset && !readOnly && (
          <div className="flex items-center gap-1.5 md:gap-2">
            <button
               onClick={(e) => {
                  e.stopPropagation();
                  onToggleAuto?.();
               }}
               className={cn(
                 "flex items-center gap-1 px-2.5 py-1.5 md:px-1.5 md:py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider transition-all border cursor-pointer active:scale-95",
                 isAutoMode 
                   ? "bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 shadow-sm shadow-indigo-200/50 animate-pulse-subtle" 
                   : "bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
               )}
               title={isAutoMode ? "自動模式已開啟" : "開啟自動模式"}
            >
              <Zap size={10} className={isAutoMode ? "fill-indigo-500" : ""} />
              Auto
            </button>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onReset();
              }}
              className="p-1.5 transition-colors text-slate-300 hover:text-indigo-500 relative active:scale-95 before:absolute before:-inset-2.5"
              title="重置名單"
            >
              <RotateCcw size={12} strokeWidth={3} />
            </button>
          </div>
        )}
      </div>

      {/* Court Floor - FULL PRECISION ALIGNMENT WITH INSET */}
      <div className="relative bg-[#4A7265] dark:bg-[#3d5c52] h-[220px] md:h-[300px] flex flex-col justify-between overflow-hidden shrink-0 select-none">
        
        {/* Team Favorite Labels - Absolute Top/Bottom of card */}
        {team1Score > team2Score && team2Score > 0 && (
          <div className="absolute top-1.5 left-1/2 -translate-x-1/2 z-[45] pointer-events-none">
            <span className={cn("bg-rose-500/90 text-white text-[7px] md:text-[9px] px-2 py-0.5 rounded-full font-black shadow-lg shadow-rose-500/30 whitespace-nowrap", !isMobileDevice() && "animate-pulse")}>FAVORITE 強勢</span>
          </div>
        )}
        {team2Score > team1Score && team1Score > 0 && (
          <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 z-[45] pointer-events-none">
            <span className={cn("bg-blue-500/90 text-white text-[7px] md:text-[9px] px-2 py-0.5 rounded-full font-black shadow-lg shadow-blue-500/30 whitespace-nowrap", !isMobileDevice() && "animate-pulse")}>FAVORITE 強勢</span>
          </div>
        )}

        {/* Court Markings - Absolute Relative to the 300px floor */}
        <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute inset-x-[7.5%] inset-y-0 border-x-[1px] border-white/30 dark:border-white/20"></div>
          <div className="absolute inset-x-0 top-[5.7%] h-0 border-t-[1px] border-white/30 dark:border-white/20"></div>
          <div className="absolute inset-x-0 bottom-[5.7%] h-0 border-t-[1px] border-white/30 dark:border-white/20"></div>
          <div className="absolute inset-x-0 top-[35.3%] h-0 border-t-[1.5px] border-white/40 dark:border-white/30"></div>
          <div className="absolute inset-x-0 bottom-[35.3%] h-0 border-t-[1.5px] border-white/40 dark:border-white/30"></div>
          <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-[1.5px] bg-white/30 dark:bg-white/20"></div>
          {/* Net Line */}
          <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 h-0 border-t-[1.5px] border-white/40 dark:border-white/30 border-dashed z-0 opacity-50"></div>
        </div>

        {/* Big Background ID */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
          <span className="text-[120px] font-black text-white/[0.04] select-none leading-none tracking-tighter">
            {isRecommended ? "推" : title.replace("場地", "")}
          </span>
        </div>

        {/* Player Slot Integration (Inset within the Grid Rectangles) */}
        
        {/* Team 1 Slots (Using Calc for 4px Inset) */}
        <PlayerSlot 
          player={players[0]} 
          teamColor={isRecommended ? "red" : undefined} 
          onClick={() => onSlotClick?.(0)}
          isSelected={selectedSlotIndex === 0}
          className="left-[calc(7.5%+4px)] top-[calc(5.7%+4px)] w-[calc(42.5%-8px)] h-[calc(29.6%-8px)]"
          restStreakCount={
            players[0]
              ? missedStreakByPlayerId?.[players[0].id] === undefined
                ? 0
                : missedStreakByPlayerId[players[0].id]!
              : 0
          }
          interactive={!readOnly}
          useCareerWeight={useCareerWeight}
        />
        <PlayerSlot 
          player={players[1]} 
          teamColor={isRecommended ? "red" : undefined} 
          onClick={() => onSlotClick?.(1)}
          isSelected={selectedSlotIndex === 1}
          className="right-[calc(7.5%+4px)] top-[calc(5.7%+4px)] w-[calc(42.5%-8px)] h-[calc(29.6%-8px)]"
          restStreakCount={
            players[1]
              ? missedStreakByPlayerId?.[players[1].id] === undefined
                ? 0
                : missedStreakByPlayerId[players[1].id]!
              : 0
          }
          interactive={!readOnly}
          useCareerWeight={useCareerWeight}
        />

        {/* Center VS & Points */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center py-1 md:py-2 z-40 pointer-events-none w-full">
          
          {/* Team 1 Score & Bet */}
          <div className="relative flex items-center justify-center w-full mb-1 md:mb-2 translate-y-[5px] md:translate-y-[10px]">
            <div className={cn("text-sm md:text-xl font-black text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] tracking-tighter leading-none transition-all duration-300", team1Score === 0 && "opacity-0 scale-75")}>
              {team1Score}{useCareerWeight && <span className="text-[10px] md:text-sm opacity-80 ml-1">({team1Weighted})</span>}
            </div>
          </div>
          
          {/* VS / POOL 核心區 */}
          <div className="relative my-1 md:my-1.5 scale-75 md:scale-90 flex items-center gap-2">
            <div className={cn(
              "bg-emerald-950/90 px-2 md:px-3 py-0.5 md:py-1 rounded-full border border-white/30 shadow-2xl flex flex-col items-center justify-center",
              !isMobileDevice() && "backdrop-blur-md"
            )}>
              {matchId && !isRecommended && actionText === "結束" ? (
                betStatus ? (
                  <>
                    <span className="text-[5px] font-black text-sky-400/90 uppercase leading-none mb-0.5 tracking-widest">POOL</span>
                    <span className="text-[9px] font-black text-white leading-none tabular-nums">{totalPool}</span>
                  </>
                ) : (
                  <span className="text-[8px] font-black text-white/50 animate-pulse">載入中...</span>
                )
              ) : (
                <span className="text-[9px] md:text-[10px] font-black text-emerald-400 italic uppercase tracking-widest">VS</span>
              )}
            </div>
            {renderBetButton(1)}
            <div className={cn("absolute inset-0 bg-emerald-400/25 blur-xl rounded-full -z-10", !isMobileDevice() && "animate-pulse")}></div>
          </div>
          
          {/* Team 2 Score & Bet */}
          <div className="relative flex items-center justify-center w-full mt-1 md:mt-2 translate-y-[-5px] md:translate-y-[-10px]">
            <div className={cn("text-sm md:text-xl font-black text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] tracking-tighter leading-none transition-all duration-300", team2Score === 0 && "opacity-0 scale-75")}>
              {team2Score}{useCareerWeight && <span className="text-[10px] md:text-sm opacity-80 ml-1">({team2Weighted})</span>}
            </div>
          </div>
        </div>

        {/* Advanced Betting Selector Overlay */}
        {bettingTeam && (
          <div className={cn(
            "fixed inset-0 md:absolute z-[60] bg-black/75 md:bg-black/90 flex items-center justify-center md:block p-4 md:p-0 animate-in fade-in duration-200",
            !isMobileDevice() && "backdrop-blur-md"
          )}>
            <div className="w-full max-w-[340px] md:max-w-none md:w-full md:h-full bg-slate-900/95 md:bg-transparent border border-white/10 md:border-none rounded-3xl md:rounded-none p-6 md:p-3 flex flex-col items-center justify-center shadow-2xl md:shadow-none animate-in zoom-in duration-200 relative">
              <button 
                onClick={() => {
                  setBettingTeam(null);
                  setShowCustomInput(false);
                  setCustomAmountStr("");
                }}
                className="absolute top-4 right-4 md:hidden text-white/40 hover:text-white text-base transition-colors p-1"
                title="關閉"
              >
                ✕
              </button>

              {isTimeLocked ? (
                <div className="flex flex-col items-center justify-center bg-red-900/40 border border-red-500/50 rounded-xl p-4 mb-4">
                  <span className="text-red-400 font-black text-sm mb-1 uppercase tracking-wider">投注時間已截止</span>
                  <span className="text-white/60 text-[10px]">開打 3 分鐘後無法進行下注</span>
                </div>
              ) : currentStatus.myBetTeam ? (
                <div className="flex flex-col items-center justify-center bg-emerald-900/40 border border-emerald-500/50 rounded-xl p-4 mb-4">
                  <span className="text-emerald-400 font-black text-sm mb-1">此盤口已投注</span>
                  <span className="text-white/60 text-[10px]">可切換其他盤口繼續下注（各限 1 注）</span>
                </div>
              ) : (
                <>
                  {/* Bet Type Tabs */}
                  <div className="flex bg-white/5 p-1 rounded-xl gap-1 mb-2 sm:mb-4 w-[95%] max-w-[320px]">
                    {(["moneyline", "handicap", "overUnder"] as const).map((type) => {
                      const labelMap = { moneyline: "獨贏", handicap: "讓分", overUnder: "大小" };
                      const typeStatus = betStatus?.[type];
                      const isLocked = typeStatus?.locked;
                      const alreadyBet = !!typeStatus?.myBetTeam;
                      const tabDisabled = isLocked || alreadyBet;
                      return (
                        <button
                          key={type}
                          onClick={() => !tabDisabled && setActiveBetType(type)}
                          disabled={tabDisabled}
                          className={cn(
                            "flex-1 py-2 rounded-lg text-xs font-black transition-all flex flex-col items-center justify-center",
                            activeBetType === type 
                              ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30" 
                              : tabDisabled
                                ? alreadyBet
                                  ? "text-emerald-400/60 bg-emerald-500/10 cursor-default"
                                  : "text-white/10 cursor-not-allowed bg-transparent"
                                : "text-white/40 hover:text-white/70 hover:bg-white/5"
                          )}
                        >
                          <span>{labelMap[type]}</span>
                          {alreadyBet && <span className="text-[7px] opacity-70 font-normal">已投</span>}
                          {isLocked && !alreadyBet && <span className="text-[7px] opacity-50 font-normal">未開盤</span>}
                        </button>
                      );
                    })}
                  </div>

                  {/* Choice Selector (Player Names or Over/Under) */}
                  <div className="flex w-[95%] max-w-[320px] gap-2 mb-2 sm:mb-4">
                    <button
                      onClick={() => setBettingTeam(1)}
                      className={cn(
                        "flex-1 py-2 px-1 rounded-xl border font-black text-[10px] transition-all overflow-hidden",
                        bettingTeam === 1 
                          ? "bg-rose-500 border-rose-400 text-white shadow-lg" 
                          : "bg-white/5 border-white/10 text-white/40"
                      )}
                    >
                      {activeBetType === "overUnder" ? "大於" : (
                        <span className="truncate block">
                          {players[0]?.name || "T1"} {players[1] ? `& ${players[1].name}` : ""}
                        </span>
                      )}
                    </button>
                    <button
                      onClick={() => setBettingTeam(2)}
                      className={cn(
                        "flex-1 py-2 px-1 rounded-xl border font-black text-[10px] transition-all overflow-hidden",
                        bettingTeam === 2 
                          ? "bg-blue-500 border-blue-400 text-white shadow-lg" 
                          : "bg-white/5 border-white/10 text-white/40"
                      )}
                    >
                      {activeBetType === "overUnder" ? "小於" : (
                        <span className="truncate block">
                          {players[2]?.name || "T2"} {players[3] ? `& ${players[3].name}` : ""}
                        </span>
                      )}
                    </button>
                  </div>

                  <div className="text-center mb-4">
                    <h4 className="text-white font-black text-xs uppercase tracking-widest mb-1">
                      {activeBetType === "moneyline" ? (
                        `預測 ${bettingTeam === 1 
                          ? (players[0]?.name || "T1") + (players[1] ? " & " + players[1].name : "")
                          : (players[2]?.name || "T2") + (players[3] ? " & " + players[3].name : "")} 獲勝`
                      ) : 
                       activeBetType === "handicap" ? (
                         bettingTeam === 1 
                          ? `預測 ${players[0]?.name || "T1"} 讓分 (${currentStatus.line > 0 ? "+" : ""}${currentStatus.line})`
                          : `預測 ${players[2]?.name || "T2"} 受讓 (${currentStatus.line > 0 ? "-" : "+"}${Math.abs(currentStatus.line)})`
                       ) :
                       `總分 ${bettingTeam === 1 ? "大於" : "小於"} ${currentStatus.line}`}
                    </h4>
                    {bettingTeam && (
                      <div className="text-[9px] font-bold text-white/50 space-y-0.5 mb-2">
                        <div>
                          保底賠率 <span className="text-amber-400 font-black">{selectedEffectiveOdds.toFixed(2)}</span>
                          <span className="text-white/30 mx-1">·</span>
                          莊家 {selectedHouseOdds.toFixed(2)}
                          <span className="text-white/30 mx-1">·</span>
                          池子 {selectedPoolOdds.toFixed(2)}
                        </div>
                        <div className="text-white/40">
                          對面池 {(bettingTeam === 1 ? currentStatus.team2Total : currentStatus.team1Total) || 0} 根
                          {selectedPoolOdds > selectedHouseOdds && " · 池子滿可加成"}
                        </div>
                      </div>
                    )}
                    <div className="text-emerald-400 font-black text-[9px] uppercase tracking-tighter opacity-80">
                      投注金額
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-1.5 sm:gap-2 w-[95%] max-w-[320px] mb-2">
                    {showCustomInput ? (
                      <div className="col-span-2 flex gap-2">
                        <input
                          type="number"
                          min="1"
                          value={customAmountStr}
                          onChange={(e) => setCustomAmountStr(e.target.value)}
                          placeholder="輸入金額"
                          className="flex-1 bg-white/10 border border-emerald-500/50 rounded-xl px-3 py-2 text-white font-black text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          autoFocus
                        />
                        <button
                          onClick={() => {
                            const parsed = parseInt(customAmountStr, 10);
                            if (isNaN(parsed) || parsed <= 0) {
                              setCustomAmountStr("");
                              setShowCustomInput(false);
                              return;
                            }
                            if (!(currentStatus as any).locked && matchId) {
                               onBet?.(matchId, bettingTeam, parsed, activeBetType, currentStatus.line);
                            }
                            setBettingTeam(null);
                            setShowCustomInput(false);
                            setCustomAmountStr("");
                          }}
                          disabled={(currentStatus as any).locked || !customAmountStr}
                          className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white px-4 rounded-xl font-black text-xs transition-colors"
                        >
                          確定
                        </button>
                        <button 
                          onClick={() => { setShowCustomInput(false); setCustomAmountStr(""); }}
                          className="bg-white/10 hover:bg-white/20 text-white/60 px-3 rounded-xl font-black text-xs"
                        >
                          X
                        </button>
                      </div>
                    ) : (
                      BET_AMOUNTS.map(amount => {
                        const isLocked = (currentStatus as any).locked;
                        return (
                          <button
                            key={amount}
                            onClick={() => {
                              if (amount === "自訂") {
                                setShowCustomInput(true);
                                return;
                              }
                              if (!isLocked && matchId) onBet?.(matchId, bettingTeam, amount as number, activeBetType, currentStatus.line);
                              setBettingTeam(null);
                            }}
                            disabled={isLocked}
                            className={cn(
                              "border border-white/10 py-1.5 sm:py-2 rounded-xl text-white font-black text-[11px] sm:text-xs transition-all active:scale-95",
                              isLocked 
                                ? "bg-white/5 text-white/10 cursor-not-allowed" 
                                : amount === "自訂"
                                  ? "bg-indigo-600/30 hover:bg-indigo-500 hover:text-white border-indigo-400/30"
                                  : "bg-white/10 hover:bg-emerald-500 hover:text-white"
                            )}
                          >
                            <span>{amount}</span>
                            {typeof amount === "number" && bettingTeam && selectedEffectiveOdds > 1 && (
                              <span className="block text-[8px] text-emerald-300/80 font-bold mt-0.5">
                                +{Math.round(amount * selectedEffectiveOdds) - amount}
                              </span>
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>
                  {bettingTeam && !showCustomInput && (
                    <p className="text-[8px] text-white/40 font-bold mb-2 text-center">
                      預估獲利至少 +{Math.round(100 * selectedHouseOdds) - 100}（莊家保底）
                    </p>
                  )}
                </>
              )}
              
              <button 
                onClick={() => {
                  setBettingTeam(null);
                  setShowCustomInput(false);
                  setCustomAmountStr("");
                }} 
                className="text-white/40 text-[9px] font-bold hover:text-white uppercase tracking-widest mt-2 md:mt-0"
              >
                取消返回
              </button>
            </div>
          </div>
        )}

        {/* Team 2 Slots (Inset within Bottom Grid Rectangles) */}
        <PlayerSlot 
          player={players[2]} 
          teamColor={isRecommended ? "blue" : undefined} 
          onClick={() => onSlotClick?.(2)}
          isSelected={selectedSlotIndex === 2}
          className="left-[calc(7.5%+4px)] bottom-[calc(5.7%+4px)] w-[calc(42.5%-8px)] h-[calc(29.6%-8px)]"
          restStreakCount={
            players[2]
              ? missedStreakByPlayerId?.[players[2].id] === undefined
                ? 0
                : missedStreakByPlayerId[players[2].id]!
              : 0
          }
          interactive={!readOnly}
          useCareerWeight={useCareerWeight}
        />
        <PlayerSlot 
          player={players[3]} 
          teamColor={isRecommended ? "blue" : undefined} 
          onClick={() => onSlotClick?.(3)}
          isSelected={selectedSlotIndex === 3}
          className="right-[calc(7.5%+4px)] bottom-[calc(5.7%+4px)] w-[calc(42.5%-8px)] h-[calc(29.6%-8px)]"
          restStreakCount={
            players[3]
              ? missedStreakByPlayerId?.[players[3].id] === undefined
                ? 0
                : missedStreakByPlayerId[players[3].id]!
              : 0
          }
          interactive={!readOnly}
          useCareerWeight={useCareerWeight}
        />

        {/* Simple Loading Spinner in center of court floor - Only for long calculations */}
        {isCalculating && (
          <div className={cn(
            "absolute inset-0 z-50 flex items-center justify-center bg-black/5",
            !isMobileDevice() && "backdrop-blur-[1px]"
          )}>
            <Loader2 size={32} className="animate-spin text-white drop-shadow-md" />
          </div>
        )}

      </div>

      {/* Footer：無控制權時不顯示操作鈕，避免只看不操作的人誤觸與困惑 */}
      <div className="p-2 bg-white dark:bg-slate-900 flex items-center justify-center min-h-[52px] shrink-0 border-t border-slate-50/50 dark:border-slate-800/50">
        {readOnly ? (
          <p className="text-center text-[10px] font-bold leading-snug text-slate-400 dark:text-slate-500 px-1">
            僅供觀看 · 場地與名單會自動更新
          </p>
        ) : (
        <div className={cn(
          "w-full px-1",
          (isRecommended || (actionText === "結束" && onCancel && players.some(p => p !== null))) ? "grid grid-cols-2 gap-2" : "flex justify-center"
        )}>
          {isRecommended && onSelectPlayers && (
            <button
              onClick={onSelectPlayers}
              disabled={isLoading || isActionDisabled || !!bettingTeam}
              className="px-2 py-3 md:py-2 font-black text-[10px] uppercase tracking-widest text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900 hover:bg-black dark:hover:bg-white hover:text-white dark:hover:text-black hover:border-black dark:hover:border-white rounded-xl transition-all active:scale-95 bg-indigo-50/30 dark:bg-indigo-950/30 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed"
            >
              選人
            </button>
          )}
          
          {players.some(p => p !== null) && (
            <>
              {actionText === "結束" && onCancel && (
                <button
                  onClick={onCancel}
                  disabled={isLoading || isActionDisabled || !!bettingTeam}
                  className="px-4 py-3 md:py-2 font-black text-[11px] uppercase tracking-[0.1em] rounded-xl transition-all shadow-sm active:scale-95 disabled:opacity-20 flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 w-full"
                >
                  取消
                </button>
              )}

              <button
                onClick={onAction}
                disabled={isLoading || isActionDisabled || !!isPrimaryActionLocked || !!bettingTeam}
                className={cn(
                  "px-4 py-3 md:py-2 font-black text-[11px] uppercase tracking-[0.2em] rounded-xl transition-all shadow-sm active:scale-95 disabled:opacity-20 flex items-center justify-center gap-2",
                  actionText === "結束" 
                    ? "bg-red-50 dark:bg-red-950/30 text-red-500 dark:text-red-400 hover:bg-red-600 hover:text-white w-full" 
                    : "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-black dark:hover:bg-white w-full"
                )}
              >
                {actionText}
              </button>
            </>
          )}
        </div>
        )}
      </div>
    </div>
  );
});

export const CourtCardSkeleton: React.FC = () => (
  <div className="bg-white dark:bg-slate-900 rounded-2xl overflow-hidden flex flex-col shadow-sm border border-slate-100 dark:border-slate-800 w-full max-w-[340px] md:max-w-[220px] mx-auto animate-pulse-heavy">
    {/* Skeleton Header */}
    <div className="flex items-center justify-between px-3.5 py-2 border-b border-slate-50 dark:border-slate-800 h-[42px]">
      <div className="flex items-center gap-1.5">
        <div className="w-1.5 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700" />
        <div className="h-2 w-16 bg-slate-200 dark:bg-slate-700 rounded" />
      </div>
      <div className="h-4 w-10 bg-slate-200 dark:bg-slate-700 rounded" />
    </div>

    {/* Skeleton Court Floor */}
    <div className="relative bg-slate-100 dark:bg-slate-800 h-[220px] md:h-[300px]">
      <div className="absolute inset-x-[7.5%] inset-y-0 border-x-[1px] border-white/30 dark:border-white/10" />
      <div className="absolute inset-x-0 top-[35.3%] h-0 border-t-[1.5px] border-white/40 dark:border-white/20" />
      <div className="absolute inset-x-0 bottom-[35.3%] h-0 border-t-[1.5px] border-white/40 dark:border-white/20" />
      
      {/* Skeleton Player Slots */}
      {[0, 1, 2, 3].map((i) => (
        <div 
          key={i}
          className={cn(
            "absolute bg-white/30 rounded-xl",
            i === 0 && "left-[calc(7.5%+4px)] top-[calc(5.7%+4px)] w-[calc(42.5%-8px)] h-[calc(29.6%-8px)]",
            i === 1 && "right-[calc(7.5%+4px)] top-[calc(5.7%+4px)] w-[calc(42.5%-8px)] h-[calc(29.6%-8px)]",
            i === 2 && "left-[calc(7.5%+4px)] bottom-[calc(5.7%+4px)] w-[calc(42.5%-8px)] h-[calc(29.6%-8px)]",
            i === 3 && "right-[calc(7.5%+4px)] bottom-[calc(5.7%+4px)] w-[calc(42.5%-8px)] h-[calc(29.6%-8px)]"
          )}
        />
      ))}
    </div>

    {/* Skeleton Footer */}
    <div className="p-2 h-[52px] border-t border-slate-50/50 dark:border-slate-800/50 flex items-center justify-center">
      <div className="h-8 w-3/4 bg-slate-100 dark:bg-slate-800 rounded-xl" />
    </div>
  </div>
);
