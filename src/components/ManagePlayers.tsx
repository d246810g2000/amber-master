import React, { useState } from 'react';
import { useDialog } from '../context/DialogContext';
import { Player } from '../types';
import Trash2 from "lucide-react/dist/esm/icons/trash-2";
import Edit2 from "lucide-react/dist/esm/icons/edit-2";
import UserPlus from "lucide-react/dist/esm/icons/user-plus";
import X from "lucide-react/dist/esm/icons/x";
import Check from "lucide-react/dist/esm/icons/check";
import Loader2 from "lucide-react/dist/esm/icons/loader-2";
import Square from "lucide-react/dist/esm/icons/square";
import CheckSquare from "lucide-react/dist/esm/icons/check-square";
import RefreshCw from "lucide-react/dist/esm/icons/refresh-cw";
import Calculator from "lucide-react/dist/esm/icons/calculator";
import * as gasApi from '../lib/gasApi';
import * as matchEngine from '../lib/matchEngine';
import { getAvatarUrl } from '../lib/utils';

interface ManagePlayersProps {
  players: Player[];
  onUpdate: () => void;
  onSelectPlayer: (id: string) => void;
  onClose: () => void;
}

export const ManagePlayers: React.FC<ManagePlayersProps> = ({ players, onUpdate, onSelectPlayer, onClose }) => {
  const [newPlayerNames, setNewPlayerNames] = useState('');
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [editName, setEditName] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null); 
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isRecalculating, setIsRecalculating] = useState(false);
  const { showAlert, showConfirm } = useDialog();

  const handleRecalculate = async () => {
    showConfirm("重新推算綜合戰力", "確定要根據『所有歷史對戰』重新計算戰力嗎？\n這將重置現有的綜合戰力並重新計算。", async () => {
      setIsRecalculating(true);
      try {
        const [basePlayers, allMatches] = await Promise.all([
          gasApi.fetchPlayers(),
          gasApi.fetchMatches(), 
        ]);
        const resMap = matchEngine.calculateComprehensiveMu(basePlayers, allMatches);
        const updates = Object.entries(resMap).map(([id, stats]) => ({
          id,
          mu: stats.mu,
          sigma: stats.sigma
        }));
        await gasApi.batchUpdatePlayers(updates);
        showAlert("校準成功", "對戰歷史重新洗牌計算完成！");
        onUpdate();
      } catch (err) {
        console.error(err);
        showAlert("發生錯誤", "計算失敗：" + (err as any).message);
      } finally {
        setIsRecalculating(false);
      }
    });
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const names = newPlayerNames
      .split(/[\n,，\s]+/)
      .map(n => n.trim())
      .filter(n => n.length > 0);

    if (names.length === 0) return;

    setLoading(true);
    try {
      if (names.length === 1) {
        await gasApi.addPlayer(names[0]);
      } else {
        await gasApi.addPlayersBatch(names);
      }
      setNewPlayerNames('');
      onUpdate();
    } catch (err) {
      showAlert("新增失敗", "無法將球員加入名單，請稍後再試。");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (id: string) => {
    if (!editName.trim()) return;
    setActionId(id);
    try {
      await gasApi.updatePlayer(id, editName);
      setEditingPlayer(null);
      onUpdate();
    } catch (err) {
      showAlert("更新失敗", "無法更新球員資料。");
    } finally {
      setActionId(null);
    }
  };

  const handleDelete = async (id: string) => {
    showConfirm("刪除球員", "確定要刪除這位球員嗎？", async () => {
      setActionId(id);
      try {
        await gasApi.deletePlayer(id);
        setSelectedIds(prev => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        onUpdate();
      } catch (err) {
        showAlert("刪除失敗", "無法從資料庫移除球員。");
      } finally {
        setActionId(null);
      }
    });
  };

  const handleBatchDelete = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    
    showConfirm("批次刪除球員", `確定要批次刪除選取的 ${ids.length} 名球員嗎？`, async () => {
      setLoading(true);
      try {
        await gasApi.deletePlayersBatch(ids as string[]);
        setSelectedIds(new Set());
        onUpdate();
      } catch (err) {
        showAlert("操作失敗", "批次刪除過程發生錯誤。");
      } finally {
        setLoading(false);
      }
    });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === players.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(players.map(p => p.id)));
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50 overscroll-contain">
      <div className="bg-white rounded-[1.5rem] md:rounded-[2.5rem] p-5 md:p-8 w-full max-w-lg shadow-2xl border border-white/20 flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">管理球員</h2>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
              現役球員：{players.length} 位
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={handleRecalculate}
              disabled={loading || isRecalculating || players.length === 0}
              className="p-3 hover:bg-slate-100 rounded-2xl transition-all text-slate-400 hover:text-emerald-500 disabled:opacity-30"
              title="重新校準綜合戰力"
            >
              {isRecalculating ? <span className="animate-spin flex"><RefreshCw size={22} className="text-emerald-500" /></span> : <Calculator size={22} />}
            </button>
            <button 
              onClick={onClose} 
              className="p-3 hover:bg-slate-100 rounded-2xl transition-all text-slate-400 hover:text-slate-600 hover:rotate-90"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Input Area */}
        <form onSubmit={handleAdd} className="space-y-3 mb-6">
          <textarea
            value={newPlayerNames}
            onChange={(e) => setNewPlayerNames(e.target.value)}
            placeholder="批次新增姓名 (多行/空格/逗點即可)"
            className="w-full p-4 rounded-3xl border-2 border-slate-100 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all min-h-[80px] text-sm font-bold bg-slate-50/50 resize-none"
            disabled={loading}
          />
          <button 
            type="submit" 
            disabled={loading || !newPlayerNames.trim()}
            className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 text-white p-4 rounded-2xl font-black transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-200"
          >
            {loading ? <span className="animate-spin flex"><Loader2 size={20} /></span> : <UserPlus size={20} />}
            <span>{loading ? "執行中..." : "批次匯入帳案"}</span>
          </button>
        </form>

        {/* Batch Action Toolbar */}
        {players.length > 0 && (
          <div className="flex items-center justify-between px-2 py-3 bg-slate-50/50 rounded-2xl mb-4 border border-slate-100">
            <div className="flex items-center gap-3">
              <button 
                onClick={toggleSelectAll}
                className="flex items-center gap-2 text-xs font-black text-slate-500 hover:text-slate-700 uppercase tracking-tighter ml-2"
              >
                {selectedIds.size === players.length ? <CheckSquare size={18} className="text-emerald-500" /> : <Square size={18} />}
                <span>{selectedIds.size === players.length ? "取消全選" : "全選球員"}</span>
              </button>
            </div>
            {selectedIds.size > 0 && (
              <button 
                onClick={handleBatchDelete}
                disabled={loading}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-rose-50 text-rose-600 rounded-xl text-xs font-black hover:bg-rose-100 transition-all border border-rose-200 shadow-sm shadow-rose-100"
              >
                {loading ? <span className="animate-spin flex"><Loader2 size={14} /></span> : <Trash2 size={14} />}
                <span>刪除選取 ({selectedIds.size})</span>
              </button>
            )}
          </div>
        )}

        {/* Player List */}
        <div className="flex-1 space-y-2 overflow-y-auto overscroll-contain custom-scrollbar pr-1 md:pr-2 min-h-0">
          {players.map((player) => {
            const isSelected = selectedIds.has(player.id);
            return (
              <div 
                key={player.id} 
                className={cn(
                  "flex items-center gap-3 p-3.5 border-2 rounded-2xl group transition-all",
                  isSelected 
                    ? "bg-emerald-50/50 border-emerald-500/30 shadow-sm" 
                    : "bg-white border-slate-50 hover:border-slate-200 hover:shadow-md"
                )}
              >
                {editingPlayer?.id === player.id ? (
                  <div className="flex-1 flex items-center gap-2">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="flex-1 p-2 rounded-xl border-2 border-emerald-500 bg-white text-sm font-bold"
                      autoFocus
                    />
                    <button onClick={() => handleUpdate(player.id)} className="p-2 bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-100">
                      <Check size={18} />
                    </button>
                  </div>
                ) : (
                  <>
                    <button 
                      onClick={() => toggleSelect(player.id)}
                      className={cn(
                        "transition-colors",
                        isSelected ? "text-emerald-500" : "text-slate-200 group-hover:text-slate-400"
                      )}
                    >
                      {isSelected ? <CheckSquare size={20} /> : <Square size={20} />}
                    </button>
                    <div 
                      className="w-10 h-10 rounded-xl overflow-hidden border border-slate-100 bg-slate-50 flex-shrink-0 cursor-pointer"
                      onClick={() => { onSelectPlayer(player.id); onClose(); }}
                    >
                      <img 
                        src={getAvatarUrl(player.avatar, player.name)} 
                        alt={player.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex flex-col cursor-pointer flex-1 min-w-0"
                      onClick={() => { onSelectPlayer(player.id); onClose(); }}
                    >
                      <span className="font-black text-slate-700 truncate">{player.name}</span>
                    </div>
                    <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={(e) => { e.stopPropagation(); setEditingPlayer(player); setEditName(player.name); }} 
                        className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDelete(player.id); }} 
                        disabled={actionId === player.id}
                        className="p-2 text-slate-300 hover:text-rose-500 rounded-xl"
                      >
                        {actionId === player.id ? <span className="animate-spin flex"><Loader2 size={16} /></span> : <Trash2 size={16} />}
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

