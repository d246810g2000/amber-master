import type { GuideIconKey } from './gameGuideIcons';

/** 教學版本號；更新重大規則時遞增，讓舊用戶再次自動彈出 */
export const GAME_GUIDE_VERSION = 'v3';
export const GAME_GUIDE_STORAGE_KEY = `amber_game_guide_seen_${GAME_GUIDE_VERSION}`;

export function hasSeenGameGuide(): boolean {
  if (typeof window === 'undefined') return true;
  return localStorage.getItem(GAME_GUIDE_STORAGE_KEY) === '1';
}

export function markGameGuideSeen(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(GAME_GUIDE_STORAGE_KEY, '1');
}

export interface GuideTip {
  icon: GuideIconKey;
  iconTone?: 'sky' | 'emerald' | 'amber' | 'violet' | 'rose' | 'orange' | 'slate';
  title: string;
  desc: string;
}

export interface GuideSection {
  id: string;
  title: string;
  icon: GuideIconKey;
  tagline: string;
  tips: GuideTip[];
}

const TONE_BOX: Record<NonNullable<GuideTip['iconTone']>, string> = {
  sky: 'w-8 h-8 bg-sky-100 dark:bg-sky-900/40 text-sky-600 dark:text-sky-400',
  emerald: 'w-8 h-8 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400',
  amber: 'w-8 h-8 bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400',
  violet: 'w-8 h-8 bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400',
  rose: 'w-8 h-8 bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400',
  orange: 'w-8 h-8 bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400',
  slate: 'w-8 h-8 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400',
};

export function getTipIconBoxClass(tone: GuideTip['iconTone'] = 'slate') {
  return TONE_BOX[tone];
}

export const GAME_GUIDE_SECTIONS: GuideSection[] = [
  {
    id: 'feathers',
    title: '羽毛',
    icon: 'feather',
    tagline: '週三領、比賽賺、商店買裝備',
    tips: [
      { icon: 'calendar', iconTone: 'sky', title: '週三領 1,000', desc: '比賽日點頂部羽毛「領取」' },
      { icon: 'trophy', iconTone: 'emerald', title: '完賽獎勵', desc: '勝 100／敗 50' },
      { icon: 'shopping-bag', iconTone: 'violet', title: '羽毛商店', desc: '稱號、邊框、背景特效、寵物蛋' },
      { icon: 'target', iconTone: 'amber', title: '猜中投注', desc: '莊家保底，池滿更高' },
      { icon: 'coins', iconTone: 'amber', title: '贏球分紅', desc: '勝方球員分投注池 10%' },
      { icon: 'handshake', iconTone: 'sky', title: '羽毛借貸', desc: '個人頁可借還，週三領取自動扣款' },
    ],
  },
  {
    id: 'betting',
    title: '投注',
    icon: 'target',
    tagline: '三種盤口各 1 注，最低 50 根',
    tips: [
      { icon: 'flag', iconTone: 'emerald', title: '獨贏', desc: '押誰贏' },
      { icon: 'scale', iconTone: 'sky', title: '讓分', desc: '加讓分後比高低' },
      { icon: 'bar-chart', iconTone: 'violet', title: '大小', desc: '總分過線' },
      { icon: 'landmark', iconTone: 'amber', title: '莊家保底', desc: '鎖定賠率，池滿更高' },
      { icon: 'timer', iconTone: 'rose', title: '開打 3 分鐘封盤', desc: '每盤口各限 1 注' },
      { icon: 'refresh-cw', iconTone: 'slate', title: '走水退款', desc: '讓分／大小剛好平線，本金全退' },
    ],
  },
  {
    id: 'eggs',
    title: '孵蛋',
    icon: 'egg',
    tagline: '買蛋 → 打球蓄能 → 100% 孵化',
    tips: [
      { icon: 'shopping-bag', iconTone: 'violet', title: '商店買蛋', desc: '寵物工坊，一次一顆' },
      { icon: 'zap', iconTone: 'amber', title: '打球蓄能', desc: '上場 +10~25／贏 +8~15' },
      { icon: 'sparkles', iconTone: 'emerald', title: '滿百孵化', desc: '隨機寵物，好蛋機率略高' },
      { icon: 'refresh-cw', iconTone: 'sky', title: '外觀／能力', desc: '孵化不會蓋掉能力設定' },
    ],
  },
  {
    id: 'pets',
    title: '寵物',
    icon: 'heart',
    tagline: '外觀跟能力可分開換',
    tips: [
      { icon: 'feather', iconTone: 'sky', title: '預測', desc: '週三領取、猜中加碼' },
      { icon: 'trophy', iconTone: 'emerald', title: '勝場', desc: '贏球獎金加分紅' },
      { icon: 'tag', iconTone: 'violet', title: '商店', desc: '購物折扣' },
      { icon: 'swords', iconTone: 'orange', title: '掠奪', desc: '贏了搶對手羽毛' },
      { icon: 'shield', iconTone: 'rose', title: '防禦', desc: '減損被搶、加分紅' },
    ],
  },
];
