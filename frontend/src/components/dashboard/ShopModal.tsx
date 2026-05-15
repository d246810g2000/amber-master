import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import X from "lucide-react/dist/esm/icons/x";
import ShoppingBag from "lucide-react/dist/esm/icons/shopping-bag";
import Feather from "lucide-react/dist/esm/icons/feather";
import Star from "lucide-react/dist/esm/icons/star";
import Layout from "lucide-react/dist/esm/icons/layout";
import Tag from "lucide-react/dist/esm/icons/tag";
import Sparkles from "lucide-react/dist/esm/icons/sparkles";
import Check from "lucide-react/dist/esm/icons/check";
import RefreshCw from "lucide-react/dist/esm/icons/refresh-cw";
import Square from "lucide-react/dist/esm/icons/square";
import Layers from "lucide-react/dist/esm/icons/layers";
import Package from "lucide-react/dist/esm/icons/package";
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as gasApi from '../../lib/gasApi';
import { useAuth } from '../../context/AuthContext';
import { useDialog } from '../../context/DialogContext';
import { toast } from 'sonner';
import { cn, getAvatarUrl } from '../../lib/utils';
import { InventoryTable } from '../profile/InventoryTable';
import { PlayerPill } from '../PlayerPill';
import { Player } from '../../types';

interface ShopModalProps {
  onClose: () => void;
  onUpdate: () => void;
}

const CATEGORIES = [
  { id: 'all', label: '全部商品', icon: <Layout size={18} /> },
  { id: 'title', label: '專屬稱號', icon: <Tag size={18} /> },
  { id: 'background', label: '背景特效', icon: <Sparkles size={18} /> },
  { id: 'frame', label: '酷炫邊框', icon: <Star size={18} /> },
  { id: 'inventory', label: '我的背包', icon: <Package size={18} /> },
];

export const ShopModal: React.FC<ShopModalProps> = ({ onClose, onUpdate }) => {
  const { currentUser } = useAuth();
  const { showConfirm } = useDialog();
  const queryClient = useQueryClient();
  const [activeCategory, setActiveCategory] = useState('all');
  const [buyingId, setBuyingId] = useState<number | null>(null);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['shopItems'],
    queryFn: gasApi.fetchShopItems,
    staleTime: 60_000,
  });

  const { data: players = [], refetch: refetchPlayers } = useQuery({
    queryKey: ['players-base'],
    queryFn: gasApi.fetchPlayers,
    enabled: !!currentUser?.email,
    staleTime: 5000,
  });

  const boundPlayer = useMemo(() => 
    players.find((p: any) => p.email?.toLowerCase() === currentUser?.email?.toLowerCase()) as Player | undefined,
    [players, currentUser?.email]
  );

  const { data: inventory = [] } = useQuery({
    queryKey: ['playerInventory', boundPlayer?.id],
    queryFn: () => boundPlayer?.id ? gasApi.fetchInventory(boundPlayer.id) : Promise.resolve([]),
    enabled: !!boundPlayer?.id
  });

  const ownedItemIds = useMemo(() => 
    new Set(inventory?.map((inv: any) => inv.item_id) || []), 
    [inventory]
  );

  const [previewTitle, setPreviewTitle] = useState<string | null>(null);
  const [previewFrame, setPreviewFrame] = useState<string | null>(null);
  const [previewBackground, setPreviewBackground] = useState<string | null>(null);
  const [hasInitialized, setHasInitialized] = useState(false);

  useEffect(() => {
    if (boundPlayer && !hasInitialized) {
      setPreviewTitle(boundPlayer.active_title?.name || null);
      setPreviewFrame(boundPlayer.active_frame?.name || null);
      setPreviewBackground(boundPlayer.active_background?.name || null);
      setHasInitialized(true);
    }
  }, [boundPlayer, hasInitialized]);

  const previewPlayer = useMemo(() => {
    if (!boundPlayer) return null;
    const p = { ...boundPlayer } as Player;
    if (previewTitle) p.active_title = { id: 0, name: previewTitle, item_type: 'title' };
    if (previewFrame) p.active_frame = { id: 0, name: previewFrame, item_type: 'frame' };
    if (previewBackground) p.active_background = { id: 0, name: previewBackground, item_type: 'background' };
    return p;
  }, [boundPlayer, previewTitle, previewFrame, previewBackground]);

  const filteredItems = items.filter(item => 
    activeCategory === 'all' || item.item_type === activeCategory
  );

  const handleBuy = async (item: any) => {
    if (!currentUser?.email) {
      toast.error('請先登入');
      return;
    }
    if ((boundPlayer?.feathers || 0) < item.price) {
      toast.error('羽毛不足');
      return;
    }

    showConfirm(
      '購買確認',
      `確定要花費 ${item.price} 根羽毛購買「${item.name}」嗎？`,
      async () => {
        setBuyingId(item.id);
        try {
          await gasApi.buyShopItem(item.id, currentUser.email!);
          if (boundPlayer?.id) {
            await gasApi.equipItem(boundPlayer.id, item.id);
          }
          toast.success('購買成功！已自動為您裝備。');
          onUpdate();
          queryClient.invalidateQueries({ queryKey: ['players-base'] });
          queryClient.invalidateQueries({ queryKey: ['playerInventory', boundPlayer?.id] });
        } catch (err: any) {
          toast.error(err.message || '購買失敗');
        } finally {
          setBuyingId(null);
        }
      }
    );
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 50 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 50 }}
          className="relative bg-white dark:bg-slate-900 w-full md:max-w-5xl h-[92vh] md:h-[700px] md:rounded-[2.5rem] rounded-t-[2rem] mt-auto md:mt-0 shadow-2xl flex flex-col overflow-hidden border border-white dark:border-slate-800"
        >
          <div className="flex items-center justify-between px-4 py-3 md:p-6 border-b border-slate-100 dark:border-slate-800 shrink-0">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="p-2 md:p-2.5 bg-amber-500/10 rounded-xl md:rounded-2xl text-amber-500">
                <ShoppingBag size={20} className="md:w-6 md:h-6" />
              </div>
              <div>
                <h2 className="text-lg md:text-xl font-black text-slate-900 dark:text-white tracking-tight leading-none">羽毛精品店</h2>
                <p className="hidden md:block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1.5">Feather Boutique</p>
              </div>
            </div>

            <div className="flex items-center gap-2 md:gap-4">
              {boundPlayer && (
                <div className="flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 bg-sky-50 dark:bg-sky-900/20 rounded-xl md:rounded-2xl border border-sky-100 dark:border-sky-800/50">
                  <Feather size={14} className="text-sky-500" />
                  <span className="text-xs md:text-sm font-black text-sky-700 dark:text-sky-300 tabular-nums">
                    {boundPlayer.feathers}
                  </span>
                </div>
              )}
              <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-400">
                <X size={20} />
              </button>
            </div>
          </div>

          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            {previewPlayer && (
              <div className="w-full md:w-80 border-b md:border-b-0 md:border-r border-slate-100 dark:border-slate-800 flex flex-row md:flex-col items-center p-3 md:p-8 bg-slate-50/30 dark:bg-slate-950/10 shrink-0 gap-3 md:gap-0">
                <div className="hidden md:flex text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-10 items-center gap-2">
                  <Sparkles size={14} className="text-amber-500" />造型即時預覽
                </div>
                <div className="relative p-2 md:p-10 bg-white dark:bg-slate-900 rounded-xl md:rounded-[3rem] border border-slate-100 dark:border-white/5 flex justify-center shadow-sm shrink-0 overflow-hidden">
                   <div className="scale-[0.6] md:scale-125 origin-center transform transition-all duration-500">
                      <PlayerPill player={previewPlayer} status="ready" onClick={() => {}} onProfileClick={() => {}} />
                   </div>
                </div>
                <div className="flex-1 md:w-full space-y-4 ml-4 md:ml-0">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">當前搭配</span>
                    {(previewTitle || previewFrame || previewBackground) && (
                      <button onClick={() => { setPreviewTitle(null); setPreviewFrame(null); setPreviewBackground(null); }} className="text-[10px] font-bold text-amber-600 hover:text-amber-700 transition-colors flex items-center gap-1">
                        <RefreshCw size={10} />重設
                      </button>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    {previewTitle && <PreviewBadge label="稱" text={previewTitle} color="amber" />}
                    {previewFrame && <PreviewBadge icon={<Square size={10} />} text={previewFrame} color="blue" />}
                    {previewBackground && <PreviewBadge icon={<Layers size={10} />} text={previewBackground} color="emerald" />}
                  </div>
                </div>
              </div>
            )}

            <div className="flex-1 flex flex-col min-h-0 min-w-0 bg-white dark:bg-slate-900">
              <div className="flex items-center gap-1 p-1 md:p-2 bg-slate-50/50 dark:bg-slate-950/20 border-b border-slate-100 dark:border-slate-800 overflow-x-auto no-scrollbar">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={cn(
                      "flex items-center gap-1.5 md:gap-2.5 px-3 py-2.5 md:px-6 md:py-3 rounded-lg md:rounded-xl font-black text-[10px] md:text-xs transition-all relative overflow-hidden shrink-0",
                      activeCategory === cat.id 
                        ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm ring-1 ring-slate-200 dark:ring-white/10"
                        : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-white/50 dark:hover:bg-white/5"
                    )}
                  >
                    {React.cloneElement(cat.icon as React.ReactElement, { size: 14 } as any)}
                    <span className={cn(activeCategory !== cat.id && "hidden sm:inline")}>{cat.label}</span>
                    {activeCategory === cat.id && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 md:h-1 bg-amber-500" />}
                  </button>
                ))}
              </div>

              <div className="flex-1 overflow-y-auto p-3 md:p-8 custom-scrollbar">
                {isLoading ? (
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
                    {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-40 md:h-64 bg-slate-100 dark:bg-slate-800 rounded-2xl md:rounded-[2.5rem] animate-pulse" />)}
                  </div>
                ) : activeCategory === 'inventory' ? (
                  <div className="mt-2 md:mt-4">
                    {boundPlayer ? (
                      <InventoryTable 
                        playerId={boundPlayer.id}
                        activeTitleId={boundPlayer.active_title_id}
                        activeFrameId={boundPlayer.active_frame_id}
                        activeBackgroundId={boundPlayer.active_background_id}
                        playerData={boundPlayer}
                        hidePreview={true}
                        initialFilter="all"
                        onPreview={(type, name) => {
                          if (type === 'title') setPreviewTitle(name);
                          if (type === 'frame') setPreviewFrame(name);
                          if (type === 'background') setPreviewBackground(name);
                        }}
                        onUpdate={() => refetchPlayers()}
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                        <Package className="w-12 h-12 mb-4 opacity-20" /><p>請先綁定球員身分以查看背包</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-8">
                    {filteredItems.map(item => (
                      <ShopItemCard 
                        key={item.id}
                        item={item}
                        ownedItemIds={ownedItemIds}
                        boundPlayer={boundPlayer}
                        buyingId={buyingId}
                        onBuy={handleBuy}
                        onPreview={(type, name) => {
                          if (type === 'title') setPreviewTitle(name);
                          if (type === 'frame') setPreviewFrame(name);
                          if (type === 'background') setPreviewBackground(name);
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

const PreviewBadge: React.FC<{ label?: string, icon?: React.ReactNode, text: string, color: string }> = ({ label, icon, text, color }) => (
  <div className={cn(`p-2 md:p-3 bg-${color}-50 dark:bg-${color}-900/20 rounded-xl border border-${color}-100 dark:border-${color}-800/50 flex items-center justify-between group animate-in fade-in slide-in-from-left-2`)}>
    <div className="flex items-center gap-2">
      <div className={cn(`w-5 h-5 rounded-lg bg-${color}-400/20 flex items-center justify-center text-${color}-600 font-black`)}>
        {label || icon}
      </div>
      <span className={cn(`text-xs font-black text-${color}-800 dark:text-${color}-400`)}>{text}</span>
    </div>
  </div>
);

const ShopItemCard: React.FC<{
  item: any;
  ownedItemIds: Set<number>;
  boundPlayer: any;
  buyingId: number | null;
  onBuy: (item: any) => void;
  onPreview: (type: 'title' | 'frame' | 'background', name: string) => void;
}> = ({ item, ownedItemIds, boundPlayer, buyingId, onBuy, onPreview }) => {
  const isOwned = ownedItemIds.has(item.id);
  
  return (
    <motion.div
      onClick={() => onPreview(item.item_type, item.name)}
      className="group relative bg-white dark:bg-slate-800/40 rounded-2xl md:rounded-[2.5rem] p-3 md:p-6 border border-slate-100 dark:border-slate-800 hover:border-amber-500/30 dark:hover:border-amber-500/30 transition-all flex flex-col cursor-pointer hover:shadow-xl"
    >
      <div className="aspect-video bg-slate-50 dark:bg-slate-900 rounded-xl md:rounded-[2rem] mb-3 md:mb-6 flex items-center justify-center relative overflow-hidden shadow-inner border border-slate-100/50 dark:border-white/5">
        <div className="absolute inset-0 z-0">
          <img 
            src={
              item.item_type === 'title' 
                ? "/amber-master/assets/shop/title_badge.png"
                : item.item_type === 'frame'
                ? "/amber-master/assets/shop/frame_badge.png"
                : "/amber-master/assets/shop/background_badge.png"
            }
            alt={item.name}
            className="w-full h-full object-cover opacity-90 group-hover:scale-110 transition-transform duration-700"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-50/80 dark:from-slate-900/80 via-transparent to-transparent" />
        </div>

        {item.item_type === 'title' ? (
          <div className="relative w-[85%] flex justify-center z-10 px-1">
            <div 
              className="relative w-full font-black text-amber-700 dark:text-amber-400 bg-amber-100/80 dark:bg-amber-900/40 px-2 md:px-3 py-1.5 md:py-2 rounded-lg md:rounded-xl border border-amber-500/30 dark:border-amber-500/40 shadow-sm overflow-hidden flex items-center justify-center backdrop-blur-sm"
              style={{ 
                fontSize: item.name.length > 8 
                  ? 'clamp(8px, 2.5cqw, 10px)' 
                  : item.name.length > 5
                  ? 'clamp(10px, 3.5cqw, 12px)'
                  : 'clamp(12px, 4cqw, 16px)'
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full animate-shimmer" />
              <span className="relative whitespace-nowrap tracking-tight">{item.name}</span>
            </div>
          </div>
        ) : (
          <div className={cn(
            "w-12 h-12 md:w-20 md:h-20 rounded-full flex items-center justify-center relative transition-all duration-500 group-hover:scale-110 overflow-hidden z-10 shadow-lg",
            item.price >= 3000 ? "border-0" : "border-2 border-white/50"
          )}>
            {/* 特效背景顏色預覽 (關鍵字匹配邏輯) */}
            {item.item_type === 'background' && (
              <div 
                className="absolute inset-0 z-0 opacity-80"
                style={{ 
                  background: 
                    item.name.includes("櫻") || item.name.includes("粉") ? "linear-gradient(135deg, #fbcfe8, #f472b6)" :
                    item.name.includes("雷") || item.name.includes("電") ? "linear-gradient(135deg, #a855f7, #fbbf24)" :
                    item.name.includes("羽") || item.name.includes("藍") || item.name.includes("涼") ? "linear-gradient(135deg, #e0f2fe, #7dd3fc)" :
                    item.name.includes("星") || item.name.includes("夜") || item.name.includes("夢") ? "linear-gradient(135deg, #1e3a8a, #3b82f6)" :
                    item.name.includes("黑") || item.name.includes("暗") || item.name.includes("影") ? "linear-gradient(135deg, #1e293b, #020617)" :
                    item.name.includes("夕陽") || item.name.includes("金") || item.name.includes("黃") ? "linear-gradient(135deg, #fb923c, #f43f5e)" :
                    item.name.includes("森") || item.name.includes("青") || item.name.includes("綠") || item.name.includes("盎") ? "linear-gradient(135deg, #4ade80, #064e3b)" :
                    "linear-gradient(135deg, #94a3b8, #64748b)"
                }}
              />
            )}

            {item.item_type === 'frame' && (
               <div className="absolute inset-0 z-0">
                  <div 
                    className="absolute top-1/2 left-1/2 w-[300%] h-[300%] -translate-x-1/2 -translate-y-1/2 animate-spin-slow"
                    style={{ 
                      background: 
                        item.name.includes("金") ? "conic-gradient(from 0deg, transparent 0deg, #fbbf24 90deg, transparent 180deg, #fbbf24 270deg, transparent 360deg)" :
                        item.name.includes("極光") || item.name.includes("幻彩") ? "conic-gradient(from 0deg, #ff0000, #ff00ff, #0000ff, #00ffff, #00ff00, #ffff00, #ff0000)" :
                        item.name.includes("火") || item.name.includes("紅") ? "conic-gradient(from 0deg, #ef4444, #f97316, transparent, #ef4444)" :
                        item.name.includes("銀") || item.name.includes("白") || item.name.includes("羽") ? "conic-gradient(from 0deg, #cbd5e1, #f8fafc, transparent, #cbd5e1)" :
                        item.name.includes("雷") || item.name.includes("電") || item.name.includes("紫") ? "conic-gradient(from 0deg, #a855f7, #c084fc, transparent, #a855f7)" :
                        item.name.includes("翡翠") || item.name.includes("綠") || item.name.includes("青") ? "conic-gradient(from 0deg, #22c55e, #10b981, transparent, #22c55e)" :
                        item.name.includes("黑") || item.name.includes("影") || item.name.includes("暗") ? "conic-gradient(from 0deg, #475569, #020617, transparent, #475569)" :
                        item.name.includes("青銅") ? "conic-gradient(from 0deg, #b45309, #d97706, transparent, #b45309)" :
                        "conic-gradient(from 0deg, #e2e8f0, #f8fafc, transparent, #e2e8f0)"
                    }}
                  />
               </div>
            )}
            
            <div className="absolute inset-[2.5px] rounded-full bg-slate-50/30 dark:bg-slate-900/30 backdrop-blur-[2px] z-[5]" />
          </div>
        )}
      </div>

      <h3 className="text-sm md:text-lg font-black text-slate-900 dark:text-white mb-1 md:mb-2 truncate">{item.name}</h3>
      <p className="hidden md:block text-xs text-slate-400 dark:text-slate-500 mb-6 line-clamp-2 leading-relaxed flex-1">{item.description || '一件神祕的珍寶'}</p>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between mt-auto pt-2 md:pt-4 border-t border-slate-50 dark:border-slate-800 gap-2">
        <div className="flex flex-col">
           <span className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-wider">有效期 {item.duration_days} 天</span>
           <div className="flex items-center gap-1 mt-0.5 md:mt-1">
              <Feather size={12} className="text-sky-500 md:w-3.5 md:h-3.5" />
              <span className="text-sm md:text-lg font-black text-slate-900 dark:text-white tracking-tight leading-none">{item.price}</span>
           </div>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); if (!isOwned) onBuy(item); }}
          disabled={buyingId === item.id || (boundPlayer?.feathers || 0) < item.price || isOwned}
          className={cn(
            "px-3 py-2 md:px-6 md:py-3 rounded-xl font-black text-[10px] md:text-xs transition-all active:scale-95 whitespace-nowrap shadow-sm",
            isOwned ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400 cursor-default" : (boundPlayer?.feathers || 0) < item.price ? "bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed" : "bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-200 dark:shadow-none"
          )}
        >
          {buyingId === item.id ? <div className="w-3 h-3 md:w-4 md:h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : isOwned ? '已持有' : '兌換'}
        </button>
      </div>
    </motion.div>
  );
};
