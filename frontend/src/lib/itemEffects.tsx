import React from "react";
import { Feather, Sparkles, Star } from "lucide-react";

/**
 * Returns simple border class string for tiny avatars (e.g. MatchHistory, WinnerModal, etc.)
 */
export function getFrameBorderClass(frameName: string | undefined): string {
  if (!frameName) return "border-slate-200 dark:border-slate-800";

  switch (frameName) {
    case "倔強鐵牌木框":
      return "border-slate-400 dark:border-slate-600";
    case "不屈青銅邊框":
      return "border-amber-700 dark:border-amber-800";
    case "傲氣白銀邊框":
      return "border-slate-300 dark:border-slate-500";
    case "榮耀黃金邊框":
      return "border-yellow-450 dark:border-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.5)]";
    case "華麗白金邊框":
      return "border-teal-350 dark:border-teal-500 shadow-[0_0_8px_rgba(20,184,166,0.5)]";
    case "璀璨翡翠邊框":
      return "border-emerald-450 dark:border-emerald-550 shadow-[0_0_8px_rgba(16,185,129,0.5)]";
    case "璀璨鑽石邊框":
      return "border-sky-300 shadow-[0_0_12px_rgba(56,189,248,0.6)]";
    case "大師紫羅蘭框":
      return "border-purple-500 shadow-[0_0_12px_rgba(168,85,247,0.6)]";
    case "宗師傲紅邊框":
      return "border-rose-600 shadow-[0_0_12px_rgba(225,29,72,0.6)]";
    case "頂尖菁英流光框":
      return "border-transparent shadow-[0_0_15px_rgba(251,191,36,0.6)] ring-1 ring-amber-400/50";
    case "萬象星空邊框":
      return "border-transparent shadow-[0_0_15px_rgba(168,85,247,0.6)] ring-1 ring-fuchsia-400/50";
    case "聖白羽翼邊框":
      return "border-white/80 shadow-[0_0_12px_rgba(255,255,255,0.7)] ring-1 ring-white/20";
    default:
      return "border-slate-200 dark:border-slate-800";
  }
}

/**
 * Checks if the frame is a dynamic conic flow frame
 */
export function isFlowingFrame(frameName: string | undefined): boolean {
  return ["頂尖菁英流光框", "萬象星空邊框"].includes(frameName || "");
}

/**
 * Returns the conic gradient style for flowing frames
 */
export function getFlowingGradient(frameName: string | undefined): string {
  if (frameName === "頂尖菁英流光框") {
    return "conic-gradient(from 0deg, #fbbf24, #d946ef, #8b5cf6, #fbbf24)";
  }
  if (frameName === "萬象星空邊框") {
    return "conic-gradient(from 0deg, #ff0055, #9900ff, #0099ff, #00ffaa, #ffbb00, #ff0055)";
  }
  return "";
}

/**
 * Renders the beautiful frame overlay absolute element (Z-30)
 */
export function renderFrameOverlay(frameName: string | undefined, cardType: "pill" | "court" = "pill"): React.ReactNode {
  if (!frameName) return null;

  const isFlowing = isFlowingFrame(frameName);
  const outerRadius = cardType === "pill" ? "rounded-2xl" : "rounded-xl";
  const innerRadius = cardType === "pill" ? "rounded-[14px]" : "rounded-[8px]";

  // If flowing, the outer border is transparent, inside has a mask
  if (isFlowing) {
    return (
      <div className={`absolute inset-0 z-[30] pointer-events-none ${outerRadius} border-2 border-transparent`} />
    );
  }

  // Base configurations for standard static / premium frames
  let borderClass = "";
  let extraElements: React.ReactNode = null;

  switch (frameName) {
    case "倔強鐵牌木框":
      borderClass = "border-slate-400 dark:border-slate-600";
      break;

    case "不屈青銅邊框":
      borderClass = "border-amber-700 dark:border-amber-800";
      break;

    case "傲氣白銀邊框":
      borderClass = "border-slate-300 dark:border-slate-500";
      break;

    case "榮耀黃金邊框":
      borderClass = "border-yellow-400 dark:border-yellow-500 shadow-[0_0_12px_rgba(234,179,8,0.65),_inset_0_0_3px_rgba(234,179,8,0.2)]";
      break;

    case "華麗白金邊框":
      borderClass = "border-teal-300 dark:border-teal-500 shadow-[0_0_12px_rgba(20,184,166,0.65),_inset_0_0_3px_rgba(20,184,166,0.2)]";
      break;

    case "璀璨翡翠邊框":
      borderClass = "border-emerald-450 dark:border-emerald-550 shadow-[0_0_12px_rgba(16,185,129,0.65),_inset_0_0_3px_rgba(16,185,129,0.2)]";
      break;

    case "璀璨鑽石邊框":
      borderClass = "border-sky-300 shadow-[0_0_22px_rgba(56,189,248,0.9),_inset_0_0_8px_rgba(255,255,255,0.5)]";
      extraElements = (
        <div className="absolute inset-0">
          <Sparkles size={11} className="absolute -top-1.5 -left-1.5 text-sky-200 animate-rotate-star" />
          <Sparkles size={9} className="absolute -bottom-1.5 -right-1.5 text-cyan-200 animate-rotate-star [animation-delay:1s]" />
          <div className="absolute top-1/2 -right-1.5 text-sky-300 text-[6px] animate-bounce">✦</div>
        </div>
      );
      break;

    case "大師紫羅蘭框":
      borderClass = "border-purple-500 shadow-[0_0_22px_rgba(168,85,247,0.9),_inset_0_0_8px_rgba(168,85,247,0.3)]";
      extraElements = (
        <div className="absolute inset-0">
          <div className="absolute -top-1 right-2 w-1.5 h-1.5 bg-purple-400 rounded-full blur-[0.5px] animate-pulse" />
          <div className="absolute -bottom-1 left-2 w-1.5 h-1.5 bg-fuchsia-400 rounded-full blur-[0.5px] animate-pulse [animation-delay:0.8s]" />
        </div>
      );
      break;

    case "宗師傲紅邊框":
      borderClass = "border-rose-600 shadow-[0_0_24px_rgba(225,29,72,0.95)]";
      extraElements = (
        <div className="absolute inset-x-0 bottom-0 h-1/3 overflow-hidden pointer-events-none">
          <div className="absolute bottom-0 left-[15%] w-1.5 h-3 bg-red-500 rounded-full blur-[0.5px] animate-flame-rise" style={{ animationDuration: '2.5s' }} />
          <div className="absolute bottom-0 left-[50%] w-2 h-4 bg-orange-500 rounded-full blur-[0.5px] animate-flame-rise" style={{ animationDuration: '3.5s', animationDelay: '0.5s' }} />
          <div className="absolute bottom-0 right-[20%] w-1 h-3 bg-rose-500 rounded-full blur-[0.5px] animate-flame-rise" style={{ animationDuration: '3s', animationDelay: '1.2s' }} />
        </div>
      );
      break;

    case "聖白羽翼邊框":
      borderClass = "border-white/95 shadow-[0_0_25px_rgba(255,255,255,0.95),_inset_0_0_8px_rgba(255,255,255,0.5)] ring-1 ring-white/30";
      extraElements = (
        <>
          {/* Feather icon on top right */}
          <Feather size={12} className="absolute -top-1.5 -right-1.5 text-white rotate-45 drop-shadow-[0_0_6px_rgba(255,255,255,1)] z-[70] animate-bounce-slow" />
          
          {/* Left Wing */}
          <svg className="absolute top-1/3 -left-4 w-4 h-6 text-white/90 drop-shadow-[0_0_6px_rgba(255,255,255,0.8)] fill-current animate-wing-flap" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12c0 3.31 1.69 6.21 4.28 8h.72c2.72-2.12 5-6.08 5-10V2z" />
          </svg>
          
          {/* Right Wing */}
          <svg className="absolute top-1/3 -right-4 w-4 h-6 text-white/90 drop-shadow-[0_0_6px_rgba(255,255,255,0.8)] fill-current animate-wing-flap [animation-delay:1.5s]" viewBox="0 0 24 24">
            <path d="M12 2c5.52 0 10 4.48 10 10 0 3.31-1.69 6.21-4.28 8h-.72c-2.72-2.12-5-6.08-5-10V2z" />
          </svg>
          
          {/* Top Halo */}
          <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 w-8 h-1 bg-yellow-100 rounded-full blur-[0.5px] border border-yellow-200/80 shadow-[0_0_8px_rgba(253,224,71,0.8)] opacity-85" />
        </>
      );
      break;

    default:
      borderClass = "border-transparent";
  }

  return (
    <div className={`absolute inset-0 z-[30] pointer-events-none ${outerRadius} border-2 ${borderClass}`}>
      {extraElements}
    </div>
  );
}

/**
 * Renders the full background visual component layer (Z-10)
 */
export function renderBackgroundEffects(backgroundName: string | undefined, activeFrameName?: string | undefined, cardType: "pill" | "court" = "pill"): React.ReactNode {
  if (!backgroundName) return null;

  const isFlowing = isFlowingFrame(activeFrameName);
  const sizeClass = isFlowing 
    ? (cardType === "pill" ? "inset-[2px] rounded-[14px]" : "inset-[2.5px] rounded-[8px]")
    : (cardType === "pill" ? "inset-0 rounded-2xl" : "inset-0 rounded-xl");

  let content: React.ReactNode = null;

  switch (backgroundName) {
    case "鐵牌：霧霾灰階":
      content = (
        <div className="absolute inset-0 bg-gradient-to-br from-slate-500 to-slate-700" />
      );
      break;

    case "銅牌：大地岩落":
      content = (
        <div className="absolute inset-0 bg-gradient-to-br from-amber-700 to-amber-950" />
      );
      break;

    case "白銀：微光銀河":
      content = (
        <div className="absolute inset-0 bg-gradient-to-br from-slate-400 to-slate-650" />
      );
      break;

    case "黃金：金光閃耀":
      content = (
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-500 via-amber-600 to-amber-950">
          {[...Array(3)].map((_, i) => (
            <div 
              key={i} 
              className="absolute w-1 h-1 bg-yellow-300 rounded-full blur-[0.5px] animate-float-up opacity-70"
              style={{ 
                left: `${15 + i * 30}%`, 
                animationDelay: `${i * 1.8}s`,
                animationDuration: `${6 + i}s`,
              }} 
            />
          ))}
        </div>
      );
      break;

    case "白金：海克斯科技":
      content = (
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-600 via-teal-850 to-slate-950">
          <div className="absolute inset-0 opacity-[0.15] bg-[linear-gradient(rgba(6,182,212,0.2)_1px,_transparent_1px),_linear-gradient(90deg,_rgba(6,182,212,0.2)_1px,_transparent_1px)] bg-[size:10px_10px]" />
          <div className="absolute inset-0 bg-cyan-400/10 animate-hex-pulse blur-[1px]" />
        </div>
      );
      break;

    case "翡翠：螢火之森":
      content = (
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-600 via-emerald-800 to-emerald-950">
          {[...Array(3)].map((_, i) => (
            <div 
              key={i} 
              className="absolute w-1 h-1 bg-emerald-400 rounded-full blur-[0.5px] animate-float-up opacity-75 shadow-[0_0_4px_rgba(52,211,153,0.8)]"
              style={{ 
                left: `${20 + i * 25}%`, 
                animationDelay: `${i * 1.5}s`,
                animationDuration: `${7 + i}s`,
              }} 
            />
          ))}
        </div>
      );
      break;

    case "鑽石：星辰風暴":
      content = (
        <div className="absolute inset-0 bg-gradient-to-br from-sky-400 via-sky-800 to-slate-950 shadow-[inset_0_0_12px_rgba(56,189,248,0.3)]">
          {[...Array(3)].map((_, i) => (
            <Sparkles 
              key={i} 
              size={6} 
              className="absolute text-sky-200 animate-pulse" 
              style={{ 
                left: `${20 + i * 28}%`, 
                top: `${30 + i * 20}%`,
                animationDelay: `${i * 0.8}s` 
              }} 
            />
          ))}
          <div className="absolute inset-0 opacity-25 bg-[linear-gradient(135deg,_transparent_45%,_rgba(255,255,255,0.7)_50%,_transparent_55%)] animate-shimmer" style={{ animationDuration: '3.5s' }} />
        </div>
      );
      break;

    case "大師：虛空星河":
      content = (
        <div className="absolute inset-0 bg-gradient-to-br from-purple-800 via-slate-900 to-indigo-950 overflow-hidden">
          <div className="absolute inset-0 bg-radial-gradient from-fuchsia-500/20 via-transparent to-transparent animate-pulse-subtle" />
          <div className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] bg-[radial-gradient(circle_at_center,_rgba(168,85,247,0.25),_transparent_40%)] animate-spin-slow" style={{ animationDuration: '15s' }} />
          <div className="absolute top-1/3 left-1/3 w-6 h-6 rounded-full border border-purple-500/35 blur-[1px] animate-pulse" />
        </div>
      );
      break;

    case "宗師：雷霆萬鈞":
      content = (
        <div className="absolute inset-0 bg-gradient-to-b from-red-600 via-stone-900 to-black">
          <div className="absolute inset-0 bg-red-600/30 animate-lightning" />
          <div className="absolute inset-0 pointer-events-none opacity-50">
            <div className="absolute top-[-10%] left-[30%] w-[1px] h-[120%] bg-red-400/50 rotate-[25deg] blur-[1px] animate-pulse" />
            <div className="absolute top-[-10%] left-[70%] w-[1px] h-[120%] bg-rose-400/50 rotate-[-20deg] blur-[1px] animate-pulse" style={{ animationDelay: '1s' }} />
          </div>
        </div>
      );
      break;

    case "菁英：傲世神巔":
      content = (
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-700 via-slate-900 to-amber-700 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-t from-amber-500/20 via-transparent to-purple-600/20" />
          <div className="absolute left-0 w-full h-1/4 bg-gradient-to-b from-transparent via-amber-400/25 to-transparent blur-md animate-sweep-light" />
          <div className="absolute left-0 w-full h-[2px] bg-amber-300/40 blur-[0.5px] animate-sweep-light" />
        </div>
      );
      break;

    case "終極：起源矩陣":
      content = (
        <div className="absolute inset-0 bg-gradient-to-b from-fuchsia-900 via-purple-950 to-black overflow-hidden flex justify-around">
          {[...Array(5)].map((_, i) => (
            <div 
              key={i} 
              className="text-[5.5px] text-fuchsia-400 font-mono tracking-widest break-all select-none animate-matrix-fall"
              style={{ 
                animationDelay: `${i * 0.75}s`,
                animationDuration: `${3.8 + i}s`,
                writingMode: 'vertical-rl',
                opacity: 0.85
              }}
            >
              {i % 2 === 0 ? "0101" : "10101"}
            </div>
          ))}
        </div>
      );
      break;

    case "終極：飄零羽落":
      content = (
        <div className="absolute inset-0 bg-gradient-to-br from-sky-300 via-pink-200 to-indigo-400">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.3),_transparent)]" />
          <div className="absolute inset-0 pointer-events-none">
            <Feather size={10} className="absolute top-0 left-[15%] text-sky-500 animate-feather-fall" style={{ animationDuration: '6s', animationDelay: '0s' }} />
            <Feather size={8} className="absolute top-0 left-[50%] text-pink-400 animate-feather-fall" style={{ animationDuration: '8s', animationDelay: '2s' }} />
            <Feather size={9} className="absolute top-0 left-[80%] text-amber-500 animate-feather-fall" style={{ animationDuration: '7s', animationDelay: '1s' }} />
          </div>
        </div>
      );
      break;

    default:
      return null;
  }

  return (
    <div className={`absolute z-[10] overflow-hidden pointer-events-none ${sizeClass}`}>
      {content}
    </div>
  );
}

export function getTitleStyle(titleName: string | undefined): { bg: string; text: string } {
  const defaultStyle = {
    bg: "bg-slate-800 border-slate-500/50 shadow-sm",
    text: "text-white"
  };
  if (!titleName) return defaultStyle;
  const name = titleName.toLowerCase();
  
  // Ultimate titles:
  // '跪求贊助零打券', '羽球界戴資穎', '這個殺氣不對勁'
  if (name.includes('跪求') || name.includes('戴資穎') || name.includes('殺氣')) {
    return {
      bg: "bg-gradient-to-r from-violet-600 via-fuchsia-500 to-amber-500 border-amber-300 shadow-[0_0_15px_rgba(217,70,239,0.5)]",
      text: "text-white font-black"
    };
  }
  
  // Legendary titles:
  // '連裁判都敢殺', '撲球之鬼', '撲球之鬼(不擦地)'
  if (name.includes('裁判') || name.includes('鬼')) {
    return {
      bg: "bg-amber-400 border-amber-200 shadow-[0_2px_10px_rgba(245,158,11,0.2)]",
      text: "text-amber-950 font-black"
    };
  }
  
  // Epic titles:
  // '發球姿勢 100 分', '活在線上的男人', '微笑殺手(肉球製造機)'
  if (name.includes('姿勢') || name.includes('線上') || name.includes('殺手')) {
    return {
      bg: "bg-indigo-500 border-indigo-300 shadow-[0_2px_8px_rgba(99,102,241,0.2)]",
      text: "text-white font-black"
    };
  }
  
  // Classic titles (Default):
  // '球場邊緣人', '撿球大師', '職業請假選手'
  return defaultStyle;
}
