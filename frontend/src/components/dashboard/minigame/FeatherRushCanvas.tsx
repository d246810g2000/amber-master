import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import ChevronLeft from 'lucide-react/dist/esm/icons/chevron-left';
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right';
import { cn, getAvatarUrl } from '../../../lib/utils';
import {
  BALANCE,
  BOSSES,
  PHASE_SCROLL_LENGTHS,
} from './featherRushTypes';
import type { BossBehavior, GateOperation } from './featherRushTypes';
import {
  applyGate,
  computeFinalScore,
  formatGateLabel,
  generateGatePair,
} from './featherRushEngine';
import { PETS_CATALOG, PetCatalogEntry } from '../../../lib/petCatalog';
import { PetRenderer } from '../../PetRenderer';

interface FeatherRushCanvasProps {
  playerName: string;
  playerAvatar: string;
  onGameEnd: (score: number, maxCombo: number, remainingFeathers: number) => void;
}

type SubPhase = 'run' | 'boss' | 'sprint' | 'ended';
type MoveDir = 'left' | 'right' | null;

interface MathGate {
  id: number;
  z: number;
  left: GateOperation;
  right: GateOperation;
  resolved: boolean;
  isMystery?: boolean;
  revealed?: boolean;
  /** 通過後淡出，避免高大門板在腳邊瞬間蒸發 */
  fade?: number;
}

interface Enemy {
  id: number;
  xPct: number;
  z: number;
  maxHp: number;
  hp: number;
  reward: number;
  emoji: string;
  isHazard?: boolean;
  hitFlash?: number;
}

interface Projectile {
  id: number;
  xPct: number;
  offsetPct: number;
  z: number;
  damage: number;
  powerShot?: boolean;
  dead?: boolean;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  life: number;
  size: number;
}

interface FloatingText {
  id: number;
  text: string;
  x: number;
  y: number;
  color: string;
  life: number;
}

interface MagnetFeather {
  id: number;
  startX: number;
  startY: number;
  x: number;
  y: number;
  progress: number;
  value: number;
}

interface ScreenPos {
  x: number;
  y: number;
  scale: number;
  progress: number;
  dist: number;
}

const PLAYER_Y_RATIO = 0.80;
const HORIZON_Y_RATIO = 0.22;
const VIEW_DEPTH = 420;
const HIT_DEPTH = 8;
/** 數字門必須跑過門線後才結算（負值＝已通過腳下），避免「門還在眼前卻突然沒了」 */
const GATE_PASS_DEPTH = -18;
/** 羽球射程：可打到走道一半深度 */
const COMBAT_RANGE = Math.round(VIEW_DEPTH * 0.5);
const SCROLL_SPEED = 3.0;
const BULLET_SPEED = 3.0;
const HAZARD_SPEED = 4.0;
const MOVE_SPEED = 0.9;
const PLAYER_X_MIN = 8;
const PLAYER_X_MAX = 92;
const HIT_X_PCT = 13;
const RUN_PHASE_SEC = 9.5;
const TOTAL_GAME_SEC = 60;
/** Boss 從走道盡頭生成，持續朝玩家走近 */
const BOSS_SPAWN_DIST = Math.round(VIEW_DEPTH * 0.92);
const BOSS_APPROACH_SPEED = 2.35;
const BOSS_CONTACT_X = 26;
const BOSS_PASS_LOSS_PCT = 0.18;
const BOSS_HIT_Z = 48;
const BOSS_HIT_X = 28;
const ROAD_HALF_FAR = 0.20;
const ROAD_HALF_NEAR = 0.46;

const GATE_BREATH_GAP = 220;
const ENEMY_BREATH_GAP = 260;
const MAX_PROJECTILES = 10;
const HIT_STOP_MS = 90;
const BOSS_INTRO_MS = 750;
/** 防守者造型：人物感 emoji，避免與數字門混淆 */
const BADMINTON_ENEMIES = ['😤', '🧤', '🏸', '💪', '😈'] as const;
const SEGMENT_NAMES = ['練習場衝刺', '網前纏鬥', '後場對轟', '決勝殺球'] as const;

interface CourtTheme {
  label: string;
  sky: [string, string, string];
  road: [string, string];
  edge: string;
  accent: string;
  haze: string;
}

const COURT_THEMES: CourtTheme[] = [
  {
    label: '練習場',
    sky: ['#020617', '#0f172a', '#1e3a2f'],
    road: ['#14532d', '#052e16'],
    edge: '#86efac',
    accent: '#38bdf8',
    haze: 'rgba(52, 211, 153, 0.12)',
  },
  {
    label: '網前區',
    sky: ['#0c0a1a', '#1e1b4b', '#312e81'],
    road: ['#1e3a5f', '#0f172a'],
    edge: '#c4b5fd',
    accent: '#a78bfa',
    haze: 'rgba(167, 139, 250, 0.14)',
  },
  {
    label: '後場',
    sky: ['#1c1917', '#292524', '#78350f'],
    road: ['#3f2e1a', '#1c1410'],
    edge: '#fcd34d',
    accent: '#f59e0b',
    haze: 'rgba(251, 191, 36, 0.12)',
  },
  {
    label: '決勝場',
    sky: ['#1a0a0a', '#3f0a0a', '#7f1d1d'],
    road: ['#3f1515', '#1a0808'],
    edge: '#fda4af',
    accent: '#f43f5e',
    haze: 'rgba(244, 63, 94, 0.14)',
  },
];

function isGoodOp(op: GateOperation): boolean {
  return op.type === 'add' || op.type === 'mul' || op.type === 'pct_add';
}

function isBadOp(op: GateOperation): boolean {
  return op.type === 'sub' || op.type === 'div' || op.type === 'pct_sub';
}

function worldToScreen(
  xPct: number,
  dist: number,
  w: number,
  h: number,
): ScreenPos | null {
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

/** Road half-width at a given screen progress (0 = horizon, 1 = feet). */
function roadHalfWidthAt(progress: number, w: number): number {
  return w * (ROAD_HALF_FAR + (ROAD_HALF_NEAR - ROAD_HALF_FAR) * progress);
}

function spawnEnemiesAt(
  z: number,
  phase: number,
  rewardFactor: number,
  nextId: () => number,
  baseEmoji: string,
  altEmoji: string,
): { enemies: Enemy[]; span: number } {
  const enemies: Enemy[] = [];
  const patternRand = Math.random();

  if (patternRand < 0.45) {
    const open = Math.floor(Math.random() * 3);
    const slots = [
      { xPct: 22, hp: Math.max(10, 10 + phase * 8 + Math.floor(Math.random() * 6)) },
      { xPct: 50, hp: Math.max(12, 12 + phase * 9 + Math.floor(Math.random() * 6)) },
      { xPct: 78, hp: Math.max(14, 14 + phase * 10 + Math.floor(Math.random() * 6)) },
    ];
    slots.forEach((slot, idx) => {
      if (idx === open) return;
      enemies.push({
        id: nextId(),
        xPct: slot.xPct,
        z,
        maxHp: slot.hp,
        hp: slot.hp,
        reward: Math.max(2, Math.floor(slot.hp * rewardFactor * 0.55)),
        emoji: idx === 0 ? '😤' : baseEmoji,
      });
    });
    return { enemies, span: 340 };
  }

  if (patternRand < 0.75) {
    let xPct = 20 + Math.random() * 60;
    for (let k = 0; k < 3; k++) {
      const hp = Math.max(8, 8 + phase * 5 + Math.floor(Math.random() * 4));
      enemies.push({
        id: nextId(),
        xPct,
        z: z + k * 90,
        maxHp: hp,
        hp,
        reward: Math.max(1, Math.floor(hp * rewardFactor * 0.5)),
        emoji: k === 1 ? '🏸' : altEmoji,
      });
      xPct = Math.max(18, Math.min(82, xPct + (Math.random() > 0.5 ? 28 : -28)));
    }
    return { enemies, span: 380 };
  }

  const side = Math.random() > 0.5 ? 28 : 72;
  for (let k = 0; k < 2; k++) {
    const hp = Math.max(12, 12 + phase * 8 + Math.floor(Math.random() * 5));
    enemies.push({
      id: nextId(),
      xPct: side + (k === 0 ? -8 : 8),
      z: z + k * 36,
      maxHp: hp,
      hp,
      reward: Math.max(2, Math.floor(hp * rewardFactor * 0.55)),
      emoji: '💪',
    });
  }
  return { enemies, span: 320 };
}

/**
 * Rhythm: GATE → gap (~220) → ENEMIES → gap (~260) → GATE → …
 * First gate at VIEW_DEPTH + 40.
 */
function spawnTrackEvents(
  phase: number,
  startId: number,
  feathers: number,
): { gates: MathGate[]; enemies: Enemy[] } {
  const gates: MathGate[] = [];
  const enemies: Enemy[] = [];
  const trackLen = Math.min(PHASE_SCROLL_LENGTHS[phase] ?? 1100, 1100);
  const rewardFactor = BALANCE.enemyRewardFactor;

  let z = VIEW_DEPTH + 40;
  const endZ = VIEW_DEPTH + trackLen;
  let counter = startId;
  const nextId = () => {
    counter += 1;
    return counter;
  };

  const baseEmoji = BADMINTON_ENEMIES[Math.min(BADMINTON_ENEMIES.length - 1, phase * 2)];
  const altEmoji = BADMINTON_ENEMIES[Math.min(BADMINTON_ENEMIES.length - 1, phase * 2 + 1)];
  let expectGate = true;

  while (z < endZ - 80) {
    if (expectGate) {
      const pair = generateGatePair(phase, feathers);
      gates.push({
        id: nextId(),
        z,
        left: pair.left,
        right: pair.right,
        resolved: false,
        isMystery: Math.random() < 0.32,
        revealed: false,
      });
      z += GATE_BREATH_GAP;
      expectGate = false;
    } else {
      const pack = spawnEnemiesAt(z, phase, rewardFactor, nextId, baseEmoji, altEmoji);
      enemies.push(...pack.enemies);
      z += pack.span + ENEMY_BREATH_GAP;
      expectGate = true;
    }
  }

  return { gates, enemies };
}

function drawShuttlecock(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  powerShot: boolean,
  alpha = 1,
) {
  const headR = (powerShot ? 8 : 6) * scale;
  const tailLen = (powerShot ? 24 : 18) * scale;

  ctx.save();
  ctx.globalAlpha = alpha;

  // Shuttlecock Motion Trail (energy streak behind projectile)
  const trailGrad = ctx.createLinearGradient(x, y + tailLen, x, y + tailLen * 2.2);
  trailGrad.addColorStop(0, powerShot ? 'rgba(253, 224, 71, 0.55)' : 'rgba(56, 189, 248, 0.45)');
  trailGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = trailGrad;
  ctx.beginPath();
  ctx.moveTo(x - headR * 0.8, y);
  ctx.lineTo(x + headR * 0.8, y);
  ctx.lineTo(x + headR * 1.5, y + tailLen * 2.2);
  ctx.lineTo(x - headR * 1.5, y + tailLen * 2.2);
  ctx.closePath();
  ctx.fill();

  if (powerShot) {
    ctx.shadowColor = '#fde047';
    ctx.shadowBlur = 14 * scale;
  } else {
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 6 * scale;
  }

  ctx.fillStyle = powerShot ? '#fef08a' : '#fbbf24';
  ctx.beginPath();
  ctx.ellipse(x, y - tailLen * 0.35, headR, headR * 0.85, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = powerShot ? '#fff7ed' : '#e2e8f0';
  ctx.lineWidth = Math.max(1, 1.5 * scale);
  ctx.lineCap = 'round';
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.moveTo(x + i * headR * 0.35, y - tailLen * 0.2);
    ctx.lineTo(x + i * headR * 0.95, y + tailLen * 0.55);
    ctx.stroke();
  }

  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = Math.max(1, scale);
  ctx.beginPath();
  ctx.moveTo(x, y - tailLen * 0.35);
  ctx.lineTo(x, y + tailLen * 0.5);
  ctx.stroke();

  ctx.restore();
}

function drawCourtMarkings(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  horizonY: number,
  scroll: number,
) {
  const serviceDepths = [VIEW_DEPTH * 0.38, VIEW_DEPTH * 0.62];

  ctx.save();
  ctx.strokeStyle = 'rgba(226, 232, 240, 0.18)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([10, 14]);

  serviceDepths.forEach((dist) => {
    const t = 1 - dist / VIEW_DEPTH;
    const progress = Math.pow(t, 1.25);
    const y = horizonY + (h * PLAYER_Y_RATIO - horizonY) * progress;
    const half = roadHalfWidthAt(progress, w);
    const dashOffset = -(scroll * 0.6 + dist * 0.08) % 24;
    ctx.lineDashOffset = dashOffset;
    ctx.beginPath();
    ctx.moveTo(w * 0.5 - half * 0.92, y);
    ctx.lineTo(w * 0.5 + half * 0.92, y);
    ctx.stroke();
  });

  ctx.setLineDash([]);
  ctx.restore();
}

function bossActionInterval(behavior: BossBehavior): number {
  switch (behavior) {
    case 'clear_lob': return 1500;
    case 'jump_smash': return 1100;
    default: return 999999;
  }
}

export const FeatherRushCanvas: React.FC<FeatherRushCanvasProps> = ({
  playerName,
  playerAvatar,
  onGameEnd,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  const canvasWidthRef = useRef(360);
  const canvasHeightRef = useRef(500);
  const idCounterRef = useRef(0);
  const avatarImgRef = useRef<HTMLImageElement | null>(null);

  const feathersRef = useRef(BALANCE.initialFeathers);
  const phaseRef = useRef(0);
  const subPhaseRef = useRef<SubPhase>('run');
  const scrollRef = useRef(0);
  const playerXRef = useRef(50);
  const moveDirRef = useRef<MoveDir>(null);
  const playerTiltRef = useRef(0);
  const timeLeftRef = useRef(TOTAL_GAME_SEC);
  const bossHpRef = useRef(0);
  const bossAnchorZRef = useRef(VIEW_DEPTH + 1000);
  const bossXPctRef = useRef(50);
  const mathGatesRef = useRef<MathGate[]>([]);
  const enemiesRef = useRef<Enemy[]>([]);
  const projectilesRef = useRef<Projectile[]>([]);
  const fireCooldownRef = useRef(0);
  const phaseTimerRef = useRef(0);
  const lastBossActionTimeRef = useRef(0);
  const particlesRef = useRef<Particle[]>([]);
  const floatTextsRef = useRef<FloatingText[]>([]);
  const magnetFeathersRef = useRef<MagnetFeather[]>([]);
  const shakeRef = useRef(0);
  const sprintRef = useRef(0);
  const endedRef = useRef(false);
  const secondsTimerRef = useRef(0);
  const advanceBossTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const trackEndZRef = useRef(VIEW_DEPTH + (PHASE_SCROLL_LENGTHS[0] ?? 1100));
  const runClosingRef = useRef(false);
  const progressRef = useRef(0);
  const toastUntilRef = useRef(0);
  const tauntShownRef = useRef(false);
  const hitStopRef = useRef(0);
  const bossIntroRef = useRef(0);
  const vignetteRef = useRef(0);
  const tipUntilRef = useRef(performance.now() + 5500);
  const flashWhiteRef = useRef(0);

  const spawnMagnetFeather = (startX: number, startY: number, val: number) => {
    magnetFeathersRef.current.push({
      id: nextId(),
      startX,
      startY,
      x: startX,
      y: startY,
      progress: 0,
      value: val,
    });
  };

  const [feathers, setFeathers] = useState(BALANCE.initialFeathers);
  const [timeLeft, setTimeLeft] = useState(TOTAL_GAME_SEC);
  const [phaseLabel, setPhaseLabel] = useState<string>(SEGMENT_NAMES[0]);
  const [segmentIndex, setSegmentIndex] = useState(1);
  const [moveDir, setMoveDir] = useState<MoveDir>(null);
  const [subPhase, setSubPhase] = useState<SubPhase>('run');
  const [bossHp, setBossHp] = useState(0);
  const [progress, setProgress] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [bossScreen, setBossScreen] = useState({ x: 0, y: 0, scale: 0.2, visible: false });
  const [bossPet, setBossPet] = useState<PetCatalogEntry | null>(null);
  const [showTip, setShowTip] = useState(true);
  const [bossBanner, setBossBanner] = useState<string | null>(null);

  const nextId = () => {
    idCounterRef.current += 1;
    return idCounterRef.current;
  };

  const setDirection = (dir: MoveDir) => {
    moveDirRef.current = dir;
    setMoveDir(dir);
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

  const addParticles = (x: number, y: number, color: string, count = 16) => {
    for (let i = 0; i < count; i++) {
      particlesRef.current.push({
        id: nextId(),
        x,
        y,
        vx: (Math.random() - 0.5) * 9,
        vy: (Math.random() - 0.5) * 9 - 1,
        color,
        life: 1,
        size: 2 + Math.random() * 4,
      });
    }
    if (particlesRef.current.length > 80) {
      particlesRef.current = particlesRef.current.slice(-80);
    }
  };

  const addFloatText = (text: string, x: number, y: number, color = '#fbbf24') => {
    const w = canvasWidthRef.current || 400;
    const h = canvasHeightRef.current || 500;
    floatTextsRef.current.push({
      id: nextId(),
      text,
      x: Math.max(24, Math.min(w - 24, x)),
      y: Math.max(28, Math.min(h - 28, y)),
      color,
      life: 1,
    });
    if (floatTextsRef.current.length > 18) {
      floatTextsRef.current = floatTextsRef.current.slice(-18);
    }
  };

  const loadPhaseTrack = (phase: number) => {
    const track = spawnTrackEvents(phase, nextId(), feathersRef.current);
    mathGatesRef.current = track.gates;
    enemiesRef.current = track.enemies;
    const endZ = VIEW_DEPTH + Math.min(PHASE_SCROLL_LENGTHS[phase] ?? 1100, 1100);
    trackEndZRef.current = endZ;
    bossAnchorZRef.current = endZ + 80;
    bossXPctRef.current = 50;
    const boss = BOSSES[phase];
    bossHpRef.current = boss.hp;
    setBossHp(boss.hp);
    const candidates = PETS_CATALOG.filter((p) => p.tier === boss.tier);
    setBossPet(
      candidates.length > 0
        ? candidates[Math.floor(Math.random() * candidates.length)]
        : null,
    );
    scrollRef.current = 0;
    runClosingRef.current = false;
    tauntShownRef.current = false;
    setSegmentIndex(phase + 1);
    setPhaseLabel(SEGMENT_NAMES[phase] ?? `賽道 ${phase + 1}`);
    setBossBanner(null);
  };

  const screenIsClearForBoss = () => {
    const cam = scrollRef.current;
    // 前方任何未通過／未淡完的數字門都擋住轉場，絕不默默清掉
    const gateBlocking = mathGatesRef.current.some((g) => {
      if (g.resolved && (g.fade ?? 0) <= 0) return false;
      const dist = g.z - cam;
      return dist > GATE_PASS_DEPTH;
    });
    if (gateBlocking) return false;
    const enemyBlocking = enemiesRef.current.some((e) => {
      if (e.hp <= 0) return false;
      const dist = e.z - cam;
      return dist > HIT_DEPTH && dist < VIEW_DEPTH + 100;
    });
    return !enemyBlocking;
  };

  const beginBossFight = () => {
    if (subPhaseRef.current === 'boss') return;
    // 雙重保險：前方還有門就不開打
    if (!screenIsClearForBoss()) return;

    subPhaseRef.current = 'boss';
    runClosingRef.current = false;
    const boss = BOSSES[phaseRef.current];
    bossHpRef.current = boss.hp;
    setBossHp(boss.hp);
    bossXPctRef.current = 50;
    setPhaseLabel(boss.title);
    setSubPhase('boss');
    lastBossActionTimeRef.current = 0;
    phaseTimerRef.current = 0;
    enemiesRef.current = [];
    projectilesRef.current = [];
    mathGatesRef.current = mathGatesRef.current.filter((g) => g.resolved && (g.fade ?? 0) > 0);
    // 從走道盡頭登場，之後持續走向玩家
    bossAnchorZRef.current = scrollRef.current + BOSS_SPAWN_DIST;
    bossIntroRef.current = BOSS_INTRO_MS;
    flashWhiteRef.current = 0.55;
    shakeRef.current = Math.max(shakeRef.current, 10);
    setBossBanner(boss.title);

    if (!tauntShownRef.current) {
      tauntShownRef.current = true;
      const w = canvasWidthRef.current;
      const h = canvasHeightRef.current;
      addFloatText(boss.taunt, w * 0.5, h * 0.32, boss.color);
    }
  };

  const scheduleAdvance = () => {
    if (advanceBossTimeoutRef.current) clearTimeout(advanceBossTimeoutRef.current);
    advanceBossTimeoutRef.current = setTimeout(() => advanceAfterBoss(), 900);
  };

  const advanceAfterBoss = () => {
    const phase = phaseRef.current;
    if (phase >= 3) {
      subPhaseRef.current = 'sprint';
      sprintRef.current = 0;
      setPhaseLabel('決勝局 · 結算衝刺');
      setSubPhase('sprint');
      return;
    }
    phaseRef.current += 1;
    subPhaseRef.current = 'run';
    phaseTimerRef.current = 0;
    loadPhaseTrack(phaseRef.current);
    setSubPhase('run');
  };

  const finishGame = () => {
    if (endedRef.current) return;
    endedRef.current = true;
    subPhaseRef.current = 'ended';
    setSubPhase('ended');
    const { score } = computeFinalScore(feathersRef.current);
    onGameEnd(score, 0, feathersRef.current);
  };

  const updateBossLateral = (behavior: BossBehavior, delta: number) => {
    switch (behavior) {
      case 'wall':
        bossXPctRef.current = 50;
        break;
      case 'sidestep':
        bossXPctRef.current = 50 + Math.sin(phaseTimerRef.current / 240) * 26;
        break;
      case 'clear_lob':
        bossXPctRef.current = 50 + Math.sin(phaseTimerRef.current / 520) * 6;
        break;
      case 'jump_smash': {
        const base = 50 + Math.sin(phaseTimerRef.current / 380) * 8;
        if (Math.random() < 0.018 * (delta / 16)) {
          bossXPctRef.current = Math.max(28, Math.min(72, base + (Math.random() > 0.5 ? 14 : -14)));
        } else {
          bossXPctRef.current = base;
        }
        break;
      }
      default:
        bossXPctRef.current = 50;
    }
  };

  const spawnBossHazard = (behavior: BossBehavior) => {
    if (behavior === 'clear_lob') {
      enemiesRef.current.push({
        id: nextId(),
        xPct: 18 + Math.random() * 64,
        z: bossAnchorZRef.current - 12,
        maxHp: 3,
        hp: 3,
        reward: 1,
        emoji: Math.random() < 0.5 ? '📦' : '🏐',
        isHazard: true,
      });
    } else if (behavior === 'jump_smash') {
      enemiesRef.current.push({
        id: nextId(),
        xPct: 14 + Math.random() * 72,
        z: bossAnchorZRef.current - 12,
        maxHp: 1,
        hp: 1,
        reward: 0,
        emoji: '🔥',
        isHazard: true,
      });
    }
  };

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = getAvatarUrl(playerAvatar, playerName);
    img.onload = () => {
      avatarImgRef.current = img;
    };
  }, [playerAvatar, playerName]);

  useEffect(() => {
    loadPhaseTrack(0);
    setPhaseLabel(SEGMENT_NAMES[0]);

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

    const blockTouch = (e: TouchEvent) => {
      if (e.cancelable) e.preventDefault();
    };
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

      if (vignetteRef.current > 0) {
        vignetteRef.current = Math.max(0, vignetteRef.current - rawDelta * 0.0018);
      }
      if (flashWhiteRef.current > 0) {
        flashWhiteRef.current = Math.max(0, flashWhiteRef.current - rawDelta * 0.0024);
      }

      const canvas = canvasRef.current;
      if (!canvas) {
        requestRef.current = requestAnimationFrame(gameStep);
        return;
      }
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
        if (timeLeftRef.current <= 0 && subPhaseRef.current !== 'sprint') {
          finishGame();
          return;
        }
      }

      if (moveDirRef.current === 'left') {
        playerXRef.current = Math.max(PLAYER_X_MIN, playerXRef.current - MOVE_SPEED * frame);
      } else if (moveDirRef.current === 'right') {
        playerXRef.current = Math.min(PLAYER_X_MAX, playerXRef.current + MOVE_SPEED * frame);
      }
      const tiltTarget = moveDirRef.current === 'left' ? -0.25 : moveDirRef.current === 'right' ? 0.25 : 0;
      playerTiltRef.current += (tiltTarget - playerTiltRef.current) * 0.2 * (delta / 16.67);
      const playerScreen = worldToScreen(playerXRef.current, 0, w, h);
      const px = playerScreen?.x ?? w * 0.5;

      if (subPhaseRef.current === 'sprint') {
        sprintRef.current += frame;
        progressRef.current = Math.min(1, 0.97 + (sprintRef.current / 90) * 0.03);
        if (sprintRef.current > 90) {
          finishGame();
          return;
        }
      } else if (subPhaseRef.current === 'run') {
        phaseTimerRef.current += delta;
        scrollRef.current += SCROLL_SPEED * frame;

        const runTarget = trackEndZRef.current - VIEW_DEPTH * 0.35;
        const runPct = Math.min(1, scrollRef.current / Math.max(1, runTarget));
        // 全局進度：每局 0.55 賽道 + 0.45 Boss
        progressRef.current = (phaseRef.current + runPct * 0.55) / 4;

        if (
          !runClosingRef.current
          && (phaseTimerRef.current / 1000 >= RUN_PHASE_SEC
            || scrollRef.current >= trackEndZRef.current - VIEW_DEPTH * 0.35)
        ) {
          runClosingRef.current = true;
          setPhaseLabel('即將對決…');
          // 不再剔除前方數字門／防守者——等玩家自然通過後再進 Boss
        }

        if (runClosingRef.current && screenIsClearForBoss()) {
          beginBossFight();
        }
      } else if (subPhaseRef.current === 'boss') {
        phaseTimerRef.current += delta;
        // Boss 戰：攝影機幾乎不動，改由 Boss 從盡頭走向玩家
        if (bossIntroRef.current <= 0 && bossHpRef.current > 0) {
          bossAnchorZRef.current -= BOSS_APPROACH_SPEED * frame;
        }
        const boss = BOSSES[phaseRef.current];
        const hpPct = 1 - bossHpRef.current / Math.max(1, boss.hp);
        progressRef.current = (phaseRef.current + 0.55 + hpPct * 0.45) / 4;
      }

      setProgress((prev) => {
        const next = progressRef.current;
        return Math.abs(prev - next) > 0.008 ? next : prev;
      });

      if (subPhaseRef.current === 'run' || subPhaseRef.current === 'boss') {
        fireCooldownRef.current -= delta;
        const aliveProjs = projectilesRef.current.filter((p) => !p.dead).length;
        if (fireCooldownRef.current <= 0 && aliveProjs < MAX_PROJECTILES && bossIntroRef.current <= 0) {
          let fireInterval = 220;
          let burstCount = 1;
          let damage = 1;
          const f = feathersRef.current;
          if (f >= 20 && f < 50) { fireInterval = 180; burstCount = 2; }
          else if (f >= 50 && f < 100) { fireInterval = 150; burstCount = 2; }
          else if (f >= 100) { fireInterval = 130; burstCount = 3; damage = 2; }

          if (aliveProjs >= MAX_PROJECTILES - 4) burstCount = 1;

          const powerShot = f >= 100;
          const offsets = burstCount === 1 ? [0] : burstCount === 2 ? [-2.4, 2.4] : [-3.4, 0, 3.4];
          const spawnZ = scrollRef.current + HIT_DEPTH + 50;
          offsets.forEach((offsetPct) => {
            if (projectilesRef.current.filter((p) => !p.dead).length >= MAX_PROJECTILES) return;
            projectilesRef.current.push({
              id: nextId(),
              xPct: playerXRef.current,
              offsetPct,
              z: spawnZ,
              damage,
              powerShot,
            });
          });
          fireCooldownRef.current = fireInterval;

          // Muzzle flash visual juice
          addParticles(px, playerY - 36, powerShot ? '#fde047' : '#38bdf8', powerShot ? 5 : 3);

          if (powerShot && Math.random() < 0.15) {
            addFloatText('殺球!', px + (Math.random() - 0.5) * 30, playerY - 44, '#fde047');
          }
        }
      }

      projectilesRef.current.forEach((proj) => {
        proj.z += (SCROLL_SPEED + BULLET_SPEED) * frame;
      });
      projectilesRef.current = projectilesRef.current.filter((proj) => {
        const dist = proj.z - scrollRef.current;
        const bossDist = bossAnchorZRef.current - scrollRef.current;
        // 跑酷：飛到走道一半；Boss：至少打得到站定距離
        const maxReach = subPhaseRef.current === 'boss'
          ? Math.max(COMBAT_RANGE + 20, bossDist + BOSS_HIT_Z + 8)
          : COMBAT_RANGE + 20;
        return !proj.dead && dist > 0 && dist < maxReach;
      });

      if (subPhaseRef.current === 'run') {
        // Arrow a Row Mechanic: Shoot Math Gates to upgrade good ones or weaken bad ones!
        mathGatesRef.current.forEach((gate) => {
          if (gate.resolved) return;
          const gDist = gate.z - cam;
          if (gDist < 20 || gDist > COMBAT_RANGE + 40) return;

          projectilesRef.current.forEach((proj) => {
            if (proj.dead) return;
            const pDist = proj.z - cam;
            if (Math.abs(pDist - gDist) > 28) return;

            const projX = proj.xPct + proj.offsetPct;
            const chooseLeft = projX < 50;
            const op = chooseLeft ? gate.left : gate.right;
            const screen = worldToScreen(chooseLeft ? 24 : 76, gDist, w, h);
            if (!screen) return;

            proj.dead = true;
            shakeRef.current = Math.max(shakeRef.current, 2);

            const bad = isBadOp(op);
            if (bad) {
              if (op.type === 'sub') {
                op.value = Math.max(0, op.value - Math.max(1, Math.floor(op.value * 0.12)));
              } else if (op.type === 'div') {
                op.value = Math.max(1, Number((op.value - 0.08).toFixed(2)));
              } else if (op.type === 'pct_sub') {
                op.value = Math.max(0, op.value - 2);
              }
              op.label = formatGateLabel(op);
              addParticles(screen.x, screen.y, '#ef4444', 4);
              addFloatText(`削弱! ${op.label}`, screen.x, screen.y - 12, '#fca5a5');
            } else {
              if (op.type === 'add') {
                op.value += Math.max(2, Math.floor(op.value * 0.06));
              } else if (op.type === 'mul') {
                op.value = Number((op.value + 0.03).toFixed(2));
              } else if (op.type === 'pct_add') {
                op.value += 2;
              }
              op.label = formatGateLabel(op);
              addParticles(screen.x, screen.y, '#38bdf8', 6);
              addFloatText(`升級! ${op.label}`, screen.x, screen.y - 12, '#7dd3fc');
            }
          });
        });

        mathGatesRef.current.forEach((gate) => {
          if (gate.resolved) {
            if (gate.fade != null && gate.fade > 0) {
              gate.fade = Math.max(0, gate.fade - delta * 0.0045);
            }
            return;
          }
          const dist = gate.z - scrollRef.current;

          if (gate.isMystery && !gate.revealed && dist <= VIEW_DEPTH * 0.55) {
            gate.revealed = true;
            const mid = worldToScreen(50, dist, w, h);
            if (mid) {
              addParticles(mid.x - 36, mid.y, '#c4b5fd', 8);
              addParticles(mid.x + 36, mid.y, '#c4b5fd', 8);
              addFloatText('解鎖！', mid.x, mid.y - 18, '#c4b5fd');
            }
          }

          // 必須整扇門通過腳下後才結算，避免門板還在畫面中央就消失
          if (dist <= GATE_PASS_DEPTH) {
            gate.resolved = true;
            gate.fade = 1;
            const op = playerXRef.current < 50 ? gate.left : gate.right;
            feathersRef.current = applyGate(feathersRef.current, op);
            setFeathers(feathersRef.current);
            const bad = isBadOp(op);
            const good = isGoodOp(op);
            addFloatText(
              good ? '通過!' : bad ? (Math.random() > 0.5 ? '出界!' : '撞網!') : op.label,
              px,
              playerY - 32,
              bad ? '#f87171' : '#7dd3fc',
            );
            addFloatText(op.label, px, playerY - 50, bad ? '#fca5a5' : '#fde68a');
            addParticles(px, playerY, bad ? '#ef4444' : '#38bdf8', bad ? 28 : 16);
            if (bad) {
              triggerImpact('fail');
              showToast(`選錯門 ${op.label}`);
            } else if (good) {
              triggerImpact('soft');
            }
          }
        });
        mathGatesRef.current = mathGatesRef.current.filter(
          (g) => !g.resolved || (g.fade != null && g.fade > 0.02),
        );

        enemiesRef.current.forEach((e) => {
          if (e.hp <= 0) return;
          const dist = e.z - scrollRef.current;
          const screen = worldToScreen(e.xPct, dist, w, h);

          if (dist <= HIT_DEPTH) {
            if (Math.abs(playerXRef.current - e.xPct) <= HIT_X_PCT) {
              const loss = Math.min(feathersRef.current, e.hp);
              feathersRef.current = Math.max(0, feathersRef.current - loss);
              setFeathers(feathersRef.current);
              e.hp = 0;
              triggerImpact('fail');
              addParticles(px, playerY, '#ef4444', 32);
              addFloatText(`-${loss}`, px, playerY - 28, '#ef4444');
              showToast('撞到防守者');
              if (feathersRef.current <= 0) finishGame();
            } else if (dist < -40) {
              e.hp = 0;
            }
            return;
          }

          if (!screen || dist > COMBAT_RANGE) return;

          projectilesRef.current.forEach((proj) => {
            if (proj.dead) return;
            const pDist = proj.z - scrollRef.current;
            if (pDist > COMBAT_RANGE) return;
            if (Math.abs(pDist - dist) > 28) return;
            if (Math.abs((proj.xPct + proj.offsetPct) - e.xPct) > 14) return;
            proj.dead = true;
            e.hp -= proj.damage;
            e.hitFlash = 6;
            addParticles(screen.x, screen.y, '#f43f5e', proj.damage >= 2 ? 10 : 5);
            if (e.hp <= 0) {
              triggerImpact('soft');
              addParticles(screen.x, screen.y, '#fbbf24', 22);
              spawnMagnetFeather(screen.x, screen.y, e.reward);
              feathersRef.current += e.reward;
              setFeathers(feathersRef.current);
              addFloatText('接住!', screen.x, screen.y + 6, '#7dd3fc');
              addFloatText(`+${e.reward}`, screen.x, screen.y + 22, '#fbbf24');
            } else if (proj.damage >= 2 || Math.random() < 0.4) {
              addFloatText(`-${proj.damage}`, screen.x, screen.y - 8, '#ef4444');
            }
          });
        });
        enemiesRef.current = enemiesRef.current.filter((e) => e.hp > 0);
      }

      if (subPhaseRef.current === 'boss' && bossHpRef.current > 0) {
        const boss = BOSSES[phaseRef.current];
        const bossDist = bossAnchorZRef.current - scrollRef.current;

        updateBossLateral(boss.behavior, delta);

        const interval = bossActionInterval(boss.behavior);
        if (
          (boss.behavior === 'clear_lob' || boss.behavior === 'jump_smash')
          && phaseTimerRef.current - lastBossActionTimeRef.current >= interval
          && bossIntroRef.current <= 0
        ) {
          lastBossActionTimeRef.current = phaseTimerRef.current;
          spawnBossHazard(boss.behavior);
        }

        enemiesRef.current.forEach((e) => {
          if (e.isHazard) e.z -= HAZARD_SPEED * frame;
          const dist = e.z - scrollRef.current;
          if (dist <= HIT_DEPTH) {
            if (Math.abs(playerXRef.current - e.xPct) <= HIT_X_PCT) {
              const loss = e.emoji === '🔥'
                ? Math.min(feathersRef.current, 8)
                : Math.min(feathersRef.current, Math.max(3, e.hp));
              feathersRef.current = Math.max(0, feathersRef.current - loss);
              setFeathers(feathersRef.current);
              e.hp = 0;
              triggerImpact('fail');
              addParticles(px, playerY, '#ef4444', 26);
              addFloatText(`-${loss}`, px, playerY - 28, '#ef4444');
              showToast(e.emoji === '🔥' ? '被殺球擊中' : '撞到防守者');
              if (feathersRef.current <= 0) finishGame();
            } else if (dist < -50) {
              e.hp = 0;
            }
            return;
          }
          if (e.isHazard) return;
          if (dist > COMBAT_RANGE) return;
          const screen = worldToScreen(e.xPct, dist, w, h);
          if (!screen) return;
          projectilesRef.current.forEach((proj) => {
            if (proj.dead) return;
            const pDist = proj.z - scrollRef.current;
            if (pDist > COMBAT_RANGE) return;
            if (Math.abs(proj.z - e.z) > 36) return;
            if (Math.abs((proj.xPct + proj.offsetPct) - e.xPct) > 14) return;
            proj.dead = true;
            e.hp -= proj.damage;
            e.hitFlash = 6;
            if (e.hp <= 0) {
              feathersRef.current += e.reward;
              setFeathers(feathersRef.current);
              spawnMagnetFeather(screen.x, screen.y, e.reward);
              addFloatText(`+${e.reward}`, screen.x, screen.y - 8, '#fbbf24');
            }
          });
        });
        enemiesRef.current = enemiesRef.current.filter((e) => e.hp > 0 && e.z > scrollRef.current - 80);

        // Boss 走進射程內就可打（走道一半）
        if (bossDist <= COMBAT_RANGE + 40 && bossDist > -40) {
          const bScreen = worldToScreen(bossXPctRef.current, bossDist, w, h);
          projectilesRef.current.forEach((proj) => {
            if (proj.dead) return;
            const pDist = proj.z - scrollRef.current;
            const pScreen = worldToScreen(proj.xPct + proj.offsetPct, pDist, w, h);
            if (!bScreen || !pScreen) return;

            const dx = Math.abs(pScreen.x - bScreen.x);
            const dy = Math.abs(pScreen.y - bScreen.y);
            const hitR_X = Math.max(28, 68 * bScreen.scale);
            const hitR_Y = Math.max(28, 60 * bScreen.scale);

            if (dx <= hitR_X && dy <= hitR_Y) {
              proj.dead = true;
              bossHpRef.current = Math.max(0, bossHpRef.current - proj.damage);
              setBossHp(bossHpRef.current);
              shakeRef.current = Math.max(shakeRef.current, proj.powerShot ? 8 : 5);
              addParticles(pScreen.x, pScreen.y, '#a78bfa', proj.damage >= 2 ? 12 : 7);
              addFloatText(`-${proj.damage}`, pScreen.x, pScreen.y - 8, '#f87171');
              if (proj.damage >= 2) addFloatText('殺球!', pScreen.x, pScreen.y - 22, '#fde047');

              if (bossHpRef.current <= 0) {
                feathersRef.current += boss.reward;
                setFeathers(feathersRef.current);
                triggerImpact('hard');
                flashWhiteRef.current = Math.max(flashWhiteRef.current, 0.8);
                addFloatText(`+${boss.reward} 羽毛！`, w * 0.5, h * 0.38, '#fbbf24');
                addFloatText('擊破對手 · 勝利！', w * 0.5, h * 0.44, '#7dd3fc');
                if (bScreen) {
                  addParticles(bScreen.x, bScreen.y, '#fbbf24', 50);
                  spawnMagnetFeather(bScreen.x, bScreen.y, boss.reward);
                }

                if (phaseRef.current >= 3) {
                  // Final Boss Defeated! Finish game and show settlement rewards
                  setTimeout(() => {
                    finishGame();
                  }, 1200);
                } else {
                  progressRef.current = (phaseRef.current + 1) / 4;
                  setProgress(progressRef.current);
                  scheduleAdvance();
                }
              }
            }
          });
        }

        // 穿過玩家：扣羽毛，並從盡頭再次壓上
        if (bossHpRef.current > 0 && bossDist <= HIT_DEPTH) {
          const overlapped = Math.abs(playerXRef.current - bossXPctRef.current) <= BOSS_CONTACT_X;
          if (overlapped) {
            const loss = Math.min(
              feathersRef.current,
              Math.max(10, Math.floor(feathersRef.current * BOSS_PASS_LOSS_PCT)),
            );
            feathersRef.current = Math.max(0, feathersRef.current - loss);
            setFeathers(feathersRef.current);
            triggerImpact('fail');
            addParticles(px, playerY, '#ef4444', 34);
            addFloatText(`-${loss}`, px, playerY - 28, '#ef4444');
            showToast('被對手穿過！');
            if (feathersRef.current <= 0) {
              finishGame();
              return;
            }
          } else {
            addFloatText('閃過！', px, playerY - 36, '#7dd3fc');
          }
          bossAnchorZRef.current = scrollRef.current + BOSS_SPAWN_DIST;
          bossXPctRef.current = 50;
          addFloatText('對手再次從底線壓上！', w * 0.5, h * 0.3, boss.color);
        }
      }

      {
        const bossDist = bossAnchorZRef.current - scrollRef.current;
        const bScreen = worldToScreen(bossXPctRef.current, bossDist, w, h);
        if (
          bScreen
          && bossDist > -60
          && bossDist < VIEW_DEPTH + 120
          && bossHpRef.current > 0
          && subPhaseRef.current !== 'sprint'
          && subPhaseRef.current !== 'ended'
        ) {
          setBossScreen({
            x: Math.max(36, Math.min(w - 36, bScreen.x)),
            y: Math.max(36, Math.min(h - 30, bScreen.y)),
            scale: bScreen.scale,
            visible: true,
          });
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
        if (t >= 1) {
          addParticles(px, playerY, '#38bdf8', 4);
        }
      });
      magnetFeathersRef.current = magnetFeathersRef.current.filter((mf) => mf.progress < 1);

      particlesRef.current = particlesRef.current
        .map((p) => ({ ...p, x: p.x + p.vx, y: p.y + p.vy, vy: p.vy + 0.04, life: p.life - delta * 0.0022 }))
        .filter((p) => p.life > 0);
      floatTextsRef.current = floatTextsRef.current
        .map((t) => ({ ...t, y: t.y - delta * 0.045, life: t.life - delta * 0.002 }))
        .filter((t) => t.life > 0);

      const shakeX = shakeRef.current > 0 ? (Math.random() - 0.5) * shakeRef.current : 0;
      const shakeY = shakeRef.current > 0 ? (Math.random() - 0.5) * shakeRef.current * 0.5 : 0;

      ctx.clearRect(0, 0, w, h);

      const theme = COURT_THEMES[Math.min(COURT_THEMES.length - 1, phaseRef.current)] ?? COURT_THEMES[0];

      const skyGrad = ctx.createLinearGradient(0, 0, 0, horizonY);
      skyGrad.addColorStop(0, theme.sky[0]);
      skyGrad.addColorStop(0.7, theme.sky[1]);
      skyGrad.addColorStop(1, theme.sky[2]);
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, w, horizonY);

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

      ctx.strokeStyle = 'rgba(226, 232, 240, 0.28)';
      ctx.lineWidth = 2;
      ctx.setLineDash([16, 20]);
      ctx.lineDashOffset = -(scrollRef.current + (subPhaseRef.current === 'boss' ? phaseTimerRef.current * 0.15 : 0)) * 1.3;
      ctx.beginPath();
      ctx.moveTo(w * 0.5, horizonY);
      ctx.lineTo(w * 0.5, h);
      ctx.stroke();
      ctx.setLineDash([]);

      // 靠近數字門時高亮即將選中的半場
      if (subPhaseRef.current === 'run') {
        const nearGate = mathGatesRef.current.find((g) => {
          if (g.resolved) return false;
          const d = g.z - cam;
          return d > HIT_DEPTH && d < 110;
        });
        if (nearGate) {
          const chooseLeft = playerXRef.current < 50;
          ctx.save();
          ctx.globalAlpha = 0.12;
          ctx.fillStyle = theme.accent;
          ctx.beginPath();
          if (chooseLeft) {
            ctx.moveTo(farL, horizonY);
            ctx.lineTo(w * 0.5, horizonY);
            ctx.lineTo(w * 0.5, h);
            ctx.lineTo(nearL, h);
          } else {
            ctx.moveTo(w * 0.5, horizonY);
            ctx.lineTo(farR, horizonY);
            ctx.lineTo(nearR, h);
            ctx.lineTo(w * 0.5, h);
          }
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
      }

      type DrawItem =
        | { kind: 'gate'; dist: number; gate: MathGate }
        | { kind: 'enemy'; dist: number; enemy: Enemy }
        | { kind: 'proj'; dist: number; proj: Projectile };

      const drawQueue: DrawItem[] = [];

      if (subPhaseRef.current === 'run') {
        mathGatesRef.current.forEach((gate) => {
          const dist = gate.z - cam;
          // 含淡出中的已通過門
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
      drawQueue.sort((a, b) => {
        if (Math.abs(a.dist - b.dist) < 12) return kindOrder[a.kind] - kindOrder[b.kind];
        return b.dist - a.dist;
      });

      drawQueue.forEach((item) => {
        if (item.kind === 'gate') {
          const { gate, dist } = item;
          const left = worldToScreen(24, dist, w, h);
          const right = worldToScreen(76, dist, w, h);
          if (!left || !right) return;
          const showMystery = gate.isMystery && !gate.revealed;
          const near = dist < 130;
          const chooseLeft = playerXRef.current < 50;

          if (left.progress > 0.2) {
            ctx.save();
            ctx.globalAlpha = Math.min(0.55, 0.2 + left.progress * 0.4);
            ctx.strokeStyle = '#e2e8f0';
            ctx.lineWidth = Math.max(2, 3 * left.scale);
            ctx.beginPath();
            ctx.moveTo(left.x + shakeX, left.y - 36 * left.scale);
            ctx.quadraticCurveTo(
              w * 0.5 + shakeX,
              left.y - 58 * left.scale,
              right.x + shakeX,
              right.y - 36 * right.scale,
            );
            ctx.stroke();
            ctx.restore();
          }

          ([
            { screen: left, op: gate.left, side: 'left' as const },
            { screen: right, op: gate.right, side: 'right' as const },
          ]).forEach(({ screen, op, side }) => {
            const bad = isBadOp(op);
            const good = isGoodOp(op);
            const selected = near && !gate.resolved && ((side === 'left') === chooseLeft);
            ctx.save();
            const fadeMul = gate.resolved ? Math.max(0, gate.fade ?? 0) : 1;
            // 靠近時壓低門板高度，避免「腳邊觸發但畫面還是一整片牆」的錯覺
            const heightMul = 0.55 + (1 - screen.progress) * 0.45;
            ctx.globalAlpha = Math.min(0.95, 0.48 + screen.progress * 0.5) * fadeMul;
            const rw = 118 * screen.scale;
            const rh = 88 * screen.scale * heightMul;
            const rx = screen.x - rw / 2 + shakeX;
            const ry = screen.y - rh * 0.55;
            const r = 8 * screen.scale;
            ctx.fillStyle = showMystery
              ? 'rgba(109, 40, 217, 0.55)'
              : bad
                ? 'rgba(185, 28, 28, 0.55)'
                : good
                  ? 'rgba(180, 83, 9, 0.5)'
                  : 'rgba(30, 64, 175, 0.5)';
            ctx.strokeStyle = selected
              ? '#fff'
              : showMystery ? '#e9d5ff' : bad ? '#fca5a5' : good ? '#fde68a' : '#93c5fd';
            ctx.lineWidth = Math.max(2, (selected ? 4.2 : 3.2) * screen.scale);
            if (selected) {
              ctx.shadowColor = '#ffffff';
              ctx.shadowBlur = 12 * screen.scale;
            }
            ctx.beginPath();
            if (ctx.roundRect) ctx.roundRect(rx, ry, rw, rh, r);
            else ctx.rect(rx, ry, rw, rh);
            ctx.fill();
            ctx.stroke();
            ctx.shadowBlur = 0;
            ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
            ctx.fillRect(rx + 4 * screen.scale, ry + 4 * screen.scale, rw - 8 * screen.scale, 14 * screen.scale);
            ctx.fillStyle = '#cbd5e1';
            ctx.font = `bold ${Math.max(8, Math.floor(10 * screen.scale))}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(
              gate.resolved ? '通過' : selected ? '▶ 此側' : '數字門',
              screen.x + shakeX,
              ry + 11 * screen.scale,
            );
            ctx.fillStyle = '#fff';
            ctx.font = `bold ${Math.max(14, Math.floor(26 * screen.scale))}px sans-serif`;
            ctx.fillText(showMystery ? '❓' : op.label, screen.x + shakeX, screen.y - 2 * screen.scale);
            ctx.restore();
          });
        } else if (item.kind === 'enemy') {
          const { enemy, dist } = item;
          const screen = worldToScreen(enemy.xPct, dist, w, h);
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
          const isSmash = enemy.emoji === '🔥';
          const isHazard = !!enemy.isHazard;

          // 身影
          ctx.beginPath();
          ctx.ellipse(sx, sy + 22 * sc, 28 * sc, 8 * sc, 0, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(15, 23, 42, 0.35)';
          ctx.fill();

          if (isSmash || isHazard) {
            const rw = 48 * sc;
            const rh = 40 * sc;
            ctx.fillStyle = isSmash ? '#ea580c' : '#0284c7';
            ctx.strokeStyle = isSmash ? '#fdba74' : '#7dd3fc';
            ctx.lineWidth = Math.max(1.5, 2 * sc);
            ctx.beginPath();
            if (ctx.roundRect) ctx.roundRect(sx - rw / 2, sy - rh / 2, rw, rh, 10 * sc);
            else ctx.rect(sx - rw / 2, sy - rh / 2, rw, rh);
            ctx.fill();
            ctx.stroke();
            ctx.font = `${Math.max(14, Math.floor(22 * sc))}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(enemy.emoji, sx, sy);
          } else {
            // 防守者：頭＋身＋球拍；血條固定在頭頂，並夾在畫布內
            const bodyW = 36 * sc;
            const bodyH = 40 * sc;
            const grad = ctx.createLinearGradient(sx, sy - bodyH, sx, sy + bodyH * 0.4);
            grad.addColorStop(0, '#fb7185');
            grad.addColorStop(1, '#9f1239');
            ctx.fillStyle = grad;
            ctx.beginPath();
            if (ctx.roundRect) {
              ctx.roundRect(sx - bodyW / 2, sy - bodyH * 0.35, bodyW, bodyH, 12 * sc);
            } else {
              ctx.rect(sx - bodyW / 2, sy - bodyH * 0.35, bodyW, bodyH);
            }
            ctx.fill();
            ctx.strokeStyle = '#fecdd3';
            ctx.lineWidth = Math.max(1, 1.5 * sc);
            ctx.stroke();

            const headY = sy - bodyH * 0.55;
            ctx.beginPath();
            ctx.arc(sx, headY, 16 * sc, 0, Math.PI * 2);
            ctx.fillStyle = '#1e293b';
            ctx.fill();
            ctx.font = `${Math.max(14, Math.floor(22 * sc))}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(enemy.emoji, sx, headY);

            ctx.strokeStyle = '#fde68a';
            ctx.lineWidth = Math.max(1.5, 2.2 * sc);
            ctx.beginPath();
            ctx.moveTo(sx + bodyW * 0.35, sy - 4 * sc);
            ctx.lineTo(sx + bodyW * 0.85, sy - 28 * sc);
            ctx.stroke();
            ctx.beginPath();
            ctx.ellipse(sx + bodyW * 0.95, sy - 36 * sc, 10 * sc, 14 * sc, 0.4, 0, Math.PI * 2);
            ctx.strokeStyle = '#fef3c7';
            ctx.stroke();

            const barW = Math.max(28, 44 * sc);
            const barH = Math.max(4, 5 * sc);
            const ratio = Math.max(0, Math.min(1, enemy.hp / Math.max(1, enemy.maxHp)));
            // 血條在頭頂上方，避免貼地時爆出下緣；並水平夾限
            let barX = sx - barW / 2;
            let barY = headY - 20 * sc;
            barX = Math.max(4, Math.min(w - barW - 4, barX));
            barY = Math.max(4, Math.min(h - barH - 4, barY));
            ctx.globalAlpha = Math.min(1, 0.55 + screen.progress * 0.45);
            ctx.fillStyle = 'rgba(15,23,42,0.9)';
            ctx.fillRect(barX, barY, barW, barH);
            ctx.fillStyle = ratio > 0.4 ? '#4ade80' : '#f87171';
            ctx.fillRect(barX, barY, barW * ratio, barH);
            if (screen.progress > 0.35) {
              ctx.fillStyle = '#e2e8f0';
              ctx.font = `bold ${Math.max(8, Math.floor(9 * sc))}px sans-serif`;
              ctx.fillText('防守', sx, Math.min(h - 6, barY + barH + 10 * sc));
            }
          }
          ctx.restore();
        } else {
          const { proj, dist } = item;
          const screen = worldToScreen(proj.xPct + proj.offsetPct, dist, w, h);
          if (!screen) return;
          const alpha = Math.min(1, 0.22 + screen.progress * 0.95);
          drawShuttlecock(
            ctx,
            screen.x + shakeX,
            screen.y + shakeY,
            screen.scale * (proj.powerShot ? 1.05 : 0.92),
            !!proj.powerShot,
            alpha,
          );
        }
      });

      if (subPhaseRef.current === 'sprint') {
        const { score } = computeFinalScore(feathersRef.current);
        ctx.fillStyle = '#e2e8f0';
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('決勝局 · 結算衝刺', w / 2, h * 0.36);
        ctx.font = 'bold 34px sans-serif';
        ctx.fillStyle = '#c4b5fd';
        ctx.fillText(`${score} 分`, w / 2, h * 0.46);
      }

      const playerRenderX = px + shakeX;
      const playerRenderY = playerY + shakeY;
      const squadCount = Math.min(6, Math.floor(feathersRef.current / 12) + 1);
      ctx.save();
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 4;
      for (let i = 0; i < squadCount; i++) {
        const row = Math.floor(i / 3) + 1;
        const col = (i % 3) - 1;
        ctx.font = '15px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(
          '🪶',
          playerRenderX + col * 16 + Math.sin(ts / 150 + i) * 2,
          playerRenderY + row * 18 + Math.cos(ts / 200 + i) * 2,
        );
      }
      ctx.restore();

      ctx.save();
      ctx.translate(playerRenderX, playerRenderY);
      ctx.rotate(playerTiltRef.current);

      const avatar = avatarImgRef.current;
      if (avatar && avatar.complete) {
        const avSize = 28;
        ctx.save();
        ctx.beginPath();
        ctx.arc(0, -8, avSize / 2, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(avatar, -avSize / 2, -8 - avSize / 2, avSize, avSize);
        ctx.restore();
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, -8, avSize / 2, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.font = '34px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🏸', 0, 10);
      ctx.rotate(-playerTiltRef.current);
      ctx.font = 'bold 17px sans-serif';
      ctx.fillStyle = feathersRef.current >= 100 ? '#fde047' : '#38bdf8';
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
        ctx.textBaseline = 'middle';
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 8;
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
        g.addColorStop(1, `rgba(127, 29, 29, ${Math.min(0.55, vignetteRef.current)})`);
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
      if (advanceBossTimeoutRef.current) clearTimeout(advanceBossTimeoutRef.current);
    };
  }, [onGameEnd]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') setDirection('left');
      else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') setDirection('right');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const applyPointerDir = (clientX: number, target: HTMLElement) => {
    const rect = target.getBoundingClientRect();
    setDirection(clientX - rect.left < rect.width / 2 ? 'left' : 'right');
  };

  const currentBossConfig = BOSSES[Math.max(0, segmentIndex - 1)] ?? BOSSES[0];
  const bossVisible = bossScreen.visible && !!bossPet && bossHp > 0;
  /** 當前段內進度 0~1（由全局 progress 反推） */
  const phaseLocalProgress = Math.max(0, Math.min(1, progress * 4 - (segmentIndex - 1)));

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full min-h-[500px] bg-slate-950 touch-none select-none overscroll-none"
      style={{ touchAction: 'none' }}
      onPointerDown={(e) => applyPointerDir(e.clientX, e.currentTarget)}
    >
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />

      {bossVisible && bossPet && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{
            opacity: subPhase === 'boss' ? 1 : 0.75,
            scale: Math.max(0.35, Math.min(1.05, bossScreen.scale * 1.05)),
          }}
          transition={{ duration: 0.15 }}
          className="absolute pointer-events-none flex flex-col items-center z-10 select-none max-w-[42%]"
          style={{
            left: `${bossScreen.x}px`,
            top: `${bossScreen.y}px`,
            // 錨在角色胸口：稱號向上、血條向下，避免整塊 UI 以中心對齊導致血條爆邊
            transform: 'translate(-50%, -42%)',
            width: `${Math.max(104, Math.min(168, 150 * Math.max(0.55, bossScreen.scale)))}px`,
          }}
        >
          <div
            className="absolute rounded-full border border-emerald-400/40 bg-emerald-400/10"
            style={{
              width: `${Math.max(40, 90 * bossScreen.scale)}px`,
              height: `${Math.max(12, 28 * bossScreen.scale)}px`,
              bottom: `${Math.max(2, 4 * bossScreen.scale)}px`,
              left: '50%',
              transform: 'translateX(-50%)',
            }}
          />
          <div className="bg-slate-950/90 border border-slate-700/60 rounded-full px-2 py-0.5 mb-1 text-[9px] sm:text-[10px] font-black text-white shadow-xl tracking-wider flex items-center gap-1 backdrop-blur-sm z-[1] max-w-full">
            <span className="w-1.5 h-1.5 rounded-full animate-ping shrink-0" style={{ backgroundColor: currentBossConfig.color }} />
            <span className="truncate">
              {subPhase === 'boss' ? currentBossConfig.title : `前方 · ${currentBossConfig.title}`}
            </span>
          </div>
          <div
            className="mb-1 filter drop-shadow-[0_0_12px_rgba(255,255,255,0.25)] flex items-center justify-center z-[1]"
            style={{ width: `${Math.max(48, 96 * bossScreen.scale)}px`, height: `${Math.max(48, 96 * bossScreen.scale)}px` }}
          >
            <PetRenderer petId={bossPet.id} tier={bossPet.tier} className="w-full h-full object-contain" />
          </div>
          {subPhase === 'boss' && (
            <>
              <div className="w-full max-w-full bg-slate-950/90 border border-slate-800 rounded-full p-0.5 shadow-lg z-[1]">
                <div
                  className="h-2 rounded-full transition-all duration-200"
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
        <div className="bg-slate-900/85 border border-slate-700/60 rounded-xl px-2.5 py-1 sm:px-3 sm:py-1.5 text-center backdrop-blur-sm min-w-[100px]">
          <div className="text-[8px] sm:text-[9px] text-emerald-400 font-bold truncate max-w-[140px]">{phaseLabel}</div>
          <div className="text-sm font-black text-white tabular-nums leading-tight">{timeLeft}s</div>
        </div>
        <div className="bg-slate-900/85 border border-slate-700/60 rounded-xl px-2.5 py-1 sm:px-3 sm:py-1.5 text-right backdrop-blur-sm">
          <div className="text-[8px] sm:text-[9px] text-slate-400 font-bold">球員</div>
          <div className="text-[11px] sm:text-xs font-black text-white max-w-[64px] sm:max-w-[72px] truncate">{playerName}</div>
        </div>
      </div>

      <div className="absolute top-[52px] inset-x-3 z-20 pointer-events-none">
        <div className="flex items-stretch gap-1 mb-1">
          {SEGMENT_NAMES.map((name, i) => {
            const stageNum = i + 1;
            const completed = segmentIndex > stageNum;
            const active = segmentIndex === stageNum && subPhase !== 'sprint' && subPhase !== 'ended';
            const inBoss = active && subPhase === 'boss';
            const fill = completed
              ? 100
              : active
                ? Math.round(phaseLocalProgress * 100)
                : 0;
            return (
              <div key={name} className="flex-1 min-w-0 flex flex-col gap-0.5">
                <div
                  className={cn(
                    'relative h-2 rounded-full overflow-hidden border',
                    completed
                      ? 'border-emerald-400/50 bg-emerald-950/40'
                      : active
                        ? inBoss
                          ? 'border-rose-400/60 bg-rose-950/40'
                          : 'border-sky-400/50 bg-sky-950/40'
                        : 'border-slate-700/60 bg-slate-900/60',
                  )}
                >
                  <div
                    className={cn(
                      'absolute inset-y-0 left-0 rounded-full transition-[width] duration-200',
                      completed
                        ? 'bg-emerald-400'
                        : inBoss
                          ? 'bg-gradient-to-r from-rose-500 to-amber-400'
                          : 'bg-gradient-to-r from-sky-500 to-emerald-400',
                    )}
                    style={{ width: `${fill}%` }}
                  />
                </div>
                <div className="flex items-center justify-between gap-0.5 px-0.5">
                  <span
                    className={cn(
                      'text-[7px] font-black truncate',
                      completed ? 'text-emerald-400' : active ? 'text-white' : 'text-slate-600',
                    )}
                  >
                    {stageNum}.{COURT_THEMES[i]?.label ?? name}
                  </span>
                  {inBoss && (
                    <span className="text-[7px] font-black text-rose-300 shrink-0 animate-pulse">Boss</span>
                  )}
                  {completed && (
                    <span className="text-[7px] font-black text-emerald-400 shrink-0">✓</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <div className="h-1 bg-slate-800/80 rounded-full overflow-hidden border border-slate-700/50">
          <div
            className="h-full rounded-full transition-[width] duration-150 bg-gradient-to-r from-emerald-500 via-sky-400 to-violet-400"
            style={{ width: `${Math.round(Math.min(100, progress * 100))}%` }}
          />
        </div>
      </div>

      {toast && (
        <div className="absolute top-[88px] inset-x-0 z-30 flex justify-center pointer-events-none">
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-950/90 border border-red-500/50 text-red-100 text-sm font-black px-4 py-2 rounded-xl shadow-xl backdrop-blur-sm"
          >
            {toast}
          </motion.div>
        </div>
      )}

      {bossBanner && (
        <div className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none">
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            className="px-6 py-3 rounded-2xl border-2 text-center shadow-2xl backdrop-blur-md"
            style={{
              borderColor: currentBossConfig.color,
              background: 'rgba(2,6,23,0.82)',
            }}
          >
            <div className="text-[10px] font-bold text-slate-400 tracking-widest mb-1">對決開始</div>
            <div className="text-lg sm:text-xl font-black text-white" style={{ color: currentBossConfig.color }}>
              {bossBanner}
            </div>
          </motion.div>
        </div>
      )}

      {showTip && (
        <div className="absolute top-[100px] inset-x-0 z-10 flex justify-center pointer-events-none">
          <span className="text-[9px] font-bold text-slate-400 bg-slate-950/70 px-2.5 py-1 rounded-full border border-slate-700/50">
            <span className="sm:hidden">點左／右半邊持續移動 · 自動殺球</span>
            <span className="hidden sm:inline">← → 或 A D 移動 · 自動殺球</span>
          </span>
        </div>
      )}

      <div
        className="absolute bottom-0 inset-x-0 z-30 flex justify-between pointer-events-none"
        style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
      >
        <button
          type="button"
          aria-label="向左移動"
          onPointerDown={(e) => {
            e.stopPropagation();
            e.preventDefault();
            setDirection('left');
          }}
          className={cn(
            'pointer-events-auto ml-3 mb-2 w-[72px] h-[72px] sm:w-16 sm:h-16 rounded-full border-2 flex items-center justify-center active:scale-95 transition-all shadow-2xl',
            moveDir === 'left'
              ? 'bg-sky-500/40 border-sky-300 text-sky-100 ring-2 ring-sky-400/60'
              : 'bg-slate-900/85 border-slate-600 text-white',
          )}
        >
          <ChevronLeft className="w-10 h-10 sm:w-8 sm:h-8" />
        </button>
        <button
          type="button"
          aria-label="向右移動"
          onPointerDown={(e) => {
            e.stopPropagation();
            e.preventDefault();
            setDirection('right');
          }}
          className={cn(
            'pointer-events-auto mr-3 mb-2 w-[72px] h-[72px] sm:w-16 sm:h-16 rounded-full border-2 flex items-center justify-center active:scale-95 transition-all shadow-2xl',
            moveDir === 'right'
              ? 'bg-sky-500/40 border-sky-300 text-sky-100 ring-2 ring-sky-400/60'
              : 'bg-slate-900/85 border-slate-600 text-white',
          )}
        >
          <ChevronRight className="w-10 h-10 sm:w-8 sm:h-8" />
        </button>
      </div>
    </div>
  );
};
