import React from 'react';
import Lightbulb from 'lucide-react/dist/esm/icons/lightbulb';
import Loader2 from 'lucide-react/dist/esm/icons/loader-2';
import { GameFeatherIcon } from './FeatherGameCanvas';
import { GAME_DISPLAY_NAMES, MiniGameType } from './types';

interface GameLobbyProps {
  playerName: string;
  featherHighScore: number;
  triviaHighScore: number;
  featherRushHighScore: number;
  weeklyClaimStatus?: any;
  isClaiming?: boolean;
  onClaimWeeklyScore?: (gameType: string) => void;
  claimResult?: { status: 'success' | 'error'; message: string } | null;
  onSelectFeather: () => void;
  onSelectTrivia: () => void;
  onSelectFeatherRush: () => void;
  onOpenWagerRooms: () => void;
}

export const GameLobby: React.FC<GameLobbyProps> = ({
  playerName,
  featherHighScore,
  triviaHighScore,
  featherRushHighScore,
  weeklyClaimStatus,
  isClaiming = false,
  onClaimWeeklyScore,
  claimResult = null,
  onSelectFeather,
  onSelectTrivia,
  onSelectFeatherRush,
  onOpenWagerRooms,
}) => {
  const getClaimedGameLabel = (gameType: string | null) => {
    if (!gameType) return '小遊戲';
    return GAME_DISPLAY_NAMES[gameType as MiniGameType] ?? gameType;
  };
  const games: {
    key: string;
    onClick: () => void;
    icon: React.ReactNode;
    iconWrap: string;
    cardBg: string;
    titleHover: string;
    title: string;
    desc: string;
    tag: string;
    tagCls: string;
    high: number | null;
    disabled?: boolean;
    disabledLabel?: string;
  }[] = [
    {
      key: 'feather',
      onClick: onSelectFeather,
      icon: <GameFeatherIcon color="#ffffff" glow={true} className="w-4 h-6" />,
      iconWrap: 'from-sky-500 to-indigo-600',
      cardBg: 'from-sky-950/40 via-slate-900 to-indigo-950/30 border-sky-500/20 hover:border-sky-400/50',
      titleHover: 'group-hover:text-sky-300',
      title: '接羽毛挑戰賽',
      desc: '避開炸彈與落石，考驗反射神經！',
      tag: '⚡ 敏捷度',
      tagCls: 'bg-sky-950/60 text-sky-400 border-sky-500/20',
      high: featherHighScore,
    },
    {
      key: 'trivia',
      onClick: onSelectTrivia,
      icon: <Lightbulb className="w-4 h-4 text-white" />,
      iconWrap: 'from-amber-500 to-yellow-600',
      cardBg: 'from-amber-950/40 via-slate-900 to-yellow-950/30 border-amber-500/20 hover:border-amber-400/50',
      titleHover: 'group-hover:text-amber-300',
      title: '羽球小學堂',
      desc: '羽球規則與趣味常識挑戰！',
      tag: '💡 智力賽',
      tagCls: 'bg-amber-950/60 text-amber-400 border-amber-500/20',
      high: triviaHighScore,
    },
    {
      key: 'feather_rush',
      onClick: onSelectFeatherRush,
      icon: <span className="text-lg">🚀</span>,
      iconWrap: 'from-violet-500 to-fuchsia-600',
      cardBg: 'from-violet-950/40 via-slate-900 to-fuchsia-950/30 border-violet-500/20 hover:border-violet-400/50',
      titleHover: 'group-hover:text-violet-300',
      title: '飛羽衝鋒',
      desc: '球場殺球跑酷，往前衝打倒底線對手！',
      tag: '🏸 羽球跑酷',
      tagCls: 'bg-violet-950/60 text-violet-400 border-violet-500/20',
      high: featherRushHighScore,
    },
    {
      key: 'wager',
      onClick: onOpenWagerRooms,
      icon: <span className="text-lg">⚔️</span>,
      iconWrap: 'from-rose-500 to-amber-600',
      cardBg: 'from-rose-950/40 via-slate-900 to-amber-950/30 border-rose-500/20 hover:border-rose-400/50',
      titleHover: 'group-hover:text-rose-300',
      title: '1v1 羽毛約戰房',
      desc: '押注羽毛對抗，勝者獨贏獎池！',
      tag: '🏆 雙人對決',
      tagCls: 'bg-rose-950/60 text-rose-400 border-rose-500/20',
      high: null as number | null,
    },
  ];

  const claimOptions = [
    { key: 'feather', label: '接羽毛', color: 'text-sky-400', btn: 'bg-sky-500/10 hover:bg-sky-500/25 disabled:hover:bg-sky-500/10 text-sky-300 border-sky-500/25' },
    { key: 'trivia', label: '小學堂', color: 'text-amber-400', btn: 'bg-amber-500/10 hover:bg-amber-500/25 disabled:hover:bg-amber-500/10 text-amber-300 border-amber-500/25' },
    { key: 'feather_rush', label: '飛羽衝鋒', color: 'text-violet-400', btn: 'bg-violet-500/10 hover:bg-violet-500/25 disabled:hover:bg-violet-500/10 text-violet-300 border-violet-500/25' },
  ];

  return (
    <div className="p-4 flex flex-col space-y-3 overflow-y-auto max-h-[540px]">
      {/* Weekly Score Exchange Panel */}
      {weeklyClaimStatus ? (
        weeklyClaimStatus.hasClaimed ? (
          // Already Claimed Layout (emerald theme)
          <div className="bg-emerald-950/20 border border-emerald-500/20 px-3 py-2.5 rounded-xl flex flex-col space-y-1 relative overflow-hidden">
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-black text-emerald-300">🎉 每週羽毛兌換</span>
              <span className="text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-black">本週已領取</span>
            </div>
            <p className="text-[10px] text-slate-300 font-semibold leading-relaxed">
              已以 <span className="text-amber-400 font-black">{getClaimedGameLabel(weeklyClaimStatus.claimedGameType)}</span> 兌換 <span className="text-amber-400 font-extrabold">{weeklyClaimStatus.claimedAmount}</span> 根羽毛。下次重置：{weeklyClaimStatus.nextReset}
            </p>
          </div>
        ) : (
          // Active Claiming Layout (indigo theme)
          <div className="bg-gradient-to-br from-indigo-950/25 via-slate-900 to-slate-950 border border-indigo-500/20 px-3 py-2.5 rounded-xl flex flex-col space-y-2 relative overflow-hidden">
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-black text-indigo-300">🎁 每週得分兌換羽毛</span>
              <span className="text-[9px] bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 px-2 py-0.5 rounded-full font-black">限週三 · 每週一次</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {claimOptions.map((opt) => {
                const scoreVal = weeklyClaimStatus.highestScores[opt.key] ?? 0;
                const disabled = !weeklyClaimStatus.isWednesday || scoreVal <= 0 || isClaiming;
                return (
                  <div key={opt.key} className="bg-slate-950/80 border border-slate-800/80 p-2 rounded-lg flex flex-col items-center text-center gap-1.5">
                    <div className="text-[9px] font-black text-slate-400">{opt.label}</div>
                    <div className={`text-base font-black ${opt.color}`}>{scoreVal}<span className="text-[9px] font-normal text-slate-500"> 分</span></div>
                    <button
                      disabled={disabled}
                      onClick={() => onClaimWeeklyScore?.(opt.key)}
                      className={`w-full disabled:opacity-40 font-extrabold py-1 rounded-md text-[9px] transition-all border active:scale-95 flex items-center justify-center gap-1 ${opt.btn}`}
                    >
                      {isClaiming ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                      {!weeklyClaimStatus.isWednesday ? '限週三' : scoreVal <= 0 ? '無得分' : '兌換'}
                    </button>
                  </div>
                );
              })}
            </div>

            {claimResult && (
              <div className={`text-[10px] p-1.5 rounded-lg font-extrabold text-center ${
                claimResult.status === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
              }`}>
                {claimResult.message}
              </div>
            )}
          </div>
        )
      ) : (
        // Loading state
        <div className="bg-slate-900/40 border border-slate-800/60 p-4 rounded-xl flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
          <span className="text-[10px] text-slate-400 font-bold">載入兌換狀態中...</span>
        </div>
      )}

      <div className="flex flex-col space-y-2">
        {games.map((g) => (
          <button
            key={g.key}
            onClick={g.disabled ? undefined : g.onClick}
            disabled={g.disabled}
            aria-disabled={g.disabled}
            className={
              g.disabled
                ? 'group relative flex items-center justify-between p-2.5 bg-slate-900/50 border border-slate-800/60 rounded-xl text-left opacity-55 grayscale cursor-not-allowed'
                : `group relative flex items-center justify-between p-2.5 bg-gradient-to-r border rounded-xl transition-all hover:-translate-y-0.5 active:scale-98 text-left ${g.cardBg}`
            }
          >
            <div className="flex items-center gap-2.5 flex-1 min-w-0 pr-2">
              <div className={`w-9 h-9 shrink-0 rounded-lg bg-gradient-to-tr flex items-center justify-center shadow-lg transition-transform ${g.disabled ? '' : 'group-hover:scale-105'} ${g.iconWrap}`}>
                {g.icon}
              </div>
              <div className="min-w-0">
                <h5 className={`text-sm font-extrabold text-white transition-colors truncate ${g.disabled ? '' : g.titleHover}`}>
                  {g.title}
                </h5>
                <p className="text-[10px] text-slate-400 font-semibold leading-tight truncate">
                  {g.disabled ? '🛠️ 遊戲測試中，即將開放！' : g.desc}
                </p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-0.5 shrink-0">
              {g.disabled ? (
                <span className="text-center text-[9px] whitespace-nowrap border border-slate-600/40 bg-slate-800/60 text-slate-400 px-1.5 py-0.5 rounded font-black">
                  {g.disabledLabel}
                </span>
              ) : (
                <>
                  <span className={`text-center text-[9px] whitespace-nowrap border px-1.5 py-0.5 rounded font-black ${g.tagCls}`}>
                    {g.tag}
                  </span>
                  {g.high !== null && (
                    <span className="text-[8px] whitespace-nowrap text-slate-500 font-bold">
                      最高分: {g.high}
                    </span>
                  )}
                </>
              )}
            </div>
          </button>
        ))}
      </div>

      <div className="bg-slate-900/60 border border-slate-800/80 px-3 py-2 rounded-xl text-[9px] text-slate-400 text-center font-medium leading-relaxed">
        💡 每週三比賽日可將本週最高分兌換為羽毛，固定重置！
      </div>
    </div>
  );
};
