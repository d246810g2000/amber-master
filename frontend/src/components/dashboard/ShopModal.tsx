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
import Heart from "lucide-react/dist/esm/icons/heart";
import Lock from "lucide-react/dist/esm/icons/lock";
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import * as gasApi from '../../lib/gasApi';
import { useAuth } from '../../context/AuthContext';
import { useDialog } from '../../context/DialogContext';
import { toast } from 'sonner';
import { cn, getAvatarUrl } from '../../lib/utils';
import { InventoryTable } from '../profile/InventoryTable';
import { PlayerPill } from '../PlayerPill';
import { Player } from '../../types';
import { renderBackgroundEffects } from '../../lib/itemEffects';
import { EggRenderer } from '../EggRenderer';
import { PetRenderer } from '../PetRenderer';

interface ShopModalProps {
  onClose: () => void;
  onUpdate: () => void;
}

const CATEGORIES = [
  { id: 'title', label: '專屬稱號', icon: <Tag size={18} /> },
  { id: 'background', label: '背景特效', icon: <Sparkles size={18} /> },
  { id: 'frame', label: '酷炫邊框', icon: <Star size={18} /> },
  { id: 'pet', label: '寵物工坊', icon: <Heart size={18} /> },
];

export const PETS_CATALOG = [
  { id: 'pet_corgi', name: '呆萌柯基', tier: 'classic', eggType: 'egg_classic', desc: '腿短屁股大、走起路來一搖一擺的呆萌柯基。', icon: '🐶' },
  { id: 'pet_black_cat', name: '傲嬌黑貓', tier: 'classic', eggType: 'egg_classic', desc: '瞳孔亮亮、極具靈氣的神秘傲嬌黑貓。', icon: '🐈' },
  { id: 'pet_chick', name: '元氣小雞', tier: 'classic', eggType: 'egg_classic', desc: '毛茸茸的嫩黃色小雛雞，特別親近人。', icon: '🐤' },
  { id: 'pet_cat', name: '慵懶小貓', tier: 'epic', eggType: 'egg_epic', desc: '整天喵喵叫的軟萌白色小貓。', icon: '🐱' },
  { id: 'pet_slime', name: '果凍史萊姆', tier: 'epic', eggType: 'egg_epic', desc: '跳來跳去、充滿彈性的粉紅史萊姆。', icon: '🧪' },
  { id: 'pet_rabbit', name: '蹦蹦粉兔', tier: 'epic', eggType: 'egg_epic', desc: '耳朵搖擺不定、喜歡吃蘿蔔的軟糯粉兔。', icon: '🐰' },
  { id: 'pet_dog', name: '元氣柴犬', tier: 'legendary', eggType: 'egg_legendary', desc: '元氣滿滿、尾巴狂搖的忠實秋田柴犬。', icon: '🐶' },
  { id: 'pet_fox', name: '傲嬌赤狐', tier: 'legendary', eggType: 'egg_legendary', desc: '眼神犀利又帶點俏皮的高貴赤狐。', icon: '🦊' },
  { id: 'pet_dragon', name: '黃金幼龍', tier: 'legendary', eggType: 'egg_legendary', desc: '背部長著小翅膀、口吐金黃微光的小飛龍。', icon: '🐲' },
  { id: 'pet_phoenix', name: '霓虹鳳凰', tier: 'ultimate', eggType: 'egg_ultimate', desc: '帶著火翼尾羽、在空中盤旋的烈焰鳳凰。', icon: '🦅' },
  { id: 'pet_unicorn', name: '炫彩獨角獸', tier: 'ultimate', eggType: 'egg_ultimate', desc: '擁有彩虹鬃毛與閃耀星光號角的幻想獨角仙獸。', icon: '🦄' },
  { id: 'pet_panda', name: '功夫熊貓', tier: 'ultimate', eggType: 'egg_ultimate', desc: '啃著竹子、擅長太極跟翻滾的功夫黑白胖熊貓。', icon: '🐼' },
];

export const EGG_REQUIREMENTS: Record<string, { games: number; wins: number; feathers: number; name: string; desc: string }> = {
  egg_classic: { games: 2, wins: 1, feathers: 500, name: '經典之蛋', desc: '有機會與呆萌柯基、傲嬌黑貓、元氣小雞成為夥伴' },
  egg_epic: { games: 5, wins: 2, feathers: 1000, name: '史詩之蛋', desc: '有機會與慵懶小貓、果凍史萊姆、蹦蹦粉兔成為夥伴' },
  egg_legendary: { games: 10, wins: 5, feathers: 1500, name: '傳說之蛋', desc: '有機會與元氣柴犬、傲嬌赤狐、黃金幼龍成為夥伴' },
  egg_ultimate: { games: 20, wins: 10, feathers: 2000, name: '終極之蛋', desc: '有機會與霓虹鳳凰、炫彩獨角獸、功夫熊貓成為夥伴' },
};

const getPetTierStyle = (tier: string, isUnlocked: boolean, isEquipped: boolean) => {
  if (isEquipped) {
    return {
      cardClass: "border-amber-400 dark:border-amber-500 ring-2 ring-amber-400/40 bg-gradient-to-b from-amber-50/20 via-slate-50/50 to-slate-100/30 dark:from-amber-950/15 dark:via-slate-900/30 dark:to-slate-950/20 shadow-[0_8px_20px_-6px_rgba(245,158,11,0.25)] scale-[1.02] z-10",
      badgeClass: "bg-amber-100 dark:bg-amber-900/90 text-amber-700 dark:text-amber-300 border border-amber-250/60 dark:border-amber-800/60 font-black shadow-sm",
      glowClass: "drop-shadow-[0_0_15px_rgba(245,158,11,0.7)] scale-110",
      bgDecor: "absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.12)_0%,transparent_70%)] z-0 pointer-events-none"
    };
  }

  if (tier === 'epic') {
    return {
      cardClass: isUnlocked 
        ? "border-purple-200 dark:border-purple-900/40 bg-gradient-to-b from-purple-50/30 via-slate-50/50 to-slate-100/30 dark:from-purple-950/10 dark:via-slate-900/30 dark:to-slate-950/10 hover:border-purple-300 hover:shadow-[0_6px_16px_rgba(168,85,247,0.15)] hover:scale-[1.01]"
        : "border-slate-200/50 dark:border-slate-800/80 bg-slate-50/20 dark:bg-slate-900/10 hover:border-purple-200/30 hover:scale-[1.01] hover:shadow-sm",
      badgeClass: "bg-purple-100 dark:bg-purple-900/90 text-purple-700 dark:text-purple-300 border border-purple-200/30 dark:border-purple-800/30",
      glowClass: isUnlocked ? "drop-shadow-[0_0_10px_rgba(168,85,247,0.5)]" : "drop-shadow-[0_0_6px_rgba(168,85,247,0.15)]",
      bgDecor: isUnlocked 
        ? "absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.1)_0%,transparent_65%)] z-0 pointer-events-none"
        : "absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.03)_0%,transparent_60%)] z-0 pointer-events-none"
    };
  } else if (tier === 'legendary') {
    return {
      cardClass: isUnlocked
        ? "border-amber-200 dark:border-amber-900/40 bg-gradient-to-b from-amber-50/35 via-slate-50/50 to-slate-100/30 dark:from-amber-950/12 dark:via-slate-900/30 dark:to-slate-950/10 hover:border-amber-400 hover:shadow-[0_8px_20px_rgba(245,158,11,0.22)] hover:scale-[1.01] hover:shadow-[0_0_12px_rgba(245,158,11,0.1)]"
        : "border-slate-200/50 dark:border-slate-800/80 bg-slate-50/20 dark:bg-slate-900/10 hover:border-amber-300/30 hover:scale-[1.01] hover:shadow-sm",
      badgeClass: "bg-amber-100 dark:bg-amber-900/90 text-amber-700 dark:text-amber-350 border border-amber-200/30 dark:border-amber-800/30",
      glowClass: isUnlocked ? "drop-shadow-[0_0_14px_rgba(245,158,11,0.65)]" : "drop-shadow-[0_0_8px_rgba(245,158,11,0.2)]",
      bgDecor: isUnlocked
        ? "absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.15)_0%,transparent_65%)] z-0 pointer-events-none"
        : "absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.05)_0%,transparent_60%)] z-0 pointer-events-none"
    };
  } else if (tier === 'classic') {
    return {
      cardClass: isUnlocked 
        ? "border-slate-200 dark:border-slate-800 bg-gradient-to-b from-slate-50/35 via-slate-50/50 to-slate-100/30 dark:from-slate-900/10 dark:via-slate-900/30 dark:to-slate-950/10 hover:border-slate-350 hover:shadow-[0_6px_16px_rgba(100,116,139,0.15)] hover:scale-[1.01]"
        : "border-slate-200/50 dark:border-slate-800/80 bg-slate-50/20 dark:bg-slate-900/10 hover:border-slate-200/30 hover:scale-[1.01] hover:shadow-sm",
      badgeClass: "bg-slate-100 dark:bg-slate-800 text-slate-650 dark:text-slate-400 border border-slate-200/30 dark:border-slate-700/30",
      glowClass: isUnlocked ? "drop-shadow-[0_0_8px_rgba(148,163,184,0.35)]" : "drop-shadow-[0_0_4px_rgba(148,163,184,0.1)]",
      bgDecor: isUnlocked 
        ? "absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(148,163,184,0.08)_0%,transparent_65%)] z-0 pointer-events-none"
        : "absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(148,163,184,0.02)_0%,transparent_60%)] z-0 pointer-events-none"
    };
  } else {
    // Ultimate Tier
    return {
      cardClass: isUnlocked
        ? "border-pink-300 dark:border-pink-900/50 bg-gradient-to-br from-pink-50/40 via-purple-50/20 to-indigo-50/30 dark:from-pink-950/15 dark:via-purple-950/8 dark:to-indigo-950/12 hover:border-pink-400 hover:shadow-[0_10px_25px_rgba(236,72,153,0.25)] hover:scale-[1.02] ring-1 ring-pink-500/10 shadow-[0_0_15px_rgba(236,72,153,0.1)]"
        : "border-slate-250 dark:border-slate-800 bg-slate-50/25 dark:bg-slate-900/15 hover:border-pink-300/30 hover:scale-[1.01] hover:shadow-sm",
      badgeClass: "bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 text-white font-black shadow-sm ring-1 ring-pink-400/20",
      glowClass: isUnlocked ? "drop-shadow-[0_0_18px_rgba(236,72,153,0.8)] scale-110" : "drop-shadow-[0_0_10px_rgba(236,72,153,0.25)]",
      bgDecor: isUnlocked
        ? "absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(236,72,153,0.18)_0%,rgba(139,92,246,0.1)_50%,transparent_85%)] animate-[pulse_2.5s_infinite] z-0 pointer-events-none"
        : "absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(236,72,153,0.06)_0%,transparent_70%)] z-0 pointer-events-none"
    };
  }
};

export const ShopModal: React.FC<ShopModalProps> = ({ onClose, onUpdate }) => {
  const { currentUser } = useAuth();
  const { showConfirm } = useDialog();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState('title');
  const [buyingId, setBuyingId] = useState<number | null>(null);
  const [hatchingPetId, setHatchingPetId] = useState<string | null>(null);
  const [isHatchingActionLoading, setIsHatchingActionLoading] = useState(false);

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
  const [previewPetId, setPreviewPetId] = useState<string | null>(null);
  const [hasInitialized, setHasInitialized] = useState(false);

  useEffect(() => {
    if (boundPlayer && !hasInitialized) {
      setPreviewTitle(boundPlayer.active_title?.name || null);
      setPreviewFrame(boundPlayer.active_frame?.name || null);
      setPreviewBackground(boundPlayer.active_background?.name || null);
      setPreviewPetId(boundPlayer.active_pet_id || null);
      setHasInitialized(true);
    }
  }, [boundPlayer, hasInitialized]);

  const previewPlayer = useMemo(() => {
    if (!boundPlayer) return null;
    const p = { ...boundPlayer } as Player;
    if (previewTitle) p.active_title = { id: 0, name: previewTitle, item_type: 'title' };
    if (previewFrame) p.active_frame = { id: 0, name: previewFrame, item_type: 'frame' };
    if (previewBackground) p.active_background = { id: 0, name: previewBackground, item_type: 'background' };
    if (previewPetId) p.active_pet_id = previewPetId;
    return p;
  }, [boundPlayer, previewTitle, previewFrame, previewBackground, previewPetId]);

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
          toast.success(`購買成功！已自動為您套用 ${durationText}。`);
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

  const handleBuyEgg = async (eggType: string) => {
    if (!currentUser?.email) {
      toast.error('請先登入');
      return;
    }
    const req = EGG_REQUIREMENTS[eggType];
    if (!req) return;
    if ((boundPlayer?.feathers || 0) < req.feathers) {
      toast.error('羽毛不足');
      return;
    }

    showConfirm(
      '購買寵物蛋',
      `確定要花費 ${req.feathers} 根羽毛購買「${req.name}」並開始孵化嗎？ (這將會覆蓋您當前已在孵化的蛋與進度)`,
      async () => {
        setIsHatchingActionLoading(true);
        try {
          await gasApi.buyEgg(currentUser.email!, eggType);
          toast.success(`成功購買 ${req.name}！開始累積對戰進度。`);
          onUpdate();
          refetchPlayers();
          queryClient.invalidateQueries({ queryKey: ['players-base'] });
        } catch (err: any) {
          toast.error(err.message || '購買失敗');
        } finally {
          setIsHatchingActionLoading(false);
        }
      }
    );
  };

  const handleHatchEgg = async () => {
    if (!currentUser?.email) return;
    setIsHatchingActionLoading(true);
    try {
      const result = await gasApi.hatchEgg(currentUser.email!);
      if (result && result.hatched_pet) {
        setHatchingPetId(result.hatched_pet);
        toast.success(`破蛋成功！獲得了新夥伴！`);
        onUpdate();
        refetchPlayers();
        queryClient.invalidateQueries({ queryKey: ['players-base'] });
      } else {
        toast.error('孵化結果無效');
      }
    } catch (err: any) {
      toast.error(err.message || '孵化失敗');
    } finally {
      setIsHatchingActionLoading(false);
    }
  };

  const handleEquipPet = async (petId: string | null) => {
    if (!currentUser?.email) return;
    setIsHatchingActionLoading(true);
    try {
      await gasApi.equipPet(currentUser.email!, petId);
      toast.success(petId ? '已邀請夥伴隨行！' : '已讓夥伴回窩休息');
      setPreviewPetId(null);
      onUpdate();
      refetchPlayers();
      queryClient.invalidateQueries({ queryKey: ['players-base'] });
    } catch (err: any) {
      toast.error(err.message || '邀請隨行失敗');
    } finally {
      setIsHatchingActionLoading(false);
    }
  };

  const eggName = (eggType: string) => {
    switch (eggType) {
      case 'egg_classic': return '經典之蛋';
      case 'egg_epic': return '史詩之蛋';
      case 'egg_legendary': return '傳說之蛋';
      case 'egg_ultimate': return '終極之蛋';
      default: return '未知之蛋';
    }
  };

  const renderPetWorkshop = () => {
    if (!boundPlayer) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Heart className="w-12 h-12 mb-4 opacity-20" />
          <p>請先綁定球員身分以進入寵物工坊</p>
        </div>
      );
    }

    const activeEggId = boundPlayer.active_egg_id;
    const reqs = activeEggId ? EGG_REQUIREMENTS[activeEggId] : null;
    const eggProgressGames = boundPlayer.egg_progress_games || 0;
    const eggProgressWins = boundPlayer.egg_progress_wins || 0;

    let overallProgress = 0;
    let gamesPercent = 0;
    let winsPercent = 0;

    if (reqs) {
      gamesPercent = Math.min(100, (eggProgressGames / reqs.games) * 100);
      winsPercent = Math.min(100, (eggProgressWins / reqs.wins) * 100);
      overallProgress = Math.round((gamesPercent + winsPercent) / 2);
    }

    const unlockedList = boundPlayer.unlocked_pets ? boundPlayer.unlocked_pets.split(',') : [];

    return (
      <div className="space-y-8 animate-in fade-in duration-300">
        {/* Section 1: Active Egg Incubator OR Egg Shop */}
        {activeEggId && reqs ? (
          <div className="bg-slate-50/50 dark:bg-slate-900/50 rounded-3xl p-4 md:p-8 border border-slate-100 dark:border-slate-800/80 flex flex-col md:flex-row gap-6 md:gap-10 items-center">
            {/* Left: Egg representation */}
            <div className="flex flex-col items-center justify-center shrink-0">
              <EggRenderer eggType={activeEggId} progressPercent={overallProgress} className="scale-90 md:scale-100" />
              <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-2">
                當前孵化：{reqs.name}
              </span>
            </div>

            {/* Right: Egg Hatching progress bars & details */}
            <div className="flex-1 w-full space-y-4 md:space-y-6">
              <div>
                <h3 className="text-lg md:text-xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  孵蛋培育儀表板
                  <span className="text-xs font-black text-sky-500 bg-sky-50 dark:bg-sky-950 px-2 py-0.5 rounded border border-sky-100 dark:border-sky-900">
                    {overallProgress}% 完成
                  </span>
                </h3>
                <p className="text-xs text-slate-450 dark:text-slate-550 mt-1 font-bold">
                  與此蛋產生共鳴！上場與勝場次數達到要求後，蛋將破殼誕生一位可愛夥伴隨行您的頭像！
                </p>
              </div>

              {/* Progress: Games */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-black">
                  <span className="text-slate-600 dark:text-slate-400">對戰場次進度</span>
                  <span className="text-slate-800 dark:text-slate-200 tabular-nums">
                    {eggProgressGames} / {reqs.games} 場
                  </span>
                </div>
                <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden relative border border-slate-300 dark:border-slate-700/50">
                  <div 
                    className="h-full bg-gradient-to-r from-sky-400 to-indigo-500 rounded-full transition-all duration-500" 
                    style={{ width: `${gamesPercent}%` }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-shimmer opacity-40" />
                </div>
              </div>

              {/* Progress: Wins */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-black">
                  <span className="text-slate-600 dark:text-slate-400">勝場次數進度</span>
                  <span className="text-emerald-650 dark:text-emerald-400 tabular-nums">
                    {eggProgressWins} / {reqs.wins} 勝
                  </span>
                </div>
                <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden relative border border-slate-300 dark:border-slate-700/50">
                  <div 
                    className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full transition-all duration-500" 
                    style={{ width: `${winsPercent}%` }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-shimmer opacity-40" />
                </div>
              </div>

              {/* Action Button: Hatch or locked progress */}
              <div className="pt-2">
                <button
                  onClick={handleHatchEgg}
                  disabled={isHatchingActionLoading || overallProgress < 100}
                  className={cn(
                    "w-full py-3 md:py-3.5 rounded-2xl font-black text-xs md:text-sm tracking-widest transition-all duration-300 transform active:scale-[0.98]",
                    overallProgress >= 100
                      ? "bg-gradient-to-r from-amber-500 via-emerald-500 to-teal-500 text-white shadow-xl shadow-emerald-500/20 hover:scale-[1.01] hover:brightness-110 animate-pulse cursor-pointer"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed border border-slate-200 dark:border-slate-700/50"
                  )}
                >
                  {isHatchingActionLoading ? (
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="animate-spin" size={16} /> 孵化處理中...
                    </div>
                  ) : overallProgress >= 100 ? (
                    "✨ 點擊破蛋！孵化寵物 ✨"
                  ) : (
                    `孵化中... (尚需 ${Math.max(0, reqs.games - eggProgressGames)} 場 / ${Math.max(0, reqs.wins - eggProgressWins)} 勝)`
                  )}
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Egg Shop selection cards */
          <div className="space-y-6">
            <div>
              <h3 className="text-base md:text-lg font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                選購新的寵物蛋
              </h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                購買後會將蛋放置在孵蛋區，每當打完一場積分對戰即會累計孵化進度。
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4 md:gap-6">
              {Object.entries(EGG_REQUIREMENTS).map(([eggType, req]) => {
                const isAffordable = (boundPlayer?.feathers || 0) >= req.feathers;
                const eggColorClass = 
                  eggType === 'egg_classic' ? 'border-slate-200/55 dark:border-slate-800/40 bg-slate-50/10 dark:bg-slate-900/5' :
                  eggType === 'egg_epic' ? 'border-purple-200/55 dark:border-purple-900/40 bg-purple-50/10 dark:bg-purple-950/5' :
                  eggType === 'egg_legendary' ? 'border-orange-200/55 dark:border-orange-900/40 bg-orange-50/10 dark:bg-orange-950/5' :
                  'border-pink-200/55 dark:border-purple-900/40 bg-gradient-to-br from-pink-50/10 via-purple-50/10 to-indigo-50/10 dark:from-pink-950/5 dark:via-purple-950/5 dark:to-indigo-950/5';
                
                const badgeColorClass =
                  eggType === 'egg_classic' ? 'bg-slate-100 dark:bg-slate-850 text-slate-600 dark:text-slate-400' :
                  eggType === 'egg_epic' ? 'bg-purple-100 dark:bg-purple-900/90 text-purple-700 dark:text-purple-300' :
                  eggType === 'egg_legendary' ? 'bg-orange-100 dark:bg-orange-900/90 text-orange-700 dark:text-orange-300' :
                  'bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 text-white';

                return (
                  <div 
                    key={eggType}
                    className={cn(
                      "rounded-3xl border p-4 md:p-5 flex flex-col justify-between transition-all duration-300 hover:scale-[1.02] hover:shadow-lg relative overflow-hidden backdrop-blur-md",
                      eggColorClass
                    )}
                  >
                    <div className="h-28 sm:h-32 md:h-36 w-full bg-slate-50 dark:bg-slate-950 rounded-2xl mb-4 flex items-center justify-center relative overflow-hidden shadow-inner border border-slate-200/20 dark:border-white/5 shrink-0">
                      <img 
                        src={`/amber-master/assets/eggs/${eggType}.png`} 
                        alt={req.name} 
                        className="w-20 h-20 md:w-24 md:h-24 object-contain pointer-events-none select-none hover:rotate-3 transition-transform" 
                      />
                      <div className="absolute top-2 left-2 z-20">
                        <span className={cn("text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider", badgeColorClass)}>
                          {eggType === 'egg_classic' ? '經典' : eggType === 'egg_epic' ? '史詩' : eggType === 'egg_legendary' ? '傳說' : '終極'}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h4 className="font-black text-sm md:text-base text-slate-800 dark:text-slate-100">{req.name}</h4>
                      <p className="text-xs text-slate-450 dark:text-slate-550 leading-relaxed min-h-[2.5rem] font-bold">
                        {req.desc}
                      </p>
                      
                      <div className="flex flex-col gap-1 text-[10px] font-black text-slate-500 dark:text-slate-400 bg-slate-100/50 dark:bg-slate-950/40 p-2 rounded-xl border border-slate-255/10">
                        <div className="flex justify-between">
                          <span>上場場次需求:</span>
                          <span className="text-slate-800 dark:text-slate-200">{req.games} 場</span>
                        </div>
                        <div className="flex justify-between">
                          <span>勝場次數需求:</span>
                          <span className="text-emerald-650 dark:text-emerald-400">{req.wins} 勝</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 gap-2">
                      <div className="flex items-center gap-1">
                        <Feather size={12} className="text-sky-500" />
                        <span className="text-base font-black text-slate-800 dark:text-slate-100 tabular-nums">
                          {req.feathers}
                        </span>
                      </div>

                      <button
                        onClick={() => handleBuyEgg(eggType)}
                        disabled={isHatchingActionLoading || !isAffordable}
                        className={cn(
                          "px-4 py-2 rounded-xl font-black text-xs transition-all active:scale-95 shadow-sm whitespace-nowrap cursor-pointer",
                          !isAffordable 
                            ? "bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed" 
                            : "bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-500/10"
                        )}
                      >
                        購買蛋
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Section 2: Pet Closet */}
        <div className="space-y-6 pt-6 border-t border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-base md:text-lg font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
              寵物跟隨衣櫥
            </h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              您所孵化解鎖的所有寵物夥伴都收納在此。您可以隨時邀請牠們隨行，或讓牠們回窩休息。
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {PETS_CATALOG.map((pet) => {
              const isUnlocked = unlockedList.includes(pet.id);
              const isEquipped = boundPlayer.active_pet_id === pet.id;
              const isPreviewing = previewPetId === pet.id;
              const tierStyle = getPetTierStyle(pet.tier, isUnlocked || isPreviewing, isEquipped);

              return (
                <div 
                  key={pet.id}
                  onClick={() => setPreviewPetId(pet.id)}
                  className={cn(
                    "rounded-2xl border p-3 flex flex-col justify-between items-center transition-all duration-300 relative group overflow-hidden cursor-pointer",
                    tierStyle.cardClass,
                    isPreviewing && "ring-2 ring-pink-500/80 dark:ring-pink-400/80 border-pink-400 dark:border-pink-500 shadow-md"
                  )}
                >
                  {/* Background Ambient Glow */}
                  <div className={tierStyle.bgDecor} />

                  {/* Top tier badge */}
                  <div className="absolute top-1.5 left-1.5 z-10">
                    <span className={cn("text-[7px] md:text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded", tierStyle.badgeClass)}>
                      {pet.tier === 'epic' ? '史詩' : pet.tier === 'legendary' ? '傳說' : '終極'}
                    </span>
                  </div>

                  {/* Lock Indicator */}
                  {!isUnlocked && (
                    <div className="absolute top-1.5 right-1.5 text-slate-400 dark:text-slate-500 z-10" title="尚未解鎖">
                      <Lock size={10} />
                    </div>
                  )}

                  {/* Pet SVG Preview container */}
                  <div className={cn(
                    "w-12 h-12 flex items-center justify-center my-3 relative z-10 transition-all duration-300",
                    (!isUnlocked && !isPreviewing) && "filter grayscale opacity-45 dark:opacity-30 contrast-75 brightness-95",
                    isUnlocked || isPreviewing ? "group-hover:scale-110" : "group-hover:scale-105"
                  )}>
                    <div className={tierStyle.glowClass}>
                      <PetRenderer petId={pet.id} className="w-10 h-10 scale-125" />
                    </div>
                  </div>

                  {/* Pet Info */}
                  <div className="text-center w-full min-w-0 mt-1">
                    <div className="font-black text-xs text-slate-800 dark:text-slate-100 truncate">{pet.name}</div>
                    <div className="text-[9px] text-slate-450 dark:text-slate-550 font-bold truncate mt-0.5">
                      {isUnlocked ? pet.desc : `孵自 ${eggName(pet.eggType)}`}
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="w-full mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                    {isUnlocked ? (
                      isEquipped ? (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleEquipPet(null); }}
                          disabled={isHatchingActionLoading}
                          className="w-full py-1 rounded-lg text-[9px] font-black bg-emerald-50 text-emerald-600 hover:bg-rose-50 hover:text-rose-600 dark:bg-emerald-950/20 dark:text-emerald-400 dark:hover:bg-rose-950/20 dark:hover:text-rose-450 border border-emerald-200/50 dark:border-emerald-900/50 transition-all text-center flex items-center justify-center gap-1 group/btn cursor-pointer"
                        >
                          <span className="group-hover/btn:hidden flex items-center gap-0.5"><Check size={8} />隨行中</span>
                          <span className="hidden group-hover/btn:inline">回窩休息</span>
                        </button>
                      ) : (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleEquipPet(pet.id); }}
                          disabled={isHatchingActionLoading}
                          className="w-full py-1 rounded-lg text-[9px] font-black bg-slate-900 hover:bg-slate-850 dark:bg-slate-800 dark:hover:bg-slate-700 text-white transition-all text-center cursor-pointer"
                        >
                          邀請隨行
                        </button>
                      )
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewPetId(pet.id);
                        }}
                        className={cn(
                          "w-full py-1 rounded-lg text-[9px] font-black transition-all text-center cursor-pointer",
                          isPreviewing
                            ? "bg-pink-100 text-pink-700 dark:bg-pink-950/40 dark:text-pink-400 border border-pink-200 dark:border-pink-900/50"
                            : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-450 border border-transparent"
                        )}
                      >
                        {isPreviewing ? "預覽中" : "預覽隨行"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
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
          className="relative bg-white dark:bg-slate-900 w-full md:max-w-5xl h-[82dvh] md:h-[700px] rounded-[2rem] md:rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden border border-white dark:border-slate-800"
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
                <>
                  <button 
                    onClick={() => {
                      navigate(`/players/${boundPlayer.id}?tab=inventory`);
                      onClose();
                    }}
                    className="hidden md:flex items-center gap-1.5 px-3 py-1.5 md:px-4 md:py-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/40 dark:hover:bg-slate-700/60 rounded-xl md:rounded-2xl border border-slate-200/50 dark:border-slate-700/50 text-xs font-black text-slate-650 dark:text-slate-350 transition-all active:scale-95 cursor-pointer mr-1 animate-in fade-in duration-300"
                  >
                    <Package size={14} className="text-sky-500" />
                    我的背包
                  </button>
                  <div className="flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 bg-sky-50 dark:bg-sky-900/20 rounded-xl md:rounded-2xl border border-sky-100 dark:border-sky-800/50">
                    <Feather size={14} className="text-sky-500" />
                    <span className="text-xs md:text-sm font-black text-sky-700 dark:text-sky-300 tabular-nums">
                      {boundPlayer.feathers}
                    </span>
                  </div>
                </>
              )}
              <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-400">
                <X size={20} />
              </button>
            </div>
          </div>

          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            {previewPlayer && (
              <div className="w-full md:w-80 border-b md:border-b-0 md:border-r border-slate-100 dark:border-slate-800 flex flex-row md:flex-col items-center p-2 md:p-8 bg-slate-50/30 dark:bg-slate-950/10 shrink-0 gap-2 md:gap-0">
                <div className="hidden md:flex text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-10 items-center gap-2">
                  <Sparkles size={14} className="text-amber-500" />造型即時預覽
                </div>
                <div className="relative p-1 md:p-10 bg-white dark:bg-slate-900 rounded-xl md:rounded-[3rem] border border-slate-100 dark:border-white/5 flex justify-center items-center shadow-sm shrink-0 overflow-hidden w-16 h-20 md:w-auto md:h-auto">
                   <div className="scale-[0.8] md:scale-125 origin-center transform transition-all duration-500">
                      <PlayerPill player={previewPlayer} status="ready" onClick={() => {}} onProfileClick={() => {}} />
                   </div>
                </div>
                <div className="flex-1 md:w-full space-y-2 md:space-y-4 ml-3 md:ml-0">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] md:text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">當前搭配</span>
                    {(previewTitle || previewFrame || previewBackground || previewPetId) && (
                      <button onClick={() => { setPreviewTitle(null); setPreviewFrame(null); setPreviewBackground(null); setPreviewPetId(null); }} className="text-[9px] md:text-[10px] font-bold text-amber-600 hover:text-amber-700 transition-colors flex items-center gap-1">
                        <RefreshCw size={10} />重設
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 md:flex md:flex-col gap-1.5 md:gap-2">
                    {previewTitle && <PreviewBadge label="稱" text={previewTitle} color="amber" />}
                    {previewFrame && <PreviewBadge icon={<Square size={10} />} text={previewFrame} color="blue" />}
                    {previewBackground && <PreviewBadge icon={<Layers size={10} />} text={previewBackground} color="emerald" />}
                    {previewPetId && (
                      <PreviewBadge 
                        icon={<Heart size={10} />} 
                        text={PETS_CATALOG.find(p => p.id === previewPetId)?.name || '未知寵物'} 
                        color="pink" 
                      />
                    )}
                  </div>
                  {boundPlayer && (
                    <button 
                      onClick={() => {
                        navigate(`/players/${boundPlayer.id}?tab=inventory`);
                        onClose();
                      }}
                      className="w-full mt-3 py-2 px-3 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700/80 border border-slate-200/60 dark:border-slate-700/50 rounded-xl text-[10px] font-black text-slate-600 dark:text-slate-350 transition-all text-center flex items-center justify-center gap-1.5 active:scale-[0.98] cursor-pointer"
                    >
                      <Package size={12} className="text-sky-500" />
                      去我的背包查看已購商品
                    </button>
                  )}
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

              <div className="flex-1 overflow-y-auto p-3 pb-10 md:p-8 custom-scrollbar">
                {isLoading ? (
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 md:gap-6">
                    {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-32 xs:h-36 md:h-64 bg-slate-100 dark:bg-slate-800 rounded-xl md:rounded-[2.5rem] animate-pulse" />)}
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
                ) : activeCategory === 'pet' ? (
                  renderPetWorkshop()
                ) : (
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 md:gap-8">
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

          {/* Hatching Pet Success Overlay */}
          <AnimatePresence>
            {hatchingPetId && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-slate-950/95 backdrop-blur-md z-[120] flex flex-col items-center justify-center p-6 text-center select-none"
              >
                {/* Spinning background sunburst rays */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.15),transparent_60%)] animate-pulse pointer-events-none" />
                <div className="absolute w-[200%] h-[200%] rounded-full bg-[conic-gradient(from_0deg,transparent_20%,rgba(253,224,71,0.05)_40%,transparent_60%,rgba(253,224,71,0.05)_80%,transparent)] animate-[spin_20s_infinite_linear] pointer-events-none" />

                {/* Sparkles */}
                <div className="absolute animate-ping text-amber-400 text-4xl top-1/4 left-1/4">✦</div>
                <div className="absolute animate-ping text-cyan-400 text-3xl bottom-1/4 right-1/4 [animation-delay:0.7s]">✦</div>
                <div className="absolute animate-ping text-pink-400 text-2xl top-1/3 right-1/3 [animation-delay:1.3s]">✦</div>

                <motion.div 
                  initial={{ scale: 0.5, y: 100 }}
                  animate={{ scale: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 15 } }}
                  className="relative space-y-8 flex flex-col items-center"
                >
                  {/* Pet SVG */}
                  <div className="w-28 h-28 bg-white/5 dark:bg-white/10 rounded-full border border-white/20 flex items-center justify-center p-4 shadow-2xl relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 via-pink-400 to-amber-400 rounded-full blur-[8px] opacity-40 animate-pulse" />
                    <PetRenderer petId={hatchingPetId} className="w-20 h-20 scale-150 animate-bounce" />
                  </div>

                  {/* Title & Announcement */}
                  <div className="space-y-2">
                    <div className="text-[10px] font-black text-amber-500 uppercase tracking-[0.3em] animate-pulse">HATCH SUCCESS!</div>
                    <h3 className="text-2xl md:text-4xl font-black bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-300 bg-clip-text text-transparent drop-shadow-md">
                      ✨ 孵化成功！獲得新伴侶 ✨
                    </h3>
                    <p className="text-base font-bold text-white mt-4">
                      恭喜獲得可愛寵物：
                      <span className="text-xl font-black text-amber-400 bg-amber-400/10 px-3 py-1 rounded-full border border-amber-400/20 ml-1">
                        {PETS_CATALOG.find(p => p.id === hatchingPetId)?.name || '神祕寵物'}
                      </span>
                    </p>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed mt-2 font-bold">
                      {PETS_CATALOG.find(p => p.id === hatchingPetId)?.desc}
                    </p>
                  </div>

                  {/* Action */}
                  <button
                    onClick={() => {
                      handleEquipPet(hatchingPetId); // Auto equip the newly hatched pet!
                      setHatchingPetId(null);
                    }}
                    className="px-8 py-3.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-950 font-black text-sm rounded-2xl shadow-xl shadow-amber-500/20 active:scale-95 transition-all tracking-widest cursor-pointer"
                  >
                    太棒了，帶牠去打球！
                  </button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

const PreviewBadge: React.FC<{ label?: string, icon?: React.ReactNode, text: string, color: string }> = ({ label, icon, text, color }) => {
  const styles = useMemo(() => {
    switch (color) {
      case 'amber':
        return {
          bg: 'bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800/50',
          iconBg: 'bg-amber-400/20 text-amber-600',
          text: 'text-amber-800 dark:text-amber-400'
        };
      case 'blue':
        return {
          bg: 'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800/50',
          iconBg: 'bg-blue-400/20 text-blue-600',
          text: 'text-blue-800 dark:text-blue-400'
        };
      case 'emerald':
        return {
          bg: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800/50',
          iconBg: 'bg-emerald-400/20 text-emerald-600',
          text: 'text-emerald-800 dark:text-emerald-400'
        };
      case 'pink':
        return {
          bg: 'bg-pink-50 dark:bg-pink-900/20 border-pink-100 dark:border-pink-800/50',
          iconBg: 'bg-pink-400/20 text-pink-600',
          text: 'text-pink-800 dark:text-pink-400'
        };
      default:
        return {
          bg: 'bg-slate-50 dark:bg-slate-900/20 border-slate-100 dark:border-slate-800/50',
          iconBg: 'bg-slate-400/20 text-slate-600',
          text: 'text-slate-800 dark:text-slate-400'
        };
    }
  }, [color]);

  return (
    <div className={cn("p-1.5 md:p-3 rounded-lg md:rounded-xl border flex items-center justify-between group animate-in fade-in slide-in-from-left-2", styles.bg)}>
      <div className="flex items-center gap-1.5 md:gap-2">
        <div className={cn("w-4 h-4 md:w-5 md:h-5 rounded-md md:rounded-lg flex items-center justify-center text-[8px] md:text-xs font-black shrink-0", styles.iconBg)}>
          {label || icon}
        </div>
        <span className={cn("text-[9px] md:text-xs font-black truncate", styles.text)}>{text}</span>
      </div>
    </div>
  );
};

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
  
  const currentPrice = isPermanent ? item.price_permanent : item.price;

  const tierStyle = useMemo(() => {
    switch (item.tier) {
      case 'epic':
        return {
          card: "bg-purple-50/30 dark:bg-purple-950/15 border-purple-200/50 dark:border-purple-900/40 hover:border-purple-400 dark:hover:border-purple-500/80 hover:shadow-purple-500/10 dark:hover:shadow-purple-500/5 hover:scale-[1.02]",
          badge: "bg-purple-100 dark:bg-purple-900/90 text-purple-700 dark:text-purple-300 border border-purple-200/30 dark:border-purple-800/30",
          titleText: "text-purple-700 dark:text-purple-300",
          titleBanner: "bg-purple-50/90 dark:bg-purple-900/40 border-purple-300/40 dark:border-purple-700/50 text-purple-700 dark:text-purple-300",
          bannerDot: "bg-purple-400"
        };
      case 'legendary':
        return {
          card: "bg-orange-50/20 dark:bg-orange-950/10 border-orange-200/40 dark:border-orange-900/40 hover:border-orange-400 dark:hover:border-orange-500/80 hover:shadow-orange-500/15 dark:hover:shadow-orange-500/10 hover:scale-[1.03] hover:ring-1 hover:ring-orange-500/10",
          badge: "bg-orange-100 dark:bg-orange-900/90 text-orange-700 dark:text-orange-300 border border-orange-200/30 dark:border-orange-800/30",
          titleText: "text-orange-600 dark:text-orange-400",
          titleBanner: "bg-amber-50/95 dark:bg-amber-950/40 border-amber-400/40 dark:border-amber-500/50 text-amber-800 dark:text-amber-300 shadow-sm",
          bannerDot: "bg-amber-400"
        };
      case 'ultimate':
        return {
          card: "bg-gradient-to-br from-pink-50/30 via-purple-50/30 to-indigo-50/30 dark:from-pink-950/5 dark:via-purple-950/5 dark:to-indigo-950/5 border-pink-200/40 dark:border-purple-900/40 hover:border-purple-400 dark:hover:border-purple-500/80 hover:shadow-purple-500/20 dark:hover:shadow-purple-500/15 hover:scale-[1.04] hover:ring-1 hover:ring-purple-500/20",
          badge: "bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 text-white border-0 shadow-sm",
          titleText: "bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent dark:from-pink-400 dark:to-purple-400 font-extrabold",
          titleBanner: "bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-indigo-500/10 border-pink-400/50 dark:border-purple-500/50 text-pink-700 dark:text-pink-300 shadow-inner",
          bannerDot: "bg-pink-500"
        };
      case 'classic':
      default:
        return {
          card: "bg-slate-50/60 dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-800/60 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-slate-500/5",
          badge: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700/50",
          titleText: "text-slate-700 dark:text-slate-300",
          titleBanner: "bg-slate-100/90 dark:bg-slate-800/50 border-slate-300/40 dark:border-slate-700/50 text-slate-700 dark:text-slate-300",
          bannerDot: "bg-slate-400"
        };
    }
  }, [item.tier]);

  const tierInfo = TIER_META[item.tier] || TIER_META.classic;

  return (
    <motion.div
      onClick={() => onPreview(item.item_type, item.name)}
      className={cn(
        "group relative rounded-2xl md:rounded-[2.5rem] p-2 md:p-6 border transition-all duration-300 flex flex-col cursor-pointer bg-white/70 dark:bg-slate-900/45 backdrop-blur-md",
        tierStyle.card
      )}
    >
      <div className="aspect-[16/10] bg-slate-100 dark:bg-slate-950 rounded-xl md:rounded-[2rem] mb-2 md:mb-6 flex items-center justify-center relative overflow-hidden shadow-inner border border-slate-200/30 dark:border-white/5">
        <div className="absolute top-2 left-2 z-20">
          <span className={cn("text-[8px] md:text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider", tierStyle.badge)}>
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
            className="w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-700"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-100/90 dark:from-slate-950/90 via-transparent to-transparent z-[1]" />
        </div>

        {item.item_type === 'title' ? (
          <div className="relative w-[90%] flex justify-center z-10 px-1">
            <div 
              className={cn(
                "relative w-full font-black px-2 md:px-4 py-1.5 md:py-2.5 rounded-lg md:rounded-xl border shadow-sm overflow-hidden flex items-center justify-center backdrop-blur-sm transition-all duration-300 group-hover:scale-105",
                tierStyle.titleBanner
              )}
              style={{ 
                fontSize: item.name.length > 8 
                  ? 'clamp(7px, 2.2cqw, 9px)' 
                  : item.name.length > 5
                  ? 'clamp(9px, 3.2cqw, 11px)'
                  : 'clamp(11px, 3.8cqw, 14px)'
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full animate-shimmer" />
              <div className="flex items-center gap-1.5 md:gap-2">
                <div className={cn("w-1.5 h-1.5 rounded-full", tierStyle.bannerDot)} />
                <span className="relative whitespace-nowrap tracking-tight">{item.name}</span>
                <div className={cn("w-1.5 h-1.5 rounded-full", tierStyle.bannerDot)} />
              </div>
            </div>
          </div>
        ) : item.item_type === 'frame' ? (
          <div className="relative w-12 h-12 md:w-24 md:h-24 flex items-center justify-center z-10 transition-all duration-500 group-hover:scale-110">
            <div className="absolute inset-0 rounded-full flex items-center justify-center p-[2px] md:p-[4px] border border-white/20 shadow-inner">
              <div 
                className="absolute top-1/2 left-1/2 w-[300%] h-[300%] -translate-x-1/2 -translate-y-1/2 animate-spin-slow rounded-full"
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
              <div className="absolute inset-[3px] md:inset-[5px] rounded-full bg-slate-100 dark:bg-slate-950 z-10" />
            </div>

            <div className="w-8 h-8 md:w-16 md:h-16 rounded-full overflow-hidden relative z-20 border border-slate-200/10 shadow-inner">
               <img 
                 src={boundPlayer ? getAvatarUrl(boundPlayer.avatar, boundPlayer.name) : getAvatarUrl(null, "Preview")} 
                 alt="Avatar Preview" 
                 className="w-full h-full object-cover"
               />
            </div>
          </div>
        ) : (
          <div className="relative w-[70%] aspect-[2/1] rounded-xl overflow-hidden z-10 shadow-md border border-white/20 flex flex-col justify-between p-2 md:p-3 transition-all duration-500 group-hover:scale-105">
            {renderBackgroundEffects(item.name, undefined, "court")}
            
            <div className="relative z-20 flex items-center gap-1.5 md:gap-2">
              <div className="w-3.5 h-3.5 md:w-6 md:h-6 rounded-full bg-white/20 border border-white/30 backdrop-blur-[1px]" />
              <div className="flex flex-col gap-0.5 md:gap-1">
                <div className="w-8 md:w-16 h-1 md:h-2 bg-white/40 rounded-full" />
                <div className="w-5 md:w-10 h-0.5 md:h-1 bg-white/30 rounded-full" />
              </div>
            </div>
            <div className="relative z-20 self-end">
              <div className="w-6 md:w-12 h-1.5 md:h-3 rounded bg-white/20 backdrop-blur-[2px] flex items-center justify-center text-[5px] md:text-[8px] font-black text-white/80 scale-75 md:scale-100 origin-bottom-right">
                PREVIEW
              </div>
            </div>
          </div>
        )}
      </div>

      <h3 className={cn("text-xs md:text-lg font-black mb-0.5 md:mb-1.5 truncate transition-colors", tierStyle.titleText)}>
        {item.name}
      </h3>
      <p className="hidden md:block text-xs text-slate-400 dark:text-slate-500 mb-3 line-clamp-2 leading-relaxed flex-1">
        {item.description || '一件神祕的珍寶'}
      </p>

      <div className="flex bg-slate-100 dark:bg-slate-950 p-0.5 rounded-lg border border-slate-200/30 dark:border-white/5 my-1.5 md:my-3.5 w-full self-center">
        <button
          type="button"
          disabled={isOwnedPermanent}
          onClick={(e) => { e.stopPropagation(); setIsPermanent(false); }}
          className={cn(
            "flex-1 py-0.5 md:py-1 rounded-md text-[8px] md:text-xs font-black transition-all",
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
            "flex-1 py-0.5 md:py-1 rounded-md text-[8px] md:text-xs font-black transition-all",
            isPermanent 
              ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm" 
              : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 disabled:opacity-40"
          )}
        >
          永久
        </button>
      </div>

      <div className="flex items-center justify-between mt-auto pt-1.5 md:pt-4 border-t border-slate-100 dark:border-slate-800/80 gap-1">
        <div className="flex flex-col min-w-0">
           <span className="text-[7px] md:text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider truncate">
             {isPermanent ? "永久" : "7天"}
           </span>
           <div className="flex items-center gap-0.5 mt-0.5 md:mt-1">
              <Feather size={10} className="text-sky-500 md:w-3.5 md:h-3.5 shrink-0" />
              <span className="text-xs md:text-lg font-black text-slate-900 dark:text-white tracking-tight leading-none truncate">
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
            "px-2 py-1 md:px-6 md:py-3 rounded-lg md:rounded-xl font-black text-[9px] md:text-xs transition-all active:scale-95 whitespace-nowrap shadow-sm shrink-0",
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
            '已擁有'
          ) : isOwned ? (
            isPermanent ? '升級' : '續期'
          ) : (
            '兌換'
          )}
        </button>
      </div>
    </motion.div>
  );
};
