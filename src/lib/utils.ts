import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getTaipeiDateString(date: Date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date);
}

export function getTaipeiISOString(date: Date = new Date()) {
  // Returns YYYY-MM-DDTHH:mm:ss for Taipei local time
  const taipeiStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date);
  const [d, t] = taipeiStr.split(', ');
  return `${d}T${t}`;
}

export function parseLocalDateTime(dateStr: string | number | undefined): Date {
  if (!dateStr) return new Date();
  const s = String(dateStr);
  
  // Handle "YYYY-MM-DD HH:mm:ss" by replacing space with "T" 
  // to ensure ISO 8601 compliance for local time parsing in modern JS engines.
  // We explicitly avoid adding "Z" to keep it in the user's local context.
  let normalized = s.includes(' ') && !s.includes('T') ? s.replace(' ', 'T') : s;
  
  const d = new Date(normalized);
  if (isNaN(d.getTime())) return new Date();
  return d;
}

/** 特殊風格 → 外部 URL 模板映射 (使用 `{seed}` 作為佔位符) */
const STYLE_URL_MAP: Record<string, string> = {
  animals:         'https://robohash.org/{seed}?set=set4', // Kittens
  pets:            'https://robohash.org/{seed}?set=set4',
  mascot:          'https://robohash.org/{seed}?set=set2', // Monsters
  player:          'https://api.dicebear.com/7.x/miniavs/svg?seed={seed}',
  'cartoon-player': 'https://api.dicebear.com/7.x/miniavs/svg?seed={seed}',
};

export function getAvatarUrl(avatarStr: string | null | undefined, fallbackSeed: string): string {
  const defaultUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(fallbackSeed)}`;
  if (!avatarStr) return defaultUrl;

  if (!avatarStr.includes(':')) {
    // legacy format
    return `https://api.dicebear.com/7.x/${avatarStr}/svg?seed=${encodeURIComponent(fallbackSeed)}`;
  }

  const [style, seed] = avatarStr.split(':');
  const safeSeed = encodeURIComponent(seed || fallbackSeed);

  const template = STYLE_URL_MAP[style];
  if (template) return template.replace('{seed}', safeSeed);

  return `https://api.dicebear.com/7.x/${style}/svg?seed=${safeSeed}`;
}
