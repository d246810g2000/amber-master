export type MiniGameType = 'feather' | 'trivia' | 'feather_rush';

export const GAME_DISPLAY_NAMES: Record<MiniGameType, string> = {
  feather: '接羽毛挑戰賽',
  trivia: '羽球小學堂',
  feather_rush: '飛羽衝鋒',
};

export const GAME_SHORT_LABELS: Record<MiniGameType, string> = {
  feather: '接羽毛',
  trivia: '羽球小學堂',
  feather_rush: '飛羽衝鋒',
};
