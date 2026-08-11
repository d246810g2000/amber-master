import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import ChevronLeft from 'lucide-react/dist/esm/icons/chevron-left';
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right';
import { cn, getAvatarUrl } from '../../../lib/utils';
import {
  BALANCE, BOSSES, LANE_X, LaneIndex, EnemyState, EnemyKind,
  ShotGrade, GateOperation, gradeShot,
} from './featherRushTypes';
import {
  applyGate, computeFinalScore, generateGateTriplet, isGoodOp, isBadOp,
  laneToX, xToNearestLane, shotDamage,
} from './featherRushEngine';
import { PETS_CATALOG, PetCatalogEntry } from '../../../lib/petCatalog';
import { PetRenderer } from '../../PetRenderer';

interface FeatherRushCanvasProps {
  playerName: string;
  playerAvatar: string;
  onGameEnd: (score: number, maxCombo: number, remainingFeathers: number) => void;
}

type SubPhase = 'run' | 'boss' | 'ended';

interface MathGate {
  id: number;
  z: number;
  ops: [GateOperation, GateOperation, GateOperation];
  category: string;
  resolved: boolean;
  fade?: number;
}

interface Enemy {
  id: number;
  lane: LaneIndex;
  z: number;
  hp: number;
  maxHp: number;
  kind: EnemyKind;
  state: EnemyState;
  emoji: string;
  reward: number;
  speed: number;
  hitFlash?: number;
  isHazard?: boolean;
}

interface Projectile {
  id: number;
  lane: LaneIndex;
  xPct: number;
  z: number;
  damage: number;
  grade: ShotGrade;
  dead?: boolean;
}

interface Particle {
  id: number; x: number; y: number; vx: number; vy: number;
  color: string; life: number; size: number;
}

interface FloatingText {
  id: number; text: string; x: number; y: number; color: string; life: number;
}

interface MagnetFeather {
  id: number; startX: number; startY: number; x: number; y: number;
  progress: number; value: number;
}

interface ScreenPos {
  x: number; y: number; scale: number; progress: number; dist: number;
}

const PLAYER_Y_RATIO = 0.80;
const HORIZON_Y_RATIO = 0.22;
const VIEW_DEPTH = 420;
const HIT_DEPTH = 8;
const GATE_PASS_DEPTH = -18;
const COMBAT_RANGE = Math.round(VIEW_DEPTH * 0.5);
const SCROLL_SPEED = 3.0;
const BULLET_SPEED = 3.2;
const LANE_LERP = 0.18;
const TOTAL_GAME_SEC = BALANCE.gameDurationSec;
const BOSS_SPAWN_DIST = Math.round(VIEW_DEPTH * 0.92);
const BOSS_APPROACH_SPEED = 2.35;
const ROAD_HALF_FAR = 0.20;
const ROAD_HALF_NEAR = 0.46;
const MAX_PROJECTILES = 8;
const HIT_STOP_MS = 90;
const BOSS_INTRO_MS = 750;
const MAX_PARTICLES = 80;
const HIT_COOLDOWN_MS = 180;
const STAGE_BOUNDARIES = [0, 12, 27, 42, 57, TOTAL_GAME_SEC] as const;

const GRADE_LABELS: Record<ShotGrade, string> = {
  perfect: '完美!', great: '精準!', good: '好球', miss: '揮空',
};
const GRADE_COLORS: Record<ShotGrade, string> = {
  perfect: '#fde047', great: '#c4b5fd', good: '#7dd3fc', miss: '#94a3b8',
};

const SEGMENT_NAMES = ['練習場衝刺', '網前纏鬥', '後場對轟', '決勝殺球'] as const;

function elapsedSecFromRefs(timeLeft: number, msIntoSec: number): number {
  return TOTAL_GAME_SEC - timeLeft - (1000 - msIntoSec) / 1000;
}

function stageIndexFromElapsed(elapsed: number): number {
  if (elapsed < 12) return 0;
  if (elapsed < 27) return 1;
  if (elapsed < 42) return 2;
  return 3;
}

function spawnIntervals(elapsed: number): { enemyMs: number; gateMs: number } | null {
  if (elapsed >= BALANCE.bossAppearElapsedSec) return null;
  if (elapsed < 10) return { enemyMs: 2500, gateMs: 4500 };
  if (elapsed < 20) return { enemyMs: 2400, gateMs: 4400 };
  if (elapsed < 30) return { enemyMs: 2300, gateMs: 4200 };
  if (elapsed < 40) return { enemyMs: 2200, gateMs: 4000 };
  if (elapsed < 50) return { enemyMs: 2200, gateMs: 4000 };
  return { enemyMs: 2500, gateMs: 4500 };
}

function stageLocalProgress(elapsed: number, stageIdx: number, inBoss: boolean): number {
  if (inBoss) return Math.min(1, (elapsed - 57) / 3);
  const start = STAGE_BOUNDARIES[stageIdx];
  const end = STAGE_BOUNDARIES[stageIdx + 1];
  return Math.min(1, Math.max(0, (elapsed - start) / (end - start)));
}

interface CourtTheme {
  label: string;
  sky: [string, string, string];
  road: [string, string];
  edge: string;
  accent: string;
  haze: string;
  starColor: string;
}

const COURT_THEMES: CourtTheme[] = [
  { label: '練習場', sky: ['#020617', '#0f172a', '#1e3a2f'], road: ['#14532d', '#052e16'], edge: '#86efac', accent: '#38bdf8', haze: 'rgba(52,211,153,0.12)', starColor: '#e2e8f0' },
  { label: '網前區', sky: ['#0c0a1a', '#1e1b4b', '#312e81'], road: ['#1e3a5f', '#0f172a'], edge: '#c4b5fd', accent: '#a78bfa', haze: 'rgba(167,139,250,0.14)', starColor: '#ddd6fe' },
  { label: '後場', sky: ['#1c1917', '#292524', '#78350f'], road: ['#3f2e1a', '#1c1410'], edge: '#fcd34d', accent: '#f59e0b', haze: 'rgba(251,191,36,0.12)', starColor: '#fde68a' },
  { label: '決勝場', sky: ['#1a0a0a', '#3f0a0a', '#7f1d1d'], road: ['#3f1515', '#1a0808'], edge: '#fda4af', accent: '#f43f5e', haze: 'rgba(244,63,94,0.14)', starColor: '#fecdd3' },
];

function worldToScreen(xPct: number, dist: number, w: number, h: number): ScreenPos | null {
  if (dist < -90 || dist > VIEW_DEPTH + 80) return null;
  const horizonY = h * HORIZON_Y_RATIO;
  const playerY = h * PLAYER_Y_RATIO;
  const normDist = Math.max(-0.25, Math.min(1, dist / VIEW_DEPTH));
  const t = 1 - normDist;
  const screenProgress = Math.pow(Math.max(0, t), 1.25);
  const y = horizonY + (playerY - horizonY) * screenProgress;
  const halfWidth = w * (ROAD_HALF_FAR + (ROAD_HALF_NEAR - ROAD_HALF_FAR) * screenProgress);
  const xNorm = (xPct - 50) / 50;
  const x = w * 0.5 + xNorm * halfWidth;
  const scale = Math.max(0.22, Math.min(1.4, 0.22 + screenProgress * 0.95));
  return { x, y, scale, progress: screenProgress, dist };
}

function roadHalfWidthAt(progress: number, w: number): number {
  return w * (ROAD_HALF_FAR + (ROAD_HALF_NEAR - ROAD_HALF_FAR) * progress);
}

function enemyStateFromDist(dist: number): EnemyState {
  if (dist > 280) return 'far';
  if (dist > 120) return 'approaching';
  if (dist > 40) return 'warning';
  return 'attacking';
}

function makeEnemy(id: number, lane: LaneIndex, z: number): Enemy {
  const dist = z;
  return {
    id, lane, z,
    hp: BALANCE.enemyHp, maxHp: BALANCE.enemyHp,
    kind: 'runner', state: enemyStateFromDist(dist),
    emoji: '😤', reward: BALANCE.enemyReward, speed: 1,
  };
}

function spawnEnemyAt(z: number, nextId: () => number): Enemy {
  const lane = Math.floor(Math.random() * 3) as LaneIndex;
  return makeEnemy(nextId(), lane, z);
}

function spawnGateAt(z: number, stageIdx: number, feathers: number, nextId: () => number): MathGate {
  const triplet = generateGateTriplet(stageIdx, feathers);
  return { id: nextId(), z, ops: triplet.ops, category: triplet.category, resolved: false };
}

function drawParallax(ctx: CanvasRenderingContext2D, w: number, horizonY: number, scroll: number, theme: CourtTheme) {
  for (let i = 0; i < 36; i++) {
    const layer = i % 3;
    const speed = 0.04 + layer * 0.06;
    const x = ((i * 47 + scroll * speed) % (w + 40)) - 20;
    const y = (i * 31) % Math.floor(horizonY * 0.85);
    const r = layer === 0 ? 1 : layer === 1 ? 1.5 : 2.2;
    ctx.globalAlpha = 0.25 + layer * 0.15;
    ctx.fillStyle = theme.starColor;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 0.08;
  for (let c = 0; c < 4; c++) {
    const cx = ((c * 180 + scroll * 0.02) % (w + 120)) - 60;
    const cy = horizonY * (0.25 + c * 0.12);
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.ellipse(cx, cy, 40 + c * 8, 12 + c * 3, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawCourtMarkings(ctx: CanvasRenderingContext2D, w: number, h: number, horizonY: number, scroll: number) {
  const depths = [VIEW_DEPTH * 0.38, VIEW_DEPTH * 0.62];
  ctx.save();
  ctx.strokeStyle = 'rgba(226,232,240,0.18)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([10, 14]);
  depths.forEach((dist) => {
    const t = 1 - dist / VIEW_DEPTH;
    const progress = Math.pow(t, 1.25);
    const y = horizonY + (h * PLAYER_Y_RATIO - horizonY) * progress;
    const half = roadHalfWidthAt(progress, w);
    ctx.lineDashOffset = -(scroll * 0.6 + dist * 0.08) % 24;
    ctx.beginPath();
    ctx.moveTo(w * 0.5 - half * 0.92, y);
    ctx.lineTo(w * 0.5 + half * 0.92, y);
    ctx.stroke();
  });
  ctx.setLineDash([]);
  LANE_X.forEach((lx) => {
    const pos = worldToScreen(lx, VIEW_DEPTH * 0.5, w, h);
    if (!pos) return;
    ctx.strokeStyle = 'rgba(226,232,240,0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pos.x, horizonY);
    ctx.lineTo(pos.x, h);
    ctx.stroke();
  });
  ctx.restore();
}

function drawLaneGlow(ctx: CanvasRenderingContext2D, lane: LaneIndex, w: number, h: number, horizonY: number, color: string, alpha: number) {
  const lx = LANE_X[lane];
  const near = worldToScreen(lx, 60, w, h);
  const far = worldToScreen(lx, VIEW_DEPTH * 0.7, w, h);
  if (!near || !far) return;
  const halfNear = roadHalfWidthAt(near.progress, w) / 3.2;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(far.x - halfNear * 0.3, far.y);
  ctx.lineTo(far.x + halfNear * 0.3, far.y);
  ctx.lineTo(near.x + halfNear, near.y);
  ctx.lineTo(near.x - halfNear, near.y);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawShuttlecock(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, grade: ShotGrade, alpha = 1) {
  const power = grade === 'perfect' || grade === 'great';
  const headR = (power ? 8 : 6) * scale;
  const tailLen = (power ? 24 : 18) * scale;
  ctx.save();
  ctx.globalAlpha = alpha;
  const trailGrad = ctx.createLinearGradient(x, y + tailLen, x, y + tailLen * 2.2);
  trailGrad.addColorStop(0, power ? 'rgba(253,224,71,0.55)' : 'rgba(56,189,248,0.45)');
  trailGrad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = trailGrad;
  ctx.beginPath();
  ctx.moveTo(x - headR * 0.8, y);
  ctx.lineTo(x + headR * 0.8, y);
  ctx.lineTo(x + headR * 1.5, y + tailLen * 2.2);
  ctx.lineTo(x - headR * 1.5, y + tailLen * 2.2);
  ctx.closePath();
  ctx.fill();
  ctx.shadowColor = power ? '#fde047' : '#38bdf8';
  ctx.shadowBlur = power ? 14 * scale : 6 * scale;
  ctx.fillStyle = power ? '#fef08a' : '#fbbf24';
  ctx.beginPath();
  ctx.ellipse(x, y - tailLen * 0.35, headR, headR * 0.85, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}


export const FeatherRushCanvas: React.FC<FeatherRushCanvasProps> = ({
  playerName, playerAvatar, onGameEnd,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  const canvasWidthRef = useRef(360);
  const canvasHeightRef = useRef(500);
  const idCounterRef = useRef(0);
  const avatarImgRef = useRef<HTMLImageElement | null>(null);

  const feathersRef = useRef(BALANCE.initialFeathers);
  const stageRef = useRef(0);
  const subPhaseRef = useRef<SubPhase>('run');
  const scrollRef = useRef(0);
  const playerLaneRef = useRef<LaneIndex>(1);
  const playerXRef = useRef(50);
  const timeLeftRef = useRef(TOTAL_GAME_SEC);
  const bossHpRef = useRef(0);
  const bossAnchorZRef = useRef(VIEW_DEPTH + 1000);
  const bossLaneRef = useRef<LaneIndex>(1);
  const mathGatesRef = useRef<MathGate[]>([]);
  const enemiesRef = useRef<Enemy[]>([]);
  const projectilesRef = useRef<Projectile[]>([]);
  const hitCooldownRef = useRef(0);
  const enemySpawnTimerRef = useRef(2200);
  const gateSpawnTimerRef = useRef(4200);
  const bossSpawnedRef = useRef(false);
  const particlesRef = useRef<Particle[]>([]);
  const floatTextsRef = useRef<FloatingText[]>([]);
  const magnetFeathersRef = useRef<MagnetFeather[]>([]);
  const shakeRef = useRef(0);
  const endedRef = useRef(false);
  const secondsTimerRef = useRef(0);
  const toastUntilRef = useRef(0);
  const hitStopRef = useRef(0);
  const bossIntroRef = useRef(0);
  const vignetteRef = useRef(0);
  const tipUntilRef = useRef(performance.now() + 5000);
  const flashWhiteRef = useRef(0);
  const comboRef = useRef(0);
  const maxComboRef = useRef(0);
  const feverUntilRef = useRef(0);
  const feverActiveRef = useRef(false);
  const bossHopTimerRef = useRef(900);
  const swipeStartRef = useRef<{ x: number; y: number } | null>(null);
  const hitReadyRef = useRef(false);
  const lastSegmentUiRef = useRef(0);

  const [feathers, setFeathers] = useState(BALANCE.initialFeathers);
  const [timeLeft, setTimeLeft] = useState(TOTAL_GAME_SEC);
  const [combo, setCombo] = useState(0);
  const [fever, setFever] = useState(false);
  const [phaseLabel, setPhaseLabel] = useState<string>(SEGMENT_NAMES[0]);
  const [segmentIndex, setSegmentIndex] = useState(1);
  const [progress, setProgress] = useState(0);
  const [bossHp, setBossHp] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [bossScreen, setBossScreen] = useState({ x: 0, y: 0, scale: 0.2, visible: false });
  const [bossPet, setBossPet] = useState<PetCatalogEntry | null>(null);
  const [showTip, setShowTip] = useState(true);
  const [bossBanner, setBossBanner] = useState<string | null>(null);
  const [lane, setLane] = useState<LaneIndex>(1);
  const [subPhase, setSubPhase] = useState<SubPhase>('run');
  const [hitReady, setHitReady] = useState(false);

  const nextId = () => { idCounterRef.current += 1; return idCounterRef.current; };

  const isFeverActive = () => performance.now() < feverUntilRef.current;

  const incrementCombo = () => {
    comboRef.current += 1;
    maxComboRef.current = Math.max(maxComboRef.current, comboRef.current);
    setCombo(comboRef.current);
    if (comboRef.current >= BALANCE.feverComboThreshold) {
      feverUntilRef.current = performance.now() + BALANCE.feverDurationMs;
      setFever(true);
    }
  };

  const resetCombo = () => {
    comboRef.current = 0;
    setCombo(0);
  };

  const shiftLane = (dir: 'left' | 'right') => {
    const cur = playerLaneRef.current;
    if (dir === 'left' && cur > 0) {
      playerLaneRef.current = (cur - 1) as LaneIndex;
    } else if (dir === 'right' && cur < 2) {
      playerLaneRef.current = (cur + 1) as LaneIndex;
    }
    setLane(playerLaneRef.current);
  };

  const showToast = (text: string) => {
    toastUntilRef.current = performance.now() + 1200;
    setToast(text);
  };

  const triggerImpact = (kind: 'soft' | 'hard' | 'fail') => {
    if (kind === 'fail') {
      hitStopRef.current = Math.max(hitStopRef.current, HIT_STOP_MS + 40);
      shakeRef.current = Math.max(shakeRef.current, 22);
      vignetteRef.current = Math.max(vignetteRef.current, 0.85);
      flashWhiteRef.current = Math.max(flashWhiteRef.current, 0.35);
    } else if (kind === 'hard') {
      hitStopRef.current = Math.max(hitStopRef.current, HIT_STOP_MS);
      shakeRef.current = Math.max(shakeRef.current, 14);
      vignetteRef.current = Math.max(vignetteRef.current, 0.45);
    } else {
      shakeRef.current = Math.max(shakeRef.current, 6);
    }
  };

  const addParticles = (x: number, y: number, color: string, count = 12) => {
    for (let i = 0; i < count; i++) {
      particlesRef.current.push({
        id: nextId(), x, y,
        vx: (Math.random() - 0.5) * 9,
        vy: (Math.random() - 0.5) * 9 - 1,
        color, life: 1, size: 2 + Math.random() * 4,
      });
    }
    if (particlesRef.current.length > MAX_PARTICLES) {
      particlesRef.current = particlesRef.current.slice(-MAX_PARTICLES);
    }
  };

  const addFloatText = (text: string, x: number, y: number, color = '#fbbf24') => {
    const w = canvasWidthRef.current || 400;
    const h = canvasHeightRef.current || 500;
    floatTextsRef.current.push({
      id: nextId(), text,
      x: Math.max(24, Math.min(w - 24, x)),
      y: Math.max(28, Math.min(h - 28, y)),
      color, life: 1,
    });
    if (floatTextsRef.current.length > 18) {
      floatTextsRef.current = floatTextsRef.current.slice(-18);
    }
  };

  const spawnMagnetFeather = (startX: number, startY: number, val: number) => {
    magnetFeathersRef.current.push({
      id: nextId(), startX, startY, x: startX, y: startY, progress: 0, value: val,
    });
  };

  const initGame = () => {
    mathGatesRef.current = [];
    enemiesRef.current = [];
    projectilesRef.current = [];
    scrollRef.current = 0;
    stageRef.current = 0;
    subPhaseRef.current = 'run';
    bossSpawnedRef.current = false;
    bossAnchorZRef.current = VIEW_DEPTH + 1000;
    bossLaneRef.current = 1;
    bossHpRef.current = 0;
    enemySpawnTimerRef.current = 1800;
    gateSpawnTimerRef.current = 3500;
    setBossHp(0);
    setSegmentIndex(1);
    setPhaseLabel(SEGMENT_NAMES[0]);
    setBossBanner(null);
    const boss = BOSSES[0];
    const candidates = PETS_CATALOG.filter((p) => p.tier === boss.tier);
    setBossPet(candidates.length > 0 ? candidates[Math.floor(Math.random() * candidates.length)] : null);
  };

  const beginBossFight = () => {
    if (bossSpawnedRef.current) return;
    bossSpawnedRef.current = true;
    subPhaseRef.current = 'boss';
    const boss = BOSSES[0];
    bossHpRef.current = boss.hp;
    setBossHp(boss.hp);
    bossLaneRef.current = 1;
    setPhaseLabel(boss.title);
    setSubPhase('boss');
    bossHopTimerRef.current = 900;
    enemiesRef.current = [];
    projectilesRef.current = [];
    mathGatesRef.current = mathGatesRef.current.filter((g) => g.resolved && (g.fade ?? 0) > 0);
    bossAnchorZRef.current = scrollRef.current + BOSS_SPAWN_DIST;
    bossIntroRef.current = BOSS_INTRO_MS;
    flashWhiteRef.current = 0.55;
    shakeRef.current = Math.max(shakeRef.current, 10);
    setBossBanner(boss.title);
    addFloatText(boss.taunt, canvasWidthRef.current * 0.5, canvasHeightRef.current * 0.32, boss.color);
  };

  const finishGame = () => {
    if (endedRef.current) return;
    endedRef.current = true;
    subPhaseRef.current = 'ended';
    setSubPhase('ended');
    const { score } = computeFinalScore(feathersRef.current);
    onGameEnd(score, maxComboRef.current, feathersRef.current);
  };

  const updateBossSidestep = (delta: number) => {
    bossHopTimerRef.current -= delta;
    if (bossHopTimerRef.current <= 0) {
      bossHopTimerRef.current = 880 + Math.random() * 320;
      let next = Math.floor(Math.random() * 3) as LaneIndex;
      if (next === bossLaneRef.current) next = ((next + 1) % 3) as LaneIndex;
      bossLaneRef.current = next;
    }
  };

  const findCombatTarget = (): { type: 'boss' | 'enemy'; dist: number; enemy?: Enemy } | null => {
    const cam = scrollRef.current;
    const lane = playerLaneRef.current;

    if (subPhaseRef.current === 'boss' && bossHpRef.current > 0) {
      const bossDist = bossAnchorZRef.current - cam;
      if (bossDist <= COMBAT_RANGE && bossDist > HIT_DEPTH && lane === bossLaneRef.current) {
        return { type: 'boss', dist: bossDist };
      }
    }

    let target: Enemy | null = null;
    let targetDist = Infinity;
    enemiesRef.current.forEach((e) => {
      if (e.hp <= 0) return;
      const dist = e.z - cam;
      if (dist > COMBAT_RANGE || dist <= HIT_DEPTH) return;
      if (e.lane !== lane) return;
      if (dist < targetDist) { targetDist = dist; target = e; }
    });
    if (target) return { type: 'enemy', dist: targetDist, enemy: target };
    return null;
  };

  const tryManualHit = () => {
    if (hitCooldownRef.current > 0 || bossIntroRef.current > 0 || endedRef.current) return;
    const w = canvasWidthRef.current;
    const h = canvasHeightRef.current;
    const playerY = h * PLAYER_Y_RATIO;
    const playerScreen = worldToScreen(playerXRef.current, 0, w, h);
    const px = playerScreen?.x ?? w * 0.5;

    const target = findCombatTarget();
    if (!target) {
      resetCombo();
      addFloatText(GRADE_LABELS.miss, px, playerY - 36, GRADE_COLORS.miss);
      hitCooldownRef.current = HIT_COOLDOWN_MS;
      return;
    }

    const feverActive = isFeverActive();
    const grade = gradeShot(target.dist, COMBAT_RANGE);
    const dmg = shotDamage(0, grade, feverActive);
    const cam = scrollRef.current;
    const alive = projectilesRef.current.filter((p) => !p.dead).length;
    if (alive >= MAX_PROJECTILES) return;

    projectilesRef.current.push({
      id: nextId(), lane: playerLaneRef.current, xPct: playerXRef.current,
      z: cam + HIT_DEPTH + 40, damage: dmg, grade,
    });
    hitCooldownRef.current = HIT_COOLDOWN_MS;
    addParticles(px, playerY - 36, grade === 'perfect' ? '#fde047' : '#38bdf8', grade === 'perfect' ? 6 : 4);
  };

  const resolveProjectileHits = (w: number, h: number, frame: number) => {
    const cam = scrollRef.current;
    projectilesRef.current.forEach((proj) => {
      if (proj.dead) return;
      proj.z += (SCROLL_SPEED + BULLET_SPEED) * frame;

      if (subPhaseRef.current === 'boss' && bossHpRef.current > 0) {
        const bossDist = bossAnchorZRef.current - cam;
        const pDist = proj.z - cam;
        if (Math.abs(pDist - bossDist) > 32) return;
        const bX = laneToX(bossLaneRef.current);
        const bScreen = worldToScreen(bX, bossDist, w, h);
        const pScreen = worldToScreen(proj.xPct, pDist, w, h);
        if (!bScreen || !pScreen) return;
        if (Math.abs(pScreen.x - bScreen.x) > 48 * bScreen.scale) return;
        proj.dead = true;
        const grade = proj.grade;
        if (grade === 'miss') { resetCombo(); return; }
        incrementCombo();
        bossHpRef.current = Math.max(0, bossHpRef.current - proj.damage);
        setBossHp(bossHpRef.current);
        shakeRef.current = Math.max(shakeRef.current, grade === 'perfect' ? 10 : 6);
        addParticles(pScreen.x, pScreen.y, '#a78bfa', grade === 'perfect' ? 14 : 8);
        addFloatText(GRADE_LABELS[grade], pScreen.x, pScreen.y - 18, GRADE_COLORS[grade]);
        addFloatText(`-${proj.damage}`, pScreen.x, pScreen.y - 4, '#f87171');
        if (bossHpRef.current <= 0) {
          const boss = BOSSES[0];
          feathersRef.current += boss.reward;
          setFeathers(feathersRef.current);
          triggerImpact('hard');
          flashWhiteRef.current = Math.max(flashWhiteRef.current, 0.8);
          addFloatText(`+${boss.reward} 羽毛！`, w * 0.5, h * 0.38, '#fbbf24');
          addFloatText('擊破對手 · 勝利！', w * 0.5, h * 0.44, '#7dd3fc');
          if (bScreen) { addParticles(bScreen.x, bScreen.y, '#fbbf24', 40); spawnMagnetFeather(bScreen.x, bScreen.y, boss.reward); }
          setTimeout(() => finishGame(), 800);
        }
        return;
      }

      enemiesRef.current.forEach((e) => {
        if (proj.dead || e.hp <= 0) return;
        const dist = e.z - cam;
        const pDist = proj.z - cam;
        if (Math.abs(pDist - dist) > 28) return;
        if (e.lane !== proj.lane) return;
        proj.dead = true;
        const grade = proj.grade;
        const screen = worldToScreen(laneToX(e.lane), dist, w, h);
        if (grade === 'miss') {
          resetCombo();
          if (screen) addFloatText(GRADE_LABELS.miss, screen.x, screen.y - 16, GRADE_COLORS.miss);
          return;
        }
        incrementCombo();
        e.hp -= proj.damage;
        e.hitFlash = 6;
        if (screen) {
          addFloatText(GRADE_LABELS[grade], screen.x, screen.y - 20, GRADE_COLORS[grade]);
          addParticles(screen.x, screen.y, '#f43f5e', grade === 'perfect' ? 12 : 6);
        }
        if (e.hp <= 0) {
          triggerImpact('soft');
          if (screen) {
            addParticles(screen.x, screen.y, '#fbbf24', 20);
            spawnMagnetFeather(screen.x, screen.y, e.reward);
            addFloatText('接住!', screen.x, screen.y + 6, '#7dd3fc');
            addFloatText(`+${e.reward}`, screen.x, screen.y + 22, '#fbbf24');
          }
          feathersRef.current += e.reward;
          setFeathers(feathersRef.current);
        } else if (screen) {
          addFloatText(`-${proj.damage}`, screen.x, screen.y - 4, '#ef4444');
        }
      });
    });
    projectilesRef.current = projectilesRef.current.filter((p) => {
      if (p.dead) return false;
      const dist = p.z - cam;
      return dist > 0 && dist < COMBAT_RANGE + 30;
    });
  };


  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = getAvatarUrl(playerAvatar, playerName);
    img.onload = () => { avatarImgRef.current = img; };
  }, [playerAvatar, playerName]);

  useEffect(() => {
    initGame();

    const resize = () => {
      const container = containerRef.current;
      const canvas = canvasRef.current;
      if (!container || !canvas) return;
      const rect = container.getBoundingClientRect();
      canvasWidthRef.current = rect.width;
      canvasHeightRef.current = rect.height;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const blockTouch = (e: TouchEvent) => { if (e.cancelable) e.preventDefault(); };
    const el = containerRef.current;
    el?.addEventListener('touchmove', blockTouch, { passive: false });

    let lastTs = 0;
    const gameStep = (ts: number) => {
      if (endedRef.current) return;
      const rawDelta = lastTs ? ts - lastTs : 16;
      lastTs = ts;

      let timeScale = 1;
      if (hitStopRef.current > 0) {
        hitStopRef.current = Math.max(0, hitStopRef.current - rawDelta);
        timeScale = 0.12;
      } else if (bossIntroRef.current > 0) {
        bossIntroRef.current = Math.max(0, bossIntroRef.current - rawDelta);
        timeScale = 0.42;
        if (bossIntroRef.current <= 0) setBossBanner(null);
      }
      const delta = Math.min(rawDelta, 50) * timeScale;
      const frame = delta / 16;

      if (performance.now() >= toastUntilRef.current && toastUntilRef.current > 0) {
        toastUntilRef.current = 0;
        setToast(null);
      }
      if (tipUntilRef.current > 0 && performance.now() >= tipUntilRef.current) {
        tipUntilRef.current = -1;
        setShowTip(false);
      }
      const feverActive = isFeverActive();
      if (feverActive !== feverActiveRef.current) {
        feverActiveRef.current = feverActive;
        setFever(feverActive);
      }

      if (vignetteRef.current > 0) vignetteRef.current = Math.max(0, vignetteRef.current - rawDelta * 0.0018);
      if (flashWhiteRef.current > 0) flashWhiteRef.current = Math.max(0, flashWhiteRef.current - rawDelta * 0.0024);

      const canvas = canvasRef.current;
      if (!canvas) { requestRef.current = requestAnimationFrame(gameStep); return; }
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const w = canvasWidthRef.current;
      const h = canvasHeightRef.current;
      const horizonY = h * HORIZON_Y_RATIO;
      const playerY = h * PLAYER_Y_RATIO;
      const cam = scrollRef.current;

      secondsTimerRef.current += delta;
      if (secondsTimerRef.current >= 1000) {
        secondsTimerRef.current -= 1000;
        timeLeftRef.current = Math.max(0, timeLeftRef.current - 1);
        setTimeLeft(timeLeftRef.current);
        if (timeLeftRef.current <= 0) { finishGame(); return; }
      }

      const elapsed = elapsedSecFromRefs(timeLeftRef.current, secondsTimerRef.current);
      const stageIdx = stageIndexFromElapsed(elapsed);
      const inBoss = elapsed >= BALANCE.bossAppearElapsedSec;
      stageRef.current = stageIdx;

      if (stageIdx !== lastSegmentUiRef.current && !inBoss) {
        lastSegmentUiRef.current = stageIdx;
        setSegmentIndex(stageIdx + 1);
        setPhaseLabel(SEGMENT_NAMES[stageIdx] ?? SEGMENT_NAMES[0]);
      }

      const overallProgress = Math.min(1, elapsed / TOTAL_GAME_SEC);
      setProgress((prev) => Math.abs(prev - overallProgress) > 0.008 ? overallProgress : prev);

      const targetX = laneToX(playerLaneRef.current);
      playerXRef.current += (targetX - playerXRef.current) * LANE_LERP * frame;
      const playerScreen = worldToScreen(playerXRef.current, 0, w, h);
      const px = playerScreen?.x ?? w * 0.5;

      scrollRef.current += SCROLL_SPEED * frame;
      hitCooldownRef.current = Math.max(0, hitCooldownRef.current - delta);

      if (!bossSpawnedRef.current && elapsed >= BALANCE.bossAppearElapsedSec) {
        beginBossFight();
      }

      if (subPhaseRef.current === 'boss' && bossHpRef.current > 0) {
        if (bossIntroRef.current <= 0) {
          bossAnchorZRef.current -= BOSS_APPROACH_SPEED * frame;
        }
        updateBossSidestep(delta);
      }

      const spawnCfg = spawnIntervals(elapsed);
      if (spawnCfg && subPhaseRef.current === 'run') {
        enemySpawnTimerRef.current -= delta;
        gateSpawnTimerRef.current -= delta;
        if (enemySpawnTimerRef.current <= 0) {
          enemiesRef.current.push(spawnEnemyAt(cam + VIEW_DEPTH + 40, nextId));
          enemySpawnTimerRef.current = spawnCfg.enemyMs;
        }
        if (gateSpawnTimerRef.current <= 0) {
          mathGatesRef.current.push(spawnGateAt(cam + VIEW_DEPTH + 60, stageIdx, feathersRef.current, nextId));
          gateSpawnTimerRef.current = spawnCfg.gateMs;
        }
      }

      const combatTarget = findCombatTarget();
      const ready = combatTarget !== null;
      if (ready !== hitReadyRef.current) {
        hitReadyRef.current = ready;
        setHitReady(ready);
      }

      resolveProjectileHits(w, h, frame);

      const warningLanes = new Set<LaneIndex>();
      if (subPhaseRef.current === 'run') {
        enemiesRef.current.forEach((e) => {
          if (e.hp <= 0) return;
          const dist = e.z - cam;
          e.state = enemyStateFromDist(dist);
          if (e.state === 'warning' || e.state === 'attacking') warningLanes.add(e.lane);
          if (dist <= HIT_DEPTH) {
            if (e.lane === playerLaneRef.current || Math.abs(playerXRef.current - laneToX(e.lane)) < 14) {
              const loss = Math.min(feathersRef.current, BALANCE.collisionLoss);
              feathersRef.current = Math.max(0, feathersRef.current - loss);
              setFeathers(feathersRef.current);
              e.hp = 0;
              resetCombo();
              triggerImpact('fail');
              addParticles(px, playerY, '#ef4444', 28);
              addFloatText(`-${loss}`, px, playerY - 28, '#ef4444');
              showToast('撞到防守者');
              if (feathersRef.current <= 0) finishGame();
            } else if (dist < -40) e.hp = 0;
            return;
          }
        });
        enemiesRef.current = enemiesRef.current.filter((e) => e.hp > 0);

        mathGatesRef.current.forEach((gate) => {
          if (gate.resolved) {
            if (gate.fade != null && gate.fade > 0) gate.fade = Math.max(0, gate.fade - delta * 0.0045);
            return;
          }
          const dist = gate.z - cam;
          if (dist <= GATE_PASS_DEPTH) {
            gate.resolved = true;
            gate.fade = 1;
            const laneIdx = xToNearestLane(playerXRef.current);
            const op = gate.ops[laneIdx];
            feathersRef.current = applyGate(feathersRef.current, op);
            setFeathers(feathersRef.current);
            const good = isGoodOp(op);
            const bad = isBadOp(op);
            if (good) incrementCombo();
            else if (bad) resetCombo();
            addFloatText(good ? '通過!' : bad ? '撞網!' : op.label, px, playerY - 32, bad ? '#f87171' : '#7dd3fc');
            addFloatText(op.label, px, playerY - 50, bad ? '#fca5a5' : '#fde68a');
            addParticles(px, playerY, bad ? '#ef4444' : '#38bdf8', bad ? 24 : 14);
            if (bad) { triggerImpact('fail'); showToast(`選錯門 ${op.label}`); }
            else if (good) triggerImpact('soft');
          }
        });
        mathGatesRef.current = mathGatesRef.current.filter((g) => !g.resolved || (g.fade != null && g.fade > 0.02));
      }

      {
        const bossDist = bossAnchorZRef.current - cam;
        const bScreen = worldToScreen(laneToX(bossLaneRef.current), bossDist, w, h);
        if (bScreen && bossDist > -60 && bossDist < VIEW_DEPTH + 120 && bossHpRef.current > 0
          && subPhaseRef.current !== 'ended') {
          setBossScreen({ x: Math.max(36, Math.min(w - 36, bScreen.x)), y: Math.max(36, Math.min(h - 30, bScreen.y)), scale: bScreen.scale, visible: true });
        } else {
          setBossScreen((s) => (s.visible ? { ...s, visible: false } : s));
        }
      }

      if (shakeRef.current > 0) shakeRef.current -= delta * 0.08;
      magnetFeathersRef.current.forEach((mf) => {
        mf.progress += delta * 0.0038;
        const t = Math.min(1, mf.progress);
        const easeT = Math.pow(t, 2);
        mf.x = mf.startX + (px - mf.startX) * easeT + Math.sin(t * Math.PI) * 32;
        mf.y = mf.startY + (playerY - mf.startY) * easeT;
        if (t >= 1) addParticles(px, playerY, '#38bdf8', 4);
      });
      magnetFeathersRef.current = magnetFeathersRef.current.filter((mf) => mf.progress < 1);
      particlesRef.current = particlesRef.current
        .map((p) => ({ ...p, x: p.x + p.vx, y: p.y + p.vy, vy: p.vy + 0.04, life: p.life - delta * 0.0022 }))
        .filter((p) => p.life > 0);
      if (particlesRef.current.length > MAX_PARTICLES) particlesRef.current = particlesRef.current.slice(-MAX_PARTICLES);
      floatTextsRef.current = floatTextsRef.current
        .map((t) => ({ ...t, y: t.y - delta * 0.045, life: t.life - delta * 0.002 }))
        .filter((t) => t.life > 0);

      const shakeX = shakeRef.current > 0 ? (Math.random() - 0.5) * shakeRef.current : 0;
      const shakeY = shakeRef.current > 0 ? (Math.random() - 0.5) * shakeRef.current * 0.5 : 0;
      ctx.clearRect(0, 0, w, h);
      const theme = COURT_THEMES[Math.min(COURT_THEMES.length - 1, stageRef.current)] ?? COURT_THEMES[0];

      const skyGrad = ctx.createLinearGradient(0, 0, 0, horizonY);
      skyGrad.addColorStop(0, theme.sky[0]);
      skyGrad.addColorStop(0.7, theme.sky[1]);
      skyGrad.addColorStop(1, theme.sky[2]);
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, w, horizonY);
      drawParallax(ctx, w, horizonY, scrollRef.current + (subPhaseRef.current === 'boss' ? delta * 0.08 : 0), theme);

      ctx.fillStyle = theme.haze;
      ctx.beginPath();
      ctx.ellipse(w * 0.5, horizonY, w * 0.35, 14, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = theme.accent;
      ctx.globalAlpha = 0.45;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, horizonY);
      ctx.lineTo(w, horizonY);
      ctx.stroke();
      ctx.globalAlpha = 1;

      const farL = w * (0.5 - ROAD_HALF_FAR);
      const farR = w * (0.5 + ROAD_HALF_FAR);
      const nearL = w * (0.5 - ROAD_HALF_NEAR);
      const nearR = w * (0.5 + ROAD_HALF_NEAR);
      const roadGrad = ctx.createLinearGradient(0, horizonY, 0, h);
      roadGrad.addColorStop(0, theme.road[0]);
      roadGrad.addColorStop(1, theme.road[1]);
      ctx.fillStyle = roadGrad;
      ctx.beginPath();
      ctx.moveTo(farL, horizonY);
      ctx.lineTo(farR, horizonY);
      ctx.lineTo(nearR, h);
      ctx.lineTo(nearL, h);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = theme.edge;
      ctx.lineWidth = 3;
      ctx.shadowColor = theme.edge;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.moveTo(farL, horizonY);
      ctx.lineTo(nearL, h);
      ctx.moveTo(farR, horizonY);
      ctx.lineTo(nearR, h);
      ctx.stroke();
      ctx.shadowBlur = 0;
      drawCourtMarkings(ctx, w, h, horizonY, scrollRef.current);

      warningLanes.forEach((ln) => drawLaneGlow(ctx, ln, w, h, horizonY, theme.accent, 0.22));

      const selectedLane = playerLaneRef.current;
      LANE_X.forEach((lx, i) => {
        if (i !== selectedLane) return;
        const pos = worldToScreen(lx, 30, w, h);
        if (!pos) return;
        ctx.save();
        ctx.globalAlpha = 0.1;
        ctx.fillStyle = theme.accent;
        const hw = roadHalfWidthAt(pos.progress, w) / 3.5;
        ctx.fillRect(pos.x - hw, pos.y - 20, hw * 2, h - pos.y + 20);
        ctx.restore();
      });

      type DrawItem = { kind: 'gate' | 'enemy' | 'proj'; dist: number; gate?: MathGate; enemy?: Enemy; proj?: Projectile };
      const drawQueue: DrawItem[] = [];
      if (subPhaseRef.current === 'run') {
        mathGatesRef.current.forEach((gate) => {
          const dist = gate.z - cam;
          if (gate.resolved && (gate.fade == null || gate.fade <= 0.02)) return;
          if (dist > -60 && dist < VIEW_DEPTH + 40) drawQueue.push({ kind: 'gate', dist, gate });
        });
      }
      if (subPhaseRef.current === 'run' || subPhaseRef.current === 'boss') {
        enemiesRef.current.forEach((enemy) => {
          if (enemy.hp <= 0) return;
          const dist = enemy.z - cam;
          if (dist > -20 && dist < VIEW_DEPTH + 40) drawQueue.push({ kind: 'enemy', dist, enemy });
        });
        projectilesRef.current.forEach((proj) => {
          if (proj.dead) return;
          const dist = proj.z - cam;
          if (dist > 0 && dist < VIEW_DEPTH) drawQueue.push({ kind: 'proj', dist, proj });
        });
      }
      const kindOrder = { proj: 0, enemy: 1, gate: 2 } as const;
      drawQueue.sort((a, b) => Math.abs(a.dist - b.dist) < 12 ? kindOrder[a.kind] - kindOrder[b.kind] : b.dist - a.dist);

      drawQueue.forEach((item) => {
        if (item.kind === 'gate' && item.gate) {
          const { gate, dist } = item;
          const fadeMul = gate.resolved ? Math.max(0, gate.fade ?? 0) : 1;
          gate.ops.forEach((op, laneIdx) => {
            const screen = worldToScreen(LANE_X[laneIdx], dist, w, h);
            if (!screen) return;
            const bad = isBadOp(op);
            const good = isGoodOp(op);
            const selected = !gate.resolved && laneIdx === selectedLane && dist < 130;
            ctx.save();
            ctx.globalAlpha = Math.min(0.95, 0.48 + screen.progress * 0.5) * fadeMul;
            const rw = 88 * screen.scale;
            const rh = 72 * screen.scale;
            const rx = screen.x - rw / 2 + shakeX;
            const ry = screen.y - rh * 0.55;
            ctx.fillStyle = bad ? 'rgba(185,28,28,0.55)' : good ? 'rgba(180,83,9,0.5)' : op.isRecovery ? 'rgba(16,185,129,0.5)' : 'rgba(30,64,175,0.5)';
            ctx.strokeStyle = selected ? '#fff' : bad ? '#fca5a5' : good ? '#fde68a' : '#93c5fd';
            ctx.lineWidth = Math.max(2, (selected ? 4 : 3) * screen.scale);
            if (selected) { ctx.shadowColor = '#fff'; ctx.shadowBlur = 12 * screen.scale; }
            ctx.beginPath();
            if (ctx.roundRect) ctx.roundRect(rx, ry, rw, rh, 8 * screen.scale);
            else ctx.rect(rx, ry, rw, rh);
            ctx.fill();
            ctx.stroke();
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#fff';
            ctx.font = `bold ${Math.max(12, Math.floor(22 * screen.scale))}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(op.label, screen.x + shakeX, screen.y);
            if (selected) {
              ctx.font = `bold ${Math.max(8, Math.floor(9 * screen.scale))}px sans-serif`;
              ctx.fillStyle = '#cbd5e1';
              ctx.fillText('▶ 此道', screen.x + shakeX, ry + 10 * screen.scale);
            }
            ctx.restore();
          });
        } else if (item.kind === 'enemy' && item.enemy) {
          const { enemy, dist } = item;
          const screen = worldToScreen(laneToX(enemy.lane), dist, w, h);
          if (!screen) return;
          ctx.save();
          ctx.globalAlpha = Math.min(1, 0.35 + screen.progress * 0.9);
          if (enemy.hitFlash && enemy.hitFlash > 0) {
            ctx.translate(screen.x, screen.y);
            ctx.scale(1.12, 1.12);
            ctx.translate(-screen.x, -screen.y);
            enemy.hitFlash -= 1;
          }
          const sx = screen.x + shakeX;
          const sy = screen.y;
          const sc = screen.scale;
          ctx.beginPath();
          ctx.ellipse(sx, sy + 22 * sc, 28 * sc, 8 * sc, 0, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(15,23,42,0.35)';
          ctx.fill();
          const bodyW = 36 * sc;
          const bodyH = 40 * sc;
          const grad = ctx.createLinearGradient(sx, sy - bodyH, sx, sy + bodyH * 0.4);
          grad.addColorStop(0, '#fb7185');
          grad.addColorStop(1, '#9f1239');
          ctx.fillStyle = grad;
          ctx.beginPath();
          if (ctx.roundRect) ctx.roundRect(sx - bodyW / 2, sy - bodyH * 0.35, bodyW, bodyH, 12 * sc);
          else ctx.rect(sx - bodyW / 2, sy - bodyH * 0.35, bodyW, bodyH);
          ctx.fill();
          const headY = sy - bodyH * 0.55;
          ctx.beginPath();
          ctx.arc(sx, headY, 16 * sc, 0, Math.PI * 2);
          ctx.fillStyle = '#1e293b';
          ctx.fill();
          ctx.font = `${Math.max(14, Math.floor(22 * sc))}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillText(enemy.emoji, sx, headY);
          const barW = Math.max(28, 44 * sc);
          const barH = Math.max(4, 5 * sc);
          const ratio = Math.max(0, enemy.hp / Math.max(1, enemy.maxHp));
          const barX = Math.max(4, Math.min(w - barW - 4, sx - barW / 2));
          const barY = Math.max(4, headY - 20 * sc);
          ctx.fillStyle = 'rgba(15,23,42,0.9)';
          ctx.fillRect(barX, barY, barW, barH);
          ctx.fillStyle = ratio > 0.4 ? '#4ade80' : '#f87171';
          ctx.fillRect(barX, barY, barW * ratio, barH);
          ctx.restore();
        } else if (item.proj) {
          const screen = worldToScreen(item.proj.xPct, item.dist, w, h);
          if (!screen) return;
          drawShuttlecock(ctx, screen.x + shakeX, screen.y + shakeY, screen.scale, item.proj.grade, Math.min(1, 0.22 + screen.progress * 0.95));
        }
      });

      const playerRenderX = px + shakeX;
      const playerRenderY = playerY + shakeY;

      if (hitReadyRef.current) {
        ctx.save();
        ctx.font = 'bold 13px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#fde047';
        ctx.strokeStyle = 'rgba(15,23,42,0.85)';
        ctx.lineWidth = 3;
        ctx.strokeText('READY', playerRenderX, playerRenderY - 52);
        ctx.fillText('READY', playerRenderX, playerRenderY - 52);
        ctx.restore();
      }
      const squadCount = Math.min(6, Math.floor(feathersRef.current / 12) + 1);
      for (let i = 0; i < squadCount; i++) {
        const col = (i % 3) - 1;
        const row = Math.floor(i / 3) + 1;
        ctx.font = '15px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🪶', playerRenderX + col * 16 + Math.sin(ts / 150 + i) * 2, playerRenderY + row * 18);
      }

      const avatar = avatarImgRef.current;
      ctx.save();
      ctx.translate(playerRenderX, playerRenderY);
      if (avatar && avatar.complete) {
        const avSize = 28;
        ctx.save();
        ctx.beginPath();
        ctx.arc(0, -8, avSize / 2, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(avatar, -avSize / 2, -8 - avSize / 2, avSize, avSize);
        ctx.restore();
        ctx.strokeStyle = feverActive ? '#fde047' : '#38bdf8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, -8, avSize / 2, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.font = '34px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🏸', 0, 10);
      ctx.font = 'bold 17px sans-serif';
      ctx.fillStyle = feverActive ? '#fde047' : '#38bdf8';
      ctx.strokeStyle = 'rgba(15,23,42,0.85)';
      ctx.lineWidth = 3;
      ctx.strokeText(String(feathersRef.current), 0, -34);
      ctx.fillText(String(feathersRef.current), 0, -34);
      ctx.restore();

      particlesRef.current.forEach((p) => {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });
      magnetFeathersRef.current.forEach((mf) => {
        ctx.save();
        ctx.globalAlpha = Math.min(1, mf.progress * 3);
        ctx.font = '16px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🪶', mf.x, mf.y);
        ctx.restore();
      });
      floatTextsRef.current.forEach((t) => {
        ctx.globalAlpha = t.life;
        ctx.fillStyle = t.color;
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(t.text, t.x, t.y);
      });
      ctx.globalAlpha = 1;

      if (vignetteRef.current > 0.02) {
        const g = ctx.createRadialGradient(w * 0.5, h * 0.5, h * 0.2, w * 0.5, h * 0.5, h * 0.85);
        g.addColorStop(0, 'rgba(0,0,0,0)');
        g.addColorStop(1, `rgba(127,29,29,${Math.min(0.55, vignetteRef.current)})`);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      }
      if (flashWhiteRef.current > 0.02) {
        ctx.fillStyle = `rgba(255,255,255,${Math.min(0.45, flashWhiteRef.current)})`;
        ctx.fillRect(0, 0, w, h);
      }

      requestRef.current = requestAnimationFrame(gameStep);
    };

    requestRef.current = requestAnimationFrame(gameStep);
    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(requestRef.current);
      el?.removeEventListener('touchmove', blockTouch);
    };
  }, [onGameEnd]);


  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') shiftLane('left');
      else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') shiftLane('right');
      else if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); tryManualHit(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const currentBossConfig = BOSSES[0];
  const bossVisible = bossScreen.visible && !!bossPet && bossHp > 0;
  const elapsed = progress * TOTAL_GAME_SEC;
  const uiStageIdx = stageIndexFromElapsed(elapsed);
  const inBoss = elapsed >= BALANCE.bossAppearElapsedSec || subPhase === 'boss';
  const phaseLocalProgress = stageLocalProgress(elapsed, uiStageIdx, inBoss);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full min-h-[500px] bg-slate-950 touch-none select-none overscroll-none"
      style={{ touchAction: 'none' }}
      onPointerDown={(e) => { swipeStartRef.current = { x: e.clientX, y: e.clientY }; }}
      onPointerUp={(e) => {
        const start = swipeStartRef.current;
        swipeStartRef.current = null;
        if (!start) return;
        const dx = e.clientX - start.x;
        const dy = e.clientY - start.y;
        if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
          shiftLane(dx > 0 ? 'right' : 'left');
        } else if (Math.hypot(dx, dy) < 28) {
          // 短按 HIT；中等位移忽略，避免與換道誤觸
          tryManualHit();
        }
      }}
    >
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />

      {bossVisible && bossPet && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: subPhase === 'boss' ? 1 : 0.75, scale: Math.max(0.35, Math.min(1.05, bossScreen.scale * 1.05)) }}
          transition={{ duration: 0.15 }}
          className="absolute pointer-events-none flex flex-col items-center z-10 select-none max-w-[42%]"
          style={{
            left: `${bossScreen.x}px`,
            top: `${bossScreen.y}px`,
            transform: 'translate(-50%, -42%)',
            width: `${Math.max(104, Math.min(168, 150 * Math.max(0.55, bossScreen.scale)))}px`,
          }}
        >
          <div className="bg-slate-950/90 border border-slate-700/60 rounded-full px-2 py-0.5 mb-1 text-[9px] sm:text-[10px] font-black text-white shadow-xl tracking-wider flex items-center gap-1 backdrop-blur-sm z-[1] max-w-full">
            <span className="w-1.5 h-1.5 rounded-full animate-ping shrink-0" style={{ backgroundColor: currentBossConfig.color }} />
            <span className="truncate">
              {subPhase === 'boss' ? currentBossConfig.title : `前方 · ${currentBossConfig.title}`}
            </span>
          </div>
          <div className="mb-1 filter drop-shadow-[0_0_12px_rgba(255,255,255,0.25)] flex items-center justify-center z-[1]"
            style={{ width: `${Math.max(48, 96 * bossScreen.scale)}px`, height: `${Math.max(48, 96 * bossScreen.scale)}px` }}>
            <PetRenderer petId={bossPet.id} tier={bossPet.tier} className="w-full h-full object-contain" />
          </div>
          {subPhase === 'boss' && (
            <>
              <div className="w-full max-w-full bg-slate-950/90 border border-slate-800 rounded-full p-0.5 shadow-lg z-[1]">
                <div className="h-2 rounded-full transition-all duration-200"
                  style={{
                    width: `${Math.max(0, Math.min(100, (bossHp / currentBossConfig.hp) * 100))}%`,
                    backgroundColor: currentBossConfig.color,
                    boxShadow: `0 0 8px ${currentBossConfig.color}`,
                  }}
                />
              </div>
              <span className="text-[9px] font-black text-slate-400 mt-0.5 tabular-nums z-[1]">
                {bossHp}/{currentBossConfig.hp}
              </span>
            </>
          )}
        </motion.div>
      )}

      <div className="absolute top-0 inset-x-0 z-20 p-2 sm:p-3 flex justify-between items-start pointer-events-none gap-2">
        <div className="bg-slate-900/85 border border-slate-700/60 rounded-xl px-2.5 py-1 sm:px-3 sm:py-1.5 backdrop-blur-sm">
          <div className="text-[8px] sm:text-[9px] text-slate-400 font-bold">羽毛</div>
          <div className="text-base sm:text-lg font-black text-sky-400 tabular-nums leading-tight">{feathers}</div>
        </div>
        <div className="flex flex-col items-center gap-1">
          <div className="bg-slate-900/85 border border-amber-500/40 rounded-xl px-3 py-1 backdrop-blur-sm min-w-[72px] text-center">
            <div className="text-[8px] text-amber-400 font-bold">連擊</div>
            <div className="text-lg font-black text-amber-300 tabular-nums leading-tight">×{combo}</div>
          </div>
          {fever && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-gradient-to-r from-amber-500 to-rose-500 text-white text-[10px] font-black px-3 py-0.5 rounded-full shadow-lg animate-pulse"
            >
              FEVER!
            </motion.div>
          )}
        </div>
        <div className="bg-slate-900/85 border border-slate-700/60 rounded-xl px-2.5 py-1 sm:px-3 sm:py-1.5 text-center backdrop-blur-sm min-w-[100px]">
          <div className="text-[8px] sm:text-[9px] text-emerald-400 font-bold truncate max-w-[140px]">{phaseLabel}</div>
          <div className="text-sm font-black text-white tabular-nums leading-tight">{timeLeft}s</div>
        </div>
      </div>

      <div className="absolute top-[52px] inset-x-3 z-20 pointer-events-none">
        <div className="flex items-stretch gap-1 mb-1">
          {SEGMENT_NAMES.map((name, i) => {
            const stageNum = i + 1;
            const completed = inBoss ? i < 3 : segmentIndex > stageNum;
            const active = inBoss ? i === 3 : segmentIndex === stageNum;
            const inBossSeg = active && inBoss;
            const fill = completed ? 100 : active ? Math.round(phaseLocalProgress * 100) : 0;
            return (
              <div key={name} className="flex-1 min-w-0 flex flex-col gap-0.5">
                <div className={cn(
                  'relative h-2 rounded-full overflow-hidden border',
                  completed ? 'border-emerald-400/50 bg-emerald-950/40'
                    : active ? inBossSeg ? 'border-rose-400/60 bg-rose-950/40' : 'border-sky-400/50 bg-sky-950/40'
                    : 'border-slate-700/60 bg-slate-900/60',
                )}>
                  <div className={cn(
                    'absolute inset-y-0 left-0 rounded-full transition-[width] duration-200',
                    completed ? 'bg-emerald-400' : inBossSeg ? 'bg-gradient-to-r from-rose-500 to-amber-400' : 'bg-gradient-to-r from-sky-500 to-emerald-400',
                  )} style={{ width: `${fill}%` }} />
                </div>
                <div className="flex items-center justify-between gap-0.5 px-0.5">
                  <span className={cn('text-[7px] font-black truncate', completed ? 'text-emerald-400' : active ? 'text-white' : 'text-slate-600')}>
                    {stageNum}.{COURT_THEMES[i]?.label ?? name}
                  </span>
                  {inBossSeg && <span className="text-[7px] font-black text-rose-300 shrink-0 animate-pulse">Boss</span>}
                  {completed && <span className="text-[7px] font-black text-emerald-400 shrink-0">✓</span>}
                </div>
              </div>
            );
          })}
        </div>
        <div className="h-1 bg-slate-800/80 rounded-full overflow-hidden border border-slate-700/50">
          <div className="h-full rounded-full transition-[width] duration-150 bg-gradient-to-r from-emerald-500 via-sky-400 to-violet-400"
            style={{ width: `${Math.round(Math.min(100, progress * 100))}%` }} />
        </div>
      </div>

      {toast && (
        <div className="absolute top-[88px] inset-x-0 z-30 flex justify-center pointer-events-none">
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            className="bg-red-950/90 border border-red-500/50 text-red-100 text-sm font-black px-4 py-2 rounded-xl shadow-xl backdrop-blur-sm">
            {toast}
          </motion.div>
        </div>
      )}

      {bossBanner && (
        <div className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none">
          <motion.div initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }}
            className="px-6 py-3 rounded-2xl border-2 text-center shadow-2xl backdrop-blur-md"
            style={{ borderColor: currentBossConfig.color, background: 'rgba(2,6,23,0.82)' }}>
            <div className="text-[10px] font-bold text-slate-400 tracking-widest mb-1">對決開始</div>
            <div className="text-lg sm:text-xl font-black" style={{ color: currentBossConfig.color }}>{bossBanner}</div>
          </motion.div>
        </div>
      )}

      {showTip && (
        <div className="absolute top-[100px] inset-x-0 z-10 flex justify-center pointer-events-none">
          <span className="text-[9px] font-bold text-slate-400 bg-slate-950/70 px-2.5 py-1 rounded-full border border-slate-700/50">
            滑動換道 · 點擊或空白鍵 HIT
          </span>
        </div>
      )}

      <div className="absolute bottom-0 inset-x-0 z-30 flex justify-between items-end pointer-events-none"
        style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
        <button type="button" aria-label="向左切換賽道"
          onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); shiftLane('left'); }}
          className={cn(
            'pointer-events-auto ml-3 mb-2 w-[72px] h-[72px] sm:w-16 sm:h-16 rounded-full border-2 flex items-center justify-center active:scale-95 transition-all shadow-2xl',
            lane === 0 ? 'bg-sky-500/40 border-sky-300 text-sky-100 ring-2 ring-sky-400/60' : 'bg-slate-900/85 border-slate-600 text-white',
          )}>
          <ChevronLeft className="w-10 h-10 sm:w-8 sm:h-8" />
        </button>
        <button type="button" aria-label="手動 HIT"
          onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); tryManualHit(); }}
          className={cn(
            'pointer-events-auto mb-2 w-[80px] h-[80px] sm:w-[72px] sm:h-[72px] rounded-full border-2 flex flex-col items-center justify-center active:scale-95 transition-all shadow-2xl',
            hitReady
              ? 'bg-amber-500/50 border-amber-300 text-amber-100 ring-2 ring-amber-400/70 animate-pulse'
              : 'bg-slate-900/90 border-slate-500 text-white',
          )}>
          <span className="text-2xl sm:text-xl leading-none">🏸</span>
          <span className="text-[10px] font-black mt-0.5">HIT</span>
        </button>
        <button type="button" aria-label="向右切換賽道"
          onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); shiftLane('right'); }}
          className={cn(
            'pointer-events-auto mr-3 mb-2 w-[72px] h-[72px] sm:w-16 sm:h-16 rounded-full border-2 flex items-center justify-center active:scale-95 transition-all shadow-2xl',
            lane === 2 ? 'bg-sky-500/40 border-sky-300 text-sky-100 ring-2 ring-sky-400/60' : 'bg-slate-900/85 border-slate-600 text-white',
          )}>
          <ChevronRight className="w-10 h-10 sm:w-8 sm:h-8" />
        </button>
      </div>
    </div>
  );
};
