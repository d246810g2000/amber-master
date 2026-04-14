import React from 'react';
import { motion } from 'framer-motion';
import BarChart3 from 'lucide-react/dist/esm/icons/bar-chart-3';
import Activity from 'lucide-react/dist/esm/icons/activity';
import Sparkles from 'lucide-react/dist/esm/icons/sparkles';
import Crown from 'lucide-react/dist/esm/icons/crown';
import type { PlayerHistoryResult } from '../../lib/matchEngine';

type Stats = PlayerHistoryResult['stats'];
type TodayStats = PlayerHistoryResult['todayStats'];

export interface ProfileRecordSummaryExtras {
  /** 與原 StatCard 相同：已 ×10 的整數 CP */
  instantCp: number;
  careerCp: number;
  bestPartner: { name: string; winRate: number } | null;
}

interface ProfileRecordSummaryProps {
  isOwner: boolean;
  stats: Stats;
  todayStats: TodayStats;
  /** 本人專用：即時／生涯戰力與最佳拍檔；非本人時可省略 */
  extras?: ProfileRecordSummaryExtras | null;
}

/**
 * 球員總覽：累積／今日場次與勝率，以及即時戰力、生涯戰力、最佳拍檔（本人可見）。
 */
export const ProfileRecordSummary: React.FC<ProfileRecordSummaryProps> = ({
  isOwner,
  stats,
  todayStats,
  extras,
}) => {
  if (!isOwner) {
    return (
      <div className="group bg-slate-50 dark:bg-zinc-900/40 backdrop-blur-xl rounded-3xl sm:rounded-[2rem] border border-slate-100 dark:border-white/5 p-4 sm:p-6 transition-all duration-300">
        <div className="flex items-center gap-3 text-slate-400 dark:text-zinc-500">
          <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 shrink-0" />
          <p className="text-xs sm:text-sm font-bold">總覽為受保護數據，請先解鎖後查看。</p>
        </div>
      </div>
    );
  }

  const todayWinRateDisplay =
    todayStats.totalMatches === 0 ? '—' : todayStats.winRate;

  return (
    <div className="group bg-slate-50 dark:bg-zinc-900/40 backdrop-blur-xl rounded-3xl sm:rounded-[2rem] border border-slate-100 dark:border-white/5 transition-all duration-300 hover:border-emerald-500/20 hover:shadow-lg dark:hover:shadow-none overflow-hidden">
      <div className="p-3 sm:p-6 flex flex-col gap-2.5 sm:gap-5">
        <div className="flex items-center gap-2">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-emerald-500">
            <BarChart3 className="w-4 h-4 sm:w-6 sm:h-6" />
          </motion.div>
          <div className="text-[9px] sm:text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-[0.2em]">
            球員總覽
          </div>
        </div>

        {/* 手機亦維持 2 欄，與桌機一致、避免直向堆疊過高 */}
        <div className="grid grid-cols-2 gap-2 sm:gap-6">
          {/* 生涯 */}
          <div className="rounded-2xl bg-white/70 dark:bg-black/20 border border-slate-100/80 dark:border-white/5 px-2 py-2 sm:px-4 sm:py-3.5 min-w-0">
            <div className="text-[9px] sm:text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1 sm:mb-2 truncate">
              累積（生涯）
            </div>
            <div className="flex items-baseline justify-between gap-1 min-w-0">
              <span className="text-lg sm:text-3xl font-black text-slate-900 dark:text-white tabular-nums tracking-tight truncate min-w-0">
                {stats.totalMatches}
                <span className="text-[11px] sm:text-base font-bold text-slate-400 dark:text-zinc-500 ml-0.5">場</span>
              </span>
              <span className="text-base sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums shrink-0">
                {stats.winRate}
                <span className="text-[10px] sm:text-sm font-bold text-emerald-600/70 dark:text-emerald-400/70">%</span>
              </span>
            </div>
            <div className="text-[9px] sm:text-xs font-bold text-slate-500 dark:text-zinc-400 tabular-nums mt-0.5">
              W {stats.winCount} · L {stats.lossCount}
            </div>
          </div>

          {/* 今日 */}
          <div className="rounded-2xl bg-sky-50/80 dark:bg-sky-950/25 border border-sky-100/90 dark:border-sky-500/15 px-2 py-2 sm:px-4 sm:py-3.5 min-w-0">
            <div className="flex items-center justify-between gap-1 mb-1 sm:mb-2 min-w-0">
              <span className="text-[9px] sm:text-[10px] font-black text-sky-700/80 dark:text-sky-300/90 uppercase tracking-widest shrink-0">
                今日
              </span>
              <span className="text-[8px] sm:text-[10px] font-bold text-sky-600/70 dark:text-sky-400/70 tabular-nums truncate">
                {todayStats.date}
              </span>
            </div>
            <div className="flex items-baseline justify-between gap-1 min-w-0">
              <span className="text-lg sm:text-3xl font-black text-slate-900 dark:text-white tabular-nums tracking-tight truncate min-w-0">
                {todayStats.totalMatches}
                <span className="text-[11px] sm:text-base font-bold text-slate-400 dark:text-zinc-500 ml-0.5">場</span>
              </span>
              <span className="text-base sm:text-2xl font-black text-sky-600 dark:text-sky-400 tabular-nums shrink-0 inline-flex items-baseline gap-0.5">
                <span>{todayWinRateDisplay}</span>
                {todayStats.totalMatches > 0 ? (
                  <span className="text-[10px] sm:text-sm font-bold text-sky-600/70 dark:text-sky-400/70">%</span>
                ) : null}
              </span>
            </div>
            <div className="text-[9px] sm:text-xs font-bold text-slate-500 dark:text-zinc-400 tabular-nums mt-0.5">
              {todayStats.totalMatches === 0 ? (
                <span className="text-slate-400 dark:text-zinc-500">尚無對戰</span>
              ) : (
                <>W {todayStats.winCount} · L {todayStats.lossCount}</>
              )}
            </div>
          </div>
        </div>

        {extras ? (
          <div className="grid grid-cols-3 gap-1.5 sm:gap-3 border-t border-slate-200/70 dark:border-white/10 pt-2.5 sm:pt-5">
            <div className="rounded-2xl bg-amber-500/[0.06] dark:bg-amber-500/10 border border-amber-200/50 dark:border-amber-500/15 px-2 py-2 sm:px-4 sm:py-3.5 min-w-0">
              <div className="flex items-center gap-1 sm:gap-2 mb-1 sm:mb-1.5 min-w-0">
                <Activity className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500 shrink-0" />
                <span className="text-[8px] sm:text-[10px] font-black text-amber-800/70 dark:text-amber-400/90 uppercase tracking-tight sm:tracking-widest truncate">
                  <span className="sm:hidden">即時</span>
                  <span className="hidden sm:inline">即時戰力</span>
                </span>
              </div>
              <div className="text-base sm:text-3xl font-black text-slate-900 dark:text-white tabular-nums tracking-tight leading-none">
                {extras.instantCp}
                <span className="text-[10px] sm:text-sm font-bold text-slate-400 dark:text-zinc-500 ml-0.5">CP</span>
              </div>
              <p className="hidden sm:block text-[10px] font-bold text-slate-500 dark:text-zinc-500 mt-1 leading-snug">
                當前手感與競技狀態
              </p>
            </div>

            <div className="rounded-2xl bg-emerald-500/[0.06] dark:bg-emerald-500/10 border border-emerald-200/50 dark:border-emerald-500/15 px-2 py-2 sm:px-4 sm:py-3.5 min-w-0">
              <div className="flex items-center gap-1 sm:gap-2 mb-1 sm:mb-1.5 min-w-0">
                <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-500 shrink-0" />
                <span className="text-[8px] sm:text-[10px] font-black text-emerald-800/70 dark:text-emerald-400/90 uppercase tracking-tight sm:tracking-widest truncate">
                  <span className="sm:hidden">生涯</span>
                  <span className="hidden sm:inline">生涯戰力</span>
                </span>
              </div>
              <div className="text-base sm:text-3xl font-black text-slate-900 dark:text-white tabular-nums tracking-tight leading-none">
                {extras.careerCp}
                <span className="text-[10px] sm:text-sm font-bold text-slate-400 dark:text-zinc-500 ml-0.5">CP</span>
              </div>
              <p className="hidden sm:block text-[10px] font-bold text-slate-500 dark:text-zinc-500 mt-1 leading-snug">
                長期穩定的技術累積
              </p>
            </div>

            <div className="rounded-2xl bg-amber-400/[0.07] dark:bg-amber-400/10 border border-amber-200/60 dark:border-amber-400/15 px-2 py-2 sm:px-4 sm:py-3.5 min-w-0">
              <div className="flex items-center gap-1 sm:gap-2 mb-1 sm:mb-1.5 min-w-0">
                <Crown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500 shrink-0 saturate-150" />
                <span className="text-[8px] sm:text-[10px] font-black text-amber-900/65 dark:text-amber-300/90 uppercase tracking-tight sm:tracking-widest truncate">
                  <span className="sm:hidden">拍檔</span>
                  <span className="hidden sm:inline">最佳拍檔</span>
                </span>
              </div>
              <div className="text-sm sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight line-clamp-2 break-words leading-tight">
                {extras.bestPartner?.name || '無'}
              </div>
              <p className="text-[8px] sm:text-[10px] font-bold text-slate-500 dark:text-zinc-500 mt-0.5 sm:mt-1 tabular-nums leading-tight">
                {extras.bestPartner ? (
                  <>
                    <span className="sm:hidden">{extras.bestPartner.winRate.toFixed(1)}%</span>
                    <span className="hidden sm:inline">{extras.bestPartner.winRate.toFixed(1)}% 共同勝率</span>
                  </>
                ) : (
                  '—'
                )}
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};
