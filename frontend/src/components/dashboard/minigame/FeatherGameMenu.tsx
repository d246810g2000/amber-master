import React, { useState } from 'react';
import Play from 'lucide-react/dist/esm/icons/play';
import { GameFeatherIcon, GameBombIcon, GameRockIcon } from './FeatherGameCanvas';
import { cn, getAvatarUrl } from '../../../lib/utils';

interface FeatherGameMenuProps {
  leaderboard: any;
  playerName: string;
  eligibility: any;
  onStartGame: () => void;
}

export const FeatherGameMenu: React.FC<FeatherGameMenuProps> = ({
  leaderboard,
  playerName,
  eligibility,
  onStartGame,
}) => {
  const [leaderboardTab, setLeaderboardTab] = useState<'weekly' | 'allTime'>('weekly');
  const [activeMainTab, setActiveMainTab] = useState<'rules' | 'leaderboard'>('rules');

  const getResetMessage = (nextResetStr?: string) => {
    if (!nextResetStr) return '每週三可獲得一次羽毛獎勵 (無上限)';
    return `每週三可獲得一次羽毛獎勵 (無上限)，下一次重置時間為 ${nextResetStr}`;
  };

  return (
    <div className="flex flex-col overflow-hidden">
      {/* Main Tab Switcher */}
      <div className="flex border-b border-slate-800 bg-slate-950/60 p-1 shrink-0">
        <button
          onClick={() => setActiveMainTab('rules')}
          className={cn(
            "flex-1 text-center py-2 text-xs font-black transition-colors rounded-xl",
            activeMainTab === 'rules'
              ? "bg-slate-800 text-white shadow-md border border-slate-700/50"
              : "text-slate-400 hover:text-white"
          )}
        >
          📖 遊戲規則
        </button>
        <button
          onClick={() => setActiveMainTab('leaderboard')}
          className={cn(
            "flex-1 text-center py-2 text-xs font-black transition-colors rounded-xl",
            activeMainTab === 'leaderboard'
              ? "bg-slate-800 text-white shadow-md border border-slate-700/50"
              : "text-slate-400 hover:text-white"
          )}
        >
          🏆 挑戰排行
        </button>
      </div>

      {/* Tab Contents */}
      <div className="p-5 overflow-y-auto max-h-[290px] flex-1">
        {activeMainTab === 'rules' ? (
          <div className="flex flex-col space-y-4">
            <div className="flex flex-col items-center space-y-3 text-center">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center shadow-xl shadow-sky-500/20 animate-pulse">
                <GameFeatherIcon color="#ffffff" glow={true} className="w-6 h-8" />
              </div>
              <div>
                <h4 className="text-base font-extrabold mb-1">接羽毛！拿獎勵！</h4>
                <p className="text-xs text-slate-400 leading-relaxed font-semibold">
                  點擊畫面左右側或按 A/D 鍵移動推車。接住羽毛累積得分，避開炸彈與落石！難度每 10 秒將會升級。
                </p>
              </div>
            </div>

            {/* Rules & Rewards Preview */}
            <div className="w-full grid grid-cols-2 gap-2 text-left bg-slate-900 border border-slate-800/60 p-3 rounded-xl text-[10px] font-semibold text-slate-300">
              <div className="flex items-center gap-1.5">
                <GameFeatherIcon color="#38bdf8" />
                <span>普通羽毛 (+5)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <GameFeatherIcon color="#fbbf24" glow={true} />
                <span>金色羽毛 (+20)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <GameFeatherIcon color="#d946ef" glow={true} />
                <span>超級羽毛 (+50)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <GameBombIcon />
                <span>黑色炸彈 (-30 & 眩暈)</span>
              </div>
              <div className="flex items-center gap-1.5 col-span-2 border-t border-slate-800/50 pt-1.5 mt-0.5">
                <GameRockIcon />
                <span>灰色落石 (-10 根，無眩暈)</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col space-y-3 h-full">
            {/* Sub-tabs for leaderboard */}
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <span className="text-[10px] font-black tracking-wider text-slate-400">📊 點數結算排名</span>
              <div className="flex bg-slate-950 p-0.5 rounded-lg border border-slate-800/60">
                <button
                  onClick={() => setLeaderboardTab('weekly')}
                  className={cn(
                    "text-[9px] font-bold px-2 py-0.5 rounded transition-colors",
                    leaderboardTab === 'weekly'
                      ? "bg-slate-800 text-white font-black"
                      : "text-slate-400 hover:text-white"
                  )}
                >
                  本週
                </button>
                <button
                  onClick={() => setLeaderboardTab('allTime')}
                  className={cn(
                    "text-[9px] font-bold px-2 py-0.5 rounded transition-colors",
                    leaderboardTab === 'allTime'
                      ? "bg-slate-800 text-white font-black"
                      : "text-slate-400 hover:text-white"
                  )}
                >
                  歷史最高
                </button>
              </div>
            </div>

            {/* Rank List */}
            <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
              {(!leaderboard || (leaderboardTab === 'weekly' ? !leaderboard.weekly || leaderboard.weekly.length === 0 : !leaderboard.allTime || leaderboard.allTime.length === 0)) ? (
                <div className="flex flex-col items-center justify-center py-10 text-slate-500 text-[10px] font-bold">
                  <span>🪶 暫無排行數據</span>
                  <span className="mt-1 text-[9px] text-slate-600">(登錄練習模式與挑戰模式的最佳成績)</span>
                </div>
              ) : (
                (leaderboardTab === 'weekly' ? leaderboard.weekly : leaderboard.allTime).map((item: any, i: number) => (
                  <div
                    key={i}
                    className={cn(
                      "flex items-center justify-between p-2 rounded-xl border transition-all",
                      i === 0 
                        ? "bg-amber-500/10 border-amber-500/20" 
                        : i === 1 
                          ? "bg-slate-400/10 border-slate-400/20" 
                          : i === 2 
                            ? "bg-amber-700/10 border-amber-700/20" 
                            : "bg-slate-900/40 border-slate-800/40"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-5 text-center text-xs font-black text-slate-400">
                        {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                      </span>
                      <img
                        src={getAvatarUrl(item.avatar, item.name)}
                        alt={item.name}
                        className="w-5 h-5 rounded-full object-cover border border-slate-700"
                      />
                      <span className="text-xs font-bold text-white max-w-[120px] truncate">
                        {item.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {item.maxCombo > 0 && (
                        <span className="text-[8px] bg-indigo-950/60 text-indigo-400 border border-indigo-500/20 px-1 py-0.5 rounded font-black whitespace-nowrap">
                          🔥 {item.maxCombo} Combo
                        </span>
                      )}
                      <div className="flex items-center gap-0.5">
                        <span className="text-xs font-black text-amber-400 tabular-nums">
                          {item.score}
                        </span>
                        <span className="text-[9px] text-slate-500 font-semibold">分</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Notice & Play Button */}
      <div className="p-5 border-t border-slate-800/60 bg-slate-900/20 space-y-3 shrink-0">
        {/* Notice */}
        <div className="w-full bg-slate-900/80 border border-slate-800/50 p-3 rounded-xl text-center">
          {eligibility?.canEarnReward ? (
            <p className="text-[11px] text-emerald-400 font-black">
              🏆 本次挑戰成功將可獲得 1:1 的羽毛獎勵！(無上限限制)
            </p>
          ) : eligibility?.alreadyClaimed ? (
            <p className="text-[11px] text-amber-500 font-black">
              ℹ️ 練習模式：您本週三已領取過羽毛獎勵囉。
            </p>
          ) : (
            <p className="text-[11px] text-amber-500 font-black">
              ℹ️ 練習模式：今天非週三，挑戰僅作練習、不發放羽毛。
            </p>
          )}
          <p className="text-[9px] text-slate-500 font-semibold mt-1">
            {getResetMessage(eligibility?.nextReset)}
          </p>
        </div>

        {/* Play Button */}
        <button
          onClick={onStartGame}
          className="w-full bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 active:scale-98 text-white font-extrabold py-2.5 px-6 rounded-xl shadow-lg shadow-sky-500/10 transition-all flex items-center justify-center gap-2 text-sm"
        >
          <Play className="w-4 h-4 fill-current" />
          {eligibility?.canEarnReward ? '立即開始挑戰 (限時 30 秒)' : '開始練習模式 (限時 30 秒)'}
        </button>
      </div>
    </div>
  );
};
