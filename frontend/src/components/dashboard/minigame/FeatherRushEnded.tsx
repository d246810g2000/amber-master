import React from 'react';
import Loader2 from 'lucide-react/dist/esm/icons/loader-2';

interface FeatherRushEndedProps {
  score: number;
  isSubmitting: boolean;
  submitResult: any;
  isWagerMatch?: boolean;
  roomIsHost?: boolean;
  wagerAmount?: number;
  currentUserName?: string;
  nextReset?: string;
  onSubmit: () => void;
  onClose: () => void;
  onReturnToLobby: () => void;
}

export const FeatherRushEnded: React.FC<FeatherRushEndedProps> = ({
  score,
  isSubmitting,
  submitResult,
  isWagerMatch = false,
  roomIsHost = false,
  wagerAmount = 0,
  currentUserName = '',
  nextReset,
  onSubmit,
  onClose,
  onReturnToLobby,
}) => {
  const getResetMessage = (nextResetStr?: string) => {
    if (!nextResetStr) return '每週三可將本週最高分兌換為羽毛';
    return `每週三可將本週最高分兌換為羽毛，下一次重置：${nextResetStr}`;
  };

  return (
    <div className="p-6 flex flex-col items-center justify-center space-y-6 text-center max-w-md mx-auto">
      <div className="text-4xl">🚀</div>
      <div>
        <h4 className="text-xl font-black mb-1">衝鋒結束！</h4>
        <p className="text-xs text-slate-400 font-semibold">你本局共累積剩餘羽毛</p>
        <div className="text-4xl font-black text-amber-400 tracking-wider my-3 tabular-nums">
          {score} <span className="text-sm text-slate-400 font-bold">分</span>
        </div>
      </div>

      <div className="w-full pt-2">
        {isWagerMatch ? (
          !submitResult ? (
            <div className="flex flex-col items-center justify-center py-4 space-y-2 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
              <span className="text-xs font-bold">正在送出對戰分數...</span>
            </div>
          ) : submitResult.status === 'error' ? (
            <div className="space-y-4">
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-xs font-black">
                {submitResult.message}
              </div>
              <button
                onClick={onSubmit}
                className="w-full bg-violet-600 hover:bg-violet-500 text-white font-black py-3 rounded-xl transition-all"
              >
                重試提交
              </button>
            </div>
          ) : submitResult.settled === false ? (
            <div className="flex flex-col items-center py-4 space-y-3">
              <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
              <p className="text-xs text-slate-400 font-bold">{submitResult.message}</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-violet-500/10 border border-violet-500/20 text-violet-300 p-4 rounded-xl text-xs font-black leading-relaxed">
                {submitResult.winner === currentUserName ? '🎉 你贏了！' : '😢 對手獲勝'}
                <div className="mt-2 text-[10px] text-slate-400 font-semibold">
                  你: {score} 分 | 對手: {roomIsHost ? submitResult.guest_score : submitResult.host_score} 分
                </div>
                <div className="mt-1 text-amber-400">賭注: {wagerAmount} 羽毛</div>
              </div>
              <button
                onClick={onReturnToLobby}
                className="w-full bg-slate-800 hover:bg-slate-700 text-white font-black py-3 rounded-xl transition-all"
              >
                返回大廳
              </button>
            </div>
          )
        ) : !submitResult ? (
          <div className="space-y-3">
            <p className="text-[10px] text-slate-500 font-semibold">{getResetMessage(nextReset)}</p>
            <button
              disabled={isSubmitting}
              onClick={onSubmit}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 disabled:opacity-60 text-white font-black py-3 rounded-2xl shadow-lg transition-all"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {isSubmitting ? '登錄中...' : '登錄排行榜'}
            </button>
            <button
              onClick={onReturnToLobby}
              className="w-full text-slate-400 hover:text-white text-xs font-bold py-2 transition-colors"
            >
              返回大廳
            </button>
          </div>
        ) : submitResult.status === 'error' ? (
          <div className="space-y-4">
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-xs font-black">
              {submitResult.message}
            </div>
            <button
              onClick={onSubmit}
              className="w-full bg-violet-600 hover:bg-violet-500 text-white font-black py-3 rounded-xl transition-all"
            >
              重試提交
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl text-xs font-black">
              {submitResult.message || '分數已成功登錄排行榜！'}
            </div>
            <button
              onClick={onReturnToLobby}
              className="w-full bg-slate-800 hover:bg-slate-700 text-white font-black py-3 rounded-xl transition-all"
            >
              返回大廳
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
