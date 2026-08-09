import React from 'react';
import Loader2 from 'lucide-react/dist/esm/icons/loader-2';

interface TriviaGameEndedProps {
  score: number;
  correctAnswersCount: number;
  totalQuestions?: number;
  maxCombo: number;
  isSubmitting: boolean;
  submitResult: any;
  canEarnReward: boolean;
  nextReset?: string;
  onSubmit: () => void;
  onReturnToLobby: () => void;
  questions?: any[];
  userAnswers?: number[];
}

export const TriviaGameEnded: React.FC<TriviaGameEndedProps> = ({
  score,
  correctAnswersCount,
  totalQuestions = 4,
  maxCombo,
  isSubmitting,
  submitResult,
  canEarnReward,
  nextReset,
  onSubmit,
  onReturnToLobby,
  questions = [],
  userAnswers = [],
}) => {
  const [showDetails, setShowDetails] = React.useState(false);

  return (
    <div className="p-6 flex flex-col items-center justify-center space-y-6 text-center max-w-md mx-auto">
      <div className="text-4xl">🎓</div>
      <div>
        <h4 className="text-xl font-black mb-1">智力學堂挑戰完成！</h4>
        <p className="text-xs text-slate-400 font-semibold">
          你一共答對了 <span className="text-emerald-400 font-black">{correctAnswersCount}</span> / {totalQuestions} 題
        </p>
        <div className="text-4xl font-black text-amber-400 tracking-wider my-3 tabular-nums">
          {score} <span className="text-sm text-slate-400 font-bold">積分</span>
        </div>
        {maxCombo > 0 && (
          <span className="inline-block text-[10px] bg-indigo-950/60 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-full font-black mt-1">
            🔥 最高連擊：{maxCombo} Combo
          </span>
        )}
      </div>

      {questions.length > 0 && (
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-xs font-bold text-sky-400 hover:text-sky-300 underline decoration-sky-400/30 underline-offset-4"
        >
          {showDetails ? '隱藏答題紀錄' : '查看所有題目與解析'}
        </button>
      )}

      {showDetails && (
        <div className="w-full text-left space-y-3 max-h-[220px] overflow-y-auto pr-2 bg-slate-900/50 p-3 rounded-xl border border-slate-800">
          {questions.map((q, idx) => {
            const uAns = userAnswers[idx];
            const isCorrect = uAns === q.answerIndex;
            return (
              <div key={idx} className="bg-slate-900 border border-slate-800 p-3 rounded-lg">
                <p className="text-xs font-bold text-white mb-2 leading-relaxed">
                  <span className="text-slate-500 mr-1">Q{idx + 1}.</span>{q.question}
                </p>
                
                <div className="text-[10px] space-y-1 mb-2">
                  {q.options.map((opt: string, optIdx: number) => {
                    const isUserPick = uAns === optIdx;
                    const isActualCorrect = q.answerIndex === optIdx;
                    let colorClass = "text-slate-400";
                    let icon = "";
                    
                    // 只有在玩家答對的情況下，才顯示正確答案綠勾勾
                    if (isActualCorrect && isCorrect) {
                      colorClass = "text-emerald-400 font-bold";
                      icon = "✓ ";
                    } else if (isUserPick) {
                      colorClass = "text-red-400 font-bold line-through opacity-80";
                      icon = "✗ ";
                    }
                    
                    return (
                      <div key={optIdx} className={colorClass}>
                        {icon}{optIdx + 1}. {opt}
                      </div>
                    );
                  })}
                  {uAns === -1 && (
                    <div className="text-red-400 font-bold">✗ 超時未作答</div>
                  )}
                </div>
                
                <div className="mt-2 pt-2 border-t border-slate-800/60">
                  {isCorrect ? (
                    <p className="text-[10px] text-amber-400/90 font-semibold leading-relaxed">
                      💡 解析：{q.explanation}
                    </p>
                  ) : (
                    <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">
                      🔒 這題答錯囉！請在未來的挑戰中答對以解鎖正確答案與解析。
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Submission */}
      <div className="w-full pt-2">
        {!submitResult ? (
          <button
            onClick={onSubmit}
            disabled={isSubmitting}
            className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 active:scale-98 text-white font-extrabold py-3 px-6 rounded-xl shadow-lg shadow-amber-500/10 transition-all flex items-center justify-center gap-2 text-sm"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                正在儲存成績至雲端...
              </>
            ) : (
              canEarnReward ? '領取成績與羽毛獎勵' : '送出成績並結束 (練習模式)'
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
                className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-extrabold py-2 rounded-lg text-sm transition-colors"
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
        )}
      </div>
    </div>
  );
};
