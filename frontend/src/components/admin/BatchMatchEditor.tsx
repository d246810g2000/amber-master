import React, { useState, useEffect } from 'react';
import * as gasApi from '../../lib/gasApi';
import { MatchRecord } from '../../types';
import { useDialog } from '../../context/DialogContext';
import Save from "lucide-react/dist/esm/icons/save";
import Loader2 from "lucide-react/dist/esm/icons/loader-2";
import Search from "lucide-react/dist/esm/icons/search";
import Trash2 from "lucide-react/dist/esm/icons/trash-2";
import { cn } from '../../lib/utils';

interface BatchMatchEditorProps {
  onUpdate: () => void;
  date: string;
}

export const BatchMatchEditor: React.FC<BatchMatchEditorProps> = ({ onUpdate, date }) => {
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [edits, setEdits] = useState<Record<string, { winner?: number; score?: string }>>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const { showAlert, showConfirm } = useDialog();

  const fetchMatches = async () => {
    setLoading(true);
    try {
      const data = await gasApi.fetchMatches(date);
      setMatches(data as MatchRecord[]);
      setEdits({});
      setSelectedIds(new Set());
    } catch (err) {
      console.error(err);
      showAlert("讀取失敗", "無法取得比賽紀錄");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatches();
  }, [date]);

  const handleEdit = (matchId: string, field: 'winner' | 'score', value: any) => {
    setEdits(prev => ({
      ...prev,
      [matchId]: {
        ...prev[matchId],
        [field]: value
      }
    }));
  };

  const handleSave = async () => {
    const updateList = Object.entries(edits).map(([id, data]) => ({
      id,
      ...data
    }));

    if (updateList.length === 0) {
      showAlert("提示", "沒有任何變更需要儲存");
      return;
    }

    showConfirm("批次儲存", `確定要儲存這 ${updateList.length} 筆變更嗎？系統將自動重新計算所有戰力。`, async () => {
      setSaving(true);
      try {
        await gasApi.batchUpdateMatches(updateList);
        showAlert("儲存成功", "紀錄已更新，戰力數據已重新校準。");
        setEdits({});
        fetchMatches();
        onUpdate();
      } catch (err: any) {
        showAlert("儲存失敗", err.message || "請稍後再試");
      } finally {
        setSaving(false);
      }
    });
  };

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return;
    
    showConfirm("批量刪除", `確定要刪除選取的 ${selectedIds.size} 筆紀錄嗎？這將會觸發全數據重新校準。`, async () => {
      setSaving(true);
      try {
        await gasApi.batchDeleteMatches(Array.from(selectedIds));
        showAlert("成功", `已刪除 ${selectedIds.size} 筆紀錄，戰力數據已重新校準。`);
        setSelectedIds(new Set());
        fetchMatches();
        onUpdate();
      } catch (err: any) {
        showAlert("儲存失敗", err.message || "請稍後再試");
      } finally {
        setSaving(false);
      }
    });
  };

  const handleSelectToggle = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === matches.length && matches.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(matches.map(m => m.id)));
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Tool Bar */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1" />
        
        {selectedIds.size > 0 && (
          <button 
            onClick={handleBatchDelete}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2.5 bg-rose-500 text-white rounded-xl text-sm font-black shadow-lg shadow-rose-500/20 hover:bg-rose-600 transition-all disabled:opacity-50"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
            <span className="hidden sm:inline">批量刪除</span> ({selectedIds.size})
          </button>
        )}

        <button 
          onClick={handleSave}
          disabled={saving || Object.keys(edits).length === 0}
          className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-black shadow-lg shadow-emerald-500/20 hover:bg-emerald-700 transition-all disabled:opacity-50 disabled:grayscale"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          <span className="hidden sm:inline">批次儲存</span> ({Object.keys(edits).length})
        </button>
      </div>

      {/* Matches List */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 animate-pulse">
            <div className="w-12 h-12 border-4 border-slate-100 border-t-amber-500 rounded-full animate-spin mb-4" />
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">正在掃描戰報...</span>
          </div>
        ) : matches.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Search size={48} className="mb-4 opacity-10" />
            <p className="text-sm font-bold">當日無比賽紀錄</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-white dark:bg-slate-900 z-10">
                  <tr className="border-b border-slate-100 dark:border-slate-800">
                    <th className="py-4 px-2 w-10 text-center">
                      <input 
                        type="checkbox" 
                        checked={selectedIds.size === matches.length && matches.length > 0}
                        onChange={handleSelectAll}
                        className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                      />
                    </th>
                    <th className="py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-16">場次</th>
                    <th className="py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">時間</th>
                    <th className="py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">隊伍一</th>
                    <th className="py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">比分</th>
                    <th className="py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">隊伍二</th>
                    <th className="py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">勝方</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                  {matches.map((m) => {
                    const edit = edits[m.id] || {};
                    const currentWinner = edit.winner !== undefined ? edit.winner : m.winner;
                    const currentScore = edit.score !== undefined ? edit.score : m.score;

                    return (
                      <tr key={m.id} className={cn(
                        "group hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors",
                        selectedIds.has(m.id) && "bg-amber-500/5 dark:bg-amber-500/10"
                      )}>
                        <td className="py-3 px-2 text-center">
                          <input 
                            type="checkbox" 
                            checked={selectedIds.has(m.id)}
                            onChange={() => handleSelectToggle(m.id)}
                            className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                          />
                        </td>
                        <td className="py-3 px-4 text-xs font-black text-slate-400">#{m.matchNo || '-'}</td>
                        <td className="py-3 px-4 text-xs font-bold text-slate-500">{m.date.split(' ')[1] || m.date}</td>
                        <td className="py-3 px-4">
                          <div className="flex flex-col items-center gap-1">
                            {m.team1.map((p, i) => (
                              <span key={i} className="text-xs font-bold text-slate-700 dark:text-slate-200">{p.name}</span>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <input 
                            type="text" 
                            value={currentScore}
                            onChange={(e) => handleEdit(m.id, 'score', e.target.value)}
                            className="w-full text-center bg-transparent border-none focus:ring-1 focus:ring-amber-500 rounded text-sm font-black text-slate-900 dark:text-white"
                          />
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-col items-center gap-1">
                            {m.team2.map((p, i) => (
                              <span key={i} className="text-xs font-bold text-slate-700 dark:text-slate-200">{p.name}</span>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center gap-2">
                            <button 
                              onClick={() => handleEdit(m.id, 'winner', 1)}
                              className={cn(
                                "px-3 py-1 rounded-lg text-[10px] font-black transition-all",
                                currentWinner === 1 
                                  ? "bg-amber-500 text-white shadow-lg shadow-amber-500/20" 
                                  : "bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600"
                              )}
                            >
                              T1
                            </button>
                            <button 
                              onClick={() => handleEdit(m.id, 'winner', 2)}
                              className={cn(
                                "px-3 py-1 rounded-lg text-[10px] font-black transition-all",
                                currentWinner === 2 
                                  ? "bg-amber-500 text-white shadow-lg shadow-amber-500/20" 
                                  : "bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600"
                              )}
                            >
                              T2
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4 pb-10">
              {matches.map((m) => {
                const edit = edits[m.id] || {};
                const currentWinner = edit.winner !== undefined ? edit.winner : m.winner;
                const currentScore = edit.score !== undefined ? edit.score : m.score;

                return (
                  <div key={m.id} className={cn(
                    "p-4 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm transition-all relative",
                    selectedIds.has(m.id) ? "bg-amber-500/5 border-amber-500/20" : "bg-white dark:bg-slate-900"
                  )}>
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <input 
                          type="checkbox" 
                          checked={selectedIds.has(m.id)}
                          onChange={() => handleSelectToggle(m.id)}
                          className="w-5 h-5 rounded-lg border-slate-300 text-amber-600 focus:ring-amber-500"
                        />
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase">Match #{m.matchNo || '-'}</p>
                          <p className="text-xs font-bold text-slate-500">{m.date.split(' ')[1] || m.date}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => handleEdit(m.id, 'winner', 1)}
                          className={cn(
                            "px-4 py-1.5 rounded-xl text-[10px] font-black transition-all",
                            currentWinner === 1 
                              ? "bg-amber-500 text-white" 
                              : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                          )}
                        >
                          T1
                        </button>
                        <button 
                          onClick={() => handleEdit(m.id, 'winner', 2)}
                          className={cn(
                            "px-4 py-1.5 rounded-xl text-[10px] font-black transition-all",
                            currentWinner === 2 
                              ? "bg-amber-500 text-white" 
                              : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                          )}
                        >
                          T2
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl">
                      <div className="flex-1 flex flex-col items-center text-center">
                        {m.team1.map((p, i) => (
                          <span key={i} className="text-[11px] font-bold text-slate-700 dark:text-slate-200">{p.name}</span>
                        ))}
                      </div>
                      <div className="w-20">
                        <input 
                          type="text" 
                          value={currentScore}
                          onChange={(e) => handleEdit(m.id, 'score', e.target.value)}
                          className="w-full text-center bg-white dark:bg-slate-900 border-none focus:ring-2 focus:ring-amber-500 rounded-xl py-1 text-sm font-black text-slate-900 dark:text-white"
                        />
                      </div>
                      <div className="flex-1 flex flex-col items-center text-center">
                        {m.team2.map((p, i) => (
                          <span key={i} className="text-[11px] font-bold text-slate-700 dark:text-slate-200">{p.name}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
