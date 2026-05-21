import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as gasApi from '../../lib/gasApi';
import Check from "lucide-react/dist/esm/icons/check";
import Package from "lucide-react/dist/esm/icons/package";
import Calendar from "lucide-react/dist/esm/icons/calendar";
import Loader2 from "lucide-react/dist/esm/icons/loader-2";
import Sparkles from "lucide-react/dist/esm/icons/sparkles";
import Tag from "lucide-react/dist/esm/icons/tag";
import Star from "lucide-react/dist/esm/icons/star";
import { toast } from 'sonner';
import { cn } from '../../lib/utils';
import { PlayerPill } from '../PlayerPill';

interface InventoryTableProps {
  playerId: string;
  activeTitleId?: number | null;
  activeFrameId?: number | null;
  activeBackgroundId?: number | null;
  playerData: any;
  hidePreview?: boolean;
  initialFilter?: 'all' | 'title' | 'frame' | 'background';
  onPreview?: (type: 'title' | 'frame' | 'background', name: string) => void;
  onUpdate?: () => void;
}

export const InventoryTable: React.FC<InventoryTableProps> = ({ 
  playerId, 
  activeTitleId,
  activeFrameId,
  activeBackgroundId,
  playerData,
  hidePreview = false,
  initialFilter = 'all',
  onPreview,
  onUpdate 
}) => {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'all' | 'title' | 'frame' | 'background'>(initialFilter);

  // Sync filter when initialFilter changes
  useEffect(() => {
    setFilter(initialFilter);
  }, [initialFilter]);
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
      queryClient.invalidateQueries({ queryKey: ['playerInventory', playerId] });
      queryClient.invalidateQueries({ queryKey: ['playerProfile', playerId] });
      queryClient.invalidateQueries({ queryKey: ['players-base'] });
      queryClient.invalidateQueries({ queryKey: ['players'] });
      onUpdate?.();
    },
    onError: (err: any) => {
      toast.error(err.message || '裝備失敗');
    }
  });

  const getDurationText = (dateStr: string | null | undefined) => {
    if (!dateStr) return '永久擁有';
    try {
      const expire = new Date(dateStr.replace(' ', 'T'));
      const now = new Date();
      const diff = expire.getTime() - now.getTime();
      const days = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
      return `剩餘 ${days} 天`;
    } catch (e) {
      return '已過期';
    }
  };

  const filteredItems = useMemo(() => {
    if (!items || !Array.isArray(items)) return [];
    if (filter === 'all') return items;
    return items.filter((inv: any) => inv?.item?.item_type === filter);
  }, [items, filter]);

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
    <div className="flex flex-col gap-6">
      {/* 分類切換 */}
      <div className="flex gap-2 mb-4 md:mb-6">
        {(['all', 'title', 'background', 'frame'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "px-3 py-1.5 md:px-6 md:py-2 rounded-full text-[9px] md:text-xs font-black uppercase tracking-widest transition-all",
              filter === f 
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm" 
                : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
            )}
          >
            {f === 'all' ? '全部' : f === 'title' ? '稱號' : f === 'background' ? '背景' : '邊框'}
          </button>
        ))}
      </div>

      {/* 道具網格 */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
        {filteredItems.map((inv: any) => {
          const item = inv?.item;
          if (!item) return null;
          const isEquipped = (item.item_type === 'title' && Number(activeTitleId) === Number(item.id)) || 
                            (item.item_type === 'frame' && Number(activeFrameId) === Number(item.id)) ||
                            (item.item_type === 'background' && Number(activeBackgroundId) === Number(item.id));
          // duration text will be parsed inside the card

          return (
            <div 
              key={inv.id}
              onClick={() => {
                if (onPreview) {
                  onPreview(item.item_type, item.name);
                } else {
                  if (item.item_type === 'title') setPreviewTitle(item.name);
                  if (item.item_type === 'frame' || item.item_type === 'background') setPreviewFrame(item.name);
                }
              }}
              className={cn(
                "group relative bg-white dark:bg-slate-900 rounded-xl md:rounded-[2rem] p-3 md:p-6 border transition-all duration-300 cursor-pointer flex flex-col",
                isEquipped 
                  ? "border-emerald-500 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-500/20" 
                  : "border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 hover:shadow-md"
              )}
            >
              {/* 卡片標頭 */}
              <div className="flex items-start justify-between mb-4">
                <div className={cn(
                  "p-1.5 md:p-2 rounded-lg md:rounded-xl",
                  item.item_type === 'title' ? "bg-amber-100 text-amber-600" : 
                  item.item_type === 'background' ? "bg-emerald-100 text-emerald-600" :
                  "bg-sky-100 text-sky-600"
                )}>
                  {item.item_type === 'title' ? <Tag size={12} className="md:w-4 md:h-4" /> : 
                   item.item_type === 'background' ? <Sparkles size={12} className="md:w-4 md:h-4" /> :
                   <Star size={12} className="md:w-4 md:h-4" />}
                </div>
                {isEquipped && (
                  <div className="bg-emerald-500 text-white px-1.5 py-0.5 md:px-2 md:py-1 rounded-lg text-[7px] md:text-[8px] font-black uppercase tracking-tighter flex items-center gap-0.5 md:gap-1">
                    <Check size={8} strokeWidth={4} className="md:w-3 md:h-3" />
                    使用中
                  </div>
                )}
              </div>

              {/* 內容 */}
              <div className="flex-1">
                <h3 className="text-xs md:text-base font-black text-slate-800 dark:text-slate-100 mb-0.5 md:mb-1 group-hover:text-amber-500 transition-colors truncate">
                  {item.name}
                </h3>
                <div className={cn(
                  "flex items-center gap-1 text-[8px] md:text-[10px] font-bold mb-2 md:mb-3",
                  inv.expires_at 
                    ? "text-slate-400" 
                    : "text-amber-500 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-1.5 py-0.5 rounded"
                )}>
                  <Calendar size={8} className="md:w-3 md:h-3" />
                  <span>{getDurationText(inv.expires_at)}</span>
                </div>
                <p className="hidden md:block text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed mb-6">
                  {item.description}
                </p>
              </div>

              {/* 操作按鈕 */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isEquipped) equipMutation.mutate(item.id);
                }}
                disabled={isEquipped || equipMutation.isPending}
                className={cn(
                  "w-full py-2 md:py-3 rounded-lg md:rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-[0.1em] md:tracking-[0.15em] transition-all active:scale-95 flex items-center justify-center gap-1 md:gap-2",
                  isEquipped
                    ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 cursor-default"
                    : "bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90"
                )}
              >
                {equipMutation.isPending ? (
                  <Loader2 size={10} className="animate-spin md:w-4 md:h-4" />
                ) : isEquipped ? (
                   <>使用中</>
                ) : (
                  <>立即裝備</>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
