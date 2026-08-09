import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import X from 'lucide-react/dist/esm/icons/x';
import Play from 'lucide-react/dist/esm/icons/play';
import Loader2 from 'lucide-react/dist/esm/icons/loader-2';
import RefreshCw from 'lucide-react/dist/esm/icons/refresh-cw';
import Plus from 'lucide-react/dist/esm/icons/plus';
import ArrowLeft from 'lucide-react/dist/esm/icons/arrow-left';
import * as gasApi from '../../../lib/gasApi';
import { cn } from '../../../lib/utils';
import { GAME_SHORT_LABELS, MiniGameType } from './types';

const getGameTypeLabel = (type: string) =>
  GAME_SHORT_LABELS[type as MiniGameType] ?? type;

interface RoomLobbyModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerName: string;
  playerEmail: string;
  playerId?: string;
  onSelectGame: (roomCode: string, gameType: MiniGameType, wagerAmount: number, isHost: boolean) => void;
}

export const RoomLobbyModal: React.FC<RoomLobbyModalProps> = ({
  isOpen,
  onClose,
  playerName,
  playerEmail,
  playerId,
  onSelectGame,
}) => {
  const [view, setView] = useState<'list' | 'create' | 'waiting'>('list');
  
  // Create Room form state
  const [wager, setWager] = useState<number>(100);
  const [gameType, setGameType] = useState<MiniGameType>('feather');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Active room code state (when inside waiting room)
  const [activeRoomCode, setActiveRoomCode] = useState<string | null>(null);

  // Keep track of the room code we just left to avoid auto-recovering it from stale cache
  const justLeftRoomRef = useRef<string | null>(null);

  // Query active rooms list
  const { data: activeRooms, refetch: refetchRooms, isFetching } = useQuery({
    queryKey: ['activeMiniGameRooms'],
    queryFn: () => gasApi.fetchActiveMiniGameRooms(),
    enabled: isOpen && view === 'list',
    refetchInterval: 3000, // auto poll active rooms list every 3s
  });

  // Query details of current room in waiting screen
  const { data: currentRoom, refetch: refetchCurrentRoom } = useQuery({
    queryKey: ['currentMiniGameRoom', activeRoomCode],
    queryFn: async () => {
      if (!activeRoomCode) return null;
      try {
        return await gasApi.fetchMiniGameRoom(activeRoomCode);
      } catch (err) {
        return null;
      }
    },
    enabled: isOpen && view === 'waiting' && !!activeRoomCode,
    refetchInterval: 1500, // fast poll in waiting room
  });

  // Handle auto transition to game play or auto-exit if disbanded
  useEffect(() => {
    if (view === 'waiting' && activeRoomCode) {
      if (currentRoom !== undefined) {
        if (currentRoom === null) {
          // If room is no longer returned in active list, it was cancelled/deleted
          setErrorMsg('房間已被房主關閉或解散');
          setView('list');
          setActiveRoomCode(null);
        } else if (currentRoom.status === 'playing') {
          const isHost = currentRoom.host_player_id === playerId || currentRoom.host_player_name === playerName;
          onSelectGame(currentRoom.room_code, currentRoom.game_type, currentRoom.wager_amount, isHost);
          setView('list');
          setActiveRoomCode(null);
          onClose();
        }
      }
    }
  }, [currentRoom, view, activeRoomCode, playerName, playerId, onSelectGame, onClose]);

  // Auto-recover waiting room view if player already belongs to an active room
  useEffect(() => {
    if (isOpen && !activeRoomCode && activeRooms && activeRooms.length > 0) {
      const myRoom = activeRooms.find(
        (r: any) => 
          r.host_player_id === playerId || 
          r.guest_player_id === playerId || 
          r.host_player_name === playerName || 
          r.guest_player_name === playerName
      );
      if (myRoom && myRoom.room_code !== justLeftRoomRef.current) {
        setActiveRoomCode(myRoom.room_code);
        setView('waiting');
      }
    }
  }, [activeRooms, isOpen, activeRoomCode, playerName, playerId]);


  const handleCreateRoom = async () => {
    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      const res = await gasApi.createMiniGameRoom(playerEmail, gameType, wager);
      if (res.status === 'success') {
        justLeftRoomRef.current = null;
        setActiveRoomCode(res.room.room_code);
        setView('waiting');
      } else {
        setErrorMsg(res.message || '創建房間失敗');
      }
    } catch (err: any) {
      setErrorMsg(err.message || '網路連線錯誤');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJoinRoom = async (code: string) => {
    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      const res = await gasApi.joinMiniGameRoom(code, playerEmail);
      if (res.status === 'success') {
        justLeftRoomRef.current = null;
        setActiveRoomCode(res.room.room_code);
        setView('waiting');
      } else {
        setErrorMsg(res.message || '加入房間失敗');
      }
    } catch (err: any) {
      setErrorMsg(err.message || '網路連線錯誤');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLeaveRoom = async () => {
    if (!activeRoomCode) return;
    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      const res = await gasApi.leaveMiniGameRoom(activeRoomCode, playerEmail);
      if (res.status === 'success') {
        justLeftRoomRef.current = activeRoomCode;
        setActiveRoomCode(null);
        setView('list');
        refetchRooms();
      } else {
        setErrorMsg(res.message || '退出房間失敗');
      }
    } catch (err: any) {
      setErrorMsg(err.message || '網路連線錯誤');
    } finally {
      setIsSubmitting(false);
    }
  };


  const handleStartGame = async () => {
    if (!activeRoomCode) return;
    setErrorMsg(null);
    try {
      const res = await gasApi.startMiniGameRoom(activeRoomCode);
      if (res.status !== 'success') {
        setErrorMsg(res.message || '啟動遊戲失敗');
      }
    } catch (err: any) {
      setErrorMsg(err.message || '網路連線錯誤');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        onClick={() => view !== 'waiting' && onClose()} 
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 text-white rounded-3xl shadow-2xl overflow-hidden flex flex-col min-h-[420px] max-h-[90vh]">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            {view !== 'list' && view !== 'waiting' ? (
              <button 
                onClick={() => setView('list')}
                className="p-1 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            ) : (
              <span className="text-xl">⚔️</span>
            )}
            <h3 className="text-base md:text-lg font-black tracking-wide bg-gradient-to-r from-rose-400 to-amber-400 bg-clip-text text-transparent">
              {view === 'list' && "約戰房間大廳"}
              {view === 'create' && "創立對戰房間"}
              {view === 'waiting' && `等待對手房 (${activeRoomCode})`}
            </h3>
          </div>
          {view !== 'waiting' && (
            <button 
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-950 flex flex-col justify-center">
          {errorMsg && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold p-3 rounded-xl mb-4 text-center shrink-0">
              ⚠️ {errorMsg}
            </div>
          )}

          {/* VIEW 1: ROOM LIST */}
          {view === 'list' && (
            <div className="flex flex-col space-y-4 h-full flex-1">
              <div className="flex justify-between items-center shrink-0">
                <span className="text-[10px] text-slate-400 font-extrabold tracking-wider">活躍對戰房間</span>
                <div className="flex gap-2">
                  <button 
                    onClick={() => refetchRooms()} 
                    className="p-1.5 rounded-lg border border-slate-800 hover:bg-slate-900 text-slate-400 hover:text-white transition-colors"
                  >
                    <RefreshCw className={cn("w-3.5 h-3.5", isFetching && "animate-spin")} />
                  </button>
                  <button 
                    onClick={() => setView('create')}
                    className="bg-rose-600 hover:bg-rose-700 font-extrabold text-[10px] px-2.5 py-1.5 rounded-lg flex items-center gap-1 shadow-md transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    建立約戰
                  </button>
                </div>
              </div>

              {/* Room items list */}
              <div className="flex-1 overflow-y-auto max-h-[250px] space-y-2 pr-1">
                {!activeRooms || activeRooms.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-500 text-xs font-bold space-y-2">
                    <span>📭 目前尚無等待中的約戰房間</span>
                    <span className="text-[10px] text-slate-600">趕快點擊「建立約戰」發起挑戰吧！</span>
                  </div>
                ) : (
                  activeRooms
                    .slice()
                    .sort((a: any, b: any) => {
                      const statusOrder: Record<string, number> = { waiting: 0, ready: 1, playing: 2 };
                      return (statusOrder[a.status] ?? 3) - (statusOrder[b.status] ?? 3);
                    })
                    .map((room: any) => (
                    <div 
                      key={room.id}
                      className="flex items-center justify-between p-3 bg-slate-900 border border-slate-850 hover:border-rose-500/30 rounded-2xl transition-all"
                    >
                      <div className="flex flex-col gap-1 text-left">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-black text-white">{room.host_player_name}</span>
                          <span className="text-[9px] bg-slate-800 text-slate-400 px-1 rounded uppercase font-bold">
                            {getGameTypeLabel(room.game_type)}
                          </span>
                          {room.status === 'playing' && (
                            <span className="text-[9px] bg-rose-950 text-rose-400 border border-rose-500/20 px-1 rounded font-bold">
                              ⚔️ 決鬥中
                            </span>
                          )}
                          {room.status === 'ready' && (
                            <span className="text-[9px] bg-amber-950 text-amber-400 border border-amber-500/20 px-1 rounded font-bold">
                              ⏳ 準備中
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-slate-400 font-bold">
                          <span>賭金:</span>
                          <span className="text-amber-400">{room.wager_amount} 🪶</span>
                        </div>
                      </div>
                      
                      {room.status === 'playing' ? (
                        <button
                          disabled={true}
                          className="px-4 py-1.5 rounded-xl font-extrabold text-xs bg-slate-800 text-slate-500 cursor-not-allowed"
                        >
                          正在決鬥
                        </button>
                      ) : room.status === 'ready' ? (
                        <button
                          disabled={true}
                          className="px-4 py-1.5 rounded-xl font-extrabold text-xs bg-slate-800 text-slate-500 cursor-not-allowed"
                        >
                          人數已滿
                        </button>
                      ) : (
                        <button
                          onClick={() => handleJoinRoom(room.room_code)}
                          disabled={isSubmitting || room.host_player_id === playerId || room.host_player_name === playerName}
                          className={cn(
                            "px-4 py-1.5 rounded-xl font-extrabold text-xs transition-all shadow-md active:scale-95",
                            (room.host_player_id === playerId || room.host_player_name === playerName)
                              ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                              : "bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white"
                          )}
                        >
                          {(room.host_player_id === playerId || room.host_player_name === playerName) ? '我的房' : '加入挑戰'}
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* VIEW 2: CREATE ROOM */}
          {view === 'create' && (
            <div className="space-y-5 flex flex-col justify-center">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">選擇遊戲類型</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setGameType('feather')}
                    className={cn(
                      "py-3 rounded-2xl border transition-all text-xs font-extrabold flex flex-col items-center gap-1",
                      gameType === 'feather' 
                        ? "bg-rose-950/20 border-rose-500 text-rose-400 shadow-md"
                        : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                    )}
                  >
                    <span>🪶</span>
                    <span>接羽毛挑戰</span>
                  </button>
                  <button
                    onClick={() => setGameType('trivia')}
                    className={cn(
                      "py-3 rounded-2xl border transition-all text-xs font-extrabold flex flex-col items-center gap-1",
                      gameType === 'trivia'
                        ? "bg-rose-950/20 border-rose-500 text-rose-400 shadow-md"
                        : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                    )}
                  >
                    <span>💡</span>
                    <span>羽球小學堂</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">設定賭注金額</label>
                <div className="flex justify-between gap-2">
                  {[50, 100, 300, 500].map((amt) => (
                    <button
                      key={amt}
                      onClick={() => setWager(amt)}
                      className={cn(
                        "flex-1 py-2 text-xs rounded-xl border transition-all font-black",
                        wager === amt
                          ? "bg-amber-500/10 border-amber-500 text-amber-400 shadow-md"
                          : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                      )}
                    >
                      {amt} 🪶
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleCreateRoom}
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 active:scale-98 text-white font-extrabold py-2.5 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 text-sm mt-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    正在開房中...
                  </>
                ) : (
                  "確認建立房間"
                )}
              </button>
            </div>
          )}

          {/* VIEW 3: WAITING ROOM */}
          {view === 'waiting' && currentRoom && (
            <div className="space-y-6 flex flex-col items-center justify-center text-center">
              {/* Match wager info */}
              <div className="bg-slate-900 border border-slate-850 p-4 rounded-3xl w-full">
                <div className="text-[10px] text-slate-400 font-extrabold tracking-wider">總對戰賭金池</div>
                <div className="text-3xl font-black text-amber-400 my-1.5 tracking-wider">
                  {currentRoom.wager_amount * 2} <span className="text-sm font-medium text-slate-400">🪶</span>
                </div>
                <span className="text-[9px] bg-slate-850 text-slate-400 px-2 py-0.5 rounded-full font-bold">
                  遊戲項目：{getGameTypeLabel(currentRoom.game_type)}
                </span>
              </div>

              {/* VS Players layout */}
              <div className="flex items-center justify-between w-full max-w-[280px] my-2">
                <div className="flex flex-col items-center gap-1.5">
                  <div className="w-12 h-12 rounded-full bg-rose-600/10 border border-rose-500 flex items-center justify-center text-rose-400 text-lg font-black shadow-lg">
                    {currentRoom.host_player_name.slice(0, 2)}
                  </div>
                  <span className="text-xs font-black truncate max-w-[80px]">{currentRoom.host_player_name}</span>
                  <span className="text-[8px] bg-rose-500/10 text-rose-400 border border-rose-500/20 px-1.5 rounded font-black">創房者</span>
                </div>

                <div className="text-slate-600 font-black italic text-lg tracking-widest shrink-0 px-4">VS</div>

                <div className="flex flex-col items-center gap-1.5">
                  {currentRoom.guest_player_name ? (
                    <>
                      <div className="w-12 h-12 rounded-full bg-amber-600/10 border border-amber-500 flex items-center justify-center text-amber-400 text-lg font-black shadow-lg">
                        {currentRoom.guest_player_name.slice(0, 2)}
                      </div>
                      <span className="text-xs font-black truncate max-w-[80px]">{currentRoom.guest_player_name}</span>
                      <span className="text-[8px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 rounded font-black">挑戰者</span>
                    </>
                  ) : (
                    <>
                      <div className="w-12 h-12 rounded-full bg-slate-900 border-2 border-dashed border-slate-800 flex items-center justify-center text-slate-600 text-sm font-bold animate-pulse">
                        ?
                      </div>
                      <span className="text-xs font-bold text-slate-500 animate-pulse">等待加入...</span>
                      <span className="text-[8px] bg-slate-800 text-slate-500 px-1.5 rounded font-bold">空缺中</span>
                    </>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="w-full space-y-2.5">
                {currentRoom.host_player_id === playerId || currentRoom.host_player_name === playerName ? (
                  <button
                    onClick={handleStartGame}
                    disabled={currentRoom.status !== 'ready'}
                    className={cn(
                      "w-full font-extrabold py-2.5 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 text-sm",
                      currentRoom.status === 'ready'
                        ? "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white"
                        : "bg-slate-800 text-slate-500 cursor-not-allowed"
                    )}
                  >
                    <Play className="w-4 h-4 fill-current" />
                    開始約戰遊戲
                  </button>
                ) : (
                  <div className="bg-slate-900/60 border border-slate-850 p-3 rounded-2xl text-[10px] text-slate-400 text-center font-bold">
                    ⏱️ 您已成功加入約戰，等待房主啟動遊戲中...
                  </div>
                )}

                <button
                  onClick={handleLeaveRoom}
                  disabled={isSubmitting}
                  className="w-full bg-slate-800 hover:bg-slate-700 active:scale-98 text-slate-300 hover:text-white font-extrabold py-2 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <span>🚪 {(currentRoom.host_player_id === playerId || currentRoom.host_player_name === playerName) ? '解散並關閉房間' : '退出等待房間'}</span>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
