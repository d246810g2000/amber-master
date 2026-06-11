import { PetAbilityType, PetTier } from '../types';

export type HatchTier = 'good' | 'normal' | 'weak';

export interface PetCatalogEntry {
  id: string;
  name: string;
  tier: PetTier;
  eggType: string;
  desc: string;
  abilityType: PetAbilityType;
  icon: string;
  hatchTier: HatchTier;
}

export const HATCH_TIER_META: Record<HatchTier, { label: string; stars: string; colorClass: string }> = {
  good: { label: '稀有', stars: '★★★', colorClass: 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/50' },
  normal: { label: '普通', stars: '★★', colorClass: 'bg-slate-100 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700/50' },
  weak: { label: '常見', stars: '★', colorClass: 'bg-slate-50 dark:bg-slate-900/40 text-slate-450 dark:text-slate-500 border-slate-150 dark:border-slate-800/40' },
};

export const PETS_CATALOG: PetCatalogEntry[] = [
  { id: 'pet_green_slime', name: '綠水靈', tier: 'classic', eggType: 'egg_classic', desc: '散發著晶瑩剔透綠色微光的可愛黏液生靈，頭上頂著一顆標誌性的小橘黃球。', abilityType: 'feather_gain', icon: '🟢', hatchTier: 'good' },
  { id: 'pet_black_cat', name: '吉吉黑貓', tier: 'classic', eggType: 'egg_classic', desc: '魔女琪琪身邊充滿靈性、古靈精怪的黑貓「吉吉」，脖子上繫著標誌性的紅色大蝴蝶結。', abilityType: 'match_win_bonus', icon: '🐈', hatchTier: 'good' },
  { id: 'pet_mushroom', name: '楓葉蘑菇', tier: 'classic', eggType: 'egg_classic', desc: '來自懷舊冒險世界的超萌紅色小肥菇，頭上有一片標誌性的小巧飄逸橙紅楓葉。', abilityType: 'shop_discount', icon: '🍄', hatchTier: 'weak' },
  { id: 'pet_rabbit_warrior', name: '打鬼兔', tier: 'classic', eggType: 'egg_classic', desc: '具有極度滑稽的驚恐大眼睛、魔性長耳朵與四條不可思議長細腿的魔性兔子。', abilityType: 'attack_drain', icon: '🐰', hatchTier: 'weak' },
  { id: 'pet_pikachu', name: '電光小鼠', tier: 'classic', eggType: 'egg_classic', desc: '身披亮麗黃色外衣與超萌長耳朵的電光小鼠，帶著滿滿的治癒笑容與微弱的靜電光芒。', abilityType: 'defense_shield', icon: '⚡', hatchTier: 'normal' },

  { id: 'pet_finalfantasy_moogle', name: '莫古利', tier: 'epic', eggType: 'egg_epic', desc: '全身披著軟綿綿的雪白絨毛，頭頂懸掛著一顆亮眼的紅粉發光虛空球的招財靈獸。', abilityType: 'feather_gain', icon: '👾', hatchTier: 'good' },
  { id: 'pet_slime_king', name: '利姆路', tier: 'epic', eggType: 'egg_epic', desc: '晶瑩剔透、極致柔軟的淡藍色史萊姆，擁有捕食者與大賢者的獨特能力。', abilityType: 'match_win_bonus', icon: '💧', hatchTier: 'good' },
  { id: 'pet_sonic_rings', name: '消極鬼魂', tier: 'epic', eggType: 'egg_epic', desc: '佩羅娜召喚出來的幽靈，穿過人體時能讓人變得極度消極，散發著半透明淡藍微光。', abilityType: 'shop_discount', icon: '👻', hatchTier: 'weak' },
  { id: 'pet_metroid_metroid', name: '銀河戰士', tier: 'epic', eggType: 'egg_epic', desc: '來自銀河星系深處的未知生命體，半透明碧綠外殼中包裹著流動的核心能量。', abilityType: 'attack_drain', icon: '🛸', hatchTier: 'weak' },
  { id: 'pet_scarab', name: '聖甲蟲', tier: 'epic', eggType: 'egg_epic', desc: '身披金屬光澤外殼的黃金聖甲蟲，代表著永生與重生的守護象徵。', abilityType: 'defense_shield', icon: '🪲', hatchTier: 'normal' },

  { id: 'pet_ribbon_pig', name: '緞帶肥肥', tier: 'legendary', eggType: 'egg_legendary', desc: '繫著黃色蝴蝶結緞帶的粉嫩小豬，身後自帶一圈守護圓環。', abilityType: 'feather_gain', icon: '🐷', hatchTier: 'good' },
  { id: 'pet_shiba_king', name: '櫻星卡比', tier: 'legendary', eggType: 'egg_legendary', desc: '來自星之奇蹟的櫻粉精靈，乘著金色傳送星前行。', abilityType: 'match_win_bonus', icon: '⭐', hatchTier: 'good' },
  { id: 'pet_chick', name: '封印小可', tier: 'legendary', eggType: 'egg_legendary', desc: '守護庫洛牌的封印之獸可魯貝洛斯，平時以金色絨毛的可愛布偶形態示人。', abilityType: 'shop_discount', icon: '🐤', hatchTier: 'weak' },
  { id: 'pet_fox_fire', name: '守護龍貓', tier: 'legendary', eggType: 'egg_legendary', desc: '森林中的精靈巨獸，頭頂魔法嫩葉，身邊環繞著和風秘法印。', abilityType: 'attack_drain', icon: '🌳', hatchTier: 'weak' },
  { id: 'pet_dragon_thunder', name: '永眠卡比獸', tier: 'legendary', eggType: 'egg_legendary', desc: '溫順嗜睡的超重量級巨獸，身邊總是漂浮著夢境微粒與睏倦氣泡。', abilityType: 'defense_shield', icon: '😴', hatchTier: 'normal' },

  { id: 'pet_ice_fire_siblings', name: '冰火姊弟', tier: 'ultimate', eggType: 'egg_ultimate', desc: '同時操控萬年極寒冰晶與諸天煉獄烈焰的傳奇雙生星靈。', abilityType: 'feather_gain', icon: '❄️', hatchTier: 'good' },
  { id: 'pet_panda_master', name: '太極武神', tier: 'ultimate', eggType: 'egg_ultimate', desc: '隱居霧色群山之巔的熊貓武學至尊，手執晶瑩碧玉杖。', abilityType: 'match_win_bonus', icon: '🐼', hatchTier: 'good' },
  { id: 'pet_kingdomehearts_shadow', name: '無心者影子', tier: 'ultimate', eggType: 'egg_ultimate', desc: '因受深淵侵蝕而化成的暗黑生靈，能潛入影中作戰。', abilityType: 'shop_discount', icon: '🌑', hatchTier: 'weak' },
  { id: 'pet_unicorn', name: '帕克', tier: 'ultimate', eggType: 'egg_ultimate', desc: '與愛蜜莉雅締結契約的大管領，擁有操控極寒之力的頂級精靈。', abilityType: 'attack_drain', icon: '🐱', hatchTier: 'weak' },
  { id: 'pet_yugioh_kuriboh', name: '栗子球', tier: 'ultimate', eggType: 'egg_ultimate', desc: '能在危機時刻捨身保護主人不受任何傷害的可愛守護怪獸。', abilityType: 'defense_shield', icon: '🌰', hatchTier: 'normal' },
];

export const PET_ABILITIES: Record<string, { desc: string; badge: string; colorClass: string }> = {
  pet_green_slime: { desc: '週三領取 +5% / 預測獲勝 +3%', badge: '預測加成', colorClass: 'bg-sky-50 dark:bg-sky-950/40 text-sky-650 dark:text-sky-400 border-sky-100 dark:border-sky-900/40' },
  pet_finalfantasy_moogle: { desc: '週三領取 +10% / 預測獲勝 +5%', badge: '預測加成', colorClass: 'bg-sky-50 dark:bg-sky-950/40 text-sky-650 dark:text-sky-400 border-sky-100 dark:border-sky-900/40' },
  pet_ribbon_pig: { desc: '週三領取 +15% / 預測獲勝 +8%', badge: '預測加成', colorClass: 'bg-sky-50 dark:bg-sky-950/40 text-sky-650 dark:text-sky-400 border-sky-100 dark:border-sky-900/40' },
  pet_ice_fire_siblings: { desc: '週三領取 +20% / 預測獲勝 +10%', badge: '預測加成', colorClass: 'bg-sky-50 dark:bg-sky-950/40 text-sky-650 dark:text-sky-400 border-sky-100 dark:border-sky-900/40' },

  pet_black_cat: { desc: '贏球分紅 +10%', badge: '勝場分紅', colorClass: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-650 dark:text-emerald-450 border-emerald-100 dark:border-emerald-900/40' },
  pet_slime_king: { desc: '贏球分紅 +18%', badge: '勝場分紅', colorClass: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-650 dark:text-emerald-450 border-emerald-100 dark:border-emerald-900/40' },
  pet_shiba_king: { desc: '贏球分紅 +26%', badge: '勝場分紅', colorClass: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-650 dark:text-emerald-450 border-emerald-100 dark:border-emerald-900/40' },
  pet_panda_master: { desc: '贏球分紅 +32%', badge: '勝場分紅', colorClass: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-650 dark:text-emerald-450 border-emerald-100 dark:border-emerald-900/40' },

  pet_mushroom: { desc: '週三領取 +2% / 商店購物 5% 折扣', badge: '商店折扣', colorClass: 'bg-violet-50 dark:bg-violet-950/40 text-violet-650 dark:text-violet-400 border-violet-100 dark:border-violet-900/40' },
  pet_sonic_rings: { desc: '週三領取 +3% / 商店購物 10% 折扣', badge: '商店折扣', colorClass: 'bg-violet-50 dark:bg-violet-950/40 text-violet-650 dark:text-violet-400 border-violet-100 dark:border-violet-900/40' },
  pet_chick: { desc: '週三領取 +4% / 商店購物 15% 折扣', badge: '商店折扣', colorClass: 'bg-violet-50 dark:bg-violet-950/40 text-violet-650 dark:text-violet-400 border-violet-100 dark:border-violet-900/40' },
  pet_kingdomehearts_shadow: { desc: '週三領取 +5% / 商店購物 20% 折扣', badge: '商店折扣', colorClass: 'bg-violet-50 dark:bg-violet-950/40 text-violet-650 dark:text-violet-400 border-violet-100 dark:border-violet-900/40' },

  pet_rabbit_warrior: { desc: '獲勝時隨機掠奪對手 4% 羽毛（上限 50 根）', badge: '羽毛掠奪', colorClass: 'bg-orange-50 dark:bg-orange-950/40 text-orange-650 dark:text-orange-450 border-orange-100 dark:border-orange-900/40' },
  pet_metroid_metroid: { desc: '獲勝時隨機掠奪對手 5% 羽毛（上限 70 根）', badge: '羽毛掠奪', colorClass: 'bg-orange-50 dark:bg-orange-950/40 text-orange-650 dark:text-orange-450 border-orange-100 dark:border-orange-900/40' },
  pet_fox_fire: { desc: '獲勝時隨機掠奪對手 6% 羽毛（上限 90 根）', badge: '羽毛掠奪', colorClass: 'bg-orange-50 dark:bg-orange-950/40 text-orange-650 dark:text-orange-450 border-orange-100 dark:border-orange-900/40' },
  pet_unicorn: { desc: '獲勝時隨機掠奪對手 7% 羽毛（上限 110 根）', badge: '羽毛掠奪', colorClass: 'bg-orange-50 dark:bg-orange-950/40 text-orange-650 dark:text-orange-450 border-orange-100 dark:border-orange-900/40' },

  pet_pikachu: { desc: '贏球分紅 +8% / 被掠奪減損 45%', badge: '防禦守護', colorClass: 'bg-rose-50 dark:bg-rose-950/40 text-rose-650 dark:text-rose-450 border-rose-100 dark:border-rose-900/40' },
  pet_scarab: { desc: '贏球分紅 +12% / 被掠奪減損 50%', badge: '防禦守護', colorClass: 'bg-rose-50 dark:bg-rose-950/40 text-rose-650 dark:text-rose-450 border-rose-100 dark:border-rose-900/40' },
  pet_dragon_thunder: { desc: '贏球分紅 +16% / 被掠奪減損 55%', badge: '防禦守護', colorClass: 'bg-rose-50 dark:bg-rose-950/40 text-rose-650 dark:text-rose-450 border-rose-100 dark:border-rose-900/40' },
  pet_yugioh_kuriboh: { desc: '贏球分紅 +20% / 被掠奪減損 60%', badge: '防禦守護', colorClass: 'bg-rose-50 dark:bg-rose-950/40 text-rose-650 dark:text-rose-450 border-rose-100 dark:border-rose-900/40' },
};

export const EGG_REQUIREMENTS: Record<string, { feathers: number; name: string; desc: string }> = {
  egg_classic: { feathers: 500, name: '經典之蛋', desc: '能量累積至 100% 即可孵化。' },
  egg_epic: { feathers: 1000, name: '史詩之蛋', desc: '能量累積至 100% 即可孵化。' },
  egg_legendary: { feathers: 1500, name: '傳說之蛋', desc: '能量累積至 100% 即可孵化。' },
  egg_ultimate: { feathers: 2000, name: '終極之蛋', desc: '能量累積至 100% 即可孵化。' },
};

export const PET_SHOP_DISCOUNT_RATES: Record<string, number> = {
  pet_mushroom: 0.05,
  pet_sonic_rings: 0.10,
  pet_chick: 0.15,
  pet_kingdomehearts_shadow: 0.20,
};

export function getShopDiscountRate(abilityPetId?: string | null): number {
  if (!abilityPetId) return 0;
  return PET_SHOP_DISCOUNT_RATES[abilityPetId] ?? 0;
}

export function computeShopPrice(originalPrice: number, abilityPetId?: string | null) {
  const discountRate = getShopDiscountRate(abilityPetId);
  if (discountRate <= 0 || originalPrice <= 0) {
    return {
      originalPrice,
      finalPrice: originalPrice,
      discountRate: 0,
      savings: 0,
      hasDiscount: false,
    };
  }
  const finalPrice = Math.floor(originalPrice * (1 - discountRate));
  return {
    originalPrice,
    finalPrice,
    discountRate,
    savings: originalPrice - finalPrice,
    hasDiscount: finalPrice < originalPrice,
  };
}

export function getPetTier(petId: string | null | undefined): PetTier | undefined {
  if (!petId) return undefined;
  return PETS_CATALOG.find((p) => p.id === petId)?.tier;
}

export function getHatchTierMeta(petId: string | null | undefined) {
  if (!petId) return undefined;
  const pet = PETS_CATALOG.find((p) => p.id === petId);
  if (!pet) return undefined;
  return HATCH_TIER_META[pet.hatchTier];
}
