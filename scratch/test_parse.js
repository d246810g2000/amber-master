const { z } = require('../frontend/node_modules/zod');
const http = require('http');

const RawPlayerStatSchema = z.object({
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
  feathersEarned: z.coerce.number().optional().default(0),
}).transform(val => ({
  date: val.date || val.Date || '',
  id: val.id || val.ID || '',
  name: val.name || val.Name || '',
  mu: val.mu ?? val.Mu,
  sigma: val.sigma ?? val.Sigma,
  matchCount: val.matchCount ?? val.MatchCount,
  winCount: val.winCount ?? val.WinCount,
  winRate: val.winRate ?? val.WinRate,
  feathersEarned: val.feathersEarned,
}));

const GasResponseSchema = (schema) => z.object({
  status: z.enum(['success', 'error', 'conflict']),
  data: schema.nullable().optional(),
  message: z.string().nullable().optional(),
});

http.get('http://localhost:8080/amber-master/api/player_stats?date=2026-05-20', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      console.log('JSON Status:', json.status);
      const schema = z.array(RawPlayerStatSchema);
      const result = GasResponseSchema(schema).safeParse(json);
      if (result.success) {
        console.log('SUCCESS! Parsed', result.data.data.length, 'records.');
        console.log('First record feathersEarned:', result.data.data[0].feathersEarned);
        console.log('First record details:', result.data.data[0]);
      } else {
        console.log('FAILED!', result.error);
      }
    } catch (e) {
      console.error('Error parsing:', e);
    }
  });
});
