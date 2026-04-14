import React from 'react';
import Users from "lucide-react/dist/esm/icons/users";
import RefreshCw from "lucide-react/dist/esm/icons/refresh-cw";
import { PlayerPill } from '../PlayerPill';
import type { Player } from '../../types';
import type { PlayerStatus } from '../../hooks/usePlayers';

interface PlayerZonesProps {
  readyPlayers: Player[];
  restingPlayers: Player[];
  playingPlayers: Player[];
  playerStatus: Record<string, PlayerStatus>;
  recommendedPlayers: (Player | null)[];
  fatiguedPlayerIds: Set<string>;
  isMatchmaking: boolean;
  submittingMatch: boolean;
  getPlayerTeamColor: (id: string) => "red" | "blue" | undefined;
  onToggleManualSelection: (id: string) => void;
  onTogglePlayerStatus: (id: string) => void;
  onProfileClick: (id: string) => void;
  onAllReady: () => void;
  onAllResting: () => void;
  hasControl: boolean;
  playerCourtMap?: Record<string, string>;
  /** 依當日對戰紀錄（新→舊）計算：連續幾場沒上場 */
  missedStreakByPlayerId?: Record<string, number>;
}

function EmptyReadyHint({ readOnly }: { readOnly: boolean }) {
  return (
    <div className="w-full h-48 flex flex-col items-center justify-center text-slate-300 dark:text-slate-600 gap-2 opacity-50">
      <Users size={40} strokeWidth={1.5} />
      <p className="text-sm font-bold text-center px-4">
        {readOnly
          ? "此區由控制者編排；您為觀看模式，畫面會自動更新"
          : "點擊下方球員開始備戰"}
      </p>
    </div>
  );
}

export const PlayerZones: React.FC<PlayerZonesProps> = ({
  readyPlayers, restingPlayers, playingPlayers, playerStatus,
  recommendedPlayers, fatiguedPlayerIds,
  isMatchmaking, submittingMatch,
  getPlayerTeamColor, onToggleManualSelection, onTogglePlayerStatus,
  onProfileClick, onAllReady, onAllResting,
  hasControl,
  playerCourtMap = {},
  missedStreakByPlayerId = {},
}) => {
  const readOnly = hasControl === false;
  return (
    <>
      {/* Ready Zone */}
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-4 md:p-6 shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col relative shrink-0 min-h-[300px] md:min-h-[400px]">
        {isMatchmaking && (
          <div className="absolute inset-0 bg-white/60 dark:bg-slate-900/60 backdrop-blur-[2px] z-10 flex items-center justify-center rounded-[2rem]">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin flex"><RefreshCw className="w-8 h-8 text-emerald-500" /></div>
              <p className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                配對中...
              </p>
            </div>
          </div>
        )}
        <div className="flex items-center justify-between mb-4 shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">備戰區</h2>
            <div className="px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-lg text-[10px] font-black uppercase tracking-wider">
              {readyPlayers.length} PLAYERS
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {readOnly ? (
              <span className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[9px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                觀看中
              </span>
            ) : (
              <button
                onClick={onAllResting}
                disabled={readyPlayers.length === 0 || submittingMatch || isMatchmaking}
                className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 disabled:opacity-50"
              >
                全員休息
              </button>
            )}
          </div>
        </div>
        <div className="flex-1">
          <div className="flex flex-wrap gap-3 content-start h-full p-2 pb-4">
            {readyPlayers.map((p) => (
              <PlayerPill
                key={p.id}
                player={p}
                status="ready"
                isSelected={recommendedPlayers.some((rp) => rp?.id === p.id)}
                isFatigued={fatiguedPlayerIds.has(p.id)}
                consecutiveMissed={missedStreakByPlayerId[p.id] ?? 0}
                teamColor={getPlayerTeamColor(p.id)}
                onClick={() => hasControl && onToggleManualSelection(p.id)}
                onStatusToggle={() => hasControl && onTogglePlayerStatus(p.id)}
                onProfileClick={() => onProfileClick(p.id)}
                hasControl={hasControl}
              />
            ))}
            {playingPlayers.map((p) => (
              <PlayerPill
                key={p.id}
                player={p}
                status={playerStatus[p.id]}
                teamColor={getPlayerTeamColor(p.id)}
                courtName={playerCourtMap[p.id]}
                consecutiveMissed={missedStreakByPlayerId[p.id] ?? 0}
                onClick={() => {}}
                onProfileClick={() => onProfileClick(p.id)}
                hasControl={hasControl}
              />
            ))}
            {readyPlayers.length === 0 && playingPlayers.length === 0 && (
              <EmptyReadyHint readOnly={readOnly} />
            )}
          </div>
        </div>
      </div>

      {/* Resting Zone */}
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-4 md:p-6 shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col relative shrink-0 min-h-[150px] md:min-h-[250px]">
        <div className="flex items-center justify-between mb-4 shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight">休息區</h2>
            <div className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-lg text-[10px] font-black uppercase tracking-wider">
              {restingPlayers.length} TOTAL
            </div>
          </div>
          {readOnly ? (
            <span className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[9px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
              觀看中
            </span>
          ) : (
            <button
              onClick={onAllReady}
              disabled={restingPlayers.length === 0 || submittingMatch || isMatchmaking}
              className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 disabled:opacity-50"
            >
              全員備戰
            </button>
          )}
        </div>
        <div className="flex-1">
          <div className="flex flex-wrap gap-3 content-start p-2 pb-4">
            {restingPlayers.map((p) => (
              <PlayerPill
                key={p.id}
                player={p}
                status="resting"
                isFatigued={false}
                onClick={() => hasControl && onTogglePlayerStatus(p.id)}
                onProfileClick={() => onProfileClick(p.id)}
                hasControl={hasControl}
              />
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

export const PlayerZonesSkeleton: React.FC = () => (
  <div className="flex flex-col gap-4 md:gap-6 animate-pulse-heavy">
    {/* Ready Zone Skeleton */}
    <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-4 md:p-6 shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col min-h-[300px] md:min-h-[400px]">
      <div className="flex items-center justify-between mb-4">
        <div className="h-6 w-24 bg-slate-100 dark:bg-slate-800 rounded-lg" />
        <div className="h-6 w-32 bg-slate-100 dark:bg-slate-800 rounded-lg" />
      </div>
      <div className="flex flex-wrap gap-3 p-2">
        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
          <div key={i} className="h-8 w-20 bg-slate-100 dark:bg-slate-800 rounded-full" />
        ))}
      </div>
    </div>

    {/* Resting Zone Skeleton */}
    <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-4 md:p-6 shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col min-h-[150px] md:min-h-[250px]">
      <div className="flex items-center justify-between mb-4">
        <div className="h-5 w-20 bg-slate-100 dark:bg-slate-800 rounded-lg" />
        <div className="h-6 w-24 bg-slate-100 dark:bg-slate-800 rounded-lg" />
      </div>
      <div className="flex flex-wrap gap-3 p-2">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-8 w-20 bg-slate-100 dark:bg-slate-800 rounded-full" />
        ))}
      </div>
    </div>
  </div>
);
