import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Player } from "../types";
import { cn, getAvatarUrl } from "../lib/utils";
import { 
  Moon, 
  Check, 
  RefreshCw, 
  Star, 
  Feather, 
  Sparkles 
} from "lucide-react";
import { 
  isFlowingFrame, 
  getFlowingGradient, 
  renderFrameOverlay, 
  renderBackgroundEffects,
  getTitleStyle
} from "../lib/itemEffects";
import { RestStreakCornerBadge } from "./RestStreakCornerBadge";
import { PetRenderer } from "./PetRenderer";

interface PlayerPillProps {
  player: Player;
  onClick: () => void;
  onProfileClick: () => void;
  onStatusToggle?: () => void;
  status: "ready" | "resting" | "playing" | "finishing";
  isSelected?: boolean;
  teamColor?: "red" | "blue";
  isFatigued?: boolean;
  isGolden?: boolean;
  hasControl?: boolean;
  courtName?: string;
  /** 當日對戰由新到舊，連續幾場沒上場（僅備戰區 ready／finishing 顯示）；`null` 表示當日尚未上場，角標顯示「無」 */
  consecutiveMissed?: number | null;
}

export const PlayerPill: React.FC<PlayerPillProps> = React.memo(({
  player,
  onClick,
  onProfileClick,
  onStatusToggle,
  status,
  isSelected,
  teamColor,
  isFatigued,
  isGolden,
  hasControl = true,
  courtName,
  consecutiveMissed,
}) => {
  const cornerMissed: number | null =
    consecutiveMissed === undefined ? 0 : consecutiveMissed;
  const showRestCornerBadge =
    cornerMissed === null || cornerMissed >= 0;
  const isTeamRed = teamColor === "red";
  const isTeamBlue = teamColor === "blue";
  const activeTitle = player.active_title?.name;
  const activeFrame = player.active_frame?.name;
  const activeBackground = player.active_background?.name;

  const isFlowing = isFlowingFrame(activeFrame);
  const isFallingFeathers = activeBackground === "終極：飄零羽落";
  const flowingGradient = getFlowingGradient(activeFrame);

  return (
    <div className={cn(
      "relative group transition-all duration-300",
      isSelected && "-translate-y-2 scale-105"
    )}>

      {status === "ready" && onStatusToggle && !(isSelected && (isTeamRed || isTeamBlue)) && (
        <button
          onClick={(e) => {
            if (!hasControl) return;
            e.stopPropagation();
            onStatusToggle();
          }}
          disabled={!hasControl}
          className={cn(
            "absolute -top-1.5 -left-1.5 z-[40] p-1.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-full border border-slate-200 dark:border-slate-700 transition-all shadow-sm",
            hasControl ? "opacity-100 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-800 dark:hover:text-slate-200" : "opacity-0 pointer-events-none"
          )}
          title="回休息區"
        >
          <Moon size={10} fill="currentColor" />
        </button>
      )}

      <AnimatePresence>
        {activeTitle && (
          <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 z-[50] flex flex-col items-center pointer-events-none">
            <motion.div 
              initial={{ y: 2, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 2, opacity: 0 }}
              className="relative px-2 py-0.5"
            >
              {(() => {
                const titleStyle = getTitleStyle(activeTitle);
                return (
                  <>
                    <div className={cn(
                      "absolute inset-0 rounded-full border shadow-sm backdrop-blur-md overflow-hidden transition-all duration-500",
                      titleStyle.bg
                    )}>
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full animate-shimmer opacity-60" />
                    </div>
                    <span className={cn(
                      "relative text-[7.5px] md:text-[8.5px] font-black uppercase tracking-[0.1em] whitespace-nowrap leading-none flex items-center gap-1 drop-shadow-md",
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

      <button
        onClick={(e) => {
          if (!hasControl) return;
          e.stopPropagation();
          onClick();
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          onProfileClick();
        }}
        disabled={status === "playing" || status === "finishing" || !hasControl}
        className={cn(
          "flex flex-col items-center justify-center py-1.5 px-1 rounded-2xl border-2 border-transparent transition-all duration-300 w-[68px] h-[88px] md:p-2 md:w-20 md:h-[102px] relative overflow-hidden",
          
          /* 基礎背景與文字顏色 */
          status === "playing" 
            ? "bg-slate-50 dark:bg-slate-900 text-slate-400"
            : status === "ready"
              ? isSelected 
                ? "bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white" 
                : "bg-white dark:bg-slate-900 text-slate-800"
              : "bg-white/80 dark:bg-slate-800/80 text-slate-600"
        )}
      >
        {/* [新結構] 流光背景層：放在 Button 內部最底層 */}
        {isFlowing && (
          <div className="absolute inset-0 z-0">
            <div 
              className="absolute top-1/2 left-1/2 w-[250%] h-[250%] -translate-x-1/2 -translate-y-1/2 animate-spin-slow"
              style={{ background: flowingGradient }}
            />
          </div>
        )}

        {/* [新結構] 內容遮罩層：確保文字跟頭像不會被流光蓋掉 */}
        {isFlowing && (
          <div className={cn(
            "absolute inset-[2px] rounded-[14px] z-[5]",
            status === "ready" ? "bg-white dark:bg-slate-900" : "bg-slate-50 dark:bg-slate-800"
          )} />
        )}

        {/* [新結構] 背景特效層 */}
        {renderBackgroundEffects(activeBackground, activeFrame, "pill")}

        {/* 邊框覆蓋層 */}
        {renderFrameOverlay(activeFrame, "pill")}
        {status === "finishing" && (
          <div className="absolute inset-0 bg-amber-400/10 dark:bg-amber-400/20 flex items-center justify-center pointer-events-none rounded-[calc(1rem-2px)]">
            <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm border border-amber-200 dark:border-amber-900 px-1.5 py-0.5 rounded shadow-sm rotate-3 scale-110">
              <span className="text-[9px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-tighter flex items-center gap-1">
                <span className="animate-spin flex"><RefreshCw size={8} /></span>
                Updating
              </span>
            </div>
          </div>
        )}
        {status === "playing" && (
          <div className={cn(
            "absolute inset-0 flex items-center justify-center pointer-events-none rounded-[calc(1rem-2px)] z-[50]",
            isFallingFeathers ? "bg-transparent" : "bg-slate-900/10 dark:bg-slate-950/40"
          )}>
            <div className="bg-white/90 dark:bg-slate-800/95 backdrop-blur-sm border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 rounded shadow-sm rotate-[-12deg]">
              <span className="text-[10px] font-black text-slate-700 dark:text-slate-100 uppercase tracking-tighter">
                {courtName ? `場地${courtName}` : "On Court"}
              </span>
            </div>
          </div>
        )}
        {/* Team Badge at top-left (Synced with CourtCard) */}
        {isSelected && (isTeamRed || isTeamBlue) && (
          <div className={cn(
            "absolute top-1 left-1 z-50 px-1.5 py-0.5 rounded text-[8px] font-black shadow-sm",
            isTeamRed ? "bg-rose-500 text-white" : "bg-blue-500 text-white"
          )}>
            {isTeamRed ? "T1" : "T2"}
          </div>
        )}
        {isGolden && isSelected && (
          <div
            className={cn(
              "pointer-events-none absolute top-1 z-[36] rounded-full bg-amber-400 p-0.5 text-white shadow-md ring-1 ring-amber-200/80 animate-bounce-slow dark:ring-amber-600/50",
              (status === "ready" || status === "finishing") && showRestCornerBadge
                ? "right-6 md:right-7"
                : "right-1"
            )}
          >
            <span className="block text-[9px] leading-none">👑</span>
          </div>
        )}
        {(status === "ready" || status === "finishing") && (
          <RestStreakCornerBadge count={cornerMissed} />
        )}
        {/* Avatar + Pet Container */}
        <div className={cn(
          "relative mb-1 z-20 flex items-center justify-center transition-all duration-300",
          player.active_pet_id 
            ? "w-12 h-10 md:w-[58px] md:h-12" 
            : "w-8 h-8 md:w-10 md:h-10"
        )}>
          <div className={cn(
            "shrink-0 overflow-hidden rounded-full border-2 transition-all duration-300",
            player.active_pet_id 
              ? "absolute top-0 left-0 h-6.5 w-6.5 md:h-8 md:w-8" 
              : "w-full h-full",
            isFallingFeathers 
              ? "bg-white/10 border-white/20 backdrop-blur-[1px] shadow-sm" 
              : "bg-slate-100 dark:bg-slate-700 border-white dark:border-slate-800 shadow-inner"
          )}>
            <img
              src={getAvatarUrl(player.avatar, player.name)}
              alt={player.name}
              className="h-full w-full object-cover"
            />
          </div>
          {player.active_pet_id && (
            <div className="absolute bottom-0 right-0 shrink-0 origin-bottom animate-bounce-slow flex items-center justify-center filter drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.35)] dark:drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.55)]">
              {player.active_pet_id.startsWith('egg_') ? (
                <div className="relative w-5.5 h-5.5 md:w-6.5 md:h-6.5 flex items-center justify-center">
                  <img
                    src={`/amber-master/assets/eggs/${player.active_pet_id}.png`}
                    alt="equipped egg"
                    className="w-full h-full object-contain"
                  />
                  {player.egg_progress_games !== undefined && player.egg_progress_games > 0 && player.egg_progress_games < 100 && (
                    <div className="absolute -top-1.5 -right-1.5 bg-sky-500 text-[7px] text-white font-black rounded-full px-1 min-w-[12px] h-[12px] flex items-center justify-center scale-90 transform origin-top-right shadow-sm border border-white dark:border-slate-900 leading-none">
                      {player.egg_progress_games}
                    </div>
                  )}
                </div>
              ) : (
                <PetRenderer petId={player.active_pet_id} className="w-5.5 h-5.5 md:w-6.5 md:h-6.5" />
              )}
            </div>
          )}
        </div>
        <div className="flex flex-col items-center w-full min-w-0 z-20">
          <span className={cn(
            "text-[10px] md:text-[11px] font-black truncate w-full text-center leading-tight transition-colors",
            isFallingFeathers ? "text-slate-900 dark:text-white" : "text-slate-900 dark:text-slate-200"
          )}>
            {player.name}
          </span>
        </div>
        <div className="flex items-center gap-0.5 mt-0.5 z-20">
          <span className={cn(
            "text-[8px] font-bold opacity-60 transition-colors",
            isFallingFeathers ? "text-slate-700 dark:text-slate-400" : "dark:text-slate-400"
          )}>
            {player.matchCount || 0}場
          </span>
          <span className="text-[8px] font-black text-slate-300 dark:text-slate-700">|</span>
          <span className={cn(
            "text-[8px] font-bold transition-colors",
            isFallingFeathers ? "text-emerald-600" : "text-emerald-600/70 dark:text-emerald-400/70"
          )}>
            {Math.round((player.mu || 25) * 10)}
          </span>
        </div>
        <div className="flex items-center gap-0.5 mt-0.5 z-20">
          <Feather size={8} className="text-sky-500 shrink-0" />
          <span className={cn(
            "text-[8px] font-black tabular-nums transition-colors",
            isFallingFeathers ? "text-sky-600" : "text-sky-600 dark:text-sky-400"
          )}>
            {player.feathers ?? 0}
          </span>
        </div>
      </button>
    </div>
  );
});
