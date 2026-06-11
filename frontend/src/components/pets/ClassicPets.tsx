import React from "react";
import { cn } from "../../lib/utils";

interface PetComponentProps {
  uId: string;
  animClass: string;
  className?: string;
}

export const GreenSlimePet: React.FC<PetComponentProps> = ({ uId, animClass, className }) => {
  const slimeGrad = `slimeGrad-${uId}`;
  const slimeBackGrad = `slimeBackGrad-${uId}`;
  const antennaGrad = `antennaGrad-${uId}`;
  return (
    <div className={cn("relative w-28 h-28 flex items-center justify-center", animClass, className)} title="綠水靈">
      {/* Ambient soft green backlight glow */}
      <div className="absolute inset-[-4px] rounded-full bg-lime-400/15 blur-md pointer-events-none animate-pulse" />
      <svg viewBox="0 0 64 64" className="w-full h-full overflow-visible drop-shadow-[0_4px_10px_rgba(132,204,22,0.35)]">
        <defs>
          {/* Backlight aura inside the SVG */}
          <radialGradient id={slimeBackGrad} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#bef264" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#bef264" stopOpacity="0" />
          </radialGradient>
          
          {/* MapleStory Lime-Green Jelly translucent gradient of Slime */}
          <linearGradient id={slimeGrad} x1="20%" y1="15%" x2="80%" y2="85%">
            <stop offset="0%" stopColor="#cef872" />     {/* Radiant light yellow-green */}
            <stop offset="35%" stopColor="#4ade80" />    {/* Cute lime-green */}
            <stop offset="85%" stopColor="#15803d" />    {/* Vibrant leaf green */}
            <stop offset="100%" stopColor="#14532d" />   {/* Deep forest shadow */}
          </linearGradient>

          {/* Hanging Ball gradient */}
          <radialGradient id={antennaGrad} cx="30%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#cef872" />     {/* Light glint */}
            <stop offset="50%" stopColor="#22c55e" />    {/* Vibrant lime */}
            <stop offset="100%" stopColor="#14532d" />   {/* Deep green */}
          </radialGradient>
        </defs>

        {/* Soft background spectral aura */}
        <circle cx="26" cy="44" r="20" fill={`url(#${slimeBackGrad})`} />

        {/* Antenna Wire (from the top center peak, looping high and hanging on the right side) */}
        <path 
          d="M 23,24 
             C 23,8 39,2 47,12 
             C 51,18 45,32 45,40 
             C 45,44 49,48 53,46" 
          fill="none" 
          stroke="#000000" 
          strokeWidth="1.6" 
          strokeLinecap="round" 
        />

        {/* Hanging Green Ball at the end of the wire */}
        <circle cx="53" cy="46" r="4" fill={`url(#${antennaGrad})`} stroke="#000000" strokeWidth="1.5" />
        <circle cx="51.8" cy="44.8" r="1.1" fill="#ffffff" opacity="0.85" />

        {/* Main Droplet Jelly Slime Body - squashed pear/teardrop shape tilted sideways */}
        <path 
          d="M 23,24
             C 30,30 48,34 48,44
             C 48,53 37,56 24,56
             C 13,56 5,52 5,44
             C 5,35 18,29 23,24 Z" 
          fill={`url(#${slimeGrad})`} 
          stroke="#000000" 
          strokeWidth="1.8" 
          strokeLinejoin="round" 
        />

        {/* Glossy translucent white jelly highlights on the right side of the body */}
        <ellipse cx="37" cy="36" rx="5.5" ry="4.5" transform="rotate(-25, 37, 36)" fill="#ffffff" opacity="0.5" />
        <circle cx="41" cy="41" r="2.0" fill="#ffffff" opacity="0.35" />
        <circle cx="43" cy="44" r="1.1" fill="#ffffff" opacity="0.25" />

        {/* Sparkling Left Eye */}
        <g>
          <circle cx="14" cy="38" r="3.6" fill="#000000" />
          <ellipse cx="14" cy="38" rx="0.7" ry="2.8" fill="#ffe266" />
          <ellipse cx="14" cy="38" rx="2.8" ry="0.7" fill="#ffe266" />
          <circle cx="14" cy="38" r="0.7" fill="#ffffff" />
        </g>

        {/* Sparkling Right Eye */}
        <g>
          <circle cx="29" cy="41" r="3.6" fill="#000000" />
          <ellipse cx="29" cy="41" rx="0.7" ry="2.8" fill="#ffe266" />
          <ellipse cx="29" cy="41" rx="2.8" ry="0.7" fill="#ffe266" />
          <circle cx="29" cy="41" r="0.7" fill="#ffffff" />
        </g>

        {/* Cute wavy cat mouth "w" */}
        <path 
          d="M 19,41.5 Q 20.5,43 22,41.5 Q 23.5,43 25,41.5" 
          fill="none" 
          stroke="#000000" 
          strokeWidth="1.6" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
        />

        {/* Ground Shadow underneath the body */}
        <ellipse cx="24" cy="56.5" rx="14" ry="1.2" fill="#14532d" opacity="0.3" />
      </svg>
    </div>
  );
};

export const BlackCatPet: React.FC<PetComponentProps> = ({ uId, animClass, className }) => {
  const catBackGrad = `catBackGrad-${uId}`;
  return (
    <div className={cn("relative w-28 h-28 flex items-center justify-center", animClass, className)} title="魔女宅急便黑貓">
      {/* Soft Purple Backlight Ambient Glow */}
      <div className="absolute inset-[-4px] rounded-full bg-purple-400/15 blur-md pointer-events-none animate-pulse" />
      <svg viewBox="0 0 64 64" className="w-full h-full overflow-visible drop-shadow-[0_4px_10px_rgba(168,85,247,0.35)]">
        <defs>
          <radialGradient id={catBackGrad} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#c084fc" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#c084fc" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Magical Aura */}
        <circle cx="32" cy="36" r="22" fill={`url(#${catBackGrad})`} opacity="0.6" />

        {/* Long Elegant Hooked Tail - Sweeping gracefully to the far right, well away from the face */}
        <path 
          d="M 38,50 C 44,50 54,54 55,42 C 56,30 58,26 55,26 C 52,26 51,31 52,35 C 53,42 45,46 38,46 Z" 
          fill="#131317" 
          stroke="#000000" 
          strokeWidth="1.8" 
          strokeLinejoin="round" 
        />

        {/* Main Sitting Body Torso */}
        <path 
          d="M 26,33 C 22,37 18,45 18,54 C 18,56.5 46,56.5 46,54 C 46,45 42,37 38,33 Z" 
          fill="#131317" 
          stroke="#000000" 
          strokeWidth="1.8" 
          strokeLinejoin="round" 
        />

        {/* Hind Leg/Thigh structures (left & right) */}
        <path d="M 18,48 C 22,48 24,51 24,54" fill="none" stroke="#000000" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M 46,48 C 42,48 40,51 40,54" fill="none" stroke="#000000" strokeWidth="1.5" strokeLinecap="round" />

        {/* Front Leg/Paw contour guides */}
        <path d="M 26,35 C 26,45 25,52 25,55" fill="none" stroke="#000000" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M 32,37 L 32,54" fill="none" stroke="#000000" strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />
        <path d="M 38,35 C 38,45 39,52 39,55" fill="none" stroke="#000000" strokeWidth="1.8" strokeLinecap="round" />

        {/* Small Toe Separators */}
        <path d="M 27,51 L 27,54 M 30,51 L 30,54 M 34,51 L 34,54 M 37,51 L 37,54" stroke="#000000" strokeWidth="1.4" strokeLinecap="round" />

        {/* Giant pointed Ears */}
        {/* Left Ear */}
        <g>
          <path 
            d="M 20,11 C 18,5 13,-2 15,-2 C 17,-2 23,3 26,11 Z" 
            fill="#131317" 
            stroke="#000000" 
            strokeWidth="1.8" 
            strokeLinejoin="round" 
          />
          <path 
            d="M 20.8,9.5 C 19.3,4.5 15.5,1 16.5,1 C 17.5,1 21.5,4.5 23.5,9.5 Z" 
            fill="#b086f7" 
            stroke="#000000" 
            strokeWidth="0.8" 
          />
        </g>
        {/* Right Ear */}
        <g>
          <path 
            d="M 44,11 C 46,5 51,-2 49,-2 C 47,-2 41,3 38,11 Z" 
            fill="#131317" 
            stroke="#000000" 
            strokeWidth="1.8" 
            strokeLinejoin="round" 
          />
          <path 
            d="M 43.2,9.5 C 44.7,4.5 48.5,1 47.5,1 C 46.5,1 42.5,4.5 40.5,9.5 Z" 
            fill="#b086f7" 
            stroke="#000000" 
            strokeWidth="0.8" 
          />
        </g>

        {/* Main Rounded Cat Head */}
        <ellipse cx="32" cy="21.5" rx="14.5" ry="12" fill="#131317" stroke="#000000" strokeWidth="1.8" />

        {/* Elegant Red Bowtie at Neck - Rendered on top of head and neck seam */}
        <g>
          {/* Left wing ribbon */}
          <path 
            d="M 29.5,33 C 21,27.5 17.5,38 29.5,34.5 Z" 
            fill="#ef4444" 
            stroke="#000000" 
            strokeWidth="1.6" 
            strokeLinejoin="round" 
          />
          {/* Right wing ribbon */}
          <path 
            d="M 34.5,33 C 43,27.5 46.5,38 34.5,34.5 Z" 
            fill="#ef4444" 
            stroke="#000000" 
            strokeWidth="1.6" 
            strokeLinejoin="round" 
          />
          {/* Bow center knot with dynamic 3D highlight */}
          <rect x="29" y="31.2" width="6" height="5" rx="1.6" fill="#f87171" stroke="#000000" strokeWidth="1.6" />
        </g>

        {/* Big, Alert White Eyes with Black Pupils */}
        {/* Left Eye */}
        <g>
          <ellipse cx="23" cy="19.5" rx="5" ry="6.5" fill="#ffffff" stroke="#000000" strokeWidth="1.6" />
          <ellipse cx="23" cy="19.5" rx="2.5" ry="5.5" fill="#000000" />
          <circle cx="23" cy="16.5" r="0.8" fill="#ffffff" />
        </g>
        {/* Right Eye */}
        <g>
          <ellipse cx="41" cy="19.5" rx="5" ry="6.5" fill="#ffffff" stroke="#000000" strokeWidth="1.6" />
          <ellipse cx="41" cy="19.5" rx="2.5" ry="5.5" fill="#000000" />
          <circle cx="41" cy="16.5" r="0.8" fill="#ffffff" />
        </g>

        {/* Small Cute Nose */}
        <polygon points="32,21.5 30.5,20.2 33.5,20.2" fill="#000000" />

        {/* Wide energetic open mouth */}
        <path 
          d="M 23.5,23 C 23.5,31.5 40.5,31.5 40.5,23 Z" 
          fill="#b91c1c" 
          stroke="#000000" 
          strokeWidth="1.8" 
          strokeLinejoin="round" 
        />
        {/* Cute Pink Tongue */}
        <path 
          d="M 26,27.5 C 29,30.5 35,30.5 38,27.5 C 34,31.5 30,31.5 26,27.5 Z" 
          fill="#fda4af" 
        />
        {/* Little fangs */}
        <polygon points="26,23.4 27.2,25.6 28.5,23.6" fill="#ffffff" />
        <polygon points="38,23.4 36.8,25.6 35.5,23.6" fill="#ffffff" />

        {/* Dynamic Whiskers */}
        {/* Left whiskers */}
        <line x1="17" y1="21" x2="8" y2="19" stroke="#000000" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="16" y1="23.5" x2="6" y2="23.5" stroke="#000000" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="17" y1="26" x2="8" y2="28" stroke="#000000" strokeWidth="1.5" strokeLinecap="round" />
        {/* Right whiskers */}
        <line x1="47" y1="21" x2="56" y2="19" stroke="#000000" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="48" y1="23.5" x2="58" y2="23.5" stroke="#000000" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="47" y1="26" x2="56" y2="28" stroke="#000000" strokeWidth="1.5" strokeLinecap="round" />

        {/* Shadow anchor underneath */}
        <ellipse cx="32" cy="55.5" rx="14" ry="1.5" fill="#000" opacity="0.25" />
      </svg>
    </div>
  );
};



export const PikachuPet: React.FC<PetComponentProps> = ({ uId, animClass, className }) => {
  const pikaBackGrad = `pikaBackGrad-${uId}`;
  return (
    <div className={cn("relative w-28 h-28 flex items-center justify-center", className)} title="電光小鼠">
      {/* Electrical Outer Spark Glow */}
      <div className="absolute inset-[-6px] rounded-full bg-yellow-400/15 blur-md pointer-events-none" />
      <svg viewBox="0 0 500 500" className="w-full h-full overflow-visible drop-shadow-[0_4px_12px_rgba(234,179,8,0.45)]">
        <defs>
          <radialGradient id={pikaBackGrad} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fef08a" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#fef08a" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Backdrop Aura */}
        <circle cx="250" cy="270" r="210" fill={`url(#${pikaBackGrad})`} className="origin-center" />

        {/* ========================================== */}
        {/* === FILLS LAYER (Bottom elements) === */}
        {/* ========================================== */}

        {/* EARS FILLS */}
        {/* Left Ear Yellow base */}
        <path d="M 115 185 C 95 130, 80 80, 105 30 C 130 55, 155 90, 185 145 Z" fill="#ffcc01" />

        {/* Right Ear Yellow Base + Warm Orange Shadow */}
        <path d="M 315 145 C 345 90, 370 55, 395 30 C 420 80, 405 130, 385 185 Z" fill="#ffcc01" />
        {/* Right Ear Inner Orange Shadow */}
        <path d="M 315 145 C 345 90, 370 55, 395 30 C 390 45, 370 95, 355 145 Z" fill="#f39221" />

        {/* Black Ear Tips */}
        {/* Left Ear Tip */}
        <path d="M 111 80 C 103 60, 95 45, 105 30 C 117 40, 128 55, 137 75 Z" fill="#1a1a1a" />
        {/* Right Ear Tip */}
        <path d="M 363 75 C 372 55, 383 40, 395 30 C 405 45, 397 60, 389 80 Z" fill="#1a1a1a" />

        {/* MAIN BODY FILLS */}
        {/* Head Yellow Fill */}
        <path d="M 85 290 A 165 165 0 0 1 415 290 Z" fill="#ffcc01" />

        {/* Head Shadow Area (Orange, on right side) */}
        <path d="M 332 144 A 165 165 0 0 1 415 290 L 398 290 A 148 148 0 0 0 322 155 Z" fill="#f39221" />

        {/* Pokéball Red Bottom Fill */}
        <path d="M 85 290 A 165 165 0 0 0 415 290 Z" fill="#e83a15" />

        {/* ========================================== */}
        {/* === OUTLINES & HAND-DRAWN DETAILS === */}
        {/* ========================================== */}

        {/* Left Ear Hand-Drawn Outline */}
        <g className="origin-[150px_165px]">
          <path d="M 120 201 C 97 145, 83 80, 105 30" fill="none" stroke="#1a1a1a" strokeWidth="11" strokeLinecap="round" />
          <path d="M 105 30 C 130 55, 155 90, 185 145" fill="none" stroke="#1a1a1a" strokeWidth="11" strokeLinecap="round" />
        </g>

        {/* Right Ear Hand-Drawn Outline */}
        <g className="origin-[350px_165px]">
          <path d="M 315 145 C 345 90, 370 55, 395 30" fill="none" stroke="#1a1a1a" strokeWidth="11" strokeLinecap="round" />
          <path d="M 395 30 C 420 80, 405 130, 385 185" fill="none" stroke="#1a1a1a" strokeWidth="11" strokeLinecap="round" />
        </g>

        {/* Left Cheek & Head Left Outline */}
        <path d="M 100 250 C 90 215, 115 185, 115 185" fill="none" stroke="#1a1a1a" strokeWidth="11" strokeLinecap="round" />

        {/* Top head outline between ears */}
        <path d="M 193 135 A 165 165 0 0 1 240 126" fill="none" stroke="#1a1a1a" strokeWidth="11" strokeLinecap="round" />
        <path d="M 260 126 A 165 165 0 0 1 306 135" fill="none" stroke="#1a1a1a" strokeWidth="11" strokeLinecap="round" />

        {/* Right Cheek Outline */}
        <path d="M 385 185 C 405 210, 415 250, 413 270" fill="none" stroke="#1a1a1a" strokeWidth="11" strokeLinecap="round" />

        {/* Pokéball Red Bottom Outline (with gap on the right) */}
        <path d="M 85 290 A 165 165 0 0 0 405 320" fill="none" stroke="#1a1a1a" strokeWidth="11" strokeLinecap="round" />

        {/* White bottom-left crescent highlight loop */}
        <path d="M 120 365 A 140 140 0 0 0 250 435" fill="none" stroke="#ffffff" strokeWidth="11" strokeLinecap="round" opacity="0.85" />

        {/* ========================================== */}
        {/* === FACE & BUTTON DETAILS === */}
        {/* ========================================== */}

        {/* Forehead Gloss Highlight */}
        <path d="M 155 180 A 120 120 0 0 1 210 145" fill="none" stroke="#ffffff" strokeWidth="10" strokeLinecap="round" opacity="0.85" />

        {/* Eyes */}
        <circle cx="190" cy="230" r="14" fill="#1a1a1a" />
        <circle cx="310" cy="230" r="14" fill="#1a1a1a" />

        {/* Cat Lip Mouth */}
        <path d="M 234 242 Q 242 254 250 244 Q 258 254 266 242" fill="none" stroke="#1a1a1a" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />

        {/* Pokéball Separator Black Lines */}
        {/* Left Separator (with gaps) */}
        <path d="M 85 290 L 150 290" fill="none" stroke="#1a1a1a" strokeWidth="11" strokeLinecap="round" />
        <path d="M 175 290 L 212 290" fill="none" stroke="#1a1a1a" strokeWidth="11" strokeLinecap="round" />

        {/* Right Separator */}
        <path d="M 288 290 L 398 290" fill="none" stroke="#1a1a1a" strokeWidth="11" strokeLinecap="round" />

        {/* Pokéball Opening Button */}
        {/* Outer White Button */}
        <circle cx="250" cy="290" r="38" fill="#ffffff" stroke="#1a1a1a" strokeWidth="11" />
        {/* Inner Silver/Grey Button */}
        <circle cx="250" cy="290" r="20" fill="#bfbfbf" stroke="#1a1a1a" strokeWidth="10" />
        {/* White Shine / Inner core */}
        <circle cx="250" cy="290" r="9" fill="#ffffff" />
      </svg>
    </div>
  );
};

export const MushroomPet: React.FC<PetComponentProps> = ({ uId, animClass, className }) => {
  const mushCapGrad = `mushCapGrad-${uId}`;
  const mushStemGrad = `mushStemGrad-${uId}`;
  const mapleLeafGrad = `mapleLeafGrad-${uId}`;
  return (
    <div className={cn("relative w-28 h-28 flex items-center justify-center", className)} title="楓葉蘑菇">
      {/* Ambient Leaf Sparkle Glow */}
      <div className="absolute inset-[-4px] rounded-full bg-orange-500/10 blur-md pointer-events-none" />
      
      <svg viewBox="0 0 24 24" className="w-full h-full overflow-visible drop-shadow-[0_4px_7px_rgba(239,68,68,0.45)]">
        <defs>
          <linearGradient id={mushCapGrad} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f97316" />
            <stop offset="45%" stopColor="#ef4444" />
            <stop offset="100%" stopColor="#b91c1c" />
          </linearGradient>
          <linearGradient id={mushStemGrad} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="65%" stopColor="#fef3c7" />
            <stop offset="100%" stopColor="#fde047" stopOpacity="0.8" />
          </linearGradient>
          <linearGradient id={mapleLeafGrad} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f87171" />
            <stop offset="100%" stopColor="#dc2626" />
          </linearGradient>
        </defs>
 
        {/* Frozen Leaf Particles */}
        <g>
          <path d="M3,8 Q4,5 5,7" stroke="#ea580c" strokeWidth="0.3" fill="none" />
          <path d="M21,9 Q20,6 19,8" stroke="#f97316" strokeWidth="0.3" fill="none" />
          <path d="M4,17 Q5,15 6,16" stroke="#fb7185" strokeWidth="0.25" fill="none" />
        </g>
 
        {/* Cute little Maple Leaf on top of the Cap */}
        <g className="origin-[12px_4px]">
          {/* Stem */}
          <line x1="12" y1="4.8" x2="12" y2="2" stroke="#ea580c" strokeWidth="0.5" strokeLinecap="round" />
          {/* Maple Leaf shape */}
          <path d="M12,2 L10.8,2.7 L11.2,1.8 L9.8,1.2 L11.3,0.9 L12,-0.2 L12.7,0.9 L14.2,1.2 L12.8,1.8 L13.2,2.7 Z" fill={`url(#${mapleLeafGrad})`} stroke="#991b1b" strokeWidth="0.2" />
        </g>

        {/* The Stem / Body */}
        <ellipse cx="12" cy="15.8" rx="5.2" ry="3.8" fill={`url(#${mushStemGrad})`} stroke="#7c2d12" strokeWidth="0.32" />

        {/* Main Red Cap of the Mushroom */}
        <path d="M4.5,13.2 C4.5,7.2 19.5,7.2 19.5,13.2 C19.5,14 17.5,14.5 12,14.5 C6.5,14.5 4.5,14 4.5,13.2 Z" fill={`url(#${mushCapGrad})`} stroke="#7c2d12" strokeWidth="0.35" />

        {/* Highlight / Shading curve on the Cap */}
        <path d="M6,11.5 C7.5,8.2 16.5,8.2 18,11.5" stroke="#ffedd5" strokeWidth="0.55" strokeLinecap="round" fill="none" opacity="0.4" />

        {/* White/Yellow spots on the cap */}
        <circle cx="8" cy="9.2" r="1.1" fill="#fff" opacity="0.65" />
        <ellipse cx="15.5" cy="9.5" rx="1.3" ry="0.9" fill="#fff" opacity="0.6" />
        <circle cx="12" cy="7.8" r="0.7" fill="#fff" opacity="0.5" />
        <circle cx="11.5" cy="11.2" r="0.9" fill="#fff" opacity="0.65" />
        <circle cx="17.2" cy="11.5" r="0.6" fill="#fff" opacity="0.5" />

        {/* Mushroom Face */}
        <g>
          {/* Large vertical black cartoon eyes */}
          <ellipse cx="9.8" cy="15" rx="0.55" ry="1.0" fill="#1e293b" />
          <circle cx="9.6" cy="14.6" r="0.22" fill="#fff" />

          <ellipse cx="14.2" cy="15" rx="0.55" ry="1.0" fill="#1e293b" />
          <circle cx="14.0" cy="14.6" r="0.22" fill="#fff" />
        </g>

        {/* Charming pink blush cheeks */}
        <circle cx="8" cy="15.6" r="0.8" fill="#fda4af" opacity="0.8" />
        <circle cx="16" cy="15.6" r="0.8" fill="#fda4af" opacity="0.8" />

        {/* Simple cute smile */}
        <path d="M11.4,15.8 Q12,16.4 12.6,15.8" stroke="#7c2d12" strokeWidth="0.45" strokeLinecap="round" fill="none" />
      </svg>
    </div>
  );
};

export const IceGirlPet: React.FC<PetComponentProps> = ({ animClass, className }) => {
  return (
    <div className={cn("relative w-28 h-28 flex items-center justify-center", animClass, className)} title="冰之女">
      <svg viewBox="0 0 24 24" className="w-full h-full">
        <circle cx="12" cy="8" r="4" fill="#bae6fd" />
        <path d="M8,12 L12,18 L16,12" fill="#0284c7" />
      </svg>
    </div>
  );
};

export const FireBoyPet: React.FC<PetComponentProps> = ({ animClass, className }) => {
  return (
    <div className={cn("relative w-28 h-28 flex items-center justify-center", animClass, className)} title="火之子">
      <svg viewBox="0 0 24 24" className="w-full h-full">
        <path d="M12,4 Q16,8 14,14 Q12,18 10,14 Q8,8 12,4" fill="#f97316" />
      </svg>
    </div>
  );
};

export const RabbitWarriorPet: React.FC<PetComponentProps> = ({ uId, className }) => {
  const rabbitBodyGrad = `rabbitBodyGrad-${uId}`;
  const rabbitBackGrad = `rabbitBackGrad-${uId}`;
  const earPinkGrad = `earPinkGrad-${uId}`;

  return (
    <div className={cn("relative w-28 h-28 flex items-center justify-center", className)} title="打鬼兔">
      {/* Light warmth background glow backing */}
      <div className="absolute inset-[-4px] rounded-full bg-amber-500/5 blur-md pointer-events-none" />
      
      <svg viewBox="0 0 500 500" className="w-full h-full overflow-visible drop-shadow-[0_4px_12px_rgba(139,92,26,0.22)]">
        <defs>
          {/* Backdrop glow */}
          <radialGradient id={rabbitBackGrad} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#feebd2" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#feebd2" stopOpacity="0" />
          </radialGradient>
          
          {/* Linear gradient matching the white-to-tan transition precisely */}
          <linearGradient id={rabbitBodyGrad} x1="25%" y1="65%" x2="70%" y2="25%">
            <stop offset="42%" stopColor="#ffffff" />
            <stop offset="65%" stopColor="#eed4af" />
          </linearGradient>

          {/* Floppy inner pink ear */}
          <linearGradient id={earPinkGrad} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f8a7a8" />
            <stop offset="100%" stopColor="#e36d70" />
          </linearGradient>
        </defs>

        {/* Backdrop Ambient Spot */}
        <circle cx="250" cy="250" r="210" fill={`url(#${rabbitBackGrad})`} />

        {/* ======================================================= */}
        {/* === LAYER 1: SOLID SHADOW POOL (GROUNDS THE RABBIT) === */}
        {/* ======================================================= */}
        <ellipse cx="250" cy="390" r="1" rx="195" ry="40" fill="#151210" />

        {/* ======================================================= */}
        {/* === LAYER 2: BACK-MOST ELEVATED EAR (LEFT EAR) === */}
        {/* ======================================================= */}
        {/* Ear body */}
        <path 
          d="M 180 140 C 160 90, 142 55, 158 48 C 175 55, 188 100, 202 140 Z" 
          fill="#ffffff" 
          stroke="#1d1814" 
          strokeWidth="11" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
        />
        {/* Dark cap tip */}
        <path 
          d="M 158 48 C 163 56, 172 65, 178 57 L 173 51 Z" 
          fill="#543a2d" 
          stroke="#1d1814" 
          strokeWidth="11" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
        />

        {/* ======================================================= */}
        {/* === LAYER 3: MULTIPLE SPIDER-LIKE LEGS & PAWS === */}
        {/* ======================================================= */}
        
        {/* Far-Left Rested Hand/Claw */}
        <g>
          <path d="M 160 280 Q 115 285, 110 320" fill="none" stroke="#1d1814" strokeWidth="23" strokeLinecap="round" />
          <circle cx="100" cy="320" r="14" fill="#1d1814" />
          <circle cx="112" cy="324" r="15" fill="#1d1814" />
          <circle cx="124" cy="320" r="14" fill="#1d1814" />
          
          <path d="M 160 280 Q 115 285, 110 320" fill="none" stroke="#ffffff" strokeWidth="11" strokeLinecap="round" />
          <circle cx="100" cy="320" r="8" fill="#ffffff" />
          <circle cx="112" cy="324" r="9" fill="#ffffff" />
          <circle cx="124" cy="320" r="8" fill="#ffffff" />
        </g>

        {/* Standing Leg A (Front-most vertical pillar) */}
        <g>
          <path d="M 195 290 Q 192 340, 192 380" fill="none" stroke="#1d1814" strokeWidth="23" strokeLinecap="round" />
          <circle cx="178" cy="380" r="14" fill="#1d1814" />
          <circle cx="192" cy="385" r="15" fill="#1d1814" />
          <circle cx="206" cy="380" r="14" fill="#1d1814" />
          
          <path d="M 195 290 Q 192 340, 192 380" fill="none" stroke="#ffffff" strokeWidth="11" strokeLinecap="round" />
          <circle cx="178" cy="380" r="8" fill="#ffffff" />
          <circle cx="192" cy="385" r="9" fill="#ffffff" />
          <circle cx="206" cy="380" r="8" fill="#ffffff" />
        </g>

        {/* Standing Leg B */}
        <g>
          <path d="M 250 295 Q 248 340, 248 382" fill="none" stroke="#1d1814" strokeWidth="23" strokeLinecap="round" />
          <circle cx="234" cy="382" r="14" fill="#1d1814" />
          <circle cx="248" cy="387" r="15" fill="#1d1814" />
          <circle cx="262" cy="382" r="14" fill="#1d1814" />
          
          <path d="M 250 295 Q 248 340, 248 382" fill="none" stroke="#ffffff" strokeWidth="11" strokeLinecap="round" />
          <circle cx="234" cy="382" r="8" fill="#ffffff" />
          <circle cx="248" cy="387" r="9" fill="#ffffff" />
          <circle cx="262" cy="382" r="8" fill="#ffffff" />
        </g>

        {/* Standing Leg C */}
        <g>
          <path d="M 305 295 Q 303 340, 303 382" fill="none" stroke="#1d1814" strokeWidth="23" strokeLinecap="round" />
          <circle cx="289" cy="382" r="14" fill="#1d1814" />
          <circle cx="303" cy="387" r="15" fill="#1d1814" />
          <circle cx="317" cy="382" r="14" fill="#1d1814" />
          
          <path d="M 305 295 Q 303 340, 303 382" fill="none" stroke="#ffffff" strokeWidth="11" strokeLinecap="round" />
          <circle cx="289" cy="382" r="8" fill="#ffffff" />
          <circle cx="303" cy="387" r="9" fill="#ffffff" />
          <circle cx="317" cy="382" r="8" fill="#ffffff" />
        </g>

        {/* Standing Leg D */}
        <g>
          <path d="M 360 290 Q 358 340, 358 380" fill="none" stroke="#1d1814" strokeWidth="23" strokeLinecap="round" />
          <circle cx="344" cy="380" r="14" fill="#1d1814" />
          <circle cx="358" cy="385" r="15" fill="#1d1814" />
          <circle cx="372" cy="380" r="14" fill="#1d1814" />
          
          <path d="M 360 290 Q 358 340, 358 380" fill="none" stroke="#ffffff" strokeWidth="11" strokeLinecap="round" />
          <circle cx="344" cy="380" r="8" fill="#ffffff" />
          <circle cx="358" cy="385" r="9" fill="#ffffff" />
          <circle cx="372" cy="380" r="8" fill="#ffffff" />
        </g>

        {/* Leg E (Far-Right slightly raised standing leg) */}
        <g>
          <path d="M 400 280 Q 412 330, 422 370" fill="none" stroke="#1d1814" strokeWidth="23" strokeLinecap="round" />
          <circle cx="408" cy="370" r="14" fill="#1d1814" />
          <circle cx="422" cy="375" r="15" fill="#1d1814" />
          <circle cx="436" cy="370" r="14" fill="#1d1814" />
          
          <path d="M 400 280 Q 412 330, 422 370" fill="none" stroke="#ffffff" strokeWidth="11" strokeLinecap="round" />
          <circle cx="408" cy="370" r="8" fill="#ffffff" />
          <circle cx="422" cy="375" r="9" fill="#ffffff" />
          <circle cx="436" cy="370" r="8" fill="#ffffff" />
        </g>

        {/* ======================================================= */}
        {/* === LAYER 4: MAIN CHUNK BODY === */}
        {/* ======================================================= */}
        <path 
          d="M 190 150 C 135 150, 115 210, 140 238 C 155 255, 165 270, 210 280 C 285 295, 345 305, 385 285 C 400 270, 410 275, 425 252 C 415 240, 395 245, 390 238 C 385 168, 320 138, 255 138 C 215 138, 200 142, 190 150 Z" 
          fill={`url(#${rabbitBodyGrad})`} 
          stroke="#1d1814" 
          strokeWidth="11" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
        />

        {/* ======================================================= */}
        {/* === LAYER 5: FRONT EAR (DROOPY RIGHT FLOOPY EAR) === */}
        {/* ======================================================= */}
        <g>
          {/* Floppy Outer */}
          <path 
            d="M 225 150 C 255 105, 310 75, 350 82 C 345 92, 305 135, 255 170 Z" 
            fill="#ffffff" 
            stroke="#1d1814" 
            strokeWidth="11" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
          />
          {/* Pink fill */}
          <path 
            d="M 235 145 C 265 110, 312 85, 338 90 C 335 98, 302 135, 255 160 Z" 
            fill={`url(#${earPinkGrad})`} 
            stroke="#1d1814" 
            strokeWidth="9" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
          />
        </g>

        {/* ======================================================= */}
        {/* === LAYER 6: EYES, NOSE, SMILE, WHISKERS === */}
        {/* ======================================================= */}
        
        {/* One giant goofy comic eye */}
        <g>
          <ellipse cx="180" cy="200" rx="26" ry="32" fill="#ffffff" stroke="#1d1814" strokeWidth="11" />
          <circle cx="172" cy="198" r="6" fill="#1d1814" />
          <circle cx="170" cy="194" r="2" fill="#ffffff" />
        </g>

        {/* Cute small nose */}
        <circle cx="126" cy="226" r="6.5" fill="#1d1814" />

        {/* Sweet half-smile */}
        <path 
          d="M 148 246 Q 155 252, 162 242" 
          fill="none" 
          stroke="#1d1814" 
          strokeWidth="10" 
          strokeLinecap="round" 
        />

        {/* 3 whiskers */}
        <line x1="120" y1="230" x2="95" y2="232" stroke="#1d1814" strokeWidth="7" strokeLinecap="round" />
        <line x1="117" y1="240" x2="90" y2="246" stroke="#1d1814" strokeWidth="7" strokeLinecap="round" />
        <line x1="120" y1="250" x2="95" y2="260" stroke="#1d1814" strokeWidth="7" strokeLinecap="round" />
      </svg>
    </div>
  );
};
