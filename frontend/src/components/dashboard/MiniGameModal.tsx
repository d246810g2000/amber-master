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
import { getAvatarUrl } from '../../lib/utils';

interface MiniGameModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerName?: string;
  playerAvatar?: string;
  onSuccess?: () => void;
}

type ItemType = 'normal' | 'gold' | 'super' | 'bomb';

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
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitResult, setSubmitResult] = useState<any>(null);

  // References for Canvas and Game Loop
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cartDOMRef = useRef<HTMLDivElement>(null);
  
  const requestRef = useRef<number | null>(null);
  const itemsRef = useRef<FallingItem[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  
  const nextItemIdRef = useRef<number>(0);
  const nextParticleIdRef = useRef<number>(0);

  // Cart physics (stored in ref to prevent 60fps React state re-renders)
  const cartXRef = useRef<number>(50); // percentage (0 - 100)
  const dizzyTimeRef = useRef<number>(0); // remaining dizzy ms
  const [dizzyTimeLeft, setDizzyTimeLeft] = useState<number>(0);

  // Input states
  const moveLeftRef = useRef<boolean>(false);
  const moveRightRef = useRef<boolean>(false);

  // Handle keyboard inputs
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'playing' || dizzyTimeRef.current > 0) return;
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        moveLeftRef.current = true;
      }
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        moveRightRef.current = true;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        moveLeftRef.current = false;
      }
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        moveRightRef.current = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState]);

  // Touch drag control
  const handleTouchMove = (e: React.TouchEvent) => {
    if (gameState !== 'playing' || dizzyTimeRef.current > 0 || !containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const touchX = e.touches[0].clientX - containerRect.left;
    const percentage = Math.max(5, Math.min(95, (touchX / containerRect.width) * 100));
    cartXRef.current = percentage;
    if (cartDOMRef.current) {
      cartDOMRef.current.style.left = `${percentage}%`;
    }
  };

  // On-screen buttons control for mobile/PC click
  const startMoving = (direction: 'left' | 'right') => {
    if (gameState !== 'playing' || dizzyTimeRef.current > 0) return;
    if (direction === 'left') moveLeftRef.current = true;
    if (direction === 'right') moveRightRef.current = true;
  };

  const stopMoving = () => {
    moveLeftRef.current = false;
    moveRightRef.current = false;
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

    // Bomb body
    ctx.beginPath();
    ctx.arc(0, 2, 10, 0, Math.PI * 2);
    ctx.fillStyle = '#ef4444';
    ctx.fill();

    // Fuse cap
    ctx.fillStyle = '#475569';
    ctx.fillRect(-3, -11, 6, 3);

    // Spark
    ctx.beginPath();
    ctx.arc(3, -13, 2, 0, Math.PI * 2);
    ctx.fillStyle = '#fbbf24';
    ctx.fill();

    ctx.restore();
  };

  // Start game
  const startGame = () => {
    setScore(0);
    setTimeLeft(30);
    cartXRef.current = 50;
    setGameState('playing');
    setSubmitResult(null);
    setDizzyTimeLeft(0);
    dizzyTimeRef.current = 0;
    itemsRef.current = [];
    particlesRef.current = [];
    nextItemIdRef.current = 0;
    nextParticleIdRef.current = 0;
    moveLeftRef.current = false;
    moveRightRef.current = false;
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
          moveLeftRef.current = false;
          moveRightRef.current = false;
        }
      }

      // 3. Move Cart
      if (dizzyTimeRef.current <= 0) {
        const speed = 0.85; // percentage per frame
        if (moveLeftRef.current) cartXRef.current = Math.max(5, cartXRef.current - speed * (delta / 16));
        if (moveRightRef.current) cartXRef.current = Math.min(95, cartXRef.current + speed * (delta / 16));
      }

      // Update cart element style directly (Bypass React state rendering)
      if (cartDOMRef.current) {
        cartDOMRef.current.style.left = `${cartXRef.current}%`;
      }

      // 4. Game Clock
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

      // 5. Spawn items
      spawnTimer += delta;
      const currentScore = score;
      const spawnInterval = Math.max(200, 550 - currentScore * 0.4);
      if (spawnTimer >= spawnInterval) {
        spawnTimer = 0;
        const rand = Math.random();
        let type: ItemType = 'normal';
        if (rand < 0.12) type = 'bomb';
        else if (rand < 0.18) type = 'super';
        else if (rand < 0.38) type = 'gold';

        itemsRef.current.push({
          id: nextItemIdRef.current++,
          x: Math.random() * 90 + 5,
          y: -20,
          speed: Math.random() * 2.2 + 3.2,
          type,
        });
      }

      // 6. Physics: Update item positions & Collision Detection
      const cartCenterPixel = (cartXRef.current / 100) * width;
      const cartWidth = 100;
      const collisionYThreshold = height - 65;

      itemsRef.current = itemsRef.current.map(item => ({
        ...item,
        y: item.y + item.speed * (delta / 16),
      }));

      // Filter and detect catches
      itemsRef.current = itemsRef.current.filter(item => {
        if (item.y > height) return false;

        const itemXPixel = (item.x / 100) * width;
        const dist = Math.abs(itemXPixel - cartCenterPixel);

        if (item.y >= collisionYThreshold && item.y <= collisionYThreshold + 20 && dist < cartWidth / 2 + 12) {
          // Caught!
          if (item.type === 'normal') {
            setScore(s => s + 1);
            spawnParticles(itemXPixel, collisionYThreshold, '#38bdf8');
          } else if (item.type === 'gold') {
            setScore(s => s + 10);
            spawnParticles(itemXPixel, collisionYThreshold, '#fbbf24', 15);
          } else if (item.type === 'super') {
            setScore(s => s + 100);
            spawnParticles(itemXPixel, collisionYThreshold, '#d946ef', 25);
          } else if (item.type === 'bomb') {
            setScore(s => Math.max(0, s - 20));
            dizzyTimeRef.current = 1000; // 1 second stun
            setDizzyTimeLeft(1);
            spawnParticles(itemXPixel, collisionYThreshold, '#ef4444', 20);
          }
          return false;
        }
        return true;
      });

      // Update particles
      particlesRef.current = particlesRef.current.map(p => ({
        ...p,
        x: p.x + p.vx,
        y: p.y + p.vy,
        vy: p.vy + 0.12, // gravity
        alpha: p.alpha - 0.025,
      })).filter(p => p.alpha > 0);

      // 7. RENDER ON CANVAS (GPU ACCELERATED)
      ctx.clearRect(0, 0, width, height);

      // Draw items
      itemsRef.current.forEach(item => {
        const itemXPixel = (item.x / 100) * width;
        if (item.type === 'bomb') {
          drawBomb(ctx, itemXPixel, item.y);
        } else if (item.type === 'gold') {
          drawFeather(ctx, itemXPixel, item.y, '#fbbf24', true);
        } else if (item.type === 'super') {
          drawFeather(ctx, itemXPixel, item.y, '#d946ef', true);
        } else {
          drawFeather(ctx, itemXPixel, item.y, '#38bdf8', false);
        }
      });

      // Draw particles
      particlesRef.current.forEach(p => {
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 6;
        ctx.fill();
        ctx.restore();
      });

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
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setSubmitResult({ status: 'error', message: err.message || '連線錯誤' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getResetMessage = (nextResetStr?: string) => {
    if (!nextResetStr) return '每週三 00:00 重置';
    return `每週限玩一次，下一次重置時間為 ${nextResetStr}`;
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
            className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 text-white rounded-3xl shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xl">🪶</span>
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
                <div className="p-6 flex flex-col items-center justify-center space-y-6 text-center max-w-md mx-auto">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-3xl shadow-xl shadow-sky-500/20 animate-pulse">
                    🪶
                  </div>
                  <div>
                    <h4 className="text-lg font-extrabold mb-2">接羽毛！拿獎勵！</h4>
                    <p className="text-xs text-slate-400 leading-relaxed font-semibold">
                      控制你的推車左右移動，接取落下的羽毛。普通羽毛 +1 根，金色羽毛 +10 根，超級羽毛 +100 根！小心接到炸彈會扣 20 根且眩暈一秒哦！
                    </p>
                  </div>

                  {/* Rules & Rewards Preview */}
                  <div className="w-full grid grid-cols-2 gap-3 text-left bg-slate-900 border border-slate-800/60 p-4 rounded-xl text-[11px] font-semibold text-slate-300">
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 bg-sky-400 rounded-full" />
                      <span>普通羽毛 (+1)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 bg-amber-400 rounded-full shadow-[0_0_4px_#fbbf24]" />
                      <span>金色羽毛 (+10)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 bg-fuchsia-500 rounded-full shadow-[0_0_6px_#d946ef]" />
                      <span>超級羽毛 (+100)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 bg-red-500 rounded-full" />
                      <span>炸彈 (-20 & 眩暈)</span>
                    </div>
                  </div>

                  {/* Play Button */}
                  <div className="w-full pt-4">
                    {eligibility?.canPlay ? (
                      <button
                        onClick={startGame}
                        className="w-full bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 active:scale-98 text-white font-extrabold py-3 px-6 rounded-xl shadow-lg shadow-sky-500/10 transition-all flex items-center justify-center gap-2"
                      >
                        <Play className="w-5 h-5 fill-current" />
                        立即開始挑戰 (限時 30 秒)
                      </button>
                    ) : (
                      <div className="w-full bg-slate-900 border border-slate-800 p-4 rounded-xl">
                        <p className="text-xs text-slate-500 font-black mb-1">❌ 本週挑戰次數已用畢</p>
                        <p className="text-[10px] text-slate-500 font-semibold">{getResetMessage(eligibility?.nextReset)}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 2. PLAYING SCREEN (GAME WINDOW WITH CANVAS) */}
              {gameState === 'playing' && (
                <div
                  ref={containerRef}
                  onTouchMove={handleTouchMove}
                  className="relative w-full h-[400px] bg-gradient-to-b from-slate-950 to-slate-900 select-none touch-none overflow-hidden"
                >
                  {/* Stats overlay */}
                  <div className="absolute top-4 left-4 right-4 z-20 flex justify-between items-center bg-slate-900/60 backdrop-blur-md px-4 py-2.5 rounded-xl border border-slate-800/40">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-400">目前分數</span>
                      <span className="text-lg font-black text-amber-400 tracking-wider tabular-nums">{score}</span>
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
                      width: '100px',
                      transition: 'transform 0.05s ease-out',
                    }}
                    className="absolute z-20 flex flex-col items-center select-none"
                  >
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
                      className={`h-12 w-24 bg-gradient-to-b from-sky-600 to-indigo-700 border-t-2 border-sky-400 rounded-b-xl flex items-center justify-center shadow-lg relative ${
                        dizzyTimeLeft > 0 ? 'opacity-70 animate-shake border-red-500 from-red-600 to-red-800' : ''
                      }`}
                    >
                      <ShoppingCart className="w-6 h-6 text-white/90" />
                      <div className="absolute inset-x-0 -top-1 h-1.5 bg-sky-300 rounded-full" />
                    </div>
                  </div>

                  {/* Mobile Button Controls overlay */}
                  <div className="absolute bottom-4 left-4 right-4 z-30 flex justify-between gap-10 pointer-events-none md:hidden">
                    <button
                      onTouchStart={() => startMoving('left')}
                      onTouchEnd={stopMoving}
                      onMouseDown={() => startMoving('left')}
                      onMouseUp={stopMoving}
                      className="pointer-events-auto w-16 h-16 bg-slate-900/80 active:bg-sky-500/30 text-white rounded-full border border-slate-700 flex items-center justify-center active:scale-95 transition-all shadow-xl"
                    >
                      <ChevronLeft className="w-8 h-8" />
                    </button>
                    <button
                      onTouchStart={() => startMoving('right')}
                      onTouchEnd={stopMoving}
                      onMouseDown={() => startMoving('right')}
                      onMouseUp={stopMoving}
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
                          '領取並匯入獎勵'
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
