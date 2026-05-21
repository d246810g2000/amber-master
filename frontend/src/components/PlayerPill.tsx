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

  const isFlowingFrame = ["頂尖菁英流光框", "萬象星空邊框"].includes(activeFrame || "");
  const isFallingFeathers = activeBackground === "終極：飄零羽落";

  const frameBorderClass = activeFrame === "倔強鐵牌木框" ? "border-slate-500 shadow-[0_0_10px_rgba(100,116,139,0.3)]"
    : activeFrame === "不屈青銅邊框" ? "border-amber-800 shadow-[0_0_10px_rgba(146,64,14,0.4)]"
    : activeFrame === "傲氣白銀邊框" ? "border-slate-300 shadow-[0_0_12px_rgba(203,213,225,0.6)]"
    : activeFrame === "榮耀黃金邊框" ? "border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.6)]"
    : activeFrame === "華麗白金邊框" ? "border-teal-300 shadow-[0_0_15px_rgba(94,234,212,0.6)]"
    : activeFrame === "璀璨翡翠邊框" ? "border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.6)]"
    : activeFrame === "璀璨鑽石邊框" ? "border-blue-400 shadow-[0_0_15px_rgba(96,165,250,0.8)]"
    : activeFrame === "大師紫羅蘭框" ? "border-purple-500 shadow-[0_0_18px_rgba(168,85,247,0.8)]"
    : activeFrame === "宗師傲紅邊框" ? "border-rose-600 shadow-[0_0_20px_rgba(225,29,72,0.8)]"
    : activeFrame === "聖白羽翼邊框" ? "border-white dark:border-white/80 shadow-[0_0_15px_rgba(255,255,255,0.8)] ring-1 ring-white/20"
    : isFlowingFrame ? "border-transparent shadow-none"
    : null;

  // 定義流光特效的顏色
  const flowingGradient = activeFrame === "頂尖菁英流光框"
    ? "conic-gradient(from 0deg, #fbbf24, #d946ef, #8b5cf6, #fbbf24)"
    : activeFrame === "萬象星空邊框"
    ? "conic-gradient(from 0deg, #ff0000, #ff00ff, #0000ff, #00ffff, #00ff00, #ffff00, #ff0000)"
    : "";

  return (
    <div className={cn(
      "relative group transition-all duration-300",
      isSelected && "-translate-y-2 scale-105"
    )}>

      {/* Pure White Frame Corner Feather */}
      {activeFrame === "聖白羽翼邊框" && (
        <Feather size={12} className="absolute -top-1 -right-1 text-white rotate-45 drop-shadow-[0_0_5px_rgba(255,255,255,0.8)] z-[70]" />
      )}

      {/* Diamond Stardust Sparkles */}
      {activeFrame === "璀璨鑽石邊框" && (
        <div className="absolute inset-0 z-[60] pointer-events-none">
          <Sparkles size={12} className="absolute -top-1 -left-1 text-blue-300 animate-pulse" />
          <Sparkles size={10} className="absolute -bottom-1 -right-1 text-cyan-200 animate-pulse [animation-delay:1s]" />
          <Sparkles size={8} className="absolute top-1/2 -right-2 text-blue-100 animate-bounce-slow" />
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
                const isUltimate = titleText.includes('跪求') || titleText.includes('戴資穎') || titleText.includes('殺氣');
                const isLegendary = titleText.includes('裁判') || titleText.includes('鬼');
                const isEpic = titleText.includes('姿勢') || titleText.includes('線上') || titleText.includes('殺手');
                
                const theme = isUltimate
                  ? "bg-gradient-to-r from-violet-600 via-fuchsia-500 to-amber-500 text-white border-amber-300 shadow-[0_0_15px_rgba(217,70,239,0.5)] font-black"
                  : isLegendary 
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
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full animate-shimmer opacity-60" />
                    </div>
                    <span className="relative text-[7.5px] md:text-[8.5px] font-black uppercase tracking-[0.1em] whitespace-nowrap leading-none flex items-center gap-1 drop-shadow-md">
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
          <div className={cn(
            "absolute z-[10] overflow-hidden pointer-events-none",
            isFlowingFrame ? "inset-[2px] rounded-[14px]" : "inset-0"
          )}>
            
            {/* 鐵牌：霧霾灰階 */}
            {activeBackground === "鐵牌：霧霾灰階" && (
              <div className="absolute inset-0 bg-slate-700/30 backdrop-blur-[1px]" />
            )}

            {/* 銅牌：大地岩落 */}
            {activeBackground === "銅牌：大地岩落" && (
              <div className="absolute inset-0 bg-amber-900/20 backdrop-blur-[1px]" />
            )}

            {/* 白銀：微光銀河 */}
            {activeBackground === "白銀：微光銀河" && (
              <div className="absolute inset-0 bg-slate-400/20 backdrop-blur-[1px]" />
            )}

            {/* 黃金：金光閃耀 */}
            {activeBackground === "黃金：金光閃耀" && (
              <div className="absolute inset-0 bg-gradient-to-t from-amber-400/20 to-transparent" />
            )}

            {/* 白金：海克斯科技 */}
            {activeBackground === "白金：海克斯科技" && (
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 to-blue-500/10" />
            )}

            {/* 翡翠：螢火之森 */}
            {activeBackground === "翡翠：螢火之森" && (
              <>
                <div className="absolute inset-0 bg-gradient-to-t from-emerald-500/20 to-transparent dark:from-emerald-900/20" />
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

            {/* 鑽石：星辰風暴 */}
            {activeBackground === "鑽石：星辰風暴" && (
              <div className="absolute inset-0 bg-gradient-to-br from-blue-400/30 to-indigo-500/20 hover:from-blue-300/50 hover:to-cyan-400/40 transition-colors duration-500" />
            )}

            {/* 大師：虛空星河 */}
            {activeBackground === "大師：虛空星河" && (
              <>
                <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-900 animate-nebula opacity-80" />
                <div className="absolute inset-0 bg-purple-600/10 rounded-[50%] blur-[20px] scale-150 animate-pulse" />
              </>
            )}

            {/* 宗師：雷霆萬鈞 */}
            {activeBackground === "宗師：雷霆萬鈞" && (
              <>
                <div className="absolute inset-0 bg-slate-900/10 dark:bg-slate-950/20" />
                <div className="absolute inset-0 bg-rose-500/20 animate-lightning" />
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                  <div className="absolute top-[-10%] left-[30%] w-[1px] h-[120%] bg-red-400/40 rotate-[20deg] blur-[2px] animate-pulse" />
                  <div className="absolute top-[-10%] left-[70%] w-[1px] h-[120%] bg-rose-400/40 rotate-[-15deg] blur-[2px] animate-pulse [animation-delay:1.5s]" />
                </div>
              </>
            )}

            {/* 菁英：傲世神巔 */}
            {activeBackground === "菁英：傲世神巔" && (
              <div className="absolute inset-0 bg-gradient-to-br from-amber-400/30 via-purple-500/20 to-blue-500/30 animate-pulse" />
            )}

            {/* 終極：起源矩陣 */}
            {activeBackground === "終極：起源矩陣" && (
              <div className="absolute inset-0 bg-gradient-to-b from-purple-900/40 to-black/80 flex items-end justify-center overflow-hidden">
                 <div className="text-[6px] text-fuchsia-400/30 font-mono text-center tracking-widest break-all">
                    01010011 01011001 01010011 01010100 01000101 01001101
                 </div>
              </div>
            )}

            {/* 終極：飄零羽落 */}
            {activeBackground === "終極：飄零羽落" && (
              <>
                <div className="absolute inset-0 bg-gradient-to-br from-sky-50/40 to-indigo-50/20 dark:from-sky-900/10 dark:to-indigo-900/10" />
                <div className="absolute inset-0 pointer-events-none">
                  <Feather size={14} className="absolute top-0 left-1/4 text-sky-500/60 animate-feather-fall" />
                  <Feather size={12} className="absolute top-0 left-2/3 text-indigo-400/50 animate-feather-fall [animation-delay:1.5s]" />
                  <Feather size={16} className="absolute top-0 left-1/2 text-amber-300/40 animate-feather-fall [animation-delay:0.8s]" />
                </div>
              </>
            )}
          </div>
        )}

        {/* 邊框覆蓋層 (Frame Overlay) - 保證在背景之上 */}
        <div className={cn(
          "absolute inset-0 z-[30] rounded-2xl pointer-events-none border-2",
          frameBorderClass || "border-transparent"
        )} />
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
