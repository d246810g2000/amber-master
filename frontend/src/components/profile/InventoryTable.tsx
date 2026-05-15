import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as gasApi from '../../lib/gasApi';
import Check from "lucide-react/dist/esm/icons/check";
import Package from "lucide-react/dist/esm/icons/package";
import Calendar from "lucide-react/dist/esm/icons/calendar";
import Loader2 from "lucide-react/dist/esm/icons/loader-2";
import Sparkles from "lucide-react/dist/esm/icons/sparkles";
import { toast } from 'sonner';
import { cn } from '../../lib/utils';
import { PlayerPill } from '../PlayerPill';

interface InventoryTableProps {
  playerId: string;
  activeTitleId?: number | null;
  activeFrameId?: number | null;
  playerData: any;
  hidePreview?: boolean;
  onPreview?: (type: 'title' | 'frame', name: string) => void;
  onUpdate?: () => void;
}

export const InventoryTable: React.FC<InventoryTableProps> = ({ 
  playerId, 
  activeTitleId,
  activeFrameId,
  playerData,
  hidePreview = false,
  onPreview,
  onUpdate 
}) => {
  const queryClient = useQueryClient();
  const [previewTitle, setPreviewTitle] = useState<string | null>(null);
  const [previewFrame, setPreviewFrame] = useState<string | null>(null);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['playerInventory', playerId],
    queryFn: () => gasApi.fetchInventory(playerId),
  });

  const equipMutation = useMutation({
    mutationFn: (itemId: number) => gasApi.equipItem(playerId, itemId),
    onSuccess: () => {
      toast.success('裝備成功！');
      queryClient.invalidateQueries({ queryKey: ['playerProfile', playerId] });
      queryClient.invalidateQueries({ queryKey: ['players-base'] });
      onUpdate?.();
    },
    onError: (err: any) => {
      toast.error(err.message || '裝備失敗');
    }
  });

  const parseDaysLeft = (dateStr: string) => {
    if (!dateStr) return 0;
    try {
      const expire = new Date(dateStr.replace(' ', 'T')); // 處理一些格式不相容問題
      const now = new Date();
      const diff = expire.getTime() - now.getTime();
      return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    } catch (e) {
      return 0;
    }
  };

  // 模擬預覽球員資料
  const previewPlayer = useMemo(() => {
    const p = { ...playerData };
    if (previewTitle) p.active_title = { name: previewTitle };
    if (previewFrame) p.active_frame = { name: previewFrame };
    return p;
  }, [playerData, previewTitle, previewFrame]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin mb-2" />
        <p className="text-xs font-black uppercase tracking-widest">正在打開背包...</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400 bg-slate-50/50 dark:bg-slate-900/30 rounded-[2.5rem] border border-dashed border-slate-200 dark:border-slate-800">
        <Package className="w-12 h-12 mb-4 opacity-20" />
        <p className="text-sm font-bold">背包空空如也</p>
        <p className="text-[10px] uppercase tracking-tighter mt-1">快去商店消費吧！</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      {/* 左側：預覽區 (跑跑卡丁車風格) */}
      {!hidePreview && (
        <div className="lg:w-1/3 flex flex-col items-center shrink-0">
          <div className="sticky top-24 w-full flex flex-col items-center">
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Sparkles size={12} className="text-amber-500" />
              造型整備預覽
            </div>
            
            <div className="relative p-8 bg-slate-50/50 dark:bg-slate-950/40 rounded-[3rem] border border-slate-100 dark:border-white/5 w-full flex justify-center shadow-inner">
               <div className="scale-125 origin-center transform transition-all duration-500">
                  <PlayerPill 
                    player={previewPlayer} 
                    status="ready"
                    onClick={() => {}}
                    onProfileClick={() => {}}
                  />
               </div>
            </div>

            <div className="mt-6 w-full space-y-2">
              <p className="text-[10px] text-center text-slate-400 font-bold uppercase">目前的戰點風格</p>
              <div className="flex justify-center gap-2">
                 <div className="px-3 py-1 bg-white dark:bg-slate-900 rounded-full border border-slate-100 dark:border-slate-800 text-[10px] font-bold">
                   稱號: {previewPlayer.active_title?.name || '無'}
                 </div>
                 <div className="px-3 py-1 bg-white dark:bg-slate-900 rounded-full border border-slate-100 dark:border-slate-800 text-[10px] font-bold">
                   邊框: {previewPlayer.active_frame?.name || '無'}
                 </div>
              </div>
              {(previewTitle || previewFrame) && (
                <button 
                  onClick={() => { setPreviewTitle(null); setPreviewFrame(null); }}
                  className="w-full mt-2 text-[10px] text-sky-500 font-black hover:underline"
                >
                  重置預覽
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 右側：道具列表 */}
      <div className="flex-1">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((inv: any) => {
            const item = inv.item;
            // 強化 ID 比對邏輯 (確保轉為 Number)
            const isEquipped = Number(activeTitleId) === Number(item.id) || Number(activeFrameId) === Number(item.id);
            const daysLeft = parseDaysLeft(inv.expires_at);

            return (
              <div 
                key={inv.id}
                onClick={() => {
                  if (onPreview) {
                    onPreview(item.item_type, item.name);
                  } else {
                    if (item.item_type === 'title') setPreviewTitle(item.name);
                    if (item.item_type === 'frame') setPreviewFrame(item.name);
                  }
                }}
                className={cn(
                  "relative group bg-white dark:bg-slate-900 rounded-[2rem] p-5 border transition-all duration-300 cursor-pointer",
                  isEquipped 
                    ? "border-emerald-500 shadow-xl shadow-emerald-500/10 ring-1 ring-emerald-500/20" 
                    : "border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 shadow-sm"
                )}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={cn(
                        "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg",
                        item.item_type === 'title' ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400" : "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-400"
                      )}>
                        {item.item_type === 'title' ? '稱號' : '邊框'}
                      </span>
                      {isEquipped && (
                        <span className="flex items-center gap-0.5 text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
                          <Check size={10} strokeWidth={4} />
                          已裝備
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-black text-slate-800 dark:text-slate-100">
                      {item.name}
                    </h3>
                  </div>
                  <div className="flex items-center gap-1 text-slate-400 bg-slate-50 dark:bg-slate-950 px-2 py-1 rounded-lg">
                    <Calendar size={10} />
                    <span className="text-[10px] font-bold">剩餘 {daysLeft} 天</span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-5 line-clamp-2 leading-relaxed">
                  {item.description}
                </p>

                <div className="flex gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isEquipped) equipMutation.mutate(item.id);
                    }}
                    disabled={isEquipped || equipMutation.isPending}
                    className={cn(
                      "flex-1 py-2.5 rounded-xl text-xs font-black transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg",
                      isEquipped
                        ? "bg-emerald-500 text-white shadow-emerald-500/20 cursor-default"
                        : "bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90 shadow-slate-200 dark:shadow-none"
                    )}
                  >
                    {equipMutation.isPending && <Loader2 size={12} className="animate-spin" />}
                    {isEquipped ? (
                       <>
                         <Check size={12} strokeWidth={3} />
                         使用中
                       </>
                    ) : '立即裝備'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
