import React from 'react';
import {
  AreaChart,
  Area,
  ResponsiveContainer
} from 'recharts';
import { Trophy, Activity, Sparkles, Crown } from 'lucide-react';
import styles from './ShareStatsCard.module.css';
import { getAvatarUrl } from '../../lib/utils';
import type { Player } from '../../types';
import type { CombinedTrendPoint } from '../../hooks/usePlayerProfile';

interface ShareStatsCardProps {
  player: Player;
  stats: {
    totalMatches: number;
    winCount: number;
    lossCount: number;
    winRate: string | number;
  };
  currentStats: {
    instant: number;
    career: number;
  };
  combinedTrend: CombinedTrendPoint[];
  teammateStats: any[];
  matchHistory: any[];
  playerMap: Record<string, Player>;
}

export const ShareStatsCard: React.FC<ShareStatsCardProps> = ({
  player,
  stats,
  currentStats,
  combinedTrend,
  teammateStats,
  matchHistory,
  playerMap
}) => {
  const bestPartner = teammateStats[0];
  const partnerData = bestPartner ? playerMap[bestPartner.id] : null;
  const last5 = [...matchHistory].slice(0, 5).reverse();

  // Find Peak CP from trend
  const peakCareer = combinedTrend.length > 0 
    ? Math.max(...combinedTrend.map(t => Math.round(t.matchMu * 10)))
    : currentStats.career;

  return (
    <div className={styles.shareCardWrapper} id="share-card-content">
      <div className={styles.shareCard}>
        {/* Header Section */}
        <div className={styles.header}>
          <div className={styles.avatarWrapper}>
            <div className={styles.avatarGlow} />
            <img 
              src={getAvatarUrl(player.avatar || '', player.name)} 
              alt={player.name} 
              className={styles.avatar}
              referrerPolicy="no-referrer"
            />
          </div>
          <div className={styles.userInfo}>
            <h1>{player.name}</h1>
            <div className={styles.badge}>
              <Trophy size={12} color="#10b981" />
              <span>Performance Summary / 戰績摘要</span>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className={styles.statsGrid}>
          <div className={styles.statBox}>
            <div className={styles.statLabel}>Total Win Rate / 總勝率</div>
            <div className={styles.statValue}>
              {stats.winRate}<span className={styles.statUnit}>%</span>
            </div>
            <div className={styles.statSubText}>
              ({stats.winCount} Wins out of {stats.totalMatches} Matches)
            </div>
          </div>
          <div className={styles.statBox}>
            <div className={styles.statLabel}>Current CP / 目前戰力</div>
            <div className={`${styles.statValue} ${styles.cpValue}`}>
              {currentStats.career}<span className={styles.statUnit}>CP</span>
            </div>
            <div className={styles.peakBadge}>
              <Crown size={10} />
              Peak: {peakCareer} CP / 歷史最高
            </div>
          </div>
        </div>

        {/* CP Change Chart */}
        <div className={styles.chartContainer}>
          <div className={styles.chartTitle}>CP Change / 戰力演進</div>
          <div style={{ width: '100%', height: '120px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={combinedTrend.slice(-20)}>
                <defs>
                  <linearGradient id="cardGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <Area 
                  type="monotone" 
                  dataKey="matchMu" 
                  stroke="#10b981" 
                  strokeWidth={4}
                  fillOpacity={1} 
                  fill="url(#cardGradient)" 
                  animationDuration={0}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Footer Section */}
        <div className={styles.footer}>
          <div className={styles.partnerBox}>
            <div className={styles.statLabel}>Best Partner / 最佳拍擋</div>
            <div className={styles.partnerInfo}>
              <div className={styles.partnerAvatar}>
                 {bestPartner && partnerData ? (
                   <img 
                    src={getAvatarUrl(partnerData.avatar || '', partnerData.name)} 
                    alt={partnerData.name}
                    className="w-full h-full object-cover rounded-xl"
                   />
                 ) : (
                   <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifySelf: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '12px' }}>
                      <Crown size={20} color="rgba(255,255,255,0.2)" style={{ margin: 'auto' }} />
                   </div>
                 )}
              </div>
              <div className={styles.partnerDetails}>
                <h4>{bestPartner?.name || 'Searching...'}</h4>
                <p>Win Rate with {bestPartner?.name || 'Partner'}: {bestPartner?.winRate.toFixed(1) || 0}%</p>
              </div>
            </div>
            
            <div className={styles.matchHistory}>
              {last5.map((m, i) => (
                <div key={i} className={`${styles.historyIndicator} ${m.result === 'W' ? styles.win : styles.loss}`}>
                  {m.result}
                </div>
              ))}
            </div>
          </div>

          <div className={styles.brandInfo}>
            <p>Generated by</p>
            <p style={{ color: 'white', fontSize: '14px', fontWeight: 900, margin: '2px 0' }}>Amber Master</p>
            <p className={styles.watermark}>安柏排點大師生成</p>
          </div>
        </div>
      </div>
    </div>
  );
};
