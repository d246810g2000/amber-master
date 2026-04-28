import { useId } from 'react';

export type BadmintonVariant = 'gold' | 'silver' | 'bronze';

const gradients: Record<
  BadmintonVariant,
  { offset: string; color: string }[]
> = {
  gold: [
    { offset: '0%', color: '#FFF7B0' },
    { offset: '50%', color: '#FFD700' },
    { offset: '100%', color: '#B8860B' },
  ],
  silver: [
    { offset: '0%', color: '#FFFFFF' },
    { offset: '50%', color: '#E0E0E0' },
    { offset: '100%', color: '#888888' },
  ],
  bronze: [
    { offset: '0%', color: '#FFDAB9' },
    { offset: '50%', color: '#CD7F32' },
    { offset: '100%', color: '#8B4513' },
  ],
};

export interface BadmintonIconProps {
  variant?: BadmintonVariant;
  size?: number;
  className?: string;
}

/**
 * 羽球造型 SVG（金／銀／銅金屬漸層＋高光＋輕陰影）。
 * 每個實例以 `useId` 產生唯一 defs id，避免同頁多顆衝突。
 */
export function BadmintonIcon({ variant = 'gold', size = 64, className = '' }: BadmintonIconProps) {
  const raw = useId().replace(/:/g, '');
  const sid = raw || 'badminton';
  const stops = gradients[variant] ?? gradients.gold;
  const gradientId = `badminton-grad-${variant}-${sid}`;
  const highlightId = `${gradientId}-highlight`;
  const filterId = `badminton-shadow-${sid}`;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={className}
      fill="none"
      aria-hidden
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1" gradientUnits="objectBoundingBox">
          {stops.map((stop, index) => (
            <stop key={index} offset={stop.offset} stopColor={stop.color} />
          ))}
        </linearGradient>

        <linearGradient id={highlightId} x1="0" y1="0" x2="0" y2="1" gradientUnits="objectBoundingBox">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>

        <filter id={filterId} x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="2" stdDeviation="1.5" floodOpacity="0.25" />
        </filter>
      </defs>

      <g filter={`url(#${filterId})`}>
        <path
          d="M 18 14 L 26 44 L 38 44 L 46 14 C 36 19 28 19 18 14 Z"
          fill={`url(#${gradientId})`}
        />
        <path
          d="M 18 14 L 26 30 L 38 30 L 46 14 C 36 19 28 19 18 14 Z"
          fill={`url(#${highlightId})`}
        />

        <path d="M 32 44 L 32 14" stroke="#FFFFFF" strokeOpacity="0.4" strokeWidth="2" strokeLinecap="round" />
        <path d="M 29 44 L 23 15" stroke="#FFFFFF" strokeOpacity="0.4" strokeWidth="2" strokeLinecap="round" />
        <path d="M 35 44 L 41 15" stroke="#FFFFFF" strokeOpacity="0.4" strokeWidth="2" strokeLinecap="round" />

        <path d="M 26 44 L 18 14" stroke={`url(#${gradientId})`} strokeWidth="1.5" strokeLinecap="round" />
        <path d="M 38 44 L 46 14" stroke={`url(#${gradientId})`} strokeWidth="1.5" strokeLinecap="round" />

        <path d="M 21 28 L 43 28" stroke={`url(#${gradientId})`} strokeWidth="1.5" />
        <path d="M 23.5 36 L 40.5 36" stroke={`url(#${gradientId})`} strokeWidth="1.5" />

        <path d="M 25 46 C 25 56 39 56 39 46 Z" fill={`url(#${gradientId})`} />
        <path d="M 25 46 C 25 50 39 50 39 46 Z" fill={`url(#${highlightId})`} />

        <rect x="24" y="43" width="16" height="3" rx="1" fill={`url(#${gradientId})`} />
      </g>
    </svg>
  );
}
