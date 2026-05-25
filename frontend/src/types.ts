export interface Player {
  id: string;
  name: string;
  mu?: number;
  sigma?: number;
  career_mu?: number;
  winRate?: number;
  matchCount?: number;
  avatar?: string;
  email?: string;
  hasBinding?: boolean;
  type?: 'resident' | 'guest';
  feathers?: number;
  last_feather_claim?: string;
  active_title_id?: number;
  active_frame_id?: number;
  active_background_id?: number;
  active_title?: { id: number; name: string; item_type: string };
  active_frame?: { id: number; name: string; item_type: string; image_url?: string };
  active_background?: { id: number; name: string; item_type: string; image_url?: string };
  isGoogleLinked?: boolean;
  active_pet_id?: string;
  active_egg_id?: string;
  egg_progress_games?: number;
  egg_progress_wins?: number;
  unlocked_pets?: string;
  feathersEarned?: number;
  feathersLost?: number;
  feathersNet?: number;
}

export interface MatchPlayer {
  id: string;
  name: string;
  avatar?: string;
  muBefore?: number;
  muAfter?: number;
  dailyMuBefore?: number;
  dailyMuAfter?: number;
  mu?: number;
  sigma?: number;
  active_title_id?: number;
  active_frame_id?: number;
  active_background_id?: number;
  active_title?: { id: number; name: string; item_type: string };
  active_frame?: { id: number; name: string; item_type: string; image_url?: string };
  active_background?: { id: number; name: string; item_type: string; image_url?: string };
  active_pet_id?: string;
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
