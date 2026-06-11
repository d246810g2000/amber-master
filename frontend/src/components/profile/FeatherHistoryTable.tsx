import React from 'react';
import { motion } from 'framer-motion';
import { Feather, ArrowUpRight, ArrowDownLeft, Clock, Info } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { FeatherTransaction } from '../../lib/gasApi';

interface FeatherHistoryTableProps {
  transactions: FeatherTransaction[];
  isLoading: boolean;
}

export const FeatherHistoryTable: React.FC<FeatherHistoryTableProps> = ({ transactions, isLoading }) => {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="w-10 h-10 border-4 border-sky-500/20 border-t-sky-500 rounded-full animate-spin" />
        <p className="text-slate-500 dark:text-slate-400 font-bold text-xs uppercase tracking-widest">載入明細中...</p>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-slate-50/50 dark:bg-slate-900/30 rounded-[3rem] border border-dashed border-slate-200 dark:border-white/5">
        <div className="w-16 h-16 bg-white dark:bg-slate-900 rounded-2xl flex items-center justify-center mb-4 shadow-xl">
          <Feather className="w-8 h-8 text-slate-300" />
        </div>
        <p className="text-slate-500 dark:text-slate-400 font-bold">目前尚無羽毛變動紀錄</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-[2.5rem] border border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900/50 shadow-xl">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-white/5 text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-[0.2em]">
                <th className="px-6 py-4">時間</th>
                <th className="px-6 py-4 text-center">類型</th>
                <th className="px-6 py-4">說明</th>
                <th className="px-6 py-4 text-right">變動金額</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {transactions.map((t, idx) => {
                const isPositive = t.amount > 0;
                return (
                  <motion.tr
                    key={t.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    className="group hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-slate-500 dark:text-zinc-400 font-bold tabular-nums text-[11px]">
                        <Clock size={12} className="opacity-40" />
                        {new Date(t.created_at).toLocaleString('zh-TW', {
                          month: 'numeric',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: false
                        })}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={cn(
                        "inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider",
                        t.type === 'daily_claim' && "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400",
                        t.type === 'bet_placed' && "bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-400",
                        t.type === 'bet_won' && "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400",
                        t.type === 'bet_refund' && "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300",
                      )}>
                        {t.type === 'daily_claim' && '週三領取'}
                        {t.type === 'bet_placed' && '投注扣除'}
                        {t.type === 'bet_won' && '中獎派彩'}
                        {t.type === 'bet_refund' && '取消退款'}
                        {!['daily_claim', 'bet_placed', 'bet_won', 'bet_refund'].includes(t.type) && t.type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-slate-700 dark:text-zinc-200 font-black text-xs">
                        <Info size={12} className="text-slate-300 dark:text-zinc-600 shrink-0" />
                        <span className="line-clamp-1">{t.description || '—'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className={cn(
                        "inline-flex items-center gap-1 font-black tabular-nums text-sm",
                        isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                      )}>
                        {isPositive ? <ArrowUpRight size={14} /> : <ArrowDownLeft size={14} />}
                        {isPositive ? '+' : ''}{t.amount}
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-center text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest opacity-60">
        僅顯示最近 50 筆紀錄
      </p>
    </div>
  );
};
