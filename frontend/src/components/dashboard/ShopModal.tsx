import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import X from "lucide-react/dist/esm/icons/x";
import ShoppingBag from "lucide-react/dist/esm/icons/shopping-bag";
import Feather from "lucide-react/dist/esm/icons/feather";
import Star from "lucide-react/dist/esm/icons/star";
import Layout from "lucide-react/dist/esm/icons/layout";
import Tag from "lucide-react/dist/esm/icons/tag";
import Sparkles from "lucide-react/dist/esm/icons/sparkles";
import Check from "lucide-react/dist/esm/icons/check";
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as gasApi from '../../lib/gasApi';
import { useAuth } from '../../context/AuthContext';
import { useDialog } from '../../context/DialogContext';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';
import { InventoryTable } from '../profile/InventoryTable';
import { PlayerPill } from '../PlayerPill';
import Package from "lucide-react/dist/esm/icons/package";

interface ShopModalProps {
  onClose: () => void;
  onUpdate: () => void;
}

const CATEGORIES = [
  { id: 'all', label: '全部商品', icon: <Layout size={18} /> },
  { id: 'title', label: '專屬稱號', icon: <Tag size={18} /> },
  { id: 'frame', label: '酷炫邊框', icon: <Star size={18} /> },
  { id: 'inventory', label: '我的背包', icon: <Package size={18} /> },
];

export const ShopModal: React.FC<ShopModalProps> = ({ onClose, onUpdate }) => {
  const { currentUser } = useAuth();
  const { showConfirm } = useDialog();
  const queryClient = useQueryClient();
  const [activeCategory, setActiveCategory] = useState('all');
  const [buyingId, setBuyingId] = useState<number | null>(null);

  // 1. 取得商品列表
  const { data: items = [], isLoading } = useQuery({
    queryKey: ['shopItems'],
    queryFn: gasApi.fetchShopItems,
    staleTime: 60_000,
  });

  // 2. 取得目前玩家資訊 (用來確認餘額與背包)
  const { data: players = [], refetch: refetchPlayers } = useQuery({
    queryKey: ['players-base'],
    queryFn: gasApi.fetchPlayers,
    enabled: !!currentUser?.email,
    staleTime: 5000, // 縮短快取時間，確保餘額準確
  });

  const boundPlayer = useMemo(() => 
    players.find((p: any) => p.email?.toLowerCase() === currentUser?.email?.toLowerCase()),
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

  const previewPlayer = useMemo(() => {
    if (!boundPlayer) return null;
    const p = { ...boundPlayer };
    if (previewTitle) p.active_title = { name: previewTitle };
    if (previewFrame) p.active_frame = { name: previewFrame };
    return p;
  }, [boundPlayer, previewTitle, previewFrame]);

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
          toast.success('購買成功！已自動為您裝備。');
          onUpdate();
          queryClient.invalidateQueries({ queryKey: ['players-base'] });
          queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
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
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative bg-white dark:bg-slate-900 w-full max-w-4xl h-[85vh] md:h-[600px] rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden border border-white dark:border-slate-800"
        >
          <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800 shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-500/10 rounded-2xl text-amber-500">
                <ShoppingBag size={24} />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight leading-none">羽毛精品店</h2>
                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1.5">Feather Boutique</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {!boundPlayer && currentUser && (
                <span className="text-[10px] font-black text-rose-500 bg-rose-50 dark:bg-rose-950/30 px-3 py-1.5 rounded-xl border border-rose-100 dark:border-rose-900/50 animate-pulse">
                  尚未綁定球員身分，無法購買
                </span>
              )}
              {boundPlayer && (
                <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-sky-50 dark:bg-sky-900/20 rounded-2xl border border-sky-100 dark:border-sky-800/50">
                  <Feather size={14} className="text-sky-500" />
                  <span className="text-sm font-black text-sky-700 dark:text-sky-300 tabular-nums">
                    {boundPlayer.feathers}
                  </span>
                </div>
              )}
              <button 
                onClick={onClose}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-400"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          <div className="flex-1 flex overflow-hidden">
            {/* 1. Left Side: Persistent Preview (The Locker Room) */}
            {previewPlayer && (
              <div className="w-72 md:w-80 border-r border-slate-100 dark:border-slate-800 flex flex-col items-center p-8 bg-slate-50/30 dark:bg-slate-950/10 shrink-0">
                <div className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-10 flex items-center gap-2">
                  <Sparkles size={14} className="text-amber-500" />
                  造型即時預覽
                </div>
                
                <div className="relative p-10 bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-white/5 w-full flex justify-center shadow-sm">
                   <div className="scale-125 origin-center transform transition-all duration-500">
                      <PlayerPill 
                        player={previewPlayer} 
                        status="ready"
                        onClick={() => {}}
                        onProfileClick={() => {}}
                      />
                   </div>
                </div>

                <div className="mt-10 w-full space-y-4">
                  <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                    <p className="text-[9px] text-slate-400 font-bold uppercase mb-1 tracking-wider">預覽稱號</p>
                    <p className="text-sm font-black text-slate-700 dark:text-slate-200">
                      {previewPlayer.active_title?.name || <span className="text-slate-300 dark:text-slate-600">未選取</span>}
                    </p>
                  </div>
                  <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                    <p className="text-[9px] text-slate-400 font-bold uppercase mb-1 tracking-wider">預覽邊框</p>
                    <p className="text-sm font-black text-slate-700 dark:text-slate-200">
                      {previewPlayer.active_frame?.name || <span className="text-slate-300 dark:text-slate-600">未選取</span>}
                    </p>
                  </div>
                  {(previewTitle || previewFrame) && (
                    <button 
                      onClick={() => { setPreviewTitle(null); setPreviewFrame(null); }}
                      className="w-full py-3 text-[11px] text-sky-500 font-black hover:bg-sky-50 dark:hover:bg-sky-900/20 rounded-xl transition-all border border-transparent hover:border-sky-100 dark:hover:border-sky-800"
                    >
                      重置預覽造型
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* 2. Right Side: Content Area */}
            <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-slate-900">
              {/* Top Navigation Tabs */}
              <div className="flex items-center gap-1 p-2 bg-slate-50/50 dark:bg-slate-950/20 border-b border-slate-100 dark:border-slate-800">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={cn(
                      "flex items-center gap-2.5 px-6 py-3 rounded-xl font-black text-xs transition-all relative overflow-hidden",
                      activeCategory === cat.id 
                        ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm ring-1 ring-slate-200 dark:ring-white/10"
                        : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-white/50 dark:hover:bg-white/5"
                    )}
                  >
                    {cat.icon}
                    <span>{cat.label}</span>
                    {activeCategory === cat.id && (
                      <motion.div 
                        layoutId="activeTab"
                        className="absolute bottom-0 left-0 right-0 h-1 bg-amber-500"
                      />
                    )}
                  </button>
                ))}
              </div>

              {/* Grid Content */}
              <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
                {isLoading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                      <div key={i} className="h-64 bg-slate-100 dark:bg-slate-800 rounded-[2.5rem] animate-pulse" />
                    ))}
                  </div>
                ) : activeCategory === 'inventory' ? (
                  <div className="p-2">
                     {boundPlayer ? (
                        <InventoryTable 
                          playerId={boundPlayer.id}
                          activeTitleId={boundPlayer.active_title_id}
                          activeFrameId={boundPlayer.active_frame_id}
                          playerData={boundPlayer}
                          hidePreview={true}
                          onPreview={(type, name) => {
                            if (type === 'title') setPreviewTitle(name);
                            if (type === 'frame') setPreviewFrame(name);
                          }}
                          onUpdate={() => {
                            refetchPlayers();
                          }}
                        />
                     ) : (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                          <Package className="w-12 h-12 mb-4 opacity-20" />
                          <p>請先綁定球員身分以查看背包</p>
                        </div>
                     )}
                  </div>
                ) : filteredItems.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6 md:gap-8">
                    {filteredItems.map(item => (
                      <motion.div
                        layout
                        key={item.id}
                        onClick={() => {
                          if (item.item_type === 'title') setPreviewTitle(item.name);
                          if (item.item_type === 'frame') setPreviewFrame(item.name);
                        }}
                        className="group relative bg-white dark:bg-slate-800/40 rounded-[2.5rem] p-6 border border-slate-100 dark:border-slate-800 hover:border-amber-500/30 dark:hover:border-amber-500/30 transition-all flex flex-col cursor-pointer hover:shadow-xl hover:shadow-slate-200/50 dark:hover:shadow-none"
                      >
                        <div className="aspect-video bg-slate-50 dark:bg-slate-900 rounded-[2rem] mb-6 flex items-center justify-center relative overflow-hidden shadow-inner border border-slate-100/50 dark:border-white/5">
                          {item.item_type === 'title' ? (
                            <div className="text-xl font-black text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-6 py-3 rounded-2xl border border-amber-200/50 dark:border-amber-500/30 shadow-sm">
                              {item.name}
                            </div>
                          ) : (
                            <div className={cn(
                              "w-20 h-20 border-4 rounded-full flex items-center justify-center relative transition-all duration-500 group-hover:scale-110",
                              item.price >= 3000 ? "border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.4)]" : "border-emerald-500"
                            )}>
                              <div className="absolute -top-1 -right-1">
                                  <Sparkles size={20} className="text-amber-500 animate-pulse" />
                              </div>
                              <div className="w-12 h-12 bg-slate-200 dark:bg-slate-700 rounded-full" />
                            </div>
                          )}
                          {ownedItemIds.has(item.id) && (
                            <div className="absolute top-4 right-4 bg-emerald-500 text-white p-1.5 rounded-full shadow-lg z-10 scale-110">
                              <Check size={12} strokeWidth={4} />
                            </div>
                          )}
                        </div>

                        <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2">{item.name}</h3>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mb-6 line-clamp-2 leading-relaxed flex-1">
                          {item.description || '一件神祕的珍寶'}
                        </p>

                        <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-50 dark:border-slate-800">
                          <div className="flex flex-col">
                             <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">有效期 {item.duration_days} 天</span>
                             <div className="flex items-center gap-1.5 mt-1">
                                <Feather size={14} className="text-sky-500" />
                                <span className="text-lg font-black text-slate-900 dark:text-white tracking-tight">{item.price}</span>
                             </div>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!ownedItemIds.has(item.id)) handleBuy(item);
                            }}
                            disabled={buyingId === item.id || (boundPlayer?.feathers || 0) < item.price || ownedItemIds.has(item.id)}
                            className={cn(
                              "px-6 py-3 rounded-2xl font-black text-xs transition-all active:scale-95 whitespace-nowrap shadow-sm",
                              ownedItemIds.has(item.id)
                                ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400 cursor-default"
                                : (boundPlayer?.feathers || 0) < item.price
                                ? "bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed"
                                : "bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-200 dark:shadow-none"
                            )}
                          >
                            {buyingId === item.id ? (
                               <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            ) : ownedItemIds.has(item.id) ? (
                               '已持有'
                            ) : (
                               '立即兌換'
                            )}
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-4 opacity-50 py-20">
                    <ShoppingBag size={64} strokeWidth={1} />
                    <p className="font-black text-lg">商品暫時售罄</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Mobile Footer Balance */}
          <div className="sm:hidden p-4 bg-slate-50 dark:bg-slate-950/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span className="text-xs font-black text-slate-400">目前羽毛</span>
            {boundPlayer && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-sky-50 dark:bg-sky-900/20 rounded-xl border border-sky-100 dark:border-sky-800/50">
                <Feather size={12} className="text-sky-500" />
                <span className="text-xs font-black text-sky-700 dark:text-sky-300 tabular-nums">
                  {boundPlayer.feathers}
                </span>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
