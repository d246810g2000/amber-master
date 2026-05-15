import { z } from 'zod';

export const RawPlayerSchema = z.object({
  id: z.string(),
  name: z.string(),
  avatar: z.string().nullable().optional(),
  hasBinding: z.boolean().optional(),
  mu: z.coerce.number().optional(),
  sigma: z.coerce.number().optional(),
  isGoogleLinked: z.boolean().optional(),
  type: z.enum(['resident', 'guest']).optional().default('guest'),
  feathers: z.coerce.number().optional().default(0),
  last_feather_claim: z.string().nullable().optional(),
  active_title_id: z.coerce.number().nullable().optional(),
  active_frame_id: z.coerce.number().nullable().optional(),
  active_title: z.object({ id: z.number(), name: z.string(), item_type: z.string() }).nullable().optional(),
  active_frame: z.object({ id: z.number(), name: z.string(), item_type: z.string(), image_url: z.string().nullable().optional() }).nullable().optional(),
  email: z.string().nullable().optional(),
});

export const PlayerBindingSchema = z.object({
  isOwner: z.boolean(),
  isBound: z.boolean(),
});

export const UserBindingSchema = z.object({
  isBound: z.boolean(),
  playerId: z.string().optional(),
  playerName: z.string().optional(),
  avatar: z.string().nullable().optional(),
});

export const RawPlayerStatSchema = z.object({
  Date: z.string().optional(),
  date: z.string().optional(),
  ID: z.union([z.string(), z.number()]).nullable().optional().transform(val => val !== null && val !== undefined ? String(val) : ''),
  id: z.union([z.string(), z.number()]).nullable().optional().transform(val => val !== null && val !== undefined ? String(val) : ''),
  Name: z.string().nullable().optional(),
  name: z.string().nullable().optional(),
  Mu: z.coerce.number().nullable().optional(),
  mu: z.coerce.number().nullable().optional(),
  Sigma: z.coerce.number().nullable().optional(),
  sigma: z.coerce.number().nullable().optional(),
  MatchCount: z.coerce.number().nullable().optional(),
  matchCount: z.coerce.number().nullable().optional(),
  WinCount: z.coerce.number().nullable().optional(),
  winCount: z.coerce.number().nullable().optional(),
  WinRate: z.coerce.number().nullable().optional(),
  winRate: z.coerce.number().nullable().optional(),
}).transform(val => ({
  date: val.date || val.Date || '',
  id: val.id || val.ID || '',
  name: val.name || val.Name || '',
  mu: val.mu ?? val.Mu,
  sigma: val.sigma ?? val.Sigma,
  matchCount: val.matchCount ?? val.MatchCount,
  winCount: val.winCount ?? val.WinCount,
  winRate: val.winRate ?? val.WinRate,
}));

export const RawMatchPlayerSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(val => String(val)).optional(),
  name: z.string(),
  avatar: z.string().nullable().optional(),
  muBefore: z.coerce.number().nullable().optional().transform(val => val ?? undefined),
  muAfter: z.coerce.number().nullable().optional().transform(val => val ?? undefined),
  dailyMuBefore: z.coerce.number().nullable().optional().transform(val => val ?? undefined),
  dailyMuAfter: z.coerce.number().nullable().optional().transform(val => val ?? undefined),
  sigma: z.coerce.number().nullable().optional().transform(val => val ?? undefined),
});

export const RawMatchSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(val => String(val)),
  date: z.union([z.string(), z.number()]).optional(),
  Date: z.union([z.string(), z.number()]).optional(),
  matchDate: z.string().optional(),
  team1: z.array(RawMatchPlayerSchema),
  team2: z.array(RawMatchPlayerSchema),
  winner: z.union([z.number(), z.string()]).transform(val => {
    if (typeof val === 'number') return val;
    if (val === 'Team 1') return 1;
    if (val === 'Team 2') return 2;
    return Number(val) || 1;
  }),
  score: z.union([z.string(), z.number()]).nullable().optional().transform(val => (val !== undefined && val !== null) ? String(val) : ''),
  duration: z.union([z.string(), z.number()]).nullable().optional().transform(val => (val !== undefined && val !== null) ? String(val) : ''),
  courtName: z.union([z.string(), z.number()]).nullable().optional().transform(val => (val !== undefined && val !== null) ? String(val) : undefined),
  matchNo: z.union([z.number(), z.string()]).nullable().optional().transform(val => (val !== undefined && val !== null) ? Number(val) : undefined),
}).transform(val => ({
  ...val,
  date: String(val.date || val.Date || '')
}));

export const GasResponseSchema = <T extends z.ZodTypeAny>(schema: T) => z.object({
  status: z.enum(['success', 'error', 'conflict']),
  data: schema.nullable().optional(),
  message: z.string().nullable().optional(),
});

export const FeatherTransactionSchema = z.object({
  id: z.number(),
  player_id: z.string(),
  amount: z.number(),
  type: z.string(),
  description: z.string().nullable().optional(),
  created_at: z.string(),
});

export type RawPlayer = z.infer<typeof RawPlayerSchema>;
export type RawPlayerStat = z.infer<typeof RawPlayerStatSchema>;
export type RawMatch = z.infer<typeof RawMatchSchema>;
export type FeatherTransaction = z.infer<typeof FeatherTransactionSchema>;
