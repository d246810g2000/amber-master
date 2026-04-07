import { matchmake, calculateMatchResult, DerivedPlayer } from '../src/lib/matchEngine';
import { MatchRecord } from '../src/types';

export interface SimPlayer extends DerivedPlayer {
  status: 'ready' | 'playing' | 'away' | 'drafted';
  dailyMatchCount: number;
  arrivalTime?: number;
  baseMu: number;       // 基礎戰力
  streakCount: number;  // 目前連打場數
}

export class SimulationRunner {
  players: SimPlayer[];
  playerMap: Map<string, SimPlayer>;
  courtCount: number;
  matchDurationBase: number;
  totalDuration: number;
  history: MatchRecord[];
  courts: { id: number; players: SimPlayer[] | null; endTime: number; quality?: number }[];
  draftMatch: any | null = null;
  timeline: string[] = []; // 時間軸日誌

  constructor(config: {
    players: SimPlayer[];
    courtCount?: number;
    matchDurationAvg?: number;
    totalDuration?: number;
    history: MatchRecord[];
  }) {
    this.players = config.players;
    this.playerMap = new Map(config.players.map(p => [p.id, p]));
    this.courtCount = config.courtCount || 2;
    this.matchDurationBase = config.matchDurationAvg || 18;
    this.totalDuration = config.totalDuration || 180;
    this.history = config.history;
    this.courts = Array.from({ length: this.courtCount }, (_, i) => ({
      id: i + 1, players: null, endTime: 0
    }));
  }

  private log(time: number, msg: string) {
    const hh = Math.floor(time / 60);
    const mm = time % 60;
    this.timeline.push(`[${hh.toString().padStart(2, '0')}:${mm.toString().padStart(2, '0')}] ${msg}`);
  }

  // 取得考慮體力後的即時戰力
  private getEffectiveMu(p: SimPlayer): number {
    let mu = p.baseMu;
    if (p.streakCount >= 2) mu -= 3; // 連打 2 場以上
    if (p.streakCount >= 3) mu -= 5; // 連打 3 場以上（極度疲勞）
    return mu;
  }

  dailyReset() {
    this.players.forEach(p => {
      p.status = (p.arrivalTime || 0) === 0 ? 'ready' : 'away';
      p.dailyMatchCount = 0;
      p.streakCount = 0;
      p.mu = p.baseMu;
    });
    this.courts.forEach(c => { c.players = null; c.endTime = 0; });
    this.draftMatch = null;
    this.timeline = [];
  }

  private refillDraft(currentTime: number, dayLabel: string) {
    if (this.draftMatch) return;
    const readyPlayers = this.players.filter(p => p.status === 'ready');
    if (readyPlayers.length >= 4) {
      const readyIds = readyPlayers.map(p => p.id);
      const suggs = matchmake(this.players, readyIds, this.history, false, dayLabel);
      if (suggs.length > 0) {
        this.draftMatch = suggs[0];
        this.draftMatch.team1.forEach((ps: any) => this.playerMap.get(ps.id)!.status = 'drafted');
        this.draftMatch.team2.forEach((ps: any) => this.playerMap.get(ps.id)!.status = 'drafted');
        this.log(currentTime, `📝 預告位產生: ${this.draftMatch.team1.map((p:any)=>p.name).join('/')} vs ${this.draftMatch.team2.map((p:any)=>p.name).join('/')}`);
      }
    }
  }

  run(dayLabel: string, options?: { onMatchStart?: (match: any) => void }) {
    let currentTime = 0;
    while (currentTime < this.totalDuration + 30) {
      // 0. 到達
      this.players.forEach(p => {
        if (p.status === 'away' && (p.arrivalTime || 0) <= currentTime) {
          p.status = 'ready';
          this.log(currentTime, `👋 ${p.name} 抵達球場`);
        }
      });

      // 1. 結束處理
      this.courts.forEach(c => {
        if (c.players && currentTime >= c.endTime) {
          const pIds = c.players!.map(p => p.id);
          const eMus = c.players!.map(p => this.getEffectiveMu(p));
          const t1Mu = (eMus[0] + eMus[1]) / 2;
          const t2Mu = (eMus[2] + eMus[3]) / 2;
          const winner = Math.random() < (1 / (1 + Math.exp(-(t1Mu - t2Mu) / 5))) ? 1 : 2;

          const result = calculateMatchResult(this.players, pIds.slice(0, 2), pIds.slice(2, 4), winner, dayLabel, '21-18', '18分', `m-${currentTime}`, c.quality);
          
          this.log(currentTime, `🏁 場地 ${c.id} 結束: ${winner===1?'Team1':'Team2'} 勝 (${c.quality?.toFixed(2)})`);
          
          c.players.forEach(p => {
              p.status = 'ready';
              p.streakCount = 0; // 暫時重置連打
          });
          c.players = null;

          // 重新洗票預告 & 補位
          if (this.draftMatch) {
            [...this.draftMatch.team1, ...this.draftMatch.team2].forEach(ps => {
                const p = this.playerMap.get(ps.id)!;
                if (p.status === 'drafted') p.status = 'ready';
            });
            this.draftMatch = null;
          }

          const pool = this.players.filter(p => p.status === 'ready');
          if (pool.length >= 4) {
              const suggs = matchmake(this.players, pool.map(p => p.id), this.history, false, dayLabel);
              if (suggs.length > 0) {
                  const best = suggs[0];
                  const selected = [...best.team1, ...best.team2].map(ps => this.playerMap.get(ps.id)!);
                  c.players = selected;
                  c.quality = best.quality;
                  // 動態負回饋時間：若品質高 (0.8+) 則打比較久，若屠殺局則結束快一點
                  const durationSeed = this.matchDurationBase + (Math.floor(Math.random() * 4) - 2);
                  const qualityFactor = (best.quality || 0.5) * 2; // 約 0.4 ~ 1.8
                  c.endTime = currentTime + Math.floor(durationSeed * (0.8 + (1 - best.quality || 0.5)));
                  
                  selected.forEach(p => {
                      p.status = 'playing';
                      p.streakCount++; // 累計連打
                  });
                  this.log(currentTime, `⚔️ 場地 ${c.id} 開打: ${best.team1.map((p:any)=>p.name).join('/')} vs ${best.team2.map((p:any)=>p.name).join('/')} (預估時長: ${c.endTime - currentTime}min)`);
                  if (options?.onMatchStart) options.onMatchStart(best);
              }
          }
          this.refillDraft(currentTime, dayLabel);
        }
      });

      // 2. 初始填充
      if (currentTime < this.totalDuration) {
        this.refillDraft(currentTime, dayLabel);
        this.courts.forEach(c => {
          if (!c.players && this.draftMatch) {
            const selected = [...this.draftMatch.team1, ...this.draftMatch.team2].map(ps => this.playerMap.get(ps.id)!);
            c.players = selected; c.quality = this.draftMatch.quality;
            c.endTime = currentTime + this.matchDurationBase;
            selected.forEach(p => { p.status = 'playing'; p.streakCount++; });
            this.log(currentTime, `🚀 場地 ${c.id} 啟動: ${this.draftMatch.team1.map((p:any)=>p.name).join('/')} vs ${this.draftMatch.team2.map((p:any)=>p.name).join('/')}`);
            this.draftMatch = null;
            this.refillDraft(currentTime, dayLabel);
          }
        });
      }
      currentTime++;
    }
  }
}
