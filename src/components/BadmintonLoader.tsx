import React from 'react';
import styles from './BadmintonLoader.module.css';

export const BadmintonLoader: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center py-10 animate-in fade-in duration-700">
      <div className="bg-slate-50 dark:bg-white/5 backdrop-blur-xl p-8 rounded-[3rem] border border-slate-200 dark:border-white/10 shadow-lg dark:shadow-2xl flex flex-col items-center gap-6">
        <svg viewBox="0 0 200 120" className="w-[200px] h-[120px] overflow-visible">
            {/* 定義球拍的共用設計 */}
            <defs>
                <g id="racket-red">
                    <line x1="0" y1="0" x2="0" y2="-25" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" />
                    {/* 握把 */}
                    <line x1="0" y1="0" x2="0" y2="-14" stroke="#f43f5e" strokeWidth="4.5" strokeLinecap="round" />
                    <line x1="-1.5" y1="-3" x2="1.5" y2="-5" stroke="#be123c" strokeWidth="1" />
                    <line x1="-1.5" y1="-8" x2="1.5" y2="-10" stroke="#be123c" strokeWidth="1" />
                    {/* 拍框 */}
                    <ellipse cx="0" cy="-42" rx="10" ry="16" fill="#ffe4e6" stroke="#f43f5e" strokeWidth="2.5" />
                    {/* 拍線 */}
                    <g stroke="#fb7185" strokeWidth="0.5">
                        <line x1="-6" y1="-48" x2="6" y2="-48" />
                        <line x1="-8" y1="-42" x2="8" y2="-42" />
                        <line x1="-6" y1="-36" x2="6" y2="-36" />
                        <line x1="-4" y1="-55" x2="-4" y2="-29" />
                        <line x1="0" y1="-57" x2="0" y2="-27" />
                        <line x1="4" y1="-55" x2="4" y2="-29" />
                    </g>
                </g>
                
                <g id="racket-blue">
                    <line x1="0" y1="0" x2="0" y2="-25" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" />
                    {/* 握把 */}
                    <line x1="0" y1="0" x2="0" y2="-14" stroke="#3b82f6" strokeWidth="4.5" strokeLinecap="round" />
                    <line x1="-1.5" y1="-3" x2="1.5" y2="-5" stroke="#1d4ed8" strokeWidth="1" />
                    <line x1="-1.5" y1="-8" x2="1.5" y2="-10" stroke="#1d4ed8" strokeWidth="1" />
                    {/* 拍框 */}
                    <ellipse cx="0" cy="-42" rx="10" ry="16" fill="#dbeafe" stroke="#3b82f6" strokeWidth="2.5" />
                    {/* 拍線 */}
                    <g stroke="#60a5fa" strokeWidth="0.5">
                        <line x1="-6" y1="-48" x2="6" y2="-48" />
                        <line x1="-8" y1="-42" x2="8" y2="-42" />
                        <line x1="-6" y1="-36" x2="6" y2="-36" />
                        <line x1="-4" y1="-55" x2="-4" y2="-29" />
                        <line x1="0" y1="-57" x2="0" y2="-27" />
                        <line x1="4" y1="-55" x2="4" y2="-29" />
                    </g>
                </g>
            </defs>

            {/* 場地基準線與網子 */}
            <line x1="20" y1="95" x2="180" y2="95" className="stroke-slate-200 dark:stroke-white/10" strokeWidth="3" strokeLinecap="round"/>
            <line x1="100" y1="95" x2="100" y2="70" className="stroke-slate-300 dark:stroke-white/20" strokeWidth="3" strokeLinecap="round"/>
            <rect x="98" y="70" width="4" height="15" className="fill-slate-100 dark:fill-white/5 stroke-slate-300 dark:stroke-white/20" strokeWidth="1" rx="1"/>

            {/* 動態陰影 */}
            <ellipse cx="0" cy="0" rx="10" ry="2" fill="rgba(0,0,0,0.3)" className={styles.birdieShadow} />

            {/* 擊球衝擊波 */}
            <circle cx="45" cy="50" r="0" fill="none" stroke="#f43f5e" className={styles.impactLeft} />
            <circle cx="155" cy="50" r="0" fill="none" stroke="#3b82f6" className={styles.impactRight} />

            {/* 左側紅拍 */}
            <use href="#racket-red" x="25" y="90" className={styles.racketLeft} />
            
            {/* 右側藍拍 */}
            <use href="#racket-blue" x="175" y="90" className={styles.racketRight} />

            {/* 羽毛球 */}
            <g className={styles.birdie}>
                <path d="M -7 -6 L -7 6 L 2 3 L 2 -3 Z" fill="#ffffff" stroke="#64748b" strokeWidth="1.5" strokeLinejoin="round"/>
                <circle cx="3" cy="0" r="3.5" fill="#fbbf24" stroke="#d97706" strokeWidth="1.5"/>
            </g>
        </svg>

        {/* 文字 Loading */}
        <div className="text-zinc-400 text-xs font-black uppercase tracking-[0.3em] flex items-center gap-1">
            MATCH POINT<span className={styles.dot}>.</span><span className={styles.dot}>.</span><span className={styles.dot}>.</span>
        </div>
      </div>
    </div>
  );
};
