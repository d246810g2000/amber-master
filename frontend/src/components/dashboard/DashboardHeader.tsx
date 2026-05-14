import React from 'react';
import { toast } from 'sonner';
import Settings from "lucide-react/dist/esm/icons/settings";
import Maximize from "lucide-react/dist/esm/icons/maximize";
import Minimize from "lucide-react/dist/esm/icons/minimize";
import Users from "lucide-react/dist/esm/icons/users";

import { BannerAnimation } from '../BannerAnimation';
import { LoginButton } from '../auth/LoginButton';
import { cn } from '../../lib/utils';
import RefreshCw from "lucide-react/dist/esm/icons/refresh-cw";
import Feather from "lucide-react/dist/esm/icons/feather";
import { useAuth } from '../../context/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as gasApi from '../../lib/gasApi';
import { getTaipeiDateString, isTaipeiWednesday } from '../../lib/utils';


const BadmintonIcon = ({ size = 24, className = "" }: { size?: number, className?: string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <g transform="rotate(35 12 18)" opacity="0.6">
      <ellipse cx="12" cy="6" rx="3.8" ry="5.5" />
      <path d="M12 11.5v5.8" />
      <path d="M12 18.2v3.2" />
      <path d="M11 11.5a2.5 2.5 0 0 0 2 0" opacity="0.4" />
      <g strokeWidth="0.8" opacity="0.2">
        <path d="M10.8 3.5v5M12 2.5v7M13.2 3.5v5" />
        <path d="M9 5h6M8.5 8h7M9.5 11h5" />
      </g>
      <path d="M11.1 19.5h1.8l0.4 3h-2.6z" fill="currentColor" opacity="0.6" stroke="none" />
    </g>
    <g transform="rotate(-35 12 18)">
      <ellipse cx="12" cy="6" rx="3.8" ry="5.5" />
      <path d="M12 11.5v10" />
      <path d="M11 11.5a2.5 2.5 0 0 0 2 0" opacity="0.4" />
      <g strokeWidth="0.8" opacity="0.2">
        <path d="M10.8 3.5v5M12 2.5v7M13.2 3.5v5" />
        <path d="M9 5h6M8.5 8h7M9.5 11h5" />
      </g>
      <path d="M11.1 19.5h1.8l0.4 3h-2.6z" fill="currentColor" opacity="0.6" stroke="none" />
    </g>
  </svg>
);

interface DashboardHeaderProps {
  loading: boolean;
  showBannerEgg: boolean;
  isFullscreen: boolean;
  onToggleBanner: () => void;
  onToggleFullscreen: () => void;
  onRefresh: () => void;
  onSettings: () => void;

  summary?: {
    totalMatches: number;
    activePlayerCount: number;
    averageInstantMu: number;
    controller: string;
    waitingCount: number;
  };
  onlineCount?: number;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  loading, showBannerEgg, isFullscreen,
  onToggleBanner, onToggleFullscreen, onRefresh, onSettings,

  summary, onlineCount
}) => {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [claiming, setClaiming] = React.useState(false);

  const bindingQuery = useQuery({
    queryKey: ['userBinding', currentUser?.email ?? ''],
    queryFn: () => gasApi.getUserBinding(currentUser!.email),
    enabled: !!currentUser?.email,
    staleTime: 30_000,
  });

  const basePlayersQuery = useQuery({
    queryKey: ['players-base'],
    queryFn: gasApi.fetchPlayers,
    enabled: !!currentUser?.email,
    staleTime: 60_000,
  });

  const boundPlayer = React.useMemo(() => {
    if (!bindingQuery.data?.isBound || !bindingQuery.data.playerId) return undefined;
    return basePlayersQuery.data?.find(p => p.id === bindingQuery.data.playerId);
  }, [bindingQuery.data, basePlayersQuery.data]);

  const hasClaimedToday = React.useMemo(() => {
    if (!boundPlayer?.last_feather_claim) return false;
    return boundPlayer.last_feather_claim === getTaipeiDateString();
  }, [boundPlayer]);

  const isGameDay = isTaipeiWednesday();

  const handleClaimFeathers = async () => {
    if (!currentUser?.email || claiming) return;
    setClaiming(true);
    try {
      const res = await gasApi.claimDailyFeathers(currentUser.email);
      if (res.status === 'success') {
        toast.success(res.message);
        queryClient.invalidateQueries({ queryKey: ['players-base'] });
      } else {
        toast.error(res.message);
      }
    } catch (err: any) {
      toast.error(err.message || '領取失敗');
    } finally {
      setClaiming(false);
    }
  };

  return (
    <header className="flex flex-col mb-4 md:mb-6 bg-white dark:bg-slate-900 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white dark:border-slate-800 shrink-0 overflow-hidden">
      <div className="flex flex-nowrap justify-between items-center p-3 md:p-5 gap-2 md:gap-0 overflow-x-auto scrollbar-hide">
        
        {/* Logo & Titles */}
        <div className="flex items-center gap-2 md:gap-4 shrink-0">
          <div
            className="bg-emerald-500 p-2 md:p-3 rounded-[12px] md:rounded-2xl shadow-xl shadow-emerald-100 flex items-center justify-center cursor-pointer hover:bg-emerald-600 active:scale-90 transition-all"
            onClick={onToggleBanner}
            title="🏸 小彩蛋"
          >
            <BadmintonIcon className="text-white w-5 h-5 md:w-6 md:h-6" />
          </div>
          <div className="flex flex-col justify-center">
            <h1 className="text-[17px] md:text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-none whitespace-nowrap">
              安柏排點大師
            </h1>
            <div className="flex items-center gap-1.5 mt-1 md:mt-1.5">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              <p className="text-[8px] md:text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] whitespace-nowrap">
                Amber Master
              </p>
            </div>
          </div>

          {/* Stats Summary (Desktop Only) */}
          {summary && (
            <div className="hidden xl:flex items-center gap-3 ml-6 pr-6 border-r border-slate-100 dark:border-slate-800">
              <div className="flex flex-col items-center">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">今日場次</span>
                <span className="text-sm font-black text-slate-900 dark:text-white tabular-nums">{summary.totalMatches}</span>
              </div>
              <div className="w-px h-6 bg-slate-100 dark:bg-slate-800" />
              <div className="flex flex-col items-center">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">參戰人數</span>
                <span className="text-sm font-black text-slate-900 dark:text-white tabular-nums">{summary.activePlayerCount}</span>
              </div>
              <div className="w-px h-6 bg-slate-100 dark:bg-slate-800" />
              <div className="flex flex-col items-center">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">平均 CP</span>
                <span className="text-sm font-black text-emerald-500 tabular-nums">{Math.round(summary.averageInstantMu * 10)}</span>
              </div>
            </div>
          )}

        </div>

        {/* Controls Group (All inline) */}
        <div className="flex items-center gap-2 md:gap-3 shrink-0 ml-auto pl-2">
          {/* Online Count */}
          <div className="flex items-center gap-1.5 px-2 py-1 md:px-3 md:py-1.5 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-100 dark:border-emerald-800/50 transition-all shrink-0" title="當前在線人數">
            <Users className="w-3 h-3 md:w-3.5 md:h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="text-[10px] md:text-[11px] font-black text-emerald-700 dark:text-emerald-300 tabular-nums">
              {onlineCount || 1}
            </span>
          </div>

          {/* Feathers */}
          {currentUser && (
            <div className="flex items-center gap-1.5 px-2 py-1 md:px-3 md:py-1.5 bg-sky-50 dark:bg-sky-900/20 rounded-xl border border-sky-100 dark:border-sky-800/50 transition-all shrink-0">
              <Feather className="w-3 h-3 md:w-3.5 md:h-3.5 text-sky-600 dark:text-sky-400" />
              <span className="text-[10px] md:text-[11px] font-black text-sky-700 dark:text-sky-300 tabular-nums">
                {boundPlayer?.feathers || 0}
              </span>
              {!hasClaimedToday && boundPlayer && isGameDay && (
                <button
                  onClick={handleClaimFeathers}
                  disabled={claiming}
                  className="ml-1 px-1.5 py-0.5 bg-sky-500 hover:bg-sky-600 text-white text-[8px] md:text-[10px] font-black rounded-lg transition-all active:scale-90 animate-bounce"
                  title="領取每日羽毛"
                >
                  {claiming ? '...' : '領取'}
                </button>
              )}
            </div>
          )}



          <button
            onClick={onToggleFullscreen}
            className="hidden sm:flex items-center justify-center bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 p-1.5 md:p-3 rounded-[10px] md:rounded-2xl transition-all active:scale-95 border border-slate-100 dark:border-slate-700 shrink-0"
            title="全螢幕模式"
          >
            {isFullscreen ? <Minimize className="w-3.5 h-3.5 md:w-5 md:h-5" /> : <Maximize className="w-3.5 h-3.5 md:w-5 md:h-5" />}
          </button>
          <button
            onClick={onSettings}
            className="flex items-center justify-center bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-slate-200 text-white dark:text-slate-900 p-1.5 md:p-3 rounded-[10px] md:rounded-2xl transition-all shadow-xl dark:shadow-none shadow-slate-200 active:scale-95 shrink-0"
            title="主控台"
          >
            <Settings className="w-3.5 h-3.5 md:w-5 md:h-5" />
          </button>

          <LoginButton />
        </div>

      </div>
      {showBannerEgg && <BannerAnimation />}
    </header>
  );
};
