import React from "react";
import { cn } from "../lib/utils";

interface PetRendererProps {
  petId: string | null | undefined;
  className?: string;
}

export const PetRenderer: React.FC<PetRendererProps> = ({ petId, className }) => {
  if (!petId) return null;

  const uId = React.useId().replace(/:/g, "");

  const styleBlock = (
    <style>{`
      @keyframes petFloat {
        0%, 100% { transform: translateY(0) rotate(0deg); }
        50% { transform: translateY(-4px) rotate(0.8deg); }
      }
      @keyframes petFloatSlow {
        0%, 100% { transform: translateY(0) rotate(0deg); }
        50% { transform: translateY(-6px) rotate(-1deg); }
      }
      @keyframes petBounceSlow {
        0%, 100% { transform: translateY(0) scaleY(1); }
        50% { transform: translateY(-2.5px) scaleY(0.97); }
      }
      @keyframes petBreath {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.02, 0.98); }
      }
      @keyframes auraBreathing {
        0%, 100% { transform: scale(0.94); opacity: 0.25; }
        50% { transform: scale(1.06); opacity: 0.5; }
      }
      @keyframes auraBreathingSlow {
        0%, 100% { transform: scale(0.92); opacity: 0.2; }
        50% { transform: scale(1.08); opacity: 0.45; }
      }
      @keyframes rotateCw {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      @keyframes rotateCcw {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(-360deg); }
      }
      @keyframes floatParticleA {
        0% { transform: translateY(4px) translateX(0px) scale(0); opacity: 0; }
        20% { opacity: 0.8; }
        80% { opacity: 0.8; }
        100% { transform: translateY(-16px) translateX(-2px) scale(1); opacity: 0; }
      }
      @keyframes floatParticleB {
        0% { transform: translateY(6px) translateX(-1px) scale(0); opacity: 0; }
        20% { opacity: 0.9; }
        80% { opacity: 0.9; }
        100% { transform: translateY(-20px) translateX(2px) scale(0.7); opacity: 0; }
      }
      @keyframes floatParticleC {
        0% { transform: translateY(2px) translateX(2px) scale(0); opacity: 0; }
        20% { opacity: 0.7; }
        80% { opacity: 0.7; }
        100% { transform: translateY(-13px) translateX(-2px) scale(0.9); opacity: 0; }
      }
      @keyframes wingFlapLeft {
        0%, 100% { transform: rotate(0deg); }
        50% { transform: rotate(-15deg); }
      }
      @keyframes wingFlapRight {
        0%, 100% { transform: rotate(0deg); }
        50% { transform: rotate(15deg); }
      }
      @keyframes tailWagFast {
        0%, 100% { transform: rotate(-12deg); }
        50% { transform: rotate(12deg); }
      }
      @keyframes tailWagSlow {
        0%, 100% { transform: rotate(-6deg); }
        50% { transform: rotate(6deg); }
      }
      @keyframes earWiggleLeft {
        0%, 100% { transform: rotate(0deg); }
        50% { transform: rotate(-6deg); }
      }
      @keyframes earWiggleRight {
        0%, 100% { transform: rotate(0deg); }
        50% { transform: rotate(6deg); }
      }
      @keyframes petPulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.04); }
      }
      @keyframes innerAuraPulse {
        0%, 100% { opacity: 0.45; }
        50% { opacity: 0.75; }
      }
    `}</style>
  );

  const renderPetContent = () => {
    switch (petId) {
      // === CLASSIC TIER PETS ===
      // deliberately simple, 2-3 flat colors, no overlay, basic bounce animation
      case "pet_corgi":
        return (
          <div className={cn("relative w-5 h-5 flex items-center justify-center animate-bounce", className)} title="呆萌柯基">
            <svg viewBox="0 0 24 24" className="w-full h-full fill-amber-600 dark:fill-amber-500">
              {/* Body */}
              <ellipse cx="12" cy="15.5" rx="6" ry="4.5" />
              {/* Head */}
              <circle cx="12" cy="10.2" r="3.8" />
              {/* Simple Ears */}
              <polygon points="8,6 10,9 8.5,9.5" />
              <polygon points="16,6 14,9 15.5,9.5" />
              {/* Eyes */}
              <circle cx="10.5" cy="9.8" r="0.6" className="fill-slate-900" />
              <circle cx="13.5" cy="9.8" r="0.6" className="fill-slate-900" />
              {/* Simple Snout & Nose */}
              <circle cx="12" cy="11.2" r="1" className="fill-white" />
              <ellipse cx="12" cy="11" rx="0.5" ry="0.3" className="fill-slate-900" />
            </svg>
          </div>
        );

      case "pet_black_cat":
        return (
          <div className={cn("relative w-5 h-5 flex items-center justify-center animate-bounce", className)} title="傲嬌黑貓">
            <svg viewBox="0 0 24 24" className="w-full h-full fill-slate-800 dark:fill-slate-700">
              {/* Body */}
              <circle cx="12" cy="15.5" r="6" />
              {/* Head */}
              <circle cx="12" cy="9.5" r="4.2" />
              {/* Simple Ears */}
              <polygon points="7.5,6 9.5,9 7.5,9" />
              <polygon points="16.5,6 14.5,9 16.5,9" />
              {/* Yellow Eyes */}
              <circle cx="10.5" cy="9.2" r="0.8" className="fill-yellow-400" />
              <circle cx="13.5" cy="9.2" r="0.8" className="fill-yellow-400" />
              {/* Pupils */}
              <circle cx="10.5" cy="9.2" r="0.3" className="fill-slate-900" />
              <circle cx="13.5" cy="9.2" r="0.3" className="fill-slate-900" />
              {/* Simple Nose */}
              <polygon points="12,10.2 11.5,9.8 12.5,9.8" className="fill-pink-300" />
            </svg>
          </div>
        );

      case "pet_chick":
        return (
          <div className={cn("relative w-5 h-5 flex items-center justify-center animate-bounce", className)} title="元氣小雞">
            <svg viewBox="0 0 24 24" className="w-full h-full fill-yellow-400 dark:fill-yellow-350">
              {/* Body */}
              <circle cx="12" cy="13.5" r="6" />
              {/* Eyes */}
              <circle cx="9.5" cy="11.5" r="0.65" className="fill-slate-900" />
              <circle cx="14.5" cy="11.5" r="0.65" className="fill-slate-900" />
              {/* Beak */}
              <polygon points="12,11.8 10.5,13.2 13.5,13.2" className="fill-orange-500" />
              {/* Feet */}
              <line x1="10" y1="19" x2="10" y2="21" stroke="currentColor" strokeWidth="1" className="stroke-orange-500" />
              <line x1="14" y1="19" x2="14" y2="21" stroke="currentColor" strokeWidth="1" className="stroke-orange-500" />
            </svg>
          </div>
        );

      // === EPIC TIER PETS ===
      // subtle shading, specular highlights, soft glow, small secondary animations, polished material
      case "pet_cat": {
        const catGrad = `catGrad-${uId}`;
        const earGrad = `earGrad-${uId}`;
        const innerShadow = `innerShadow-${uId}`;
        return (
          <div className={cn("relative w-5 h-5 flex items-center justify-center animate-pet-bounce-slow", className)} title="慵懶小貓">
            <svg viewBox="0 0 24 24" className="w-full h-full drop-shadow-[0_1.5px_3px_rgba(99,102,241,0.45)]">
              <defs>
                <linearGradient id={catGrad} x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#a5b4fc" />
                  <stop offset="60%" stopColor="#6366f1" />
                  <stop offset="100%" stopColor="#4f46e5" />
                </linearGradient>
                <linearGradient id={earGrad} x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#fda4af" />
                  <stop offset="100%" stopColor="#f43f5e" />
                </linearGradient>
                <filter id={innerShadow} x="-20%" y="-20%" width="140%" height="140%">
                  <feOffset dx="0.3" dy="0.6"/>
                  <feGaussianBlur stdDeviation="0.4" result="offset-blur"/>
                  <feComposite operator="out" in="SourceGraphic" in2="offset-blur" result="inverse"/>
                  <feFlood flood-color="black" flood-opacity="0.25" result="color"/>
                  <feComposite operator="in" in="color" in2="inverse" result="shadow"/>
                  <feComposite operator="over" in="shadow" in2="SourceGraphic"/>
                </filter>
              </defs>
              {/* Tail (Wiggling) */}
              <path 
                d="M17.5,16.5 C20.5,15 21.5,12 19.5,10.5" 
                fill="none" 
                stroke={`url(#${catGrad})`} 
                strokeWidth="1.6" 
                strokeLinecap="round"
                className="origin-[17.5px_16.5px] animate-[tailWagSlow_2s_infinite_ease-in-out]" 
              />
              {/* Body */}
              <circle cx="12" cy="15" r="7" fill={`url(#${catGrad})`} filter={`url(#${innerShadow})`} />
              {/* Head */}
              <circle cx="12" cy="9" r="5" fill={`url(#${catGrad})`} filter={`url(#${innerShadow})`} />
              {/* Specular Highlight on Head */}
              <ellipse cx="12" cy="5.2" rx="1.5" ry="0.6" fill="white" opacity="0.3" />
              {/* Ears (Wiggling) */}
              <g className="origin-[8px_9px] animate-[earWiggleLeft_2.2s_infinite_ease-in-out]">
                <polygon points="7,6 9,10 6,10" fill={`url(#${catGrad})`} />
                <polygon points="7.2,6.7 8.5,9.5 6.5,9.5" fill={`url(#${earGrad})`} />
              </g>
              <g className="origin-[16px_9px] animate-[earWiggleRight_2.2s_infinite_ease-in-out_delay-100]">
                <polygon points="17,6 15,10 18,10" fill={`url(#${catGrad})`} />
                <polygon points="16.8,6.7 15.5,9.5 17.5,9.5" fill={`url(#${earGrad})`} />
              </g>
              {/* Eyes with specular highlights */}
              <g>
                <circle cx="10.2" cy="8.5" r="0.8" className="fill-slate-900" />
                <circle cx="9.9" cy="8.2" r="0.25" fill="white" />
                <circle cx="13.8" cy="8.5" r="0.8" className="fill-slate-900" />
                <circle cx="13.5" cy="8.2" r="0.25" fill="white" />
              </g>
              {/* Nose & Mouth */}
              <polygon points="12,9.4 11.3,8.9 12.7,8.9" className="fill-pink-300" />
              <path d="M11,10.2 Q12,11.2 13,10.2" stroke="#312e81" strokeWidth="0.5" fill="none" />
              {/* Cheek Blush */}
              <circle cx="9" cy="9.8" r="0.8" fill="#f472b6" opacity="0.45" />
              <circle cx="15" cy="9.8" r="0.8" fill="#f472b6" opacity="0.45" />
              {/* Whiskers */}
              <line x1="5.5" y1="9" x2="7.5" y2="9.3" stroke="#c7d2fe" strokeWidth="0.5" />
              <line x1="5.5" y1="10" x2="7.5" y2="10" stroke="#c7d2fe" strokeWidth="0.5" />
              <line x1="18.5" y1="9" x2="16.5" y2="9.3" stroke="#c7d2fe" strokeWidth="0.5" />
              <line x1="18.5" y1="10" x2="16.5" y2="10" stroke="#c7d2fe" strokeWidth="0.5" />
            </svg>
          </div>
        );
      }

      case "pet_slime": {
        const slimeGrad = `slimeGrad-${uId}`;
        const innerShadow = `innerShadow-${uId}`;
        return (
          <div className={cn("relative w-5 h-5 flex items-center justify-center animate-pet-bounce-slow", className)} title="果凍史萊姆">
            <svg viewBox="0 0 24 24" className="w-full h-full drop-shadow-[0_1.5px_3px_rgba(240,46,170,0.5)]">
              <defs>
                <linearGradient id={slimeGrad} x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#f5d0fe" />
                  <stop offset="40%" stopColor="#e879f9" />
                  <stop offset="100%" stopColor="#c084fc" />
                </linearGradient>
                <filter id={innerShadow} x="-20%" y="-20%" width="140%" height="140%">
                  <feOffset dx="0.2" dy="0.6"/>
                  <feGaussianBlur stdDeviation="0.5" result="offset-blur"/>
                  <feComposite operator="out" in="SourceGraphic" in2="offset-blur" result="inverse"/>
                  <feFlood flood-color="white" flood-opacity="0.3" result="color"/>
                  <feComposite operator="in" in="color" in2="inverse" result="shadow"/>
                  <feComposite operator="over" in="shadow" in2="SourceGraphic"/>
                </filter>
              </defs>
              {/* Slime Shape (Wobbling) */}
              <path 
                d="M4,17 Q4,10 12,9 Q20,10 20,17 Q20,20 12,20 Q4,20 4,17 Z" 
                fill={`url(#${slimeGrad})`} 
                filter={`url(#${innerShadow})`}
                className="origin-bottom animate-[petBreath_1.6s_infinite_ease-in-out]" 
              />
              {/* Jelly Specular Gloss Overlay */}
              <path 
                d="M6,13.5 C5.8,11.5 8.5,10.2 12,10.2" 
                stroke="white" 
                strokeWidth="0.95" 
                strokeLinecap="round"
                fill="none" 
                opacity="0.55" 
              />
              <circle cx="7" cy="12" r="0.6" fill="white" opacity="0.6" />
              {/* Cheek blush */}
              <circle cx="8" cy="15.2" r="1.3" fill="#f472b6" opacity="0.5" />
              <circle cx="16" cy="15.2" r="1.3" fill="#f472b6" opacity="0.5" />
              {/* Eyes with specular reflection */}
              <g>
                <ellipse cx="10" cy="14" rx="0.8" ry="1.3" className="fill-slate-900" />
                <circle cx="9.7" cy="13.5" r="0.25" fill="white" />
                <ellipse cx="14" cy="14" rx="0.8" ry="1.3" className="fill-slate-900" />
                <circle cx="13.7" cy="13.5" r="0.25" fill="white" />
              </g>
              {/* Mouth */}
              <path d="M11,16.5 Q12,17.2 13,16.5" stroke="#701a75" strokeWidth="0.85" fill="none" strokeLinecap="round" />
            </svg>
          </div>
        );
      }

      case "pet_rabbit": {
        const rabbitGrad = `rabbitGrad-${uId}`;
        const earInnerGrad = `earInnerGrad-${uId}`;
        const innerShadow = `innerShadow-${uId}`;
        return (
          <div className={cn("relative w-5 h-5 flex items-center justify-center animate-pet-bounce-slow", className)} title="蹦蹦粉兔">
            <svg viewBox="0 0 24 24" className="w-full h-full drop-shadow-[0_1.5px_3px_rgba(244,114,182,0.45)]">
              <defs>
                <linearGradient id={rabbitGrad} x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#fdf2f8" />
                  <stop offset="60%" stopColor="#fbcfe8" />
                  <stop offset="100%" stopColor="#f472b6" />
                </linearGradient>
                <linearGradient id={earInnerGrad} x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#fecdd3" />
                  <stop offset="100%" stopColor="#fb7185" />
                </linearGradient>
                <filter id={innerShadow} x="-20%" y="-20%" width="140%" height="140%">
                  <feOffset dx="0.2" dy="0.5"/>
                  <feGaussianBlur stdDeviation="0.4" result="offset-blur"/>
                  <feComposite operator="out" in="SourceGraphic" in2="offset-blur" result="inverse"/>
                  <feFlood flood-color="black" flood-opacity="0.18" result="color"/>
                  <feComposite operator="in" in="color" in2="inverse" result="shadow"/>
                  <feComposite operator="over" in="shadow" in2="SourceGraphic"/>
                </filter>
              </defs>
              {/* Fluffy Tail */}
              <circle cx="5" cy="16" r="2.2" fill="#fdf2f8" className="animate-pulse" />
              <circle cx="5.2" cy="15.8" r="1.3" fill="#fbcfe8" />
              {/* Bunny Body */}
              <ellipse cx="12" cy="15" rx="6.5" ry="5.5" fill={`url(#${rabbitGrad})`} filter={`url(#${innerShadow})`} />
              {/* Chest Fluff */}
              <path d="M11,12.5 C10.5,13.5 12,14.5 12,14.5 C12,14.5 13.5,13.5 13,12.5 Z" fill="#ffffff" opacity="0.8" />
              {/* Head */}
              <circle cx="12" cy="9" r="4.5" fill={`url(#${rabbitGrad})`} filter={`url(#${innerShadow})`} />
              {/* Ears (Wiggling) */}
              <g className="origin-[10px_7px] animate-[earWiggleLeft_2.5s_infinite_ease-in-out_alternate]">
                <ellipse cx="10" cy="4" rx="1.6" ry="3.8" fill={`url(#${rabbitGrad})`} />
                <ellipse cx="10" cy="4.2" rx="0.8" ry="2.6" fill={`url(#${earInnerGrad})`} />
              </g>
              <g className="origin-[14px_7px] animate-[earWiggleRight_2.8s_infinite_ease-in-out_alternate]">
                <ellipse cx="14" cy="4" rx="1.6" ry="3.8" fill={`url(#${rabbitGrad})`} />
                <ellipse cx="14" cy="4.2" rx="0.8" ry="2.6" fill={`url(#${earInnerGrad})`} />
              </g>
              {/* Specular Highlight on Head */}
              <ellipse cx="12" cy="5.4" rx="1.3" ry="0.5" fill="white" opacity="0.35" />
              {/* Eyes with reflections */}
              <g>
                <circle cx="10.3" cy="8.5" r="0.75" className="fill-rose-500" />
                <circle cx="10" cy="8.1" r="0.25" fill="white" />
                <circle cx="13.7" cy="8.5" r="0.75" className="fill-rose-500" />
                <circle cx="13.4" cy="8.1" r="0.25" fill="white" />
              </g>
              {/* Nose */}
              <polygon points="12,9.6 11.5,9.1 12.5,9.1" className="fill-pink-400" />
              {/* Cheek blush */}
              <circle cx="8.3" cy="9.8" r="1.1" fill="#f43f5e" opacity="0.4" />
              <circle cx="15.7" cy="9.8" r="1.1" fill="#f43f5e" opacity="0.4" />
            </svg>
          </div>
        );
      }

      // === LEGENDARY TIER PETS ===
      // layered gradients, aura breathing, floating particles, strong depth, cinematic lighting
      case "pet_dog": {
        const dogAura = `dogAura-${uId}`;
        const shibaGrad = `shibaGrad-${uId}`;
        const chestGrad = `chestGrad-${uId}`;
        const innerShadow = `innerShadow-${uId}`;
        const glowFilter = `glow-${uId}`;
        return (
          <div className={cn("relative w-5 h-5 flex items-center justify-center animate-pet-float", className)} title="元氣柴犬">
            <svg viewBox="0 0 24 24" className="w-full h-full drop-shadow-[0_2px_4px_rgba(245,158,11,0.55)]">
              <defs>
                <radialGradient id={dogAura} cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.55" />
                  <stop offset="60%" stopColor="#f59e0b" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#d97706" stopOpacity="0" />
                </radialGradient>
                <linearGradient id={shibaGrad} x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#fcd34d" />
                  <stop offset="50%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#b45309" />
                </linearGradient>
                <linearGradient id={chestGrad} x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="100%" stopColor="#fef3c7" />
                </linearGradient>
                <filter id={innerShadow} x="-20%" y="-20%" width="140%" height="140%">
                  <feOffset dx="0.3" dy="0.6"/>
                  <feGaussianBlur stdDeviation="0.4" result="offset-blur"/>
                  <feComposite operator="out" in="SourceGraphic" in2="offset-blur" result="inverse"/>
                  <feFlood flood-color="black" flood-opacity="0.32" result="color"/>
                  <feComposite operator="in" in="color" in2="inverse" result="shadow"/>
                  <feComposite operator="over" in="shadow" in2="SourceGraphic"/>
                </filter>
                <filter id={glowFilter} x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="1" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>
              {/* Background Aura */}
              <circle cx="12" cy="12" r="9.8" fill={`url(#${dogAura})`} className="origin-center animate-[auraBreathing_2.5s_infinite_ease-in-out]" />
              {/* Background Particles */}
              <g filter={`url(#${glowFilter})`}>
                <circle cx="5" cy="17" r="0.65" fill="#fef3c7" className="animate-[floatParticleA_2.2s_infinite]" />
                <circle cx="19" cy="13" r="0.8" fill="#fde047" className="animate-[floatParticleB_2.6s_infinite]" />
              </g>
              {/* Tail (Wagging) */}
              <path 
                d="M17.5,14.5 C20,13 21.5,9.5 20,8.5" 
                fill="none" 
                stroke="#d97706" 
                strokeWidth="2.2" 
                strokeLinecap="round"
                className="origin-[17.5px_14.5px] animate-[tailWagFast_0.8s_infinite_ease-in-out]" 
              />
              {/* Body */}
              <ellipse cx="12" cy="15" rx="6.5" ry="5.5" fill={`url(#${shibaGrad})`} filter={`url(#${innerShadow})`} />
              {/* Belly overlay */}
              <ellipse cx="12" cy="16.5" rx="4.2" ry="3.5" fill={`url(#${chestGrad})`} />
              {/* Head */}
              <circle cx="12" cy="9.2" r="4.6" fill={`url(#${shibaGrad})`} filter={`url(#${innerShadow})`} />
              {/* Shiba eyebrows */}
              <ellipse cx="10.4" cy="7" rx="0.75" ry="0.4" fill="#ffffff" />
              <ellipse cx="13.6" cy="7" rx="0.75" ry="0.4" fill="#ffffff" />
              {/* Ears */}
              <g className="origin-[8.5px_8.5px] animate-[earWiggleLeft_2s_infinite_ease-in-out_alternate]">
                <polygon points="8,5 10.5,8.5 7.5,9" fill="#92400e" />
                <polygon points="8.2,5.7 9.8,8.2 7.8,8.5" fill="#fef3c7" />
              </g>
              <g className="origin-[15.5px_8.5px] animate-[earWiggleRight_2.2s_infinite_ease-in-out_alternate]">
                <polygon points="16,5 13.5,8.5 16.5,9" fill="#92400e" />
                <polygon points="15.8,5.7 14.2,8.2 16.2,8.5" fill="#fef3c7" />
              </g>
              {/* White muzzle */}
              <ellipse cx="12" cy="10.4" rx="2.1" ry="1.3" fill="#ffffff" />
              {/* Eyes with reflections */}
              <g>
                <circle cx="10.4" cy="8.4" r="0.75" fill="#0f172a" />
                <circle cx="10.1" cy="8.1" r="0.25" fill="#ffffff" />
                <circle cx="13.6" cy="8.4" r="0.75" fill="#0f172a" />
                <circle cx="13.3" cy="8.1" r="0.25" fill="#ffffff" />
              </g>
              {/* Nose & Mouth */}
              <polygon points="12,10 11.3,9.5 12.7,9.5" fill="#0f172a" />
              <path d="M11,11 Q12,11.6 13,11" stroke="#b45309" strokeWidth="0.5" fill="none" />
              {/* Tongue out */}
              <path d="M11.6,10.9 Q12,12.4 12.4,10.9 Z" fill="#fb7185" />
              {/* Rim light top highlight */}
              <path d="M9.5,5.2 C11,4.7 13,4.7 14.5,5.2" stroke="white" strokeWidth="0.45" strokeLinecap="round" fill="none" opacity="0.4" />
              {/* Foreground Sparkles */}
              <g filter={`url(#${glowFilter})`}>
                <path d="M 12, 2.5 Q 12, 3.5 13, 3.5 Q 12, 3.5 12, 4.5 Q 12, 3.5 11, 3.5 Q 12, 3.5 12, 2.5" fill="#fbbf24" className="animate-[floatParticleC_2.8s_infinite]" />
              </g>
            </svg>
          </div>
        );
      }

      case "pet_fox": {
        const foxAura = `foxAura-${uId}`;
        const foxGrad = `foxGrad-${uId}`;
        const innerShadow = `innerShadow-${uId}`;
        const glowFilter = `glow-${uId}`;
        return (
          <div className={cn("relative w-5 h-5 flex items-center justify-center animate-pet-float", className)} title="傲嬌赤狐">
            <svg viewBox="0 0 24 24" className="w-full h-full drop-shadow-[0_2px_4px_rgba(249,115,22,0.55)]">
              <defs>
                <radialGradient id={foxAura} cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#f97316" stopOpacity="0.5" />
                  <stop offset="60%" stopColor="#ea580c" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="#c2410c" stopOpacity="0" />
                </radialGradient>
                <linearGradient id={foxGrad} x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#ff9f66" />
                  <stop offset="40%" stopColor="#f97316" />
                  <stop offset="100%" stopColor="#c2410c" />
                </linearGradient>
                <filter id={innerShadow} x="-20%" y="-20%" width="140%" height="140%">
                  <feOffset dx="0.3" dy="0.5"/>
                  <feGaussianBlur stdDeviation="0.4" result="offset-blur"/>
                  <feComposite operator="out" in="SourceGraphic" in2="offset-blur" result="inverse"/>
                  <feFlood flood-color="black" flood-opacity="0.3" result="color"/>
                  <feComposite operator="in" in="color" in2="inverse" result="shadow"/>
                  <feComposite operator="over" in="shadow" in2="SourceGraphic"/>
                </filter>
                <filter id={glowFilter} x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="1.1" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>
              {/* Background Aura */}
              <circle cx="12" cy="12" r="9.8" fill={`url(#${foxAura})`} className="origin-center animate-[auraBreathing_2.3s_infinite_ease-in-out]" />
              {/* Particles */}
              <g filter={`url(#${glowFilter})`}>
                <circle cx="4" cy="15" r="0.6" fill="#ffe4e6" className="animate-[floatParticleA_2.5s_infinite]" />
                <circle cx="20" cy="11" r="0.75" fill="#fed7aa" className="animate-[floatParticleB_2.1s_infinite]" />
              </g>
              {/* Fluffy Tail (Swapping) */}
              <g className="origin-[17.5px_16px] animate-[tailWagSlow_1.8s_infinite_ease-in-out_alternate]">
                <path d="M17.5,16 C21.5,15 22.5,11 20,11" fill="none" stroke="#ea580c" strokeWidth="2.8" strokeLinecap="round" />
                <circle cx="20" cy="11" r="1.4" fill="#ffffff" />
              </g>
              {/* Body */}
              <path d="M5,17 C5,12 12,11 12,11 C12,11 19,12 19,17 C19,20 12,21 5,17 Z" fill={`url(#${foxGrad})`} filter={`url(#${innerShadow})`} />
              {/* White chest overlay */}
              <path d="M10.2,15.2 C10.2,13.8 12,13.3 12,13.3 C12,13.3 13.8,13.8 13.8,15.2 C13.8,16.5 12,17.2 10.2,15.2 Z" fill="#ffffff" />
              {/* Head (angular) */}
              <polygon points="12,5 6,10 18,10" fill={`url(#${foxGrad})`} filter={`url(#${innerShadow})`} />
              {/* White face cheeks */}
              <polygon points="6.1,9.9 8.8,9.9 12,8.1 9.3,8.1" fill="#ffffff" />
              <polygon points="17.9,9.9 15.2,9.9 12,8.1 14.7,8.1" fill="#ffffff" />
              {/* Large Ears (twitching) */}
              <g className="origin-[8px_9px] animate-[earWiggleLeft_2.4s_infinite_ease-in-out_alternate]">
                <polygon points="6.5,4.5 9,9 5.8,9" fill="#9a3412" />
                <polygon points="7,5.5 8.7,8.5 6.4,8.5" fill="#fda4af" />
              </g>
              <g className="origin-[16px_9px] animate-[earWiggleRight_2.4s_infinite_ease-in-out_alternate_delay-100]">
                <polygon points="17.5,4.5 15,9 18.2,9" fill="#9a3412" />
                <polygon points="17,5.5 15.3,8.5 17.6,8.5" fill="#fda4af" />
              </g>
              {/* Eyes (Sly/Wink) */}
              <g>
                {/* Winking left eye */}
                <path d="M9.2,8 C9.8,7.6 10.5,7.6 11,8" fill="none" stroke="#0f172a" strokeWidth="0.85" strokeLinecap="round" />
                {/* Cute right eye with reflection */}
                <circle cx="13.8" cy="8.2" r="0.75" fill="#0f172a" />
                <circle cx="13.5" cy="7.9" r="0.25" fill="#ffffff" />
              </g>
              {/* Nose */}
              <circle cx="12" cy="9.8" r="0.75" fill="#020617" />
              {/* Foreground Sparkles */}
              <path d="M 17.5, 4.5 Q 17.5, 5.5 18.5, 5.5 Q 17.5, 5.5 17.5, 6.5 Q 17.5, 5.5 16.5, 5.5 Q 17.5, 5.5 17.5, 4.5" fill="#fed7aa" className="animate-[floatParticleC_2.5s_infinite]" />
            </svg>
          </div>
        );
      }

      case "pet_dragon": {
        const dragonAura = `dragonAura-${uId}`;
        const dragonGrad = `dragonGrad-${uId}`;
        const wingGrad = `wingGrad-${uId}`;
        const innerShadow = `innerShadow-${uId}`;
        const glowFilter = `glow-${uId}`;
        return (
          <div className={cn("relative w-5 h-5 flex items-center justify-center animate-pet-float", className)} title="黃金幼龍">
            <svg viewBox="0 0 24 24" className="w-full h-full drop-shadow-[0_2px_4px_rgba(234,179,8,0.55)]">
              <defs>
                <radialGradient id={dragonAura} cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#fef08a" stopOpacity="0.55" />
                  <stop offset="60%" stopColor="#eab308" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#ca8a04" stopOpacity="0" />
                </radialGradient>
                <linearGradient id={dragonGrad} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#fef08a" />
                  <stop offset="60%" stopColor="#eab308" />
                  <stop offset="100%" stopColor="#a16207" />
                </linearGradient>
                <linearGradient id={wingGrad} x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#ca8a04" />
                  <stop offset="100%" stopColor="#713f12" />
                </linearGradient>
                <filter id={innerShadow} x="-20%" y="-20%" width="140%" height="140%">
                  <feOffset dx="0.2" dy="0.5"/>
                  <feGaussianBlur stdDeviation="0.4" result="offset-blur"/>
                  <feComposite operator="out" in="SourceGraphic" in2="offset-blur" result="inverse"/>
                  <feFlood flood-color="black" flood-opacity="0.32" result="color"/>
                  <feComposite operator="in" in="color" in2="inverse" result="shadow"/>
                  <feComposite operator="over" in="shadow" in2="SourceGraphic"/>
                </filter>
                <filter id={glowFilter} x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="0.9" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>
              {/* Background Aura */}
              <circle cx="12" cy="12" r="9.8" fill={`url(#${dragonAura})`} className="origin-center animate-[auraBreathing_2.6s_infinite_ease-in-out]" />
              {/* Particles */}
              <g filter={`url(#${glowFilter})`}>
                <circle cx="5" cy="15" r="0.6" fill="#fef08a" className="animate-[floatParticleA_2.4s_infinite]" />
                <circle cx="19" cy="12" r="0.75" fill="#fde047" className="animate-[floatParticleB_2s_infinite]" />
              </g>
              {/* Back wing (flapping) */}
              <path 
                d="M6,10 Q2,8 5,5 Q8,8 6,10" 
                fill={`url(#${wingGrad})`} 
                className="origin-[6px_10px] animate-[wingFlapLeft_0.8s_infinite_ease-in-out_alternate]" 
              />
              {/* Tail */}
              <path 
                d="M16.5,18.5 Q20.5,21 21.5,17" 
                fill="none" 
                stroke="#854d0e" 
                strokeWidth="1.6" 
                strokeLinecap="round"
                className="origin-[16.5px_18.5px] animate-[tailWagSlow_1.6s_infinite_ease-in-out]" 
              />
              {/* Body */}
              <path d="M7,17 Q7,12 12,12 Q17,12 17,17 Q17,21 12,21 Q7,21 7,17" fill={`url(#${dragonGrad})`} filter={`url(#${innerShadow})`} />
              {/* Belly scales/plate */}
              <path d="M10,16.5 C10,14.5 12,14 12,14 C12,14 14,14.5 14,16.5 C14,18.5 12,19.5 10,16.5 Z" fill="#fef08a" opacity="0.85" />
              {/* Snout/Head */}
              <path d="M9,9 Q9,6 12,6 Q15,6 15,9 C15,10.5 13,11.5 12,11.5 C11,11.5 9,10.5 9,9" fill={`url(#${dragonGrad})`} filter={`url(#${innerShadow})`} />
              {/* Cute Horns */}
              <g>
                <polygon points="10,6.2 9,3.5 11,5.2" fill="#ca8a04" />
                <polygon points="14,6.2 15,3.5 13,5.2" fill="#ca8a04" />
                {/* Highlights on horns */}
                <polygon points="9.8,5.8 9.2,3.8 10.3,5.1" fill="#fef08a" opacity="0.6" />
              </g>
              {/* Front Wing (flapping) */}
              <path 
                d="M16,13 Q21,11 18,8 Q15,11 16,13" 
                fill={`url(#${wingGrad})`} 
                className="origin-[16px_13px] animate-[wingFlapRight_0.8s_infinite_ease-in-out_alternate_delay-150]" 
              />
              {/* Eyes (Glowing gold with white reflection) */}
              <g>
                <circle cx="10.5" cy="8.2" r="0.75" fill="#fde047" className="animate-pulse" />
                <circle cx="10.2" cy="7.9" r="0.2" fill="white" />
                <circle cx="13.5" cy="8.2" r="0.75" fill="#fde047" className="animate-pulse" />
                <circle cx="13.2" cy="7.9" r="0.2" fill="white" />
              </g>
              {/* Flame Ember Sparkle */}
              <g filter={`url(#${glowFilter})`}>
                <path d="M 12, 1 Q 12, 2 13, 2 Q 12, 2 12, 3 Q 12, 2 11, 2 Q 12, 2 12, 1" fill="#f97316" className="animate-[floatParticleC_1.8s_infinite]" />
              </g>
            </svg>
          </div>
        );
      }

      // === ULTIMATE TIER PETS ===
      // SSR-quality rendering, holographic appearance, animated aura breathing, layered particles, foreground + background VFX, noise texture
      case "pet_phoenix": {
        const phoenixAura = `phoenixAura-${uId}`;
        const phoenixGrad = `phoenixGrad-${uId}`;
        const wingGrad = `wingGrad-${uId}`;
        const innerShadow = `innerShadow-${uId}`;
        const glowFilter = `glow-${uId}`;
        const noiseFilter = `noise-${uId}`;
        return (
          <div className={cn("relative w-5 h-5 flex items-center justify-center animate-pet-float-slow", className)} title="霓虹鳳凰">
            {/* Multi-layer glowing backdrop with blur */}
            <div className="absolute inset-[-4px] rounded-full bg-gradient-to-r from-pink-500 via-rose-500 to-yellow-500 opacity-25 blur-md animate-pulse" />
            <div className="absolute inset-0 rounded-full bg-rose-500/10 blur-xl pointer-events-none" />

            <svg viewBox="0 0 24 24" className="w-full h-full drop-shadow-[0_0_7px_rgba(244,63,94,0.85)]">
              <defs>
                <radialGradient id={phoenixAura} cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.6" />
                  <stop offset="45%" stopColor="#ec4899" stopOpacity="0.25" />
                  <stop offset="75%" stopColor="#f59e0b" stopOpacity="0.08" />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
                </radialGradient>
                <linearGradient id={phoenixGrad} x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#f472b6" />   {/* Pink-400 */}
                  <stop offset="40%" stopColor="#ef4444" />   {/* Red-500 */}
                  <stop offset="100%" stopColor="#f59e0b" />  {/* Amber-500 */}
                </linearGradient>
                <linearGradient id={wingGrad} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ec4899" stopOpacity="0.9" />
                  <stop offset="60%" stopColor="#ef4444" stopOpacity="0.75" />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.25" />
                </linearGradient>
                <filter id={innerShadow} x="-20%" y="-20%" width="140%" height="140%">
                  <feOffset dx="0.2" dy="0.4"/>
                  <feGaussianBlur stdDeviation="0.4" result="offset-blur"/>
                  <feComposite operator="out" in="SourceGraphic" in2="offset-blur" result="inverse"/>
                  <feFlood flood-color="white" flood-opacity="0.25" result="color"/>
                  <feComposite operator="in" in="color" in2="inverse" result="shadow"/>
                  <feComposite operator="over" in="shadow" in2="SourceGraphic"/>
                </filter>
                <filter id={glowFilter} x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur stdDeviation="1.2" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
                <filter id={noiseFilter}>
                  <feTurbulence type="fractalNoise" baseFrequency="0.95" numOctaves="3" result="noise" />
                  <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.035 0" />
                  <feBlend mode="multiply" in="SourceGraphic" in2="noise" />
                </filter>
              </defs>
              {/* Background Aura */}
              <circle cx="12" cy="12" r="10.5" fill={`url(#${phoenixAura})`} className="origin-center animate-[auraBreathingSlow_3s_infinite_ease-in-out]" />
              {/* Rotating Magical Ring */}
              <circle 
                cx="12" 
                cy="12" 
                r="9.2" 
                fill="none" 
                stroke="#ec4899" 
                strokeWidth="0.45" 
                strokeDasharray="4 2 1 2" 
                opacity="0.35"
                className="origin-center animate-[spinSlow_12s_linear infinite]"
              />
              {/* Background Particles */}
              <g filter={`url(#${glowFilter})`}>
                <circle cx="4" cy="16" r="0.65" fill="#f472b6" className="animate-[floatParticleA_2s_infinite]" />
                <path d="M 21, 14 Q 21, 14.8 21.6, 14.8 Q 21, 14.8 21, 15.6 Q 21, 14.8 20.4, 14.8 Q 21, 14.8 21, 14" fill="#fbbf24" className="animate-[floatParticleB_2.4s_infinite]" />
              </g>
              {/* Streamer Tail */}
              <g className="origin-top animate-pulse">
                <path d="M12,20 C10.5,23.2 9,24.2 7.8,24" fill="none" stroke="#ef4444" strokeWidth="1.4" strokeLinecap="round" />
                <circle cx="7.8" cy="24" r="0.5" fill="#fbbf24" className="animate-ping" />
                <path d="M12,20 C12,23.5 12,24.5 12,24.5" fill="none" stroke="#f59e0b" strokeWidth="1.8" strokeLinecap="round" />
                <circle cx="12" cy="24.5" r="0.6" fill="#f59e0b" className="animate-ping" />
                <path d="M12,20 C13.5,23.2 15,24.2 16.2,24" fill="none" stroke="#ef4444" strokeWidth="1.4" strokeLinecap="round" />
                <circle cx="16.2" cy="24" r="0.5" fill="#fbbf24" className="animate-ping" />
              </g>
              {/* Phoenix Flame Wings (semi-transparent back wings) */}
              <path 
                d="M4,12 Q-1,6 5,8 Q11,10 4,12" 
                fill={`url(#${wingGrad})`} 
                className="origin-[5px_9px] animate-[wingFlapLeft_0.6s_infinite_ease-in-out_alternate]" 
              />
              <path 
                d="M20,12 Q25,6 19,8 Q13,10 20,12" 
                fill={`url(#${wingGrad})`} 
                className="origin-[19px_9px] animate-[wingFlapRight_0.6s_infinite_ease-in-out_alternate_delay-300]" 
              />
              {/* Body with inner shadow + noise */}
              <ellipse cx="12" cy="14" rx="4.5" ry="6" fill={`url(#${phoenixGrad})`} filter={`url(#${innerShadow}) url(#${noiseFilter})`} />
              {/* Golden chest feathers */}
              <g className="animate-[innerAuraPulse_1.5s_infinite_ease-in-out]">
                <polygon points="12,10.2 10.2,13 13.8,13" fill="#fef08a" />
                <polygon points="12,13 9.8,15.8 14.2,15.8" fill="#fde047" />
              </g>
              {/* Head */}
              <circle cx="12" cy="7.2" r="3.6" fill={`url(#${phoenixGrad})`} filter={`url(#${innerShadow}) url(#${noiseFilter})`} />
              {/* Fire Crest */}
              <path d="M12,4.6 Q10,1.8 12,0.8 Q14,1.8 12,4.6" fill="#f43f5e" className="animate-bounce" />
              {/* Specular Head highlight */}
              <ellipse cx="12" cy="4.8" rx="1.1" ry="0.45" fill="white" opacity="0.3" />
              {/* Glowing Golden Eyes */}
              <g>
                <circle cx="10.8" cy="6.9" r="0.65" fill="#fde047" />
                <circle cx="10.6" cy="6.7" r="0.18" fill="white" />
                <circle cx="13.2" cy="6.9" r="0.65" fill="#fde047" />
                <circle cx="13.0" cy="6.7" r="0.18" fill="white" />
              </g>
              {/* Beak */}
              <polygon points="12,8.6 11.2,7.6 12.8,7.6" fill="#fbbf24" />
              {/* Foreground Sparkles */}
              <g filter={`url(#${glowFilter})`}>
                <path d="M 8, 3 Q 8, 3.8 8.8, 3.8 Q 8, 3.8 8, 4.6 Q 8, 3.8 7.2, 3.8 Q 8, 3.8 8, 3" fill="#fde047" className="animate-[floatParticleC_2.8s_infinite]" />
              </g>
            </svg>
          </div>
        );
      }

      case "pet_unicorn": {
        const unicornAura = `unicornAura-${uId}`;
        const unicornBody = `unicornBody-${uId}`;
        const unicornMane = `unicornMane-${uId}`;
        const innerShadow = `innerShadow-${uId}`;
        const glowFilter = `glow-${uId}`;
        const noiseFilter = `noise-${uId}`;
        return (
          <div className={cn("relative w-5 h-5 flex items-center justify-center animate-pet-float-slow", className)} title="炫彩獨角獸">
            {/* SSR Holographic Backdrop Glow */}
            <div className="absolute inset-[-4px] rounded-full bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 opacity-25 blur-md animate-pulse" />
            <div className="absolute inset-0 bg-cyan-400/10 rounded-full blur-xl pointer-events-none" />

            <svg viewBox="0 0 24 24" className="w-full h-full drop-shadow-[0_0_7px_rgba(34,211,238,0.85)]">
              <defs>
                <radialGradient id={unicornAura} cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.45" />
                  <stop offset="50%" stopColor="#c084fc" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#f472b6" stopOpacity="0" />
                </radialGradient>
                <linearGradient id={unicornBody} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="50%" stopColor="#f0f9ff" />
                  <stop offset="100%" stopColor="#fae8ff" />
                </linearGradient>
                <linearGradient id={unicornMane} x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#f472b6" />    {/* Pink-400 */}
                  <stop offset="50%" stopColor="#c084fc" />   {/* Purple-400 */}
                  <stop offset="100%" stopColor="#22d3ee" />  {/* Cyan-400 */}
                </linearGradient>
                <filter id={innerShadow} x="-20%" y="-20%" width="140%" height="140%">
                  <feOffset dx="0.2" dy="0.4"/>
                  <feGaussianBlur stdDeviation="0.4" result="offset-blur"/>
                  <feComposite operator="out" in="SourceGraphic" in2="offset-blur" result="inverse"/>
                  <feFlood flood-color="black" flood-opacity="0.15" result="color"/>
                  <feComposite operator="in" in="color" in2="inverse" result="shadow"/>
                  <feComposite operator="over" in="shadow" in2="SourceGraphic"/>
                </filter>
                <filter id={glowFilter} x="-25%" y="-25%" width="150%" height="150%">
                  <feGaussianBlur stdDeviation="1" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
                <filter id={noiseFilter}>
                  <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" result="noise"/>
                  <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.03 0" />
                  <feBlend mode="multiply" in="SourceGraphic" in2="noise"/>
                </filter>
              </defs>
              {/* Background Aura */}
              <circle cx="12" cy="12" r="10.5" fill={`url(#${unicornAura})`} className="origin-center animate-[auraBreathingSlow_3.2s_infinite_ease-in-out]" />
              {/* Background Particles */}
              <g filter={`url(#${glowFilter})`}>
                <circle cx="5" cy="14" r="0.6" fill="#e0f2fe" className="animate-[floatParticleA_2.6s_infinite]" />
                <path d="M 19, 15 Q 19, 15.6 19.5, 15.6 Q 19, 15.6 19, 16.2 Q 19, 15.6 18.5, 15.6 Q 19, 15.6 19, 15" fill="#fbcfe8" className="animate-[floatParticleB_2.8s_infinite]" />
              </g>
              {/* Tail */}
              <path 
                d="M18.5,14 C21,13 22.5,16 21,17.5" 
                fill="none" 
                stroke={`url(#${unicornMane})`} 
                strokeWidth="2" 
                strokeLinecap="round"
                className="origin-[18.5px_14px] animate-[tailWagSlow_2s_infinite_ease-in-out]"
              />
              {/* Body */}
              <ellipse cx="12" cy="15" rx="6.5" ry="5.1" fill={`url(#${unicornBody})`} filter={`url(#${innerShadow}) url(#${noiseFilter})`} />
              {/* Holographic Pastel Mane */}
              <path d="M9.2,9.2 C7,11.8 8,15.2 8.2,16.2" fill="none" stroke={`url(#${unicornMane})`} strokeWidth="2.5" strokeLinecap="round" className="animate-pulse" />
              {/* Head */}
              <path d="M8,9 Q8,6 12,6 Q16,6 16,9 C16,11 13,11 12,11 Z" fill={`url(#${unicornBody})`} filter={`url(#${innerShadow}) url(#${noiseFilter})`} />
              {/* Specular Highlight on Head */}
              <ellipse cx="12" cy="6.4" rx="1.2" ry="0.45" fill="white" opacity="0.4" />
              {/* Glowing Horn */}
              <g className="origin-bottom animate-pulse" filter={`url(#${glowFilter})`}>
                <polygon points="12,5.6 12,0.6 13,5.1" fill="#facc15" />
                <polygon points="12,5.6 12,0.6 13,5.1" fill="#ffffff" opacity="0.75" />
              </g>
              {/* Eyes */}
              <g>
                <circle cx="10.8" cy="8.2" r="0.75" fill="#1e1b4b" />
                <circle cx="10.6" cy="7.9" r="0.22" fill="#ffffff" />
                <circle cx="13.2" cy="8.2" r="0.75" fill="#1e1b4b" />
                <circle cx="13.0" cy="7.9" r="0.22" fill="#ffffff" />
              </g>
              {/* Blush */}
              <circle cx="9.4" cy="9.2" r="0.8" fill="#fda4af" opacity="0.65" />
              <circle cx="14.6" cy="9.2" r="0.8" fill="#fda4af" opacity="0.65" />
              {/* Foreground Sparkles */}
              <g filter={`url(#${glowFilter})`}>
                <path d="M 12, 1.8 Q 12, 2.4 12.6, 2.4 Q 12, 2.4 12, 3 Q 12, 2.4 11.4, 2.4 Q 12, 2.4 12, 1.8" fill="#22d3ee" className="animate-[floatParticleC_2.1s_infinite]" />
              </g>
            </svg>
          </div>
        );
      }

      case "pet_panda": {
        const pandaAura = `pandaAura-${uId}`;
        const pandaBody = `pandaBody-${uId}`;
        const jadeStaff = `jadeStaff-${uId}`;
        const innerShadow = `innerShadow-${uId}`;
        const glowFilter = `glow-${uId}`;
        const noiseFilter = `noise-${uId}`;
        return (
          <div className={cn("relative w-5 h-5 flex items-center justify-center animate-pet-float-slow", className)} title="武神熊貓">
            {/* SSR Jade Emerald Aura */}
            <div className="absolute inset-[-4px] rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 opacity-25 blur-md animate-pulse" />
            <div className="absolute inset-0 bg-emerald-500/10 rounded-full blur-xl pointer-events-none" />

            <svg viewBox="0 0 24 24" className="w-full h-full drop-shadow-[0_0_7px_rgba(16,185,129,0.85)]">
              <defs>
                <radialGradient id={pandaAura} cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.55" />
                  <stop offset="55%" stopColor="#047857" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#064e3b" stopOpacity="0" />
                </radialGradient>
                <linearGradient id={pandaBody} x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="60%" stopColor="#f1f5f9" />
                  <stop offset="100%" stopColor="#cbd5e1" />
                </linearGradient>
                <linearGradient id={jadeStaff} x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#a7f3d0" />
                  <stop offset="50%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#047857" />
                </linearGradient>
                <filter id={innerShadow} x="-20%" y="-20%" width="140%" height="140%">
                  <feOffset dx="0.2" dy="0.4"/>
                  <feGaussianBlur stdDeviation="0.4" result="offset-blur"/>
                  <feComposite operator="out" in="SourceGraphic" in2="offset-blur" result="inverse"/>
                  <feFlood flood-color="black" flood-opacity="0.22" result="color"/>
                  <feComposite operator="in" in="color" in2="inverse" result="shadow"/>
                  <feComposite operator="over" in="shadow" in2="SourceGraphic"/>
                </filter>
                <filter id={glowFilter} x="-25%" y="-25%" width="150%" height="150%">
                  <feGaussianBlur stdDeviation="1.1" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
                <filter id={noiseFilter}>
                  <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" result="noise"/>
                  <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.035 0" />
                  <feBlend mode="multiply" in="SourceGraphic" in2="noise"/>
                </filter>
              </defs>
              {/* Background Aura */}
              <circle cx="12" cy="12" r="10.5" fill={`url(#${pandaAura})`} className="origin-center animate-[auraBreathingSlow_2.8s_infinite_ease-in-out]" />
              {/* Circular Energy Shield Ring */}
              <circle 
                cx="12" 
                cy="12" 
                r="9.5" 
                fill="none" 
                stroke="#6ee7b7" 
                strokeWidth="0.4" 
                strokeDasharray="5 3 2 3" 
                opacity="0.3"
                className="origin-center animate-[spinSlow_10s_linear_infinite]"
              />
              {/* Particles */}
              <g filter={`url(#${glowFilter})`}>
                <circle cx="4.5" cy="15" r="0.65" fill="#a7f3d0" className="animate-[floatParticleA_2.2s_infinite]" />
                <circle cx="19.5" cy="13" r="0.75" fill="#34d399" className="animate-[floatParticleB_2.6s_infinite]" />
              </g>
              {/* Body */}
              <ellipse cx="12" cy="15" rx="6.5" ry="5.5" fill={`url(#${pandaBody})`} filter={`url(#${innerShadow}) url(#${noiseFilter})`} />
              {/* Black arms & legs overlay */}
              <ellipse cx="5.8" cy="15" rx="1.5" ry="3.5" fill="#0f172a" />
              <ellipse cx="18.2" cy="15" rx="1.5" ry="3.5" fill="#0f172a" />
              <circle cx="7.8" cy="19.5" r="1.5" fill="#0f172a" />
              <circle cx="16.2" cy="19.5" r="1.5" fill="#0f172a" />
              {/* Head */}
              <circle cx="12" cy="9.2" r="4.8" fill={`url(#${pandaBody})`} filter={`url(#${innerShadow}) url(#${noiseFilter})`} />
              {/* Specular Highlight on Head */}
              <ellipse cx="12" cy="5.2" rx="1.3" ry="0.45" fill="white" opacity="0.35" />
              {/* Black ears (with wiggling animation) */}
              <circle cx="7.8" cy="5.2" r="1.8" fill="#0f172a" className="origin-[7.8px_5.2px] animate-[earWiggleLeft_2.2s_infinite_ease-in-out_alternate]" />
              <circle cx="16.2" cy="5.2" r="1.8" fill="#0f172a" className="origin-[16.2px_5.2px] animate-[earWiggleRight_2.2s_infinite_ease-in-out_alternate_delay-150]" />
              {/* Black eye patches */}
              <ellipse cx="10" cy="8.8" rx="1.5" ry="1.9" fill="#0f172a" transform="rotate(12 10 8.8)" />
              <ellipse cx="14" cy="8.8" rx="1.5" ry="1.9" fill="#0f172a" transform="rotate(-12 14 8.8)" />
              {/* Glowing jade eyes */}
              <g filter={`url(#${glowFilter})`}>
                <circle cx="10.2" cy="8.6" r="0.65" fill="#6ee7b7" className="animate-pulse" />
                <circle cx="10.0" cy="8.4" r="0.18" fill="white" />
                <circle cx="13.8" cy="8.6" r="0.65" fill="#6ee7b7" className="animate-pulse" />
                <circle cx="13.6" cy="8.4" r="0.18" fill="white" />
              </g>
              {/* Nose & Mouth */}
              <polygon points="12,10.2 11.5,9.7 12.5,9.7" fill="#020617" />
              <path d="M11,10.8 Q12,11.3 13,10.8" stroke="#0f172a" strokeWidth="0.5" fill="none" />
              {/* Jade Staff (Wiggling/spinning staff with trail) */}
              <g className="origin-[15px_14px] animate-[tailWagSlow_2.5s_infinite_ease-in-out_alternate]">
                <rect 
                  x="14.5" 
                  y="10" 
                  width="1.2" 
                  height="8" 
                  rx="0.6" 
                  transform="rotate(35 15 10)" 
                  fill={`url(#${jadeStaff})`} 
                  filter={`url(#${innerShadow})`}
                />
                {/* Glowing tip of staff */}
                <circle cx="18.8" cy="9.4" r="1.3" fill="#6ee7b7" className="animate-ping" />
                <circle cx="18.8" cy="9.4" r="0.8" fill="#a7f3d0" />
              </g>
              {/* Foreground Sparkles */}
              <g filter={`url(#${glowFilter})`}>
                <path d="M 8, 2.5 Q 8, 3.2 8.6, 3.2 Q 8, 3.2 8, 3.9 Q 8, 3.2 7.4, 3.2 Q 8, 3.2 8, 2.5" fill="#a7f3d0" className="animate-[floatParticleC_2s_infinite]" />
              </g>
            </svg>
          </div>
        );
      }

      default:
        return null;
    }
  };

  const petContent = renderPetContent();
  if (!petContent) return null;

  return (
    <>
      {styleBlock}
      {petContent}
    </>
  );
};
