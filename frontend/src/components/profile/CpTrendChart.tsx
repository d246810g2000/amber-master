import React from 'react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import Activity from "lucide-react/dist/esm/icons/activity";
import type { CombinedTrendPoint } from '../../hooks/usePlayerProfile';

const THEME_COLORS = {
  career: "#10b981",
  instant: "#f59e0b",
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const careerMu = payload[0].payload.matchMu;
    const instantMu = payload[0].payload.dailyMu;
    const diff = Math.round((instantMu - careerMu) * 10);
    const isHot = diff > 0;

    return (
      <div className="bg-white/95 dark:bg-zinc-950/95 backdrop-blur-xl border border-slate-200 dark:border-white/10 p-4 rounded-2xl shadow-2xl ring-1 ring-black/5 dark:ring-white/10 min-w-[180px]">
        <p className="text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-[0.2em] mb-3 border-b border-slate-100 dark:border-white/5 pb-2">
          {payload[0].payload.date}
        </p>
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-2.5">
              <div className="w-2 h-2 rounded-full shadow-lg" style={{ backgroundColor: THEME_COLORS.career }} />
              <span className="text-[11px] font-bold text-slate-500 dark:text-zinc-400">生涯戰力</span>
            </div>
            <span className="text-xs font-black text-slate-900 dark:text-white tabular-nums">
              {Math.round(careerMu * 10)} CP
            </span>
          </div>
          <div className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-2.5">
              <div className="w-2 h-2 rounded-full shadow-lg" style={{ backgroundColor: THEME_COLORS.instant }} />
              <span className="text-[11px] font-bold text-slate-500 dark:text-zinc-400">即時戰力</span>
            </div>
            <span className="text-xs font-black text-slate-900 dark:text-white tabular-nums">
              {Math.round(instantMu * 10)} CP
            </span>
          </div>
          <div className="pt-2 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase">競技狀態</span>
            <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${isHot ? 'bg-amber-500/10 text-amber-500' : 'bg-slate-500/10 text-slate-500'}`}>
              {isHot ? `HOT (+${diff})` : diff < 0 ? `COLD (${diff})` : 'NORMAL'}
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

interface CpTrendChartProps {
  combinedTrend: CombinedTrendPoint[];
}

export const CpTrendChart: React.FC<CpTrendChartProps> = ({ combinedTrend }) => {
  return (
    <div className="bg-slate-50 dark:bg-zinc-900/40 border border-slate-100 dark:border-white/5 rounded-[3rem] p-6 sm:p-10 shadow-lg dark:shadow-2xl transition-all">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 sm:gap-0 mb-8 sm:mb-10">
        <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-[0.2em] flex items-center gap-3 shrink-0">
          <Activity className="w-5 h-5 text-emerald-500" />
          戰力分佈演進
        </h3>
        <div className="flex gap-4 sm:gap-6 self-start sm:self-auto flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/20" />
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-slate-700 dark:text-zinc-200 uppercase tracking-widest">生涯戰力</span>
              <span className="text-[8px] font-bold text-slate-400 dark:text-zinc-500">長期穩定的技術累積</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-lg shadow-amber-500/20" />
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-slate-700 dark:text-zinc-200 uppercase tracking-widest">即時戰力</span>
              <span className="text-[8px] font-bold text-slate-400 dark:text-zinc-500">當前手感與競技狀態</span>
            </div>
          </div>
        </div>
      </div>

      <div className="h-[360px] w-full overflow-hidden">
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <AreaChart data={combinedTrend}>
            <defs>
              <linearGradient id="colorCareer" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={THEME_COLORS.career} stopOpacity={0.15}/>
                <stop offset="95%" stopColor={THEME_COLORS.career} stopOpacity={0.01}/>
              </linearGradient>
              <linearGradient id="colorHot" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={THEME_COLORS.instant} stopOpacity={0.4}/>
                <stop offset="95%" stopColor={THEME_COLORS.instant} stopOpacity={0.1}/>
              </linearGradient>
              <linearGradient id="colorCold" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#71717a" stopOpacity={0.2}/>
                <stop offset="95%" stopColor="#71717a" stopOpacity={0.05}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} stroke="#94a3b8" vertical={false} />
            <XAxis
              dataKey="chartKey"
              hide={false}
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 800 }}
              dy={10}
              minTickGap={30}
              interval="preserveStartEnd"
              padding={{ left: 15, right: 15 }}
              tickFormatter={(value) => value.split('-').slice(0, 3).join('/')}
            />
            <YAxis hide domain={['dataMin - 2', 'dataMax + 2']} />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="matchMu"
              name="生涯戰力"
              stroke={THEME_COLORS.career}
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorCareer)"
              animationDuration={1500}
            />
            <Area
              type="monotone"
              dataKey="dailyMu"
              name="即時戰力"
              stroke={THEME_COLORS.instant}
              strokeWidth={4}
              strokeDasharray="4 4"
              fill="none"
              animationDuration={2000}
            />
            {/* 表現差距填充 */}
            <Area
              type="monotone"
              dataKey={(d: any) => [d.matchMu, d.dailyMu]}
              stroke="none"
              fill="url(#colorHot)"
              connectNulls
              fillOpacity={0.3}
              animationDuration={2000}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
