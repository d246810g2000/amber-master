import React, { useState } from 'react';
import Play from 'lucide-react/dist/esm/icons/play';
import { cn, getAvatarUrl } from '../../../lib/utils';

interface FeatherRushMenuProps {
  leaderboard: any;
  playerName: string;
  eligibility: any;
  onStartGame: () => void;
  startError?: string | null;
}

export const FeatherRushMenu: React.FC<FeatherRushMenuProps> = ({
  leaderboard,
  playerName,
  eligibility,
  onStartGame,
  startError,
}) => {
  const [leaderboardTab, setLeaderboardTab] = useState<'weekly' | 'allTime'>('weekly');
  const [activeMainTab, setActiveMainTab] = useState<'rules' | 'leaderboard'>('rules');

  const rushBoard = leaderboard?.feather_rush || {};
  const boardList = leaderboardTab === 'weekly' ? rushBoard.weekly : rushBoard.allTime;

  const getResetMessage = (nextResetStr?: string) => {
    if (!nextResetStr) return '每週三可獲得一次羽毛獎勵 (無上限)';
    return `每週三可獲得一次羽毛獎勵 (無上限)，下一次重置時間為 ${nextResetStr}`;
  };

  return (
    <div className="flex flex-col overflow-hidden">
      <div className="flex border-b border-slate-800 bg-slate-950/60 p-1 shrink-0">
        <button
          onClick={() => setActiveMainTab('rules')}
          className={cn(
            'flex-1 text-center py-2 text-xs font-black transition-colors rounded-xl',
            activeMainTab === 'rules'
              ? 'bg-slate-800 text-white shadow-md border border-slate-700/50'
              : 'text-slate-400 hover:text-white'
          )}
        >
          📖 比賽規則
        </button>
        <button
          onClick={() => setActiveMainTab('leaderboard')}
          className={cn(
            'flex-1 text-center py-2 text-xs font-black transition-colors rounded-xl',
            activeMainTab === 'leaderboard'
              ? 'bg-slate-800 text-white shadow-md border border-slate-700/50'
              : 'text-slate-400 hover:text-white'
          )}
        >
          🏆 球場排行
        </button>
      </div>

      <div className="p-5 overflow-y-auto max-h-[290px] flex-1">
        {activeMainTab === 'rules' ? (
          <div className="flex flex-col space-y-4">
            <div className="flex flex-col items-center space-y-3 text-center">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-sky-500 to-violet-600 flex items-center justify-center shadow-xl shadow-sky-500/20 animate-pulse">
                <span className="text-2xl">🏸</span>
              </div>
              <div>
                <h4 className="text-base font-extrabold mb-1">飛羽衝鋒 · 左右走位殺球</h4>
                <p className="text-xs text-slate-400 leading-relaxed font-semibold">
                  沿用接羽毛的左右移動，羽球會自動向前射。對準敵人、閃避撞擊、穿數字門，50 秒迎戰 Boss！
                </p>
              </div>
            </div>

            <div className="w-full grid grid-cols-2 gap-2 text-left bg-slate-900 border border-slate-800/60 p-3 rounded-xl text-[10px] font-semibold text-slate-300">
              <div>🪶 開局 80 羽毛</div>
              <div>⏱️ 固定 60 秒一場</div>
              <div>⬅️➡️ 自由左右移動</div>
              <div>🏸 羽球自動向前射擊</div>
              <div>🚪 射門改數字／移動通過</div>
              <div>🔥 連擊 10 觸發 FEVER</div>
              <div className="col-span-2 border-t border-slate-800/50 pt-1.5 mt-0.5 text-sky-300">
                敵人與數字門由遠逼近 → 左右對準自動射擊 → 射門改變數值 → 通過結算 → 50 秒 Boss。分數＝剩餘羽毛
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col space-y-3 h-full">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <span className="text-[10px] font-black tracking-wider text-slate-400">📊 飛羽衝鋒排名</span>
              <div className="flex bg-slate-950 p-0.5 rounded-lg border border-slate-800/60">
                <button
                  onClick={() => setLeaderboardTab('weekly')}
                  className={cn(
                    'text-[9px] font-bold px-2 py-0.5 rounded transition-colors',
                    leaderboardTab === 'weekly'
                      ? 'bg-slate-800 text-white font-black'
                      : 'text-slate-400 hover:text-white'
                  )}
                >
                  本週
                </button>
                <button
                  onClick={() => setLeaderboardTab('allTime')}
                  className={cn(
                    'text-[9px] font-bold px-2 py-0.5 rounded transition-colors',
                    leaderboardTab === 'allTime'
                      ? 'bg-slate-800 text-white font-black'
                      : 'text-slate-400 hover:text-white'
                  )}
                >
                  歷史最高
                </button>
              </div>
            </div>

            <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
              {!boardList || boardList.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-slate-500 text-[10px] font-bold">
                  <span>🏸 暫無排行數據</span>
                  <span className="mt-1 text-[9px] text-slate-600">完成一場即可登錄排行榜</span>
                </div>
              ) : (
                boardList.map((item: any, i: number) => (
                  <div
                    key={i}
                    className={cn(
                      'flex items-center justify-between p-2 rounded-xl border transition-all',
                      i === 0
                        ? 'bg-violet-500/10 border-violet-500/20'
                        : i === 1
                          ? 'bg-slate-400/10 border-slate-400/20'
                          : i === 2
                            ? 'bg-fuchsia-700/10 border-fuchsia-700/20'
                            : 'bg-slate-900/40 border-slate-800/40'
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
                    <div className="flex items-center gap-0.5">
                      <span className="text-xs font-black text-violet-400 tabular-nums">
                        {item.score}
                      </span>
                      <span className="text-[9px] text-slate-500 font-semibold">分</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-slate-800 bg-slate-950/80 shrink-0 space-y-2">
        <p className="text-[9px] text-center text-slate-500 font-semibold leading-relaxed">
          {getResetMessage(eligibility?.nextReset)}
        </p>
        {startError && (
          <p className="text-[10px] text-center text-rose-400 font-bold leading-relaxed px-1">
            {startError}
          </p>
        )}
        <button
          onClick={onStartGame}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-sky-600 to-violet-600 hover:from-sky-500 hover:to-violet-500 text-white font-black py-3 rounded-2xl shadow-lg shadow-sky-500/20 active:scale-98 transition-all"
        >
          <Play className="w-4 h-4 fill-current" />
          上場殺球
        </button>
      </div>
    </div>
  );
};
