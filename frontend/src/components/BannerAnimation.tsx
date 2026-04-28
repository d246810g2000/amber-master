import React from 'react';
import styles from './BannerAnimation.module.css';

export const BannerAnimation: React.FC = () => {
  return (
    <div className="w-full overflow-hidden relative" style={{ height: '60px' }}>
      <svg viewBox="0 -70 3200 380" preserveAspectRatio="xMidYMid meet" style={{ display: 'block', width: '100%', height: '100%' }}>
        <path d="M 100 300 L 500 250 L 2700 250 L 3100 300" fill="#f1f5f9" opacity="0.6"/>
        <line x1="300" y1="270" x2="2900" y2="270" stroke="#94a3b8" strokeWidth="4" strokeLinecap="round" opacity="0.3"/>

        <g id="banner-scene" className={styles.scene}>
          <g transform="translate(800, 0)">
            <g strokeLinecap="round" strokeLinejoin="round">
              <line x1="800" y1="190" x2="800" y2="270" stroke="#475569" strokeWidth="8" opacity="0.8"/>
              <rect x="796" y="190" width="8" height="35" fill="#ffffff" stroke="#475569" strokeWidth="3"/>
              <line x1="790" y1="200" x2="810" y2="200" stroke="#94a3b8" strokeWidth="2"/>
              <line x1="790" y1="210" x2="810" y2="210" stroke="#94a3b8" strokeWidth="2"/>
              <line x1="790" y1="220" x2="810" y2="220" stroke="#94a3b8" strokeWidth="2"/>
            </g>
          </g>

          {/* Smash effect lines */}
          <line x1="608" y1="31" x2="2478" y2="289" stroke="#f43f5e" strokeWidth="14" strokeLinecap="round" className={styles.lineSmash1} opacity="0.2" />
          <line x1="708" y1="46" x2="2578" y2="304" stroke="#fda4af" strokeWidth="6" strokeLinecap="round" className={styles.lineSmash1} opacity="0.4" />
          <line x1="2592" y1="31" x2="722" y2="289" stroke="#3b82f6" strokeWidth="14" strokeLinecap="round" className={styles.lineSmash2} opacity="0.2" />
          <line x1="2492" y1="46" x2="622" y2="304" stroke="#93c5fd" strokeWidth="6" strokeLinecap="round" className={styles.lineSmash2} opacity="0.4" />

          {/* Player 1 (Left - Red) */}
          <g transform="translate(250, 0)">
            <g className={styles.p1MoveX}>
              <ellipse className={styles.shadowP1} cx="250" cy="270" rx="40" ry="7" fill="#cbd5e1"/>
              <g className={styles.p1MoveY}>
                <g className={styles.panicP1}>
                  <line x1="240" y1="145" x2="235" y2="125" stroke="#1e293b" strokeWidth="3" strokeLinecap="round"/>
                  <line x1="250" y1="140" x2="250" y2="120" stroke="#1e293b" strokeWidth="3" strokeLinecap="round"/>
                  <line x1="260" y1="145" x2="265" y2="125" stroke="#1e293b" strokeWidth="3" strokeLinecap="round"/>
                </g>
                <g stroke="#1e293b" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round">
                  <path className={styles.p1Legs} fill="none" d="M 220 270 L 250 230 L 280 270" />
                  <g className={styles.p1LeftArm}><line x1="250" y1="200" x2="250" y2="245" fill="none" /></g>
                  <line x1="250" y1="190" x2="250" y2="230" fill="none" />
                  <circle cx="250" cy="170" r="18" fill="#ffffff" />
                  <g className={styles.faceState} fill="#1e293b" stroke="none">
                    <circle cx="242" cy="166" r="2.5" />
                    <circle cx="258" cy="166" r="2.5" />
                    <path d="M 245 174 Q 250 178 255 174" fill="none" stroke="#1e293b" strokeWidth="2.5" />
                  </g>
                  <g className={`${styles.p1Angry} ${styles.faceState}`}>
                    <path d="M 238 162 L 245 166" stroke="#1e293b" strokeWidth="3"/>
                    <path d="M 262 162 L 255 166" stroke="#1e293b" strokeWidth="3"/>
                    <circle cx="243" cy="168" r="2.5" fill="#1e293b" stroke="none" />
                    <circle cx="257" cy="168" r="2.5" fill="#1e293b" stroke="none" />
                    <ellipse cx="250" cy="176" rx="6" ry="4" fill="#1e293b" stroke="none" />
                  </g>
                  <g className={`${styles.p1Shock} ${styles.faceState}`}>
                    <circle cx="240" cy="164" r="3.5" fill="#1e293b" stroke="none" />
                    <circle cx="260" cy="164" r="3.5" fill="#1e293b" stroke="none" />
                    <ellipse cx="250" cy="176" rx="4" ry="6" fill="#1e293b" stroke="none"/>
                    <circle cx="265" cy="170" r="3" fill="#38bdf8" stroke="none"/>
                  </g>
                  <g className={styles.p1Arm}>
                    <line x1="250" y1="190" x2="250" y2="140" fill="none" />
                    <line x1="250" y1="145" x2="250" y2="120" stroke="#f43f5e" strokeWidth="6" strokeLinecap="round" />
                    <line x1="250" y1="120" x2="250" y2="90" stroke="#94a3b8" strokeWidth="4" strokeLinecap="round" />
                    <ellipse cx="250" cy="75" rx="14" ry="20" fill="#ffe4e6" stroke="#f43f5e" strokeWidth="5" />
                    <g stroke="#fb7185" strokeWidth="1.2">
                      <line x1="241" y1="60" x2="241" y2="90" /><line x1="247" y1="56" x2="247" y2="94" />
                      <line x1="253" y1="56" x2="253" y2="94" /><line x1="259" y1="60" x2="259" y2="90" />
                      <line x1="239" y1="63" x2="261" y2="63" /><line x1="236.5" y1="71" x2="263.5" y2="71" />
                      <line x1="236.5" y1="79" x2="263.5" y2="79" /><line x1="239" y1="87" x2="261" y2="87" />
                    </g>
                  </g>
                </g>
              </g>
            </g>
          </g>

          {/* Player 2 (Right - Blue) */}
          <g transform="translate(1350, 0)">
            <g className={styles.p2MoveX}>
              <ellipse className={styles.shadowP2} cx="1350" cy="270" rx="40" ry="7" fill="#cbd5e1"/>
              <g className={styles.p2MoveY}>
                <g className={styles.panicP2}>
                  <line x1="1340" y1="145" x2="1335" y2="125" stroke="#1e293b" strokeWidth="3" strokeLinecap="round"/>
                  <line x1="1350" y1="140" x2="1350" y2="120" stroke="#1e293b" strokeWidth="3" strokeLinecap="round"/>
                  <line x1="1360" y1="145" x2="1365" y2="125" stroke="#1e293b" strokeWidth="3" strokeLinecap="round"/>
                </g>
                <g stroke="#1e293b" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round">
                  <path className={styles.p2Legs} fill="none" d="M 1320 270 L 1350 230 L 1380 270" />
                  <g className={styles.p2LeftArm}><line x1="1350" y1="200" x2="1350" y2="245" fill="none" /></g>
                  <line x1="1350" y1="190" x2="1350" y2="230" fill="none" />
                  <circle cx="1350" cy="170" r="18" fill="#ffffff" />
                  <g className={styles.faceState} fill="#1e293b" stroke="none">
                    <circle cx="1342" cy="166" r="2.5" />
                    <circle cx="1358" cy="166" r="2.5" />
                    <path d="M 1345 174 Q 1350 178 1355 174" fill="none" stroke="#1e293b" strokeWidth="2.5" />
                  </g>
                  <g className={`${styles.p2Angry} ${styles.faceState}`}>
                    <path d="M 1338 162 L 1345 166" stroke="#1e293b" strokeWidth="3"/>
                    <path d="M 1362 162 L 1355 166" stroke="#1e293b" strokeWidth="3"/>
                    <circle cx="1343" cy="168" r="2.5" fill="#1e293b" stroke="none" />
                    <circle cx="1357" cy="168" r="2.5" fill="#1e293b" stroke="none" />
                    <ellipse cx="1350" cy="176" rx="6" ry="4" fill="#1e293b" stroke="none" />
                  </g>
                  <g className={`${styles.p2Shock} ${styles.faceState}`}>
                    <circle cx="1340" cy="164" r="3.5" fill="#1e293b" stroke="none" />
                    <circle cx="1360" cy="164" r="3.5" fill="#1e293b" stroke="none" />
                    <ellipse cx="1350" cy="176" rx="4" ry="6" fill="#1e293b" stroke="none"/>
                    <circle cx="1335" cy="170" r="3" fill="#38bdf8" stroke="none"/>
                  </g>
                  <g className={styles.p2Arm}>
                    <line x1="1350" y1="190" x2="1350" y2="140" fill="none" />
                    <line x1="1350" y1="145" x2="1350" y2="120" stroke="#3b82f6" strokeWidth="6" strokeLinecap="round" />
                    <line x1="1350" y1="120" x2="1350" y2="90" stroke="#94a3b8" strokeWidth="4" strokeLinecap="round" />
                    <ellipse cx="1350" cy="75" rx="14" ry="20" fill="#dbeafe" stroke="#3b82f6" strokeWidth="5" />
                    <g stroke="#60a5fa" strokeWidth="1.2">
                      <line x1="1341" y1="60" x2="1341" y2="90" /><line x1="1347" y1="56" x2="1347" y2="94" />
                      <line x1="1353" y1="56" x2="1353" y2="94" /><line x1="1359" y1="60" x2="1359" y2="90" />
                      <line x1="1339" y1="63" x2="1361" y2="63" /><line x1="1336.5" y1="71" x2="1363.5" y2="71" />
                      <line x1="1336.5" y1="79" x2="1363.5" y2="79" /><line x1="1339" y1="87" x2="1361" y2="87" />
                    </g>
                  </g>
                </g>
              </g>
            </g>
          </g>

          {/* Shuttlecock */}
          <g className={styles.birdie}>
            <path d="M -12 -10 L -12 10 L 4 5 L 4 -5 Z" fill="#ffffff" stroke="#64748b" strokeWidth="3" strokeLinejoin="round"/>
            <circle cx="6" cy="0" r="6" fill="#fbbf24" stroke="#d97706" strokeWidth="2"/>
          </g>
        </g>
      </svg>
    </div>
  );
};
