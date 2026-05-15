import React, { useState, useEffect } from "react";
import Loader2 from "lucide-react/dist/esm/icons/loader-2";
import Users from "lucide-react/dist/esm/icons/users";
import RotateCcw from "lucide-react/dist/esm/icons/rotate-ccw";
import Zap from "lucide-react/dist/esm/icons/zap";
import Feather from "lucide-react/dist/esm/icons/feather";
import { cn, getAvatarUrl } from "../lib/utils";
import { Player } from "../types";
import { calculateWeightedMu } from "../lib/matchEngine";
import { RestStreakCornerBadge } from "./RestStreakCornerBadge";

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
    moneyline: { team1Total: number; team2Total: number; odds1: number; odds2: number; line: number; myBetAmount: number; myBetTeam: number | null; locked?: boolean };
    handicap: { team1Total: number; team2Total: number; odds1: number; odds2: number; line: number; myBetAmount: number; myBetTeam: number | null; locked?: boolean };
    overUnder: { team1Total: number; team2Total: number; odds1: number; odds2: number; line: number; myBetAmount: number; myBetTeam: number | null; locked?: boolean };
  } | null;
  onBet?: (matchId: string, team: number, amount: number, betType: string, lineValue: number) => void;
}

const BET_AMOUNTS = [50, 100, 200, 500];

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

  const frameClass = activeFrame === "初學者青銅" 
    ? "border-amber-700/50 shadow-[0_0_10px_rgba(180,83,9,0.2)]" 
    : activeFrame === "熱血火紅"
    ? "border-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.3)] animate-pulse-subtle"
    : activeFrame === "純白羽框"
    ? "border-white dark:border-white/80 shadow-[0_0_15px_rgba(255,255,255,0.4)]"
    : activeFrame === "飄零羽落"
    ? "border-sky-200/50 dark:border-sky-400/30 shadow-[0_0_10px_rgba(186,230,253,0.3)]"
    : null;

  const isFallingFeathers = activeFrame === "飄零羽落";
  return (
    <button 
      onClick={interactive ? onClick : undefined}
      type="button"
      tabIndex={interactive ? undefined : -1}
      className={cn(
        "flex flex-col items-center justify-center rounded-xl transition-all duration-300 absolute shadow-sm",
        interactive && "hover:z-20",
        !interactive && "pointer-events-none cursor-default",
        /* 有球員時勿在 button 上 overflow-hidden：Safari 對 button + 子層 backdrop 等合成層裁切有 bug；改由內層 div 裁切 */
        player ? "overflow-visible p-0" : "overflow-hidden p-0.5 md:p-1",
        player 
          ? "bg-white dark:bg-slate-900 opacity-100 ring-1 ring-black/5 dark:ring-white/10" 
          : "bg-black/5 dark:bg-white/5 opacity-0 hover:opacity-10",
        isSelected && player && interactive && "ring-4 ring-amber-400 z-30 shadow-2xl scale-[1.03]",
        !isSelected && teamColor === "red" && player && "bg-rose-50/95 dark:bg-rose-950/80 ring-rose-200/50 dark:ring-rose-900/50",
        !isSelected && teamColor === "blue" && player && "bg-blue-50/95 dark:bg-blue-950/80 ring-blue-200/50 dark:ring-blue-900/50",
        interactive && "active:scale-95 group/slot",
        frameClass,
        className
      )}
    >
      {player ? (
        <div className="absolute inset-0 isolate flex flex-col items-center justify-center overflow-clip rounded-xl p-0.5 md:p-1">
          {/* Falling Feathers Animation Overlay */}
          {isFallingFeathers && (
            <div className="absolute inset-0 pointer-events-none opacity-40 z-0">
              <Feather size={6} className="absolute top-0 left-1/4 text-sky-400/40" style={{ animation: 'feather-fall 4s linear infinite' }} />
              <Feather size={4} className="absolute top-0 left-2/3 text-sky-300/40" style={{ animation: 'feather-fall 5s linear infinite 1.5s' }} />
            </div>
          )}
          
          {/* Pure White Frame Corner Feather */}
          {activeFrame === "純白羽框" && (
            <Feather size={10} className="absolute -top-0.5 -right-0.5 text-white rotate-45 drop-shadow-[0_0_5px_rgba(255,255,255,0.8)] z-30" />
          )}

          <RestStreakCornerBadge count={restStreakCount} cardCorner="xl" />
          <img
            src={getAvatarUrl(player.avatar, player.name)}
            alt={player.name}
            className="hidden md:block w-7 h-7 rounded-full object-cover shadow-sm bg-white mb-1 border border-slate-200/50"
          />
          <div className="flex flex-col items-center w-full min-w-0 mb-0.5 md:mb-1">
            {activeTitle && (
              <span className="text-[6px] md:text-[7px] font-black text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-1 rounded-sm border border-amber-200/50 dark:border-amber-500/30 mb-0.5 truncate max-w-[90%]">
                {activeTitle}
              </span>
            )}
            <div className="font-black text-[11px] md:text-[13px] tracking-tighter text-slate-800 dark:text-slate-100 truncate w-full text-center px-0.5 md:px-1 leading-none drop-shadow-sm">
              {player.name}
            </div>
          </div>
          <div className="flex items-center gap-1 px-1 md:px-1.5 py-0.5 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-md md:rounded-lg shadow-inner scale-[0.8] origin-top md:scale-90">
             <span className="text-[9px] font-black text-slate-500 dark:text-slate-400 leading-none">
               {player.matchCount || 0}場
             </span>
             <span className="text-[9px] font-black text-slate-200 dark:text-slate-700">|</span>
             <span className="text-[9px] font-black text-emerald-700 dark:text-emerald-400 leading-none">
               {Math.round((player.mu || 0) * 10)}
               {useCareerWeight && ` (${Math.round(calculateWeightedMu(player.mu || 0, player.career_mu || player.mu || 0) * 10)})`}
             </span>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center opacity-40">
           <Users size={16} className="hidden md:block text-white mb-0.5" />
           <span className="text-[9px] md:text-[10px] font-black text-white uppercase tracking-widest leading-none">PICK</span>
        </div>
      )}
    </button>
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
  const readOnly = hasControl === false;
  
  // 獲取目前選定類型的數據
  const currentStatus = betStatus?.[activeBetType] || { odds1: 1, odds2: 1, team1Total: 0, team2Total: 0, myBetTeam: null, myBetAmount: 0, line: 0 };
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
    
    // 檢查是否在任何玩法中有投注 (獨贏/讓分/大小 只限一注)
    const hasAnyBet = !!(betStatus.moneyline.myBetTeam || betStatus.handicap.myBetTeam || betStatus.overUnder.myBetTeam);
    const isThisTeamSelected = currentStatus.myBetTeam === team;
    
    return (
      <button
        onClick={(e) => { e.stopPropagation(); setBettingTeam(currentStatus.myBetTeam || 1); }}
        disabled={hasAnyBet}
        className={cn(
          "flex items-center justify-center px-2 py-1 rounded-full border transition-all pointer-events-auto min-w-[40px] shadow-lg",
          hasAnyBet
            ? "bg-emerald-500 border-emerald-400 text-white"
            : "bg-black/60 border-white/20 hover:bg-black/80 hover:scale-105 text-white/90",
          hasAnyBet && !currentStatus.myBetTeam && "opacity-40 grayscale"
        )}
      >
        <span className="text-[9px] md:text-[10px] font-black drop-shadow-sm leading-none">投注</span>
      </button>
    );
  };

  const [elapsed, setElapsed] = useState<string>("00:00");

  useEffect(() => {
    if (!startTime) {
      setElapsed("00:00");
      return;
    }

    const updateTimer = () => {
      const now = new Date();
      const diff = Math.floor((now.getTime() - new Date(startTime).getTime()) / 1000);
      const minutes = Math.floor(diff / 60);
      const seconds = diff % 60;
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
          <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", isRecommended ? "bg-indigo-500 animate-pulse" : "bg-emerald-500")} />
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
                 "flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider transition-all border cursor-pointer active:scale-95",
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
              className="p-1 transition-colors text-slate-300 hover:text-indigo-500"
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
            <span className="bg-rose-500/90 text-white text-[7px] md:text-[9px] px-2 py-0.5 rounded-full font-black shadow-lg shadow-rose-500/30 animate-pulse whitespace-nowrap">FAVORITE 強勢</span>
          </div>
        )}
        {team2Score > team1Score && team1Score > 0 && (
          <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 z-[45] pointer-events-none">
            <span className="bg-blue-500/90 text-white text-[7px] md:text-[9px] px-2 py-0.5 rounded-full font-black shadow-lg shadow-blue-500/30 animate-pulse whitespace-nowrap">FAVORITE 強勢</span>
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
            <div className="bg-emerald-950/90 backdrop-blur-md px-2 md:px-3 py-0.5 md:py-1 rounded-full border border-white/30 shadow-2xl flex flex-col items-center justify-center">
              {matchId && !isRecommended && actionText === "結束" ? (
                betStatus ? (
                  <>
                    <span className="text-[5px] font-black text-sky-400 uppercase leading-none mb-0.5 tracking-tighter">
                      {activeBetType === "moneyline" ? "獨贏" : activeBetType === "handicap" ? "讓分" : "總分"} POOL
                    </span>
                    <span className="text-[8px] font-black text-white leading-none">{(currentStatus.team1Total || 0) + (currentStatus.team2Total || 0)}</span>
                  </>
                ) : (
                  <span className="text-[8px] font-black text-white/50 animate-pulse">載入中...</span>
                )
              ) : (
                <div className="flex flex-col items-center">
                   <span className="text-[9px] md:text-[10px] font-black text-emerald-400 italic uppercase tracking-widest">VS</span>
                   {team1Score > 0 && team2Score > 0 && (
                     <span className="text-[6px] text-white/40 font-bold whitespace-nowrap">
                       WIN %: {Math.round((0.5 + (Math.abs(team1Score - team2Score) / 100) * 0.4) * 100)}%
                     </span>
                   )}
                </div>
              )}
            </div>
            {renderBetButton(1)}
            <div className="absolute inset-0 bg-emerald-400/25 blur-xl rounded-full -z-10 animate-pulse"></div>
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
          <div className="absolute inset-0 z-[60] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-3 animate-in fade-in zoom-in duration-200">
            {/* Bet Type Tabs */}
            <div className="flex bg-white/5 p-1 rounded-xl gap-1 mb-4 w-full max-w-[240px]">
              {(["moneyline", "handicap", "overUnder"] as const).map((type) => {
                const labelMap = { moneyline: "獨贏", handicap: "讓分", overUnder: "大小" };
                const isLocked = betStatus?.[type]?.locked;
                return (
                  <button
                    key={type}
                    onClick={() => !isLocked && setActiveBetType(type)}
                    disabled={isLocked}
                    className={cn(
                      "flex-1 py-2 rounded-lg text-xs font-black transition-all flex flex-col items-center justify-center",
                      activeBetType === type 
                        ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30" 
                        : isLocked
                          ? "text-white/10 cursor-not-allowed bg-transparent"
                          : "text-white/40 hover:text-white/70 hover:bg-white/5"
                    )}
                  >
                    <span>{labelMap[type]}</span>
                    {isLocked && <span className="text-[7px] opacity-50 font-normal">未開盤</span>}
                  </button>
                );
              })}
            </div>

            {/* Choice Selector (Player Names or Over/Under) */}
            <div className="flex w-full max-w-[240px] gap-2 mb-4">
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
              <div className="text-emerald-400 font-black text-[9px] uppercase tracking-tighter opacity-80">
                投注金額
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-2 w-full max-w-[160px] mb-4">
              {BET_AMOUNTS.map(amount => {
                const isLocked = (currentStatus as any).locked;
                return (
                  <button
                    key={amount}
                    onClick={() => {
                      if (!isLocked && matchId) onBet?.(matchId, bettingTeam, amount, activeBetType, currentStatus.line);
                      setBettingTeam(null);
                    }}
                    disabled={isLocked}
                    className={cn(
                      "border border-white/10 py-2 rounded-xl text-white font-black text-xs transition-all active:scale-95",
                      isLocked 
                        ? "bg-white/5 text-white/10 cursor-not-allowed" 
                        : "bg-white/10 hover:bg-emerald-500 hover:text-white"
                    )}
                  >
                    {amount}
                  </button>
                );
              })}
            </div>
            
            <button 
              onClick={() => setBettingTeam(null)} 
              className="text-white/40 text-[9px] font-bold hover:text-white uppercase tracking-widest"
            >
              取消返回
            </button>
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
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/5 backdrop-blur-[1px]">
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
              className="px-2 py-2 font-black text-[10px] uppercase tracking-widest text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900 hover:bg-black dark:hover:bg-white hover:text-white dark:hover:text-black hover:border-black dark:hover:border-white rounded-xl transition-all active:scale-95 bg-indigo-50/30 dark:bg-indigo-950/30 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed"
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
                  className="px-4 py-2 font-black text-[11px] uppercase tracking-[0.1em] rounded-xl transition-all shadow-sm active:scale-95 disabled:opacity-20 flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 w-full"
                >
                  取消
                </button>
              )}

              <button
                onClick={onAction}
                disabled={isLoading || isActionDisabled || !!isPrimaryActionLocked || !!bettingTeam}
                className={cn(
                  "px-4 py-2 font-black text-[11px] uppercase tracking-[0.2em] rounded-xl transition-all shadow-sm active:scale-95 disabled:opacity-20 flex items-center justify-center gap-2",
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
