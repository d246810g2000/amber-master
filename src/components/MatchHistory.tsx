import React from "react";
import { format } from "date-fns";
import Trophy from "lucide-react/dist/esm/icons/trophy";
import Clock from "lucide-react/dist/esm/icons/clock";
import RefreshCw from "lucide-react/dist/esm/icons/refresh-cw";
import Users from "lucide-react/dist/esm/icons/users";
import X from "lucide-react/dist/esm/icons/x";
import { MatchRecord, Player } from "../types";
import { cn, parseLocalDateTime, getAvatarUrl } from "../lib/utils";
import { CustomCalendar } from "./common/CustomCalendar";

// --- Sub-components (Moved Outside for Clarity) ---

const getPowerBefore = (p: any) => {
  if (p.muBefore !== undefined) {
    return Math.round(p.muBefore * 10);
  }
  return "";
};

const getPowerAfter = (p: any) => {
  if (p.muAfter !== undefined) {
    return Math.round(p.muAfter * 10);
  }
  return "";
};

const getDiff = (p: any) => {
  if (p.muAfter !== undefined && p.muBefore !== undefined) {
    const diff = Math.round((p.muAfter - p.muBefore) * 10);
    return diff >= 0 ? `+${diff}` : `${diff}`;
  }
  return "";
};

const PlayerItem = React.memo(({ 
  p, 
  isWinner, 
  isRight, 
  selectedPlayerIds, 
  onPlayerClick,
  allPlayers
}: { 
  p: any; 
  isWinner: boolean; 
  isRight?: boolean; 
  selectedPlayerIds: string[]; 
  onPlayerClick?: (id: string) => void;
  allPlayers: Player[];
  key?: React.Key;
}) => {
  // Use avatar from p, fallback to finding player in allPlayers list (by ID or Name)
  const playerInList = allPlayers.find(ap => 
    (p.id && ap.id === p.id) || (ap.name === p.name)
  );
  const avatar = p.avatar || playerInList?.avatar || '';
  
  const avatarUrl = getAvatarUrl(avatar, p.name);

  return (
    <div className={cn(
      "flex flex-col min-w-0 flex-1 group/player gap-0.5",
      isRight ? "items-end" : "items-start"
    )}>
      {/* Top row: Avatar + Name */}
      <div className={cn("flex items-center gap-1.5 min-w-0 w-full", isRight ? "flex-row-reverse" : "flex-row")}>
        <div className={cn(
          "w-5 h-5 md:w-6 md:h-6 rounded-full border shadow-sm shrink-0 p-0.5 transition-transform group-hover/player:scale-110",
          isWinner ? "border-emerald-400 bg-emerald-50" : "border-slate-200 bg-slate-50"
        )}>
          <img src={avatarUrl} alt={p.name} className="w-full h-full rounded-full object-cover" />
        </div>
        <span 
          onClick={() => onPlayerClick?.(p.id)}
          className={cn(
            "text-[11px] md:text-[12px] font-black cursor-pointer hover:text-blue-600 truncate px-0.5 rounded transition-colors leading-tight min-w-0",
            selectedPlayerIds.includes(p.id) ? "text-blue-500 bg-blue-50" : "text-slate-800"
          )}
        >
          {p?.name}
        </span>
      </div>

      {/* Bottom row: CP Info */}
      <div className={cn("flex items-center gap-1 md:gap-1.5 border border-slate-100/30 px-1 py-[2px] w-fit rounded-lg", isRight ? "flex-row-reverse" : "flex-row")}>
        <span className="text-[8px] font-bold text-slate-400 tabular-nums leading-none opacity-70">{getPowerBefore(p)}</span>
        <span className={cn("text-[6px] leading-none", isWinner ? "text-emerald-400" : "text-rose-400")}>{isRight ? "◀" : "▶"}</span>
        <span className="text-[10px] md:text-[12px] font-black text-slate-800 tabular-nums leading-none drop-shadow-sm">{getPowerAfter(p)}</span>
        <div className={cn("px-1 py-[2px] rounded text-[8px] font-black tabular-nums leading-none ml-0.5 flex items-center justify-center -mt-[1px]", isWinner ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-rose-50 text-rose-500 border border-rose-100")}>
          {getDiff(p)}
        </div>
      </div>
    </div>
  );
});

// --- Main component ---

export interface MatchHistoryProps {
  history: MatchRecord[];
  loading: boolean;
  filterDate: string;
  players: Player[];
  selectedPlayerIds: string[];
  onTogglePlayerId: (id: string) => void;
  onClearPlayers: () => void;
  onDateChange?: (date: string) => void;
  onPlayerClick?: (playerId: string) => void;
  allMatchDates?: Set<string>;
}

export function MatchHistory({ 
  history,
  loading,
  filterDate,
  players,
  selectedPlayerIds,
  onTogglePlayerId,
  onClearPlayers,
  onDateChange,
  onPlayerClick,
  allMatchDates
}: MatchHistoryProps) {
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const selectedSet = React.useMemo(() => new Set(selectedPlayerIds), [selectedPlayerIds]);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    if (onDateChange) onDateChange(newDate);
  };

  const filteredHistory = selectedSet.size > 0
    ? history.filter(match => 
        [...match.team1, ...match.team2].some(p => selectedSet.has(p.id))
      )
    : history;

  // Filter players to show only those present in the current history
  const activePlayers = React.useMemo(() => {
    const counts = new Map<string, number>();
    history.forEach(m => {
      [...m.team1, ...m.team2].forEach(p => {
        if (p.id) counts.set(p.id, (counts.get(p.id) || 0) + 1);
      });
    });
    return players
      .filter(p => counts.has(p.id))
      .map(p => ({ ...p, localCount: counts.get(p.id)! }))
      .sort((a, b) => b.localCount - a.localCount);
  }, [history, players]);

  return (
    <div className="flex flex-col h-full space-y-3">
      {/* Search & Filter Header (Premium Interaction) */}
      <div className="space-y-2 px-1">
        <div className="flex flex-row gap-2 justify-between md:justify-center">
          {/* Date Picker (Left) - Compact spacing */}
          <div className="flex-1 md:flex-none md:w-[180px] flex items-center gap-1.5 bg-white px-2.5 py-2 rounded-2xl border border-slate-200 shadow-sm transition-all hover:bg-slate-50 focus-within:ring-2 focus-within:ring-emerald-500/20 min-w-0">
            <div className="flex items-center gap-1.5 text-slate-400 font-bold text-[10px] shrink-0 ml-1">
              <Clock className="w-3.5 h-3.5 text-emerald-500" />
              <span className="tracking-tight uppercase">日期</span>
            </div>
            <CustomCalendar 
              value={filterDate}
              onChange={(date) => onDateChange?.(date)}
              highlightedDates={allMatchDates}
              className="flex-1"
            />
          </div>

          {/* Player Filter Toggle (Right) - Compact & Consistent */}
          <button 
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className={cn(
              "flex-1 md:flex-none md:w-[180px] flex items-center gap-1.5 px-3 py-2 rounded-2xl border transition-all duration-300 justify-center group relative overflow-hidden min-w-0",
              isFilterOpen || selectedPlayerIds.length > 0
                ? "bg-[#0f172a] border-slate-800 text-white shadow-lg shadow-blue-500/20"
                : "bg-white border-slate-200 text-slate-700 hover:border-blue-300 hover:bg-blue-50/50"
            )}
          >
            <Users className={cn("w-4 h-4 transition-transform group-hover:scale-110", isFilterOpen ? "text-blue-400" : "text-blue-500")} />
            <span className="text-[11px] font-black tracking-tight">球員篩選</span>
            {selectedPlayerIds.length > 0 && (
              <span className="bg-blue-500 text-white text-[9px] min-w-[18px] h-4.5 flex items-center justify-center rounded-full font-black px-1.5 shadow-sm">
                {selectedPlayerIds.length}
              </span>
            )}
          </button>
        </div>

        {/* Expandable Player List (Glassmorphism Styled, Simplified) */}
        {isFilterOpen && (
          <div className="bg-[#0f172a]/95 backdrop-blur-md rounded-[1.5rem] p-3 shadow-2xl relative overflow-hidden animate-in fade-in slide-in-from-top-3 duration-500 border border-white/5">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-[60px] -mr-16 -mt-16 pointer-events-none" />
            
            {/* Clear Button (Absolute positioned to save space) */}
            {selectedPlayerIds.length > 0 && (
              <button 
                onClick={onClearPlayers}
                className="absolute top-3 right-3 z-10 text-[9px] font-black text-rose-400 hover:text-white transition-all flex items-center gap-1 bg-rose-500/10 hover:bg-rose-500/20 px-2 py-1 rounded-full backdrop-blur-sm border border-rose-500/20"
              >
                清除重置 <X size={10} />
              </button>
            )}

            <div className="flex gap-4 overflow-x-auto pt-2 pb-2 scrollbar-subtle scroll-smooth">
              {activePlayers.map(p => {
                const isSelected = selectedSet.has(p.id);
                return (
                  <button
                    key={p.id}
                    onClick={() => onTogglePlayerId(p.id)}
                    className={cn(
                      "flex flex-col items-center gap-1.5 shrink-0 transition-all duration-300 group/item",
                      isSelected ? "scale-105" : "hover:scale-105"
                    )}
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-full border-2 p-0.5 transition-all duration-300",
                      isSelected 
                        ? "border-blue-400 bg-blue-400/20 shadow-[0_0_15px_rgba(59,130,246,0.4)]" 
                        : "border-slate-700 bg-slate-800 shadow-inner group-hover/item:border-slate-500"
                    )}>
                      <img
                        src={getAvatarUrl(p.avatar, p.name)}
                        alt={p.name}
                        className="w-full h-full rounded-full object-cover transition-transform group-hover/item:scale-105"
                      />
                    </div>
                    <span className={cn(
                      "text-[9px] font-black truncate w-12 text-center transition-colors",
                      isSelected ? "text-blue-400" : "text-slate-400"
                    )}>
                      {p.name}
                    </span>
                    <span className="text-[8px] font-bold text-slate-500/60 -mt-1">{p.localCount} 場</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-8 text-slate-400 gap-3">
            <div className="animate-spin flex"><RefreshCw className="w-6 h-6 text-emerald-500" /></div>
            <p className="text-[10px] font-black uppercase tracking-widest">載入中...</p>
          </div>
        ) : filteredHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-slate-500 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <Trophy className="w-8 h-8 mb-2 opacity-20 text-slate-400" />
            <p className="text-xs font-medium">查無對戰紀錄</p>
          </div>
        ) : (
          <div className="space-y-3 pb-6 px-1">
            {filteredHistory.map((match) => (
              <div key={match.id} className="match-history-item group flex items-center mb-1.5 md:mb-2 px-1">
                {/* Refined Main Card with Integrated Badge */}
                <div className={cn(
                  "w-full bg-white rounded-[1.2rem] flex items-stretch shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-500 relative overflow-hidden h-auto border border-slate-100"
                )}>
                  {/* Vertical Progress Bar Style Left Team Indicator */}
                  <div className={cn(
                    "w-2 shrink-0 transition-all duration-500",
                    match.winner === 1 ? "bg-emerald-500 shadow-[2px_0_8px_rgba(16,185,129,0.3)]" : "bg-rose-500/10"
                  )}></div>

                  {/* Main Grid Content */}
                  <div className="flex-1 py-3 px-2 md:px-5 flex flex-row items-center justify-between gap-1.5 md:gap-3 min-w-0">
                    {/* Team 1 */}
                    <div className="flex flex-col gap-1.5 w-[38%] md:flex-1 min-w-0">
                      {match.team1.map((p, idx) => (
                        <PlayerItem 
                          key={`${match.id}-t1-${idx}`} 
                          p={p} 
                          isWinner={match.winner === 1} 
                          selectedPlayerIds={selectedPlayerIds}
                          onPlayerClick={onPlayerClick}
                          allPlayers={players}
                        />
                      ))}
                    </div>

                    {/* Highly Compact VS Center */}
                    <div className="flex flex-col items-center justify-center gap-0.5 shrink-0 px-1 md:px-2 min-w-0 w-[24%] border-x border-slate-50/60">
                      <div className="bg-slate-100 text-slate-400 px-1.5 py-[2px] rounded-sm text-[7px] md:text-[8px] font-black tracking-widest -mt-1 shadow-inner whitespace-nowrap opacity-80">
                        MATCH {match.matchNo}
                      </div>
                      <div className="text-[10px] md:text-[12px] font-black text-slate-700 shadow-sm tracking-tight leading-none bg-slate-50 px-2.5 py-0.5 mx-auto rounded-full ring-1 ring-slate-200/60 w-fit shrink-0 whitespace-nowrap z-10 my-0.5">
                        {match.score || "VS"}
                      </div>
                      <span className="text-[8px] md:text-[9px] font-bold text-slate-400 tracking-wider text-center shrink-0 leading-none">
                        {format(parseLocalDateTime(match.date), "HH:mm")}
                      </span>
                      {match.duration && (
                        <span className="text-[6px] md:text-[7px] font-black text-emerald-500/50 uppercase tracking-[0.15em] text-center mt-0.5 max-w-[40px] truncate">
                          {match.duration}
                        </span>
                      )}
                    </div>

                    {/* Team 2 */}
                    <div className="flex flex-col gap-1.5 w-[38%] md:flex-1 min-w-0 items-end">
                      {match.team2.map((p, idx) => (
                        <PlayerItem 
                          key={`${match.id}-t2-${idx}`} 
                          p={p} 
                          isWinner={match.winner === 2} 
                          isRight 
                          selectedPlayerIds={selectedPlayerIds}
                          onPlayerClick={onPlayerClick}
                          allPlayers={players}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Vertical Progress Bar Style Right Team Indicator */}
                  <div className={cn(
                    "w-2 shrink-0 transition-all duration-500",
                    match.winner === 2 ? "bg-emerald-500 shadow-[-2px_0_8px_rgba(16,185,129,0.3)]" : "bg-rose-500/10"
                  )}></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export const MatchHistorySkeleton: React.FC = () => (
  <div className="space-y-3 px-1 animate-pulse-heavy">
    {[1, 2, 3, 4, 5].map(i => (
      <div key={i} className="bg-white rounded-[1.2rem] flex items-stretch h-[88px] border border-slate-100 shadow-sm relative overflow-hidden">
        <div className="w-2 bg-slate-100/50 shrink-0" />
        <div className="flex-1 py-3 px-2 flex flex-row items-center justify-between gap-2">
          {/* Team 1 Skeleton */}
          <div className="flex flex-col gap-2 flex-1">
            <div className="flex items-center gap-1.5"><div className="w-5 h-5 rounded-full bg-slate-100" /><div className="h-2 w-12 bg-slate-100 rounded" /></div>
            <div className="flex items-center gap-1.5"><div className="w-5 h-5 rounded-full bg-slate-100" /><div className="h-2 w-10 bg-slate-100 rounded" /></div>
          </div>
          {/* VS Skeleton */}
          <div className="flex flex-col items-center justify-center gap-1 w-[24%] border-x border-slate-50/60">
            <div className="h-2 w-8 bg-slate-100 rounded" />
            <div className="h-4 w-12 bg-slate-100 rounded-full" />
            <div className="h-2 w-6 bg-slate-100 rounded" />
          </div>
          {/* Team 2 Skeleton */}
          <div className="flex flex-col gap-2 flex-1 items-end">
            <div className="flex flex-row-reverse items-center gap-1.5"><div className="w-5 h-5 rounded-full bg-slate-100" /><div className="h-2 w-12 bg-slate-100 rounded" /></div>
            <div className="flex flex-row-reverse items-center gap-1.5"><div className="w-5 h-5 rounded-full bg-slate-100" /><div className="h-2 w-10 bg-slate-100 rounded" /></div>
          </div>
        </div>
        <div className="w-2 bg-slate-100/50 shrink-0" />
      </div>
    ))}
  </div>
);
