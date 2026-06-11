import React from "react";
import { cn } from "../../lib/utils";

interface PetComponentProps {
  uId: string;
  animClass: string;
  className?: string;
}

export const PhoenixPet: React.FC<PetComponentProps> = ({ uId, animClass, className }) => {
  const phoenixAura = `phoenixAura-${uId}`;
  const phoenixGrad = `phoenixGrad-${uId}`;
  const wingGrad = `wingGrad-${uId}`;
  const innerShadow = `innerShadow-${uId}`;
  const glowFilter = `glow-${uId}`;
  return (
    <div className={cn("relative w-28 h-28 flex items-center justify-center", animClass, className)} title="霓虹鳳凰">
      <svg viewBox="0 0 24 24" className="w-full h-full overflow-visible drop-shadow-[0_0_12px_rgba(244,63,94,0.92)]">
        <defs>
          <radialGradient id={phoenixAura} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fff" stopOpacity="0.55" />
            <stop offset="35%" stopColor="#f43f5e" stopOpacity="0.32" />
            <stop offset="70%" stopColor="#ec4899" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={phoenixGrad} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f472b6" />
            <stop offset="40%" stopColor="#ef4444" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>
          <linearGradient id={wingGrad} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ec4899" stopOpacity="0.9" />
            <stop offset="60%" stopColor="#ef4444" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.3" />
          </linearGradient>
          <filter id={innerShadow} x="-20%" y="-20%" width="140%" height="140%">
            <feOffset dx="0.2" dy="0.4"/>
            <feGaussianBlur stdDeviation="0.4" result="offset-blur"/>
            <feComposite operator="out" in="SourceGraphic" in2="offset-blur" result="inverse"/>
            <feFlood floodColor="#fff" floodOpacity="0.35" result="color"/>
            <feComposite operator="in" in="color" in2="inverse" result="shadow"/>
            <feComposite operator="over" in="shadow" in2="SourceGraphic"/>
          </filter>
          <filter id={glowFilter} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="1.1" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
        
        {/* Back Sacred Star Seal - Exactly concentric circles with no solid fill */}
        <circle cx="12" cy="12" r="11" fill="none" stroke="#f43f5e" strokeWidth="0.3" strokeDasharray="3 4 5 4" opacity="0.65" className="origin-center animate-[rotateCw_7s_linear_infinite]" />
        <circle cx="12" cy="12" r="10.2" fill="none" stroke="#eab308" strokeWidth="0.25" strokeDasharray="2 2" opacity="0.55" className="origin-center animate-[rotateCcw_9s_linear_infinite]" />
        
        {/* Phoenix Body */}
        <path d="M12,18 C16,18 18,15 18,12 C18,8 14,6 12,6 C10,6 6,8 6,12 C6,15 8,18 12,18 Z" fill={`url(#${phoenixGrad})`} filter={`url(#${innerShadow})`} />
        
        {/* Massive Wing Layers */}
        <g className="origin-[12px_12px] animate-[wingFlapLeft_0.6s_infinite_ease-in-out_alternate]">
          <path d="M8,12 C4,10 0,6 2,2 C5,5 8,8 8,12" fill={`url(#${wingGrad})`} />
          <path d="M7,13 C3,11 -1,7 1,3 C4,6 7,9 7,13" fill={`url(#${wingGrad})`} opacity="0.7" />
        </g>
        <g className="origin-[12px_12px] animate-[wingFlapRight_0.6s_infinite_ease-in-out_alternate_delay-100]">
          <path d="M16,12 C20,10 24,6 22,2 C19,5 16,8 16,12" fill={`url(#${wingGrad})`} />
          <path d="M17,13 C21,11 25,7 23,3 C20,6 17,9 17,13" fill={`url(#${wingGrad})`} opacity="0.7" />
        </g>
        
        {/* Tail Flames */}
        <path d="M10,18 L12,22 L14,18 Z" fill="#ef4444" className="animate-pulse" />
        
        {/* Head / Eye */}
        <circle cx="12" cy="9" r="2.5" fill={`url(#${phoenixGrad})`} />
        <circle cx="12.8" cy="8.5" r="0.6" fill="#fff" />
        <path d="M10,8 C10,6 14,6 14,8" stroke="#fef3c7" strokeWidth="0.5" fill="none" />              
        {/* Streaming Ethereal Tail Feathers with Pings */}
        <g className="origin-top animate-pulse">
          <path d="M11,18 C9,22 7.5,23.5 6.2,23" fill="none" stroke="#ef4444" strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="6.2" cy="23" r="1" fill="#f59e0b" className="animate-ping" />
          
          <path d="M12,18 C12,22.2 12,24 12,24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
          <circle cx="12" cy="24" r="1.1" fill="#ffedd5" className="animate-ping" />
          
          <path d="M13,18 C15,22 16.5,23.5 17.8,23" fill="none" stroke="#ef4444" strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="17.8" cy="23" r="1" fill="#f59e0b" className="animate-ping" />
        </g>
        
        {/* Rising Phoenix Flame particles */}
        <g filter={`url(#${glowFilter})`}>
          <circle cx="4" cy="16" r="0.7" fill="#fda4af" className="animate-[floatParticleA_2.1s_infinite]" />
          <circle cx="20" cy="15" r="0.8" fill="#fef" className="animate-[floatParticleB_2.5s_infinite]" />
        </g>

        {/* Flame Wings (Left & Right Flapping Fast) */}
        <path 
          d="M4,12 Q-1,6 5,8 Q11,10 4,12" 
          fill={`url(#${wingGrad})`} 
          className="origin-[5px_9px] animate-[wingFlapLeft_0.5s_infinite_ease-in-out_alternate]" 
        />
        <path 
          d="M20,12 Q25,6 19,8 Q13,10 20,12" 
          fill={`url(#${wingGrad})`} 
          className="origin-[19px_9px] animate-[wingFlapRight_0.5s_infinite_ease-in-out_alternate_delay-250]" 
        />
        
        {/* Body */}
        <ellipse cx="12" cy="14" rx="4.5" ry="6" fill={`url(#${phoenixGrad})`} filter={`url(#${innerShadow})`} />
        
        {/* Glowing chest features */}
        <g className="animate-[innerAuraPulse_1.2s_infinite_ease-in-out]">
          <polygon points="12,10.2 10.2,13 13.8,13" fill="#fffef0" />
          <polygon points="12,13 9.8,15.8 14.2,15.8" fill="#fde047" />
        </g>
        
        {/* Head */}
        <circle cx="12" cy="7.2" r="3.6" fill={`url(#${phoenixGrad})`} filter={`url(#${innerShadow})`} />
        
        {/* Majestic Fire Crest */}
        <path d="M12,4.6 Q10,1.8 12,0.6 Q14,1.8 12,4.6" fill="#f43f5e" className="animate-pulse" />
        
        {/* Glowing Divine Eyes */}
        <g filter={`url(#${glowFilter})`}>
          <circle cx="10.8" cy="6.9" r="0.7" fill="#fde047" />
          <circle cx="10.6" cy="6.7" r="0.2" fill="white" />
          <circle cx="13.2" cy="6.9" r="0.7" fill="#fde047" />
          <circle cx="13.0" cy="6.7" r="0.2" fill="white" />
        </g>
        
        {/* Beak */}
        <polygon points="12,8.6 11,7.6 13,7.6" fill="#fbbf24" />
      </svg>
    </div>
  );
};

export const UnicornPet: React.FC<PetComponentProps> = ({ uId, animClass, className }) => {
  const puckBackGlow = `puckBackGlow-${uId}`;
  const puckBodyGrad = `puckBodyGrad-${uId}`;
  const puckEarPink = `puckEarPink-${uId}`;
  const puckEyeGrad = `puckEyeGrad-${uId}`;
  const goldEarringGrad = `goldEarringGrad-${uId}`;
  const innerShadow = `innerShadow-${uId}`;
  const glowFilter = `glow-${uId}`;

  return (
    <div className={cn("relative w-28 h-28 flex items-center justify-center", animClass, className)} title="帕克">
      <svg viewBox="0 0 500 500" className="w-full h-full overflow-visible drop-shadow-[0_4px_12px_rgba(14,165,233,0.3)]">
        <defs>
          <radialGradient id={puckBackGlow} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
          </radialGradient>
          
          <linearGradient id={puckBodyGrad} x1="25%" y1="15%" x2="75%" y2="85%">
            <stop offset="0%" stopColor="#c5ccbe" />
            <stop offset="60%" stopColor="#adb5a2" />
            <stop offset="100%" stopColor="#909987" />
          </linearGradient>

          <linearGradient id={puckEarPink} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fecaca" />
            <stop offset="100%" stopColor="#fca5a5" />
          </linearGradient>

          <linearGradient id={puckEyeGrad} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#083344" />
            <stop offset="40%" stopColor="#0e7490" />
            <stop offset="100%" stopColor="#22d3ee" />
          </linearGradient>

          <linearGradient id={goldEarringGrad} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="45%" stopColor="#eab308" />
            <stop offset="100%" stopColor="#854d0e" />
          </linearGradient>

          <filter id={innerShadow} x="-15%" y="-15%" width="130%" height="130%">
            <feOffset dx="1" dy="2"/>
            <feGaussianBlur stdDeviation="3" result="blur"/>
            <feComposite operator="out" in="SourceGraphic" in2="blur" result="inverse"/>
            <feFlood floodColor="#ffffff" floodOpacity="0.3" result="color"/>
            <feComposite operator="in" in="color" in2="inverse" result="shadow"/>
            <feComposite operator="over" in="shadow" in2="SourceGraphic"/>
          </filter>

          <filter id={glowFilter} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Rotating Ice Runes of the Great Spirit - Exactly concentric with no background globe */}
        <circle 
          cx="250" 
          cy="250" 
          r="232" 
          fill="none" 
          stroke="#22d3ee" 
          strokeWidth="3.5" 
          strokeDasharray="40 25 15 25" 
          opacity="0.45" 
          className="origin-center animate-[rotateCw_18s_linear_infinite]" 
        />
        <circle 
          cx="250" 
          cy="250" 
          r="212" 
          fill="none" 
          stroke="#0284c7" 
          strokeWidth="2.5" 
          strokeDasharray="8 12" 
          opacity="0.35" 
          className="origin-center animate-[rotateCcw_24s_linear_infinite]" 
        />

        {/* Dynamic Glowing Ice & Snow Particles (Ultimate Tier Great Spirit) */}
        <g filter={`url(#${glowFilter})`}>
          <circle cx="80" cy="180" r="12" fill="#22d3ee" className="animate-[floatParticleA_2.2s_infinite]" />
          <circle cx="420" cy="150" r="10" fill="#e0f2fe" className="animate-[floatParticleB_2.6s_infinite]" />
          <circle cx="120" cy="380" r="14" fill="#38bdf8" className="animate-[floatParticleC_2.0s_infinite]" />
          <circle cx="400" cy="390" r="11" fill="#22d3ee" className="animate-[floatParticleA_2.5s_infinite]" />
          <circle cx="250" cy="60" r="13" fill="#ffffff" opacity="0.9" className="animate-[floatParticleB_2.8s_infinite]" />
          <circle cx="60" cy="300" r="10" fill="#0ea5e9" className="animate-[floatParticleC_2.4s_infinite]" />
        </g>

        {/* ======================================================= */}
        {/* === LAYER 1: FLUFFY WHITE/GREY TAIL (Wagging) === */}
        {/* ======================================================= */}
        <g className="origin-[350px_350px] animate-[tailWagSlow_2.2s_infinite_ease-in-out]">
          {/* Main grey base of tail */}
          <path 
            d="M 290 380 Q 320 400, 360 385" 
            fill="none" 
            stroke={`url(#${puckBodyGrad})`} 
            strokeWidth="24" 
            strokeLinecap="round" 
          />
          {/* White elegant curved tail */}
          <path 
            d="M 315 390 C 370 410, 410 350, 410 260 C 410 150, 475 95, 455 110 C 430 125, 385 165, 380 260 C 380 325, 345 380, 315 390 Z" 
            fill="#ffffff" 
            stroke="#1e293b" 
            strokeWidth="10" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
          />
        </g>

        {/* ======================================================= */}
        {/* === LAYER 2: CHUBBY GREY BODY & BACK LEGS === */}
        {/* ======================================================= */}
        {/* Main body backing */}
        <path 
          d="M 180 270 C 140 270, 130 350, 170 415 C 210 445, 275 445, 315 415 C 345 350, 335 270, 290 270 Z" 
          fill={`url(#${puckBodyGrad})`} 
          stroke="#1e293b" 
          strokeWidth="11" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          filter={`url(#${innerShadow})`}
        />

        {/* Viewer's Left Leg (Splayed out left) */}
        <g>
          {/* Grey thigh */}
          <path 
            d="M 190 370 C 130 340, 100 360, 110 398 C 120 425, 190 425, 200 390 Z" 
            fill={`url(#${puckBodyGrad})`} 
            stroke="#1e293b" 
            strokeWidth="11" 
            strokeLinejoin="round" 
          />
          {/* White leg rising up */}
          <path 
            d="M 135 385 L 82 312 C 65 285, 45 300, 62 328 L 112 395 Z" 
            fill="#ffffff" 
            stroke="#1e293b" 
            strokeWidth="10" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
          />
          {/* Paw pads (Facing user) */}
          <ellipse cx="65" cy="312" rx="9" ry="13" fill="#fda4af" transform="rotate(-15 65 312)" />
          <circle cx="53" cy="301" r="4.5" fill="#fda4af" />
          <circle cx="58" cy="291" r="5" fill="#fda4af" />
          <circle cx="68" cy="289" r="4.5" fill="#fda4af" />
        </g>

        {/* Viewer's Right Leg Thigh (Foreground) */}
        <g>
          {/* Grey thigh */}
          <path 
            d="M 230 375 C 210 340, 280 340, 290 390 C 300 428, 240 428, 230 395 Z" 
            fill={`url(#${puckBodyGrad})`} 
            stroke="#1e293b" 
            strokeWidth="11" 
            strokeLinejoin="round" 
          />
        </g>

        {/* ======================================================= */}
        {/* === LAYER 3: WHITE FLUFFY CHEST & BELLY === */}
        {/* ======================================================= */}
        <g>
          {/* Fluffy points along chest sides */}
          <path 
            d="M 195 280 Q 170 305, 198 320 Q 175 340, 208 355 Q 185 375, 225 385 C 240 392, 255 392, 270 385 Q 310 375, 287 355 Q 320 340, 297 320 Q 325 305, 300 280 Z" 
            fill="#ffffff" 
            stroke="#1e293b" 
            strokeWidth="11" 
            strokeLinejoin="round" 
          />
          {/* Center tummy white patch */}
          <ellipse cx="245" cy="360" rx="42" ry="50" fill="#ffffff" />
        </g>

        {/* Viewer's Right Foot (In foreground pointing upright) */}
        <g>
          {/* White foot rising near satchel */}
          <path 
            d="M 215 390 L 195 322 C 185 298, 165 312, 175 336 L 195 396 Z" 
            fill="#ffffff" 
            stroke="#1e293b" 
            strokeWidth="10" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
          />
          {/* Paw pads (Facing user) */}
          <ellipse cx="184" cy="331" rx="9" ry="13" fill="#fda4af" transform="rotate(10 184 331)" />
          <circle cx="173" cy="321" r="4.5" fill="#fda4af" />
          <circle cx="180" cy="311" r="5" fill="#fda4af" />
          <circle cx="190" cy="313" r="4.5" fill="#fda4af" />
        </g>

        {/* ======================================================= */}
        {/* === LAYER 4: PURPLE SHOULDER BAG (SATCHEL) === */}
        {/* ======================================================= */}
        <g>
          {/* Bag Strap across body */}
          <path 
            d="M 180 270 L 290 380" 
            fill="none" 
            stroke="#5f3873" 
            strokeWidth="11" 
            strokeLinecap="round" 
          />
          
          {/* Satchel Bag Body */}
          <path 
            d="M 285 360 L 375 325 C 395 315, 422 332, 412 372 L 372 432 C 362 447, 332 455, 302 445 L 275 402 C 265 382, 275 365, 285 360 Z" 
            fill="#8353a2" 
            stroke="#1e293b" 
            strokeWidth="10" 
            strokeLinejoin="round" 
          />
          <path 
            d="M 292 355 C 322 338, 368 312, 380 338 C 390 358, 355 412, 325 412 C 305 412, 282 382, 292 355 Z" 
            fill="#6b3d88" 
            stroke="#1e293b" 
            strokeWidth="10" 
            strokeLinejoin="round" 
          />
          {/* Gold Buckle Button with clean alignment */}
          <circle cx="338" cy="365" r="14" fill="#1e293b" />
          <circle cx="338" cy="365" r="11" fill="url(#goldEarringGrad)" />
          <ellipse cx="335" cy="362" rx="3" ry="2" fill="#ffffff" opacity="0.8" />
          {/* Strap connection button */}
          <circle cx="286" cy="392" r="9.5" fill="url(#goldEarringGrad)" stroke="#1e293b" strokeWidth="6" />
        </g>

        {/* ======================================================= */}
        {/* === LAYER 5: FOLDED / CROSSED ARMS === */}
        {/* ======================================================= */}
        <g>
          {/* Grey shoulders */}
          <path d="M 165 240 C 142 278, 152 305, 178 322" fill="none" stroke="#1e293b" strokeWidth="11" strokeLinecap="round" />
          <path d="M 315 240 C 338 278, 325 305, 298 322" fill="none" stroke="#1e293b" strokeWidth="11" strokeLinecap="round" />
          
          {/* Left crossed arm (folding first) */}
          <path 
            d="M 168 296 C 185 296, 218 316, 272 322 C 282 324, 278 344, 258 340 C 220 332, 192 316, 178 310 Z" 
            fill="#ffffff" 
            stroke="#1e293b" 
            strokeWidth="10" 
            strokeLinejoin="round" 
            strokeLinecap="round" 
          />
          
          {/* Right crossed arm (folding on top, overlapping) */}
          <path 
            d="M 312 296 C 298 296, 248 310, 198 316 C 185 316, 188 338, 208 338 C 248 338, 282 324, 302 310 Z" 
            fill="#ffffff" 
            stroke="#1e293b" 
            strokeWidth="10" 
            strokeLinejoin="round" 
            strokeLinecap="round" 
          />
          
          {/* Fluffy elbows */}
          <path d="M 178 310 C 165 310, 158 328, 182 332" fill="none" stroke="#1e293b" strokeWidth="8" strokeLinecap="round" />
          <path d="M 302 310 C 315 310, 322 328, 298 332" fill="none" stroke="#1e293b" strokeWidth="8" strokeLinecap="round" />
        </g>

        {/* ======================================================= */}
        {/* === LAYER 6: HEAD & EARS === */}
        {/* ======================================================= */}
        {/* Big Grey back head base with cute ear-bases and cheek tufts matching Puck's exact shape */}
        <path 
          d="M 245 102
             C 320 102, 357 114, 357 186
             C 357 196, 368 202, 355 212
             C 362 220, 353 228, 345 234
             C 350 242, 335 252, 320 258
             C 295 278, 275 282, 245 282
             C 215 282, 195 278, 170 258
             C 155 252, 140 242, 145 234
             C 137 228, 128 220, 135 212
             C 122 202, 133 196, 133 186
             C 133 114, 170 102, 245 102 Z"
          fill={`url(#${puckBodyGrad})`} 
          stroke="#1e293b" 
          strokeWidth="11" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          filter={`url(#${innerShadow})`}
        />

        {/* Viewer's Left Upright Ear */}
        <g>
          <path d="M 172 135 C 152 76, 122 36, 147 22 C 167 27, 200 78, 212 130 Z" fill={`url(#${puckBodyGrad})`} stroke="#1e293b" strokeWidth="11" strokeLinejoin="round" />
          <path d="M 177 125 C 162 82, 142 56, 157 46 C 167 48, 190 88, 197 120 Z" fill={`url(#${puckEarPink})`} stroke="#1e293b" strokeWidth="9" strokeLinejoin="round" />
          {/* White outer base hair tuft */}
          <path d="M 148 102 Q 128 108, 136 122 Q 146 120, 154 114 Z" fill="#ffffff" stroke="#1e293b" strokeWidth="8" strokeLinejoin="round" />
        </g>

        {/* Viewer's Right Folded Ear */}
        <g>
          <path d="M 285 130 C 300 80, 345 58, 330 102 C 320 120, 295 136, 285 130 Z" fill={`url(#${puckBodyGrad})`} stroke="#1e293b" strokeWidth="11" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M 330 102 C 342 88, 345 63, 330 61 C 315 58, 305 92, 300 122" fill="none" stroke="#1e293b" strokeWidth="11" strokeLinecap="round" />
          {/* Fold inner pink highlight */}
          <path d="M 312 84 C 322 75, 328 66, 331 70 C 328 75, 312 92, 311 94 Z" fill={`url(#${puckEarPink})`} stroke="#1e293b" strokeWidth="7" strokeLinejoin="round" />
          
          {/* Golden Hoop Earring - Beautiful outline & dimensional depth */}
          <g transform="translate(330, 78)">
            <circle cx="0" cy="0" r="13" fill="none" stroke="#1e293b" strokeWidth="10" />
            <circle cx="0" cy="0" r="13" fill="none" stroke="url(#goldEarringGrad)" strokeWidth="7" />
            <circle cx="-3" cy="-3" r="2.5" fill="#ffffff" opacity="0.8" />
          </g>
        </g>

        {/* ======================================================= */}
        {/* === LAYER 7: WHITE FACE SPADE / MARKINGS WITH Spikey Tufts === */}
        {/* ======================================================= */}
        <g>
          {/* Elegant curved spade mask forming cheeks with 3 distinctive tufts on left and right */}
          <path 
            d="M 245 138
               C 220 138, 200 178, 178 168
               C 152 153, 138 153, 138 180
               C 134 180, 122 184, 138 198
               C 130 198, 116 204, 138 218
               C 128 218, 122 230, 142 236
               C 178 266, 210 268, 245 268
               C 280 268, 312 266, 348 236
               C 368 230, 362 218, 352 218
               C 374 204, 360 198, 352 198
               C 368 184, 356 180, 352 180
               C 352 153, 338 153, 312 168
               C 290 178, 270 138, 245 138 Z" 
            fill="#ffffff" 
            stroke="#1e293b" 
            strokeWidth="11" 
            strokeLinejoin="round" 
          />
          {/* Forehead reflection highlights */}
          <ellipse cx="245" cy="115" rx="42" ry="11" fill="#ffffff" opacity="0.35" />
        </g>

        {/* ======================================================= */}
        {/* === LAYER 8: ANIME EYES & EXPRESSIVE BROWS === */}
        {/* ======================================================= */}
        {/* Eye 1 (Left, Facing Us) */}
        <g>
          <ellipse cx="192" cy="188" rx="21" ry="25" fill="#ffffff" stroke="#1a2230" strokeWidth="9" />
          <ellipse cx="192" cy="188" rx="16" ry="20" fill={`url(#${puckEyeGrad})`} />
          <ellipse cx="192" cy="188" rx="7.5" ry="11" fill="#082f49" />
          {/* Sparkling shiny reflections */}
          <circle cx="186" cy="179" r="5" fill="#ffffff" />
          <circle cx="198" cy="197" r="2.5" fill="#ffffff" />
        </g>

        {/* Eye 2 (Right, Facing Us) */}
        <g>
          <ellipse cx="298" cy="188" rx="21" ry="25" fill="#ffffff" stroke="#1a2230" strokeWidth="9" />
          <ellipse cx="298" cy="188" rx="16" ry="20" fill={`url(#${puckEyeGrad})`} />
          <ellipse cx="298" cy="188" rx="7.5" ry="11" fill="#082f49" />
          {/* Sparkling shiny reflections */}
          <circle cx="292" cy="179" r="5" fill="#ffffff" />
          <circle cx="304" cy="197" r="2.5" fill="#ffffff" />
        </g>

        {/* Secondary Brows (Cute white ovals above brow line) */}
        <ellipse cx="182" cy="154" rx="7.5" ry="5.5" fill="#ffffff" transform="rotate(-15 182 154)" />
        <ellipse cx="308" cy="154" rx="7.5" ry="5.5" fill="#ffffff" transform="rotate(15 308 154)" />
        {/* Dark eyelashes line */}
        <path d="M 172 174 Q 192 161, 214 172" fill="none" stroke="#2c3e50" strokeWidth="5" strokeLinecap="round" />
        <path d="M 276 174 Q 298 161, 318 172" fill="none" stroke="#2c3e50" strokeWidth="5" strokeLinecap="round" />

        {/* ======================================================= */}
        {/* === LAYER 9: FACIAL DETAILS & WHISKERS === */}
        {/* ======================================================= */}
        {/* Soft Pink Cheek Blush */}
        <ellipse cx="156" cy="222" rx="15" ry="8.5" fill="#fca5a5" opacity="0.65" />
        <ellipse cx="334" cy="222" rx="15" ry="8.5" fill="#fca5a5" opacity="0.65" />

        {/* Tiny nose */}
        <polygon points="245,208 241,202 249,202" fill="#4a5568" stroke="#1a2230" strokeWidth="1.5" />

        {/* Cheerful `:3` cat mouth smile */}
        <path 
          d="M 231 213 Q 245,221 245,213 Q 245,221 259,213" 
          fill="none" 
          stroke="#1a2230" 
          strokeWidth="6.5" 
          strokeLinecap="round" 
        />

        {/* Elegant whiskered cheeks - exactly 2 whiskers on each side */}
        {/* Left Side */}
        <path d="M 132 216 L 98 213" stroke="#1a2230" strokeWidth="4.5" strokeLinecap="round" />
        <path d="M 134 227 L 96 226" stroke="#1a2230" strokeWidth="4.5" strokeLinecap="round" />
        {/* Right Side */}
        <path d="M 358 216 L 392 213" stroke="#1a2230" strokeWidth="4.5" strokeLinecap="round" />
        <path d="M 356 227 L 394 226" stroke="#1a2230" strokeWidth="4.5" strokeLinecap="round" />

        {/* ======================================================= */}
        {/* === LAYER 10: ATMOSPHERIC ICE MAGIC EFFECTS === */}
        {/* ======================================================= */}
        <g filter={`url(#${glowFilter})`}>
          <polygon 
            points="65,130 80,110 95,130 80,150" 
            fill="#e0f2fe" 
            stroke="#38bdf8" 
            strokeWidth="3.5" 
            className="animate-pulse"
          />
          <polygon 
            points="410,320 425,300 440,320 425,340" 
            fill="#e0f2fe" 
            stroke="#38bdf8" 
            strokeWidth="3.5" 
            className="animate-pulseDelay"
          />
          <circle cx="95" cy="330" r="4.5" fill="#ffffff" className="animate-ping" />
          <circle cx="395" cy="110" r="5" fill="#e0f2fe" className="animate-pulse" />
        </g>
      </svg>
    </div>
  );
};

export const PandaMasterPet: React.FC<PetComponentProps> = ({ uId, animClass, className }) => {
  const pandaAura = `pandaAura-${uId}`;
  const pandaBody = `pandaBody-${uId}`;
  const jadeStaff = `jadeStaff-${uId}`;
  const innerShadow = `innerShadow-${uId}`;
  const glowFilter = `glow-${uId}`;
  return (
    <div className={cn("relative w-28 h-28 flex items-center justify-center", animClass, className)} title="武神熊貓">
      {/* Exquisite Double Layer Luminous Emerald Aura Backing */}
      <div className="absolute inset-[-8px] rounded-full bg-emerald-500/10 blur-xl pointer-events-none animate-[auraBreathing_2.2s_infinite_ease-in-out]" />
      <div className="absolute inset-[-2px] rounded-full bg-teal-500/10 blur-lg pointer-events-none animate-[auraBreathingSlow_2.8s_infinite_ease-in-out]" />

      <svg viewBox="0 0 24 24" className="w-full h-full overflow-visible drop-shadow-[0_0_12px_rgba(16,185,129,0.92)]">
        <defs>
          <radialGradient id={pandaAura} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#6ee7b7" stopOpacity="0.55" />
            <stop offset="55%" stopColor="#047857" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#064e3b" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={pandaBody} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="65%" stopColor="#f1f5f9" />
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
            <feFlood floodColor="black" floodOpacity="0.2" result="color"/>
            <feComposite operator="in" in="color" in2="inverse" result="shadow"/>
            <feComposite operator="over" in="shadow" in2="SourceGraphic"/>
          </filter>
          <filter id={glowFilter} x="-25%" y="-25%" width="150%" height="150%">
            <feGaussianBlur stdDeviation="1" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
        
        {/* Sacred rotating Jade gears - Concentric 3-layer orbits */}
        <circle cx="12" cy="12" r="11.4" fill="none" stroke="#34d399" strokeWidth="0.32" strokeDasharray="3 4 1 4" opacity="0.6" className="origin-center animate-[rotateCw_7s_linear_infinite]" />
        <circle cx="12" cy="12" r="10.8" fill="none" stroke="#6ee7b7" strokeWidth="0.25" strokeDasharray="5 3" opacity="0.6" className="origin-center animate-[rotateCcw_10s_linear_infinite]" />
        <circle cx="12" cy="12" r="10.0" fill="none" stroke="#059669" strokeWidth="0.18" strokeDasharray="1 3" opacity="0.5" className="origin-center animate-[rotateCw_15s_linear_infinite]" />
        
        {/* Soft magical background cloud */}
        <circle cx="12" cy="12" r="9.0" fill={`url(#${pandaAura})`} className="origin-center animate-[auraBreathing_2.3s_infinite_ease-in-out]" />

        {/* Rising jade magical energy particles */}
        <g filter={`url(#${glowFilter})`}>
          <circle cx="4.5" cy="15" r="0.75" fill="#a7f3d0" className="animate-[floatParticleA_2.2s_infinite]" />
          <circle cx="19.5" cy="13" r="0.8" fill="#34d399" className="animate-[floatParticleB_2.6s_infinite]" />
          <circle cx="11.0" cy="4.0" r="0.5" fill="#ffffff" opacity="0.9" className="animate-[floatParticleC_2.0s_infinite]" />
          <circle cx="7.0" cy="17.0" r="0.6" fill="#6ee7b7" className="animate-[floatParticleA_2.8s_infinite]" />
          <circle cx="17.0" cy="16.0" r="0.55" fill="#a7f3d0" className="animate-[floatParticleB_2.4s_infinite]" />
        </g>
        
        {/* Body */}
        <ellipse cx="12" cy="15" rx="6.5" ry="5.5" fill={`url(#${pandaBody})`} filter={`url(#${innerShadow})`} />
        
        {/* Dark limbs */}
        <ellipse cx="5.8" cy="15" rx="1.5" ry="3.5" fill="#0f172a" />
        <ellipse cx="18.2" cy="15" rx="1.5" ry="3.5" fill="#0f172a" />
        <circle cx="7.8" cy="19.5" r="1.5" fill="#0f172a" />
        <circle cx="16.2" cy="19.5" r="1.5" fill="#0f172a" />
        
        {/* Head */}
        <circle cx="12" cy="9.2" r="4.8" fill={`url(#${pandaBody})`} filter={`url(#${innerShadow})`} />
        <ellipse cx="12" cy="5.2" rx="1.3" ry="0.45" fill="white" opacity="0.4" />
        
        {/* Black ears wiggling */}
        <circle cx="7.8" cy="5.2" r="1.8" fill="#0f172a" className="origin-[7.8px_5.2px] animate-[earWiggleLeft_2s_infinite_ease-in-out_alternate]" />
        <circle cx="16.2" cy="5.2" r="1.8" fill="#0f172a" className="origin-[16.2px_5.2px] animate-[earWiggleRight_2s_infinite_ease-in-out_alternate_delay-100]" />
        
        {/* Eye patches */}
        <ellipse cx="10" cy="8.8" rx="1.5" ry="1.9" fill="#0f172a" transform="rotate(12 10 8.8)" />
        <ellipse cx="14" cy="8.8" rx="1.5" ry="1.9" fill="#0f172a" transform="rotate(-12 14 8.8)" />
        
        {/* Glowing Luminous Jade eyes */}
        <g filter={`url(#${glowFilter})`}>
          <circle cx="10.2" cy="8.6" r="0.75" fill="#6ee7b7" className="animate-pulse" />
          <circle cx="10.0" cy="8.4" r="0.2" fill="white" />
          <circle cx="13.8" cy="8.6" r="0.75" fill="#6ee7b7" className="animate-pulse" />
          <circle cx="13.6" cy="8.4" r="0.2" fill="white" />
        </g>
        
        {/* Nose & Mouth */}
        <polygon points="12,10.2 11.5,9.7 12.5,9.7" fill="#020617" />
        <path d="M11,10.8 Q12,11.3 13,10.8" stroke="#0f172a" strokeWidth="0.5" fill="none" />
        
        {/* Real-time spinning weapon Jade Divine Staff */}
        <g className="origin-[15px_13px] animate-[staffSpin_1.8s_linear_infinite]">
          <rect 
            x="14.4" 
            y="9" 
            width="1.2" 
            height="8" 
            rx="0.6" 
            transform="rotate(35 15 9)" 
            fill={`url(#${jadeStaff})`} 
            filter={`url(#${innerShadow})`}
          />
          <circle cx="18.8" cy="8.4" r="1.4" fill="#6ee7b7" className="animate-ping" />
          <circle cx="18.8" cy="8.4" r="0.85" fill="#a7f3d0" />
        </g>
        
        {/* Jade sparkler dust */}
        <g filter={`url(#${glowFilter})`}>
          <path d="M8,2.5 Q8,3.2 8.6,3.2 Q8,3.2 8,3.9 Q8,3.2 7.4,3.2" fill="#a7f3d0" className="animate-[floatParticleC_2s_infinite]" />
        </g>
      </svg>
    </div>
  );
};

export const ScarabPet: React.FC<PetComponentProps> = ({ uId, animClass, className }) => {
  const scarabGold = `scarabGold-${uId}`;
  const scarabTeal = `scarabTeal-${uId}`;
  const glowFilter = `glow-${uId}`;
  return (
    <div className={cn("relative w-28 h-28 flex items-center justify-center", animClass, className)} title="聖甲蟲">
      <svg viewBox="0 0 24 24" className="w-full h-full overflow-visible drop-shadow-[0_5px_12px_rgba(234,179,8,0.45)]">
        <defs>
          <linearGradient id={scarabGold} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="50%" stopColor="#eab308" />
            <stop offset="100%" stopColor="#854d0e" />
          </linearGradient>
          <linearGradient id={scarabTeal} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#a5f3fc" />
            <stop offset="50%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#155e75" />
          </linearGradient>
          <filter id={glowFilter} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="0.6" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>




        {/* Six Metallic Jointed Beetle Legs */}
        <g stroke="#78350f" strokeWidth="0.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
          {/* Left Front Leg */}
          <path d="M 9,10 Q 5,8 5,6 Q 4.5,5.5 5,5 Q 6,5 7,7 L 9,9.5" />
          {/* Right Front Leg */}
          <path d="M 15,10 Q 19,8 19,6 Q 19.5,5.5 19,5 Q 18,5 17,7 L 15,9.5" />
          
          {/* Left Mid Leg */}
          <path d="M 8,13 Q 3,12 4,14 Q 4.5,14.5 4.5,14 Q 5,13 8,13" />
          {/* Right Mid Leg */}
          <path d="M 16,13 Q 21,12 20,14 Q 19.5,14.5 19.5,14 Q 19,13 16,13" />

          {/* Left Back Leg */}
          <path d="M 9,16 Q 5,18 6,21 Q 6.5,21.5 7,21 Q 7,19 10,17" />
          {/* Right Back Leg */}
          <path d="M 15,16 Q 19,18 18,21 Q 17.5,21.5 17,21 Q 17,19 14,17" />
        </g>

        {/* Antennae & Pincers */}
        <g stroke="#78350f" strokeWidth="0.45" fill={`url(#${scarabGold})`}>
          <path d="M 10.2,6 C 9.5,4 11.2,3 11.6,4.5 C 11.0,4.2 10.0,4.8 10.5,5.5 Z" />
          <path d="M 13.8,6 C 14.5,4 12.8,3 12.4,4.5 C 13.0,4.2 14.0,4.8 13.5,5.5 Z" />
        </g>

        {/* Egyptian Scarab Head */}
        <path 
          d="M 12,7 C 10,7 10,5 12,5.2 C 14,5 14,7 12,7 Z" 
          fill={`url(#${scarabGold})`} 
          stroke="#78350f" 
          strokeWidth="0.5" 
        />

        {/* Beetle Thorax (Neck) */}
        <path 
          d="M 12,10 C 8,10 8,7.5 12,7.5 C 16,7.5 16,10 12,10 Z" 
          fill={`url(#${scarabGold})`} 
          stroke="#78350f" 
          strokeWidth="0.5" 
        />

        {/* Beetle Main Elytra (Left and Right Wing covers) */}
        <g stroke="#78350f" strokeWidth="0.5">
          {/* Left Elytra Wing */}
          <path 
            d="M 12,10 C 6.5,10 6.5,18.5 12,18.5 Z" 
            fill={`url(#${scarabGold})`} 
          />
          {/* Right Elytra Wing */}
          <path 
            d="M 12,10 C 17.5,10 17.5,18.5 12,18.5 Z" 
            fill={`url(#${scarabGold})`} 
          />
        </g>

        {/* Ancient Wing Engravings/Decorations for Gold Shell */}
        <g stroke="#78350f" strokeWidth="0.35" fill="none" strokeLinecap="round" opacity="0.8">
          {/* Left Wing lines */}
          <path d="M 10,11.5 Q 8.5,13.5 10.2,16.5" />
          <path d="M 11,10.8 Q 9.5,13.5 11,17.5" />
          {/* Right Wing lines */}
          <path d="M 14,11.5 Q 15.5,13.5 13.8,16.5" />
          <path d="M 13,10.8 Q 14.5,13.5 13,17.5" />
        </g>

        {/* Sacred Turquoise Inlaid Jewel/Gemstone centered on back */}
        <path 
          d="M 12,11.5 L 13.5,13.5 L 12,15.5 L 10.5,13.5 Z" 
          fill={`url(#${scarabTeal})`} 
          stroke="#0f172a" 
          strokeWidth="0.4" 
        />
        {/* Gemstone specular highlight */}
        <path 
          d="M 11.2,13 L 12,12 L 12.3,13 Z" 
          fill="#ffffff" 
          opacity="0.55" 
        />

        {/* Mystic Glowing Insect Eyes */}
        <g filter={`url(#${glowFilter})`}>
          <ellipse cx="10.8" cy="6.0" rx="0.4" ry="0.25" fill="#22d3ee" />
          <ellipse cx="13.2" cy="6.0" rx="0.4" ry="0.25" fill="#22d3ee" />
        </g>
      </svg>
    </div>
  );
};

export const KingdomHeartsShadowPet: React.FC<PetComponentProps> = ({ uId, animClass, className }) => {
  const shadowAura = `shadowAura-${uId}`;
  const shadowCore = `shadowCore-${uId}`;
  const eyeGlow = `eyeGlow-${uId}`;
  const glowFilter = `glow-${uId}`;
  return (
    <div className={cn("relative w-28 h-28 flex items-center justify-center animate-[petFloat_2.5s_infinite_ease-in-out]", animClass, className)} title="無心者影子">
      {/* Immersive deep-void shadows & purple magical glow backing */}
      <div className="absolute inset-[-10px] rounded-full bg-indigo-900/10 blur-xl pointer-events-none animate-[auraBreathing_2.5s_infinite_ease-in-out]" />
      <div className="absolute inset-[-4px] rounded-full bg-purple-900/10 blur-lg pointer-events-none animate-[auraBreathingSlow_3.5s_infinite_ease-in-out]" />

      <svg viewBox="0 0 24 24" className="w-full h-full overflow-visible drop-shadow-[0_4px_12px_rgba(99,102,241,0.65)]">
        <defs>
          <radialGradient id={shadowAura} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.6" />
            <stop offset="60%" stopColor="#311042" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={shadowCore} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#2e1065" />
            <stop offset="45%" stopColor="#1e1b4b" />
            <stop offset="100%" stopColor="#020617" />
          </linearGradient>
          <radialGradient id={eyeGlow} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fffefe" />
            <stop offset="40%" stopColor="#facc15" />
            <stop offset="100%" stopColor="#ca8a04" stopOpacity="0" />
          </radialGradient>
          <filter id={glowFilter} x="-22%" y="-22%" width="144%" height="144%">
            <feGaussianBlur stdDeviation="0.9" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Concentric rotating circles for Ultimate Tier - 3-layer void loops */}
        <circle cx="12" cy="12" r="11.8" fill="none" stroke="#f1f5f9" strokeWidth="0.32" strokeDasharray="3 4 5 4" opacity="0.65" className="origin-center animate-[rotateCw_7s_linear_infinite]" />
        <circle cx="12" cy="12" r="11.0" fill="none" stroke="#818cf8" strokeWidth="0.22" strokeDasharray="6 3" opacity="0.55" className="origin-center animate-[rotateCcw_11s_linear_infinite]" />
        <circle cx="12" cy="12" r="10.2" fill="none" stroke="#4f46e5" strokeWidth="0.18" strokeDasharray="1 3" opacity="0.45" className="origin-center animate-[rotateCw_15s_linear_infinite]" />

        {/* Floating void spark particles */}
        <g filter={`url(#${glowFilter})`}>
          <circle cx="4" cy="15" r="0.8" fill="#a78bfa" className="animate-[floatParticleA_2.2s_infinite]" />
          <circle cx="20" cy="13" r="0.7" fill="#818cf8" className="animate-[floatParticleB_2.6s_infinite]" />
          <circle cx="12" cy="3" r="0.5" fill="#facc15" className="animate-[floatParticleC_1.8s_infinite]" />
          <circle cx="6" cy="6" r="0.4" fill="#fff" opacity="0.8" className="animate-[floatParticleA_2.5s_infinite]" />
          <circle cx="18" cy="6" r="0.45" fill="#a78bfa" className="animate-[floatParticleB_2.8s_infinite]" />
        </g>

        <ellipse cx="12" cy="16.5" rx="4.8" ry="4.2" fill={`url(#${shadowCore})`} stroke="#4338ca" strokeWidth="0.3" />

        <path d="M7.5,17 C6,18 4.2,16.5 5.5,15.5 C6.5,15 7,16 7.5,17 Z" fill="#020617" stroke="#4338ca" strokeWidth="0.2" />
        <path d="M16.5,17 C18,18 19.8,16.5 18.5,15.5 C17.5,15 17,16 16.5,17 Z" fill="#020617" stroke="#4338ca" strokeWidth="0.2" />

        <circle cx="12" cy="11.8" r="4.6" fill={`url(#${shadowCore})`} stroke="#4338ca" strokeWidth="0.3" />

        <g className="origin-[10px_8.2px] animate-[earWiggleLeft_1.8s_infinite_ease-in-out_alternate]">
          <path d="M9.8,8 C8.2,5 6.4,4 5.2,4.8 C5.4,6 7.6,7.5 9.8,8 Z" fill="#020617" stroke="#4338ca" strokeWidth="0.2" />
        </g>
        <g className="origin-[14.2px_8.2px] animate-[earWiggleRight_2s_infinite_ease-in-out_alternate_delay-100]">
          <path d="M14.2,8 C15.8,5 17.6,4 18.8,4.8 C18.6,6 16.4,7.5 14.2,8 Z" fill="#020617" stroke="#4338ca" strokeWidth="0.2" />
        </g>

        <g filter={`url(#${glowFilter})`}>
          <circle cx="10" cy="11.8" r="1.3" fill="url(#eyeGlow)" />
          <circle cx="10" cy="11.8" r="0.75" fill="#fff" />
          
          <circle cx="14" cy="11.8" r="1.3" fill="url(#eyeGlow)" />
          <circle cx="14" cy="11.8" r="0.75" fill="#fff" />
        </g>

        <ellipse cx="12" cy="14" rx="2" ry="0.6" fill="#818cf8" opacity="0.25" />
      </svg>
    </div>
  );
};

export const MetroidPet: React.FC<PetComponentProps> = ({ uId, animClass, className }) => {
  const metroidAura = `metroidAura-${uId}`;
  const metroidShell = `metroidShell-${uId}`;
  const brainGrad = `brainGrad-${uId}`;
  const pincerGrad = `pincerGrad-${uId}`;
  const glowFilter = `glow-${uId}`;
  return (
    <div className={cn("relative w-28 h-28 flex items-center justify-center", animClass, className)} title="銀河戰士">
      <svg viewBox="0 0 24 24" className="w-full h-full overflow-visible drop-shadow-[0_4px_12px_rgba(20,184,166,0.55)]">
        <defs>
          <radialGradient id={metroidAura} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#2dd4bf" stopOpacity="0.5" />
            <stop offset="60%" stopColor="#0d9488" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#115e59" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={metroidShell} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#2dd4bf" stopOpacity="0.82" />
            <stop offset="50%" stopColor="#14b8a6" stopOpacity="0.58" />
            <stop offset="100%" stopColor="#047857" stopOpacity="0.22" />
          </linearGradient>
          <radialGradient id={brainGrad} cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#fda4af" />
            <stop offset="55%" stopColor="#f43f5e" />
            <stop offset="100%" stopColor="#9f1239" />
          </radialGradient>
          <linearGradient id={pincerGrad} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#e2e8f0" />
            <stop offset="100%" stopColor="#64748b" />
          </linearGradient>
          <filter id={glowFilter} x="-22%" y="-22%" width="144%" height="144%">
            <feGaussianBlur stdDeviation="0.8" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>




        <g filter={`url(#${glowFilter})`}>
          <line x1="4.5" y1="11" x2="5.5" y2="12" stroke="#2dd4bf" strokeWidth="0.45" className="animate-pulse" />
          <line x1="18.5" y1="13" x2="19.5" y2="12" stroke="#fda4af" strokeWidth="0.45" className="animate-pulse" />
        </g>

        <g filter={`url(#${glowFilter})`} className="animate-pulse" style={{ animationDuration: '1.4s' }}>
          <circle cx="12" cy="10" r="1.9" fill={`url(#${brainGrad})`} />
          <circle cx="11.6" cy="9.6" r="0.5" fill="#fff" opacity="0.6" />
          
          <circle cx="10" cy="12.2" r="1.45" fill={`url(#${brainGrad})`} />
          <circle cx="9.7" cy="11.9" r="0.35" fill="#fff" opacity="0.6" />
          
          <circle cx="14" cy="12.2" r="1.45" fill={`url(#${brainGrad})`} />
          <circle cx="13.7" cy="11.9" r="0.35" fill="#fff" opacity="0.6" />

          <path d="M10,12.2 Q12,10 14,12.2" stroke="#ef4444" strokeWidth="0.5" fill="none" />
        </g>

        <ellipse cx="12" cy="11" rx="6.5" ry="5" fill={`url(#${metroidShell})`} stroke="#2dd4bf" strokeWidth="0.45" />

        <path d="M7.2,8 Q12,5.5 16.8,8 M7.8,7.3 Q12,5.2 16.2,7.3" stroke="#fff" strokeWidth="0.35" strokeLinecap="round" fill="none" opacity="0.55" />

        <g className="origin-[12px_11px] animate-[wingFlapLeft_1.5s_infinite_ease-in-out_alternate]">
          <path d="M9,14.8 L7.5,18 L9.2,16 Z" fill={`url(#${pincerGrad})`} stroke="#475569" strokeWidth="0.2" />
          <path d="M10.8,15.2 L10,18.8 L11.2,16.5 Z" fill={`url(#${pincerGrad})`} stroke="#475569" strokeWidth="0.2" />
        </g>
        <g className="origin-[12px_11px] animate-[wingFlapRight_1.5s_infinite_ease-in-out_alternate_delay-100]">
          <path d="M15,14.8 L16.5,18 L14.8,16 Z" fill={`url(#${pincerGrad})`} stroke="#475569" strokeWidth="0.2" />
          <path d="M13.2,15.2 L14,18.8 L12.8,16.5 Z" fill={`url(#${pincerGrad})`} stroke="#475569" strokeWidth="0.2" />
        </g>
      </svg>
    </div>
  );
};

export const IceFireSiblingsPet: React.FC<PetComponentProps> = ({ uId, animClass, className }) => {
  const siblingsBackGrad = `siblingsBackGrad-${uId}`;
  const iceBodyGrad = `iceBodyGrad-${uId}`;
  const fireBodyGrad = `fireBodyGrad-${uId}`;
  const crystalGrad = `crystalGrad-${uId}`;
  const flameGrad = `flameGrad-${uId}`;
  const glowFilter = `glow-${uId}`;
  const ringGrad1 = `ringGrad1-${uId}`;
  const ringGrad2 = `ringGrad2-${uId}`;
  return (
    <div className={cn("relative w-28 h-28 flex items-center justify-center animate-[petFloat_2.4s_infinite_ease-in-out]", animClass, className)} title="冰火神魔姊弟">
      {/* Exquisite Double Layer Luminous Deep Ice & Burning Fire backing */}
      <div className="absolute inset-[-10px] rounded-full bg-cyan-500/10 blur-xl pointer-events-none animate-[auraBreathing_2s_infinite_ease-in-out]" />
      <div className="absolute inset-[-4px] rounded-full bg-rose-500/10 blur-lg pointer-events-none animate-[auraBreathingSlow_3s_infinite_ease-in-out]" />

      <svg viewBox="0 0 64 64" className="w-full h-full overflow-visible drop-shadow-[0_4px_12px_rgba(30,41,59,0.5)]">
        <defs>
          <radialGradient id={siblingsBackGrad} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#1e1b4b" stopOpacity="0.5" />
            <stop offset="60%" stopColor="#0f172a" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#020617" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={iceBodyGrad} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#cffafe" />
            <stop offset="40%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#0284c7" />
          </linearGradient>
          <linearGradient id={fireBodyGrad} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="100%" stopColor="#991b1b" />
          </linearGradient>
          <linearGradient id={crystalGrad} x1="30%" y1="0%" x2="70%" y2="100%">
            <stop offset="0%" stopColor="#e0f2fe" />
            <stop offset="45%" stopColor="#0ea5e9" />
            <stop offset="100%" stopColor="#0369a1" />
          </linearGradient>
          <linearGradient id={flameGrad} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#facc15" />
            <stop offset="60%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#ea580c" />
          </linearGradient>
          <linearGradient id={ringGrad1} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="50%" stopColor="#ec4899" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>
          <linearGradient id={ringGrad2} x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#22d3ee" />
            <stop offset="100%" stopColor="#ef4444" />
          </linearGradient>
          <filter id={glowFilter} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="0.8" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Dynamic Celestial Rings centered around the siblings (Ultimate aesthetic) - Concentric 3-layer orbits */}
        <circle cx="32" cy="32" r="28" fill="none" stroke={`url(#${ringGrad1})`} strokeWidth="0.5" strokeDasharray="5 3 2 3" opacity="0.8" className="origin-center animate-[rotateCw_15s_linear_infinite]" />
        <circle cx="32" cy="32" r="25" fill="none" stroke={`url(#${ringGrad2})`} strokeWidth="0.4" strokeDasharray="3 3" opacity="0.6" className="origin-center animate-[rotateCcw_18s_linear_infinite]" />
        <circle cx="32" cy="32" r="22.5" fill="none" stroke="#a78bfa" strokeWidth="0.25" strokeDasharray="1 4" opacity="0.5" className="origin-center animate-[rotateCw_22s_linear_infinite]" />

        {/* Cute soft-glowing mystical backing elements for the characters */}
        <circle cx="18" cy="27" r="15" fill="rgba(6,182,212,0.18)" filter={`url(#${glowFilter})`} />
        <circle cx="45" cy="33" r="15" fill="rgba(239,68,68,0.2)" filter={`url(#${glowFilter})`} />

        {/* === LAYER 1: WATERGIRL (Left Chibi) === */}
        <g transform="translate(0, 7)" className="origin-[18px_32px] animate-[earWiggleLeft_4s_infinite_ease-in-out_alternate]">
          {/* Back Left hair lock */}
          <path 
            d="M 13.5,21.5 L 9,28 C 8.5,29 11.5,26.5 13.5,23.5 Z" 
            fill={`url(#${crystalGrad})`} 
            stroke="#111827" 
            strokeWidth="0.95" 
            strokeLinejoin="round" 
          />

          {/* Left foot & Leg */}
          <path d="M 15.5,36 L 15.5,43.2 C 15.5,43.8 17.0,43.8 17.0,43.2 L 17.0,36 Z" fill={`url(#${iceBodyGrad})`} stroke="#111827" strokeWidth="1.05" strokeLinejoin="round" />
          {/* Right foot & Leg */}
          <path d="M 18.0,36 L 18.0,43.2 C 18.0,43.8 19.5,43.8 19.5,43.2 L 19.5,36 Z" fill={`url(#${iceBodyGrad})`} stroke="#111827" strokeWidth="1.05" strokeLinejoin="round" />

          {/* Torso & dress */}
          <path d="M 15.2,26.5 L 19.8,26.5 L 20.8,36.2 L 14.2,36.2 Z" fill={`url(#${iceBodyGrad})`} stroke="#111827" strokeWidth="1.05" strokeLinejoin="round" />
          {/* Torso stream-like decoration highlight */}
          <path d="M 17.5,27.5 L 17.5,34.5" stroke="#ecfeff" strokeWidth="0.8" strokeLinecap="round" opacity="0.65" />
          <circle cx="16.2" cy="29.5" r="0.45" fill="#ffffff" opacity="0.6" />

          {/* Left Arm */}
          <path d="M 15.2,27.0 L 12.8,33.0 C 12.4,34.0 13.8,34.4 14.2,33.4 L 16.0,28.2" fill={`url(#${iceBodyGrad})`} stroke="#111827" strokeWidth="1.0" strokeLinejoin="round" />
          {/* Right Arm */}
          <path d="M 19.8,27.0 L 22.2,33.0 C 22.6,34.0 21.2,34.4 20.8,33.4 L 19.0,28.2" fill={`url(#${iceBodyGrad})`} stroke="#111827" strokeWidth="1.0" strokeLinejoin="round" />

          {/* Face Skin base */}
          <circle cx="18" cy="21.5" r="5.8" fill={`url(#${iceBodyGrad})`} stroke="#111827" strokeWidth="1.15" />

          {/* Hair Scalp & Bangs */}
          <path 
            d="M 11.6,20.2 C 10.8,15.2 14.2,13.2 18.0,13.2 C 21.8,13.2 25.2,15.2 24.4,20.2 C 24.6,20.8 24.4,21.5 24.4,21.5 C 22.8,17.2 19.6,16.8 18.0,17.8 C 16.4,16.8 13.2,17.2 11.6,21.5 Z" 
            fill={`url(#${crystalGrad})`} 
            stroke="#111827" 
            strokeWidth="1.15" 
          />

          {/* Hair Bun on top of head */}
          <path 
            d="M 14.5,13.2 C 14.0,9.0 22.0,9.0 21.5,13.2 Z" 
            fill={`url(#${crystalGrad})`} 
            stroke="#111827" 
            strokeWidth="1.1" 
            strokeLinejoin="round" 
          />
          <path d="M 16.5,10.6 C 17.5,9.6 18.5,9.6 19.5,10.6" stroke="#ecfeff" strokeWidth="0.75" fill="none" strokeLinecap="round" />

          {/* Cute Hair Accessories (Little Orange Bead pin on the right hair) */}
          <circle cx="24.5" cy="19.2" r="1.15" fill="#f97316" stroke="#111827" strokeWidth="0.65" />
          <circle cx="24.5" cy="19.2" r="0.45" fill="#fef08a" />

          {/* Circular Wide Eyes */}
          {/* Left Eye */}
          <circle cx="15.0" cy="21.5" r="2.1" fill="#ffffff" stroke="#111827" strokeWidth="0.95" />
          <ellipse cx="15.0" cy="21.5" rx="1.2" ry="1.0" fill="#22d3ee" stroke="#111827" strokeWidth="0.55" />
          <circle cx="15.0" cy="21.5" r="0.45" fill="#111827" />
          <circle cx="14.5" cy="20.9" r="0.32" fill="#ffffff" />
          
          {/* Right Eye */}
          <circle cx="21.0" cy="21.5" r="2.1" fill="#ffffff" stroke="#111827" strokeWidth="0.95" />
          <ellipse cx="21.0" cy="21.5" rx="1.2" ry="1.0" fill="#22d3ee" stroke="#111827" strokeWidth="0.55" />
          <circle cx="21.0" cy="21.5" r="0.45" fill="#111827" />
          <circle cx="20.5" cy="20.9" r="0.32" fill="#ffffff" />

          {/* Symmetrical simple smirk */}
          <path d="M 16.8,25.4 Q 18.0,26.8 19.2,25.2" stroke="#111827" strokeWidth="0.95" strokeLinecap="round" fill="none" />
        </g>

        {/* === THE HARMONIOUS CORE ORB (Glow floating between them) === */}
        <g className="origin-[32px_32px] animate-[staffSpin_6s_linear_infinite]">
          <circle cx="32" cy="32" r="2.5" fill="none" stroke="#ffffff" strokeWidth="0.4" strokeDasharray="2 1" opacity="0.8" />
          <circle cx="32" cy="32" r="0.8" fill="#eab308" filter={`url(#${glowFilter})`} />
        </g>

        {/* === LAYER 2: FIREBOY (Right Chibi) === */}
        <g className="origin-[45px_38px] animate-[earWiggleRight_4s_infinite_ease-in-out_alternate_delay-200]">
          {/* Left foot & Leg */}
          <path d="M 42.5,43 L 42.5,50.2 C 42.5,50.8 44.0,50.8 44.0,50.2 L 44.0,43 Z" fill={`url(#${fireBodyGrad})`} stroke="#111827" strokeWidth="1.05" strokeLinejoin="round" />
          {/* Right foot & Leg */}
          <path d="M 45.0,43 L 45.0,50.2 C 45.0,50.8 46.5,50.8 46.5,50.2 L 46.5,43 Z" fill={`url(#${fireBodyGrad})`} stroke="#111827" strokeWidth="1.05" strokeLinejoin="round" />

          {/* Torso */}
          <path d="M 42.1,34 L 46.9,34 L 47.9,43.2 L 41.1,43.2 Z" fill={`url(#${fireBodyGrad})`} stroke="#111827" strokeWidth="1.05" strokeLinejoin="round" />
          {/* Fire light chest decoration highlight */}
          <path d="M 44.5,35.0 L 44.5,42.0" stroke="#fef08a" strokeWidth="0.8" strokeLinecap="round" opacity="0.65" />
          <circle cx="43.2" cy="37.0" r="0.45" fill="#facc15" opacity="0.6" />

          {/* Left Arm */}
          <path d="M 42.1,34.5 L 39.8,40.5 Q 39.2,42.0 40.0,41.2 L 41.9,35.7" fill={`url(#${fireBodyGrad})`} stroke="#111827" strokeWidth="1.0" strokeLinejoin="round" />
          {/* Right Arm */}
          <path d="M 46.9,34.5 L 49.2,40.5 Q 49.8,42.0 49.0,41.2 L 47.1,35.7" fill={`url(#${fireBodyGrad})`} stroke="#111827" strokeWidth="1.0" strokeLinejoin="round" />

          {/* Spiky Flame Hair/Head outline (most iconic segment) */}
          <path 
            d="M 40.0,34.0 C 36.5,32.0 35.0,26.5 38.0,24.0 C 34.2,22.0 35.0,16.0 39.5,15.5 C 37.0,11.5 41.5,8.5 44.2,8.0 Q 43.5,3.0 47.0,6.0 Q 49.5,4.5 50.5,10.0 C 53.0,12.0 54.0,17.5 52.8,21.0 C 55.0,24.0 54.0,29.0 50.0,31.5 C 47.0,33.5 43.5,34.0 40.0,34.0 Z" 
            fill={`url(#${fireBodyGrad})`} 
            stroke="#111827" 
            strokeWidth="1.35" 
            strokeLinejoin="round" 
          />

          {/* Inner smaller warm-glowing core of spiky flame hair */}
          <path 
            d="M 41.0,31.5 C 38.2,30.0 37.0,25.5 39.2,23.5 C 36.2,21.8 37.0,17.2 40.5,16.8 M 41.5,12.0 C 42.5,9.0 45.0,9.0 45.0,11.5 Q 47.0,10.0 48.0,14.5 C 50.2,16.0 51.0,20.0 50.0,23.5 M 51.5,25.0 C 49.2,27.0 47.0,28.5 44.5,28.5" 
            fill="none" 
            stroke={`url(#${flameGrad})`} 
            strokeWidth="1.1" 
            opacity="0.9" 
            strokeLinecap="round"
          />

          {/* Large Bright Yellow Eyes */}
          {/* Left Eye */}
          <circle cx="41.2" cy="25.5" r="2.3" fill="#ffe600" stroke="#111827" strokeWidth="1.0" />
          <circle cx="41.2" cy="25.5" r="0.65" fill="#111827" />
          <circle cx="40.7" cy="25.0" r="0.32" fill="#ffffff" opacity="0.85" />
          
          {/* Right Eye */}
          <circle cx="46.8" cy="25.5" r="2.3" fill="#ffe600" stroke="#111827" strokeWidth="1.0" />
          <circle cx="46.8" cy="25.5" r="0.65" fill="#111827" />
          <circle cx="46.3" cy="25.0" r="0.32" fill="#ffffff" opacity="0.85" />

          {/* Cute skewed smirk below */}
          <path d="M 42.2,28.8 Q 44.0,30.2 45.8,28.5" stroke="#111827" strokeWidth="0.95" strokeLinecap="round" fill="none" />
        </g>

        {/* Magnificent Dual-Element Sparkles Rising */}
        <g filter={`url(#${glowFilter})`}>
          {/* Cyan/Icy left-focused dynamic particles */}
          <polygon points="12,14 13,15 12,16 11,15" fill="#a5f3fc" className="animate-[floatParticleA_2.5s_infinite]" />
          <circle cx="8" cy="20" r="1.1" fill="#22d3ee" className="animate-[floatParticleC_2s_infinite]" />
          <circle cx="20" cy="12" r="0.9" fill="#06b6d4" className="animate-[floatParticleB_2.8s_infinite]" />
          <circle cx="28" cy="48" r="0.8" fill="#e0f2fe" className="animate-[floatParticleA_2.2s_infinite]" />

          {/* Yellow/Fiery right-focused dynamic particles */}
          <circle cx="51" cy="18" r="1.2" fill="#fb7185" className="animate-[floatParticleB_3s_infinite]" />
          <circle cx="42" cy="16" r="0.9" fill="#facc15" className="animate-[floatParticleA_2.4s_infinite]" />
          <circle cx="56" cy="28" r="1.0" fill="#f97316" className="animate-[floatParticleC_2.6s_infinite]" />
          <circle cx="36" cy="46" r="0.8" fill="#fecdd3" className="animate-[floatParticleB_2s_infinite]" />
        </g>
      </svg>
    </div>
  );
};

export const KuribohPet: React.FC<PetComponentProps> = ({ uId, animClass, className }) => {
  const glowFilter = `gemGlow-${uId}`;
  const rRing1 = `rRing1-${uId}`;
  const rRing2 = `rRing2-${uId}`;
  return (
    <div className={cn("relative w-28 h-28 flex items-center justify-center animate-[petFloat_2.4s_infinite_ease-in-out]", animClass, className)} title="栗子球">
      <div className="absolute inset-[-8px] rounded-full bg-yellow-500/10 blur-xl pointer-events-none animate-[auraBreathing_2s_infinite_ease-in-out]" />
      <div className="absolute inset-[-2px] rounded-full bg-purple-500/10 blur-lg pointer-events-none animate-[auraBreathingSlow_3s_infinite_ease-in-out]" />

      <svg viewBox="0 0 24 24" className="w-full h-full overflow-visible drop-shadow-[0_5px_15px_rgba(168,85,247,0.48)]">
        <defs>
          <radialGradient id={rRing1} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#c084fc" stopOpacity="0.4" />
            <stop offset="60%" stopColor="#c084fc" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#7e22ce" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={rRing2} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fef08a" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#ca8a04" stopOpacity="0" />
          </radialGradient>
          <filter id={glowFilter} x="-25%" y="-25%" width="150%" height="150%">
            <feGaussianBlur stdDeviation="0.6" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Concentric Rotating Sacred/Ultimate Magic Orbits */}
        <circle cx="12" cy="12" r="11.4" fill="none" stroke="#a855f7" strokeWidth="0.35" strokeDasharray="3 4 1 4" opacity="0.6" className="origin-center animate-[rotateCw_6s_linear_infinite]" />
        <circle cx="12" cy="12" r="10.8" fill="none" stroke="#eab308" strokeWidth="0.28" strokeDasharray="5 3" opacity="0.65" className="origin-center animate-[rotateCcw_9s_linear_infinite]" />
        <circle cx="12" cy="12" r="10.0" fill="none" stroke="#c084fc" strokeWidth="0.18" strokeDasharray="1 4" opacity="0.5" className="origin-center animate-[rotateCw_15s_linear_infinite]" />

        {/* Soft Background Auras */}
        <circle cx="12" cy="12" r="9.2" fill={`url(#${rRing1})`} className="origin-center animate-[auraBreathing_2.3s_infinite_ease-in-out]" />
        <circle cx="12" cy="12" r="8.2" fill={`url(#${rRing2})`} className="origin-center animate-[auraBreathingSlow_2s_infinite_ease-in-out]" />

        {/* Rich Sparkly Cosmic particles */}
        <g filter={`url(#${glowFilter})`}>
          <circle cx="3.8" cy="8.5" r="0.45" fill="#fef08a" className="animate-[floatParticleA_2.2s_infinite]" />
          <circle cx="20.2" cy="9.5" r="0.55" fill="#e9d5ff" className="animate-[floatParticleB_2.6s_infinite]" />
          <circle cx="7.2" cy="3.5" r="0.4" fill="#fae8ff" className="animate-[floatParticleC_2.0s_infinite]" />
          <circle cx="16.8" cy="3.2" r="0.5" fill="#fef08a" className="animate-[floatParticleA_2.8s_infinite]" />
          <circle cx="5.0" cy="16.5" r="0.42" fill="#c084fc" className="animate-[floatParticleC_2.5s_infinite]" />
          <circle cx="19.0" cy="16.5" r="0.45" fill="#fbbf24" className="animate-[floatParticleB_2.2s_infinite]" />
        </g>

        {/* Fluffy Spike Fur Background Layers */}
        <g fill="#451a03" className="origin-center animate-pulse" style={{ animationDuration: "1.8s" }}>
          {/* Fur Spikes outer layer */}
          <polygon points="12,4 10,7 8,5 8,8 5,6 6,9 4,11 7,12 4,13 7,14 5,17 8,16 9,19 11,17 12,20 13,17 15,19 16,16 19,17 17,14 20,13 17,12 20,11 18,9 20,6 16,8 16,5 14,7" />
        </g>
        <g fill="#78350f">
          {/* Main fuzzy body cover */}
          <circle cx="12" cy="12" r="6" />
          {/* Inner spikes for cute fuzzy 3D depth */}
          <polygon points="12,5 11,8 9,6 9,9 7,7 8,10 6,11 9,12 6,13 9,14 7,17 10,16 11,18 12,16 13,18 14,16 17,17 15,14 18,13 15,12 18,11 15,10 17,7 14,9 14,6 13,8" />
        </g>
        
        {/* Cute Green anime eyes (Kuriboh iconic) */}
        {/* Left Eye */}
        <g>
          <circle cx="9.5" cy="11.5" r="1.9" fill="#1e293b" />
          <circle cx="9.5" cy="11.5" r="1.6" fill="#fbbf24" />
          <circle cx="9.5" cy="11.5" r="1.3" fill="#16a34a" />
          <circle cx="9.0" cy="11.0" r="0.55" fill="#ffffff" />
          <circle cx="10.0" cy="12.0" r="0.25" fill="#ffffff" opacity="0.7" />
        </g>
        
        {/* Right Eye */}
        <g>
          <circle cx="14.5" cy="11.5" r="1.9" fill="#1e293b" />
          <circle cx="14.5" cy="11.5" r="1.6" fill="#fbbf24" />
          <circle cx="14.5" cy="11.5" r="1.3" fill="#16a34a" />
          <circle cx="14.0" cy="11.0" r="0.55" fill="#ffffff" />
          <circle cx="15.0" cy="12.0" r="0.25" fill="#ffffff" opacity="0.7" />
        </g>

        {/* Cute small pink round rosy cheeks */}
        <circle cx="7.7" cy="13.2" r="0.65" fill="#fca5a5" opacity="0.6" />
        <circle cx="16.3" cy="13.2" r="0.65" fill="#fca5a5" opacity="0.6" />

        {/* Little green paws extending from below the fluff */}
        <g stroke="#16a34a" strokeWidth="0.45" strokeLinecap="round" fill="none">
          {/* Left Paw */}
          <path d="M 8.5,17 Q 7.5,19.2 8.0,20.5" className="origin-[8.5px_17px] animate-[earWiggleLeft_1.5s_infinite_ease-in-out_alternate]" />
          <path d="M 9.0,17 L 8.6,20.3" />
          {/* Right Paw */}
          <path d="M 15.5,17 Q 16.5,19.2 16.0,20.5" className="origin-[15.5px_17px] animate-[earWiggleRight_1.5s_infinite_ease-in-out_alternate]" />
          <path d="M 15.0,17 L 15.4,20.3" />
        </g>
      </svg>
    </div>
  );
};

export const KeroroFrogPet: React.FC<PetComponentProps> = ({ uId, animClass, className }) => {
  return (
    <div className={cn("relative w-28 h-28 flex items-center justify-center", animClass, className)} title="KERORO軍曹">
      <svg viewBox="0 0 24 24" className="w-full h-full overflow-visible drop-shadow-[0_4px_10px_rgba(34,197,94,0.4)]">
        {/* Two Keronian Star Concentric rotating circles for Sergeant Status */}
        <circle cx="12" cy="12" r="11" fill="none" stroke="#eab308" strokeWidth="0.28" strokeDasharray="5 3" opacity="0.65" className="origin-center animate-[rotateCw_8s_linear_infinite]" />
        <circle cx="12" cy="12" r="10.2" fill="none" stroke="#22c55e" strokeWidth="0.2" strokeDasharray="2 2" opacity="0.5" className="origin-center animate-[rotateCcw_11s_linear_infinite]" />

        {/* --- BODY & LIMBS (Drawn behind the head) --- */}
        {/* Shadow / Outline layer for arms & legs first */}
        <g stroke="#166534" strokeLinecap="round" fill="none">
          {/* Left saluting arm shadow/outline */}
          <path d="M 8.8,14.5 Q 6.0,13.8 6.6,11.2" strokeWidth="1.4" />
          {/* Right arm on hip shadow/outline */}
          <path d="M 15.2,14.5 Q 17.2,15.5 15.8,17.2" strokeWidth="1.4" />
          {/* Left leg shadow/outline */}
          <path d="M 9.5,19 Q 8.8,20.5 8.5,21.5" strokeWidth="1.6" />
          <path d="M 7.3,21.5 L 9.2,21.5" strokeWidth="1.5" />
          {/* Right leg shadow/outline */}
          <path d="M 14.5,19 Q 15.2,20.5 15.5,21.5" strokeWidth="1.6" />
          <path d="M 14.8,21.5 L 16.7,21.5" strokeWidth="1.5" />
        </g>

        {/* Colored/Interior layer for arms & legs */}
        <g stroke="#22c55e" strokeLinecap="round" fill="none">
          {/* Left saluting arm interior */}
          <path d="M 8.8,14.5 Q 6.0,13.8 6.6,11.2" strokeWidth="0.8" />
          {/* Right arm on hip interior */}
          <path d="M 15.2,14.5 Q 17.2,15.5 15.8,17.2" strokeWidth="0.8" />
          {/* Left leg interior */}
          <path d="M 9.5,19 Q 8.8,20.5 8.5,21.5" strokeWidth="1.0" />
          <path d="M 7.3,21.5 L 9.2,21.5" strokeWidth="0.9" />
          {/* Right leg interior */}
          <path d="M 14.5,19 Q 15.2,20.5 15.5,21.5" strokeWidth="1.0" />
          <path d="M 14.8,21.5 L 16.7,21.5" strokeWidth="0.9" />
        </g>

        {/* Cute Chubby Green Torso */}
        <path d="M 9,13 C 7.2,16 7.2,19.5 12,19.5 C 16.8,19.5 16.8,16 15,13 Z" fill="#22c55e" stroke="#166534" strokeWidth="0.4" />

        {/* Iconic White Belly Patch */}
        <ellipse cx="12" cy="16.5" rx="2.8" ry="2.1" fill="#ffffff" stroke="#cbd5e1" strokeWidth="0.32" />

        {/* Keronian Star Emblem on Belly Patch (Yellow Star with Red Outline) */}
        <polygon points="12,15.1 12.3,15.8 13.1,15.8 12.4,16.2 12.6,17.0 12,16.6 11.4,17.0 11.6,16.2 10.9,15.8 11.7,15.8" fill="#eab308" stroke="#f43f5e" strokeWidth="0.22" />

        {/* --- HEAD & FACE --- */}
        {/* Head Base (Green Froggy Face) shifted upward from 13.2 to 10.0 */}
        <ellipse cx="12" cy="10.0" rx="4.8" ry="4.0" fill="#22c55e" stroke="#166534" strokeWidth="0.4" />
        
        {/* Keronian Sergeant Cap (Yellow/Beige/White Hood) shifted upward */}
        {/* White hood sides wrapping his head */}
        <path d="M 6.8,8.8 C 6.5,5 10,3.5 12,3.5 C 14,3.5 17.5,5 17.2,8.8 C 17.2,11.5 16,11.5 15,10.8 C 14,10 14,8.2 12,8.2 C 10,8.2 10,10 9,10.8 C 8,11.5 6.8,11.5 6.8,8.8 Z" fill="#fef08a" stroke="#854d0e" strokeWidth="0.4" />
        <path d="M 7.2,8.8 C 7.2,11.2 8.5,11 9.5,10 C 10.5,9 10.5,8.5 12,8.5 C 13.5,8.5 13.5,9 14.5,10 C 15.5,11 16.8,11.2 16.8,8.8" fill="none" stroke="#854d0e" strokeWidth="0.32" />

        {/* Sergeant Keronian Star Emblem on Cap center */}
        <polygon points="12,4.0 12.3,4.8 13.1,4.8 12.5,5.3 12.7,6.1 12,5.6 11.3,6.1 11.5,5.3 10.9,4.8 11.7,4.8" fill="#eab308" stroke="#ca8a04" strokeWidth="0.25" className="origin-[12px_5.0px] animate-pulse" />

        {/* Big expressive round froggy eyes */}
        {/* Left Eye */}
        <circle cx="8.8" cy="8.6" r="1.4" fill="#ffffff" stroke="#1e293b" strokeWidth="0.35" />
        <circle cx="8.8" cy="8.6" r="0.4" fill="#000000" />
        <circle cx="8.4" cy="8.2" r="0.2" fill="#ffffff" />

        {/* Right Eye */}
        <circle cx="15.2" cy="8.6" r="1.4" fill="#ffffff" stroke="#1e293b" strokeWidth="0.35" />
        <circle cx="15.2" cy="8.6" r="0.4" fill="#000000" />
        <circle cx="14.8" cy="8.2" r="0.2" fill="#ffffff" />

        {/* Cheek pink blush circles */}
        <circle cx="7.5" cy="10.7" r="0.4" fill="#f87171" opacity="0.65" />
        <circle cx="16.5" cy="10.7" r="0.4" fill="#f87171" opacity="0.65" />

        {/* Frog Mouth/Expression line (W-shaped cute smirk) */}
        <path d="M 11.2,11.4 Q 12,11.9 12,11.4 Q 12,11.9 12.8,11.4" fill="none" stroke="#1e293b" strokeWidth="0.38" strokeLinecap="round" />
        
        {/* Sparkling rising space particles */}
        <polygon points="4,11 4.5,10.2 5,11 4.5,11.8" fill="#eab308" className="animate-[floatParticleA_2.2s_infinite]" />
        <circle cx="19.5" cy="10" r="0.32" fill="#22c55e" className="animate-[floatParticleB_2.6s_infinite]" />
      </svg>
    </div>
  );
};
