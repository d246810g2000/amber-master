import React from 'react';
import { useQuery } from '@tanstack/react-query';
import * as gasApi from '../../lib/gasApi';
import TrendingUp from "lucide-react/dist/esm/icons/trending-up";
import TrendingDown from "lucide-react/dist/esm/icons/trending-down";
import Heart from "lucide-react/dist/esm/icons/heart";
import PieChart from "lucide-react/dist/esm/icons/pie-chart";

interface DailyAnalyticsWidgetsProps {
  date: string;
}

export const DailyAnalyticsWidgets: React.FC<DailyAnalyticsWidgetsProps> = ({ date }) => {
  const { data, isLoading } = useQuery({
    queryKey: ['dailyAnalytics', date],
    queryFn: () => gasApi.fetchDailyAnalytics(date),
    staleTime: 60000,
  });

  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-32 bg-slate-50 dark:bg-slate-800/50 rounded-[2rem] animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      {/* 戰力異動 */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={16} className="text-emerald-500" />
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">今日戰力異動</h4>
        </div>
        <div className="space-y-3">
          {data.gainers.map((g, i) => (
            <div key={i} className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{g.name}</span>
              <span className="text-xs font-black text-emerald-500">+{Math.round(g.diff)}</span>
            </div>
          ))}
          {data.losers.map((l, i) => (
            <div key={i} className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{l.name}</span>
              <span className="text-xs font-black text-rose-500">{Math.round(l.diff)}</span>
            </div>
          ))}
          {data.gainers.length === 0 && data.losers.length === 0 && (
            <p className="text-[10px] text-slate-400 italic">今日尚無顯著異動</p>
          )}
        </div>
      </div>

      {/* 黃金拍檔 */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Heart size={16} className="text-rose-500" />
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">今日黃金拍檔</h4>
        </div>
        <div className="space-y-3">
          {data.bestPartners.map((p, i) => (
            <div key={i} className="flex flex-col">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{p.names}</span>
              <div className="flex items-center gap-2 mt-0.5">
                <div className="flex-1 h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-rose-500" 
                    style={{ width: `${(p.wins/p.total)*100}%` }}
                  />
                </div>
                <span className="text-[9px] font-black text-slate-400">{p.wins}/{p.total} W</span>
              </div>
            </div>
          ))}
          {data.bestPartners.length === 0 && (
            <p className="text-[10px] text-slate-400 italic">今日尚無固定組合</p>
          )}
        </div>
      </div>

      {/* 階級比例 */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <PieChart size={16} className="text-amber-500" />
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">今日階級分佈</h4>
        </div>
        <div className="flex items-center gap-4 h-16">
          {[
            { key: 'Elite', label: 'Elite', color: 'text-amber-500', barColor: '#f59e0b' },
            { key: 'Advanced', label: 'Adv.', color: 'text-blue-500', barColor: '#3b82f6' },
            { key: 'Normal', label: 'Normal', color: 'text-slate-400', barColor: '#94a3b8' }
          ].map((tier, i) => {
            const dataTier = data.tiers[tier.key as keyof typeof data.tiers];
            return (
              <div key={tier.key} className={`group relative flex-1 flex flex-col items-center justify-center ${i < 2 ? 'border-r border-slate-100 dark:border-slate-800' : ''}`}>
                <span className="text-lg font-black text-slate-900 dark:text-white cursor-help">{dataTier.count}</span>
                <span className={`text-[8px] font-black ${tier.color} uppercase tracking-tighter`}>{tier.label}</span>
                
                {/* Tooltip */}
                <div className="absolute bottom-full mb-2 hidden group-hover:block z-50 w-40 bg-slate-900 text-white p-3 rounded-2xl shadow-2xl animate-in fade-in slide-in-from-bottom-2">
                  <p className="text-[10px] font-black border-b border-white/10 pb-1 mb-1">{tier.key} 階級成員</p>
                  <p className="text-[9px] text-slate-400 leading-relaxed">
                    {dataTier.names.length > 0 ? dataTier.names.slice(0, 15).join(', ') : '無'}
                    {dataTier.names.length > 15 && ' ...'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-2 flex h-1.5 rounded-full overflow-hidden">
          {Object.entries(data.tiers).map(([tier, info]) => {
            const total = data.tiers.Elite.count + data.tiers.Advanced.count + data.tiers.Normal.count;
            if (total === 0) return null;
            const colors = { Elite: '#f59e0b', Advanced: '#3b82f6', Normal: '#94a3b8' };
            return (
              <div 
                key={tier}
                style={{ 
                  width: `${(info.count / total) * 100}%`,
                  backgroundColor: colors[tier as keyof typeof colors]
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};
