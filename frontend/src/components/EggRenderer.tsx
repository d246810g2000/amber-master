import React from "react";
import { cn } from "../lib/utils";

interface EggRendererProps {
  eggType: string; // egg_epic, egg_legendary, egg_ultimate
  progressPercent: number; // 0 to 100
  className?: string;
}

export const EggRenderer: React.FC<EggRendererProps> = ({ eggType, progressPercent, className }) => {
  const isHatchedReady = progressPercent >= 100;
  
  // Choose egg image path
  const eggImgSrc = `/amber-master/assets/eggs/${eggType}.png`;

  return (
    <div 
      className={cn(
        "relative w-36 h-48 select-none flex items-center justify-center transition-all duration-300",
        isHatchedReady && "animate-[bounce_2s_infinite] drop-shadow-[0_0_15px_rgba(253,224,71,0.85)]",
        !isHatchedReady && progressPercent > 0 && "hover:scale-105",
        className
      )}
    >
      {/* Egg Base Image */}
      <img 
        src={eggImgSrc} 
        alt={eggType} 
        className={cn(
          "w-full h-full object-contain pointer-events-none select-none transition-all duration-500",
          isHatchedReady && "animate-[wiggle_0.5s_infinite_ease-in-out]"
        )} 
      />

      {/* SVG Crack Overlay */}
      <svg 
        viewBox="0 0 100 100" 
        className="absolute inset-0 w-full h-full pointer-events-none select-none"
      >
        <defs>
          <filter id="glow-epic" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Crack 1 (Left hair crack): shown at 25% or more */}
        {progressPercent >= 25 && (
          <path 
            d="M 38,32 L 44,40 L 37,47 L 41,56" 
            fill="none" 
            stroke={isHatchedReady ? "#c084fc" : "#334155"} 
            strokeWidth={isHatchedReady ? "2.5" : "1.8"} 
            strokeLinecap="round" 
            strokeLinejoin="round"
            className={cn(
              "transition-all duration-500",
              isHatchedReady && "stroke-purple-300 shadow-glow"
            )}
            filter={isHatchedReady ? "url(#glow-epic)" : undefined}
          />
        )}

        {/* Crack 2 (Right branch crack): shown at 50% or more */}
        {progressPercent >= 50 && (
          <path 
            d="M 64,42 L 57,51 L 62,60 L 55,68" 
            fill="none" 
            stroke={isHatchedReady ? "#fbbf24" : "#334155"} 
            strokeWidth={isHatchedReady ? "2.5" : "1.8"} 
            strokeLinecap="round" 
            strokeLinejoin="round"
            className="transition-all duration-500"
            filter={isHatchedReady ? "url(#glow-epic)" : undefined}
          />
        )}

        {/* Crack 3 (Middle major crack): shown at 75% or more */}
        {progressPercent >= 75 && (
          <path 
            d="M 48,22 L 51,35 L 46,48 L 54,61 L 49,75" 
            fill="none" 
            stroke={isHatchedReady ? "#22d3ee" : "#1e293b"} 
            strokeWidth={isHatchedReady ? "3" : "2"} 
            strokeLinecap="round" 
            strokeLinejoin="round"
            className="transition-all duration-500"
            filter={isHatchedReady ? "url(#glow-epic)" : undefined}
          />
        )}

        {/* 100% glowing crack light leaks */}
        {isHatchedReady && (
          <>
            <path 
              d="M 48,22 L 51,35 L 46,48 L 54,61 L 49,75" 
              fill="none" 
              stroke="#ffffff" 
              strokeWidth="1.2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              className="animate-pulse"
            />
            <path 
              d="M 38,32 L 44,40 L 37,47 L 41,56" 
              fill="none" 
              stroke="#ffffff" 
              strokeWidth="1" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              className="animate-pulse"
            />
          </>
        )}
      </svg>

      {/* Progress Badge overlay when not 100% */}
      {progressPercent > 0 && !isHatchedReady && (
        <div className="absolute bottom-4 bg-slate-900/80 backdrop-blur-[2px] text-white text-[9px] font-black px-2 py-0.5 rounded-full border border-white/10 tracking-widest pointer-events-none">
          {Math.round(progressPercent)}%
        </div>
      )}
    </div>
  );
};
