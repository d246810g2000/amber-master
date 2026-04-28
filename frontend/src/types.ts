export interface Player {
  id: string;
  name: string;
  mu?: number;
  sigma?: number;
  winRate?: number;
  matchCount?: number;
  avatar?: string;
  email?: string;
  hasBinding?: boolean;
  type?: 'resident' | 'guest';
}

export interface MatchPlayer {
  id: string;
  name: string;
  avatar?: string;
  muBefore?: number;
  muAfter?: number;
  mu?: number;
  sigma?: number;
}

export interface MatchRecord {
  id: string;
  date: string;
  matchDate?: string;
  team1: MatchPlayer[];
  team2: MatchPlayer[];
  winner: 1 | 2;
  score: string;
  duration?: string;
  courtName?: string;
  matchNo?: number;
  quality?: number;
}

export interface Match {
  team1: Player[];
  team2: Player[];
  team1Ratings?: { mu: number; sigma: number }[];
  team2Ratings?: { mu: number; sigma: number }[];
  quality: number;
}
