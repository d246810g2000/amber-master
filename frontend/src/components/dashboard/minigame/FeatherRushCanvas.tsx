import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import ChevronLeft from 'lucide-react/dist/esm/icons/chevron-left';
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right';
import { cn, getAvatarUrl } from '../../../lib/utils';
import { BALANCE, BOSSES, ShotGrade, GateOperation, gradeShot } from './featherRushTypes';
import {
  applyGate, computeFinalScore, generateFreeGates, degradeGateOnHit,
  isGoodOp, isBadOp, shotDamage,
} from './featherRushEngine';
import { PETS_CATALOG, PetCatalogEntry } from '../../../lib/petCatalog';
import { PetRenderer } from '../../PetRenderer';

interface FeatherRushCanvasProps {
  playerName: string;
  playerAvatar: string;
  onGameEnd: (score: number, maxCombo: number, remainingFeathers: number) => void;
}

type SubPhase = 'run' | 'boss' | 'ended';
type EnemyState = 'far' | 'approaching' | 'warning' | 'attacking';

interface MathGate {
  id: number;
  z: number;
  x: number;
  op: GateOperation;
  hp: number;
  maxHp: number;
  resolved: boolean;
  fade?: number;
  hitFlash?: number;
}

interface Enemy {
  id: number;
  x: number;
  z: number;
  hp: number;
  maxHp: number;
  speed: number;
  emoji: string;
  reward: number;
  hitFlash?: number;
  state: EnemyState;
}

interface Projectile {
  x: number;
  z: number;
  speed: number;
  active: boolean;
  grade?: ShotGrade;
  damage?: number;
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
const GATE_MAX_HP = 3;
const GATE_PASS_DEPTH = -12;
const COMBAT_RANGE = Math.round(VIEW_DEPTH * 0.5);
const SCROLL_SPEED = 3.0;
const BULLET_SPEED = 5.2;
const PROJ_HIT_Z = 28;
const GATE_HIT_WIDTH = 14;
const TOTAL_GAME_SEC = BALANCE.gameDurationSec;
const BOSS_SPAWN_DIST = Math.round(VIEW_DEPTH * 0.92);
const BOSS_APPROACH_SPEED = 2.35;
const ROAD_HALF_FAR = 0.20;
const ROAD_HALF_NEAR = 0.46;
const MAX_PROJECTILES = 12;
const HIT_STOP_MS = 90;
const BOSS_INTRO_MS = 750;
const MAX_PARTICLES = 80;
const BOSS_X_MIN = 25;
const BOSS_X_MAX = 75;

const GRADE_LABELS: Record<ShotGrade, string> = {
  perfect: '完美!', great: '精準!', good: '好球', miss: '揮空',
};
const GRADE_COLORS: Record<ShotGrade, string> = {
  perfect: '#fde047', great: '#c4b5fd', good: '#7dd3fc', miss: '#94a3b8',
};

const STAGE_NAMES = ['熟悉手感', '正常節奏', '門檻挑戰', '高壓區', '決勝對手'] as const;

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
  { label: '高壓區', sky: ['#1a0a0a', '#3f0a0a', '#7f1d1d'], road: ['#3f1515', '#1a0808'], edge: '#fda4af', accent: '#f43f5e', haze: 'rgba(244,63,94,0.14)', starColor: '#fecdd3' },
  { label: '決勝場', sky: ['#1a0a12', '#3b0764', '#7f1d1d'], road: ['#2e1065', '#1a0808'], edge: '#f0abfc', accent: '#e879f9', haze: 'rgba(232,121,249,0.14)', starColor: '#f5d0fe' },
];

function stageIndexFromElapsed(elapsed: number): number {
  if (elapsed < 10) return 0;
  if (elapsed < 25) return 1;
  if (elapsed < 40) return 2;
  if (elapsed < 50) return 3;
  return 4;
}

/** Fixed spawn cadence by stage; after boss appear → stop normal spawns.
 *  Gates spawn from Stage 1 — they are core loop, not late content. */
function spawnIntervals(elapsed: number): { enemyMs: number; gateMs: number } | null {
  if (elapsed >= BALANCE.bossAppearElapsedSec) return null;
  if (elapsed < 10) return { enemyMs: 2800, gateMs: 4500 };
  if (elapsed < 25) return { enemyMs: 2000, gateMs: 4000 };
  if (elapsed < 40) return { enemyMs: 1700, gateMs: 3500 };
  return { enemyMs: 1300, gateMs: 3000 };
}

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
  if (dist > BALANCE.attackDistance) return 'warning';
  return 'attacking';
}

function createProjectilePool(): Projectile[] {
  return Array.from({ length: MAX_PROJECTILES }, () => ({
    x: 50, z: 0, speed: BULLET_SPEED, active: false,
  }));
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
  ctx.restore();
}

function drawWarningGlow(
  ctx: CanvasRenderingContext2D,
  xPct: number,
  w: number,
  h: number,
  horizonY: number,
  color: string,
  alpha: number,
) {
  const near = worldToScreen(xPct, 60, w, h);
  const far = worldToScreen(xPct, VIEW_DEPTH * 0.7, w, h);
  if (!near || !far) return;
  const halfNear = roadHalfWidthAt(near.progress, w) / 5;
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
  const playerXRef = useRef(50);
  const moveDirRef = useRef<'left' | 'right' | null>(null);
  const timeLeftRef = useRef(TOTAL_GAME_SEC);
  const gameStartMsRef = useRef(0);
  const bossHpRef = useRef(0);
  const bossMaxHpRef = useRef(BOSSES[0].hp);
  const bossZRef = useRef(VIEW_DEPTH + 1000);
  const bossXRef = useRef(50);
  const mathGatesRef = useRef<MathGate[]>([]);
  const enemiesRef = useRef<Enemy[]>([]);
  const projectilesRef = useRef<Projectile[]>(createProjectilePool());
  const autoFireTimerRef = useRef(0);
  const enemySpawnTimerRef = useRef(2200);
  const gateSpawnTimerRef = useRef(4000);
  const bossSpawnedRef = useRef(false);
  const bossDefeatedRef = useRef(false);
  const particlesRef = useRef<Particle[]>([]);
  const floatTextsRef = useRef<FloatingText[]>([]);
  const magnetFeathersRef = useRef<MagnetFeather[]>([]);
  const shakeRef = useRef(0);
  const endedRef = useRef(false);
  const toastUntilRef = useRef(0);
  const hitStopRef = useRef(0);
  const bossIntroRef = useRef(0);
  const vignetteRef = useRef(0);
  const tipUntilRef = useRef(performance.now() + 5000);
  const flashWhiteRef = useRef(0);
  const comboRef = useRef(0);
  const maxComboRef = useRef(0);
  const lastHitTimeRef = useRef(0);
  const feverUntilRef = useRef(0);
  const feverActiveRef = useRef(false);
  const bossHopTimerRef = useRef(900);
  const swipeStartRef = useRef<{ x: number; y: number } | null>(null);
  const lastUiSyncRef = useRef(0);
  const lastSegmentUiRef = useRef(-1);
  const warningCloseRef = useRef(false);

  const [feathers, setFeathers] = useState(BALANCE.initialFeathers);
  const [timeLeft, setTimeLeft] = useState(TOTAL_GAME_SEC);
  const [combo, setCombo] = useState(0);
  const [fever, setFever] = useState(false);
  const [phaseLabel, setPhaseLabel] = useState<string>(STAGE_NAMES[0]);
  const [progress, setProgress] = useState(0);
  const [bossHp, setBossHp] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [bossScreen, setBossScreen] = useState({ x: 0, y: 0, scale: 0.2, visible: false });
  const [bossPet, setBossPet] = useState<PetCatalogEntry | null>(null);
  const [showTip, setShowTip] = useState(true);
  const [bossBanner, setBossBanner] = useState<string | null>(null);
  const [koBanner, setKoBanner] = useState(false);
  const [subPhase, setSubPhase] = useState<SubPhase>('run');
  const [moveHint, setMoveHint] = useState<'left' | 'right' | null>(null);

  const nextId = () => { idCounterRef.current += 1; return idCounterRef.current; };

  const isFeverActive = () => performance.now() < feverUntilRef.current;

  const incrementCombo = () => {
    comboRef.current += 1;
    maxComboRef.current = Math.max(maxComboRef.current, comboRef.current);
    lastHitTimeRef.current = performance.now();
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

  const setMoveDir = (dir: 'left' | 'right' | null) => {
    moveDirRef.current = dir;
    setMoveHint(dir);
  };

  const spawnProjectile = (cam: number) => {
    const pool = projectilesRef.current;
    let slot = pool.find((p) => !p.active);
    if (!slot) {
      // recycle furthest / oldest-ish inactive preference failed — reuse first
      slot = pool[0];
    }
    const feverActive = isFeverActive();
    slot.active = true;
    slot.x = playerXRef.current;
    slot.z = cam + 18;
    slot.speed = BULLET_SPEED;
    slot.grade = feverActive ? 'great' : 'good';
    slot.damage = 0;
  };

  const initGame = () => {
    mathGatesRef.current = [];
    enemiesRef.current = [];
    projectilesRef.current = createProjectilePool();
    scrollRef.current = 0;
    stageRef.current = 0;
    subPhaseRef.current = 'run';
    playerXRef.current = 50;
    moveDirRef.current = null;
    bossSpawnedRef.current = false;
    bossDefeatedRef.current = false;
    bossZRef.current = VIEW_DEPTH + 1000;
    bossXRef.current = 50;
    bossHpRef.current = 0;
    bossMaxHpRef.current = BOSSES[0].hp;
    enemySpawnTimerRef.current = 1800;
    // First gate early in Stage 1 — continuous 60s clock is set only once below
    gateSpawnTimerRef.current = 1800;
    autoFireTimerRef.current = BALANCE.autoFireMs * 0.4;
    lastHitTimeRef.current = performance.now();
    // ONLY set once at true game start — stage/boss transitions must NEVER reset this
    if (!gameStartMsRef.current) {
      gameStartMsRef.current = performance.now();
    }
    setBossHp(0);
    setPhaseLabel(STAGE_NAMES[0]);
    setBossBanner(null);
    setKoBanner(false);
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
    bossMaxHpRef.current = boss.hp;
    setBossHp(boss.hp);
    bossXRef.current = 50;
    setPhaseLabel(boss.title);
    setSubPhase('boss');
    bossHopTimerRef.current = 900;
    enemiesRef.current = [];
    mathGatesRef.current = mathGatesRef.current.filter((g) => g.resolved && (g.fade ?? 0) > 0);
    projectilesRef.current.forEach((p) => { p.active = false; });
    bossZRef.current = scrollRef.current + BOSS_SPAWN_DIST;
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

  const updateBossHop = (delta: number) => {
    bossHopTimerRef.current -= delta;
    if (bossHopTimerRef.current <= 0) {
      bossHopTimerRef.current = 880 + Math.random() * 320;
      const next = BOSS_X_MIN + Math.random() * (BOSS_X_MAX - BOSS_X_MIN);
      bossXRef.current = next;
    }
  };

  const applyHitToEnemy = (e: Enemy, grade: ShotGrade, dmg: number, w: number, h: number, cam: number) => {
    incrementCombo();
    e.hp -= dmg;
    e.hitFlash = 6;
    const dist = e.z - cam;
    const screen = worldToScreen(e.x, dist, w, h);
    if (screen) {
      addFloatText(GRADE_LABELS[grade], screen.x, screen.y - 20, GRADE_COLORS[grade]);
      addParticles(screen.x, screen.y, '#f43f5e', grade === 'perfect' ? 12 : 6);
      if (e.hp <= 0) {
        triggerImpact('soft');
        addParticles(screen.x, screen.y, '#fbbf24', 20);
        spawnMagnetFeather(screen.x, screen.y, e.reward);
        addFloatText(`+${e.reward}`, screen.x, screen.y + 14, '#fbbf24');
      } else {
        addFloatText(`-${dmg}`, screen.x, screen.y - 4, '#ef4444');
      }
    }
    if (e.hp <= 0) {
      feathersRef.current += e.reward;
      setFeathers(feathersRef.current);
    }
  };

  const applyHitToBoss = (grade: ShotGrade, dmg: number, w: number, h: number, cam: number) => {
    if (bossHpRef.current <= 0 || bossDefeatedRef.current) return;
    incrementCombo();
    bossHpRef.current = Math.max(0, bossHpRef.current - dmg);
    setBossHp(bossHpRef.current);
    const bossDist = bossZRef.current - cam;
    const bScreen = worldToScreen(bossXRef.current, bossDist, w, h);
    shakeRef.current = Math.max(shakeRef.current, grade === 'perfect' ? 10 : 6);
    if (bScreen) {
      addParticles(bScreen.x, bScreen.y, '#a78bfa', grade === 'perfect' ? 14 : 8);
      addFloatText(GRADE_LABELS[grade], bScreen.x, bScreen.y - 18, GRADE_COLORS[grade]);
      addFloatText(`-${dmg}`, bScreen.x, bScreen.y - 4, '#f87171');
    }
    if (bossHpRef.current <= 0) {
      bossDefeatedRef.current = true;
      const boss = BOSSES[0];
      feathersRef.current += boss.reward;
      setFeathers(feathersRef.current);
      triggerImpact('hard');
      flashWhiteRef.current = Math.max(flashWhiteRef.current, 0.8);
      setKoBanner(true);
      addFloatText(`+${boss.reward} 羽毛！`, w * 0.5, h * 0.38, '#fbbf24');
      addFloatText('KO!', w * 0.5, h * 0.44, '#7dd3fc');
      if (bScreen) {
        addParticles(bScreen.x, bScreen.y, '#fbbf24', 40);
        spawnMagnetFeather(bScreen.x, bScreen.y, boss.reward);
      }
      // Do NOT finishGame — wait until 60s
    }
  };

  const settleGate = (
    gate: MathGate,
    px: number,
    playerY: number,
    apply: boolean,
  ) => {
    gate.resolved = true;
    gate.fade = 1;
    if (!apply) return;
    const op = gate.op;
    // Skip no-op gates (e.g. -0 after fully degraded)
    if (op.type === 'sub' && op.value <= 0) {
      addFloatText('閃過!', px, playerY - 32, '#7dd3fc');
      return;
    }
    if (op.type === 'mul' && op.value <= 1) {
      addFloatText('無效門', px, playerY - 32, '#94a3b8');
      return;
    }
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
    if (feathersRef.current <= 0) finishGame();
  };

  const applyHitToGate = (gate: MathGate, w: number, h: number, cam: number) => {
    const before = gate.op.label;
    gate.op = degradeGateOnHit(gate.op);
    gate.hp = Math.max(0, gate.hp - 1);
    gate.hitFlash = 6;
    const dist = gate.z - cam;
    const screen = worldToScreen(gate.x, dist, w, h);
    if (screen) {
      addFloatText(`${before}→${gate.op.label}`, screen.x, screen.y - 22, '#fde68a');
      addParticles(screen.x, screen.y, '#38bdf8', 8);
    }
    if (gate.hp <= 0) {
      const px = worldToScreen(playerXRef.current, 0, w, h)?.x ?? w * 0.5;
      const playerY = h * PLAYER_Y_RATIO;
      const aligned = Math.abs(playerXRef.current - gate.x) < GATE_HIT_WIDTH;
      settleGate(gate, px, playerY, aligned);
    }
  };

  const resolveProjectileHits = (w: number, h: number, frame: number) => {
    const cam = scrollRef.current;
    const feverActive = isFeverActive();

    projectilesRef.current.forEach((proj) => {
      if (!proj.active) return;
      proj.z += (SCROLL_SPEED + proj.speed) * frame;
      const pDist = proj.z - cam;

      if (pDist > COMBAT_RANGE + 40 || pDist < -20) {
        proj.active = false;
        return;
      }

      if (subPhaseRef.current === 'boss' && bossHpRef.current > 0 && !bossDefeatedRef.current) {
        const bossDist = bossZRef.current - cam;
        if (Math.abs(pDist - bossDist) <= PROJ_HIT_Z
          && Math.abs(proj.x - bossXRef.current) < BALANCE.projectileHitWidth) {
          const grade = gradeShot(bossDist, COMBAT_RANGE);
          const dmg = shotDamage(0, grade, feverActive);
          proj.active = false;
          proj.grade = grade;
          proj.damage = dmg;
          applyHitToBoss(grade, dmg, w, h, cam);
          return;
        }
      }

      let hitSomething = false;
      for (const e of enemiesRef.current) {
        if (e.hp <= 0) continue;
        const dist = e.z - cam;
        if (Math.abs(pDist - dist) > PROJ_HIT_Z) continue;
        if (Math.abs(proj.x - e.x) >= BALANCE.projectileHitWidth) continue;
        const grade = gradeShot(dist, COMBAT_RANGE);
        const dmg = shotDamage(0, grade, feverActive);
        proj.active = false;
        proj.grade = grade;
        proj.damage = dmg;
        applyHitToEnemy(e, grade, dmg, w, h, cam);
        hitSomething = true;
        break;
      }
      if (hitSomething) return;

      // Projectiles also reshape math gates
      if (subPhaseRef.current === 'run') {
        for (const gate of mathGatesRef.current) {
          if (gate.resolved || gate.hp <= 0) continue;
          const dist = gate.z - cam;
          if (Math.abs(pDist - dist) > PROJ_HIT_Z) continue;
          if (Math.abs(proj.x - gate.x) >= GATE_HIT_WIDTH) continue;
          proj.active = false;
          applyHitToGate(gate, w, h, cam);
          break;
        }
      }
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

      // Combo timeout
      if (comboRef.current > 0
        && performance.now() - lastHitTimeRef.current > BALANCE.comboTimeoutMs) {
        resetCombo();
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
      const now = performance.now();

      // Preferred elapsed clock
      const elapsed = Math.min(TOTAL_GAME_SEC, (now - gameStartMsRef.current) / 1000);
      const nextTimeLeft = Math.max(0, Math.ceil(TOTAL_GAME_SEC - elapsed));
      if (nextTimeLeft !== timeLeftRef.current) {
        timeLeftRef.current = nextTimeLeft;
        setTimeLeft(nextTimeLeft);
      }
      if (elapsed >= TOTAL_GAME_SEC) {
        finishGame();
        return;
      }

      const stageIdx = stageIndexFromElapsed(elapsed);
      stageRef.current = stageIdx;

      if (stageIdx !== lastSegmentUiRef.current && elapsed < BALANCE.bossAppearElapsedSec) {
        lastSegmentUiRef.current = stageIdx;
        setPhaseLabel(STAGE_NAMES[stageIdx] ?? STAGE_NAMES[0]);
      }

      const overallProgress = Math.min(1, elapsed / TOTAL_GAME_SEC);
      if (Math.abs(overallProgress - lastUiSyncRef.current) > 0.008) {
        lastUiSyncRef.current = overallProgress;
        setProgress(overallProgress);
      }

      // Free X movement (接羽毛 sticky)
      const speed = BALANCE.playerMoveSpeed;
      if (moveDirRef.current === 'left') {
        playerXRef.current = Math.max(BALANCE.playerXMin, playerXRef.current - speed * frame);
      } else if (moveDirRef.current === 'right') {
        playerXRef.current = Math.min(BALANCE.playerXMax, playerXRef.current + speed * frame);
      }
      const playerScreen = worldToScreen(playerXRef.current, 0, w, h);
      const px = playerScreen?.x ?? w * 0.5;

      scrollRef.current += SCROLL_SPEED * frame;

      if (!bossSpawnedRef.current && elapsed >= BALANCE.bossAppearElapsedSec) {
        beginBossFight();
      }

      if (subPhaseRef.current === 'boss' && bossHpRef.current > 0 && !bossDefeatedRef.current) {
        if (bossIntroRef.current <= 0) {
          bossZRef.current -= BOSS_APPROACH_SPEED * frame;
        }
        updateBossHop(delta);
      }

      // Spawns
      const spawnCfg = spawnIntervals(elapsed);
      if (spawnCfg && subPhaseRef.current === 'run') {
        enemySpawnTimerRef.current -= delta;
        if (enemySpawnTimerRef.current <= 0) {
          const x = BALANCE.playerXMin + 8 + Math.random() * (BALANCE.playerXMax - BALANCE.playerXMin - 16);
          enemiesRef.current.push({
            id: nextId(),
            x,
            z: cam + VIEW_DEPTH + 40,
            hp: BALANCE.enemyHp,
            maxHp: BALANCE.enemyHp,
            speed: 1,
            emoji: '😤',
            reward: BALANCE.enemyReward,
            state: 'far',
          });
          enemySpawnTimerRef.current = spawnCfg.enemyMs;
        }
        if (spawnCfg.gateMs) {
          gateSpawnTimerRef.current -= delta;
          if (gateSpawnTimerRef.current <= 0) {
            const { ops, xs } = generateFreeGates(feathersRef.current, stageIdx);
            const baseZ = cam + VIEW_DEPTH + 60;
            ops.forEach((op, i) => {
              mathGatesRef.current.push({
                id: nextId(),
                z: baseZ,
                x: xs[i] ?? 50,
                op,
                hp: GATE_MAX_HP,
                maxHp: GATE_MAX_HP,
                resolved: false,
              });
            });
            gateSpawnTimerRef.current = spawnCfg.gateMs;
          }
        }
      }

      // Auto-fire
      const fireInterval = feverActive
        ? BALANCE.autoFireMs * BALANCE.feverFireMult
        : BALANCE.autoFireMs;
      autoFireTimerRef.current -= delta;
      if (autoFireTimerRef.current <= 0 && bossIntroRef.current <= 0) {
        spawnProjectile(cam);
        autoFireTimerRef.current = fireInterval;
      }

      resolveProjectileHits(w, h, frame);

      let anyWarning = false;

      // Enemies + collision
      if (subPhaseRef.current === 'run' || subPhaseRef.current === 'boss') {
        enemiesRef.current.forEach((e) => {
          if (e.hp <= 0) return;
          const dist = e.z - cam;
          e.state = enemyStateFromDist(dist);
          if (e.state === 'warning' || e.state === 'attacking') anyWarning = true;

          if (dist <= BALANCE.attackDistance && Math.abs(e.x - playerXRef.current) < BALANCE.playerHitWidth) {
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
            return;
          }
          if (dist < -50) e.hp = 0;
        });
        enemiesRef.current = enemiesRef.current.filter((e) => e.hp > 0);
      }

      // Gates (free X) — approach with scroll; settle when passing player
      if (subPhaseRef.current === 'run') {
        mathGatesRef.current.forEach((gate) => {
          if (gate.resolved) {
            if (gate.fade != null && gate.fade > 0) gate.fade = Math.max(0, gate.fade - delta * 0.0045);
            return;
          }
          const dist = gate.z - cam;
          if (dist <= GATE_PASS_DEPTH) {
            const aligned = Math.abs(playerXRef.current - gate.x) < GATE_HIT_WIDTH;
            settleGate(gate, px, playerY, aligned);
          }
        });
        mathGatesRef.current = mathGatesRef.current.filter((g) => !g.resolved || (g.fade != null && g.fade > 0.02));
      }

      // Boss collision (knock back, don't end)
      if (subPhaseRef.current === 'boss' && bossHpRef.current > 0 && !bossDefeatedRef.current && bossIntroRef.current <= 0) {
        const bossDist = bossZRef.current - cam;
        if (bossDist <= BALANCE.attackDistance + 20) anyWarning = true;
        if (bossDist <= BALANCE.attackDistance
          && Math.abs(bossXRef.current - playerXRef.current) < BALANCE.playerHitWidth) {
          const loss = Math.min(feathersRef.current, BALANCE.bossCollisionLoss);
          feathersRef.current = Math.max(0, feathersRef.current - loss);
          setFeathers(feathersRef.current);
          resetCombo();
          triggerImpact('fail');
          bossZRef.current += 90; // knock back
          addParticles(px, playerY, '#ef4444', 28);
          addFloatText(`-${loss}`, px, playerY - 28, '#ef4444');
          showToast('被對手撞到');
          if (feathersRef.current <= 0) finishGame();
        }
      }

      warningCloseRef.current = anyWarning;

      {
        const bossDist = bossZRef.current - cam;
        const bScreen = worldToScreen(bossXRef.current, bossDist, w, h);
        if (bScreen && bossDist > -60 && bossDist < VIEW_DEPTH + 120 && bossHpRef.current > 0
          && subPhaseRef.current !== 'ended' && !bossDefeatedRef.current) {
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

      // ── Draw ──
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

      // Warning glows under close enemies
      enemiesRef.current.forEach((e) => {
        if (e.hp <= 0) return;
        const dist = e.z - cam;
        if (dist < 140 && dist > 0) {
          drawWarningGlow(ctx, e.x, w, h, horizonY, theme.accent, 0.18 + (1 - dist / 140) * 0.2);
        }
      });

      type DrawItem = { kind: 'gate' | 'enemy' | 'proj' | 'boss'; dist: number; gate?: MathGate; enemy?: Enemy; proj?: Projectile };
      const drawQueue: DrawItem[] = [];

      mathGatesRef.current.forEach((gate) => {
        const dist = gate.z - cam;
        if (gate.resolved && (gate.fade == null || gate.fade <= 0.02)) return;
        if (dist > -60 && dist < VIEW_DEPTH + 40) drawQueue.push({ kind: 'gate', dist, gate });
      });
      enemiesRef.current.forEach((enemy) => {
        if (enemy.hp <= 0) return;
        const dist = enemy.z - cam;
        if (dist > -20 && dist < VIEW_DEPTH + 40) drawQueue.push({ kind: 'enemy', dist, enemy });
      });
      projectilesRef.current.forEach((proj) => {
        if (!proj.active) return;
        const dist = proj.z - cam;
        if (dist > 0 && dist < VIEW_DEPTH) drawQueue.push({ kind: 'proj', dist, proj });
      });
      if (subPhaseRef.current === 'boss' && bossHpRef.current > 0 && !bossDefeatedRef.current) {
        const bossDist = bossZRef.current - cam;
        if (bossDist > -40 && bossDist < VIEW_DEPTH + 80) {
          drawQueue.push({ kind: 'boss', dist: bossDist });
        }
      }

      const kindOrder = { proj: 0, enemy: 1, boss: 1, gate: 2 } as const;
      drawQueue.sort((a, b) => Math.abs(a.dist - b.dist) < 12
        ? kindOrder[a.kind] - kindOrder[b.kind]
        : b.dist - a.dist);

      drawQueue.forEach((item) => {
        if (item.kind === 'gate' && item.gate) {
          const { gate, dist } = item;
          const fadeMul = gate.resolved ? Math.max(0, gate.fade ?? 0) : 1;
          const screen = worldToScreen(gate.x, dist, w, h);
          if (!screen) return;
          const op = gate.op;
          const bad = isBadOp(op);
          const good = isGoodOp(op);
          const aligned = !gate.resolved
            && Math.abs(playerXRef.current - gate.x) < GATE_HIT_WIDTH
            && dist < 130;
          ctx.save();
          ctx.globalAlpha = Math.min(0.95, 0.48 + screen.progress * 0.5) * fadeMul;
          if (gate.hitFlash && gate.hitFlash > 0) {
            ctx.translate(screen.x, screen.y);
            ctx.scale(1.08, 1.08);
            ctx.translate(-screen.x, -screen.y);
            gate.hitFlash -= 1;
          }
          const rw = 88 * screen.scale;
          const rh = 78 * screen.scale;
          const rx = screen.x - rw / 2 + shakeX;
          const ry = screen.y - rh * 0.55;
          ctx.fillStyle = bad
            ? 'rgba(185,28,28,0.55)'
            : good
              ? 'rgba(180,83,9,0.5)'
              : op.isRecovery
                ? 'rgba(16,185,129,0.5)'
                : 'rgba(30,64,175,0.5)';
          ctx.strokeStyle = aligned ? '#fff' : bad ? '#fca5a5' : good ? '#fde68a' : '#93c5fd';
          ctx.lineWidth = Math.max(2, (aligned ? 4 : 3) * screen.scale);
          if (aligned) { ctx.shadowColor = '#fff'; ctx.shadowBlur = 12 * screen.scale; }
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
          ctx.fillText(op.label, screen.x + shakeX, screen.y - 6 * screen.scale);
          // HP pips
          if (!gate.resolved && gate.maxHp > 0) {
            const pip = Math.max(4, 6 * screen.scale);
            const gap = pip + 3;
            const totalW = gate.maxHp * gap - 3;
            let sx = screen.x - totalW / 2 + shakeX;
            for (let i = 0; i < gate.maxHp; i++) {
              ctx.fillStyle = i < gate.hp ? '#f87171' : 'rgba(15,23,42,0.7)';
              ctx.beginPath();
              ctx.arc(sx + pip / 2, screen.y + 16 * screen.scale, pip / 2, 0, Math.PI * 2);
              ctx.fill();
              sx += gap;
            }
          }
          ctx.restore();
        } else if (item.kind === 'enemy' && item.enemy) {
          const { enemy, dist } = item;
          const screen = worldToScreen(enemy.x, dist, w, h);
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
        } else if (item.kind === 'boss') {
          // Canvas fallback silhouette under pet overlay
          const screen = worldToScreen(bossXRef.current, item.dist, w, h);
          if (!screen || bossPet) return;
          const boss = BOSSES[0];
          ctx.save();
          ctx.globalAlpha = Math.min(1, 0.4 + screen.progress * 0.9);
          ctx.font = `${Math.max(28, Math.floor(48 * screen.scale))}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillText(boss.emoji, screen.x + shakeX, screen.y);
          ctx.restore();
        } else if (item.proj) {
          const screen = worldToScreen(item.proj.x, item.dist, w, h);
          if (!screen) return;
          const grade = item.proj.grade ?? 'good';
          drawShuttlecock(ctx, screen.x + shakeX, screen.y + shakeY, screen.scale, grade, Math.min(1, 0.22 + screen.progress * 0.95));
        }
      });

      const playerRenderX = px + shakeX;
      const playerRenderY = playerY + shakeY;

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

      if (warningCloseRef.current || vignetteRef.current > 0.02) {
        const strength = Math.max(vignetteRef.current, warningCloseRef.current ? 0.28 : 0);
        const g = ctx.createRadialGradient(w * 0.5, h * 0.5, h * 0.2, w * 0.5, h * 0.5, h * 0.85);
        g.addColorStop(0, 'rgba(0,0,0,0)');
        g.addColorStop(1, `rgba(127,29,29,${Math.min(0.55, strength)})`);
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
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        setMoveDir('left');
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        setMoveDir('right');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const setDirFromClientX = (clientX: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = clientX - rect.left;
    setMoveDir(x < rect.width / 2 ? 'left' : 'right');
  };

  const currentBossConfig = BOSSES[0];
  const bossVisible = bossScreen.visible && !!bossPet && bossHp > 0 && !koBanner;
  const inBoss = subPhase === 'boss' || progress * TOTAL_GAME_SEC >= BALANCE.bossAppearElapsedSec;

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full min-h-[500px] bg-slate-950 touch-none select-none overscroll-none"
      style={{ touchAction: 'none' }}
      onPointerDown={(e) => {
        swipeStartRef.current = { x: e.clientX, y: e.clientY };
        setDirFromClientX(e.clientX);
      }}
      onPointerMove={(e) => {
        if (swipeStartRef.current) setDirFromClientX(e.clientX);
      }}
      onPointerUp={(e) => {
        const start = swipeStartRef.current;
        swipeStartRef.current = null;
        if (!start) return;
        const dx = e.clientX - start.x;
        const dy = e.clientY - start.y;
        if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
          setMoveDir(dx > 0 ? 'right' : 'left');
        }
      }}
      onTouchStart={(e) => {
        if (e.touches[0]) setDirFromClientX(e.touches[0].clientX);
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
        <div className="h-1.5 bg-slate-800/80 rounded-full overflow-hidden border border-slate-700/50">
          <div
            className={cn(
              'h-full rounded-full transition-[width] duration-150',
              inBoss
                ? 'bg-gradient-to-r from-rose-500 to-amber-400'
                : 'bg-gradient-to-r from-emerald-500 via-sky-400 to-violet-400',
            )}
            style={{ width: `${Math.round(Math.min(100, progress * 100))}%` }}
          />
        </div>
      </div>

      {toast && (
        <div className="absolute top-[72px] inset-x-0 z-30 flex justify-center pointer-events-none">
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
            style={{ borderColor: currentBossConfig.color, background: 'rgba(2,6,23,0.82)' }}
          >
            <div className="text-[10px] font-bold text-slate-400 tracking-widest mb-1">對決開始</div>
            <div className="text-lg sm:text-xl font-black" style={{ color: currentBossConfig.color }}>{bossBanner}</div>
          </motion.div>
        </div>
      )}

      {koBanner && (
        <div className="absolute top-[30%] inset-x-0 z-40 flex justify-center pointer-events-none">
          <motion.div
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            className="px-5 py-2 rounded-xl border border-amber-400/60 bg-slate-950/80 text-amber-300 text-base font-black shadow-xl"
          >
            KO! · 繼續撐到終點
          </motion.div>
        </div>
      )}

      {showTip && (
        <div className="absolute top-[76px] inset-x-0 z-10 flex justify-center pointer-events-none">
          <span className="text-[9px] font-bold text-slate-400 bg-slate-950/70 px-2.5 py-1 rounded-full border border-slate-700/50">
            左右移動 · 自動射擊敵人／數字門
          </span>
        </div>
      )}

      <div
        className="absolute bottom-0 inset-x-0 z-30 flex justify-between items-end pointer-events-none"
        style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
      >
        <button
          type="button"
          aria-label="向左移動"
          onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); setMoveDir('left'); }}
          className={cn(
            'pointer-events-auto ml-3 mb-2 w-[72px] h-[72px] sm:w-16 sm:h-16 rounded-full border-2 flex items-center justify-center active:scale-95 transition-all shadow-2xl',
            moveHint === 'left'
              ? 'bg-sky-500/40 border-sky-300 text-sky-100 ring-2 ring-sky-400/60'
              : 'bg-slate-900/85 border-slate-600 text-white',
          )}
        >
          <ChevronLeft className="w-10 h-10 sm:w-8 sm:h-8" />
        </button>
        <button
          type="button"
          aria-label="向右移動"
          onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); setMoveDir('right'); }}
          className={cn(
            'pointer-events-auto mr-3 mb-2 w-[72px] h-[72px] sm:w-16 sm:h-16 rounded-full border-2 flex items-center justify-center active:scale-95 transition-all shadow-2xl',
            moveHint === 'right'
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
