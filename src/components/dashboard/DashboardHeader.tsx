import React from 'react';
import Settings from "lucide-react/dist/esm/icons/settings";
import Maximize from "lucide-react/dist/esm/icons/maximize";
import Minimize from "lucide-react/dist/esm/icons/minimize";
import { BannerAnimation } from '../BannerAnimation';
import { LoginButton } from '../auth/LoginButton';
import { cn } from '../../lib/utils';
import RefreshCw from "lucide-react/dist/esm/icons/refresh-cw";

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
  hasControl: boolean;
  currentControllerName: string;
  onTakeover: () => void;
  isSyncing: boolean;
  isGuest: boolean;
  isLockedByMe: boolean;
  isLockedByOther: boolean;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  loading, showBannerEgg, isFullscreen,
  onToggleBanner, onToggleFullscreen, onRefresh, onSettings,
  hasControl, currentControllerName, onTakeover, isSyncing, isGuest,
  isLockedByMe, isLockedByOther
}) => {
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
        </div>

        {/* Controls Group (All inline) */}
        <div className="flex items-center gap-1.5 md:gap-3 shrink-0 ml-auto">
          {/* Controller Status & Takeover */}
          <div className="flex items-center gap-1.5 md:gap-2 px-2 py-1 md:px-3 md:py-1.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 mr-1 md:mr-2 shrink-0">
            <span className={cn(
              "w-2 h-2 rounded-full",
              isLockedByMe ? "bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" : 
              isLockedByOther ? "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" : 
              "bg-slate-300 dark:bg-slate-600"
            )} />
            <div className="flex flex-col">
              <span className="hidden sm:block text-[9px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider leading-none">
                {isLockedByMe ? "您擁有控制權" : isLockedByOther ? "目前控制者" : "自由操作模式"}
              </span>
              <span className="text-[10px] md:text-[11px] font-black text-slate-700 dark:text-slate-200 leading-tight whitespace-nowrap overflow-hidden text-ellipsis max-w-[60px] sm:max-w-none">
                {isLockedByMe ? "已取得" : isLockedByOther ? currentControllerName : "未鎖定"}
              </span>
            </div>
            {!isLockedByMe && !isGuest && (
              <button
                onClick={onTakeover}
                disabled={isSyncing}
                className="ml-1 md:ml-2 px-2 py-1 bg-[#0f172a] hover:bg-slate-800 text-white text-[9px] md:text-[10px] font-black rounded-lg transition-all active:scale-95 disabled:opacity-50 border border-slate-700 whitespace-nowrap"
              >
                {isSyncing ? "..." : "取得"}
              </button>
            )}
          </div>

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
