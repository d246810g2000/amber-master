import React from 'react';
import Loader2 from 'lucide-react/dist/esm/icons/loader-2';

interface FeatherGameEndedProps {
  score: number;
  isSubmitting: boolean;
  submitResult: any;
  canEarnReward: boolean;
  isWagerMatch?: boolean;
  roomIsHost?: boolean;
  wagerAmount?: number;
  currentUserName?: string;
  nextReset?: string;
  onSubmit: () => void;
  onClose: () => void;
  onReturnToLobby: () => void;
}

export const FeatherGameEnded: React.FC<FeatherGameEndedProps> = ({
  score,
  isSubmitting,
  submitResult,
  canEarnReward,
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
    if (!nextResetStr) return '每週三可獲得一次羽毛獎勵 (無上限)';
    return `每週三可獲得一次羽毛獎勵 (無上限)，下一次重置時間為 ${nextResetStr}`;
  };

  return (
    <div className="p-6 flex flex-col items-center justify-center space-y-6 text-center max-w-md mx-auto">
      <div className="text-4xl">🏆</div>
      <div>
        <h4 className="text-xl font-black mb-1">挑戰時間結束！</h4>
        <p className="text-xs text-slate-400 font-semibold">你本局共獲得了</p>
        <div className="text-4xl font-black text-amber-400 tracking-wider my-3 tabular-nums">
          {score} <span className="text-sm text-slate-400 font-bold">分</span>
        </div>
      </div>

      {/* Submission */}
      <div className="w-full pt-2">
        {isWagerMatch ? (
          // 1v1 wager match layout
          !submitResult ? (
            <div className="flex flex-col items-center justify-center py-4 space-y-2 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-rose-500" />
              <span className="text-xs font-bold">正在送出對戰分數...</span>
            </div>
          ) : submitResult.status === 'error' ? (
            <div className="space-y-4">
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-xs font-black">
                ❌ 分數提交失敗: {submitResult.message || '未知錯誤'}
              </div>
              <button
                onClick={onSubmit}
                className="w-full bg-rose-500 hover:bg-rose-600 text-white font-extrabold py-3 rounded-xl text-sm transition-all active:scale-95"
              >
                重試提交
              </button>
            </div>
          ) : submitResult.settled === false ? (
            <div className="flex flex-col items-center justify-center p-6 bg-slate-900 border border-slate-850 rounded-2xl space-y-4">
              <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
              <div className="space-y-1">
                <p className="text-sm font-black text-white">成績已送出！</p>
                <p className="text-[11px] text-slate-400 font-bold">正在等待對手完成遊戲與結算...</p>
              </div>
            </div>
          ) : (
            // Settled (finished match)
            <div className="space-y-6">
              {(() => {
                const opponentScore = roomIsHost ? submitResult.guest_score : submitResult.host_score;
                const myScore = score;
                
                // Determine result by checking the winner's name directly (case-insensitive, trimmed)
                const isDraw = submitResult.winner?.trim().toLowerCase() === '平手';
                const isWin = submitResult.winner?.trim().toLowerCase() === currentUserName?.trim().toLowerCase();
                
                if (isWin) {
                  return (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-5 rounded-2xl space-y-3">
                      <div className="text-3xl">🎉</div>
                      <h5 className="text-lg font-black tracking-wide text-emerald-300">恭喜獲得勝利！</h5>
                      <p className="text-xs font-bold text-slate-300">
                        您獲得了 <span className="text-amber-400 font-extrabold">{wagerAmount * 2}</span> 根羽毛
                      </p>
                      <div className="text-[11px] text-slate-400 font-mono">
                        您的分數: {myScore} 分 | 對手分數: {opponentScore} 分
                      </div>
                    </div>
                  );
                } else if (!isDraw) {
                  return (
                    <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-5 rounded-2xl space-y-3">
                      <div className="text-3xl">💀</div>
                      <h5 className="text-lg font-black tracking-wide text-rose-300">很遺憾挑戰失敗！</h5>
                      <p className="text-xs font-bold text-slate-300">
                        扣除了 <span className="text-rose-400 font-extrabold">{wagerAmount}</span> 根羽毛
                      </p>
                      <div className="text-[11px] text-slate-400 font-mono">
                        您的分數: {myScore} 分 | 對手分數: {opponentScore} 分
                      </div>
                    </div>
                  );
                } else {
                  return (
                    <div className="bg-sky-500/10 border border-sky-500/20 text-sky-400 p-5 rounded-2xl space-y-3">
                      <div className="text-3xl">🤝</div>
                      <h5 className="text-lg font-black tracking-wide text-sky-300">雙方平手！</h5>
                      <p className="text-xs font-bold text-slate-300">
                        退還您的原賭注 <span className="text-amber-400 font-extrabold">{wagerAmount}</span> 根羽毛
                      </p>
                      <div className="text-[11px] text-slate-400 font-mono">
                        平手分數: {myScore} 分
                      </div>
                    </div>
                  );
                }
              })()}
              
              <button
                onClick={onReturnToLobby}
                className="w-full bg-slate-800 hover:bg-slate-700 text-white font-extrabold py-3 px-6 rounded-xl text-sm transition-all shadow-md active:scale-95"
              >
                返回大廳
              </button>
            </div>
          )
        ) : (
          // Single player standard layouts
          !submitResult ? (
            <button
              onClick={onSubmit}
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 active:scale-98 text-white font-extrabold py-3 px-6 rounded-xl shadow-lg shadow-emerald-500/10 transition-all flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  正在儲存獎勵至雲端...
                </>
              ) : (
                canEarnReward ? '領取並匯入羽毛獎勵' : '送出成績並結束 (練習模式)'
              )}
            </button>
          ) : submitResult?.status === 'success' ? (
            <div className="space-y-4">
              <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl text-xs font-black">
                🎉 {submitResult?.message}
              </div>
              <button
                onClick={onReturnToLobby}
                className="w-full bg-slate-800 hover:bg-slate-700 text-white font-extrabold py-2 px-6 rounded-lg text-sm transition-colors"
              >
                返回大廳
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-xs font-black">
                ❌ 領取失敗: {submitResult?.message || '未知錯誤'}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={onSubmit}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold py-2 rounded-lg text-sm transition-colors"
                >
                  重試領取
                </button>
                <button
                  onClick={onReturnToLobby}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-extrabold py-2 rounded-lg text-sm transition-colors"
                >
                  放棄回大廳
                </button>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
};

