import { z } from 'zod';

export const RawPlayerSchema = z.object({
  id: z.string(),
  name: z.string(),
  avatar: z.string().optional(),
  hasBinding: z.boolean().optional(),
  mu: z.coerce.number().optional(),
  sigma: z.coerce.number().optional(),
});

export const PlayerBindingSchema = z.object({
  isOwner: z.boolean(),
  isBound: z.boolean(),
});

export const UserBindingSchema = z.object({
  isBound: z.boolean(),
  playerId: z.string().optional(),
  playerName: z.string().optional(),
  avatar: z.string().optional(),
});

export const RawPlayerStatSchema = z.object({
  Date: z.string().optional(),
  date: z.string().optional(),
  ID: z.union([z.string(), z.number()]).transform(val => String(val)).optional(),
  id: z.union([z.string(), z.number()]).transform(val => String(val)).optional(),
  Name: z.string().optional(),
  name: z.string().optional(),
  Mu: z.coerce.number().optional(),
  mu: z.coerce.number().optional(),
  Sigma: z.coerce.number().optional(),
  sigma: z.coerce.number().optional(),
  MatchCount: z.coerce.number().optional(),
  matchCount: z.coerce.number().optional(),
  WinCount: z.coerce.number().optional(),
  winCount: z.coerce.number().optional(),
  WinRate: z.coerce.number().optional(),
  winRate: z.coerce.number().optional(),
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
  avatar: z.string().optional(),
  muBefore: z.coerce.number().optional(),
  muAfter: z.coerce.number().optional(),
  sigma: z.coerce.number().optional(),
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
  score: z.union([z.string(), z.number()]).optional().transform(val => val !== undefined ? String(val) : ''),
  duration: z.union([z.string(), z.number()]).optional().transform(val => val !== undefined ? String(val) : ''),
  courtName: z.union([z.string(), z.number()]).optional().transform(val => val !== undefined ? String(val) : undefined),
  matchNo: z.union([z.number(), z.string()]).optional().transform(val => val ? Number(val) : undefined),
}).transform(val => ({
  ...val,
  date: String(val.date || val.Date || '')
}));

export const GasResponseSchema = <T extends z.ZodTypeAny>(schema: T) => z.object({
  status: z.enum(['success', 'error', 'conflict']),
  data: schema.optional(),
  message: z.string().optional(),
});

export type RawPlayer = z.infer<typeof RawPlayerSchema>;
export type RawPlayerStat = z.infer<typeof RawPlayerStatSchema>;
export type RawMatch = z.infer<typeof RawMatchSchema>;
