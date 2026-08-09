export type GateOpType = 'add' | 'sub' | 'mul' | 'div' | 'pct_add' | 'pct_sub';

export interface GateOperation {
  type: GateOpType;
  value: number;
  label: string;
}

export interface GatePair {
  left: GateOperation;
  right: GateOperation;
  category: 'mixed' | 'both_good' | 'both_bad' | 'trap';
}

export type GamePhase =
  | 'run_collect'
  | 'math_gate'
  | 'boss_fight'
  | 'final_sprint'
  | 'ended';

export type BossTier = 'classic' | 'epic' | 'legendary' | 'ultimate';

/** How each rival behaves while standing on court. */
export type BossBehavior = 'wall' | 'sidestep' | 'clear_lob' | 'jump_smash';

export interface BossConfig {
  tier: BossTier;
  /** Short display name */
  name: string;
  /** Badminton-flavored title */
  title: string;
  hp: number;
  reward: number;
  emoji: string;
  color: string;
  behavior: BossBehavior;
  /** Flavor line shown when fight starts */
  taunt: string;
}

export type SkillLevel = 'casual' | 'skilled' | 'strong';

export const BALANCE = {
  initialFeathers: 80,
  gameDurationSec: 60,
  feathersPerSegment: { min: 16, max: 20 },
  segmentCount: 4,
  gateScaleFactor: 0.12,
  gateMinBase: 18,
  gateScaleSoftCap: 500,
  enemyRewardFactor: 0.3,
  bossFailLossPct: 0.2,
  collectionRates: { casual: 0.55, skilled: 0.8, strong: 0.96 } as Record<SkillLevel, number>,
  gateAccuracy: { casual: 0.42, skilled: 0.72, strong: 0.93 } as Record<SkillLevel, number>,
  bossClearRate: { casual: 0.45, skilled: 0.78, strong: 0.96 } as Record<SkillLevel, number>,
  gateWeights: { mixed: 0.45, both_good: 0.28, both_bad: 0.12, trap: 0.15 },
  featherTargets: {
    casual: { min: 350, max: 550 },
    skilled: { min: 750, max: 1100 },
    strong: { min: 1150, max: 1500 },
  } as Record<SkillLevel, { min: number; max: number }>,
};

/** Four court rivals — you run toward them; they hold the far baseline. */
export const BOSSES: BossConfig[] = [
  {
    tier: 'classic',
    name: '新手牆',
    title: '接發練習牆',
    hp: 18,
    reward: 42,
    emoji: '🧱',
    color: '#38bdf8',
    behavior: 'wall',
    taunt: '穩穩接住每一顆！',
  },
  {
    tier: 'epic',
    name: '羽翼手',
    title: '網前滑步手',
    hp: 40,
    reward: 70,
    emoji: '🏸',
    color: '#a78bfa',
    behavior: 'sidestep',
    taunt: '抓準時機再殺球！',
  },
  {
    tier: 'legendary',
    name: '高遠砲',
    title: '後場高遠砲',
    hp: 70,
    reward: 108,
    emoji: '🦅',
    color: '#f59e0b',
    behavior: 'clear_lob',
    taunt: '小心高遠球壓過來！',
  },
  {
    tier: 'ultimate',
    name: '殺球王',
    title: '決勝殺球王',
    hp: 110,
    reward: 165,
    emoji: '💥',
    color: '#f43f5e',
    behavior: 'jump_smash',
    taunt: '決勝點——看誰先落地！',
  },
];

/** Track length per segment (shorter = snappier court rallies). */
export const PHASE_SCROLL_LENGTHS = [1000, 1050, 1100, 1100];
export const BOSS_FIGHT_SCROLL = 550;
export const GATE_SCROLL = 320;
