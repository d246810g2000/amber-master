import React, { useState } from 'react';
import Play from 'lucide-react/dist/esm/icons/play';
import Lightbulb from 'lucide-react/dist/esm/icons/lightbulb';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, Lock } from 'lucide-react';
import { cn, getAvatarUrl } from '../../../lib/utils';
import * as gasApi from '../../../lib/gasApi';

const TRIVIA_CHAPTERS = [
  { id: 1, name: "雙打接殺與防守", icon: "🛡️", color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20" },
  { id: 2, name: "雙打輪轉與補位", icon: "🔄", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
  { id: 3, name: "發接發與網前封網", icon: "⚡", color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/20" },
  { id: 4, name: "中場平抽快攻與後場進攻", icon: "🔥", color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20" },
  { id: 5, name: "戰術閱讀與心理博弈", icon: "🧠", color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/20" },
  { id: 6, name: "雙打跑位與補位 (進階)", icon: "🏃", color: "text-cyan-400", bg: "bg-cyan-500/10", border: "border-cyan-500/20" }
];

interface TriviaGameMenuProps {
  leaderboard: any;
  playerName: string;
  playerEmail: string;
  eligibility: any;
  onStartGame: () => void;
}

export const TriviaGameMenu: React.FC<TriviaGameMenuProps> = ({
  leaderboard,
  playerName,
  playerEmail,
  eligibility,
  onStartGame,
}) => {
  const [leaderboardTab, setLeaderboardTab] = useState<'weekly' | 'allTime'>('weekly');
  const [activeMainTab, setActiveMainTab] = useState<'rules' | 'leaderboard' | 'collection'>('rules');
  const [selectedCollectionChapter, setSelectedCollectionChapter] = useState<number | null>(null);

  const { data: collection, isLoading: isCollectionLoading } = useQuery({
    queryKey: ['triviaCollection', playerEmail],
    queryFn: () => gasApi.fetchTriviaCollection(playerEmail),
    enabled: activeMainTab === 'collection' && !!playerEmail,
  });

  const getResetMessage = (nextResetStr?: string) => {
    if (!nextResetStr) return '每週三可獲得一次羽毛獎勵 (無上限)';
    return `每週三可獲得一次羽毛獎勵 (無上限)，下一次重置時間為 ${nextResetStr}`;
  };

  const triviaLeaderboard = leaderboard?.trivia || {};

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
        <button
          onClick={() => setActiveMainTab('collection')}
          className={cn(
            "flex-1 text-center py-2 text-xs font-black transition-colors rounded-xl",
            activeMainTab === 'collection'
              ? "bg-slate-800 text-white shadow-md border border-slate-700/50"
              : "text-slate-400 hover:text-white"
          )}
        >
          📚 題庫收集冊
        </button>
      </div>

      {/* Tab Contents */}
      <div className="p-5 overflow-y-auto max-h-[290px] flex-1">
        {activeMainTab === 'rules' ? (
          <div className="flex flex-col space-y-4">
            <div className="flex flex-col items-center space-y-3 text-center">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center shadow-xl shadow-amber-500/20 animate-pulse">
                <Lightbulb className="w-6 h-6 text-white" />
              </div>
              <div>
                <h4 className="text-base font-extrabold mb-1">羽球小學堂</h4>
                <p className="text-xs text-slate-400 leading-relaxed font-semibold">
                  總共 6 題羽毛球競賽規則與冷知識問答。答題越快分數越高，連續答對還有 Combo 加成喔！
                </p>
              </div>
            </div>

            <div className="w-full space-y-2 text-left bg-slate-900 border border-slate-800/60 p-3 rounded-xl text-xs font-semibold text-slate-300">
              <div className="flex items-center gap-2">
                <span className="text-emerald-400">⏱️ 每題限時：</span>
                <span>15 秒 (越快答對分數越多)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-amber-400">🔥 連擊加成：</span>
                <span>連續答對獲得更高乘數加成！</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-indigo-400">🎁 獎勵規則：</span>
                <span>答對越多題，累計的積分越高。</span>
              </div>
            </div>
          </div>
        ) : activeMainTab === 'leaderboard' ? (
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
              {(!triviaLeaderboard || (leaderboardTab === 'weekly' ? !triviaLeaderboard.weekly || triviaLeaderboard.weekly.length === 0 : !triviaLeaderboard.allTime || triviaLeaderboard.allTime.length === 0)) ? (
                <div className="flex flex-col items-center justify-center py-10 text-slate-500 text-[10px] font-bold">
                  <span>🎓 暫無排行數據</span>
                  <span className="mt-1 text-[9px] text-slate-600">(登錄練習模式與挑戰模式的最佳成績)</span>
                </div>
              ) : (
                (leaderboardTab === 'weekly' ? triviaLeaderboard.weekly : triviaLeaderboard.allTime).map((item: any, i: number) => (
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
                        <span className="text-[9px] text-slate-500 font-semibold">積分</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col space-y-3 h-full">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              {selectedCollectionChapter === null ? (
                <span className="text-[10px] font-black tracking-wider text-slate-400">已解鎖題庫圖鑑</span>
              ) : (
                <button
                  onClick={() => setSelectedCollectionChapter(null)}
                  className="flex items-center gap-1 text-[10px] font-black tracking-wider text-slate-400 hover:text-white transition-colors"
                >
                  <ChevronLeft className="w-3 h-3" /> 返回章節
                </button>
              )}
              <span className="text-[10px] font-black tracking-wider text-amber-400">
                進度：{collection ? collection.length : 0} / 120
              </span>
            </div>

            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {isCollectionLoading ? (
                <div className="flex justify-center py-4"><span className="text-slate-500 text-xs">載入中...</span></div>
              ) : selectedCollectionChapter === null ? (
                // 章節視圖 (第一層)
                <div className="grid grid-cols-2 gap-2">
                  {TRIVIA_CHAPTERS.map(chapter => {
                    const chapterUnlockedCount = collection ? collection.filter((q: any) => q.chapter === chapter.id).length : 0;
                    return (
                      <button
                        key={chapter.id}
                        onClick={() => setSelectedCollectionChapter(chapter.id)}
                        className={cn(
                          "flex flex-col items-center justify-center p-3 rounded-xl border transition-all hover:scale-105 active:scale-95",
                          chapter.bg,
                          chapter.border
                        )}
                      >
                        <span className="text-2xl mb-1">{chapter.icon}</span>
                        <span className={cn("text-[10px] font-black text-center leading-tight mb-1", chapter.color)}>
                          {chapter.name}
                        </span>
                        <div className="w-full mt-1">
                          <div className="flex justify-between items-center mb-0.5">
                            <span className="text-[8px] text-slate-400 font-bold">收集進度</span>
                            <span className="text-[8px] font-black text-white">{chapterUnlockedCount}/20</span>
                          </div>
                          <div className="w-full bg-slate-900/50 rounded-full h-1 overflow-hidden">
                            <div
                              className={cn("h-full transition-all", chapterUnlockedCount === 20 ? "bg-amber-400 shadow-[0_0_5px_#fbbf24]" : "bg-slate-400")}
                              style={{ width: `${(chapterUnlockedCount / 20) * 100}%` }}
                            />
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                // 槽位視圖 (第二層)
                <div className="space-y-2">
                  {Array.from({ length: 20 }).map((_, slotIdx) => {
                    const chapterQuestions = collection?.filter((q: any) => q.chapter === selectedCollectionChapter) || [];
                    // 根據目前擁有的題數，順序填入。未解鎖的顯示鎖頭。
                    const q = chapterQuestions[slotIdx];

                    if (!q) {
                      return (
                        <div key={slotIdx} className="bg-slate-950/50 border border-slate-800/40 p-3 rounded-lg flex flex-col items-center justify-center py-4">
                          <Lock className="w-4 h-4 text-slate-600 mb-1" />
                          <span className="text-[10px] font-bold text-slate-500">??? 尚未解鎖</span>
                        </div>
                      );
                    }

                    return (
                      <div key={slotIdx} className="bg-slate-900 border border-slate-700/60 p-3 rounded-lg shadow-sm">
                        <p className="text-[11px] font-black text-white mb-2 leading-relaxed">
                          <span className="text-slate-500 mr-1">Q{slotIdx + 1}.</span>{q.question}
                        </p>
                        <div className="text-[10px] space-y-1 mb-2 font-semibold">
                          {q.options.map((opt: string, optIdx: number) => {
                            const isCorrect = q.answerIndex === optIdx;
                            return (
                              <div key={optIdx} className={isCorrect ? "text-emerald-400 font-black" : "text-slate-500"}>
                                {isCorrect ? "✓ " : ""}{optIdx + 1}. {opt}
                              </div>
                            );
                          })}
                        </div>
                        <div className="mt-2 pt-2 border-t border-slate-800/60">
                          <p className="text-[10px] text-amber-400/90 font-bold leading-relaxed">
                            💡 解析：{q.explanation}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
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
          className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 active:scale-98 text-white font-extrabold py-2.5 px-6 rounded-xl shadow-lg shadow-amber-500/10 transition-all flex items-center justify-center gap-2 text-sm"
        >
          <Play className="w-4 h-4 fill-current" />
          {eligibility?.canEarnReward ? '開始挑戰小學堂 (6 題限時答題)' : '開始練習模式 (6 題限時答題)'}
        </button>
      </div>
    </div>
  );
};
