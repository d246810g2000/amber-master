import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as gasApi from '../../lib/gasApi';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell
} from 'recharts';

interface RatingDistributionChartProps {
  type: 'instant' | 'comprehensive';
  title: string;
  color: string;
  date: string;
}

export const RatingDistributionChart: React.FC<RatingDistributionChartProps> = ({ type, title, color, date }) => {
  const { data, isLoading } = useQuery({
    queryKey: ['ratingDistribution', date],
    queryFn: () => gasApi.fetchRatingDistribution(date),
    staleTime: 60000,
  });

  const chartData = useMemo(() => {
    if (!data) return [];
    const values = data[type];
    if (values.length === 0) return [];

    // Binning logic (e.g., every 25 points)
    const BIN_SIZE = 25;
    const bins: Record<number, { count: number, names: string[] }> = {};
    
    values.forEach(item => {
      const mu = item.mu * 10;
      const binKey = Math.floor(mu / BIN_SIZE) * BIN_SIZE;
      if (!bins[binKey]) bins[binKey] = { count: 0, names: [] };
      bins[binKey].count += 1;
      bins[binKey].names.push(item.name);
    });

    const sortedKeys = Object.keys(bins).map(Number).sort((a, b) => a - b);
    const min = Math.min(...sortedKeys, 150);
    const max = Math.max(...sortedKeys, 350);

    const result = [];
    for (let i = min; i <= max; i += BIN_SIZE) {
      result.push({
        range: `${i}`,
        count: bins[i]?.count || 0,
        names: bins[i]?.names || []
      });
    }
    return result;
  }, [data, type]);

  if (isLoading) {
    return (
      <div className="h-48 flex items-center justify-center bg-slate-50 dark:bg-slate-800/50 rounded-2xl animate-pulse">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading Chart...</span>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col h-full">
      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
        {title}
      </h4>
      
      <div className="h-[250px] w-full">
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" opacity={0.5} />
            <XAxis 
              dataKey="range" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 9, fontWeight: 900, fill: '#94a3b8' }}
              interval={1}
            />
            <YAxis hide />
            <Tooltip 
              cursor={{ fill: 'rgba(0,0,0,0.02)' }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const item = payload[0].payload;
                  return (
                    <div className="bg-slate-900 text-white px-3 py-2 rounded-xl shadow-xl max-w-[200px]">
                      <p className="text-[10px] font-black border-b border-white/10 pb-1 mb-1">{item.count} 位球員 ({item.range} 區間)</p>
                      <p className="text-[9px] text-slate-400 leading-relaxed truncate">
                        {item.names.slice(0, 10).join(', ')}
                        {item.names.length > 10 && ' ...'}
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={color} fillOpacity={0.8} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
