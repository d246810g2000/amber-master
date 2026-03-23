import React, { useState, useMemo } from 'react';
import Calendar from "lucide-react/dist/esm/icons/calendar";
import Sparkles from "lucide-react/dist/esm/icons/sparkles";
import Activity from "lucide-react/dist/esm/icons/activity";
import Clock from "lucide-react/dist/esm/icons/clock";
import Users from "lucide-react/dist/esm/icons/users";
import X from "lucide-react/dist/esm/icons/x";
import Trophy from "lucide-react/dist/esm/icons/trophy";
import { Player } from "../../types";
import { getAvatarUrl, cn } from "../../lib/utils";
import { CustomCalendar } from "../common/CustomCalendar";

interface MatchHistoryItem {
  id: string;
  date: string;
  teammate: string;
  opponents: string;
  teamIds: string[];
  result: string;
  compBefore: number;
  compAfter: number;
  compDiff: number;
  instantBefore: number;
  instantAfter: number;
  instantDiff: number;
  isInstantInit: boolean;
  myTeamScore: number;
  oppTeamScore: number;
}

interface MatchHistoryTableProps {
  playerId: string;
  matchHistory: MatchHistoryItem[];
  historySort: { key: string; dir: 'asc' | 'desc' };
  setHistorySort: React.Dispatch<React.SetStateAction<{ key: string; dir: 'asc' | 'desc' }>>;
  players: Player[];
  activeMatchDates?: Set<string>;
}

export const MatchHistoryTable: React.FC<MatchHistoryTableProps> = ({
  playerId, matchHistory, historySort, setHistorySort, players, activeMatchDates
}) => {
  const [filterDate, setFilterDate] = useState("");
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const selectedSet = useMemo(() => new Set(selectedPlayerIds), [selectedPlayerIds]);

  const onTogglePlayerId = (id: string) => {
    setSelectedPlayerIds(prev =>
      prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id]
    );
  };

  const onClearPlayers = () => setSelectedPlayerIds([]);

  // Compute players who ACTUALLY played with/against this profile owner
  const relatedPlayers = useMemo(() => {
    const counts = new Map<string, number>();
    matchHistory.forEach(m => {
      m.teamIds.forEach(id => {
        if (id !== playerId) counts.set(id, (counts.get(id) || 0) + 1);
      });
    });
    
    return players
      .filter(p => counts.has(p.id))
      .map(p => ({ ...p, relationCount: counts.get(p.id)! }))
      .sort((a, b) => b.relationCount - a.relationCount);
  }, [matchHistory, players, playerId]);

  const filteredHistory = useMemo(() => {
    let result = matchHistory;
    if (filterDate) {
      result = result.filter(m => m.date.startsWith(filterDate));
    }
    if (selectedSet.size > 0) {
      result = result.filter(m => m.teamIds.some(id => selectedSet.has(id)));
    }
    return result;
  }, [matchHistory, filterDate, selectedSet]);

  return (
    <div className="bg-zinc-900/40 border border-white/5 rounded-[3rem] p-6 sm:p-10 shadow-2xl">
      <div className="flex items-center justify-between mb-6 sm:mb-8">
        <h3 className="text-sm font-black text-white uppercase tracking-[0.2em] flex items-center gap-3">
          <Calendar className="w-5 h-5 text-emerald-500" />
          完整對戰記錄
        </h3>
        <span className="px-4 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[10px] font-black text-emerald-500 tracking-widest uppercase shadow-lg shadow-emerald-500/5">
          {filteredHistory.length} Total
        </span>
      </div>

      {/* Filter Components */}
      <div className="space-y-4 mb-8">
        <div className="flex flex-row gap-2 justify-between md:justify-center">
          {/* Date Picker */}
          <div className="flex-1 md:flex-none md:w-[180px] flex items-center gap-1.5 bg-zinc-800/50 px-3 py-2.5 rounded-2xl border border-white/5 shadow-sm transition-all focus-within:ring-2 focus-within:ring-emerald-500/20 min-w-0">
            <div className="flex items-center gap-1.5 text-zinc-400 font-bold text-[10px] shrink-0">
              <Clock className="w-4 h-4 text-emerald-500 hidden sm:block" />
              <span className="tracking-tight uppercase hidden sm:block">日期</span>
            </div>
            <CustomCalendar 
              value={filterDate}
              onChange={(date) => setFilterDate(date)}
              highlightedDates={activeMatchDates}
              className="flex-1"
            />
          </div>

          {/* Player Filter Toggle */}
          <button 
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className={cn(
              "flex-1 md:flex-none md:w-[180px] flex items-center gap-2 px-4 py-2.5 rounded-2xl border transition-all duration-300 justify-center group relative overflow-hidden min-w-0",
              isFilterOpen || selectedPlayerIds.length > 0
                ? "bg-zinc-800 border-emerald-500/30 text-emerald-400 shadow-lg"
                : "bg-zinc-800/50 border-white/5 text-zinc-400 hover:border-emerald-500/30 hover:text-emerald-400"
            )}
          >
            <Users className="w-4 h-4 transition-transform group-hover:scale-110" />
            <span className="text-[12px] font-black tracking-tight">球員篩選</span>
            {selectedPlayerIds.length > 0 && (
              <span className="bg-emerald-500 text-white text-[10px] min-w-[20px] h-5 flex items-center justify-center rounded-full font-black px-1.5 shadow-sm ml-1">
                {selectedPlayerIds.length}
              </span>
            )}
          </button>
        </div>

        {/* Expandable Player List */}
        {isFilterOpen && (
          <div className="bg-zinc-900/80 backdrop-blur-md rounded-[1.5rem] p-4 shadow-2xl relative overflow-hidden animate-in fade-in slide-in-from-top-3 duration-500 border border-white/5">
            {selectedPlayerIds.length > 0 && (
              <button 
                onClick={onClearPlayers}
                className="absolute top-4 right-4 z-10 text-[10px] font-black text-rose-400 hover:text-white transition-all flex items-center gap-1 bg-rose-500/10 hover:bg-rose-500/20 px-2.5 py-1.5 rounded-full backdrop-blur-sm border border-rose-500/20"
              >
                清除重置 <X size={12} />
              </button>
            )}

            <div className="flex gap-4 overflow-x-auto pt-2 pb-2 scrollbar-subtle scroll-smooth">
              {relatedPlayers.map(p => {
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
                      "w-12 h-12 rounded-full border-2 p-0.5 transition-all duration-300",
                      isSelected 
                        ? "border-emerald-400 bg-emerald-400/20 shadow-[0_0_15px_rgba(16,185,129,0.4)]" 
                        : "border-zinc-700 bg-zinc-800 shadow-inner group-hover/item:border-emerald-500/50"
                    )}>
                      <img
                        src={getAvatarUrl(p.avatar, p.name)}
                        alt={p.name}
                        className="w-full h-full rounded-full object-cover transition-transform group-hover/item:scale-105"
                      />
                    </div>
                    <span className={cn(
                      "text-[10px] font-black truncate w-14 text-center transition-colors",
                      isSelected ? "text-emerald-400" : "text-zinc-500"
                    )}>
                      {p.name}
                    </span>
                    <span className="text-[8px] font-bold text-zinc-600 -mt-1">{p.relationCount} 場</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
      <div className="hidden sm:grid grid-cols-[1fr_2fr_1fr_1fr] gap-4 pb-4 border-b border-white/5 px-2 mt-2">
        <div
          className="text-[10px] font-black text-zinc-500 uppercase tracking-widest cursor-pointer hover:text-white transition-colors"
          onClick={() => setHistorySort(s => ({ key: 'date', dir: s.key === 'date' ? (s.dir === 'asc' ? 'desc' : 'asc') : 'asc' }))}
        >
          日期時間 {historySort.key === 'date' && (historySort.dir === 'asc' ? '↑' : '↓')}
        </div>
        <div
          className="text-[10px] font-black text-zinc-500 uppercase tracking-widest cursor-pointer hover:text-white transition-colors"
          onClick={() => setHistorySort(s => ({ key: 'teammate', dir: s.key === 'teammate' ? (s.dir === 'asc' ? 'desc' : 'asc') : 'asc' }))}
        >
          隊友與對手 {historySort.key === 'teammate' && (historySort.dir === 'asc' ? '↑' : '↓')}
        </div>
        <div
          className="text-[10px] font-black text-zinc-500 uppercase tracking-widest text-center cursor-pointer hover:text-white transition-colors"
          onClick={() => setHistorySort(s => ({ key: 'result', dir: s.key === 'result' ? (s.dir === 'asc' ? 'desc' : 'asc') : 'asc' }))}
        >
          勝負 {historySort.key === 'result' && (historySort.dir === 'asc' ? '↑' : '↓')}
        </div>
        <div
          className="text-[10px] font-black text-zinc-500 uppercase tracking-widest text-right cursor-pointer hover:text-white transition-colors relative group"
          onClick={() => setHistorySort(s => ({ key: 'compDiff', dir: s.key === 'compDiff' ? (s.dir === 'asc' ? 'desc' : 'asc') : 'asc' }))}
        >
          戰力變動 {historySort.key === 'compDiff' && (historySort.dir === 'asc' ? '↑' : '↓')}
          <div className="text-[8px] opacity-40 lowercase sm:group-hover:opacity-100 transition-opacity absolute right-0 top-full mt-1">原本 / 增減</div>
        </div>
      </div>

      <div className="flex flex-col gap-4 sm:gap-2 mt-4 sm:mt-2">
        {filteredHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-zinc-500 bg-white/[0.02] rounded-3xl border border-dashed border-white/5">
            <Trophy className="w-10 h-10 mb-3 opacity-20 text-emerald-500" />
            <p className="text-sm font-black">查無對戰紀錄</p>
          </div>
        ) : (
          filteredHistory.map((m, idx) => m ? (
          <div 
            key={idx} 
            className="flex flex-col sm:grid sm:grid-cols-[1fr_2fr_1fr_1fr] gap-2.5 sm:gap-4 p-4 sm:px-2 sm:py-6 bg-white/[0.02] sm:bg-transparent hover:bg-white/[0.04] rounded-2xl sm:rounded-none sm:border-b border-white/5 transition-colors [content-visibility:auto] contain-paint"
          >
            {/* Mobile Header: Date & Result */}
            <div className="flex sm:block justify-between items-center mb-0.5 sm:mb-0">
               <p className="text-[12px] sm:text-[11px] font-sans font-black text-zinc-400 tracking-tight sm:text-zinc-300">
                  {m.date}
               </p>
               <div className="sm:hidden flex items-center justify-center w-8 h-8 rounded-xl font-black text-sm ring-1 ring-inset shrink-0 ml-2 shadow-lg" style={{
                   backgroundColor: m.result === 'W' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.1)',
                   color: m.result === 'W' ? 'rgb(52, 211, 153)' : 'rgb(244, 63, 94)',
                   boxShadow: m.result === 'W' ? '0 10px 15px -3px rgba(16, 185, 129, 0.1)' : 'none',
                   borderColor: m.result === 'W' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.2)'
               }}>
                 {m.result}
               </div>
            </div>

            {/* Teams */}
            <div className="flex flex-row sm:flex-col justify-between sm:justify-start items-center sm:items-stretch gap-2 sm:gap-4 min-w-0 py-0.5 sm:py-0">
               {/* Team 1 (Teammate) */}
               <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 group/row flex-1 w-1/2 sm:w-auto text-center sm:text-left">
                 <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-1 sm:gap-2.5 min-w-0">
                   <div className="w-auto h-auto sm:w-9 sm:h-5 flex items-center justify-center sm:bg-emerald-500/10 sm:border sm:border-emerald-400/20 rounded-md sm:shadow-sm shrink-0">
                     <span className="text-[9px] sm:text-[8px] font-black text-emerald-500 sm:text-emerald-400 sm:uppercase tracking-widest leading-tight">隊友</span>
                   </div>
                   <span className="text-[13px] sm:text-sm font-bold text-zinc-100 sm:truncate pb-0.5 text-balance">{m.teammate}</span>
                 </div>
                 <div className={`mx-auto sm:mx-0 sm:self-auto flex items-center gap-1.5 px-2 py-0.5 rounded-lg border transition-all shrink-0 w-fit ${
                   m.myTeamScore > m.oppTeamScore
                   ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                   : "text-zinc-500 bg-zinc-800/50 border-white/5"
                 }`}>
                   <span className="hidden sm:inline text-[8px] font-black uppercase tracking-tighter opacity-50">戰力總和</span>
                   <span className="text-[9px] sm:text-[10px] font-black tabular-nums">{m.myTeamScore}</span>
                 </div>
               </div>

               {/* VS (Mobile only) */}
               <div className="sm:hidden shrink-0 px-1 text-[9px] font-black text-zinc-600 opacity-60">
                 VS
               </div>

               {/* Team 2 (Opponents) */}
               <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 group/row flex-1 w-1/2 sm:w-auto text-center sm:text-left">
                 <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-1 sm:gap-2.5 min-w-0">
                   <div className="w-auto h-auto sm:w-9 sm:h-5 flex items-center justify-center sm:bg-amber-500/10 sm:border sm:border-amber-400/20 rounded-md sm:shadow-sm shrink-0">
                     <span className="text-[9px] sm:text-[8px] font-black text-rose-500 sm:text-amber-400 sm:uppercase tracking-widest leading-tight">對手</span>
                   </div>
                   <span className="text-[13px] sm:text-[11px] font-bold text-zinc-400 sm:truncate pb-0.5 text-balance max-w-full">{m.opponents}</span>
                 </div>
                 <div className={`mx-auto sm:mx-0 sm:self-auto flex items-center gap-1.5 px-2 py-0.5 rounded-lg border transition-all shrink-0 w-fit ${
                   m.oppTeamScore > m.myTeamScore
                   ? "text-amber-400 bg-amber-500/10 border-amber-400/20"
                   : "text-zinc-500 bg-zinc-800/50 border-white/5"
                 }`}>
                   <span className="hidden sm:inline text-[8px] font-black uppercase tracking-tighter opacity-50">戰力總和</span>
                   <span className="text-[9px] sm:text-[10px] font-black tabular-nums">{m.oppTeamScore}</span>
                 </div>
               </div>
            </div>

            {/* Desktop Result Badge */}
            <div className="hidden sm:flex flex-col items-center justify-center gap-1">
               <span className={`inline-flex items-center justify-center w-10 h-10 rounded-2xl font-black text-base ring-1 ring-inset ${
                 m.result === 'W'
                 ? 'bg-emerald-500/20 text-emerald-400 ring-emerald-500/30 shadow-lg shadow-emerald-500/10'
                 : 'bg-rose-500/10 text-rose-500 ring-rose-500/20'
               }`}>
                 {m.result}
               </span>
            </div>

            {/* CP Changes */}
            <div className="flex flex-col items-stretch sm:justify-center sm:items-end gap-1.5 mt-1 sm:mt-0 pt-3 sm:pt-0 border-t border-white/5 sm:border-0 relative">
               <div className="flex items-center justify-between sm:justify-start gap-2 group/career bg-white/[0.03] sm:bg-white/5 px-2 sm:px-2 py-1.5 sm:py-1 rounded-lg sm:rounded-xl sm:border border-white/5 hover:bg-white/10 transition-all">
                 <span className="sm:hidden text-[10px] font-black text-zinc-500 uppercase tracking-widest">生涯</span>
                 <div className="flex items-center gap-2">
                   <span className="text-[11px] sm:text-[10px] font-bold text-zinc-600 tabular-nums">{m.compBefore}</span>
                   <span className="text-[10px] sm:text-[9px] text-zinc-700">→</span>
                   <span className="text-[13px] sm:text-[12px] font-black text-zinc-300 tabular-nums">{m.compAfter}</span>
                   <span className={`text-[11px] sm:text-[10px] font-black tabular-nums transition-transform group-hover/career:scale-110 ml-0.5 ${
                     m.compDiff < 0 ? 'text-rose-500' : 'text-emerald-400'
                   }`}>
                     ({m.compDiff >= 0 ? `+${m.compDiff}` : m.compDiff})
                   </span>
                   <Sparkles size={12} className="text-emerald-500 shrink-0 ml-1 hidden sm:block" />
                 </div>
               </div>

               <div className="flex items-center justify-between sm:justify-start gap-2 group/instant bg-white/[0.03] sm:bg-white/5 px-2 sm:px-2 py-1.5 sm:py-1 rounded-lg sm:rounded-xl sm:border border-white/5 hover:bg-white/10 transition-all">
                 <span className="sm:hidden text-[10px] font-black text-zinc-500 uppercase tracking-widest">即時</span>
                 <div className="flex items-center gap-2">
                   <div className="flex items-center gap-1">
                     {m.isInstantInit && (
                       <span className="text-[7.5px] sm:text-[7px] font-black bg-blue-500 text-white px-1 py-0 rounded-[3px] leading-tight uppercase tracking-tighter mr-0.5 shadow-sm shadow-blue-500/20">
                         init
                       </span>
                     )}
                     <span className="text-[11px] sm:text-[10px] font-bold text-zinc-600 tabular-nums">{m.instantBefore}</span>
                   </div>
                   <span className="text-[10px] sm:text-[9px] text-zinc-700">→</span>
                   <span className="text-[13px] sm:text-[12px] font-black text-zinc-300 tabular-nums">{m.instantAfter}</span>
                   <span className={`text-[11px] sm:text-[10px] font-black tabular-nums transition-transform group-hover/instant:scale-110 ml-0.5 ${
                     m.instantDiff < 0 ? 'text-rose-500' : 'text-amber-400'
                   }`}>
                     ({m.instantDiff >= 0 ? `+${m.instantDiff}` : m.instantDiff})
                   </span>
                   <Activity size={12} className="text-amber-500 shrink-0 ml-1 hidden sm:block" />
                 </div>
               </div>
            </div>
          </div>
        ) : null))}
      </div>
    </div>
  );
};
