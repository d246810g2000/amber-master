export type GateOpType = 'add' | 'sub' | 'mul' | 'div' | 'pct_add' | 'pct_sub';

export interface GateOperation {
  type: GateOpType;
  value: number;
  label: string;
  riskLabel?: string;
  riskDamage?: number;
  isRecovery?: boolean;
}

export interface GatePair {
  left: GateOperation;
  right: GateOperation;
  category: 'mixed' | 'both_good' | 'both_bad' | 'trap' | 'recovery';
}

/** @deprecated lane triplets — free-X gates use GateOperation[] */
export interface GateTriplet {
  ops: [GateOperation, GateOperation, GateOperation];
  category: GatePair['category'];
}

export type GamePhase =
  | 'run_collect'
  | 'math_gate'
  | 'boss_fight'
  | 'final_sprint'
  | 'ended';

export type BossTier = 'classic' | 'epic' | 'legendary' | 'ultimate';
export type BossBehavior = 'wall' | 'sidestep' | 'clear_lob' | 'jump_smash';
export type BossPhase = 1 | 2 | 3 | 4;

export interface BossConfig {
  tier: BossTier;
  name: string;
  title: string;
  hp: number;
  reward: number;
  emoji: string;
  color: string;
  behavior: BossBehavior;
  taunt: string;
}

export type SkillLevel = 'casual' | 'skilled' | 'strong';

export type LaneIndex = 0 | 1 | 2;
export const LANE_X: [number, number, number] = [22, 50, 78];
export const LANE_LABELS = ['左', '中', '右'] as const;

export type EnemyState =
  | 'far'
  | 'approaching'
  | 'warning'
  | 'attacking'
  | 'hit'
  | 'dead';

export type EnemyKind = 'runner' | 'tank' | 'dodger' | 'shield' | 'bomber';

export type ShotGrade = 'perfect' | 'great' | 'good' | 'miss';

export const BALANCE = {
  initialFeathers: 80,
  gameDurationSec: 60,
  feathersPerSegment: { min: 16, max: 20 },
  segmentCount: 4,
  gateScaleFactor: 0.14,
  gateMinBase: 22,
  gateScaleSoftCap: 500,
  enemyRewardFactor: 0.42,
  bossFailLossPct: 0.18,
  collectionRates: { casual: 0.55, skilled: 0.8, strong: 0.96 } as Record<SkillLevel, number>,
  gateAccuracy: { casual: 0.42, skilled: 0.72, strong: 0.93 } as Record<SkillLevel, number>,
  bossClearRate: { casual: 0.55, skilled: 0.85, strong: 0.97 } as Record<SkillLevel, number>,
  gateWeights: { mixed: 0.4, both_good: 0.28, both_bad: 0.1, trap: 0.12, recovery: 0.1 },
  featherTargets: {
    casual: { min: 350, max: 550 },
    skilled: { min: 750, max: 1100 },
    strong: { min: 1150, max: 1500 },
  } as Record<SkillLevel, { min: number; max: number }>,
  /** Auto-shoot base damage by hit quality (before fever) */
  gradeDamage: { perfect: 2, great: 1, good: 1, miss: 0 } as Record<ShotGrade, number>,
  feverDamageMult: 1.35,
  feverComboThreshold: 10,
  feverDurationMs: 6000,
  feverFireMult: 0.85,
  recoveryFeatherThreshold: 30,
  enemyHp: 3,
  enemyReward: 5,
  collisionLoss: 5,
  bossAppearElapsedSec: 50,
  bossCollisionLoss: 10,
  autoFireMs: 420,
  playerMoveSpeed: 0.85,
  playerXMin: 5,
  playerXMax: 95,
  projectileHitWidth: 10,
  playerHitWidth: 12,
  attackDistance: 36,
  comboTimeoutMs: 3200,
};

/** v0.1: single boss at 50s, free X-axis */
export const BOSSES: BossConfig[] = [
  {
    tier: 'classic',
    name: '決勝對手',
    title: '決勝對手',
    hp: 15,
    reward: 30,
    emoji: '🧱',
    color: '#38bdf8',
    behavior: 'sidestep',
    taunt: '最後十秒——跟上對手！',
  },
];

export const PHASE_SCROLL_LENGTHS = [1000, 1050, 1100, 1100];
export const BOSS_FIGHT_SCROLL = 550;
export const GATE_SCROLL = 320;

export function bossPhaseFromHp(hp: number, maxHp: number): BossPhase {
  const r = hp / Math.max(1, maxHp);
  if (r > 0.7) return 1;
  if (r > 0.4) return 2;
  if (r > 0.15) return 3;
  return 4;
}

/** Hit quality from enemy distance (auto-shoot; no Miss button) */
export function gradeShot(dist: number, combatRange: number): ShotGrade {
  const t = dist / Math.max(1, combatRange);
  if (t <= 0.22) return 'perfect';
  if (t <= 0.45) return 'great';
  return 'good';
}
