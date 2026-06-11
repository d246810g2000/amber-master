import React from "react";
import { cn } from "../../lib/utils";

interface PetComponentProps {
  uId: string;
  animClass: string;
  className?: string;
}

export const SlimeKingPet: React.FC<PetComponentProps> = ({ uId, animClass, className }) => {
  const rimuruBodyGrad = `rimuruBodyGrad-${uId}`;
  const rimuruBackGrad = `rimuruBackGrad-${uId}`;
  const rimuruInnerShadow = `rimuruInnerShadow-${uId}`;
  const rimuruHighlightGrad = `rimuruHighlightGrad-${uId}`;
  const rimuruShadowGrad = `rimuruShadowGrad-${uId}`;
  const eyeId = `rimuruEye-${uId}`;

  return (
    <div className={cn("relative w-28 h-28 flex items-center justify-center animate-[epicSquashBounce_1.3s_infinite_ease-in-out]", animClass, className)} title="利姆路·坦派斯特">
      {/* Translucent Soft Cyan Background Glow */}
      <div className="absolute inset-[-6px] rounded-full bg-cyan-400/20 blur-md pointer-events-none animate-pulse" />
      <svg viewBox="0 0 1032 759" className="w-full h-full overflow-visible drop-shadow-[0_4px_14px_rgba(56,189,248,0.55)]">
        <defs>
          <radialGradient id={rimuruBackGrad} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={rimuruBodyGrad} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f0f9ff" />
            <stop offset="50%" stopColor="#cce9f6" />
            <stop offset="100%" stopColor="#93c5fd" />
          </linearGradient>
          <linearGradient id={rimuruHighlightGrad} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.15" />
          </linearGradient>
          <linearGradient id={rimuruShadowGrad} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#a8cbed" />
            <stop offset="100%" stopColor="#60a5fa" />
          </linearGradient>
          <filter id={rimuruInnerShadow} x="-10%" y="-10%" width="120%" height="120%">
            <feOffset dx="3" dy="8"/>
            <feGaussianBlur stdDeviation="8" result="offset-blur"/>
            <feComposite operator="out" in="SourceGraphic" in2="offset-blur" result="inverse"/>
            <feFlood floodColor="#fff" floodOpacity="0.45" result="color"/>
            <feComposite operator="in" in="color" in2="inverse" result="shadow"/>
            <feComposite operator="over" in="shadow" in2="SourceGraphic"/>
          </filter>
        </defs>

        {/* Scale and Center Rimuru gracefully to be slightly smaller */}
        <g transform="translate(77.4, 57) scale(0.85)">
          {/* Aura Background */}
          <circle cx="516" cy="380" r="420" fill={`url(#${rimuruBackGrad})`} className="origin-center animate-[auraBreathing_2.5s_infinite_ease-in-out]" />

          {/* Main Body with original vector shape and sweet gradients */}
          <path 
            d="M515.938 0C390.725 0 259.78 40.136 173.832 114.343 34.03 235.047 0 367.853 0 468.395s29.787 131.208 118.326 202.303 272.399 87.499 397.612 87.499c125.212 0 295.407-15.973 392.981-74.05 40.914-24.35 124.61-101.153 124.61-201.696s-43.953-249.058-177.14-357.36C768.288 53.453 641.15 0 515.937 0" 
            fill={`url(#${rimuruBodyGrad})`}
            filter={`url(#${rimuruInnerShadow})`}
          />

          {/* Shiny highlights on the left */}
          <ellipse cx="215.186" cy="234.558" rx="35.452" ry="71.516" transform="matrix(.90792 .41914 -.3872 .922 0 0)" fill={`url(#${rimuruHighlightGrad})`} />
          <ellipse cx="240.291" cy="248.236" rx="205.79" ry="67.259" transform="matrix(.91967 -.3927 .446 .89503 0 0)" fill={`url(#${rimuruHighlightGrad})`} />

          {/* Volumetric shadow definition on bottom edge */}
          <path d="M876.432 289.94c3.14 8.377 16.368 150.252-86.54 217.73-7.103 21.49 74.714 90.205 50.711 141.11-58.143 93.552-515.092 137.397-691.775 0-73.327-50.255-60.296-158.033 72.206-172.154 17.584-1.004 226.826 41.847 227.104 16.16-1.465-15.615-206.018-41.605-207.257-141.662 1.558-67.06 132.902-198.644 318.602-210.564 185.275-1.832 307.305 100.239 316.95 149.38" fill={`url(#${rimuruShadowGrad})`} />

          {/* Additional cute back reflection */}
          <ellipse cx="711.16" cy="270.614" rx="36.38" ry="20.816" fill="#f9fdfe" opacity="0.6" />

          {/* Rosy blush adding premium look on cheeks */}
          <ellipse cx="260" cy="480" rx="35" ry="18" fill="#fda4af" opacity="0.35" filter="blur(3px)" />
          <ellipse cx="770" cy="480" rx="35" ry="18" fill="#fda4af" opacity="0.35" filter="blur(3px)" />

          {/* Adorable slime facial features / closed cute lashes */}
          <g fill="#1e3a8a">
            <path 
              d="M497.45 423.752c-1.196-1.298-1.9-6.104 2.525-5.398 4.918 1.023 39.459 23.727 46.246 32.028 2.452 3.956-1.506 5.37-3.537 4.028-4.404-3.177-42.526-28.36-45.234-30.658m38.41 41.66c1.152 2.642-1.3 6.855-9.556 5.053-154.787-80.342-230.178-75.805-317.267-101.403-13.638-10.519-4.925-10.173 2.71-10.6 119.287 15.376 229.83 43.767 324.114 106.95" 
              id={eyeId} 
            />
            <use href={`#${eyeId}`} transform="scale(-1 1) rotate(-4.478 -110.065 15170.922)" />
          </g>
        </g>
      </svg>
    </div>
  );
};

export const MooglePet: React.FC<PetComponentProps> = ({ uId, animClass, className }) => {
  const moogleAura = `moogleAura-${uId}`;
  const moogleBody = `moogleBody-${uId}`;
  const pomPomGrad = `pomPomGrad-${uId}`;
  const glowFilter = `glow-${uId}`;
  const earGrad = `earGrad-${uId}`;
  return (
    <div className={cn("relative w-28 h-28 flex items-center justify-center", animClass, className)} title="莫古利">
      <div className="absolute inset-[-6px] rounded-full bg-rose-400/15 blur-md pointer-events-none animate-pulse" />
      <svg viewBox="0 0 24 24" className="w-full h-full overflow-visible drop-shadow-[0_4px_10px_rgba(244,63,94,0.45)]">
        <defs>
          <radialGradient id={moogleAura} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fbcfe8" stopOpacity="0.45" />
            <stop offset="60%" stopColor="#fda4af" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#4c0519" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={moogleBody} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="70%" stopColor="#fafaf9" />
            <stop offset="100%" stopColor="#e7e5e4" />
          </linearGradient>
          <radialGradient id={pomPomGrad} cx="40%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#fecdd3" />
            <stop offset="60%" stopColor="#f43f5e" />
            <stop offset="100%" stopColor="#be123c" />
          </radialGradient>
          <linearGradient id={earGrad} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fda4af" />
            <stop offset="100%" stopColor="#f43f5e" />
          </linearGradient>
          <filter id={glowFilter} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="0.8" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        <circle cx="12" cy="12" r="9.0" fill={`url(#${moogleAura})`} className="origin-center animate-[auraBreathing_2.5s_infinite_ease-in-out]" />

        <g className="origin-[9px_14px] animate-[wingFlapLeft_0.7s_infinite_ease-in-out_alternate]">
          <path d="M8,14 C5,12 2,12 4,16 C6,15 7,15 8,14" fill="#311042" stroke="#1e0b29" strokeWidth="0.3" />
        </g>
        <g className="origin-[15px_14px] animate-[wingFlapRight_0.7s_infinite_ease-in-out_alternate_delay-100]">
          <path d="M16,14 C19,12 22,12 20,16 C18,15 17,15 16,14" fill="#311042" stroke="#1e0b29" strokeWidth="0.3" />
        </g>

        <ellipse cx="12" cy="16.2" rx="5.5" ry="4.5" fill={`url(#${moogleBody})`} stroke="#cbd5e1" strokeWidth="0.3" />

        <circle cx="12" cy="10.8" r="4.2" fill={`url(#${moogleBody})`} stroke="#cbd5e1" strokeWidth="0.3" />

        <path d="M12,6.6 L12,4.8" stroke="#1c1917" strokeWidth="0.5" strokeLinecap="round" />

        <g className="origin-[12px_6.6px] animate-[legendaryAccessoryOscillating_1.3s_infinite_ease-in-out]">
          <circle cx="12" cy="3.6" r="1.6" fill={`url(#${pomPomGrad})`} filter={`url(#${glowFilter})`} />
          <circle cx="11.4" cy="3.0" r="0.4" fill="#fff" opacity="0.8" />
        </g>

        <g className="origin-[9px_8px] animate-[earWiggleLeft_2s_infinite_ease-in-out_alternate]">
          <polygon points="9.5,8.2 7,4.8 6.5,8.8" fill={`url(#${moogleBody})`} stroke="#cbd5e1" strokeWidth="0.2" />
          <polygon points="9.1,8.0 7.4,5.4 7.0,8.3" fill={`url(#${earGrad})`} />
        </g>
        <g className="origin-[15px_8px] animate-[earWiggleRight_2.2s_infinite_ease-in-out_alternate_delay-100]">
          <polygon points="14.5,8.2 17,4.8 17.5,8.8" fill={`url(#${moogleBody})`} stroke="#cbd5e1" strokeWidth="0.2" />
          <polygon points="14.9,8.0 16.6,5.4 17.0,8.3" fill={`url(#${earGrad})`} />
        </g>

        <path d="M8.8,11 Q9.8,11.8 10.4,11" stroke="#44403c" strokeWidth="0.65" strokeLinecap="round" fill="none" />
        <path d="M15.2,11 Q14.2,11.8 13.6,11" stroke="#44403c" strokeWidth="0.65" strokeLinecap="round" fill="none" />

        <polygon points="12,12.2 11.2,11.5 12.8,11.5" fill="#f43f5e" />

        <circle cx="8.5" cy="12.2" r="0.7" fill="#fda4af" opacity="0.65" />
        <circle cx="15.5" cy="12.2" r="0.7" fill="#fda4af" opacity="0.65" />
      </svg>
    </div>
  );
};

export const RibbonPigPet: React.FC<PetComponentProps> = ({ uId, animClass, className }) => {
  const pigBodyGrad = `pigBodyGrad-${uId}`;
  const pigBodyShadowGrad = `pigBodyShadowGrad-${uId}`;
  const pigSnoutGrad = `pigSnoutGrad-${uId}`;
  const redRibbonGrad = `redRibbonGrad-${uId}`;
  const goldHoofGrad = `goldHoofGrad-${uId}`;
  const goldHoofShadowGrad = `goldHoofShadowGrad-${uId}`;
  return (
    <div className={cn("relative w-28 h-28 flex items-center justify-center animate-[petBreath_3s_infinite_ease-in-out]", className)} title="緞帶肥肥">
      {/* Ambient Red/Pink Crimson Aura backing */}
      <div className="absolute inset-[-6px] rounded-full bg-rose-500/10 blur-lg pointer-events-none animate-pulse" />
      
      <svg viewBox="0 0 24 24" className="w-full h-full overflow-visible drop-shadow-[0_5px_12px_rgba(225,29,72,0.45)]">
        <defs>
          {/* Body base gradient */}
          <linearGradient id={pigBodyGrad} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fff1f2" />
            <stop offset="40%" stopColor="#fecdd3" />
            <stop offset="85%" stopColor="#fda4af" />
            <stop offset="100%" stopColor="#f43f5e" />
          </linearGradient>
          {/* Darker body shadow gradient for rear legs */}
          <linearGradient id={pigBodyShadowGrad} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fda4af" />
            <stop offset="100%" stopColor="#e11d48" />
          </linearGradient>
          {/* Snout gradient */}
          <linearGradient id={pigSnoutGrad} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffe4e6" />
            <stop offset="50%" stopColor="#fb7185" />
            <stop offset="100%" stopColor="#e11d48" />
          </linearGradient>
          {/* Vivid Crimson Red Ribbon */}
          <linearGradient id={redRibbonGrad} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ff0000" />
            <stop offset="40%" stopColor="#e11d48" />
            <stop offset="100%" stopColor="#7f1d1d" />
          </linearGradient>
          {/* Golden Hoof & Eyelid */}
          <linearGradient id={goldHoofGrad} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="50%" stopColor="#d97706" />
            <stop offset="100%" stopColor="#78350f" />
          </linearGradient>
          {/* Shadow Golden Hoof */}
          <linearGradient id={goldHoofShadowGrad} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#d97706" />
            <stop offset="100%" stopColor="#451a03" />
          </linearGradient>
          {/* Glow filter for legendary micro-particles */}
          <filter id={`pigGlow-${uId}`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="0.75" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Legendary Spin Ring - Exactly 1 circle background element */}
        <circle 
          cx="12" 
          cy="12" 
          r="10.8" 
          fill="none" 
          stroke="#fda4af" 
          strokeWidth="0.35" 
          strokeDasharray="4 3 1 3" 
          opacity="0.5" 
          className="origin-center animate-[rotateCw_12s_linear_infinite]" 
        />

        {/* Micro-particles around RibbonPig (Legendary spec) */}
        <g filter={`url(#pigGlow-${uId})`}>
          <circle cx="4.5" cy="7.5" r="0.6" fill="#f43f5e" className="animate-[floatParticleA_2.2s_infinite]" />
          <circle cx="19.5" cy="5.5" r="0.5" fill="#facc15" className="animate-[floatParticleB_2.6s_infinite]" />
          <circle cx="9.0" cy="4.0" r="0.55" fill="#fda4af" className="animate-[floatParticleC_2.0s_infinite]" />
          <circle cx="20.5" cy="18.5" r="0.6" fill="#f43f5e" className="animate-[floatParticleA_2.4s_infinite]" />
        </g>

        {/* === LAYER 1: BACK REAR & FRONT LEGS (Shadow perspective) === */}
        {/* Back Rear Leg */}
        <path 
          d="M 18.5,18 L 18.2,21.5 C 18.2,22 19.5,22 19.5,21.5 L 19.8,18 Z" 
          fill={`url(#${pigBodyShadowGrad})`} 
          stroke="#111827" 
          strokeWidth="0.45" 
        />
        <path 
          d="M 18.3,20 C 18.3,21 18.2,22 19.5,22 C 19.5,21 19.6,20 18.3,20 Z" 
          fill={`url(#${goldHoofShadowGrad})`} 
          stroke="#111827" 
          strokeWidth="0.45" 
        />

        {/* Back Front Leg */}
        <path 
          d="M 11.2,18.5 L 11.0,22 C 11.0,22.4 12.3,22.4 12.3,22 L 12.5,18.5 Z" 
          fill={`url(#${pigBodyShadowGrad})`} 
          stroke="#111827" 
          strokeWidth="0.45" 
        />
        <path 
          d="M 11.0,20.5 C 11.0,21.3 11.0,22.2 12.3,22.2 C 12.3,21.4 12.4,20.5 11.0,20.5 Z" 
          fill={`url(#${goldHoofShadowGrad})`} 
          stroke="#111827" 
          strokeWidth="0.45" 
        />

        {/* === LAYER 2: CURLY PINK SPRING TAIL === */}
        <g stroke="#111827" strokeWidth="0.5" fill="none">
          <path d="M 21.0,16.5 C 22.2,16.8 23.2,15.8 22.8,14.8 C 22.2,13.8 21.2,14.2 21.5,15.0 C 21.8,15.8 21.0,16.0 20.2,16.2" strokeLinecap="round" />
        </g>
        {/* Soft pink tip of tail */}
        <circle cx="21.5" cy="15.0" r="0.6" fill="#fb7185" stroke="#111827" strokeWidth="0.45" />

        {/* === LAYER 3: MAIN CHUBBY Profile Body & Face combined === */}
        <path 
          d="M 8.5,19 C 7.5,17.5 7.2,14.5 8.0,12.5 C 8.8,10.5 10.5,8.8 13.5,8.5 C 16.5,8.2 19.5,9.5 20.8,12.0 C 22.0,14.5 21.8,17.2 20.8,18.8 C 19.5,20.5 16.5,21.0 13.5,21.0 C 10.2,21.0 9.2,20.0 8.5,19 Z" 
          fill={`url(#${pigBodyGrad})`} 
          stroke="#111827" 
          strokeWidth="0.55" 
        />

        {/* === LAYER 4: EARS === */}
        {/* Back Ear (Partially behind head) */}
        <g>
          <path 
            d="M 13.0,8.2 L 12.2,5.2 C 12.0,4.8 12.8,4.5 13.2,4.8 L 14.5,7.8 Z" 
            fill={`url(#${pigBodyShadowGrad})`} 
            stroke="#111827" 
            strokeWidth="0.45" 
          />
          <path 
            d="M 12.7,7.2 L 12.4,5.8 C 12.4,5.6 12.8,5.5 12.9,5.7 L 13.4,7.0 Z" 
            fill="#fda4af" 
          />
        </g>

        {/* Front Ear */}
        <g>
          <path 
            d="M 9.8,9.2 L 8.8,6.2 C 8.5,5.6 9.5,5.2 10.0,5.8 L 11.2,8.8 Z" 
            fill={`url(#${pigBodyGrad})`} 
            stroke="#111827" 
            strokeWidth="0.5" 
          />
          <path 
            d="M 9.4,8.2 L 9.1,6.8 C 9.0,6.5 9.6,6.3 9.8,6.6 L 10.3,7.8 Z" 
            fill="#fb7185" 
          />
        </g>

        {/* === LAYER 5: RED RIBBON BAND (TORSO) === */}
        {/* Red strap wrapping around body */}
        <path 
          d="M 15.5,8.6 C 17.2,12.0 18.0,16.2 16.5,20.8 C 17.2,20.8 17.9,20.5 17.9,20.5 C 19.4,16.2 18.6,12.0 16.9,8.6 Z" 
          fill={`url(#${redRibbonGrad})`} 
          stroke="#111827" 
          strokeWidth="0.5" 
        />

        {/* === LAYER 6: DETERMINED EYES & MASSIVE GOLD EYELIDS (Signature element) === */}
        {/* Right Eye (Perspective distant) */}
        <g>
          {/* White Sclera */}
          <path 
            d="M 7.3,12.0 Q 8.8,11.5 8.6,14.0 Q 7.1,13.8 7.3,12.0" 
            fill="white" 
            stroke="#111827" 
            strokeWidth="0.45" 
          />
          {/* Black Pupil focused forward */}
          <ellipse cx="7.7" cy="12.8" rx="0.5" ry="0.6" fill="#000" />
          <circle cx="7.6" cy="12.6" r="0.15" fill="#fff" />
          {/* Massive Slanted Gold Eyelid */}
          <path 
            d="M 6.8,11.8 C 7.2,10.2 9.2,10.2 9.2,11.8 L 9.0,12.3 C 9.0,11.6 7.4,11.5 7.2,12.1 Z" 
            fill={`url(#${goldHoofGrad})`} 
            stroke="#111827" 
            strokeWidth="0.45" 
          />
        </g>

        {/* Left Eye (Main Foreground Eye) */}
        <g>
          {/* White Sclera - Huge & Angry Slant */}
          <path 
            d="M 9.5,12.2 C 9.5,15.2 14.0,15.2 14.0,12.2 Z" 
            fill="white" 
            stroke="#111827" 
            strokeWidth="0.5" 
          />
          {/* Crescent Black Pupil looking forward/left */}
          <path 
            d="M 9.5,12.2 C 9.5,14.5 11.8,14.5 11.8,12.2 C 11.2,12.0 10.0,12.0 9.5,12.2 Z" 
            fill="#000" 
          />
          <circle cx="10.2" cy="13.0" r="0.4" fill="#fff" />
          <circle cx="11.2" cy="13.2" r="0.2" fill="#fff" opacity="0.75" />

          {/* Massive Gold Heavy Eyelid Hood on top */}
          <path 
            d="M 9.2,12.2 C 9.2,9.2 14.4,9.2 14.4,12.2 C 12.8,11.6 10.8,11.6 9.2,12.2 Z" 
            fill={`url(#${goldHoofGrad})`} 
            stroke="#111827" 
            strokeWidth="0.5" 
          />
          {/* Eyelid inner details */}
          <path d="M 9.8,11.2 Q 11.8,10.8 13.8,11.2" stroke="#451a03" strokeWidth="0.25" fill="none" />
        </g>

        {/* Cute Cheek Blush under eye */}
        <ellipse cx="14.2" cy="15.8" rx="0.9" ry="0.6" fill="#f43f5e" opacity="0.35" />

        {/* === LAYER 7: SNOUT === */}
        {/* Huge protruding pink snout on the left - connected with body */}
        <g>
          <ellipse 
            cx="6.5" 
            cy="15.2" 
            rx="2.1" 
            ry="3.2" 
            fill={`url(#${pigSnoutGrad})`} 
            stroke="#111827" 
            strokeWidth="0.55" 
            transform="rotate(-5, 6.5, 15.2)" 
          />
          {/* Nostrils (elongated dark vertical ovals as shown in image) */}
          <ellipse cx="5.8" cy="15.0" rx="0.4" ry="1.2" fill="#111827" transform="rotate(-6, 5.8, 15.0)" />
          <ellipse cx="7.2" cy="15.0" rx="0.3" ry="0.9" fill="#111827" transform="rotate(-4, 7.2, 15.0)" />
        </g>

        {/* Cute frown expression lines behind the snout */}
        <path d="M 8.5,14.6 Q 9.2,15.2 8.7,16.2" stroke="#111827" strokeWidth="0.4" strokeLinecap="round" fill="none" opacity="0.75" />

        {/* === LAYER 8: FOREGROUND LEGS === */}
        {/* Front Left Leg */}
        <path 
          d="M 13.5,19.8 L 13.5,23.1 C 13.5,23.5 15.2,23.5 15.2,23.1 L 15.5,19.8 Z" 
          fill={`url(#${pigBodyGrad})`} 
          stroke="#111827" 
          strokeWidth="0.5" 
        />
        <path 
          d="M 13.5,21.8 Q 13.5,23.1 15.2,23.1 L 15.2,21.8 Z" 
          fill={`url(#${goldHoofGrad})`} 
          stroke="#111827" 
          strokeWidth="0.5" 
        />

        {/* Front Right Leg */}
        <path 
          d="M 16.5,19.4 L 16.5,22.4 C 16.5,22.8 17.8,22.8 17.8,22.4 L 18.0,19.4 Z" 
          fill={`url(#${pigBodyGrad})`} 
          stroke="#111827" 
          strokeWidth="0.5" 
        />
        <path 
          d="M 16.5,21.2 Q 16.5,22.4 17.8,22.4 L 17.8,21.2 Z" 
          fill={`url(#${goldHoofGrad})`} 
          stroke="#111827" 
          strokeWidth="0.5" 
        />

        {/* === LAYER 9: THE SPECTACULAR RED BOW (Tied on top of head/shoulders) === */}
        <g className="origin-[15.5px_8.6px] animate-[pulse_1.0s_infinite_alternate]">
          {/* Deep red ribbon loops */}
          {/* Left massive bow loop */}
          <path 
            d="M 15.5,8.6 C 13.0,5.8 10.0,2.5 11.2,4.0 C 12.2,5.5 14.5,7.8 15.5,8.6 Z" 
            fill={`url(#${redRibbonGrad})`} 
            stroke="#111827" 
            strokeWidth="0.5" 
          />
          <path 
            d="M 15.5,8.6 C 14.2,6.8 12.5,4.8 12.2,5.2 L 13.8,7.2 Z" 
            fill="#ef4444" 
          />

          {/* Right huge pointed bow loop */}
          <path 
            d="M 15.5,8.6 C 18.5,5.5 22.0,1.5 22.5,3.0 C 23.0,4.5 19.5,7.2 15.5,8.6 Z" 
            fill={`url(#${redRibbonGrad})`} 
            stroke="#111827" 
            strokeWidth="0.55" 
          />
          <path 
            d="M 15.5,8.6 C 18.2,6.5 21.0,3.5 21.2,4.0 L 17.8,7.3 Z" 
            fill="#ef4444" 
          />

          {/* Small folded bow wing (underright) */}
          <path 
            d="M 15.5,8.6 C 18.0,9.2 21.2,6.8 20.8,9.0 C 20.2,10.2 17.0,10.0 15.5,8.6 Z" 
            fill={`url(#${redRibbonGrad})`} 
            stroke="#111827" 
            strokeWidth="0.45" 
          />

          {/* Bow Center Knot */}
          <circle cx="15.5" cy="8.6" r="1.1" fill={`url(#${redRibbonGrad})`} stroke="#111827" strokeWidth="0.5" />
          <circle cx="15.1" cy="8.2" r="0.3" fill="#ff8787" />
        </g>
      </svg>
    </div>
  );
};

export const SonicRingsPet: React.FC<PetComponentProps> = ({ uId, className }) => {
  const ghostGrad = `ghostGrad-${uId}`;
  const headGrad = `headGrad-${uId}`;
  const ghostBackGrad = `ghostBackGrad-${uId}`;
  const mouthGrad = `mouthGrad-${uId}`;
  return (
    <div className={cn("relative w-28 h-28 flex items-center justify-center animate-[ultimateFloat_3.2s_infinite_ease-in-out]", className)} title="消極鬼魂">
      {/* Ambient backlight aura - updated to soft translucent pale blue faint light */}
      <div className="absolute inset-[-4px] rounded-full bg-cyan-400/10 blur-md pointer-events-none animate-pulse" />
      
      <svg viewBox="0 0 64 64" className="w-full h-full overflow-visible drop-shadow-[0_5px_15px_rgba(203,213,225,0.4)]">
        <defs>
          {/* Backlight / Spectral Aura inside the SVG - light blue */}
          <radialGradient id={ghostBackGrad} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#bae6fd" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#bae6fd" stopOpacity="0" />
          </radialGradient>
          
          {/* 3D Glossy White Pearl Material for Head */}
          <radialGradient id={headGrad} cx="35%" cy="32%" r="65%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="50%" stopColor="#f8fafc" />
            <stop offset="85%" stopColor="#e2e8f0" />
            <stop offset="100%" stopColor="#cbd5e1" />
          </radialGradient>

          {/* 3D Glossy White Pearl Material for Body & Arms */}
          <linearGradient id={ghostGrad} x1="20%" y1="0%" x2="80%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="40%" stopColor="#f8fafc" />
            <stop offset="80%" stopColor="#e2e8f0" />
            <stop offset="100%" stopColor="#cbd5e1" />
          </linearGradient>

          {/* Pink sausage mouth gradient for realistic depth */}
          <linearGradient id={mouthGrad} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fecdd3" />
            <stop offset="50%" stopColor="#fda4af" />
            <stop offset="100%" stopColor="#f43f5e" />
          </linearGradient>
        </defs>

        {/* === BACKGROUND: Soft Aura Backlight === */}
        <circle cx="32" cy="32" r="28" fill={`url(#${ghostBackGrad})`} />

        {/* === MAIN NEGATIVE GHOST === */}
        <g>
          {/* Left Arm: hanging limp and dangling */}
          <path 
            d="M 23,24 
               C 16,30 15,40 17,45 
               C 18,48 21.5,48 22,44 
               C 23,38 25,31 26,24.5 Z" 
            fill={`url(#${ghostGrad})`} 
            stroke="#0f172a" 
            strokeWidth="1.2" 
            strokeLinecap="round"
            strokeLinejoin="round" 
          />

          {/* Right Arm: hanging limp and dangling */}
          <path 
            d="M 39,24 
               C 46,30 47,40 45,45 
               C 44,48 40.5,48 40,44 
               C 39,38 37,31 36,24.5 Z" 
            fill={`url(#${ghostGrad})`} 
            stroke="#0f172a" 
            strokeWidth="1.2" 
            strokeLinecap="round"
            strokeLinejoin="round" 
          />

          {/* Unified Body & Tail Path: elegant, tapered J-curve ghostly tail curving left and hooking upward (No rings or circular disks!) */}
          <path 
            d="M 36,22
               C 36,34 32,46 22,53
               C 16,57 6,56 4,46
               C 6,42 12,42 18,38
               C 24,34 26,28 26,22 Z" 
            fill={`url(#${ghostGrad})`} 
            stroke="#0f172a" 
            strokeWidth="1.2" 
            strokeLinejoin="round" 
          />

          {/* Head: Bulbous flattened round sphere layered on top */}
          <ellipse cx="32" cy="16" rx="13.5" ry="10" fill={`url(#${headGrad})`} stroke="#0f172a" strokeWidth="1.2" />

          {/* Eye Left: Wide spaced big black circle */}
          <circle cx="24.5" cy="14.8" r="2.2" fill="#0f172a" />
          {/* Real-life plastic gleam highlight on eyes */}
          <circle cx="23.9" cy="14.1" r="0.6" fill="#ffffff" />

          {/* Eye Right: Wide spaced big black circle */}
          <circle cx="39.5" cy="14.8" r="2.2" fill="#0f172a" />
          {/* Real-life plastic gleam highlight on eyes */}
          <circle cx="38.9" cy="14.1" r="0.6" fill="#ffffff" />

          {/* Cute Pink Sausage/Pill Shaped Smile */}
          <path 
            d="M 23.5,20.2 
               C 27.5,23.5 36.5,23.5 40.5,20.2 
               C 42,19.2 41,17.7 39.5,18.2 
               C 35.5,19.8 28.5,19.8 24.5,18.2 
               C 23,17.7 22,19.2 23.5,20.2 Z" 
            fill={`url(#${mouthGrad})`} 
            stroke="#0f172a" 
            strokeWidth="1" 
            strokeLinejoin="round" 
          />
        </g>
      </svg>
    </div>
  );
};
