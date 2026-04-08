import React from "react";
import { Player } from "../types";
import { cn, getAvatarUrl } from "../lib/utils";
import Moon from "lucide-react/dist/esm/icons/moon";
import RefreshCw from "lucide-react/dist/esm/icons/refresh-cw";

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
}) => {
  const isTeamRed = teamColor === "red";
  const isTeamBlue = teamColor === "blue";

  return (
    <div className="relative group">
      {status === "ready" && onStatusToggle && (
        <button
          onClick={(e) => {
            if (!hasControl) return;
            e.stopPropagation();
            onStatusToggle();
          }}
          disabled={!hasControl}
          className={cn(
            "absolute -top-1.5 -left-1.5 z-20 p-1.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-full border border-slate-200 dark:border-slate-700 transition-all shadow-sm",
            hasControl ? "opacity-100 md:opacity-0 md:group-hover:opacity-100 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-800 dark:hover:text-slate-200" : "opacity-0 pointer-events-none"
          )}
          title="回休息區"
        >
          <Moon size={10} fill="currentColor" />
        </button>
      )}
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
          (status === "playing" || !hasControl)
            ? "bg-slate-50 dark:bg-slate-900 text-slate-400 dark:text-slate-600 border-slate-200 dark:border-slate-800 cursor-not-allowed opacity-80"
            : status === "ready"
              ? isSelected
                ? isGolden
                  ? "bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border-amber-400 shadow-xl shadow-amber-200 dark:shadow-none -translate-y-2 ring-4 ring-amber-400/30 scale-105"
                  : isTeamRed
                    ? "bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-400 border-rose-500 shadow-lg shadow-rose-200 dark:shadow-none -translate-y-1 ring-4 ring-rose-500/20"
                    : isTeamBlue
                      ? "bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-400 border-blue-500 shadow-lg shadow-blue-200 dark:shadow-none -translate-y-1 ring-4 ring-blue-500/20"
                      : "bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border-emerald-500 shadow-lg shadow-emerald-200 dark:shadow-none -translate-y-1 ring-4 ring-emerald-500/20"
                : isFatigued
                  ? "bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-600 border-slate-200 dark:border-slate-800 shadow-none opacity-60 grayscale-[0.5]"
                  : "bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 border-emerald-500 shadow-emerald-100 dark:shadow-none hover:shadow-lg hover:-translate-y-1 animate-pulse-subtle"
              : status === "finishing"
                ? "bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border-amber-400 animate-bounce-stat shadow-xl shadow-amber-100 dark:shadow-none"
                : isFatigued
                  ? "bg-slate-100/50 dark:bg-slate-800/50 text-slate-400 dark:text-slate-600 border-slate-200 dark:border-slate-800 opacity-60 grayscale"
                  : "bg-white/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 border-white/50 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-500 hover:bg-white dark:hover:bg-slate-800 hover:shadow-md hover:-translate-y-0.5",
        )}
      >
        {isGolden && isSelected && (
          <div className="absolute -top-2 -right-1 bg-amber-400 text-white p-1 rounded-full shadow-lg animate-bounce-slow">
            <span className="text-[10px] leading-none">👑</span>
          </div>
        )}
        {isFatigued && status !== "playing" && (
          <div className={cn(
            "absolute top-1 flex items-center gap-0.5 transition-all",
            (isGolden && isSelected) ? "right-5" : "right-1.5"
          )}>
            <span className="text-[10px] grayscale-0">☕</span>
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
          <div className="absolute inset-0 bg-slate-900/10 dark:bg-slate-950/40 flex items-center justify-center pointer-events-none rounded-[calc(1rem-2px)]">
            <div className="bg-white/90 dark:bg-slate-800/95 backdrop-blur-sm border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 rounded shadow-sm rotate-[-12deg]">
              <span className="text-[10px] font-black text-slate-700 dark:text-slate-100 uppercase tracking-tighter">
                {courtName ? `${courtName} 場` : "On Court"}
              </span>
            </div>
          </div>
        )}
        <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mb-1 overflow-hidden">
          <img
            src={getAvatarUrl(player.avatar, player.name)}
            alt={player.name}
            className="w-full h-full object-cover"
          />
        </div>
        <span className="text-[10px] md:text-[11px] font-black truncate w-full text-center leading-tight dark:text-slate-200">
          {player.name}
        </span>
        <div className="flex items-center gap-0.5 mt-0.5">
          <span className="text-[8px] font-bold opacity-60 dark:text-slate-400">
            {player.matchCount || 0}場
          </span>
          <span className="text-[8px] font-black text-slate-300 dark:text-slate-700">|</span>
          <span className="text-[8px] font-bold text-emerald-600/70 dark:text-emerald-400/70">
            {Math.round((player.mu || 25) * 10)}
          </span>
        </div>
      </button>
    </div>
  );
});
