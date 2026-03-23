
import { matchmake, calculateMatchResult, DerivedPlayer } from '../src/lib/matchEngine';
import { MatchRecord } from '../src/types';

export interface SimPlayer extends DerivedPlayer {
  status: 'ready' | 'playing' | 'away';
  dailyMatchCount: number;
}

export class SimulationRunner {
  players: SimPlayer[];
  playerMap: Map<string, SimPlayer>;
  courtCount: number;
  matchDurationAvg: number;
  totalDuration: number;
  history: MatchRecord[];
  courts: { id: number; players: SimPlayer[] | null; endTime: number }[];

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
    this.matchDurationAvg = config.matchDurationAvg || 18;
    this.totalDuration = config.totalDuration || 180;
    this.history = config.history;
    this.courts = Array.from({ length: this.courtCount }, (_, i) => ({
      id: i + 1,
      players: null,
      endTime: 0
    }));
  }

  dailyReset() {
    this.players.forEach(p => {
      p.status = 'ready';
      p.dailyMatchCount = 0;
    });
    this.courts.forEach(c => {
      c.players = null;
      c.endTime = 0;
    });
  }

  run(dayLabel: string, options?: { ignoreFatigue?: boolean, onMatchStart?: (match: any) => void }) {
    const ignoreFatigue = options?.ignoreFatigue || false;
    const onMatchStart = options?.onMatchStart;
    let currentTime = 0;
    const extendedDuration = this.totalDuration + 30;

    while (currentTime < extendedDuration) {
      // 1. Check match completion
      this.courts.forEach(c => {
        if (c.players && currentTime >= c.endTime) {
          const winner = Math.random() > 0.5 ? 1 : 2;
          
          // Use real calculateMatchResult to update mu/sigma/matchCount
          const team1Ids = c.players!.slice(0, 2).map(p => p.id);
          const team2Ids = c.players!.slice(2, 4).map(p => p.id);
          
          const result = calculateMatchResult(
            this.players,
            team1Ids,
            team2Ids,
            winner,
            dayLabel,
            '',
            '',
            `m-${dayLabel}-${currentTime}`
          );

          // Update underlying player objects from production updatedStats
          result.updatedStats.forEach(stat => {
            const p = this.playerMap.get(stat.ID);
            if (p) {
              p.mu = stat.Mu;
              p.sigma = stat.Sigma;
              p.matchCount = stat.MatchCount;
              p.winCount = stat.WinCount;
              p.winRate = stat.WinRate;
              p.dailyMatchCount = (p.dailyMatchCount || 0) + 1;
            }
          });

          // Override result.matchRecord.date to use simulation time for correct sorting
          result.matchRecord.date = `${dayLabel}T${Math.floor(currentTime / 60).toString().padStart(2, '0')}:${(currentTime % 60).toString().padStart(2, '0')}:00`;
          this.history.unshift(result.matchRecord);

          const finishedPlayers = c.players!;
          c.players = null;
          finishedPlayers.forEach(p => p.status = 'ready');
        }
      });

      // 2. Propose new matches (only in business hours)
      if (currentTime < this.totalDuration) {
        this.courts.forEach(c => {
          if (!c.players) {
            const readyPlayers = this.players.filter(p => p.status === 'ready');
            if (readyPlayers.length >= 4) {
                const readyIds = readyPlayers.map(p => p.id);
                const suggs = matchmake(this.players, readyIds, this.history);

                if (suggs.length > 0) {
                    const best = suggs[0];
                    const selected = [...best.team1, ...best.team2]
                        .map(ps => this.playerMap.get(ps.id)!);
                    
                    c.players = selected;
                    c.endTime = currentTime + this.matchDurationAvg + (Math.floor(Math.random() * 6) - 3);
                    selected.forEach(p => p.status = 'playing');
                    
                    if (onMatchStart) onMatchStart(best);
                }
            }
          }
        });
      }

      currentTime++;
    }
  }
}
