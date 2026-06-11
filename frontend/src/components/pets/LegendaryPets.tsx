import React from "react";
import { cn } from "../../lib/utils";

interface PetComponentProps {
  uId: string;
  animClass: string;
  className?: string;
}

export const KirbyPet: React.FC<PetComponentProps> = ({ uId, className }) => {
  const kirbyBackGrad = `kirbyBackGrad-${uId}`;
  const kirbyBodyGrad = `kirbyBodyGrad-${uId}`;
  const starGrad = `starGrad-${uId}`;
  const glowFilter = `glow-${uId}`;
  return (
    <div className={cn("relative w-28 h-28 flex items-center justify-center animate-[petFloat_2.8s_infinite_ease-in-out]", className)} title="櫻粉卡比">
      {/* Pink Magic Celestial Glow */}
      <div className="absolute inset-[-6px] rounded-full bg-pink-500/20 blur-lg pointer-events-none animate-pulse" />
      <svg viewBox="0 0 24 24" className="w-full h-full overflow-visible drop-shadow-[0_4px_12px_rgba(236,72,153,0.55)]">
        <defs>
          <radialGradient id={kirbyBackGrad} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fdf2f8" stopOpacity="0.5" />
            <stop offset="60%" stopColor="#fbcfe8" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#f472b6" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={kirbyBodyGrad} x1="30%" y1="0%" x2="70%" y2="100%">
            <stop offset="0%" stopColor="#fecdd3" />
            <stop offset="50%" stopColor="#fda4af" />
            <stop offset="100%" stopColor="#f43f5e" />
          </linearGradient>
          <linearGradient id={starGrad} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="60%" stopColor="#facc15" />
            <stop offset="100%" stopColor="#eab308" />
          </linearGradient>
          <filter id={glowFilter} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="0.75" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Rotating Constellation Emblem Ring */}
        <circle cx="12" cy="12" r="10.8" fill="none" stroke="#f472b6" strokeWidth="0.32" strokeDasharray="3 4" opacity="0.45" className="origin-center animate-[rotateCw_15s_linear_infinite]" />
        <circle cx="12" cy="12" r="9.8" fill={`url(#${kirbyBackGrad})`} className="origin-center animate-[auraBreathing_2.3s_infinite_ease-in-out]" />

        {/* Flashing Galaxy Stars / Particles */}
        <g filter={`url(#${glowFilter})`}>
          <polygon points="4.5,14.5 4.8,15.1 5.4,14.8 5.0,15.4 5.5,15.8 4.9,15.7 4.5,16.3 4.4,15.7 3.8,15.8 4.3,15.4 3.9,14.8 4.5,15.1" fill="#fff" className="animate-[floatParticleA_2.2s_infinite]" />
          <circle cx="19.5" cy="10.5" r="0.75" fill="#fde047" className="animate-[floatParticleB_2.6s_infinite]" />
          <polygon points="12,3.5 12.3,4.1 12.9,3.8 12.5,4.4 13.0,4.8 12.4,4.7 12,5.3 11.9,4.7 11.3,4.8 11.8,4.4 11.4,3.8 12,4.1" fill="#fff" className="animate-[floatParticleC_2.0s_infinite]" />
        </g>

        {/* Legendary Warp Star - Golden 3D Riding Platform */}
        <g className="origin-[12px_15.5px] animate-[legendaryAccessoryOscillating_2.0s_infinite_ease-in-out]">
          {/* 3D Warp Star Base */}
          <path d="M12,12.2 L14.8,14.0 L18.0,13.2 L15.4,15.6 L16.4,18.8 L12,17.0 L7.6,18.8 L8.6,15.6 L6.0,13.2 L9.2,14.0 Z" fill={`url(#${starGrad})`} stroke="#ca8a04" strokeWidth="0.35" />
          {/* Highlights on Warp Star for depth */}
          <path d="M12,12.2 L12,17.0 L7.6,18.8 L8.6,15.6 L6.0,13.2 Z" fill="#fef9c3" opacity="0.25" />
          <path d="M12,12.2 L12,17.0 L16.4,18.8 L15.4,15.6 Z" fill="#ca8a04" opacity="0.18" />
        </g>

        {/* Wiggling Circular Hands */}
        {/* Left Hand waving up */}
        <ellipse cx="6.8" cy="10.2" rx="1.2" ry="1.0" fill="#fda4af" stroke="#e11d48" strokeWidth="0.3" className="origin-[7.4px_10.6px] animate-[earWiggleLeft_1.5s_infinite_ease-in-out_alternate]" />
        {/* Right Hand waving down */}
        <ellipse cx="17.2" cy="10.2" rx="1.2" ry="1.0" fill="#fda4af" stroke="#e11d48" strokeWidth="0.3" className="origin-[16.6px_10.6px] animate-[earWiggleRight_1.5s_infinite_ease-in-out_alternate_delay-100]" />

        {/* Red Oval Feet sticking out from bottom sides */}
        <g className="origin-[12px_13px] animate-[legendaryAccessoryOscillating_2.0s_infinite_ease-in-out]">
          {/* Left foot */}
          <ellipse cx="8.4" cy="14.2" rx="1.6" ry="1.0" fill="#be185d" stroke="#9f1239" strokeWidth="0.3" transform="rotate(-25 8.4 14.2)" />
          {/* Right foot */}
          <ellipse cx="15.6" cy="14.2" rx="1.6" ry="1.0" fill="#be185d" stroke="#9f1239" strokeWidth="0.3" transform="rotate(25 15.6 14.2)" />
        </g>

        {/* Perfectly round Kirby Pink Body */}
        <ellipse cx="12" cy="10.2" rx="4.8" ry="4.5" fill={`url(#${kirbyBodyGrad})`} stroke="#db2777" strokeWidth="0.4" />

        {/* Deep sapphire anime eyes */}
        <g>
          {/* Left eye */}
          <ellipse cx="10.4" cy="9.0" rx="0.45" ry="1.2" fill="#1e1b4b" />
          <ellipse cx="10.4" cy="9.6" rx="0.45" ry="0.6" fill="#0284c7" />
          <circle cx="10.4" cy="8.4" r="0.22" fill="#ffffff" />
          
          {/* Right eye */}
          <ellipse cx="13.6" cy="9.0" rx="0.45" ry="1.2" fill="#1e1b4b" />
          <ellipse cx="13.6" cy="9.6" rx="0.45" ry="0.6" fill="#0284c7" />
          <circle cx="13.6" cy="8.4" r="0.22" fill="#ffffff" />
        </g>

        {/* Expressive happy open mouth with pink tongue inside */}
        <g>
          {/* Open mouth */}
          <path d="M11,10.5 C11,12.0 13,12.0 13,10.5 Z" fill="#9f1239" stroke="#9f1239" strokeWidth="0.25" />
          {/* Tongue overlay */}
          <path d="M11.4,11.0 C11.5,11.6 12.5,11.6 12.6,11.0 Z" fill="#fecdd3" />
        </g>

        {/* Glowing oval neon blush cheeks */}
        <ellipse cx="8.6" cy="10.6" rx="0.75" ry="0.42" fill="#fb7185" opacity="0.85" filter={`url(#${glowFilter})`} />
        <ellipse cx="15.4" cy="10.6" rx="0.75" ry="0.42" fill="#fb7185" opacity="0.85" filter={`url(#${glowFilter})`} />
      </svg>
    </div>
  );
};

export const TotoroPet: React.FC<PetComponentProps> = ({ uId, className }) => {
  const totoroBackGrad = `totoroBackGrad-${uId}`;
  const totoroBodyGrad = `totoroBodyGrad-${uId}`;
  const leafGrad = `leafGrad-${uId}`;
  const glowFilter = `glow-${uId}`;
  return (
    <div className={cn("relative w-28 h-28 flex items-center justify-center animate-[petFloat_2.8s_infinite_ease-in-out]", className)} title="守護龍貓">
      {/* Emerald Mystic Forest Glow */}
      <div className="absolute inset-[-6px] rounded-full bg-lime-500/15 blur-lg pointer-events-none animate-pulse" />
      <svg viewBox="0 0 24 24" className="w-full h-full overflow-visible drop-shadow-[0_4px_12px_rgba(101,163,8,0.5)]">
        <defs>
          <radialGradient id={totoroBackGrad} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#f7fee7" stopOpacity="0.45" />
            <stop offset="65%" stopColor="#d9f99d" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#a3e635" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={totoroBodyGrad} x1="30%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor="#94a3b8" />
            <stop offset="60%" stopColor="#475569" />
            <stop offset="100%" stopColor="#334155" />
          </linearGradient>
          <linearGradient id={leafGrad} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#a3e635" />
            <stop offset="100%" stopColor="#4d7c0f" />
          </linearGradient>
          <filter id={glowFilter} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="0.6" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Forest Mystic Hex Seal */}
        <circle cx="12" cy="12" r="10.8" fill="none" stroke="#84cc16" strokeWidth="0.28" strokeDasharray="5 2 1 2" opacity="0.45" className="origin-center animate-[rotateCcw_13s_linear_infinite]" />
        <circle cx="12" cy="12" r="9.8" fill={`url(#${totoroBackGrad})`} className="origin-center animate-[auraBreathingSlow_2.5s_infinite_ease-in-out]" />

        {/* Floating magical green leaves / Sparkles */}
        <g filter={`url(#${glowFilter})`}>
          <circle cx="4.5" cy="13.5" r="0.6" fill="#bef264" className="animate-[floatParticleA_2.0s_infinite]" />
          <path d="M19.5,12.5 C19.0,11.5 18.0,12.5 19.5,13.5 Z" fill="#65a30d" className="animate-[floatParticleB_2.5s_infinite]" />
          <circle cx="13.0" cy="4.5" r="0.55" fill="#bef264" className="animate-[floatParticleC_2.2s_infinite]" />
        </g>

        {/* Long Fluffy Ears wiggling up */}
        {/* Left ear */}
        <path d="M8.4,5.4 Q7.4,1.8 8.8,3.2 Z" fill="#475569" stroke="#1e293b" strokeWidth="0.32" className="origin-[8.4px_5.4px] animate-[earWiggleLeft_1.8s_infinite_ease-in-out_alternate]" />
        {/* Right ear */}
        <path d="M15.6,5.4 Q16.6,1.8 15.2,3.2 Z" fill="#475569" stroke="#1e293b" strokeWidth="0.32" className="origin-[15.6px_5.4px] animate-[earWiggleRight_1.8s_infinite_ease-in-out_alternate_delay-100]" />

        {/* Giant Fluffy Grey Body - Unified Egg/Pear Shape encompassing both Head & Torso */}
        <path 
          d="M 8.5, 6.5 
             C 8.5, 4.4  15.5, 4.4  15.5, 6.5 
             C 18.0, 8.5  19.5, 12.0  19.0, 18.0 
             C 18.5, 21.0  5.5, 21.0  5.0, 18.0 
             C 4.5, 12.0  6.0, 8.5  8.5, 6.5 Z" 
          fill={`url(#${totoroBodyGrad})`} 
          stroke="#1e293b" 
          strokeWidth="0.4" 
        />

        {/* Cute little grey arms on the sides */}
        {/* Left Arm */}
        <path d="M 6.2, 12 C 4.8, 13 5.4, 15.5 7.6, 14.2" fill="none" stroke="#1e293b" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M 6.2, 12 C 4.8, 13 5.4, 15.5 7.6, 14.2" fill="none" stroke="#475569" strokeWidth="1.5" strokeLinecap="round" />

        {/* Right Arm */}
        <path d="M 17.8, 12 C 19.2, 13 18.6, 15.5 16.4, 14.2" fill="none" stroke="#1e293b" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M 17.8, 12 C 19.2, 13 18.6, 15.5 16.4, 14.2" fill="none" stroke="#475569" strokeWidth="1.5" strokeLinecap="round" />

        {/* Big fluffy white belly overlay */}
        <ellipse cx="12" cy="16.2" rx="5.4" ry="4.2" fill="#fdfdf9" stroke="#475569" strokeWidth="0.2" />

        {/* Iconic Totoro Grey Tummy Arrows */}
        <g>
          {/* Row 1 */}
          <path d="M9.8,14.0 Q10.4,13.4 11.0,14.0 Q10.4,14.3 9.8,14.0 Z" fill="#475569" />
          <path d="M11.4,13.8 Q12.0,13.2 12.6,13.8 Q12.0,14.1 11.4,13.8 Z" fill="#475569" />
          <path d="M13.0,14.0 Q13.6,13.4 14.2,14.0 Q13.6,14.3 13.0,14.0 Z" fill="#475569" />
          {/* Row 2 */}
          <path d="M10.4,15.8 Q11.0,15.2 11.6,15.8 Q11.0,16.1 10.4,15.8 Z" fill="#475569" />
          <path d="M12.4,15.8 Q13.0,15.2 13.6,15.8 Q13.0,16.1 12.4,15.8 Z" fill="#475569" />
        </g>

        {/* Classic Blank Staring Eyes */}
        <g>
          {/* Left eye */}
          <circle cx="9.2" cy="8.2" r="1.15" fill="#ffffff" stroke="#1e293b" strokeWidth="0.32" />
          <circle cx="9.0" cy="8.2" r="0.45" fill="#0f172a" />
          
          {/* Right eye */}
          <circle cx="14.8" cy="8.2" r="1.15" fill="#ffffff" stroke="#1e293b" strokeWidth="0.32" />
          <circle cx="15.0" cy="8.2" r="0.45" fill="#0f172a" />
        </g>

        {/* Small inverted triangle flat nose */}
        <polygon points="12,8.6 11.2,8.1 12.8,8.1" fill="#000" />

        {/* Six cute black whiskers (3 on each cheek) */}
        <g stroke="#1e293b" strokeWidth="0.35" strokeLinecap="round">
          {/* Left whiskers */}
          <line x1="4.5" y1="9.3" x2="6.8" y2="9.6" />
          <line x1="4.1" y1="10.2" x2="6.5" y2="10.2" />
          <line x1="4.5" y1="11.1" x2="6.8" y2="10.8" />
          
          {/* Right whiskers */}
          <line x1="19.5" y1="9.3" x2="17.2" y2="9.6" />
          <line x1="19.9" y1="10.2" x2="17.5" y2="10.2" />
          <line x1="19.5" y1="11.1" x2="17.2" y2="10.8" />
        </g>

        {/* Charming little green head leaf sprout */}
        <g className="origin-[12px_4.8px] animate-[earWiggleLeft_2.0s_infinite_ease-in-out_alternate]">
          {/* Leaf stem */}
          <path d="M12,4.8 L12,3.3" stroke="#4d7c0f" strokeWidth="0.45" strokeLinecap="round" />
          {/* Leaf blades */}
          <path d="M12,3.3 C10.8,2.2 10.2,3.6 12,4.0" fill={`url(#${leafGrad})`} stroke="#3f6212" strokeWidth="0.2" />
          <path d="M12,3.3 C13.2,2.2 13.8,3.6 12,4.0" fill={`url(#${leafGrad})`} stroke="#3f6212" strokeWidth="0.2" />
        </g>

        {/* Tiny Claws on front hands */}
        <ellipse cx="8.4" cy="13.2" rx="0.5" ry="0.35" fill="#ffffff" stroke="#1e293b" strokeWidth="0.2" />
        <ellipse cx="15.6" cy="13.2" rx="0.5" ry="0.35" fill="#ffffff" stroke="#1e293b" strokeWidth="0.2" />
      </svg>
    </div>
  );
};

export const SnorlaxPet: React.FC<PetComponentProps> = ({ uId, className }) => {
  const snorlaxAura = `snorlaxAura-${uId}`;
  const snorlaxBodyGrad = `snorlaxBodyGrad-${uId}`;
  const glowFilter = `glow-${uId}`;
  return (
    <div className={cn("relative w-28 h-28 flex items-center justify-center animate-[petFloat_2.8s_infinite_ease-in-out]", className)} title="永眠卡比獸">
      {/* Cozy Teal Sleepy Aura */}
      <div className="absolute inset-[-6px] rounded-full bg-cyan-500/15 blur-lg pointer-events-none animate-pulse" />
      <svg viewBox="0 0 24 24" className="w-full h-full overflow-visible drop-shadow-[0_4px_12px_rgba(13,148,136,0.52)]">
        <defs>
          <radialGradient id={snorlaxAura} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ecfeff" stopOpacity="0.45" />
            <stop offset="60%" stopColor="#cffafe" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={snorlaxBodyGrad} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0d9488" />
            <stop offset="60%" stopColor="#115e59" />
            <stop offset="100%" stopColor="#042f2e" />
          </linearGradient>
          <filter id={glowFilter} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="0.65" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Celestial Dream Emblem Ring with slow rotate */}
        <circle cx="12" cy="12" r="10.8" fill="none" stroke="#22d3ee" strokeWidth="0.3" strokeDasharray="6 3 2 3" opacity="0.38" className="origin-center animate-[rotateCw_11s_linear_infinite]" />
        <circle cx="12" cy="12" r="9.8" fill={`url(#${snorlaxAura})`} className="origin-center animate-[auraBreathing_2.4s_infinite_ease-in-out]" />

        {/* Animated rising "Zzz" Sleep Letters */}
        <g fontStyle="italic" fontWeight="bold" fontFamily="monospace">
          <text x="4.5" y="16.5" fill="#22d3ee" fontSize="1.8" opacity="0.6" className="animate-[floatParticleA_2.8s_infinite]">Z</text>
          <text x="19.5" y="11.5" fill="#22d3ee" fontSize="1.4" opacity="0.65" className="animate-[floatParticleB_2.4s_infinite]">z</text>
          <text x="13.0" y="4.5" fill="#22d3ee" fontSize="2.0" opacity="0.6" className="animate-[floatParticleC_2.1s_infinite]">Z</text>
        </g>

        {/* Giant Sleepy Head */}
        <path d="M8.2,10.0 Q8.2,5.2 12.0,5.2 Q15.8,5.2 15.8,10.0 Z" fill={`url(#${snorlaxBodyGrad})`} stroke="#042f2e" strokeWidth="0.38" />

        {/* Pointy Cat ears on top of head */}
        <polygon points="8.4,6.2 6.8,3.2 9.8,5.6" fill="#115e59" stroke="#042f2e" strokeWidth="0.3" />
        <polygon points="15.6,6.2 17.2,3.2 14.2,5.6" fill="#115e59" stroke="#042f2e" strokeWidth="0.3" />

        {/* Sleepy Peach Mask face overlay */}
        <path d="M9.1,10.2 C9.1,7.2 10.5,6.2 12,8.0 C13.5,6.2 14.9,7.2 14.9,10.2 C14.9,12.2 13.5,12.5 12,12.5 C10.5,12.5 9.1,12.2 9.1,10.2 Z" fill="#ffedd5" />

        {/* Perfectly Closed Sleepy Eyes */}
        <path d="M9.8,9.2 Q10.4,9.6 11.0,9.2" stroke="#1e293b" strokeWidth="0.6" fill="none" strokeLinecap="round" />
        <path d="M13.0,9.2 Q13.6,9.6 14.2,9.2" stroke="#1e293b" strokeWidth="0.6" fill="none" strokeLinecap="round" />

        {/* Silent sleeping mouth curve */}
        <path d="M11.2,10.4 Q12.0,11.0 12.8,10.4" stroke="#1e293b" strokeWidth="0.4" fill="none" strokeLinecap="round" />
        
        {/* Two cute white fangs sticking upward */}
        <polygon points="11.3,10.3 11.5,9.6 11.7,10.3" fill="#ffffff" />
        <polygon points="12.3,10.3 12.5,9.6 12.7,10.3" fill="#ffffff" />

        {/* Giant Tubby Snorlax Body */}
        <ellipse cx="12" cy="15.6" rx="7.4" ry="6.4" fill={`url(#${snorlaxBodyGrad})`} stroke="#042f2e" strokeWidth="0.4" />

        {/* Oversized peach stomach patch */}
        <ellipse cx="12" cy="16.2" rx="5.6" ry="4.4" fill="#ffedd5" stroke="#115e59" strokeWidth="0.25" opacity="0.95" />

        {/* Fat chunky lazy resting arms */}
        <path d="M6.0,14.5 Q3.4,15.5 5.2,16.8 L5.8,15.5" fill="#115e59" stroke="#042f2e" strokeWidth="0.32" />
        <path d="M18.0,14.5 Q20.6,15.5 18.8,16.8 L18.2,15.5" fill="#115e59" stroke="#042f2e" strokeWidth="0.32" />

        {/* Left and Right Feet with distinct white claws and pads */}
        {/* Left foot */}
        <circle cx="6.5" cy="19.2" r="1.45" fill="#ffedd5" stroke="#042f2e" strokeWidth="0.3" />
        <g fill="#ffffff">
          <circle cx="5.6" cy="18.2" r="0.25" />
          <circle cx="6.5" cy="17.8" r="0.25" />
          <circle cx="7.4" cy="18.0" r="0.25" />
        </g>
        <circle cx="6.5" cy="19.4" r="0.65" fill="#b45309" opacity="0.45" />

        {/* Right foot */}
        <circle cx="17.5" cy="19.2" r="1.45" fill="#ffedd5" stroke="#042f2e" strokeWidth="0.3" />
        <g fill="#ffffff">
          <circle cx="16.6" cy="18.0" r="0.25" />
          <circle cx="17.5" cy="17.8" r="0.25" />
          <circle cx="18.4" cy="18.2" r="0.25" />
        </g>
        <circle cx="17.5" cy="19.4" r="0.65" fill="#b45309" opacity="0.45" />

        {/* Wiggling blue sleep bubble near mouth */}
        <g className="origin-[13.8px_10.2px] animate-[legendaryAccessoryOscillating_2.2s_infinite_ease-in-out_delay-150]">
          {/* Translucent shiny bubble */}
          <circle cx="14.5" cy="10.8" r="0.9" fill="#22d3ee" fillOpacity="0.25" stroke="#22d3ee" strokeWidth="0.28" filter={`url(#${glowFilter})`} />
          <circle cx="14.2" cy="10.4" r="0.25" fill="#ffffff" fillOpacity="0.75" />
        </g>
      </svg>
    </div>
  );
};

export const ChickPet: React.FC<PetComponentProps> = ({ uId, animClass, className }) => {
  const keroBackGrad = `keroBackGrad-${uId}`;
  const keroBodyGrad = `keroBodyGrad-${uId}`;
  const keroInnerEarGrad = `keroInnerEarGrad-${uId}`;
  const keroWingGrad = `keroWingGrad-${uId}`;
  const keroFluffGrad = `keroFluffGrad-${uId}`;
  const glowFilter = `glow-${uId}`;
  return (
    <div className={cn("relative w-28 h-28 flex items-center justify-center", animClass, className)} title="小可">
      {/* Soft Golden Background Glow (Static) */}
      <div className="absolute inset-[-6px] rounded-full bg-amber-400/20 blur-lg pointer-events-none animate-pulse" />
      <svg viewBox="0 0 64 64" className="w-full h-full overflow-visible drop-shadow-[0_4px_10px_rgba(245,158,11,0.48)]">
        <defs>
          <radialGradient id={keroBackGrad} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fef08a" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#fef08a" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={keroBodyGrad} x1="30%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor="#fff275" />
            <stop offset="55%" stopColor="#fec21b" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>
          <linearGradient id={keroInnerEarGrad} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffedd5" />
            <stop offset="100%" stopColor="#fed7aa" />
          </linearGradient>
          <linearGradient id={keroWingGrad} x1="30%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="65%" stopColor="#fffae0" />
            <stop offset="100%" stopColor="#fde047" />
          </linearGradient>
          <radialGradient id={keroFluffGrad} cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="70%" stopColor="#fffbeb" />
            <stop offset="100%" stopColor="#fef08a" />
          </radialGradient>
          <filter id={glowFilter} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="0.4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Legend-Specific Rotating Magical Rings */}
        <circle cx="32" cy="32" r="28" fill="none" stroke="#facc15" strokeWidth="0.45" strokeDasharray="5 3 2 3" opacity="0.45" className="origin-center animate-[rotateCw_15s_linear_infinite]" />

        {/* Back Light / Background Aura with Breathing effect */}
        <circle cx="32" cy="32" r="24" fill={`url(#${keroBackGrad})`} className="origin-center animate-[auraBreathing_2.3s_infinite_ease-in-out]" />

        {/* Static Sparkle Magic Star Particles for atmosphere */}
        <g filter={`url(#${glowFilter})`} opacity="0.8">
          <path d="M 10,16 L 11.5,14 L 10,12 L 8.5,14 Z M 8.5,14 L 6,14 L 8.5,15 L 10,17 Z" fill="#fef08a" />
          <path d="M 54,12 L 55,10 L 54,8 L 53,10 Z M 53,10 L 51,10 L 53,11 L 54,13 Z" fill="#fff" />
        </g>

        {/* Legendary Floating and rising micro-particles */}
        <g filter={`url(#${glowFilter})`}>
          <circle cx="12" cy="18" r="1.3" fill="#facc15" className="animate-[floatParticleA_2.2s_infinite]" />
          <circle cx="52" cy="15" r="1.0" fill="#ffffff" className="animate-[floatParticleB_2.6s_infinite]" />
          <circle cx="14" cy="45" r="1.2" fill="#fbbf24" className="animate-[floatParticleC_2.0s_infinite]" />
          <circle cx="48" cy="43" r="1.1" fill="#facc15" className="animate-[floatParticleA_2.5s_infinite]" />
        </g>

        {/* Left Wing with Slightly Flapping animation relative to body connection */}
        <g className="origin-[23px_26px] animate-[wingFlapLeft_2.2s_infinite_ease-in-out] drop-shadow-[0_0_5px_rgba(253,224,71,0.7)]">
          {/* Left Top Feather */}
          <path d="M 23,23 C 17,14 10,6 6,4 C 4,3 3,5 4,8 C 7,16 14,21 21,24 Z" fill={`url(#${keroWingGrad})`} stroke="#131317" strokeWidth="0.75" strokeLinejoin="round" />
          {/* Left Middle Feather */}
          <path d="M 23,26.5 C 14,21.5 6,19.5 2,21.5 C 0,22.5 0,24.5 2,26.5 C 8,29.5 15,29.5 21,28.5 Z" fill={`url(#${keroWingGrad})`} stroke="#131317" strokeWidth="0.75" strokeLinejoin="round" />
          {/* Left Bottom Feather */}
          <path d="M 22,34 C 15,31 7,29 4,33 C 2,35 3.5,37 7,37 C 13,37 17,35 21,34 Z" fill={`url(#${keroWingGrad})`} stroke="#131317" strokeWidth="0.75" strokeLinejoin="round" />
        </g>

        {/* Right Wing with Slightly Flapping animation relative to body connection */}
        <g className="origin-[41px_26px] animate-[wingFlapRight_2.2s_infinite_ease-in-out] drop-shadow-[0_0_5px_rgba(253,224,71,0.7)]">
          {/* Right Top Feather */}
          <path d="M 41,23 C 47,14 54,6 58,4 C 60,3 61,5 60,8 C 57,16 50,21 43,24 Z" fill={`url(#${keroWingGrad})`} stroke="#131317" strokeWidth="0.75" strokeLinejoin="round" />
          {/* Right Middle Feather */}
          <path d="M 41,26.5 C 50,21.5 58,19.5 62,21.5 C 64,22.5 64,24.5 62,26.5 C 56,29.5 49,29.5 43,28.5 Z" fill={`url(#${keroWingGrad})`} stroke="#131317" strokeWidth="0.75" strokeLinejoin="round" />
          {/* Right Bottom Feather */}
          <path d="M 42,34 C 49,31 57,29 60,33 C 62,35 60.5,37 57,37 C 51,37 47,35 43,34 Z" fill={`url(#${keroWingGrad})`} stroke="#131317" strokeWidth="0.75" strokeLinejoin="round" />
        </g>

        {/* Long Elegant Tail with White Puff - Static */}
        <path d="M 32,42 Q 33,52 40,51 T 44,43" fill="none" stroke="#fec21b" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M 32,42 Q 33,52 40,51 T 44,43" fill="none" stroke="#fff275" strokeWidth="0.8" strokeLinecap="round" opacity="0.8" />
        <g className="origin-[44px_43px]">
          <path d="M 49.5,43.0 L 47.3,41.6 L 47.9,39.1 L 45.4,39.7 L 44.0,37.5 L 42.6,39.7 L 40.1,39.1 L 40.7,41.6 L 38.5,43.0 L 40.7,44.4 L 40.1,46.9 L 42.6,46.3 L 44.0,48.5 L 45.4,46.3 L 47.9,46.9 L 47.3,44.4 Z" fill={`url(#${keroFluffGrad})`} stroke="#d97706" strokeWidth="0.45" strokeLinejoin="miter" />
          <circle cx="43" cy="42" r="1.5" fill="#ffffff" opacity="0.6" />
          <path d="M 42.5,41.5 Q 44,40.5 45.5,41.5" stroke="#ffffff" strokeWidth="0.6" fill="none" strokeLinecap="round" opacity="0.8" />
        </g>

        {/* Elongated Unified Body, Legs, and Arms - Seamlessly Integrated as a Single Masterpiece Path */}
        <path d="M 26,30 C 22,28 15,23 13,25 C 11,27 18,33 24,34 C 21,37 18,43 20,48 C 21.5,51 25.5,47 27,43 Q 32,41 37,43 C 38.5,47 42.5,51 44,48 C 46,43 43,37 40,34 C 46,33 53,27 51,25 C 49,23 42,28 38,30 Z" fill={`url(#${keroBodyGrad})`} stroke="#131317" strokeWidth="0.75" strokeLinejoin="round" />

        {/* Head - Static with Matching Fine Outline */}
        <ellipse cx="32" cy="23" rx="12" ry="11" fill={`url(#${keroBodyGrad})`} stroke="#131317" strokeWidth="0.75" />

        {/* Ears - Static with Matching Fine Outline */}
        {/* Left Ear */}
        <g>
          <circle cx="21" cy="15" r="4.2" fill={`url(#${keroBodyGrad})`} stroke="#131317" strokeWidth="0.75" />
          <circle cx="21" cy="15" r="2.4" fill={`url(#${keroInnerEarGrad})`} stroke="#131317" strokeWidth="0.4" />
        </g>

        {/* Right Ear */}
        <g>
          <circle cx="43" cy="15" r="4.2" fill={`url(#${keroBodyGrad})`} stroke="#131317" strokeWidth="0.75" />
          <circle cx="43" cy="15" r="2.4" fill={`url(#${keroInnerEarGrad})`} stroke="#131317" strokeWidth="0.4" />
        </g>

        {/* Delicate Smaller Happy Curved Eyes (Static, exactly like Reference Image 1) */}
        <g stroke="#131317" strokeWidth="1.05" strokeLinecap="round" fill="none">
          <path d="M 24.2,21.3 Q 25.5,19.9 26.8,21.3" />
          <path d="M 37.2,21.3 Q 38.5,19.9 39.8,21.3" />
        </g>

        {/* Nose */}
        <polygon points="32,22.8 31.0,21.8 33.0,21.8" fill="#131317" />

        {/* Mouth - Sweet Open Smile without sharp rebel fangs (Static) */}
        <g>
          <path d="M 28,24 Q 32,23 36,24 Q 37.5,31 32,31 Q 26.5,31 28,24 Z" fill="#b91c1c" stroke="#131317" strokeWidth="0.6" strokeLinejoin="round" />
          {/* Cute pink tongue inside */}
          <path d="M 28.5,27.5 C 30,30.5 34,30.5 35.5,27.5 C 34,30.5 30,30.5 28.5,27.5 Z" fill="#fda4af" />
        </g>

        {/* Cute Cheek Blush (Static) */}
        <circle cx="21" cy="24" r="1.3" fill="#f43f5e" opacity="0.6" filter={`url(#${glowFilter})`} />
        <circle cx="43" cy="24" r="1.3" fill="#f43f5e" opacity="0.6" filter={`url(#${glowFilter})`} />
      </svg>
    </div>
  );
};
