import {
  BALANCE,
  BOSSES,
  BossConfig,
  GateOperation,
  GatePair,
  GateTriplet,
  LANE_X,
  LaneIndex,
  PHASE_SCROLL_LENGTHS,
  SkillLevel,
  ShotGrade,
} from './featherRushTypes';

export function formatGateLabel(op: GateOperation): string {
  switch (op.type) {
    case 'add': return `+${op.value}`;
    case 'sub': return `-${op.value}`;
    case 'mul': return `×${op.value}`;
    case 'div': return `÷${op.value}`;
    case 'pct_add': return `+${op.value}%`;
    case 'pct_sub': return `-${op.value}%`;
    default: return '?';
  }
}

export function applyGate(feathers: number, op: GateOperation): number {
  let result = feathers;
  switch (op.type) {
    case 'add':
      result = feathers + op.value;
      break;
    case 'sub':
      result = feathers - op.value;
      break;
    case 'mul':
      result = feathers * op.value;
      break;
    case 'div':
      result = feathers / op.value;
      break;
    case 'pct_add':
      result = feathers * (1 + op.value / 100);
      break;
    case 'pct_sub':
      result = feathers * (1 - op.value / 100);
      break;
  }
  if (op.riskDamage) {
    result -= op.riskDamage;
  }
  return Math.max(0, Math.floor(result));
}

function gateBase(feathers: number): number {
  const capped = Math.min(feathers, BALANCE.gateScaleSoftCap);
  return Math.max(BALANCE.gateMinBase, Math.floor(capped * BALANCE.gateScaleFactor));
}

function makeOp(
  type: GateOperation['type'],
  value: number,
  extra?: Partial<GateOperation>,
): GateOperation {
  const op: GateOperation = { type, value, label: '', ...extra };
  op.label = formatGateLabel(op);
  if (op.riskDamage) op.riskLabel = `受傷 ${op.riskDamage}`;
  if (op.isRecovery) op.riskLabel = '恢復';
  return op;
}

function withLabels(op: GateOperation): GateOperation {
  return {
    ...op,
    label: formatGateLabel(op),
    riskLabel: op.isRecovery
      ? '恢復'
      : op.riskDamage
        ? `受傷 ${op.riskDamage}`
        : op.riskLabel,
  };
}

function scaleOps(ops: GateOperation[], base: number, phase: number): GateOperation[] {
  const factor = 0.75 + phase * 0.32;
  return ops.map((op) => {
    if (op.type === 'mul' || op.type === 'div') {
      return withLabels(makeOp(op.type, op.value, {
        riskDamage: op.riskDamage,
        isRecovery: op.isRecovery,
      }));
    }
    if (op.type === 'pct_add' || op.type === 'pct_sub') {
      return withLabels(makeOp(op.type, Math.round(op.value * (0.85 + phase * 0.15)), {
        riskDamage: op.riskDamage,
        isRecovery: op.isRecovery,
      }));
    }
    return withLabels(makeOp(op.type, Math.max(8, Math.round(op.value * factor * (base / 28))), {
      riskDamage: op.riskDamage ? Math.round(op.riskDamage * (0.9 + phase * 0.1)) : undefined,
      isRecovery: op.isRecovery,
    }));
  });
}

const PHASE_TEMPLATES: Record<number, {
  good: GateOperation[];
  bad: GateOperation[];
  trap: [GateOperation, GateOperation];
  recovery: GateOperation[];
  risk: GateOperation[];
}> = {
  0: {
    good: [makeOp('add', 55), makeOp('mul', 1.25)],
    bad: [makeOp('sub', 16), makeOp('pct_sub', 8)],
    trap: [makeOp('mul', 1.25), makeOp('add', 62)],
    recovery: [makeOp('add', 80, { isRecovery: true }), makeOp('pct_add', 25, { isRecovery: true })],
    risk: [makeOp('mul', 1.6, { riskDamage: 25 }), makeOp('add', 120, { riskDamage: 30 })],
  },
  1: {
    good: [makeOp('add', 78), makeOp('mul', 1.3)],
    bad: [makeOp('sub', 24), makeOp('pct_sub', 12)],
    trap: [makeOp('mul', 1.3), makeOp('add', 95)],
    recovery: [makeOp('add', 100, { isRecovery: true }), makeOp('pct_add', 28, { isRecovery: true })],
    risk: [makeOp('mul', 1.7, { riskDamage: 35 }), makeOp('add', 150, { riskDamage: 40 })],
  },
  2: {
    good: [makeOp('add', 105), makeOp('mul', 1.35)],
    bad: [makeOp('sub', 32), makeOp('div', 2)],
    trap: [makeOp('mul', 1.35), makeOp('add', 130)],
    recovery: [makeOp('add', 120, { isRecovery: true }), makeOp('pct_add', 30, { isRecovery: true })],
    risk: [makeOp('mul', 1.8, { riskDamage: 45 }), makeOp('add', 180, { riskDamage: 50 })],
  },
  3: {
    good: [makeOp('add', 135), makeOp('mul', 1.4)],
    bad: [makeOp('sub', 40), makeOp('pct_sub', 14)],
    trap: [makeOp('mul', 1.4), makeOp('add', 170)],
    recovery: [makeOp('add', 140, { isRecovery: true }), makeOp('pct_add', 32, { isRecovery: true })],
    risk: [makeOp('mul', 1.9, { riskDamage: 55 }), makeOp('add', 220, { riskDamage: 60 })],
  },
};

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function weightedCategory(forceRecovery: boolean): GatePair['category'] {
  if (forceRecovery) return 'recovery';
  const r = Math.random();
  const w = BALANCE.gateWeights as Record<string, number>;
  let acc = 0;
  const entries: [GatePair['category'], number][] = [
    ['mixed', w.mixed],
    ['both_good', w.both_good],
    ['both_bad', w.both_bad],
    ['trap', w.trap],
    ['recovery', w.recovery ?? 0.1],
  ];
  for (const [cat, weight] of entries) {
    acc += weight;
    if (r < acc) return cat;
  }
  return 'mixed';
}

export function isGoodOp(op: GateOperation): boolean {
  return op.type === 'add' || op.type === 'mul' || op.type === 'pct_add';
}

export function isBadOp(op: GateOperation): boolean {
  return op.type === 'sub' || op.type === 'div' || op.type === 'pct_sub';
}

export function generateGatePair(phaseIndex: number, feathers: number): GatePair {
  const phase = Math.min(3, Math.max(0, phaseIndex));
  const base = gateBase(feathers);
  const tmpl = PHASE_TEMPLATES[phase];
  const forceRecovery = feathers < BALANCE.recoveryFeatherThreshold;
  const category = weightedCategory(forceRecovery);

  const goodPool = scaleOps(tmpl.good, base, phase);
  const badPool = scaleOps(tmpl.bad, base, phase);
  const recoveryPool = scaleOps(tmpl.recovery, base, phase);
  const riskPool = scaleOps(tmpl.risk, base, phase);
  const [trapMul, trapAdd] = scaleOps(tmpl.trap, base, phase);

  let left: GateOperation;
  let right: GateOperation;

  switch (category) {
    case 'recovery':
      left = pickRandom(recoveryPool);
      right = pickRandom(badPool);
      if (Math.random() > 0.5) [left, right] = [right, left];
      break;
    case 'mixed':
      left = Math.random() < 0.35 ? pickRandom(riskPool) : pickRandom(goodPool);
      right = pickRandom(badPool);
      if (Math.random() > 0.5) [left, right] = [right, left];
      break;
    case 'both_good':
      left = goodPool[0];
      right = goodPool[1] ?? goodPool[0];
      break;
    case 'both_bad':
      left = badPool[0];
      right = badPool[1] ?? badPool[0];
      if (forceRecovery) left = pickRandom(recoveryPool);
      break;
    case 'trap':
    default: {
      const useMulLeft = applyGate(feathers, trapMul) >= applyGate(feathers, trapAdd);
      left = useMulLeft ? trapMul : trapAdd;
      right = useMulLeft ? trapAdd : trapMul;
      if (Math.random() > 0.5) [left, right] = [right, left];
      break;
    }
  }

  return { left, right, category };
}

/** v0.1: only +N / -N / ×1.2 / ÷2；feathers<30 強制含 +30 */
export function generateGateTriplet(_phaseIndex: number, feathers: number): GateTriplet {
  const goodPool = [
    makeOp('add', 20),
    makeOp('add', 30),
    makeOp('add', 40),
    makeOp('mul', 1.2),
  ];
  const badPool = [
    makeOp('sub', 10),
    makeOp('sub', 15),
    makeOp('sub', 20),
    makeOp('div', 2),
  ];
  const recovery = makeOp('add', 30, { isRecovery: true });
  const forceRecovery = feathers < BALANCE.recoveryFeatherThreshold;

  const ops: GateOperation[] = [
    pickRandom(goodPool),
    pickRandom(badPool),
    forceRecovery ? recovery : pickRandom(goodPool),
  ];

  for (let i = ops.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [ops[i], ops[j]] = [ops[j], ops[i]];
  }

  if (forceRecovery && !ops.some((o) => o.isRecovery || (o.type === 'add' && o.value === 30))) {
    ops[1] = recovery;
  }

  return {
    ops: [ops[0], ops[1], ops[2]],
    category: forceRecovery ? 'recovery' : 'mixed',
  };
}

export function generateThirdGate(phaseIndex: number): GateOperation {
  const phase = Math.min(3, Math.max(0, phaseIndex));
  const rand = Math.random();
  if (rand < 0.35) return makeOp('sub', 6 + phase * 3);
  if (rand < 0.8) return makeOp('add', 12 + phase * 10);
  return makeOp('mul', Number((1.12 + phase * 0.05).toFixed(2)));
}

export function pickBestGate(feathers: number, pair: GatePair): 'left' | 'right' {
  const leftResult = applyGate(feathers, pair.left);
  const rightResult = applyGate(feathers, pair.right);
  return leftResult >= rightResult ? 'left' : 'right';
}

export function pickGateForSkill(feathers: number, pair: GatePair, skill: SkillLevel): 'left' | 'right' {
  const best = pickBestGate(feathers, pair);
  if (Math.random() < BALANCE.gateAccuracy[skill]) return best;
  return best === 'left' ? 'right' : 'left';
}

export function pickBestLane(feathers: number, triplet: GateTriplet): LaneIndex {
  let best: LaneIndex = 1;
  let bestVal = -1;
  for (let i = 0; i < 3; i++) {
    const v = applyGate(feathers, triplet.ops[i]);
    if (v > bestVal) {
      bestVal = v;
      best = i as LaneIndex;
    }
  }
  return best;
}

export function computeFinalScore(remainingFeathers: number): { score: number } {
  return { score: Math.max(0, Math.floor(remainingFeathers)) };
}

export function laneToX(lane: LaneIndex): number {
  return LANE_X[lane];
}

export function xToNearestLane(xPct: number): LaneIndex {
  let best: LaneIndex = 1;
  let bestDist = Infinity;
  for (let i = 0; i < 3; i++) {
    const d = Math.abs(LANE_X[i] - xPct);
    if (d < bestDist) {
      bestDist = d;
      best = i as LaneIndex;
    }
  }
  return best;
}

/** v0.1 fixed damage table; fever applies ×1.35 (miss stays 0) */
export function shotDamage(_base: number, grade: ShotGrade, fever: boolean): number {
  const dmg = BALANCE.gradeDamage[grade] ?? 0;
  if (dmg <= 0) return 0;
  return Math.max(1, Math.round(dmg * (fever ? BALANCE.feverDamageMult : 1)));
}

function simulatePhaseTrack(phase: number, feathers: number, skill: SkillLevel): number {
  const maxScroll = Math.min(PHASE_SCROLL_LENGTHS[phase] ?? 2200, 1750);
  let y = 350;
  let isGate = true;
  let f = feathers;
  let enemyReward = 0;
  let enemyHp = 0;

  while (y < maxScroll - 200) {
    if (isGate) {
      const pair = generateGatePair(phase, f);
      const side = pickGateForSkill(f, pair, skill);
      f = applyGate(f, side === 'left' ? pair.left : pair.right);
      if (f <= 0) return 0;
      y += 480;
    } else {
      if (Math.random() < 0.5) {
        const hpLeft = Math.max(8, 8 + phase * 6);
        const hpRight = Math.max(8, 10 + phase * 7);
        enemyHp += hpLeft + hpRight;
        enemyReward += Math.max(3, Math.floor(hpLeft * BALANCE.enemyRewardFactor));
        enemyReward += Math.max(3, Math.floor(hpRight * BALANCE.enemyRewardFactor));
        y += 520;
      } else {
        for (let k = 0; k < 3; k++) {
          const hp = Math.max(6, 6 + phase * 4);
          enemyHp += hp;
          enemyReward += Math.max(2, Math.floor(hp * BALANCE.enemyRewardFactor * 0.85));
        }
        y += 560;
      }
    }
    isGate = !isGate;
  }

  const combat = BALANCE.collectionRates[skill];
  f += Math.floor(enemyReward * combat);
  f = Math.max(0, f - Math.floor(enemyHp * 0.12 * (1 - combat)));
  return f;
}

export interface SimulationResult {
  remainingFeathers: number;
  score: number;
  gatesPassed: number;
  bossesDefeated: number;
}

export function simulateFeatherRush(skill: SkillLevel, runs = 1000): {
  avgRemaining: number;
  medianRemaining: number;
  avgScore: number;
  p10: number;
  p90: number;
  results: SimulationResult[];
} {
  const results: SimulationResult[] = [];

  for (let i = 0; i < runs; i++) {
    let feathers = BALANCE.initialFeathers;
    let bossesDefeated = 0;
    let gatesPassed = 0;

    for (let phase = 0; phase < 4; phase++) {
      feathers = simulatePhaseTrack(phase, feathers, skill);
      if (feathers <= 0) break;
      gatesPassed += 2;
      const boss = BOSSES[Math.min(phase, BOSSES.length - 1)];
      if (Math.random() < BALANCE.bossClearRate[skill]) {
        feathers += boss.reward;
        bossesDefeated += 1;
      } else {
        const loss = Math.max(12, Math.floor(feathers * BALANCE.bossFailLossPct));
        feathers = Math.max(0, feathers - loss);
      }
      if (feathers <= 0) break;
    }

    const { score } = computeFinalScore(feathers);
    results.push({ remainingFeathers: feathers, score, gatesPassed, bossesDefeated });
  }

  const remainings = results.map((r) => r.remainingFeathers).sort((a, b) => a - b);
  const avgRemaining = remainings.reduce((a, b) => a + b, 0) / remainings.length;
  const medianRemaining = remainings[Math.floor(remainings.length / 2)];
  const avgScore = results.reduce((a, b) => a + b.score, 0) / results.length;
  return {
    avgRemaining,
    medianRemaining,
    avgScore,
    p10: remainings[Math.floor(remainings.length * 0.1)],
    p90: remainings[Math.floor(remainings.length * 0.9)],
    results,
  };
}

export function validateBalance(runs = 2000): Record<SkillLevel, {
  pass: boolean;
  avg: number;
  median: number;
  p10: number;
  p90: number;
}> {
  const skills: SkillLevel[] = ['casual', 'skilled', 'strong'];
  const out = {} as Record<SkillLevel, { pass: boolean; avg: number; median: number; p10: number; p90: number }>;
  for (const skill of skills) {
    const sim = simulateFeatherRush(skill, runs);
    const target = BALANCE.featherTargets[skill];
    out[skill] = {
      pass: sim.avgRemaining >= target.min && sim.avgRemaining <= target.max,
      avg: sim.avgRemaining,
      median: sim.medianRemaining,
      p10: sim.p10,
      p90: sim.p90,
    };
  }
  return out;
}

export function fightBoss(feathers: number, boss: BossConfig): {
  remaining: number;
  bossHp: number;
  defeated: boolean;
} {
  const damage = Math.min(feathers, boss.hp);
  const bossHp = boss.hp - damage;
  const remaining = feathers - damage;
  if (bossHp <= 0) {
    return { remaining: remaining + boss.reward, bossHp: 0, defeated: true };
  }
  return { remaining, bossHp, defeated: false };
}
