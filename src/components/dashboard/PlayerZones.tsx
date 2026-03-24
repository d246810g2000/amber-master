import React from 'react';
import Users from "lucide-react/dist/esm/icons/users";
import RefreshCw from "lucide-react/dist/esm/icons/refresh-cw";
import Zap from "lucide-react/dist/esm/icons/zap";
import Coffee from "lucide-react/dist/esm/icons/coffee";
import { cn } from '../../lib/utils';
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
  ignoreFatigue: boolean;
  isMatchmaking: boolean;
  submittingMatch: boolean;
  getPlayerTeamColor: (id: string) => "red" | "blue" | undefined;
  onToggleManualSelection: (id: string) => void;
  onTogglePlayerStatus: (id: string) => void;
  onProfileClick: (id: string) => void;
  onSetIgnoreFatigue: (v: boolean) => void;
  onAllReady: () => void;
  onAllResting: () => void;
  hasControl: boolean;
}

const EMPTY_STATE = (
  <div className="w-full h-48 flex flex-col items-center justify-center text-slate-300 gap-2 opacity-50">
    <Users size={40} strokeWidth={1.5} />
    <p className="text-sm font-bold">點擊下方球員開始備戰</p>
  </div>
);

export const PlayerZones: React.FC<PlayerZonesProps> = ({
  readyPlayers, restingPlayers, playingPlayers, playerStatus,
  recommendedPlayers, fatiguedPlayerIds, ignoreFatigue,
  isMatchmaking, submittingMatch,
  getPlayerTeamColor, onToggleManualSelection, onTogglePlayerStatus,
  onProfileClick, onSetIgnoreFatigue, onAllReady, onAllResting,
  hasControl,
}) => {
  return (
    <>
      {/* Ready Zone */}
      <div className="bg-white rounded-[2rem] p-4 md:p-6 shadow-sm border border-slate-100 flex flex-col relative shrink-0 min-h-[300px] md:min-h-[400px]">
        {isMatchmaking && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-10 flex items-center justify-center rounded-[2rem]">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin flex"><RefreshCw className="w-8 h-8 text-emerald-500" /></div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">
                配對中...
              </p>
            </div>
          </div>
        )}
        <div className="flex items-center justify-between mb-4 shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-black text-slate-900 tracking-tight">備戰區</h2>
            <div className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-black uppercase tracking-wider">
              {readyPlayers.length} PLAYERS
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => hasControl && onSetIgnoreFatigue(!ignoreFatigue)}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 border",
                ignoreFatigue
                  ? "bg-amber-100 text-amber-700 border-amber-200"
                  : "bg-slate-50 text-slate-400 border-slate-100",
                !hasControl && "opacity-50 cursor-not-allowed"
              )}
              title={ignoreFatigue ? "無視疲勞已開啟 (不再避開連場球員)" : "忽視疲勞已關閉"}
            >
              {ignoreFatigue ? <Zap size={12} fill="currentColor" /> : <Coffee size={12} />}
              無視疲勞
            </button>
            <button
              onClick={onAllResting}
              disabled={readyPlayers.length === 0 || submittingMatch || isMatchmaking || !hasControl}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 disabled:opacity-50"
            >
              全員休息
            </button>
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
                isFatigued={!ignoreFatigue && fatiguedPlayerIds.has(p.id)}
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
                onClick={() => {}}
                onProfileClick={() => onProfileClick(p.id)}
                hasControl={hasControl}
              />
            ))}
            {readyPlayers.length === 0 && playingPlayers.length === 0 && EMPTY_STATE}
          </div>
        </div>
      </div>

      {/* Resting Zone */}
      <div className="bg-white rounded-[2rem] p-4 md:p-6 shadow-sm border border-slate-100 flex flex-col relative shrink-0 min-h-[150px] md:min-h-[250px]">
        <div className="flex items-center justify-between mb-4 shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-black text-slate-900 tracking-tight">休息區</h2>
            <div className="px-2 py-1 bg-slate-100 text-slate-500 rounded-lg text-[10px] font-black uppercase tracking-wider">
              {restingPlayers.length} TOTAL
            </div>
          </div>
          <button
            onClick={onAllReady}
            disabled={restingPlayers.length === 0 || submittingMatch || isMatchmaking || !hasControl}
            className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 disabled:opacity-50"
          >
            全員備戰
          </button>
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
    <div className="bg-white rounded-[2rem] p-4 md:p-6 shadow-sm border border-slate-100 flex flex-col min-h-[300px] md:min-h-[400px]">
      <div className="flex items-center justify-between mb-4">
        <div className="h-6 w-24 bg-slate-100 rounded-lg" />
        <div className="h-6 w-32 bg-slate-100 rounded-lg" />
      </div>
      <div className="flex flex-wrap gap-3 p-2">
        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
          <div key={i} className="h-8 w-20 bg-slate-100 rounded-full" />
        ))}
      </div>
    </div>

    {/* Resting Zone Skeleton */}
    <div className="bg-white rounded-[2rem] p-4 md:p-6 shadow-sm border border-slate-100 flex flex-col min-h-[150px] md:min-h-[250px]">
      <div className="flex items-center justify-between mb-4">
        <div className="h-5 w-20 bg-slate-100 rounded-lg" />
        <div className="h-6 w-24 bg-slate-100 rounded-lg" />
      </div>
      <div className="flex flex-wrap gap-3 p-2">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-8 w-20 bg-slate-100 rounded-full" />
        ))}
      </div>
    </div>
  </div>
);
