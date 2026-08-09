import React, { useState, useEffect, useRef } from 'react';
import ShoppingCart from 'lucide-react/dist/esm/icons/shopping-cart';
import ChevronLeft from 'lucide-react/dist/esm/icons/chevron-left';
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right';
import { cn, getAvatarUrl } from '../../../lib/utils';

interface FeatherGameCanvasProps {
  playerName: string;
  playerAvatar: string;
  onGameEnd: (score: number, maxCombo: number) => void;
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

export const GameFeatherIcon: React.FC<{ color: string; glow?: boolean; className?: string }> = ({ color, glow = false, className = '' }) => {
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

export const GameBombIcon: React.FC<{ className?: string }> = ({ className = '' }) => {
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

export const GameRockIcon: React.FC<{ className?: string }> = ({ className = '' }) => {
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

const isMobile = typeof navigator !== 'undefined' && /iPhone|iPad|Android/i.test(navigator.userAgent);

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
    // Ignore audio
  }
};

export const FeatherGameCanvas: React.FC<FeatherGameCanvasProps> = ({
  playerName,
  playerAvatar,
  onGameEnd,
}) => {
  const [score, setScore] = useState<number>(0);
  const scoreRef = useRef<number>(0);
  const [timeLeft, setTimeLeft] = useState<number>(30);
  const [combo, setCombo] = useState<number>(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cartDOMRef = useRef<HTMLDivElement>(null);
  
  const requestRef = useRef<number | null>(null);
  const itemsRef = useRef<FallingItem[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const comboRef = useRef<number>(0);
  const maxComboRef = useRef<number>(0);
  
  const nextItemIdRef = useRef<number>(0);
  const nextParticleIdRef = useRef<number>(0);
  const floatingTextsRef = useRef<FloatingText[]>([]);
  const nextTextIdRef = useRef<number>(0);

  const cartXRef = useRef<number>(50);
  const dizzyTimeRef = useRef<number>(0);
  const [dizzyTimeLeft, setDizzyTimeLeft] = useState<number>(0);
  const cartDirectionRef = useRef<'left' | 'right' | null>(null);

  const timeLeftRef = useRef<number>(30);
  const canvasWidthRef = useRef<number>(600);
  const canvasHeightRef = useRef<number>(400);

  // Resize listener
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateSize = () => {
      const w = container.clientWidth || 600;
      const h = container.clientHeight || 400;
      canvasWidthRef.current = w;
      canvasHeightRef.current = h;
      
      const canvas = canvasRef.current;
      if (canvas && (canvas.width !== w || canvas.height !== h)) {
        canvas.width = w;
        canvas.height = h;
      }
    };

    updateSize();

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(() => {
        updateSize();
      });
      observer.observe(container);
      return () => observer.disconnect();
    } else {
      window.addEventListener('resize', updateSize);
      return () => window.removeEventListener('resize', updateSize);
    }
  }, []);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (dizzyTimeRef.current > 0) return;
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        cartDirectionRef.current = 'left';
      }
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        cartDirectionRef.current = 'right';
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (dizzyTimeRef.current > 0 || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    if (clickX < rect.width / 2) {
      cartDirectionRef.current = 'left';
    } else {
      cartDirectionRef.current = 'right';
    }
  };

  const handleContainerTouch = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.cancelable) {
      e.preventDefault();
    }
    if (dizzyTimeRef.current > 0 || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const touchX = e.touches[0].clientX - rect.left;
    if (touchX < rect.width / 2) {
      cartDirectionRef.current = 'left';
    } else {
      cartDirectionRef.current = 'right';
    }
  };

  // Particles
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

  // Draw helpers
  const drawFeather = (ctx: CanvasRenderingContext2D, x: number, y: number, color: string, glow = false) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-Math.PI / 6);
    if (glow && !isMobile) {
      ctx.shadowColor = color;
      ctx.shadowBlur = 10;
    }
    ctx.beginPath();
    ctx.moveTo(0, 10);
    ctx.quadraticCurveTo(-6, 0, -3, -12);
    ctx.quadraticCurveTo(0, -16, 3, -12);
    ctx.quadraticCurveTo(6, 0, 0, 10);
    ctx.fillStyle = color;
    ctx.fill();

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
    if (!isMobile) {
      ctx.shadowColor = '#f43f5e';
      ctx.shadowBlur = 12;
    }
    ctx.beginPath();
    ctx.arc(0, 2, 11, 0, Math.PI * 2);
    ctx.fillStyle = '#f43f5e';
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.beginPath();
    ctx.arc(0, 2, 9, 0, Math.PI * 2);
    ctx.fillStyle = '#090d16';
    ctx.fill();
    ctx.fillStyle = '#64748b';
    ctx.fillRect(-2, -9, 4, 3);

    if (!isMobile) {
      ctx.shadowColor = '#fbbf24';
      ctx.shadowBlur = 8;
    }
    ctx.beginPath();
    ctx.arc(2, -11, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = '#fbbf24';
    ctx.fill();
    ctx.restore();
  };

  const drawRock = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    ctx.save();
    ctx.translate(x, y);
    if (!isMobile) {
      ctx.shadowColor = '#64748b';
      ctx.shadowBlur = 8;
    }
    ctx.beginPath();
    ctx.moveTo(-10, -6);
    ctx.lineTo(-2, -12);
    ctx.lineTo(8, -8);
    ctx.lineTo(11, 2);
    ctx.lineTo(5, 10);
    ctx.lineTo(-6, 9);
    ctx.lineTo(-11, 2);
    ctx.closePath();
    ctx.fillStyle = '#475569';
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.moveTo(-10, -6);
    ctx.lineTo(0, 0);
    ctx.lineTo(5, 10);
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-2, -12);
    ctx.lineTo(2, -4);
    ctx.lineTo(8, -8);
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  };

  // Main Loop
  useEffect(() => {
    // Unlock Audio Context inside user interaction
    try {
      if (typeof window !== 'undefined') {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          if (!audioCtx) audioCtx = new AudioContextClass();
          if (audioCtx.state === 'suspended') audioCtx.resume();
        }
      }
    } catch (err) {}

    let lastTime = performance.now();
    let spawnTimer = 0;
    let secondsTimer = 0;

    const gameStep = (time: number) => {
      const rawDelta = time - lastTime;
      lastTime = time;

      if (typeof document !== 'undefined' && document.hidden) {
        requestRef.current = requestAnimationFrame(gameStep);
        return;
      }

      const delta = Math.min(rawDelta, 50);

      const container = containerRef.current;
      const canvas = canvasRef.current;
      if (!container || !canvas) {
        requestRef.current = requestAnimationFrame(gameStep);
        return;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = canvasWidthRef.current;
      const height = canvasHeightRef.current;

      // Update Dizzy
      if (dizzyTimeRef.current > 0) {
        dizzyTimeRef.current = Math.max(0, dizzyTimeRef.current - delta);
        setDizzyTimeLeft(Math.ceil(dizzyTimeRef.current / 1000));
        if (dizzyTimeRef.current === 0) {
          cartDirectionRef.current = null;
        }
      }

      // Move Cart
      if (dizzyTimeRef.current <= 0) {
        const speed = 0.85;
        if (cartDirectionRef.current === 'left') {
          cartXRef.current = Math.max(5, cartXRef.current - speed * (delta / 16));
        } else if (cartDirectionRef.current === 'right') {
          cartXRef.current = Math.min(95, cartXRef.current + speed * (delta / 16));
        }
      }

      // Update Cart DOM
      if (cartDOMRef.current) {
        cartDOMRef.current.style.left = `${cartXRef.current}%`;
        let rotation = 0;
        let scaleX = 1;
        if (dizzyTimeRef.current <= 0) {
          if (cartDirectionRef.current === 'left') { rotation = -4; scaleX = -1; }
          else if (cartDirectionRef.current === 'right') { rotation = 4; scaleX = 1; }
        }
        cartDOMRef.current.style.transform = `translateX(-50%) scaleX(${scaleX}) rotate(${rotation}deg)`;
      }

      // Clock
      secondsTimer += delta;
      if (secondsTimer >= 1000) {
        secondsTimer -= 1000;
        timeLeftRef.current = Math.max(0, timeLeftRef.current - 1);
        setTimeLeft(timeLeftRef.current);
        if (timeLeftRef.current <= 0) {
          onGameEnd(scoreRef.current, maxComboRef.current);
          return;
        }
      }

      // Levels
      let level = 1;
      let spawnInterval = 600;
      let speedMultiplier = 1.0;
      
      const currentSeconds = timeLeftRef.current;
      if (currentSeconds <= 10) {
        level = 3;
        spawnInterval = 380;
        speedMultiplier = 1.7;
      } else if (currentSeconds <= 20) {
        level = 2;
        spawnInterval = 450;
        speedMultiplier = 1.35;
      }

      // Spawn
      spawnTimer += delta;
      if (spawnTimer >= spawnInterval) {
        spawnTimer = 0;
        const spawnCount = (() => {
          const r = Math.random();
          if (level === 1) return r < 0.70 ? 1 : 2;
          if (level === 2) return r < 0.50 ? 1 : r < 0.80 ? 2 : 3;
          return r < 0.30 ? 1 : r < 0.50 ? 2 : r < 0.80 ? 3 : 4;
        })();

        const rollItemType = (lvl: number): ItemType => {
          const rand = Math.random();
          if (lvl === 1) {
            if (rand < 0.05) return 'bomb';
            if (rand < 0.20) return 'rock';
            if (rand < 0.21) return 'super';
            if (rand < 0.28) return 'gold';
            return 'normal';
          }
          if (lvl === 2) {
            if (rand < 0.10) return 'bomb';
            if (rand < 0.35) return 'rock';
            if (rand < 0.40) return 'super';
            if (rand < 0.58) return 'gold';
            return 'normal';
          }
          if (rand < 0.20) return 'bomb';
          if (rand < 0.50) return 'rock';
          if (rand < 0.65) return 'super';
          if (rand < 0.90) return 'gold';
          return 'normal';
        };

        const rollBeneficialType = (): ItemType => {
          const rand = Math.random();
          if (rand < 0.15) return 'super';
          if (rand < 0.50) return 'gold';
          return 'normal';
        };

        const itemTypes: ItemType[] = [];
        for (let i = 0; i < spawnCount; i++) {
          itemTypes.push(rollItemType(level));
        }

        const allHazards = itemTypes.every(t => t === 'bomb' || t === 'rock');
        if (allHazards && spawnCount > 0) {
          const forceIdx = Math.floor(Math.random() * spawnCount);
          (itemTypes as ItemType[])[forceIdx] = rollBeneficialType();
        }

        const getSeparatedXCoords = (count: number, lvl: number): number[] => {
          const coords: number[] = [];
          let min = 5, max = 95;
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
          let typeSpeedMultiplier = 1.0;
          if (type === 'rock') typeSpeedMultiplier = 1.4;
          else if (type === 'super') typeSpeedMultiplier = 1.35;
          else if (type === 'gold') typeSpeedMultiplier = 0.8;
          else if (type === 'bomb') typeSpeedMultiplier = 1.15;

          const speedVariance = Math.random() * 0.3 + 0.85;
          const variedSpeed = (Math.random() * 2.5 + 3.5) * speedMultiplier * typeSpeedMultiplier * speedVariance;

          itemsRef.current.push({
            id: nextItemIdRef.current++,
            x: spawnX,
            y: -20 - (i * 18),
            speed: variedSpeed,
            type,
          });
        }
      }

      // Physics & Collision
      const cartCenterPixel = (cartXRef.current / 100) * width;
      const cartWidth = 52;
      const collisionYThreshold = height - 65;
      const items = itemsRef.current;
      const nextItems: FallingItem[] = [];
      const isInvincible = dizzyTimeRef.current > 0;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
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

        if (item.y > height) continue;

        const itemXPixel = (item.x / 100) * width;
        const dist = Math.abs(itemXPixel - cartCenterPixel);

        if (item.y >= collisionYThreshold && item.y <= collisionYThreshold + 20 && dist < cartWidth / 2 + 12) {
          if (item.type === 'normal' || item.type === 'gold' || item.type === 'super') {
            comboRef.current += 1;
            setCombo(comboRef.current);
            maxComboRef.current = Math.max(maxComboRef.current, comboRef.current);

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
            scoreRef.current += pointsEarned;
            setScore(scoreRef.current);
            spawnParticles(itemXPixel, collisionYThreshold, pColor, pCount);
            playSynthSound(sType);

            floatingTextsRef.current.push({
              id: nextTextIdRef.current++,
              text: `+${pointsEarned}`,
              x: itemXPixel,
              y: collisionYThreshold - 15,
              color: pColor,
              alpha: 1,
            });
          } else {
            if (isInvincible) {
              nextItems.push(item);
              continue;
            }
            comboRef.current = 0;
            setCombo(0);

            if (item.type === 'bomb') {
              if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(80);
              scoreRef.current = Math.max(0, scoreRef.current - 30);
              setScore(scoreRef.current);
              dizzyTimeRef.current = 800;
              setDizzyTimeLeft(1);
              cartDirectionRef.current = null;
              spawnParticles(itemXPixel, collisionYThreshold, '#0f172a', 20);
              playSynthSound('dizzy');
            } else if (item.type === 'rock') {
              if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(30);
              scoreRef.current = Math.max(0, scoreRef.current - 10);
              setScore(scoreRef.current);
              spawnParticles(itemXPixel, collisionYThreshold, '#64748b', 12);
              playSynthSound('hit');
            }
          }
          continue;
        }
        nextItems.push(item);
      }
      itemsRef.current = nextItems;

      // Update Particles
      const particles = particlesRef.current;
      const nextParticles: Particle[] = [];
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.12;
        p.alpha -= 0.025;
        if (p.alpha > 0) nextParticles.push(p);
      }
      particlesRef.current = nextParticles;

      // Update Floating Texts
      const texts = floatingTextsRef.current;
      const nextTexts: FloatingText[] = [];
      const textRate = delta / 16;
      for (let i = 0; i < texts.length; i++) {
        const t = texts[i];
        t.y -= 1.2 * textRate;
        t.alpha -= 0.02 * textRate;
        if (t.alpha > 0) nextTexts.push(t);
      }
      floatingTextsRef.current = nextTexts;

      // Render
      ctx.clearRect(0, 0, width, height);

      // Draw Items
      const itemsToDraw = itemsRef.current;
      for (let i = 0; i < itemsToDraw.length; i++) {
        const item = itemsToDraw[i];
        const itemXPixel = (item.x / 100) * width;
        if (item.type === 'bomb') drawBomb(ctx, itemXPixel, item.y);
        else if (item.type === 'gold') drawFeather(ctx, itemXPixel, item.y, '#fbbf24', true);
        else if (item.type === 'super') drawFeather(ctx, itemXPixel, item.y, '#d946ef', true);
        else if (item.type === 'rock') drawRock(ctx, itemXPixel, item.y);
        else drawFeather(ctx, itemXPixel, item.y, '#38bdf8', false);
      }

      // Draw Particles
      const particlesToDraw = particlesRef.current;
      if (particlesToDraw.length > 0) {
        ctx.save();
        for (let i = 0; i < particlesToDraw.length; i++) {
          const p = particlesToDraw[i];
          ctx.globalAlpha = p.alpha;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          if (!isMobile) {
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 6;
          }
          ctx.fill();
        }
        ctx.restore();
      }

      // Draw Floating Texts
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={containerRef}
      onTouchStart={handleContainerTouch}
      onClick={handleContainerClick}
      className="relative w-full h-full flex-1 bg-gradient-to-b from-slate-950 to-slate-900 select-none touch-none overscroll-contain overflow-hidden"
    >
      <style>{`
        @keyframes game-shake {
          0%, 100% { transform: translateX(-50%) rotate(0deg); }
          20%, 60% { transform: translateX(-53%) rotate(-3deg); }
          40%, 80% { transform: translateX(-47%) rotate(3deg); }
        }
        .animate-game-shake {
          animation: game-shake 0.15s infinite !important;
        }
        @keyframes combo-pop {
          0% { transform: scale(0.9); }
          50% { transform: scale(1.08); }
          100% { transform: scale(1.0); }
        }
        .animate-combo-pop {
          animation: combo-pop 0.22s ease-out forwards;
          display: inline-block;
        }
      `}</style>

      {/* Stats Overlay */}
      <div className="absolute top-4 inset-x-4 z-20 flex justify-between items-center bg-slate-900/95 px-4 py-2 rounded-2xl border border-slate-800/60 shadow-lg text-sm select-none">
        <div className="flex items-center gap-1.5 font-black text-amber-400">
          <span className="text-base">🏆</span>
          <span className="text-base tracking-wider tabular-nums">{score}</span>
        </div>

        <div className="flex items-center">
          <span className={cn(
            "text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg border transition-all",
            timeLeft > 20 
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
              : timeLeft > 10 
                ? "bg-amber-500/10 text-amber-400 border-amber-500/20" 
                : "bg-red-500/25 text-red-400 border-red-500/40 animate-pulse"
          )}>
            {timeLeft > 20 ? 'Lv.1 輕鬆' : timeLeft > 10 ? 'Lv.2 加速 ⚡' : 'Lv.3 狂暴 🔥'}
          </span>
        </div>

        <div className="flex items-center gap-1.5 font-black text-white">
          <span className="text-base">⏱️</span>
          <span className={cn(
            "text-sm tracking-wider tabular-nums",
            timeLeft <= 5 ? "text-red-500 animate-pulse" : "text-white"
          )}>
            {timeLeft}s
          </span>
        </div>
      </div>

      <canvas ref={canvasRef} className="absolute inset-0 z-10 w-full h-full block" />

      {combo > 0 && (
        <div key={combo} className="absolute inset-0 z-0 flex flex-col items-center justify-center pointer-events-none select-none">
          <span className={cn(
            "text-5xl md:text-6xl font-black tracking-widest uppercase animate-combo-pop select-none",
            combo >= 15 ? "text-fuchsia-500/15" : combo >= 10 ? "text-amber-500/15" : "text-sky-400/15"
          )}>
            {combo} Combo
          </span>
          {combo >= 5 && (
            <span className="text-[10px] font-black tracking-widest uppercase opacity-20 mt-1.5 text-slate-500 animate-combo-pop">
              MULTIPLIER: {combo >= 15 ? '2.0' : combo >= 10 ? '1.5' : '1.2'}x
            </span>
          )}
        </div>
      )}

      {/* Cart DOM */}
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

        {dizzyTimeLeft > 0 && (
          <div className="absolute -top-6 text-yellow-400 font-extrabold text-xs animate-bounce drop-shadow-[0_0_3px_black]">
            💫 眩暈中 ({dizzyTimeLeft}s)
          </div>
        )}

        <div
          className={cn(
            "h-11 w-[52px] bg-gradient-to-b from-sky-500/90 to-indigo-600/95 border-t-2 border-sky-300 rounded-b-xl flex items-center justify-center shadow-lg relative",
            dizzyTimeLeft > 0 && "opacity-70 animate-game-shake border-red-500 from-red-600 to-red-800"
          )}
        >
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.18)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.18)_1px,transparent_1px)] bg-[size:6px_6px] rounded-b-xl pointer-events-none" />
          <div className="absolute inset-x-0 -top-1 h-1.5 bg-sky-200 rounded-full" />
          <div className="absolute -left-3 top-0 w-3 h-5 border-t-2 border-l-2 border-sky-300 rounded-tl-lg transform -rotate-[15deg] origin-top-right pointer-events-none shadow-sm" />
          <div className="absolute -bottom-2.5 left-1 w-3.5 h-3.5 bg-zinc-900 border border-slate-300 rounded-full shadow-md flex items-center justify-center">
            <div className="w-1.5 h-1.5 bg-slate-400 rounded-full" />
          </div>
          <div className="absolute -bottom-2.5 right-1 w-3.5 h-3.5 bg-zinc-900 border border-slate-300 rounded-full shadow-md flex items-center justify-center">
            <div className="w-1.5 h-1.5 bg-slate-400 rounded-full" />
          </div>
          <div className="absolute -bottom-1.5 inset-x-3.5 h-1 bg-sky-400/80 rounded" />
          <ShoppingCart className="w-4 h-4 text-white/90 drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)] z-10" />
        </div>
      </div>

      {/* Mobile Controls */}
      <div className="absolute bottom-4 left-4 right-4 z-30 flex justify-between gap-10 pointer-events-none md:hidden">
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (dizzyTimeRef.current <= 0) cartDirectionRef.current = 'left';
          }}
          className="pointer-events-auto w-16 h-16 bg-slate-900/80 active:bg-sky-500/30 text-white rounded-full border border-slate-700 flex items-center justify-center active:scale-95 transition-all shadow-xl"
        >
          <ChevronLeft className="w-8 h-8" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (dizzyTimeRef.current <= 0) cartDirectionRef.current = 'right';
          }}
          className="pointer-events-auto w-16 h-16 bg-slate-900/80 active:bg-sky-500/30 text-white rounded-full border border-slate-700 flex items-center justify-center active:scale-95 transition-all shadow-xl"
        >
          <ChevronRight className="w-8 h-8" />
        </button>
      </div>
    </div>
  );
};
