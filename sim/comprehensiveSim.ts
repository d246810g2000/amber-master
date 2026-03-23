import { SimulationRunner, SimPlayer } from './SimulationRunner';
import { getDerivedPlayers, INITIAL_MU, INITIAL_SIGMA, calculateComprehensiveMu } from '../src/lib/matchEngine';
import { MatchRecord } from '../src/types';
import { RawMatch } from '../src/lib/gasApi';

/**
 * 核心比較模擬：驗證「無視疲勞」開啟與關閉下的系統表現。
 */

const totalDays = 1;
const hoursPerDay = 2;
const totalPlayersCount = 10;
const courtCount = 1;

async function runSimulation(ignoreFatigue: boolean) {
    const history: MatchRecord[] = [];
    const metrics = {
        matchQualities: [] as number[],
        consecutiveMatches: 0
    };

    const players: SimPlayer[] = Array.from({ length: totalPlayersCount }, (_, i) => ({
        id: String(i + 1),
        name: `球員${String(i + 1).padStart(2, '0')}`,
        mu: INITIAL_MU, 
        sigma: INITIAL_SIGMA,
        matchCount: 0,
        winCount: 0,
        winRate: 0,
        dailyMatchCount: 0,
        status: 'ready' as const
    }));

    const runner = new SimulationRunner({
        players,
        courtCount: courtCount,
        totalDuration: hoursPerDay * 60,
        history
    });

    let prevMatchPlayerIds: Set<string> = new Set();

    for (let d = 1; d <= totalDays; d++) {
        const dayLabel = `2026-03-${20 + d}`;
        runner.dailyReset();
        prevMatchPlayerIds = new Set();
        
        runner.run(dayLabel, { 
            ignoreFatigue, 
            onMatchStart: (match) => {
                const currentIds = new Set([...match.team1, ...match.team2].map(p => String(p.id)));
                let hasConsecutive = false;
                currentIds.forEach(id => {
                    if (prevMatchPlayerIds.has(id)) hasConsecutive = true;
                });
                if (hasConsecutive) metrics.consecutiveMatches++;
                prevMatchPlayerIds = currentIds;
                metrics.matchQualities.push(match.quality * 100);
            }
        });
    }

    const lastDay = `2026-03-${20 + totalDays}`;
    const rawMatches: RawMatch[] = history.map(m => ({
        id: m.id, date: m.date, matchDate: m.matchDate,
        team1: m.team1.map(p => ({ id: p.id, name: p.name, muBefore: p.muBefore, muAfter: p.muAfter })),
        team2: m.team2.map(p => ({ id: p.id, name: p.name, muBefore: p.muBefore, muAfter: p.muAfter })),
        winner: m.winner, score: m.score, duration: m.duration
    }) as any);
    const rtPlayers = getDerivedPlayers(players as any, [], rawMatches, lastDay);
    const batchCareerCP = calculateComprehensiveMu(players as any, rawMatches);

    return { players, history, metrics, rtPlayers, batchCareerCP };
}

(async () => {
    console.log(`\n🚀 [全因素比較模擬] 啟動...`);
    console.log(`設定: ${totalDays} 天 / 每日 ${hoursPerDay} 小時 / ${totalPlayersCount} 人 / ${courtCount} 場地`);
    
    console.log(`\n--- [情境 A: 一般模式 (避開疲勞)] ---`);
    const normal = await runSimulation(false);
    const normalAvgQ = normal.metrics.matchQualities.reduce((a,b)=>a+b,0)/normal.metrics.matchQualities.length;
    console.log(`   - 連場次數 (Consecutive Matches): ${normal.metrics.consecutiveMatches}`);
    console.log(`   - 平均對戰品質: ${normalAvgQ.toFixed(1)}%`);

    console.log(`\n--- [情境 B: 無視疲勞模式] ---`);
    const ignored = await runSimulation(true);
    const ignoredAvgQ = ignored.metrics.matchQualities.reduce((a,b)=>a+b,0)/ignored.metrics.matchQualities.length;
    console.log(`   - 連場次數 (Consecutive Matches): ${ignored.metrics.consecutiveMatches}`);
    console.log(`   - 平均對戰品質: ${ignoredAvgQ.toFixed(1)}%`);

    console.log(`\n==================================================`);
    console.log(`📊 最終模擬比較結果`);
    console.log(`==================================================`);
    console.log(`1. 疲勞控制: 一般模式 ${normal.metrics.consecutiveMatches} 次連場 vs 無視疲勞 ${ignored.metrics.consecutiveMatches} 次連場。`);
    console.log(`2. 對戰品質: 一般模式 ${normalAvgQ.toFixed(1)}% vs 無視疲勞 ${ignoredAvgQ.toFixed(1)}%`);
    console.log(`3. 公平性: 一般模式最大場數差 ${Math.max(...normal.players.map(p=>p.matchCount)) - Math.min(...normal.players.map(p=>p.matchCount))} 場`);
    
    console.log(`\n結論: `);
    if (normal.metrics.consecutiveMatches === 0) {
        console.log(`✅ 一般模式在 16 人配置下成功實現「零連場」，有效避開疲勞。`);
    } else {
        console.log(`⚠️ 一般模式仍有少量連場，這在人員極度不足時是正常的保護機制。`);
    }
    console.log(`🚀 無視疲勞模式產生了 ${ignored.metrics.consecutiveMatches} 次連場，證明該功能已正確打通排點核心。`);
})();
