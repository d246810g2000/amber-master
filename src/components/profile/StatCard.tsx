import React from 'react';
import { motion } from 'framer-motion';

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subValue?: string;
  unit?: string;
  theme?: 'emerald' | 'amber' | 'zinc';
}

export const StatCard: React.FC<StatCardProps> = ({
  icon, label, value, subValue, unit, theme = 'zinc'
}) => {
  const isPlayerName = typeof value === 'string' && value.length > 0;

  const themeStyles = {
    emerald: "hover:border-emerald-500/30 group-hover:text-emerald-500 dark:group-hover:text-emerald-400 glow-emerald",
    amber: "hover:border-amber-500/30 group-hover:text-amber-500 dark:group-hover:text-amber-400 glow-amber",
    zinc: "hover:border-slate-200 dark:border-white/10 group-hover:text-emerald-500 dark:group-hover:text-emerald-400"
  }[theme];

  const glowStyles = {
    emerald: "group-hover:bg-emerald-500/10",
    amber: "group-hover:bg-amber-500/10",
    zinc: "group-hover:bg-emerald-500/10"
  }[theme];

  const valueFontSize = (typeof value === 'string' && value.length > 10)
    ? "text-sm md:text-lg"
    : (typeof value === 'string' && value.length > 4)
    ? "text-lg md:text-2xl"
    : "text-2xl md:text-4xl";

  return (
    <div className={`group bg-slate-50 dark:bg-zinc-900/40 backdrop-blur-xl rounded-3xl sm:rounded-[2rem] p-0 border border-slate-100 dark:border-white/5 transition-all duration-300 ${themeStyles} hover:shadow-xl dark:hover:shadow-none overflow-hidden h-full flex flex-col`}>
      <div className={`p-3.5 sm:p-6 rounded-3xl sm:rounded-[2rem] transition-all flex flex-col flex-1 ${glowStyles}`}>
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="mb-2.5 sm:mb-4"
        >
          {icon}
        </motion.div>
        <div className="text-[9px] sm:text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-[0.2em] mb-1 sm:mb-2">{label}</div>
        <div className="flex items-baseline gap-1 sm:gap-1.5">
          <motion.span
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`${valueFontSize} font-black text-slate-900 dark:text-white tracking-tighter tabular-nums ${isPlayerName ? 'truncate max-w-full' : ''}`}
          >
            {value}
          </motion.span>
          {unit && <span className="text-xs sm:text-sm font-bold text-slate-400 dark:text-zinc-500">{unit}</span>}
        </div>
        <div className="mt-auto pt-1.5 sm:pt-2">
          {subValue ? (
            <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 dark:text-zinc-600 truncate">{subValue}</p>
          ) : (
            <div className="h-[13.5px] sm:h-[15px]" />
          )}
        </div>
      </div>
    </div>
  );
};
