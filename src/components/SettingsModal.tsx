import React, { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
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
import Settings from "lucide-react/dist/esm/icons/settings";
import Bell from "lucide-react/dist/esm/icons/bell";
import Users from "lucide-react/dist/esm/icons/users";
import ChevronRight from "lucide-react/dist/esm/icons/chevron-right";
import * as gasApi from '../lib/gasApi';
import * as matchEngine from '../lib/matchEngine';
import { getAvatarUrl, cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';

type BindError = Error & { code?: string };

interface SettingsModalProps {
  players: Player[];
  onUpdate: () => void;
  onSelectPlayer: (id: string) => void;
  onClose: () => void;
  ignoreFatigue: boolean;
  onSetIgnoreFatigue: (value: boolean) => void;
}

type Tab = 'general' | 'notifications' | 'players';

export const SettingsModal: React.FC<SettingsModalProps> = ({ 
  players, onUpdate, onSelectPlayer, onClose,
  ignoreFatigue, onSetIgnoreFatigue
}) => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>('general');
  const [newPlayerNames, setNewPlayerNames] = useState('');
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [editName, setEditName] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null); 
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [bindingActionId, setBindingActionId] = useState<string | null>(null);
  const [ownerMap, setOwnerMap] = useState<Record<string, boolean>>({});
  const [bindingStatusLoading, setBindingStatusLoading] = useState(false);
  const { showAlert, showConfirm } = useDialog();
  const { currentUser, isAuthenticated } = useAuth();

  // Theme state (simple implementation)
  const [theme, setTheme] = useState<'system' | 'light' | 'dark'>(() => {
    return (localStorage.getItem('theme') as any) || 'system';
  });

  // LINE notification state
  const [lineEnabled, setLineEnabled] = useState(() => {
    return localStorage.getItem('lineNotifications') !== 'false';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else if (theme === 'light') {
      root.classList.remove('dark');
    } else {
      const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.toggle('dark', systemDark);
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const handleRecalculate = async () => {
    showConfirm("重新推算生涯戰力", "確定要根據『所有歷史對戰』重新計算戰力嗎？\n這將重置現有的生涯戰力並重新計算。", async () => {
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
        showAlert("校正成功", "對戰歷史重新洗牌計算完成！");
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
      setShowAddForm(false);
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

  const handleBind = async (playerId: string) => {
    if (!isAuthenticated || !currentUser?.email) {
      showAlert('請先登入', '請先使用 Google 登入後再進行綁定。');
      return;
    }
    setBindingActionId(playerId);
    try {
      await gasApi.bindPlayer(playerId, currentUser.email);
      queryClient.invalidateQueries({ queryKey: ['userBinding'] });
      queryClient.invalidateQueries({ queryKey: ['players-base'] });
      queryClient.invalidateQueries({ queryKey: ['players'] });
      showAlert('綁定成功', '此球員已綁定到你的帳號。');
      onUpdate();
    } catch (err) {
      showAlert('綁定失敗', (err as any).message || '綁定失敗');
    } finally {
      setBindingActionId(null);
    }
  };

  const handleUnbind = async (playerId: string) => {
    if (!isAuthenticated || !currentUser?.email) {
      showAlert('請先登入', '請先使用 Google 登入後再進行解除綁定。');
      return;
    }
    setBindingActionId(playerId);
    try {
      await gasApi.unbindPlayer(playerId, currentUser.email);
      queryClient.invalidateQueries({ queryKey: ['userBinding'] });
      queryClient.invalidateQueries({ queryKey: ['players-base'] });
      queryClient.invalidateQueries({ queryKey: ['players'] });
      showAlert('解除綁定成功', '你已解除此球員綁定。');
      onUpdate();
    } catch (err) {
      showAlert('解除綁定失敗', (err as any).message || '解除綁定失敗');
    } finally {
      setBindingActionId(null);
    }
  };

  useEffect(() => {
    let active = true;
    const loadBindingStatus = async () => {
      if (!isAuthenticated || !currentUser?.email || players.length === 0) {
        setOwnerMap({});
        return;
      }
      setBindingStatusLoading(true);
      try {
        const results = await Promise.all(
          players.map(async (p) => {
            try {
              const binding = await gasApi.getPlayerBinding(p.id, currentUser.email);
              return [p.id, binding.isOwner] as const;
            } catch {
              return [p.id, false] as const;
            }
          })
        );
        if (active) {
          const next: Record<string, boolean> = {};
          results.forEach(([id, isOwner]) => { next[id] = isOwner; });
          setOwnerMap(next);
        }
      } finally {
        if (active) setBindingStatusLoading(false);
      }
    };
    loadBindingStatus();
    return () => { active = false; };
  }, [players, isAuthenticated, currentUser?.email]);

  const SidebarItem = ({ id, label, icon: Icon }: { id: Tab, label: string, icon: any }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group text-[15px] font-medium",
        activeTab === id 
          ? "bg-slate-200/50 dark:bg-slate-800 text-slate-900 dark:text-white" 
          : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-700 dark:hover:text-slate-300"
      )}
    >
      <Icon size={18} className={cn("transition-colors", activeTab === id ? "text-slate-700 dark:text-slate-200" : "text-slate-400 group-hover:text-slate-500")} />
      <span className="flex-1 text-left">{label}</span>
    </button>
  );

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[8px] flex items-center justify-center p-4 z-50 overscroll-contain animate-in fade-in duration-300">
      <div className="bg-[#fcfcfc] dark:bg-slate-900 rounded-[2.5rem] w-full max-w-[900px] h-[650px] shadow-2xl border border-white/20 flex flex-col md:flex-row overflow-hidden relative">
        {/* Close Button - Top Left of Sidebar */}
        <button 
          onClick={onClose}
          className="absolute top-6 left-6 z-[60] p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 rounded-lg transition-all group"
          title="關閉"
        >
          <X size={20} />
        </button>
        
        {/* Sidebar */}
        <div className="w-full md:w-[260px] bg-slate-50/50 dark:bg-slate-900/50 border-r border-slate-100 dark:border-slate-800 p-6 pt-20 flex flex-col shrink-0">
          <div className="mb-8 px-2" />

          <div className="flex-1 space-y-1 overflow-x-auto md:overflow-x-visible flex md:flex-col pb-4 md:pb-0 scrollbar-hide">
            <SidebarItem id="general" label="一般" icon={Settings} />
            <SidebarItem id="notifications" label="通知" icon={Bell} />
            <SidebarItem id="players" label="管理球員" icon={Users} />
          </div>

          <div className="mt-auto pt-6 border-t border-slate-100 hidden md:block" />
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-slate-900">
          <div className="flex justify-between items-center px-10 pt-10 pb-6 shrink-0">
            <div>
              <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">
                {activeTab === 'general' ? '一般' : activeTab === 'notifications' ? '通知' : '管理球員'}
              </h2>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                {activeTab === 'general' ? '偏好設定' : activeTab === 'notifications' ? '即時更新' : `現役球員：${players.length} 位`}
              </p>
            </div>
            
            {activeTab === 'players' && !showAddForm && (
              <button 
                onClick={() => setShowAddForm(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-xs font-black shadow-lg shadow-slate-200 dark:shadow-none hover:opacity-90 active:scale-95 transition-all text-nowrap"
              >
                <UserPlus size={14} />
                <span>新增球員</span>
              </button>
            )}

            <div className="md:hidden w-12" /> {/* Spacer for symmetry on mobile */}
          </div>

          <div className="flex-1 overflow-y-auto p-6 md:p-8 pt-0 md:pt-0 custom-scrollbar overscroll-contain">
            {activeTab === 'general' && (
              <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
                {/* List Style Settings */}
                <div className="space-y-0 border-t border-slate-100 dark:border-slate-800 mt-4">
                  {/* Appearance Row */}
                  <div className="flex items-center justify-between py-6 border-b border-slate-50 dark:border-slate-800/50">
                    <span className="text-[17px] font-bold text-slate-800 dark:text-slate-200">外觀</span>
                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                      {[
                        { id: 'system', label: '系統' },
                        { id: 'light', label: '淺色' },
                        { id: 'dark', label: '深色' },
                      ].map((mode) => (
                        <button
                          key={mode.id}
                          onClick={() => setTheme(mode.id as any)}
                          className={cn(
                            "px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
                            theme === mode.id 
                              ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm" 
                              : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                          )}
                        >
                          {mode.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Fatigue Row */}
                  <div className="flex items-center justify-between py-6 border-b border-slate-50 dark:border-slate-800/50">
                    <span className="text-[17px] font-bold text-slate-800 dark:text-slate-200">忽略疲勞限制</span>
                    <button
                      onClick={() => onSetIgnoreFatigue(!ignoreFatigue)}
                      className={cn(
                        "w-12 h-6 rounded-full transition-all relative",
                        ignoreFatigue ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-700"
                      )}
                    >
                      <div className={cn(
                        "w-4 h-4 bg-white rounded-full absolute top-1 transition-all shadow-sm",
                        ignoreFatigue ? "left-7" : "left-1"
                      )} />
                    </button>
                  </div>

                  {/* Recalculate Row */}
                  <div className="flex items-center justify-between py-6 border-b border-slate-50 dark:border-slate-800/50">
                    <div className="flex flex-col">
                      <span className="text-[17px] font-bold text-slate-800 dark:text-slate-200">重新校正戰力</span>
                      <span className="text-xs text-slate-400 font-bold">重新校正所有球員的生涯戰力</span>
                    </div>
                    <button
                      onClick={handleRecalculate}
                      disabled={isRecalculating}
                      className="px-6 py-2 rounded-full text-sm font-black transition-all bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center gap-2"
                    >
                      {isRecalculating ? <Loader2 size={16} className="animate-spin text-emerald-500" /> : <Calculator size={16} />}
                      {isRecalculating ? '校正中' : '開始校正'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
                {/* List Style Settings */}
                <div className="space-y-0 border-t border-slate-100 dark:border-slate-800 mt-4">
                  <div className="flex items-center justify-between py-6 border-b border-slate-50 dark:border-slate-800/50">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center">
                        <img src="https://upload.wikimedia.org/wikipedia/commons/4/41/LINE_logo.svg" className="w-6 h-6" alt="LINE" />
                      </div>
                      <span className="text-[17px] font-bold text-slate-800 dark:text-slate-200">LINE 群組推播</span>
                    </div>
                    <button
                      onClick={() => {
                        const newVal = !lineEnabled;
                        setLineEnabled(newVal);
                        localStorage.setItem('lineNotifications', String(newVal));
                        if (newVal) showAlert("通知已開啟", "LINE 推播功能已成功啟用。");
                      }}
                      className={cn(
                        "px-6 py-2 rounded-full text-sm font-black transition-all",
                        lineEnabled 
                          ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900" 
                          : "bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700"
                      )}
                    >
                      {lineEnabled ? '已開啟' : '立即啟用'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'players' && (
              <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
                {/* Simplified Add Button */}
                {activeTab === 'players' && showAddForm && (
                  <div className="mb-6 p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800/50 animate-in slide-in-from-top-4 duration-300">
                    <form onSubmit={handleAdd} className="space-y-4">
                      <div className="flex justify-between items-center mb-1">
                        <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-wider">批量新增球員</h4>
                        <button 
                          type="button" 
                          onClick={() => setShowAddForm(false)}
                          className="text-xs font-bold text-slate-400 hover:text-slate-600 p-1"
                        >
                          取消
                        </button>
                      </div>
                      <div className="relative">
                        <textarea
                          value={newPlayerNames}
                          autoFocus
                          onChange={(e) => setNewPlayerNames(e.target.value)}
                          placeholder="輸入姓名 (多行/空格/逗點即可)"
                          className="w-full p-5 rounded-2xl border border-slate-200 dark:border-slate-700 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all min-h-[100px] text-[15px] font-medium bg-white dark:bg-slate-900 resize-none shadow-sm"
                          disabled={loading}
                        />
                      </div>
                      <button 
                        type="submit" 
                        disabled={loading || !newPlayerNames.trim()}
                        className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-6 py-3 rounded-xl font-black transition-all flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98]"
                      >
                        {loading ? <Loader2 size={18} className="animate-spin" /> : <UserPlus size={18} />}
                        <span>匯入球員資料</span>
                      </button>
                    </form>
                  </div>
                )}

                {/* List Header / Batch Controls */}
                <div className="flex items-center justify-between px-2 pt-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                  <button 
                    onClick={toggleSelectAll}
                    className="flex items-center gap-2 text-xs font-black text-slate-400 hover:text-slate-600 transition-colors uppercase tracking-tight"
                  >
                    {selectedIds.size === players.length ? <CheckSquare size={16} className="text-emerald-500" /> : <Square size={16} />}
                    <span>{selectedIds.size === players.length ? "取消全選" : `全選 (${players.length})`}</span>
                  </button>
                  {selectedIds.size > 0 && (
                    <button 
                      onClick={handleBatchDelete}
                      disabled={loading}
                      className="text-xs font-black text-rose-500 bg-rose-50 dark:bg-rose-900/20 px-4 py-2 rounded-full transition-all hover:bg-rose-100"
                    >
                      刪除已選 ({selectedIds.size})
                    </button>
                  )}
                </div>

                {/* Player List */}
                <div className="divide-y divide-slate-50 dark:divide-slate-800/50">
                  {players.map((player) => {
                    const isSelected = selectedIds.has(player.id);
                    return (
                      <div 
                        key={player.id} 
                        className={cn(
                          "flex items-center gap-4 py-4 px-2 group transition-all",
                          isSelected && "bg-emerald-50/10"
                        )}
                      >
                        <button 
                          onClick={() => toggleSelect(player.id)}
                          className={cn(
                            "transition-colors",
                            isSelected ? "text-emerald-500" : "text-slate-200 dark:text-slate-700 group-hover:text-slate-300"
                          )}
                        >
                          {isSelected ? <CheckSquare size={18} /> : <Square size={18} />}
                        </button>
                        
                        <div 
                          className="w-10 h-10 rounded-xl overflow-hidden border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 shrink-0 cursor-pointer shadow-sm"
                          onClick={() => { onSelectPlayer(player.id); onClose(); }}
                        >
                          <img src={getAvatarUrl(player.avatar, player.name)} alt={player.name} className="w-full h-full object-cover" />
                        </div>

                        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => { onSelectPlayer(player.id); onClose(); }}>
                          <p className="font-extrabold text-slate-800 dark:text-slate-200 text-[15px] truncate">{player.name}</p>
                          <p className="text-[10px] font-bold text-slate-400">{player.hasBinding ? '已串接帳號' : '尚未綁定'}</p>
                        </div>

                        <div className="flex items-center gap-2">
                          {isAuthenticated && (
                            <div className="flex items-center gap-2">
                              {player.hasBinding && ownerMap[player.id] ? (
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleUnbind(player.id); }}
                                  disabled={bindingActionId === player.id}
                                  className="px-3 py-1.5 text-[11px] font-black rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 transition-all"
                                >
                                  解除
                                </button>
                              ) : !player.hasBinding ? (
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleBind(player.id); }}
                                  disabled={bindingActionId === player.id}
                                  className="px-3 py-1.5 text-[11px] font-black rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 transition-all"
                                >
                                  綁定
                                </button>
                              ) : null}
                            </div>
                          )}
                          <button 
                            onClick={(e) => { e.stopPropagation(); setEditingPlayer(player); setEditName(player.name); }} 
                            className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleDelete(player.id); }} 
                            disabled={actionId === player.id}
                            className="p-2 text-slate-300 hover:text-rose-500 dark:text-slate-800 dark:hover:text-rose-400 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

