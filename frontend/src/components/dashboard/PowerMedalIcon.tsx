import { BadmintonIcon } from './BadmintonIcon';

export type PowerMedalTier = 1 | 2 | 3;

const tierToVariant = (tier: PowerMedalTier): 'gold' | 'silver' | 'bronze' =>
  tier === 1 ? 'gold' : tier === 2 ? 'silver' : 'bronze';

/** 戰力前三名：金／銀／銅羽球圖示（見 {@link BadmintonIcon}） */
export function PowerMedalIcon({ tier }: { tier: PowerMedalTier }) {
  return <BadmintonIcon variant={tierToVariant(tier)} size={16} className="shrink-0 align-middle" />;
}

export function computePowerMedalTiers(
  rows: { key: string; powerCp: number; name: string }[],
): Map<string, PowerMedalTier> {
  const sorted = [...rows].sort((a, b) => {
    if (b.powerCp !== a.powerCp) return b.powerCp - a.powerCp;
    return a.name.localeCompare(b.name, 'zh-Hant');
  });
  const m = new Map<string, PowerMedalTier>();
  for (let i = 0; i < Math.min(3, sorted.length); i++) {
    m.set(sorted[i].key, (i + 1) as PowerMedalTier);
  }
  return m;
}
