import React, { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import X from 'lucide-react/dist/esm/icons/x';
import Play from 'lucide-react/dist/esm/icons/play';
import Loader2 from 'lucide-react/dist/esm/icons/loader-2';
import ChevronLeft from 'lucide-react/dist/esm/icons/chevron-left';
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right';
import ShoppingCart from 'lucide-react/dist/esm/icons/shopping-cart';
import * as gasApi from '../../lib/gasApi';
import { useAuth } from '../../context/AuthContext';
import { getAvatarUrl, cn } from '../../lib/utils';

interface MiniGameModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerName?: string;
  playerAvatar?: string;
  onSuccess?: () => void;
}

type ItemType = 'normal' | 'gold' | 'super' | 'bomb' | 'rock';

interface FallingItem {
  id: number;
  x: number; // percentage (0 - 100)
  y: number; // pixels from top
  speed: number;
  type: ItemType;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
}

interface FloatingText {
  id: number;
  text: string;
  x: number;
  y: number;
  color: string;
  alpha: number;
}

const GameFeatherIcon: React.FC<{ color: string; glow?: boolean; className?: string }> = ({ color, glow = false, className = '' }) => {
  return (
    <svg
      viewBox="0 0 24 32"
      className={className}
      style={{
        width: '16px',
        height: '20px',
        transform: 'rotate(-15deg)',
        filter: glow ? `drop-shadow(0 0 4px ${color})` : 'none',
        display: 'inline-block',
        verticalAlign: 'middle',
      }}
    >
      <path
        d="M 12 26 Q 6 16 9 4 Q 12 0 15 4 Q 18 16 12 26 Z"
        fill={color}
      />
      <path
        d="M 12 27 L 12 5"
        stroke="#ffffff"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
};

const GameBombIcon: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      style={{
        width: '18px',
        height: '18px',
        filter: 'drop-shadow(0 0 4px #f43f5e)',
        display: 'inline-block',
        verticalAlign: 'middle',
      }}
    >
      <circle cx="12" cy="13" r="9" fill="#f43f5e" />
      <circle cx="12" cy="13" r="7" fill="#090d16" />
      <rect x="10.5" y="2" width="3" height="3" fill="#64748b" />
      <circle cx="13.5" cy="1.5" r="2" fill="#fbbf24" style={{ filter: 'drop-shadow(0 0 2px #fbbf24)' }} />
    </svg>
  );
};

const GameRockIcon: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      style={{
        width: '18px',
        height: '18px',
        filter: 'drop-shadow(0 0 4px #64748b)',
        display: 'inline-block',
        verticalAlign: 'middle',
      }}
    >
      <path
        d="M 6 18 L 3 12 L 6 6 L 12 3 L 18 6 L 21 12 L 18 18 L 12 21 Z"
        fill="#64748b"
      />
      <path
        d="M 9 9 L 12 12 L 15 10"
        stroke="#475569"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
};

let audioCtx: AudioContext | null = null;
const playSynthSound = (type: 'catch' | 'gold' | 'super' | 'hit' | 'dizzy') => {
  try {
    if (typeof window === 'undefined') return;
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    
    if (!audioCtx) {
      audioCtx = new AudioContextClass();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    const now = audioCtx.currentTime;
    
    if (type === 'catch') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.exponentialRampToValueAtTime(800, now + 0.08);
      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.start(now);
      osc.stop(now + 0.08);
    } else if (type === 'gold') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(750, now);
      osc.frequency.exponentialRampToValueAtTime(1050, now + 0.12);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.start(now);
      osc.stop(now + 0.12);
    } else if (type === 'super') {
      // Little arpeggio
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.setValueAtTime(659.25, now + 0.04);
      osc.frequency.setValueAtTime(783.99, now + 0.08);
      osc.frequency.setValueAtTime(1046.50, now + 0.12);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.20);
      osc.start(now);
      osc.stop(now + 0.20);
    } else if (type === 'hit') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.12);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.start(now);
      osc.stop(now + 0.12);
    } else if (type === 'dizzy') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(110, now);
      osc.frequency.exponentialRampToValueAtTime(30, now + 0.25);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.start(now);
      osc.stop(now + 0.25);
    }
  } catch (e) {
    // Ignore audio initialization errors
  }
};

export const MiniGameModal: React.FC<MiniGameModalProps> = ({
  isOpen,
  onClose,
  playerName = '球員',
  playerAvatar = '',
  onSuccess,
}) => {
  const { currentUser } = useAuth();

  // API Eligibility Check
  const { data: eligibility, refetch: refetchEligibility } = useQuery({
    queryKey: ['minigameStatus', currentUser?.email],
    queryFn: () => gasApi.fetchMiniGameStatus(currentUser?.email || ''),
    enabled: isOpen && !!currentUser?.email,
  });

  // Game States
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'ended'>('idle');
  const [score, setScore] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number>(30); // 30 seconds
  const [combo, setCombo] = useState<number>(0); // 連擊數
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitResult, setSubmitResult] = useState<any>(null);

  // Leaderboard States
  const [leaderboardTab, setLeaderboardTab] = useState<'weekly' | 'allTime'>('weekly');
  const [activeMainTab, setActiveMainTab] = useState<'rules' | 'leaderboard'>('rules');

  const { data: leaderboard, refetch: refetchLeaderboard } = useQuery({
    queryKey: ['minigameLeaderboard'],
    queryFn: () => gasApi.fetchMiniGameLeaderboard(),
    enabled: isOpen,
  });

  // References for Canvas and Game Loop
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cartDOMRef = useRef<HTMLDivElement>(null);
  
  const requestRef = useRef<number | null>(null);
  const itemsRef = useRef<FallingItem[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const comboRef = useRef<number>(0);
  
  const nextItemIdRef = useRef<number>(0);
  const nextParticleIdRef = useRef<number>(0);
  const floatingTextsRef = useRef<FloatingText[]>([]);
  const nextTextIdRef = useRef<number>(0);

  // Cart physics (stored in ref to prevent 60fps React state re-renders)
  const cartXRef = useRef<number>(50); // percentage (0 - 100)
  const dizzyTimeRef = useRef<number>(0); // remaining dizzy ms
  const [dizzyTimeLeft, setDizzyTimeLeft] = useState<number>(0);

  // Input states
  const cartDirectionRef = useRef<'left' | 'right' | null>(null);

  // Handle keyboard inputs
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'playing' || dizzyTimeRef.current > 0) return;
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        cartDirectionRef.current = 'left';
      }
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        cartDirectionRef.current = 'right';
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [gameState]);

  // Click / Touch direction control
  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (gameState !== 'playing' || dizzyTimeRef.current > 0 || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    if (clickX < rect.width / 2) {
      cartDirectionRef.current = 'left';
    } else {
      cartDirectionRef.current = 'right';
    }
  };

  const handleContainerTouch = (e: React.TouchEvent<HTMLDivElement>) => {
    // Prevent Safari rubber-banding screen bounce scroll
    if (e.cancelable) {
      e.preventDefault();
    }
    
    if (gameState !== 'playing' || dizzyTimeRef.current > 0 || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const touchX = e.touches[0].clientX - rect.left;
    if (touchX < rect.width / 2) {
      cartDirectionRef.current = 'left';
    } else {
      cartDirectionRef.current = 'right';
    }
  };

  // Spawn particles on catch
  const spawnParticles = (x: number, y: number, color: string, count = 10) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 4 + 1;
      particlesRef.current.push({
        id: nextParticleIdRef.current++,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1,
        color,
        size: Math.random() * 3 + 2,
        alpha: 1,
      });
    }
  };

  // Canvas drawing helpers
  const drawFeather = (ctx: CanvasRenderingContext2D, x: number, y: number, color: string, glow = false) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-Math.PI / 6); // tilted feather look
    
    if (glow) {
      ctx.shadowColor = color;
      ctx.shadowBlur = 10;
    }

    // Outer shape
    ctx.beginPath();
    ctx.moveTo(0, 10);
    ctx.quadraticCurveTo(-6, 0, -3, -12);
    ctx.quadraticCurveTo(0, -16, 3, -12);
    ctx.quadraticCurveTo(6, 0, 0, 10);
    ctx.fillStyle = color;
    ctx.fill();

    // Inner stem line
    ctx.beginPath();
    ctx.moveTo(0, 11);
    ctx.lineTo(0, -11);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.restore();
  };

  const drawBomb = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    ctx.save();
    ctx.translate(x, y);

    // Glowing warning outline
    ctx.shadowColor = '#f43f5e'; // Rose-500 warning neon glow
    ctx.shadowBlur = 12;

    // Red warning outer ring
    ctx.beginPath();
    ctx.arc(0, 2, 11, 0, Math.PI * 2);
    ctx.fillStyle = '#f43f5e';
    ctx.fill();

    // Reset shadow blur for the inner solid black body
    ctx.shadowBlur = 0;

    // Bomb body
    ctx.beginPath();
    ctx.arc(0, 2, 9, 0, Math.PI * 2);
    ctx.fillStyle = '#090d16';
    ctx.fill();

    // Fuse cap
    ctx.fillStyle = '#64748b';
    ctx.fillRect(-2, -9, 4, 3);

    // Spark
    ctx.shadowColor = '#fbbf24';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(2, -11, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = '#fbbf24';
    ctx.fill();

    ctx.restore();
  };

  const drawRock = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    ctx.save();
    ctx.translate(x, y);

    // Glowing outline for hazard visibility
    ctx.shadowColor = '#64748b'; // Slate gray glow
    ctx.shadowBlur = 8;

    // Rock body (jagged polygon shape)
    ctx.beginPath();
    ctx.moveTo(-10, -6);
    ctx.lineTo(-2, -12);
    ctx.lineTo(8, -8);
    ctx.lineTo(11, 2);
    ctx.lineTo(5, 10);
    ctx.lineTo(-6, 9);
    ctx.lineTo(-11, 2);
    ctx.closePath();
    
    ctx.fillStyle = '#475569'; // Slate-600
    ctx.fill();

    // Dark shading details for texture
    ctx.shadowBlur = 0; // reset
    ctx.beginPath();
    ctx.moveTo(-10, -6);
    ctx.lineTo(0, 0);
    ctx.lineTo(5, 10);
    ctx.strokeStyle = '#334155'; // Slate-700
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Highlights
    ctx.beginPath();
    ctx.moveTo(-2, -12);
    ctx.lineTo(2, -4);
    ctx.lineTo(8, -8);
    ctx.strokeStyle = '#94a3b8'; // Slate-400
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.restore();
  };

  // Start game
  const startGame = () => {
    // Force initialize/resume AudioContext inside user click event to unlock iOS Safari audio
    try {
      if (typeof window !== 'undefined') {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          if (!audioCtx) {
            audioCtx = new AudioContextClass();
          }
          if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume();
          }
        }
      }
    } catch (err) {
      // Ignore audio init errors
    }

    setScore(0);
    setTimeLeft(30);
    setCombo(0);
    comboRef.current = 0;
    cartXRef.current = 50;
    setGameState('playing');
    setSubmitResult(null);
    setDizzyTimeLeft(0);
    dizzyTimeRef.current = 0;
    itemsRef.current = [];
    particlesRef.current = [];
    floatingTextsRef.current = [];
    nextItemIdRef.current = 0;
    nextParticleIdRef.current = 0;
    nextTextIdRef.current = 0;
    cartDirectionRef.current = null;
  };

  // Optimized Game loop
  useEffect(() => {
    if (gameState !== 'playing') {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      return;
    }

    let lastTime = performance.now();
    let spawnTimer = 0;
    let secondsTimer = 0;

    const gameStep = (time: number) => {
      const delta = time - lastTime;
      lastTime = time;

      // Freeze the game loop if the browser tab is hidden (lock screen, phone call, tab switch)
      if (typeof document !== 'undefined' && document.hidden) {
        requestRef.current = requestAnimationFrame(gameStep);
        return;
      }

      const container = containerRef.current;
      const canvas = canvasRef.current;
      if (!container || !canvas) {
        requestRef.current = requestAnimationFrame(gameStep);
        return;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // 1. Sync canvas size with container size
      if (canvas.width !== container.clientWidth || canvas.height !== container.clientHeight) {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
      }

      const width = canvas.width;
      const height = canvas.height;

      // 2. Update Dizzy stun
      if (dizzyTimeRef.current > 0) {
        dizzyTimeRef.current = Math.max(0, dizzyTimeRef.current - delta);
        setDizzyTimeLeft(Math.ceil(dizzyTimeRef.current / 1000));
        if (dizzyTimeRef.current === 0) {
          cartDirectionRef.current = null;
        }
      }

      // 3. Move Cart
      if (dizzyTimeRef.current <= 0) {
        const speed = 0.85; // percentage per frame
        if (cartDirectionRef.current === 'left') {
          cartXRef.current = Math.max(5, cartXRef.current - speed * (delta / 16));
        } else if (cartDirectionRef.current === 'right') {
          cartXRef.current = Math.min(95, cartXRef.current + speed * (delta / 16));
        }
      }

      // Update cart element style directly (Bypass React state rendering)
      if (cartDOMRef.current) {
        cartDOMRef.current.style.left = `${cartXRef.current}%`;
        
        // GPU-accelerated tilt based on direction (0% CPU impact)
        let rotation = 0;
        if (dizzyTimeRef.current <= 0) {
          if (cartDirectionRef.current === 'left') rotation = -4;
          else if (cartDirectionRef.current === 'right') rotation = 4;
        }
        cartDOMRef.current.style.transform = `translateX(-50%) rotate(${rotation}deg)`;
      }

      // 4. Game Clock & Speed Level calculation
      secondsTimer += delta;
      if (secondsTimer >= 1000) {
        secondsTimer -= 1000;
        setTimeLeft(prev => {
          if (prev <= 1) {
            setGameState('ended');
            return 0;
          }
          return prev - 1;
        });
      }

      // 10s intervals (30s game)
      // Level 1: 30 - 21s (timeLeft > 20)
      // Level 2: 20 - 11s (timeLeft <= 20 && timeLeft > 10)
      // Level 3: 10 - 1s (timeLeft <= 10)
      let level = 1;
      let spawnInterval = 600;
      let speedMultiplier = 1.0;
      
      if (timeLeft <= 10) {
        level = 3;
        spawnInterval = 380;
        speedMultiplier = 1.7;
      } else if (timeLeft <= 20) {
        level = 2;
        spawnInterval = 450;
        speedMultiplier = 1.35;
      }

      // 5. Spawn items
      spawnTimer += delta;
      if (spawnTimer >= spawnInterval) {
        spawnTimer = 0;
        
        // Staged spawn count
        const spawnCount = (() => {
          const r = Math.random();
          if (level === 1) {
            // Phase 1: 70% 1, 30% 2
            return r < 0.70 ? 1 : 2;
          } else if (level === 2) {
            // Phase 2: 50% 1, 30% 2, 20% 3
            if (r < 0.50) return 1;
            if (r < 0.80) return 2;
            return 3;
          } else {
            // Phase 3: 30% 1, 20% 2, 30% 3, 20% 4
            if (r < 0.30) return 1;
            if (r < 0.50) return 2;
            if (r < 0.80) return 3;
            return 4;
          }
        })();

        // Pre-roll item types to enforce guaranteed catchable item (low-bound logic)
        const rollItemType = (lvl: number): ItemType => {
          const rand = Math.random();
          if (lvl === 1) {
            // Level 1: Safe, Low Reward (Beneficial 80% [72% Normal, 7% Gold, 1% Super], Hazard 20% [15% Rock, 5% Bomb])
            if (rand < 0.05) return 'bomb';
            else if (rand < 0.20) return 'rock';
            else if (rand < 0.21) return 'super';
            else if (rand < 0.28) return 'gold';
            return 'normal';
          } else if (lvl === 2) {
            // Level 2: Medium Risk, Medium Reward (Beneficial 65% [42% Normal, 18% Gold, 5% Super], Hazard 35% [25% Rock, 10% Bomb])
            if (rand < 0.10) return 'bomb';
            else if (rand < 0.35) return 'rock';
            else if (rand < 0.40) return 'super';
            else if (rand < 0.58) return 'gold';
            return 'normal';
          } else {
            // Level 3: High Risk, High Reward (Beneficial 50% [10% Normal, 25% Gold, 15% Super], Hazard 50% [30% Rock, 20% Bomb])
            if (rand < 0.20) return 'bomb';
            else if (rand < 0.50) return 'rock';
            else if (rand < 0.65) return 'super';
            else if (rand < 0.90) return 'gold';
            return 'normal';
          }
        };

        const rollBeneficialType = (): ItemType => {
          const rand = Math.random();
          if (rand < 0.15) {
            return 'super';
          }
          if (rand < 0.50) {
            return 'gold';
          }
          return 'normal';
        };

        const itemTypes: ItemType[] = [];
        for (let i = 0; i < spawnCount; i++) {
          itemTypes.push(rollItemType(level));
        }

        // Guarantee at least one catchable item if all rolled as hazards
        const allHazards = itemTypes.every(t => t === 'bomb' || t === 'rock');
        if (allHazards && spawnCount > 0) {
          const forceIdx = Math.floor(Math.random() * spawnCount);
          itemTypes[forceIdx] = rollBeneficialType();
        }

        // Generate X coordinates with spacing (at least 15% distance apart)
        const getSeparatedXCoords = (count: number, lvl: number): number[] => {
          const coords: number[] = [];
          let min = 5;
          let max = 95;
          if (lvl === 1) { min = 30; max = 70; }
          else if (lvl === 2) { min = 15; max = 85; }

          for (let i = 0; i < count; i++) {
            let attempts = 0;
            let newX = 0;
            let valid = false;
            while (!valid && attempts < 100) {
              newX = Math.random() * (max - min) + min;
              valid = coords.every(existingX => Math.abs(existingX - newX) >= 15);
              attempts++;
            }
            coords.push(newX);
          }
          return coords;
        };

        const xCoordinates = getSeparatedXCoords(spawnCount, level);

        for (let i = 0; i < spawnCount; i++) {
          const type = itemTypes[i];
          const spawnX = xCoordinates[i];

          // Vary speed multiplier by item type to make Gold & Super faster/more challenging
          let typeSpeedMultiplier = 1.0;
          if (type === 'rock') typeSpeedMultiplier = 1.4;       // Plummets down quickly
          else if (type === 'super') typeSpeedMultiplier = 1.35;  // Falls very fast
          else if (type === 'gold') typeSpeedMultiplier = 1.2;   // Falls fast
          else if (type === 'bomb') typeSpeedMultiplier = 1.15;  // Falls moderately fast

          const variedSpeed = (Math.random() * 2.5 + 3.5) * speedMultiplier * typeSpeedMultiplier;

          itemsRef.current.push({
            id: nextItemIdRef.current++,
            x: spawnX,
            y: -20 - (i * 18), // Stagger vertical start so they don't overlap on Y
            speed: variedSpeed,
            type,
          });
        }
      }

      // 6. Physics & Collision Loop (GC-free, optimized single-pass iteration)
      const cartCenterPixel = (cartXRef.current / 100) * width;
      const cartWidth = 52;
      const collisionYThreshold = height - 65;

      const items = itemsRef.current;
      const nextItems: FallingItem[] = [];
      const isInvincible = dizzyTimeRef.current > 0;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];

        // 6.1 Update Swaying X-axis & Y-axis position
        let newX = item.x;
        if (item.type === 'super') {
          newX = item.x + Math.sin(item.y / 12) * 0.65;
          newX = Math.max(5, Math.min(95, newX));
        } else if (item.type === 'gold') {
          newX = item.x + Math.sin(item.y / 20) * 0.4;
          newX = Math.max(5, Math.min(95, newX));
        }
        item.x = newX;
        item.y += item.speed * (delta / 16);

        // Filter out items off screen
        if (item.y > height) {
          continue;
        }

        // 6.2 Collision Check
        const itemXPixel = (item.x / 100) * width;
        const dist = Math.abs(itemXPixel - cartCenterPixel);

        if (item.y >= collisionYThreshold && item.y <= collisionYThreshold + 20 && dist < cartWidth / 2 + 12) {
          // Collision Detected!
          if (item.type === 'normal' || item.type === 'gold' || item.type === 'super') {
            comboRef.current += 1;
            setCombo(comboRef.current);

            let multiplier = 1.0;
            if (comboRef.current >= 15) multiplier = 2.0;
            else if (comboRef.current >= 10) multiplier = 1.5;
            else if (comboRef.current >= 5) multiplier = 1.2;

            let basePoints = 5;
            let pColor = '#38bdf8';
            let pCount = 5;
            let sType: 'catch' | 'gold' | 'super' = 'catch';
            if (item.type === 'gold') {
              basePoints = 20;
              pColor = '#fbbf24';
              pCount = 8;
              sType = 'gold';
            } else if (item.type === 'super') {
              basePoints = 50;
              pColor = '#d946ef';
              pCount = 12;
              sType = 'super';
            }

            const pointsEarned = Math.round(basePoints * multiplier);
            setScore(s => s + pointsEarned);
            spawnParticles(itemXPixel, collisionYThreshold, pColor, pCount);
            playSynthSound(sType);

            // Canvas floating score indicator
            floatingTextsRef.current.push({
              id: nextTextIdRef.current++,
              text: `+${pointsEarned}`,
              x: itemXPixel,
              y: collisionYThreshold - 15,
              color: pColor,
              alpha: 1,
            });
          } else {
            // Hazard hit
            if (isInvincible) {
              // Ignore collisions while invincible (pass-through)
              nextItems.push(item);
              continue;
            }

            comboRef.current = 0;
            setCombo(0);

            if (item.type === 'bomb') {
              if (typeof navigator !== 'undefined' && navigator.vibrate) {
                navigator.vibrate(80);
              }
              setScore(s => Math.max(0, s - 30));
              dizzyTimeRef.current = 800; // 0.8s dizzy invincibility
              setDizzyTimeLeft(1);
              cartDirectionRef.current = null;
              spawnParticles(itemXPixel, collisionYThreshold, '#0f172a', 20);
              playSynthSound('dizzy');
            } else if (item.type === 'rock') {
              if (typeof navigator !== 'undefined' && navigator.vibrate) {
                navigator.vibrate(30);
              }
              setScore(s => Math.max(0, s - 10));
              spawnParticles(itemXPixel, collisionYThreshold, '#64748b', 12);
              playSynthSound('hit');
            }
          }
          continue; // item is consumed
        }
        nextItems.push(item);
      }
      itemsRef.current = nextItems;

      // 6.3 Update Particles (GC-free loop)
      const particles = particlesRef.current;
      const nextParticles: Particle[] = [];
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.12;
        p.alpha -= 0.025;
        if (p.alpha > 0) {
          nextParticles.push(p);
        }
      }
      particlesRef.current = nextParticles;

      // 6.4 Update Floating Texts (GC-free loop)
      const texts = floatingTextsRef.current;
      const nextTexts: FloatingText[] = [];
      const textRate = delta / 16;
      for (let i = 0; i < texts.length; i++) {
        const t = texts[i];
        t.y -= 1.2 * textRate;
        t.alpha -= 0.02 * textRate;
        if (t.alpha > 0) {
          nextTexts.push(t);
        }
      }
      floatingTextsRef.current = nextTexts;

      // 7. RENDER ON CANVAS (GPU ACCELERATED BATCH RENDERING)
      ctx.clearRect(0, 0, width, height);

      // 7.1 Draw items
      const itemsToDraw = itemsRef.current;
      for (let i = 0; i < itemsToDraw.length; i++) {
        const item = itemsToDraw[i];
        const itemXPixel = (item.x / 100) * width;
        if (item.type === 'bomb') {
          drawBomb(ctx, itemXPixel, item.y);
        } else if (item.type === 'gold') {
          drawFeather(ctx, itemXPixel, item.y, '#fbbf24', true);
        } else if (item.type === 'super') {
          drawFeather(ctx, itemXPixel, item.y, '#d946ef', true);
        } else if (item.type === 'rock') {
          drawRock(ctx, itemXPixel, item.y);
        } else {
          drawFeather(ctx, itemXPixel, item.y, '#38bdf8', false);
        }
      }

      // 7.2 Draw particles (batched context state config)
      const particlesToDraw = particlesRef.current;
      if (particlesToDraw.length > 0) {
        ctx.save();
        for (let i = 0; i < particlesToDraw.length; i++) {
          const p = particlesToDraw[i];
          ctx.globalAlpha = p.alpha;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 6;
          ctx.fill();
        }
        ctx.restore();
      }

      // 7.3 Draw floating texts (batched context state config)
      const textsToDraw = floatingTextsRef.current;
      if (textsToDraw.length > 0) {
        ctx.save();
        ctx.font = '900 13px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.strokeStyle = '#090d16';
        ctx.lineWidth = 3;
        
        for (let i = 0; i < textsToDraw.length; i++) {
          const t = textsToDraw[i];
          ctx.globalAlpha = t.alpha;
          ctx.fillStyle = t.color;
          ctx.strokeText(t.text, t.x, t.y);
          ctx.fillText(t.text, t.x, t.y);
        }
        ctx.restore();
      }

      requestRef.current = requestAnimationFrame(gameStep);
    };

    requestRef.current = requestAnimationFrame(gameStep);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [gameState]);

  // Submit the score to server
  const handleSubmitScore = async () => {
    if (!currentUser?.email) return;
    setIsSubmitting(true);
    try {
      const res = await gasApi.submitMiniGameScore(currentUser.email, score);
      setSubmitResult(res);
      refetchEligibility();
      refetchLeaderboard();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setSubmitResult({ status: 'error', message: err.message || '連線錯誤' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getResetMessage = (nextResetStr?: string) => {
    if (!nextResetStr) return '每週三可獲得一次羽毛獎勵 (無上限)';
    return `每週三可獲得一次羽毛獎勵 (無上限)，下一次重置時間為 ${nextResetStr}`;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 select-none">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => gameState === 'idle' && onClose()}
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', duration: 0.5 }}
            className="relative w-full max-w-md bg-slate-900 border border-slate-800 text-white rounded-3xl shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Custom keyframes for dizzy shaking (safe for GPU layout/render) */}
            <style>{`
              @keyframes game-shake {
                0%, 100% { transform: translateX(-50%) rotate(0deg); }
                20%, 60% { transform: translateX(-53%) rotate(-3deg); }
                40%, 80% { transform: translateX(-47%) rotate(3deg); }
              }
              .animate-game-shake {
                animation: game-shake 0.15s infinite !important;
              }
            `}</style>

            {/* Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <GameFeatherIcon color="#38bdf8" glow={true} className="w-5 h-6" />
                <h3 className="text-base md:text-lg font-black tracking-wide bg-gradient-to-r from-sky-400 to-indigo-400 bg-clip-text text-transparent">
                  每週接羽毛挑戰小遊戲
                </h3>
              </div>
              {gameState !== 'playing' && (
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Content Area */}
            <div className="relative flex-1 min-h-[400px] flex flex-col justify-center bg-slate-950 overflow-hidden">
              
              {/* 1. IDLE (START SCREEN) */}
              {gameState === 'idle' && (
                <div className="flex flex-col overflow-hidden">
                  {/* Main Tab Switcher */}
                  <div className="flex border-b border-slate-800 bg-slate-950/60 p-1 shrink-0">
                    <button
                      onClick={() => setActiveMainTab('rules')}
                      className={cn(
                        "flex-1 text-center py-2 text-xs font-black transition-colors rounded-xl",
                        activeMainTab === 'rules'
                          ? "bg-slate-800 text-white shadow-md border border-slate-700/50"
                          : "text-slate-400 hover:text-white"
                      )}
                    >
                      📖 遊戲規則
                    </button>
                    <button
                      onClick={() => setActiveMainTab('leaderboard')}
                      className={cn(
                        "flex-1 text-center py-2 text-xs font-black transition-colors rounded-xl",
                        activeMainTab === 'leaderboard'
                          ? "bg-slate-800 text-white shadow-md border border-slate-700/50"
                          : "text-slate-400 hover:text-white"
                      )}
                    >
                      🏆 挑戰排行
                    </button>
                  </div>

                  {/* Tab Contents */}
                  <div className="p-5 overflow-y-auto max-h-[290px] flex-1">
                    {activeMainTab === 'rules' ? (
                      <div className="flex flex-col space-y-4">
                        <div className="flex flex-col items-center space-y-3 text-center">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center shadow-xl shadow-sky-500/20 animate-pulse">
                            <GameFeatherIcon color="#ffffff" glow={true} className="w-6 h-8" />
                          </div>
                          <div>
                            <h4 className="text-base font-extrabold mb-1">接羽毛！拿獎勵！</h4>
                            <p className="text-xs text-slate-400 leading-relaxed font-semibold">
                              點擊畫面左/右側或按 A/D 鍵，推車會朝該方向等速前進（再度點擊或按鍵可切換方向）。每 10 秒難度與速度將會升級！小心避開黑色炸彈（扣 30 根並眩暈 0.8 秒）與落下的灰色落石（扣 10 根，無眩暈）。
                            </p>
                          </div>
                        </div>

                        {/* Rules & Rewards Preview */}
                        <div className="w-full grid grid-cols-2 gap-2 text-left bg-slate-900 border border-slate-800/60 p-3 rounded-xl text-[10px] font-semibold text-slate-300">
                          <div className="flex items-center gap-1.5">
                            <GameFeatherIcon color="#38bdf8" />
                            <span>普通羽毛 (+5)</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <GameFeatherIcon color="#fbbf24" glow={true} />
                            <span>金色羽毛 (+20)</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <GameFeatherIcon color="#d946ef" glow={true} />
                            <span>超級羽毛 (+50)</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <GameBombIcon />
                            <span>黑色炸彈 (-30 & 眩暈)</span>
                          </div>
                          <div className="flex items-center gap-1.5 col-span-2 border-t border-slate-800/50 pt-1.5 mt-0.5">
                            <GameRockIcon />
                            <span>灰色落石 (-10 根，無眩暈)</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col space-y-3 h-full">
                        {/* Sub-tabs for leaderboard */}
                        <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                          <span className="text-[10px] font-black tracking-wider text-slate-400">📊 點數結算排名</span>
                          <div className="flex bg-slate-950 p-0.5 rounded-lg border border-slate-800/60">
                            <button
                              onClick={() => setLeaderboardTab('weekly')}
                              className={cn(
                                "text-[9px] font-bold px-2 py-0.5 rounded transition-colors",
                                leaderboardTab === 'weekly'
                                  ? "bg-slate-800 text-white font-black"
                                  : "text-slate-400 hover:text-white"
                              )}
                            >
                              本週
                            </button>
                            <button
                              onClick={() => setLeaderboardTab('allTime')}
                              className={cn(
                                "text-[9px] font-bold px-2 py-0.5 rounded transition-colors",
                                leaderboardTab === 'allTime'
                                  ? "bg-slate-800 text-white font-black"
                                  : "text-slate-400 hover:text-white"
                              )}
                            >
                              歷史最高
                            </button>
                          </div>
                        </div>

                        {/* Rank List */}
                        <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                          {(!leaderboard || (leaderboardTab === 'weekly' ? !leaderboard.weekly || leaderboard.weekly.length === 0 : !leaderboard.allTime || leaderboard.allTime.length === 0)) ? (
                            <div className="flex flex-col items-center justify-center py-10 text-slate-500 text-[10px] font-bold">
                              <span>🪶 暫無排行數據</span>
                              <span className="mt-1 text-[9px] text-slate-600">(僅週三獎勵關卡計入)</span>
                            </div>
                          ) : (
                            (leaderboardTab === 'weekly' ? leaderboard.weekly : leaderboard.allTime).map((item: any, i: number) => (
                              <div
                                key={i}
                                className={cn(
                                  "flex items-center justify-between p-2 rounded-xl border transition-all",
                                  i === 0 
                                    ? "bg-amber-500/10 border-amber-500/20" 
                                    : i === 1 
                                      ? "bg-slate-400/10 border-slate-400/20" 
                                      : i === 2 
                                        ? "bg-amber-700/10 border-amber-700/20" 
                                        : "bg-slate-900/40 border-slate-800/40"
                                )}
                              >
                                <div className="flex items-center gap-2">
                                  <span className="w-5 text-center text-xs font-black text-slate-400">
                                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                                  </span>
                                  <img
                                    src={getAvatarUrl(item.avatar, item.name)}
                                    alt={item.name}
                                    className="w-5 h-5 rounded-full object-cover border border-slate-700"
                                  />
                                  <span className="text-xs font-bold text-white max-w-[120px] truncate">
                                    {item.name}
                                  </span>
                                </div>
                                <div className="flex items-center gap-0.5">
                                  <span className="text-xs font-black text-amber-400 tabular-nums">
                                    {item.score}
                                  </span>
                                  <span className="text-[9px] text-slate-500 font-semibold">分</span>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Bottom Notice & Play Button (Always visible at the bottom of the Idle Screen) */}
                  <div className="p-5 border-t border-slate-800/60 bg-slate-900/20 space-y-3 shrink-0">
                    {/* Notice */}
                    <div className="w-full bg-slate-900/80 border border-slate-800/50 p-3 rounded-xl text-center">
                      {eligibility?.canEarnReward ? (
                        <p className="text-[11px] text-emerald-400 font-black">
                          🏆 本次挑戰成功將可獲得 1:1 的羽毛獎勵！(無上限限制)
                        </p>
                      ) : eligibility?.alreadyClaimed ? (
                        <p className="text-[11px] text-amber-500 font-black">
                          ℹ️ 練習模式：您本週三已領取過羽毛獎勵囉。
                        </p>
                      ) : (
                        <p className="text-[11px] text-amber-500 font-black">
                          ℹ️ 練習模式：今天非週三，挑戰僅作練習、不發放羽毛。
                        </p>
                      )}
                      <p className="text-[9px] text-slate-500 font-semibold mt-1">
                        {getResetMessage(eligibility?.nextReset)}
                      </p>
                    </div>

                    {/* Play Button */}
                    <button
                      onClick={startGame}
                      className="w-full bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 active:scale-98 text-white font-extrabold py-2.5 px-6 rounded-xl shadow-lg shadow-sky-500/10 transition-all flex items-center justify-center gap-2 text-sm"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      {eligibility?.canEarnReward ? '立即開始挑戰 (限時 30 秒)' : '開始練習模式 (限時 30 秒)'}
                    </button>
                  </div>
                </div>
              )}

              {/* 2. PLAYING SCREEN (GAME WINDOW WITH CANVAS) */}
              {gameState === 'playing' && (
                <div
                  ref={containerRef}
                  onTouchStart={handleContainerTouch}
                  onClick={handleContainerClick}
                  className="relative w-full h-[400px] bg-gradient-to-b from-slate-950 to-slate-900 select-none touch-none overscroll-contain overflow-hidden"
                >
                  {/* Stats overlay */}
                  <div className="absolute top-4 left-4 right-4 z-20 flex justify-between items-center bg-slate-900/60 backdrop-blur-md px-4 py-2.5 rounded-xl border border-slate-800/40">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-400">目前分數</span>
                        <span className="text-lg font-black text-amber-400 tracking-wider tabular-nums">{score}</span>
                      </div>
                      {combo > 0 && (
                        <div className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-lg">
                          <span className="text-[10px] font-black text-amber-400 animate-pulse">🔥 {combo} COMBO</span>
                          {combo >= 5 && (
                            <span className="text-[9px] font-black text-emerald-400">
                              ({combo >= 15 ? '2.0' : combo >= 10 ? '1.5' : '1.2'}x)
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center">
                      <span className={cn(
                        "text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded border transition-all",
                        timeLeft > 20 
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                          : timeLeft > 10 
                            ? "bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse" 
                            : "bg-red-500/20 text-red-400 border-red-500/30 animate-bounce"
                      )}>
                        {timeLeft > 20 ? 'Level 1: 輕鬆' : timeLeft > 10 ? 'Level 2: 加速 ⚡' : 'Level 3: 狂暴 🔥'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-400">剩餘時間</span>
                      <span className={`text-base font-black tracking-wider tabular-nums ${timeLeft <= 5 ? 'text-red-500 animate-pulse animate-none' : 'text-white'}`}>
                        {timeLeft}s
                      </span>
                    </div>
                  </div>

                  {/* High performance Canvas */}
                  <canvas ref={canvasRef} className="absolute inset-0 z-10 w-full h-full block" />

                  {/* Player Cart: DOM element updated directly via Ref (Bypasses React VDOM) */}
                  <div
                    ref={cartDOMRef}
                    style={{
                      position: 'absolute',
                      left: '50%',
                      bottom: '24px',
                      transform: 'translateX(-50%)',
                      width: '52px',
                      transition: 'transform 0.05s ease-out',
                    }}
                    className="absolute z-20 flex flex-col items-center select-none"
                  >
                    {/* Floating Combo Indicator */}
                    {combo > 0 && (
                      <div className={cn(
                        "text-[10px] font-black tracking-tight drop-shadow-[0_1.5px_2px_rgba(0,0,0,0.85)] -mt-16 mb-2 select-none animate-bounce whitespace-nowrap",
                        combo >= 15 ? "text-fuchsia-400" : combo >= 10 ? "text-amber-400" : "text-sky-400"
                      )}>
                        🔥 {combo} Combo {combo >= 5 && `(${combo >= 15 ? '2.0' : combo >= 10 ? '1.5' : '1.2'}x)`}
                      </div>
                    )}

                    {/* Floating Player Card */}
                    <div className="bg-slate-800/95 dark:bg-slate-900/95 border border-slate-700/80 rounded-full px-2 py-0.5 flex items-center gap-1 shadow-lg backdrop-blur-sm -mt-12 mb-1.5 select-none">
                      <img
                        src={getAvatarUrl(playerAvatar, playerName)}
                        alt={playerName}
                        className="w-4 h-4 rounded-full border border-sky-400 object-cover"
                      />
                      <span className="text-[9px] font-black tracking-tight text-white whitespace-nowrap overflow-hidden max-w-[50px] truncate">
                        {playerName}
                      </span>
                    </div>

                    {/* Dizzy overlay */}
                    {dizzyTimeLeft > 0 && (
                      <div className="absolute -top-6 text-yellow-400 font-extrabold text-xs animate-bounce drop-shadow-[0_0_3px_black]">
                        💫 眩暈中 ({dizzyTimeLeft}s)
                      </div>
                    )}

                    {/* Cart container */}
                    <div
                      className={cn(
                        "h-11 w-[52px] bg-gradient-to-b from-sky-500/90 to-indigo-600/95 border-t-2 border-sky-300 rounded-b-xl flex items-center justify-center shadow-lg relative",
                        dizzyTimeLeft > 0 && "opacity-70 animate-game-shake border-red-500 from-red-600 to-red-800"
                      )}
                    >
                      {/* Wire Grid Overlay */}
                      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.18)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.18)_1px,transparent_1px)] bg-[size:6px_6px] rounded-b-xl pointer-events-none" />

                      {/* Top rim cover */}
                      <div className="absolute inset-x-0 -top-1 h-1.5 bg-sky-200 rounded-full" />

                      {/* Handle bar */}
                      <div className="absolute -left-3 top-0 w-3 h-5 border-t-2 border-l-2 border-sky-300 rounded-tl-lg transform -rotate-[15deg] origin-top-right pointer-events-none shadow-sm" />

                      {/* Left Wheel */}
                      <div className="absolute -bottom-2.5 left-1 w-3.5 h-3.5 bg-zinc-900 border border-slate-300 rounded-full shadow-md flex items-center justify-center">
                        <div className="w-1.5 h-1.5 bg-slate-400 rounded-full" />
                      </div>

                      {/* Right Wheel */}
                      <div className="absolute -bottom-2.5 right-1 w-3.5 h-3.5 bg-zinc-900 border border-slate-300 rounded-full shadow-md flex items-center justify-center">
                        <div className="w-1.5 h-1.5 bg-slate-400 rounded-full" />
                      </div>

                      {/* Basket support structure */}
                      <div className="absolute -bottom-1.5 inset-x-3.5 h-1 bg-sky-400/80 rounded" />

                      {/* Inner item icon */}
                      <ShoppingCart className="w-4 h-4 text-white/90 drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)] z-10" />
                    </div>
                  </div>

                  {/* Mobile Button Controls overlay */}
                  <div className="absolute bottom-4 left-4 right-4 z-30 flex justify-between gap-10 pointer-events-none md:hidden">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (gameState === 'playing' && dizzyTimeRef.current <= 0) {
                          cartDirectionRef.current = 'left';
                        }
                      }}
                      className="pointer-events-auto w-16 h-16 bg-slate-900/80 active:bg-sky-500/30 text-white rounded-full border border-slate-700 flex items-center justify-center active:scale-95 transition-all shadow-xl"
                    >
                      <ChevronLeft className="w-8 h-8" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (gameState === 'playing' && dizzyTimeRef.current <= 0) {
                          cartDirectionRef.current = 'right';
                        }
                      }}
                      className="pointer-events-auto w-16 h-16 bg-slate-900/80 active:bg-sky-500/30 text-white rounded-full border border-slate-700 flex items-center justify-center active:scale-95 transition-all shadow-xl"
                    >
                      <ChevronRight className="w-8 h-8" />
                    </button>
                  </div>
                </div>
              )}

              {/* 3. ENDED SCREEN (SCORE SUMMIT) */}
              {gameState === 'ended' && (
                <div className="p-6 flex flex-col items-center justify-center space-y-6 text-center max-w-md mx-auto">
                  <div className="text-4xl">🏆</div>
                  <div>
                    <h4 className="text-xl font-black mb-1">挑戰時間結束！</h4>
                    <p className="text-xs text-slate-400 font-semibold">你本局共接到了</p>
                    <div className="text-4xl font-black text-amber-400 tracking-wider my-3 tabular-nums">
                      {score} <span className="text-sm text-slate-400 font-bold">根羽毛</span>
                    </div>
                  </div>

                  {/* Submission */}
                  <div className="w-full pt-2">
                    {!submitResult ? (
                      <button
                        onClick={handleSubmitScore}
                        disabled={isSubmitting}
                        className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 active:scale-98 text-white font-extrabold py-3 px-6 rounded-xl shadow-lg shadow-emerald-500/10 transition-all flex items-center justify-center gap-2"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            正在儲存獎勵至雲端...
                          </>
                        ) : (
                          eligibility?.canEarnReward ? '領取並匯入羽毛獎勵' : '送出成績並結束 (練習模式)'
                        )}
                      </button>
                    ) : submitResult?.status === 'success' ? (
                      <div className="space-y-4">
                        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl text-xs font-black">
                          🎉 {submitResult?.message}
                        </div>
                        <button
                          onClick={() => {
                            setGameState('idle');
                            onClose();
                          }}
                          className="w-full bg-slate-800 hover:bg-slate-700 text-white font-extrabold py-2 px-6 rounded-lg text-sm transition-colors"
                        >
                          返回大廳
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-xs font-black">
                          ❌ 領取失敗: {submitResult?.message || '未知錯誤'}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={handleSubmitScore}
                            className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold py-2 rounded-lg text-sm transition-colors"
                          >
                            重試領取
                          </button>
                          <button
                            onClick={() => {
                              setGameState('idle');
                              onClose();
                            }}
                            className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-extrabold py-2 rounded-lg text-sm transition-colors"
                          >
                            放棄回大廳
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
