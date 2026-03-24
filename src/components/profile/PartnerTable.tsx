import React from 'react';
import { motion } from 'framer-motion';
import Shapes from "lucide-react/dist/esm/icons/shapes";
import { getAvatarUrl } from '../../lib/utils';
import type { RawPlayer } from '../../lib/gasApi';

interface TeammateStatItem {
  name: string;
  count: number;
  wins: number;
  winRate: number;
}

interface PartnerTableProps {
  teammateStats: TeammateStatItem[];
  playerMap: Record<string, RawPlayer>;
  partnerSort: { key: string; dir: 'asc' | 'desc' };
  setPartnerSort: React.Dispatch<React.SetStateAction<{ key: string; dir: 'asc' | 'desc' }>>;
}

export const PartnerTable: React.FC<PartnerTableProps> = ({
  teammateStats, playerMap, partnerSort, setPartnerSort
}) => {
  return (
    <div className="bg-slate-50/50 dark:bg-zinc-900/40 border border-slate-100 dark:border-white/5 rounded-[3rem] p-6 sm:p-10 shadow-lg dark:shadow-2xl transition-all">
      <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-[0.2em] mb-6 sm:mb-8 flex items-center gap-3">
        <Shapes className="w-5 h-5 text-emerald-500" />
        隊友合作競爭力分析
      </h3>
      
      {/* Desktop Header */}
      <div className="hidden sm:grid grid-cols-[2fr_1fr_1fr] gap-4 pb-4 border-b border-slate-100 dark:border-white/5 px-2">
        <div
          className="text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors"
          onClick={() => setPartnerSort(s => ({ key: 'name', dir: s.key === 'name' ? (s.dir === 'asc' ? 'desc' : 'asc') : 'asc' }))}
        >
          隊友成員 {partnerSort.key === 'name' && (partnerSort.dir === 'asc' ? '↑' : '↓')}
        </div>
        <div
          className="text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest text-center cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors"
          onClick={() => setPartnerSort(s => ({ key: 'count', dir: s.key === 'count' ? (s.dir === 'asc' ? 'desc' : 'asc') : 'asc' }))}
        >
          合作場次 {partnerSort.key === 'count' && (partnerSort.dir === 'asc' ? '↑' : '↓')}
        </div>
        <div
          className="text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest text-right cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors"
          onClick={() => setPartnerSort(s => ({ key: 'winRate', dir: s.key === 'winRate' ? (s.dir === 'asc' ? 'desc' : 'asc') : 'asc' }))}
        >
          共同勝率 {partnerSort.key === 'winRate' && (partnerSort.dir === 'asc' ? '↑' : '↓')}
        </div>
      </div>

      {/* List */}
      <div className="flex flex-col gap-3 mt-4 sm:mt-2">
        {teammateStats.map((s, idx) => {
          const tPlayer = playerMap[s.name];
          return (
            <div 
              key={idx} 
              className="group flex flex-col sm:grid sm:grid-cols-[2fr_1fr_1fr] gap-4 sm:gap-4 p-5 sm:px-2 sm:py-5 bg-white sm:bg-transparent dark:bg-white/[0.02] hover:bg-slate-100 dark:hover:bg-white/[0.04] rounded-3xl sm:rounded-none sm:border-b border-slate-100 dark:border-white/5 transition-colors [content-visibility:auto] contain-paint items-center shadow-sm sm:shadow-none"
            >
              <div className="flex items-center gap-4 w-full sm:w-auto">
                <div className="w-12 h-12 sm:w-10 sm:h-10 rounded-[1.25rem] sm:rounded-xl bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-white/10 overflow-hidden ring-offset-2 ring-offset-white dark:ring-offset-zinc-950 group-hover:ring-2 ring-emerald-500/50 transition-all shrink-0">
                  <img src={getAvatarUrl(tPlayer?.avatar, s.name)} className="w-full h-full object-cover" />
                </div>
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="font-black sm:font-bold text-[15px] sm:text-base text-slate-800 dark:text-zinc-200 group-hover:text-emerald-500 dark:group-hover:text-emerald-400 transition-colors truncate">{s.name}</span>
                  <span className="sm:hidden text-[11px] font-bold text-slate-400 dark:text-zinc-500 mt-0.5">合作 {s.count} 場</span>
                </div>
              </div>
              
              <div className="hidden sm:block text-center text-zinc-500 tabular-nums font-mono text-sm self-center">
                {s.count}
              </div>

              <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center w-full sm:w-auto mt-2 sm:mt-0 pt-3 sm:pt-0 border-t border-slate-100 dark:border-white/5 sm:border-0 self-center">
                <span className="sm:hidden text-[11px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest">共同勝率</span>
                <div className="flex flex-col items-end sm:items-end w-[60%] sm:w-auto">
                  <span className={`text-[15px] sm:text-base font-black tabular-nums ${s.winRate >= 60 ? 'text-emerald-500' : s.winRate >= 50 ? 'text-amber-500' : 'text-slate-400 dark:text-zinc-500'}`}>
                    {s.winRate.toFixed(1)}%
                  </span>
                  <div className="w-full sm:w-24 h-1.5 sm:h-1 bg-slate-100 dark:bg-zinc-800 rounded-full mt-1.5 sm:mt-2 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${s.winRate}%` }}
                      className={`h-full rounded-full ${s.winRate >= 60 ? 'bg-emerald-500' : s.winRate >= 50 ? 'bg-amber-500' : 'bg-zinc-600'}`}
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
