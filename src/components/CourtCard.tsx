import React, { useState, useEffect } from "react";
import Loader2 from "lucide-react/dist/esm/icons/loader-2";
import Users from "lucide-react/dist/esm/icons/users";
import RotateCcw from "lucide-react/dist/esm/icons/rotate-ccw";
import { cn, getAvatarUrl } from "../lib/utils";
import { Player } from "../types";

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
  onSlotClick?: (index: number) => void;
  onReset?: () => void;
  hasControl?: boolean;
  onCancel?: () => void;
}

const PlayerSlot = React.memo(({ 
  player, 
  teamColor, 
  onClick, 
  isSelected,
  className
}: { 
  player: Player | null; 
  teamColor?: "red" | "blue";
  onClick?: () => void;
  isSelected?: boolean;
  className?: string;
}) => {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center p-0.5 md:p-1 rounded-xl transition-all duration-300 absolute overflow-hidden shadow-sm hover:z-20",
        player 
          ? "bg-white opacity-100 ring-1 ring-black/5" 
          : "bg-black/5 opacity-0 hover:opacity-10",
        isSelected && player && "ring-4 ring-amber-400 z-30 shadow-2xl scale-[1.03]",
        !isSelected && teamColor === "red" && player && "bg-rose-50/95 ring-rose-200/50",
        !isSelected && teamColor === "blue" && player && "bg-blue-50/95 ring-blue-200/50",
        "active:scale-95 group/slot",
        className
      )}
    >
      {player ? (
        <>
          <img
            src={getAvatarUrl(player.avatar, player.name)}
            alt={player.name}
            className="hidden md:block w-7 h-7 rounded-full object-cover shadow-sm bg-white mb-1 border border-slate-200/50"
          />
          <div className="font-black text-[11px] md:text-[13px] tracking-tighter text-slate-800 truncate w-full text-center px-0.5 md:px-1 leading-none mb-0.5 md:mb-1 drop-shadow-sm">
            {player.name}
          </div>
          <div className="flex items-center gap-1 px-1 md:px-1.5 py-0.5 bg-slate-50 border border-slate-100 rounded-md md:rounded-lg shadow-inner scale-[0.8] origin-top md:scale-90">
             <span className="text-[9px] font-black text-slate-500 leading-none">
               {player.matchCount || 0}場
             </span>
             <span className="text-[9px] font-black text-slate-200">|</span>
             <span className="text-[9px] font-black text-emerald-700 leading-none">
               {Math.round(player.mu * 10)}
             </span>
          </div>
        </>
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
  onSlotClick,
  selectedSlotIndex,
  onReset,
  hasControl = true,
  onCancel,
}) => {
  const team1Score = players[0] && players[1] ? Math.round((players[0].mu + players[1].mu) * 10) : 0;
  const team2Score = players[2] && players[3] ? Math.round((players[2].mu + players[3].mu) * 10) : 0;

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

  return (
    <div className="bg-white rounded-2xl overflow-hidden flex flex-col shadow-sm border border-slate-100 transition-all hover:shadow-lg w-full max-w-[340px] md:max-w-[220px] mx-auto group">
      {/* Court Header */}
      <div className="flex items-center justify-between px-3.5 py-2 bg-white border-b border-slate-50 h-[42px] shrink-0">
        <div className="flex items-center gap-1.5 overflow-hidden">
          <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", isRecommended ? "bg-indigo-500 animate-pulse" : "bg-emerald-500")} />
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest truncate">
            {isRecommended ? "Target Match" : `Court ${title.replace("場地", "")}`}
          </span>
        </div>
        {!isRecommended && (
          <div className="bg-slate-900 px-2 py-0.5 rounded shadow-sm scale-90 origin-right shrink-0">
            <span className="font-mono text-xs font-black text-white tracking-widest whitespace-nowrap">
              {elapsed}
            </span>
          </div>
        )}
        {isRecommended && onReset && (
          <button 
            onClick={(e) => {
              if (!hasControl) return;
              e.stopPropagation();
              onReset();
            }}
            className={cn(
              "p-1 transition-colors",
              hasControl ? "text-slate-300 hover:text-indigo-500" : "text-slate-200 cursor-not-allowed"
            )}
            title={hasControl ? "重置名單" : "無控制權"}
          >
            <RotateCcw size={12} strokeWidth={3} />
          </button>
        )}
      </div>

      {/* Court Floor - FULL PRECISION ALIGNMENT WITH INSET */}
      <div className="relative bg-[#4A7265] h-[220px] md:h-[300px] flex flex-col justify-between overflow-hidden shrink-0 select-none">
        
        {/* Court Markings - Absolute Relative to the 300px floor */}
        <div className="absolute inset-0 pointer-events-none z-0">
          <div className="absolute inset-x-[7.5%] inset-y-0 border-x-[1px] border-white/50"></div>
          <div className="absolute inset-x-0 top-[5.7%] h-0 border-t-[1px] border-white/50"></div>
          <div className="absolute inset-x-0 bottom-[5.7%] h-0 border-t-[1px] border-white/50"></div>
          <div className="absolute inset-x-0 top-[35.3%] h-0 border-t-[1.5px] border-white/70"></div>
          <div className="absolute inset-x-0 bottom-[35.3%] h-0 border-t-[1.5px] border-white/70"></div>
          <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-[1.5px] bg-white/50"></div>
          {/* Net Line */}
          <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 h-0 border-t-[1.5px] border-white/80 border-dashed z-0 opacity-50"></div>
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
        />
        <PlayerSlot 
          player={players[1]} 
          teamColor={isRecommended ? "red" : undefined} 
          onClick={() => onSlotClick?.(1)}
          isSelected={selectedSlotIndex === 1}
          className="right-[calc(7.5%+4px)] top-[calc(5.7%+4px)] w-[calc(42.5%-8px)] h-[calc(29.6%-8px)]"
        />

        {/* Center VS & Points */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center py-1 md:py-2 z-40 pointer-events-none w-full">
          <div className={cn("text-sm md:text-xl font-black text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] tracking-tighter leading-none mb-0.5 md:mb-1 transition-all duration-300", team1Score === 0 && "opacity-0 scale-75")}>
            {team1Score}
          </div>
          
          <div className="relative my-0.5 scale-75 md:scale-90">
            <div className="bg-emerald-950/90 backdrop-blur-md px-2 md:px-3 py-0.5 md:py-1 rounded-full border border-white/30 shadow-2xl flex items-center justify-center">
              <span className="text-[9px] md:text-[10px] font-black text-emerald-400 italic uppercase tracking-widest">VS</span>
            </div>
            <div className="absolute inset-0 bg-emerald-400/25 blur-xl rounded-full -z-10 animate-pulse"></div>
          </div>
          
          <div className={cn("text-sm md:text-xl font-black text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] tracking-tighter leading-none mt-0.5 md:mt-1 transition-all duration-300", team2Score === 0 && "opacity-0 scale-75")}>
            {team2Score}
          </div>
        </div>

        {/* Team 2 Slots (Inset within Bottom Grid Rectangles) */}
        <PlayerSlot 
          player={players[2]} 
          teamColor={isRecommended ? "blue" : undefined} 
          onClick={() => onSlotClick?.(2)}
          isSelected={selectedSlotIndex === 2}
          className="left-[calc(7.5%+4px)] bottom-[calc(5.7%+4px)] w-[calc(42.5%-8px)] h-[calc(29.6%-8px)]"
        />
        <PlayerSlot 
          player={players[3]} 
          teamColor={isRecommended ? "blue" : undefined} 
          onClick={() => onSlotClick?.(3)}
          isSelected={selectedSlotIndex === 3}
          className="right-[calc(7.5%+4px)] bottom-[calc(5.7%+4px)] w-[calc(42.5%-8px)] h-[calc(29.6%-8px)]"
        />

        {/* Loading Spinner */}
        {isLoading && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[1px]">
            <div className="animate-spin flex"><Loader2 className="w-10 h-10 text-white drop-shadow-lg" /></div>
          </div>
        )}
      </div>

      {/* Footer */}
      {/* Footer - CENTERED & BALANCED ACTION AREA */}
      <div className="p-2 bg-white flex items-center justify-center h-[52px] shrink-0 border-t border-slate-50/50">
        <div className={cn(
          "w-full px-1",
          (isRecommended || (actionText === "結束" && onCancel && players.some(p => p !== null))) ? "grid grid-cols-2 gap-2" : "flex justify-center"
        )}>
          {isRecommended && onSelectPlayers && (
            <button
              onClick={onSelectPlayers}
              disabled={isLoading || !hasControl}
              className="px-2 py-2 font-black text-[10px] uppercase tracking-widest text-indigo-600 border border-indigo-100 hover:bg-black hover:text-white hover:border-black rounded-xl transition-all active:scale-95 bg-indigo-50/30 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed"
            >
              選人
            </button>
          )}
          
          {players.some(p => p !== null) && (
            <>
              {actionText === "結束" && onCancel && (
                <button
                  onClick={onCancel}
                  disabled={isLoading || isActionDisabled}
                  className="px-4 py-2 font-black text-[11px] uppercase tracking-[0.1em] rounded-xl transition-all shadow-sm active:scale-95 disabled:opacity-20 flex items-center justify-center bg-slate-100 text-slate-500 hover:bg-slate-200 w-full"
                >
                  取消
                </button>
              )}

              <button
                onClick={onAction}
                disabled={isLoading || isActionDisabled}
                className={cn(
                  "px-4 py-2 font-black text-[11px] uppercase tracking-[0.2em] rounded-xl transition-all shadow-sm active:scale-95 disabled:opacity-20 flex items-center justify-center",
                  actionText === "結束" 
                    ? "bg-red-50 text-red-500 hover:bg-red-600 hover:text-white w-full" 
                    : "bg-slate-900 text-white hover:bg-black w-full"
                )}
              >
                {actionText}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
});

export const CourtCardSkeleton: React.FC = () => (
  <div className="bg-white rounded-2xl overflow-hidden flex flex-col shadow-sm border border-slate-100 w-full max-w-[340px] md:max-w-[220px] mx-auto animate-pulse-heavy">
    {/* Skeleton Header */}
    <div className="flex items-center justify-between px-3.5 py-2 border-b border-slate-50 h-[42px]">
      <div className="flex items-center gap-1.5">
        <div className="w-1.5 h-1.5 rounded-full bg-slate-200" />
        <div className="h-2 w-16 bg-slate-200 rounded" />
      </div>
      <div className="h-4 w-10 bg-slate-200 rounded" />
    </div>

    {/* Skeleton Court Floor */}
    <div className="relative bg-slate-100 h-[220px] md:h-[300px]">
      <div className="absolute inset-x-[7.5%] inset-y-0 border-x-[1px] border-white/40" />
      <div className="absolute inset-x-0 top-[35.3%] h-0 border-t-[1.5px] border-white/60" />
      <div className="absolute inset-x-0 bottom-[35.3%] h-0 border-t-[1.5px] border-white/60" />
      
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
    <div className="p-2 h-[52px] border-t border-slate-50/50 flex items-center justify-center">
      <div className="h-8 w-3/4 bg-slate-100 rounded-xl" />
    </div>
  </div>
);
