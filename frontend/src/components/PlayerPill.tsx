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
import { RestStreakCornerBadge } from "./RestStreakCornerBadge";

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

  const isFlowingFrame = ["傳奇黃金", "極光幻彩", "鑽石星辰"].includes(activeFrame || "");
  const isFallingFeathers = activeBackground === "飄零羽落";

  const frameClass = activeFrame === "初學者青銅" 
    ? "border-amber-700/50 shadow-[0_0_10px_rgba(180,83,9,0.2)]" 
    : activeFrame === "熱血火紅"
    ? "border-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.3)] animate-pulse-subtle"
    : activeFrame === "純白羽框"
    ? "border-white dark:border-white/80 shadow-[0_0_15px_rgba(255,255,255,0.4)] ring-1 ring-white/20"
    : activeFrame === "暗影雷鳴"
    ? "border-purple-600 shadow-[0_0_12px_rgba(147,51,234,0.4)]"
    : activeFrame === "翡翠之心"
    ? "border-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.4)]"
    : isFlowingFrame
    ? "border-transparent shadow-none"
    : null;

  // 定義流光特效的顏色
  const flowingGradient = activeFrame === "傳奇黃金"
    ? "conic-gradient(from 0deg, transparent 0deg, #fbbf24 90deg, transparent 180deg, #fbbf24 270deg, transparent 360deg)"
    : activeFrame === "極光幻彩"
    ? "conic-gradient(from 0deg, #ff0000, #ff00ff, #0000ff, #00ffff, #00ff00, #ffff00, #ff0000)"
    : activeFrame === "鑽石星辰"
    ? "conic-gradient(from 0deg, #fff 0deg, #e2e8f0 45deg, transparent 90deg, #fff 135deg, #f8fafc 180deg, transparent 225deg, #fff 270deg, #e2e8f0 315deg, #fff 360deg)"
    : "";

  return (
    <div className={cn(
      "relative group transition-all duration-300",
      isSelected && "-translate-y-2 scale-105"
    )}>

      {/* Pure White Frame Corner Feather */}
      {activeFrame === "純白羽框" && (
        <Feather size={12} className="absolute -top-1 -right-1 text-white rotate-45 drop-shadow-[0_0_5px_rgba(255,255,255,0.8)] z-[70]" />
      )}

      {/* Diamond Stardust Sparkles */}
      {activeFrame === "鑽石星辰" && (
        <div className="absolute inset-0 z-[60] pointer-events-none">
          <Sparkles size={12} className="absolute -top-1 -left-1 text-white animate-pulse" />
          <Sparkles size={10} className="absolute -bottom-1 -right-1 text-blue-200 animate-pulse [animation-delay:1s]" />
          <Sparkles size={8} className="absolute top-1/2 -right-2 text-white animate-bounce-slow" />
        </div>
      )}

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
                const titleText = activeTitle.toLowerCase();
                const isLegendary = titleText.includes('傳說') || titleText.includes('守護') || titleText.includes('殺手') || titleText.includes('鬼') || titleText.includes('裁判');
                const isEpic = titleText.includes('機器') || titleText.includes('大師') || titleText.includes('100');
                
                const theme = isLegendary 
                  ? "bg-amber-400 text-amber-950 border-amber-200 shadow-[0_2px_10px_rgba(245,158,11,0.2)]"
                  : isEpic
                  ? "bg-indigo-500 text-white border-indigo-300 shadow-[0_2px_8px_rgba(99,102,241,0.2)]"
                  : "bg-slate-700/90 text-slate-100 border-slate-500/50 shadow-sm";

                return (
                  <>
                    <div className={cn(
                      "absolute inset-0 rounded-full border shadow-sm backdrop-blur-md overflow-hidden transition-all duration-500",
                      theme
                    )}>
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-shimmer opacity-40" />
                    </div>
                    <span className="relative text-[7.5px] md:text-[8.5px] font-black uppercase tracking-[0.1em] whitespace-nowrap leading-none flex items-center gap-1">
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
          "flex flex-col items-center justify-center p-2 rounded-2xl border-2 transition-all duration-300 shadow-sm w-[68px] h-[80px] md:w-20 md:h-24 relative overflow-hidden",
          
          /* 基礎背景與文字顏色 */
          status === "playing" 
            ? "bg-slate-50 dark:bg-slate-900 text-slate-400 border-slate-200"
            : status === "ready"
              ? isSelected 
                ? "bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white" 
                : "bg-white dark:bg-slate-900 text-slate-800"
              : "bg-white/80 dark:bg-slate-800/80 text-slate-600",
          
          /* 造型邊框類別 */
          frameClass,
          isFlowingFrame && "border-transparent shadow-none"
        )}
      >
        {/* [新結構] 流光背景層：放在 Button 內部最底層 */}
        {isFlowingFrame && (
          <div className="absolute inset-0 z-0">
            <div 
              className="absolute top-1/2 left-1/2 w-[250%] h-[250%] -translate-x-1/2 -translate-y-1/2 animate-spin-slow"
              style={{ background: flowingGradient }}
            />
          </div>
        )}

        {/* [新結構] 內容遮罩層：確保文字跟頭像不會被流光蓋掉 */}
        {isFlowingFrame && (
          <div className={cn(
            "absolute inset-[2px] rounded-[14px] z-[5]",
            status === "ready" ? "bg-white dark:bg-slate-900" : "bg-slate-50 dark:bg-slate-800"
          )} />
        )}

        {/* [新結構] 背景特效層：與邊框分離 */}
        {activeBackground && (
          <div className="absolute inset-0 z-[10] overflow-hidden pointer-events-none">
            {/* 飄零羽落 */}
            {activeBackground === "飄零羽落" && (
              <>
                <div className="absolute inset-0 bg-gradient-to-br from-sky-50/40 to-indigo-50/20 dark:from-sky-900/10 dark:to-indigo-900/10" />
                <div className="absolute inset-0 pointer-events-none">
                  <Feather size={14} className="absolute top-0 left-1/4 text-sky-500/60 animate-feather-fall" />
                  <Feather size={12} className="absolute top-0 left-2/3 text-indigo-400/50 animate-feather-fall [animation-delay:1.5s]" />
                  <Feather size={16} className="absolute top-0 left-1/2 text-amber-300/40 animate-feather-fall [animation-delay:0.8s]" />
                </div>
              </>
            )}

            {/* 落櫻繽紛 */}
            {activeBackground === "落櫻繽紛" && (
              <>
                <div className="absolute inset-0 bg-gradient-to-br from-rose-50/40 to-pink-50/20 dark:from-rose-900/10 dark:to-pink-900/10" />
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute top-0 left-[20%] text-rose-300/60 animate-feather-fall text-xs">🌸</div>
                  <div className="absolute top-0 left-[60%] text-pink-300/50 animate-feather-fall [animation-delay:2s] text-[10px]">🌸</div>
                  <div className="absolute top-0 left-[80%] text-rose-200/40 animate-feather-fall [animation-delay:1s] text-xs">🌸</div>
                </div>
              </>
            )}

            {/* 螢火之森 */}
            {activeBackground === "螢火之森" && (
              <>
                <div className="absolute inset-0 bg-gradient-to-t from-emerald-500/10 to-transparent dark:from-emerald-900/10" />
                <div className="absolute inset-0 pointer-events-none">
                  {[...Array(6)].map((_, i) => (
                    <div 
                      key={i}
                      className="absolute bottom-0 w-1 h-1 bg-emerald-400 rounded-full blur-[1px] animate-float-up"
                      style={{ 
                        left: `${Math.random() * 80 + 10}%`, 
                        animationDelay: `${Math.random() * 5}s`,
                        opacity: Math.random() * 0.5 + 0.3
                      }}
                    />
                  ))}
                </div>
              </>
            )}

            {/* 雷霆萬鈞 */}
            {activeBackground === "雷霆萬鈞" && (
              <>
                <div className="absolute inset-0 bg-slate-900/5 dark:bg-slate-950/20" />
                <div className="absolute inset-0 bg-purple-500/20 animate-lightning" />
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                  <div className="absolute top-[-10%] left-[30%] w-[1px] h-[120%] bg-purple-400/30 rotate-[20deg] blur-[2px] animate-pulse" />
                  <div className="absolute top-[-10%] left-[70%] w-[1px] h-[120%] bg-indigo-400/30 rotate-[-15deg] blur-[2px] animate-pulse [animation-delay:1.5s]" />
                </div>
              </>
            )}

            {/* 星河燦爛 */}
            {activeBackground === "星河燦爛" && (
              <>
                <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 animate-nebula opacity-80" />
                <div className="absolute inset-0 pointer-events-none">
                  {[...Array(8)].map((_, i) => (
                    <div 
                      key={i}
                      className="absolute w-[2px] h-[2px] bg-white rounded-full animate-pulse"
                      style={{ 
                        top: `${Math.random() * 100}%`, 
                        left: `${Math.random() * 100}%`, 
                        animationDelay: `${Math.random() * 3}s`,
                        animationDuration: `${Math.random() * 2 + 1}s`
                      }}
                    />
                  ))}
                </div>
              </>
            )}

            {/* 溫暖夕陽 */}
            {activeBackground === "溫暖夕陽" && (
              <div className="absolute inset-0 bg-gradient-to-br from-orange-400/30 via-rose-400/20 to-amber-500/10" />
            )}

            {/* 薄荷涼感 */}
            {activeBackground === "薄荷涼感" && (
              <div className="absolute inset-0 bg-gradient-to-br from-teal-400/20 via-emerald-300/10 to-cyan-400/20" />
            )}

            {/* 夢幻粉紫 */}
            {activeBackground === "夢幻粉紫" && (
              <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-500/20 via-purple-400/10 to-pink-500/20" />
            )}

            {/* 迷霧灰藍 */}
            {activeBackground === "迷霧灰藍" && (
              <div className="absolute inset-0 bg-gradient-to-br from-slate-700/40 via-blue-900/20 to-slate-800/40" />
            )}

            {/* 極致純黑 */}
            {activeBackground === "極致純黑" && (
              <div className="absolute inset-0 bg-slate-950 shadow-inner" />
            )}
          </div>
        )}
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
            "absolute inset-0 flex items-center justify-center pointer-events-none rounded-[calc(1rem-2px)]",
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
        <div className={cn(
          "mb-1 h-8 w-8 md:h-10 md:w-10 shrink-0 overflow-hidden rounded-full border-2 transition-all duration-300 z-20",
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
      </button>
    </div>
  );
});
