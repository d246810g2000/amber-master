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
}) => {
  const isTeamRed = teamColor === "red";
  const isTeamBlue = teamColor === "blue";

  return (
    <div className="relative group">
      {status === "ready" && onStatusToggle && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onStatusToggle();
          }}
          className="absolute -top-1.5 -left-1.5 z-20 p-1.5 bg-slate-100 text-slate-500 rounded-full border border-slate-200 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all hover:bg-slate-200 hover:text-slate-800 shadow-sm"
          title="回休息區"
        >
          <Moon size={10} fill="currentColor" />
        </button>
      )}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          onProfileClick();
        }}
        disabled={status === "playing" || status === "finishing"}
        className={cn(
          "flex flex-col items-center justify-center p-2 rounded-2xl border-2 transition-all duration-300 shadow-sm w-[68px] h-[80px] md:w-20 md:h-24 relative overflow-hidden",
          status === "playing"
            ? "bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed opacity-80"
            : status === "ready"
              ? isSelected
                ? isGolden
                  ? "bg-amber-50 text-amber-700 border-amber-400 shadow-xl shadow-amber-200 -translate-y-2 ring-4 ring-amber-400/30 scale-105"
                  : isTeamRed
                    ? "bg-rose-50 text-rose-700 border-rose-500 shadow-lg shadow-rose-200 -translate-y-1 ring-4 ring-rose-500/20"
                    : isTeamBlue
                      ? "bg-blue-50 text-blue-700 border-blue-500 shadow-lg shadow-blue-200 -translate-y-1 ring-4 ring-blue-500/20"
                      : "bg-emerald-50 text-emerald-700 border-emerald-500 shadow-lg shadow-emerald-200 -translate-y-1 ring-4 ring-emerald-500/20"
                : isFatigued
                  ? "bg-slate-50 text-slate-500 border-slate-200 shadow-none opacity-60 grayscale-[0.5]"
                  : "bg-white text-emerald-700 border-emerald-500 shadow-emerald-100 hover:shadow-lg hover:-translate-y-1 animate-pulse-subtle"
              : status === "finishing"
                ? "bg-amber-50 text-amber-700 border-amber-400 animate-bounce-stat shadow-xl shadow-amber-100"
                : isFatigued
                  ? "bg-slate-100/50 text-slate-400 border-slate-200 opacity-60 grayscale"
                  : "bg-white/80 text-slate-600 border-white/50 hover:border-slate-300 hover:bg-white hover:shadow-md hover:-translate-y-0.5",
        )}
      >
        {isGolden && isSelected && (
          <div className="absolute -top-2 -right-1 bg-amber-400 text-white p-1 rounded-full shadow-lg animate-bounce-slow">
            <span className="text-[10px] leading-none">👑</span>
          </div>
        )}
        {isFatigued && status !== "playing" && (
          <div className="absolute top-1 left-1.5 flex items-center gap-0.5">
            <span className="text-[10px] grayscale-0">☕</span>
          </div>
        )}
        {status === "finishing" && (
          <div className="absolute inset-0 bg-amber-400/10 flex items-center justify-center pointer-events-none rounded-[calc(1rem-2px)]">
            <div className="bg-white/95 backdrop-blur-sm border border-amber-200 px-1.5 py-0.5 rounded shadow-sm rotate-3 scale-110">
              <span className="text-[9px] font-black text-amber-600 uppercase tracking-tighter flex items-center gap-1">
                <span className="animate-spin flex"><RefreshCw size={8} /></span>
                Updating
              </span>
            </div>
          </div>
        )}
        {status === "playing" && (
          <div className="absolute inset-0 bg-slate-900/10 flex items-center justify-center pointer-events-none rounded-[calc(1rem-2px)]">
            <div className="bg-white/90 backdrop-blur-sm border border-slate-200 px-1.5 py-0.5 rounded shadow-sm rotate-[-12deg]">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-tighter">
                On Court
              </span>
            </div>
          </div>
        )}
        <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-slate-100 flex items-center justify-center mb-1 overflow-hidden">
          <img
            src={getAvatarUrl(player.avatar, player.name)}
            alt={player.name}
            className="w-full h-full object-cover"
          />
        </div>
        <span className="text-[10px] md:text-[11px] font-black truncate w-full text-center leading-tight">
          {player.name}
        </span>
        <div className="flex items-center gap-0.5 mt-0.5">
          <span className="text-[8px] font-bold opacity-60">
            {player.matchCount || 0}場
          </span>
          <span className="text-[8px] font-black text-slate-300">|</span>
          <span className="text-[8px] font-bold text-emerald-600/70">
            {Math.round((player.mu || 25) * 10)}
          </span>
        </div>
      </button>
    </div>
  );
});
