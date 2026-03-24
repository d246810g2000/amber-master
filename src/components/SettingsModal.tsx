import React, { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useDialog } from '../context/DialogContext';
import { Player } from '../types';
import Trash2 from "lucide-react/dist/esm/icons/trash-2";
import Edit2 from "lucide-react/dist/esm/icons/edit-2";
import UserPlus from "lucide-react/dist/esm/icons/user-plus";
import X from "lucide-react/dist/esm/icons/x";
import CheckSquare from "lucide-react/dist/esm/icons/check-square";
import Square from "lucide-react/dist/esm/icons/square";
import Loader2 from "lucide-react/dist/esm/icons/loader-2";
import Calculator from "lucide-react/dist/esm/icons/calculator";
import Settings from "lucide-react/dist/esm/icons/settings";
import Bell from "lucide-react/dist/esm/icons/bell";
import Users from "lucide-react/dist/esm/icons/users";
import ChevronRight from "lucide-react/dist/esm/icons/chevron-right";

import Monitor from "lucide-react/dist/esm/icons/monitor";
import * as gasApi from '../lib/gasApi';
import * as matchEngine from '../lib/matchEngine';
import { getAvatarUrl, cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

type Tab = 'general' | 'notifications' | 'players';

interface SettingsModalProps {
  players: Player[];
  onUpdate: () => void;
  onSelectPlayer: (id: string) => void;
  onClose: () => void;
  ignoreFatigue: boolean;
  onSetIgnoreFatigue: (value: boolean) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  players, onUpdate, onSelectPlayer, onClose,
  ignoreFatigue, onSetIgnoreFatigue
}) => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>('general');
  const [newPlayerNames, setNewPlayerNames] = useState('');
  // const [editingPlayer, setEditingPlayer] = useState<Player | null>(null); // 保留備用
  // const [editName, setEditName] = useState(''); // 保留備用
  const [showAddForm, setShowAddForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [bindingActionId, setBindingActionId] = useState<string | null>(null);
  const [ownerMap, setOwnerMap] = useState<Record<string, boolean>>({});
  const { showAlert, showConfirm } = useDialog();
  const { currentUser, isAuthenticated } = useAuth();
  const { theme, setTheme } = useTheme();

  const [lineEnabled, setLineEnabled] = useState(() => {
    return localStorage.getItem('lineNotifications') !== 'false';
  });

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
          id, mu: stats.mu, sigma: stats.sigma
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
    const names = newPlayerNames.split(/[\n,，\s]+/).map(n => n.trim()).filter(n => n.length > 0);
    if (names.length === 0) return;
    setLoading(true);
    try {
      if (names.length === 1) await gasApi.addPlayer(names[0]);
      else await gasApi.addPlayersBatch(names);
      setNewPlayerNames('');
      setShowAddForm(false);
      onUpdate();
    } catch (err) {
      showAlert("新增失敗", "無法將球員加入名單。");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    showConfirm("刪除球員", "確定要刪除這位球員嗎？", async () => {
      setActionId(id);
      try {
        await gasApi.deletePlayer(id);
        onUpdate();
      } catch (err) {
        showAlert("刪除失敗", "無法從資料庫移除球員。");
      } finally {
        setActionId(null);
      }
    });
  };

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return;
    showConfirm("批量刪除", `確定要刪除選取的 ${selectedIds.size} 位球員嗎？`, async () => {
      setLoading(true);
      try {
        await gasApi.deletePlayersBatch([...selectedIds]);
        setSelectedIds(new Set());
        onUpdate();
        showAlert("刪除成功", "已成功移除選取的球員。");
      } catch (err) {
        showAlert("刪除失敗", "部分或全部球員無法移除。");
      } finally {
        setLoading(false);
      }
    });
  };

  useEffect(() => {
    const loadBindingStatus = async () => {
      if (!isAuthenticated || !currentUser?.email || players.length === 0) {
        setOwnerMap({});
        return;
      }
      const results = await Promise.all(
        players.map(async (p) => {
          try {
            const b = await gasApi.getPlayerBinding(p.id, currentUser.email!);
            return [p.id, b.isOwner] as const;
          } catch {
            return [p.id, false] as const;
          }
        })
      );
      const next: Record<string, boolean> = {};
      results.forEach(([id, isOwner]) => { next[id] = isOwner; });
      setOwnerMap(next);
    };
    loadBindingStatus();
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

  const MobileNavItem = ({ id, label, icon: Icon }: { id: Tab, label: string, icon: any }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={cn(
        "flex flex-col items-center gap-1.5 px-6 py-3 shrink-0 transition-all border-b-2",
        activeTab === id
          ? "border-slate-900 dark:border-white text-slate-900 dark:text-white"
          : "border-transparent text-slate-400 dark:text-slate-500"
      )}
    >
      <Icon size={18} />
      <span className="text-[11px] font-black uppercase tracking-widest">{label}</span>
    </button>
  );

  return (
    <div className="fixed inset-0 bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-[8px] flex items-center justify-center p-0 md:p-4 z-50 animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-900 md:rounded-[2.5rem] w-full max-w-[900px] h-full md:h-[650px] shadow-2xl md:border border-white/20 dark:border-white/5 flex flex-col md:flex-row overflow-hidden relative">

        {/* Desktop Sidebar */}
        <div className="hidden md:flex w-[260px] bg-slate-50/50 dark:bg-slate-900/50 border-r border-slate-100 dark:border-slate-800 p-6 pt-20 flex-col shrink-0">
          <button
            onClick={onClose}
            className="absolute top-6 left-6 z-[60] p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 rounded-lg transition-all"
          >
            <X size={20} />
          </button>
          <div className="flex-1 space-y-1">
            <SidebarItem id="general" label="一般" icon={Settings} />
            <SidebarItem id="notifications" label="通知" icon={Bell} />
            <SidebarItem id="players" label="管理球員" icon={Users} />
          </div>
        </div>

        {/* Mobile Header & Nav */}
        <div className="md:hidden flex flex-col pt-4 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center justify-between px-6 pb-2">
            <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              {activeTab === 'general' ? '一般' : activeTab === 'notifications' ? '通知' : '管理球員'}
            </h2>
            <div className="flex items-center gap-1">
              {activeTab === 'players' && !showAddForm && (
                <button 
                  onClick={() => setShowAddForm(true)}
                  className="p-2 text-slate-900 dark:text-white"
                >
                  <UserPlus size={24} />
                </button>
              )}
              <button onClick={onClose} className="p-2 text-slate-400"><X size={24} /></button>
            </div>
          </div>
          <div className="flex overflow-x-auto scrollbar-hide">
            <MobileNavItem id="general" label="一般" icon={Settings} />
            <MobileNavItem id="notifications" label="通知" icon={Bell} />
            <MobileNavItem id="players" label="管理球員" icon={Users} />
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-white dark:bg-slate-900">

          {/* Desktop Title Header */}
          <div className="hidden md:flex justify-between items-center px-10 pt-10 pb-6 shrink-0">
            <div>
              <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">
                {activeTab === 'general' ? '一般' : activeTab === 'notifications' ? '通知' : '管理球員'}
              </h2>
              <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">
                {activeTab === 'general' ? '偏好設定' : activeTab === 'notifications' ? '即時更新' : `現役球員：${players.length} 位`}
              </p>
            </div>
            {activeTab === 'players' && !showAddForm && (
              <button
                onClick={() => setShowAddForm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-sm font-bold shadow-sm hover:scale-105 transition-transform"
              >
                <UserPlus size={16} /> 新增球員
              </button>
            )}
          </div>

          {/* Scrollable Content Body */}
          <div className="flex-1 overflow-y-auto min-h-0 px-6 py-6 md:px-10 md:py-0 md:pb-10">

            {/* --- General Tab --- */}
            {activeTab === 'general' && (
              <div className="space-y-6">
                <div className="space-y-0">
                  {/* Appearance */}
                  <div className="flex items-center justify-between py-5 md:py-6 border-b border-slate-100 dark:border-slate-800/50">
                    <div className="flex items-center gap-3">
                      <div className="md:hidden w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-500">
                        <Monitor size={18} />
                      </div>
                      <span className="text-base md:text-[17px] font-bold text-slate-800 dark:text-slate-200">外觀樣式</span>
                    </div>
                    <div className="flex items-center gap-1.5 md:gap-3 cursor-pointer group" onClick={() => {
                      const next: any = theme === 'system' ? 'light' : theme === 'light' ? 'dark' : 'system';
                      setTheme(next);
                    }}>
                      <span className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest group-hover:text-slate-800 dark:group-hover:text-white transition-colors">
                        {theme === 'system' ? '系統自動' : theme === 'light' ? '淺色模式' : '深色模式'}
                      </span>
                      <ChevronRight size={16} className="text-slate-300" />
                    </div>
                  </div>

                  {/* Fatigue */}
                  <div className="flex items-center justify-between py-5 md:py-6 border-b border-slate-100 dark:border-slate-800/50">
                    <span className="text-base md:text-[17px] font-bold text-slate-800 dark:text-slate-200">忽略疲勞限制</span>
                    <button onClick={() => onSetIgnoreFatigue(!ignoreFatigue)}
                      className={cn("w-12 h-6 rounded-full relative transition-all", ignoreFatigue ? "bg-emerald-500" : "bg-slate-200 dark:bg-slate-800")}>
                      <div className={cn("w-4 h-4 bg-white rounded-full absolute top-1 transition-all shadow-sm", ignoreFatigue ? "translate-x-7" : "translate-x-1")} />
                    </button>
                  </div>

                  {/* Recalculate */}
                  <div className="flex items-center justify-between py-5 md:py-6 border-b border-slate-100 dark:border-slate-800/50">
                    <div className="flex flex-col">
                      <span className="text-base md:text-[17px] font-bold text-slate-800 dark:text-slate-200">重新校正戰力</span>
                    </div>
                    <div className="flex items-center gap-2 cursor-pointer" onClick={handleRecalculate}>
                      <span className="text-sm font-bold text-slate-400 dark:text-slate-500">
                        {isRecalculating ? '處理中' : '去推算'}
                      </span>
                      {isRecalculating ? <Loader2 size={16} className="animate-spin text-emerald-500" /> : <ChevronRight size={16} className="text-slate-300" />}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* --- Notifications Tab --- */}
            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between py-6 border-b border-slate-100 dark:border-slate-800/50">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center">
                      <img src="https://upload.wikimedia.org/wikipedia/commons/4/41/LINE_logo.svg" className="w-6 h-6" alt="LINE" />
                    </div>
                    <span className="text-base font-bold text-slate-800 dark:text-slate-200">LINE 群組推播</span>
                  </div>
                  <button onClick={() => {
                    const n = !lineEnabled; setLineEnabled(n); localStorage.setItem('lineNotifications', String(n));
                    if (n) showAlert("通知已開啟", "LINE 推播功能已啟用。");
                  }}
                    className={cn("px-6 py-2 rounded-full text-xs font-black transition-all",
                      lineEnabled ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900" : "bg-slate-100 dark:bg-slate-800 text-slate-500")}>
                    {lineEnabled ? '已開啟' : '啟用'}
                  </button>
                </div>
              </div>
            )}

            {/* --- Players Tab --- */}
            {activeTab === 'players' && (
              <div className="space-y-4">
                {showAddForm && (
                  <div className="mb-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700 animate-in slide-in-from-top-4">
                    <form onSubmit={handleAdd} className="space-y-4">
                      <textarea value={newPlayerNames} onChange={(e) => setNewPlayerNames(e.target.value)} placeholder="輸入姓名 (多行/空格/逗點即可)"
                        className="w-full p-4 rounded-xl border dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-500 outline-none transition-all" rows={3} disabled={loading} />
                      <div className="flex gap-2">
                        <button type="submit" disabled={loading} className="flex-1 bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-3 rounded-xl font-black text-xs disabled:opacity-50 flex justify-center items-center">
                          {loading ? <Loader2 size={16} className="animate-spin" /> : '匯入資料'}
                        </button>
                        <button type="button" onClick={() => setShowAddForm(false)} className="px-4 text-slate-400 text-xs font-bold font-sans hover:text-slate-600 transition-colors">取消</button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Batch Actions Header */}
                <div className="flex items-center justify-between px-2 pb-2 border-b border-slate-50 dark:border-slate-800">
                  <button onClick={() => setSelectedIds(selectedIds.size === players.length && players.length > 0 ? new Set() : new Set(players.map(p => p.id)))}
                    className="text-[10px] font-black text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 uppercase tracking-widest flex items-center gap-2 transition-colors">
                    {selectedIds.size === players.length && players.length > 0 ? <CheckSquare size={14} /> : <Square size={14} />}
                    全選 ({players.length})
                  </button>
                  {selectedIds.size > 0 && (
                    <button onClick={handleBatchDelete} className="text-[10px] font-black text-rose-500 hover:text-rose-600 uppercase flex items-center gap-1 transition-colors">
                      {loading ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                      刪除已選 ({selectedIds.size})
                    </button>
                  )}
                </div>

                {/* Player List */}
                <div className="space-y-1">
                  {players.map(p => (
                    <div key={p.id} className="flex items-center gap-3 py-3 border-b border-slate-50 dark:border-slate-800/50 group hover:bg-slate-50 dark:hover:bg-slate-800/30 px-2 rounded-xl transition-colors">
                      {/* Checkbox for Batch Delete */}
                      <button onClick={() => {
                        const newSet = new Set(selectedIds);
                        if (newSet.has(p.id)) newSet.delete(p.id);
                        else newSet.add(p.id);
                        setSelectedIds(newSet);
                      }} className="text-slate-300 dark:text-slate-600 hover:text-slate-500 transition-colors">
                        {selectedIds.has(p.id) ? <CheckSquare size={16} className="text-indigo-500" /> : <Square size={16} />}
                      </button>

                      <div className="w-8 h-8 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0">
                        <img src={getAvatarUrl(p.avatar, p.name)} className="w-full h-full object-cover" alt={p.name} />
                      </div>

                      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => { onSelectPlayer(p.id); onClose(); }}>
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{p.name}</p>
                      </div>

                      <button onClick={() => handleDelete(p.id)} className="p-2 text-slate-300 dark:text-slate-700 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all" title="刪除單一球員">
                        {actionId === p.id ? <Loader2 size={16} className="animate-spin text-rose-500" /> : <Trash2 size={16} />}
                      </button>
                    </div>
                  ))}
                  {players.length === 0 && (
                    <div className="py-10 text-center text-slate-400 text-sm font-bold">目前沒有球員資料</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};