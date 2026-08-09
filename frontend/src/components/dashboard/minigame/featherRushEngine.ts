import {
  BALANCE,
  BOSSES,
  BossConfig,
  GateOperation,
  GatePair,
  PHASE_SCROLL_LENGTHS,
  SkillLevel,
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
  return Math.max(0, Math.floor(result));
}

function gateBase(feathers: number): number {
  const capped = Math.min(feathers, BALANCE.gateScaleSoftCap);
  return Math.max(BALANCE.gateMinBase, Math.floor(capped * BALANCE.gateScaleFactor));
}

function makeOp(type: GateOperation['type'], value: number): GateOperation {
  return { type, value, label: '' };
}

function withLabels(op: GateOperation): GateOperation {
  return { ...op, label: formatGateLabel(op) };
}

function scaleOps(ops: GateOperation[], base: number, phase: number): GateOperation[] {
  const factor = 0.65 + phase * 0.3;
  return ops.map((op) => {
    if (op.type === 'mul' || op.type === 'div') {
      return withLabels(makeOp(op.type, op.value));
    }
    if (op.type === 'pct_add' || op.type === 'pct_sub') {
      return withLabels(makeOp(op.type, Math.round(op.value * (0.85 + phase * 0.15))));
    }
    return withLabels(makeOp(op.type, Math.max(6, Math.round(op.value * factor * (base / 30)))));
  });
}

/** Mild multipliers keep multi-gate runs inside ~500–1500 EV. */
const PHASE_TEMPLATES: Record<number, { good: GateOperation[]; bad: GateOperation[]; trap: [GateOperation, GateOperation] }> = {
  0: {
    good: [makeOp('add', 42), makeOp('mul', 1.2)],
    bad: [makeOp('sub', 18), makeOp('pct_sub', 10)],
    trap: [makeOp('mul', 1.2), makeOp('add', 48)],
  },
  1: {
    good: [makeOp('add', 65), makeOp('mul', 1.25)],
    bad: [makeOp('sub', 28), makeOp('pct_sub', 14)],
    trap: [makeOp('mul', 1.25), makeOp('add', 78)],
  },
  2: {
    good: [makeOp('add', 90), makeOp('mul', 1.3)],
    bad: [makeOp('sub', 38), makeOp('div', 2)],
    trap: [makeOp('mul', 1.3), makeOp('add', 112)],
  },
  3: {
    good: [makeOp('add', 118), makeOp('mul', 1.35)],
    bad: [makeOp('sub', 48), makeOp('pct_sub', 16)],
    trap: [makeOp('mul', 1.35), makeOp('add', 150)],
  },
};

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function weightedCategory(): GatePair['category'] {
  const r = Math.random();
  const { mixed, both_good, both_bad, trap } = BALANCE.gateWeights;
  if (r < mixed) return 'mixed';
  if (r < mixed + both_good) return 'both_good';
  if (r < mixed + both_good + both_bad) return 'both_bad';
  return 'trap';
}

export function generateGatePair(phaseIndex: number, feathers: number): GatePair {
  const phase = Math.min(3, Math.max(0, phaseIndex));
  const base = gateBase(feathers);
  const tmpl = PHASE_TEMPLATES[phase];
  const category = weightedCategory();

  const goodPool = scaleOps(tmpl.good, base, phase);
  const badPool = scaleOps(tmpl.bad, base, phase);
  const [trapMul, trapAdd] = scaleOps(tmpl.trap, base, phase);

  let left: GateOperation;
  let right: GateOperation;

  switch (category) {
    case 'mixed':
      left = pickRandom(goodPool);
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

/** Third lane filler — mild mul only (no free ×2). */
export function generateThirdGate(phaseIndex: number): GateOperation {
  const phase = Math.min(3, Math.max(0, phaseIndex));
  const rand = Math.random();
  if (rand < 0.35) {
    const value = 6 + phase * 3;
    return withLabels(makeOp('sub', value));
  }
  if (rand < 0.8) {
    const value = 12 + phase * 10;
    return withLabels(makeOp('add', value));
  }
  const mul = Number((1.12 + phase * 0.05).toFixed(2));
  return withLabels(makeOp('mul', mul));
}

export function generateGateTriplet(
  phaseIndex: number,
  feathers: number,
): { left: GateOperation; middle: GateOperation; right: GateOperation } {
  const pair = generateGatePair(phaseIndex, feathers);
  const third = generateThirdGate(phaseIndex);
  const gatesList = [pair.left, pair.right, third];
  for (let i = gatesList.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [gatesList[i], gatesList[j]] = [gatesList[j], gatesList[i]];
  }
  return { left: gatesList[0], middle: gatesList[1], right: gatesList[2] };
}

export function pickBestGate(feathers: number, pair: GatePair): 'left' | 'right' {
  const leftResult = applyGate(feathers, pair.left);
  const rightResult = applyGate(feathers, pair.right);
  return leftResult >= rightResult ? 'left' : 'right';
}

export function pickGateForSkill(feathers: number, pair: GatePair, skill: SkillLevel): 'left' | 'right' {
  const best = pickBestGate(feathers, pair);
  if (Math.random() < BALANCE.gateAccuracy[skill]) {
    return best;
  }
  return best === 'left' ? 'right' : 'left';
}

export function computeFinalScore(remainingFeathers: number): { score: number } {
  return {
    score: Math.max(0, Math.floor(remainingFeathers)),
  };
}

export function segmentFeatherTotal(): number {
  const { min, max } = BALANCE.feathersPerSegment;
  let total = 0;
  for (let i = 0; i < BALANCE.segmentCount; i++) {
    total += min + Math.floor(Math.random() * (max - min + 1));
  }
  return total;
}

export function collectedFeathers(totalSpawned: number, skill: SkillLevel): number {
  return Math.floor(totalSpawned * BALANCE.collectionRates[skill]);
}

export function fightBoss(feathers: number, boss: BossConfig): { remaining: number; bossHp: number; defeated: boolean } {
  const damage = Math.min(feathers, boss.hp);
  const bossHp = boss.hp - damage;
  const remaining = feathers - damage;
  if (bossHp <= 0) {
    return { remaining: remaining + boss.reward, bossHp: 0, defeated: true };
  }
  return { remaining, bossHp, defeated: false };
}

/** Approximate one run-phase track under the ~10s time gate (scroll ≈ 1750). Dual gates like Arrow a Row. */
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
        const hpLeft = Math.max(4, 4 + phase * 5);
        const hpRight = Math.max(4, 8 + phase * 7);
        enemyHp += hpLeft + hpRight;
        enemyReward += Math.max(2, Math.floor(hpLeft * BALANCE.enemyRewardFactor));
        enemyReward += Math.max(2, Math.floor(hpRight * BALANCE.enemyRewardFactor));
        y += 520;
      } else {
        for (let k = 0; k < 3; k++) {
          const hp = Math.max(3, 3 + phase * 3);
          enemyHp += hp;
          enemyReward += Math.max(1, Math.floor(hp * BALANCE.enemyRewardFactor * 0.8));
        }
        y += 560;
      }
    }
    isGate = !isGate;
  }

  const combat = BALANCE.collectionRates[skill];
  f += Math.floor(enemyReward * combat);
  f = Math.max(0, f - Math.floor(enemyHp * 0.16 * (1 - combat)));
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

      // Rough gate count for telemetry (2–3 per timed phase).
      gatesPassed += 2;

      const boss = BOSSES[phase];
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
    results.push({
      remainingFeathers: feathers,
      score,
      gatesPassed,
      bossesDefeated,
    });
  }

  const remainings = results.map((r) => r.remainingFeathers).sort((a, b) => a - b);
  const avgRemaining = remainings.reduce((a, b) => a + b, 0) / remainings.length;
  const medianRemaining = remainings[Math.floor(remainings.length / 2)];
  const avgScore = results.reduce((a, b) => a + b.score, 0) / results.length;

  return { avgRemaining, medianRemaining, avgScore, results };
}

export function validateBalance(runs = 2000): Record<SkillLevel, { pass: boolean; avg: number; median: number }> {
  const skills: SkillLevel[] = ['casual', 'skilled', 'strong'];
  const out = {} as Record<SkillLevel, { pass: boolean; avg: number; median: number }>;
  for (const skill of skills) {
    const sim = simulateFeatherRush(skill, runs);
    const target = BALANCE.featherTargets[skill];
    out[skill] = {
      pass: sim.avgRemaining >= target.min && sim.avgRemaining <= target.max,
      avg: sim.avgRemaining,
      median: sim.medianRemaining,
    };
  }
  return out;
}
