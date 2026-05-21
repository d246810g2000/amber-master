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

  const ownedItemsMap = useMemo(() => {
    const map: Record<number, { isPermanent: boolean }> = {};
    inventory?.forEach((inv: any) => {
      map[inv.item_id] = {
        isPermanent: !inv.expires_at
      };
    });
    return map;
  }, [inventory]);

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

  const handleBuy = async (item: any, isPermanent: boolean) => {
    if (!currentUser?.email) {
      toast.error('請先登入');
      return;
    }
    const price = isPermanent ? item.price_permanent : item.price;
    if ((boundPlayer?.feathers || 0) < price) {
      toast.error('羽毛不足');
      return;
    }

    const durationText = isPermanent ? '永久版' : '7天版';
    showConfirm(
      '購買確認',
      `確定要花費 ${price} 根羽毛購買「${item.name} (${durationText})」嗎？`,
      async () => {
        setBuyingId(item.id);
        try {
          await gasApi.buyShopItem(item.id, currentUser.email!, isPermanent);
          if (boundPlayer?.id) {
            await gasApi.equipItem(boundPlayer.id, item.id);
          }
          toast.success(`購買成功！已自動為您裝備 ${durationText}。`);
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
                <div className="relative p-3 md:p-10 bg-white dark:bg-slate-900 rounded-xl md:rounded-[3rem] border border-slate-100 dark:border-white/5 flex justify-center items-center shadow-sm shrink-0 overflow-hidden w-24 h-28 md:w-auto md:h-auto">
                   <div className="scale-[0.95] md:scale-125 origin-center transform transition-all duration-500">
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
                        ownedItemsMap={ownedItemsMap}
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

const TIER_META: Record<string, { label: string; class: string; borderHover: string; glow: string; textClass: string }> = {
  classic: {
    label: '經典',
    class: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700/50',
    borderHover: 'hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-slate-500/5',
    glow: '',
    textClass: 'text-slate-600 dark:text-slate-400',
  },
  epic: {
    label: '史詩',
    class: 'bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400 border border-purple-100 dark:border-purple-900/50 font-black',
    borderHover: 'hover:border-purple-500/40 dark:hover:border-purple-500/40',
    glow: 'hover:shadow-purple-500/10 dark:hover:shadow-purple-500/5',
    textClass: 'text-purple-600 dark:text-purple-400',
  },
  legendary: {
    label: '傳說',
    class: 'bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-900/50 font-black animate-pulse',
    borderHover: 'hover:border-orange-500/40 dark:hover:border-orange-500/40',
    glow: 'hover:shadow-orange-500/20 dark:hover:shadow-orange-500/10 hover:ring-1 hover:ring-orange-500/20',
    textClass: 'text-orange-500 dark:text-orange-400',
  },
  ultimate: {
    label: '終極',
    class: 'bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 text-white border border-transparent font-black shadow-sm shadow-purple-500/30',
    borderHover: 'hover:border-pink-500/40 dark:hover:border-purple-500/40',
    glow: 'hover:shadow-purple-500/25 dark:hover:shadow-purple-500/15 hover:ring-1 hover:ring-purple-500/30 hover:scale-[1.02] duration-300',
    textClass: 'text-pink-600 dark:text-pink-400 bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent',
  }
};

const ShopItemCard: React.FC<{
  item: any;
  ownedItemsMap: Record<number, { isPermanent: boolean }>;
  boundPlayer: any;
  buyingId: number | null;
  onBuy: (item: any, isPermanent: boolean) => void;
  onPreview: (type: 'title' | 'frame' | 'background', name: string) => void;
}> = ({ item, ownedItemsMap, boundPlayer, buyingId, onBuy, onPreview }) => {
  const [isPermanent, setIsPermanent] = useState(false);
  const ownedInfo = ownedItemsMap[item.id];
  const isOwned = !!ownedInfo;
  const isOwnedPermanent = !!ownedInfo?.isPermanent;
  
  const tierInfo = TIER_META[item.tier] || TIER_META.classic;
  const currentPrice = isPermanent ? item.price_permanent : item.price;
  
  return (
    <motion.div
      onClick={() => onPreview(item.item_type, item.name)}
      className={cn(
        "group relative bg-white dark:bg-slate-800/40 rounded-2xl md:rounded-[2.5rem] p-3 md:p-6 border border-slate-100 dark:border-slate-800 transition-all flex flex-col cursor-pointer",
        tierInfo.borderHover,
        tierInfo.glow
      )}
    >
      <div className="aspect-video bg-slate-50 dark:bg-slate-900 rounded-xl md:rounded-[2rem] mb-3 md:mb-6 flex items-center justify-center relative overflow-hidden shadow-inner border border-slate-100/50 dark:border-white/5">
        {/* LoL style Tier Badge */}
        <div className="absolute top-2 left-2 z-20">
          <span className={cn("text-[9px] md:text-[10px] px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider", tierInfo.class)}>
            {tierInfo.label}
          </span>
        </div>

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
                    item.name.includes("鐵牌") ? "linear-gradient(135deg, #64748b, #334155)" :
                    item.name.includes("銅牌") ? "linear-gradient(135deg, #b45309, #78350f)" :
                    item.name.includes("白銀") ? "linear-gradient(135deg, #cbd5e1, #94a3b8)" :
                    item.name.includes("黃金") ? "linear-gradient(135deg, #fbbf24, #d97706)" :
                    item.name.includes("白金") ? "linear-gradient(135deg, #2dd4bf, #0284c7)" :
                    item.name.includes("翡翠") ? "linear-gradient(135deg, #10b981, #065f46)" :
                    item.name.includes("鑽石") ? "linear-gradient(135deg, #60a5fa, #3b82f6)" :
                    item.name.includes("大師") ? "linear-gradient(135deg, #8b5cf6, #581c87)" :
                    item.name.includes("宗師") ? "linear-gradient(135deg, #e11d48, #9f1239)" :
                    item.name.includes("菁英") ? "linear-gradient(135deg, #fbbf24, #a855f7)" :
                    item.name.includes("起源") ? "linear-gradient(135deg, #d946ef, #000000)" :
                    item.name.includes("飄零") ? "linear-gradient(135deg, #e0f2fe, #7dd3fc)" :
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
                        item.name.includes("鐵牌") ? "conic-gradient(from 0deg, #64748b, #334155, transparent, #64748b)" :
                        item.name.includes("青銅") ? "conic-gradient(from 0deg, #b45309, #78350f, transparent, #b45309)" :
                        item.name.includes("白銀") ? "conic-gradient(from 0deg, #cbd5e1, #94a3b8, transparent, #cbd5e1)" :
                        item.name.includes("黃金") ? "conic-gradient(from 0deg, #fbbf24, #d97706, transparent, #fbbf24)" :
                        item.name.includes("白金") ? "conic-gradient(from 0deg, #2dd4bf, #0284c7, transparent, #2dd4bf)" :
                        item.name.includes("翡翠") ? "conic-gradient(from 0deg, #10b981, #065f46, transparent, #10b981)" :
                        item.name.includes("鑽石") ? "conic-gradient(from 0deg, #60a5fa, #3b82f6, transparent, #60a5fa)" :
                        item.name.includes("大師") ? "conic-gradient(from 0deg, #8b5cf6, #581c87, transparent, #8b5cf6)" :
                        item.name.includes("宗師") ? "conic-gradient(from 0deg, #e11d48, #9f1239, transparent, #e11d48)" :
                        item.name.includes("菁英") ? "conic-gradient(from 0deg, #fbbf24, #d946ef, #8b5cf6, #fbbf24)" :
                        item.name.includes("萬象星空") ? "conic-gradient(from 0deg, #ff0000, #ff00ff, #0000ff, #00ffff, #00ff00, #ffff00, #ff0000)" :
                        item.name.includes("聖白羽翼") ? "conic-gradient(from 0deg, #ffffff, #e0f2fe, transparent, #ffffff)" :
                        "conic-gradient(from 0deg, #e2e8f0, #f8fafc, transparent, #e2e8f0)"
                    }}
                  />
               </div>
            )}
            
            <div className="absolute inset-[2.5px] rounded-full bg-slate-50/30 dark:bg-slate-900/30 backdrop-blur-[2px] z-[5]" />
          </div>
        )}
      </div>

      <h3 className={cn("text-sm md:text-lg font-black mb-1 md:mb-2 truncate", tierInfo.textClass)}>
        {item.name}
      </h3>
      <p className="hidden md:block text-xs text-slate-400 dark:text-slate-500 mb-2 line-clamp-2 leading-relaxed flex-1">{item.description || '一件神祕的珍寶'}</p>

      {/* 雙規格切換器 */}
      <div className="flex bg-slate-100 dark:bg-slate-900 p-0.5 rounded-lg border border-slate-200/50 dark:border-white/5 my-3 w-full self-center">
        <button
          type="button"
          disabled={isOwnedPermanent}
          onClick={(e) => { e.stopPropagation(); setIsPermanent(false); }}
          className={cn(
            "flex-1 py-1 rounded-md text-[9px] md:text-xs font-black transition-all",
            !isPermanent 
              ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm" 
              : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 disabled:opacity-40"
          )}
        >
          7天
        </button>
        <button
          type="button"
          disabled={isOwnedPermanent}
          onClick={(e) => { e.stopPropagation(); setIsPermanent(true); }}
          className={cn(
            "flex-1 py-1 rounded-md text-[9px] md:text-xs font-black transition-all",
            isPermanent 
              ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm" 
              : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 disabled:opacity-40"
          )}
        >
          永久
        </button>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between mt-auto pt-2 md:pt-4 border-t border-slate-50 dark:border-slate-800 gap-2">
        <div className="flex flex-col">
           <span className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-wider">
             {isPermanent ? "永久持有" : `有效期 ${item.duration_days} 天`}
           </span>
           <div className="flex items-center gap-1 mt-0.5 md:mt-1">
              <Feather size={12} className="text-sky-500 md:w-3.5 md:h-3.5" />
              <span className="text-sm md:text-lg font-black text-slate-900 dark:text-white tracking-tight leading-none">
                {currentPrice}
              </span>
           </div>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onBuy(item, isPermanent); }}
          disabled={
            buyingId === item.id || 
            (boundPlayer?.feathers || 0) < currentPrice || 
            isOwnedPermanent
          }
          className={cn(
            "px-3 py-2 md:px-6 md:py-3 rounded-xl font-black text-[10px] md:text-xs transition-all active:scale-95 whitespace-nowrap shadow-sm",
            isOwnedPermanent 
              ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400 cursor-default" 
              : (boundPlayer?.feathers || 0) < currentPrice 
              ? "bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed" 
              : "bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-200 dark:shadow-none"
          )}
        >
          {buyingId === item.id ? (
            <div className="w-3 h-3 md:w-4 md:h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : isOwnedPermanent ? (
            '已永久擁有'
          ) : isOwned ? (
            isPermanent ? '升級永久' : '續期'
          ) : (
            '兌換'
          )}
        </button>
      </div>
    </motion.div>
  );
};
