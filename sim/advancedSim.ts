import { SimulationRunner, SimPlayer } from './SimulationRunner';
import { INITIAL_MU, INITIAL_SIGMA } from '../src/lib/matchEngine';
import { MatchRecord } from '../src/types';

const ITERATIONS = 10; // 加入分層分析後單次負擔較重，調整為 10
const TOTAL_PLAYERS = 16;
const SESSION_DURATION = 120;
const COURT_COUNT = 2;

interface TierSimResult {
    totalMatches: number;
    avgQuality: number;
    totalS3: number;
    avgUnique: number;
    tierStats: Record<string, { avgMatches: number, avgMissed: number, avgS3: number }>;
    timeline: string[];
    players: SimPlayer[];
    history: MatchRecord[];
}

async function runUltimateSimulation(): Promise<TierSimResult> {
    const history: MatchRecord[] = [];
    const players: SimPlayer[] = Array.from({ length: TOTAL_PLAYERS }, (_, i) => {
        let baseMu = 25;
        let tier = 'Mid';
        if (i < 4) { baseMu = 37.5; tier = 'Strong'; }
        else if (i >= 12) { baseMu = 12.5; tier = 'Weak'; }
        
        return {
            id: String(i + 1),
            name: `${tier}-P${String(i + 1).padStart(2, '0')}`,
            baseMu,
            mu: baseMu,
            sigma: INITIAL_SIGMA,
            matchCount: 0,
            winCount: 0,
            winRate: 0,
            dailyMatchCount: 0,
            streakCount: 0,
            status: 'ready' as const,
            arrivalTime: 0 // 全員準時抵達，測試絕對公平性
        };
    });

    const runner = new SimulationRunner({
        players,
        courtCount: COURT_COUNT,
        totalDuration: SESSION_DURATION,
        matchDurationAvg: 18,
        history
    });

    runner.dailyReset();
    
    const s3: Record<string, number> = {};
    const waitingAtStart: Record<string, number> = {};
    players.forEach(p => { s3[p.id] = 0; waitingAtStart[p.id] = 0; });

    runner.run('2026-04-08', {
        onMatchStart: (match) => {
            const activeIds = new Set([...match.team1, ...match.team2].map(p => p.id));
            players.forEach(p => {
                if (p.status === 'ready') {
                    if (!activeIds.has(p.id)) {
                        waitingAtStart[p.id]++;
                        if (waitingAtStart[p.id] === 5) s3[p.id]++; // 連休 3 場 (5 個事件)
                    } else {
                        waitingAtStart[p.id] = 0;
                    }
                }
            });
        }
    });

    // 分層統計
    const tierData: TierSimResult['tierStats'] = { 'Strong': { avgMatches:0, avgMissed:0, avgS3:0 }, 'Mid': { avgMatches:0, avgMissed:0, avgS3:0 }, 'Weak': { avgMatches:0, avgMissed:0, avgS3:0 } };
    const anyInteractions = new Map<string, Set<string>>();
    players.forEach(p => anyInteractions.set(p.id, new Set()));

    history.forEach(m => {
        const all = [...m.team1, ...m.team2].map(p => p.id);
        all.forEach(p1 => all.forEach(p2 => { if (p1 !== p2) anyInteractions.get(p1)!.add(p2); }));
    });

    players.forEach(p => {
        const tier = p.name.split('-')[0];
        tierData[tier].avgMatches += p.matchCount;
        tierData[tier].avgMissed += (TOTAL_PLAYERS - 1) - anyInteractions.get(p.id)!.size;
        tierData[tier].avgS3 += s3[p.id];
    });

    ['Strong','Mid','Weak'].forEach(t => {
        const count = t === 'Mid' ? 8 : 4;
        tierData[t].avgMatches /= count;
        tierData[t].avgMissed /= count;
        tierData[t].avgS3 /= count;
    });

    return {
        totalMatches: history.length,
        avgQuality: history.reduce((a, b) => a + (b.quality || 0), 0) / (history.length || 1),
        totalS3: Object.values(s3).reduce((a, b) => a + b, 0),
        avgUnique: 15 - (Object.values(tierData).reduce((a,b)=>a+b.avgMissed, 0)/3),
        tierStats: tierData,
        timeline: runner.timeline,
        players,
        history
    };
}

async function startUltimateSimulation() {
    const { ENGINE_CONFIG: config } = await import('../src/lib/matchEngine');

    console.log(`\n====================================================================================================`);
    console.log(`🏠 [安柏羽球旗艦模擬器] | 生產引擎: ${config.MODE}`);
    console.log(`設定: 4強 8中 4弱 | 疲勞度衰減 ON | 動態賽況時長 ON`);
    console.log(`====================================================================================================`);

    const results: TierSimResult[] = [];
    for (let i = 0; i < ITERATIONS; i++) {
        results.push(await runUltimateSimulation());
    }

    console.log(`\n📊 120分鐘 綜合指標 (n=${ITERATIONS})`);
    const mean = (key: keyof Omit<TierSimResult, 'tierStats' | 'timeline'>) => results.reduce((a, b) => a + (b[key] as number), 0) / ITERATIONS;
    console.log(`- 平均對戰品質: ${(mean('avgQuality')*100).toFixed(1)}% | 總連休3人次: ${mean('totalS3').toFixed(1)}`);
    
    console.log(`\n👤 分層體驗分析 (Tier Audit)`);
    console.log(`等級\t平均場次\t平均沒遇到人數\t平均連休3次數`);
    ['Strong','Mid','Weak'].forEach(t => {
        const mMatches = results.reduce((a,b)=>a+b.tierStats[t].avgMatches,0)/ITERATIONS;
        const mMissed = results.reduce((a,b)=>a+b.tierStats[t].avgMissed,0)/ITERATIONS;
        const mS3 = results.reduce((a,b)=>a+b.tierStats[t].avgS3,0)/ITERATIONS;
        console.log(`${t}\t${mMatches.toFixed(1)}\t\t${mMissed.toFixed(1)}\t\t${mS3.toFixed(2)}`);
    });

    // --- 新增：個別球員詳情表 ---
    console.log(`\n👤 個別球員最終數據 (最後一輪樣本分析)`);
    console.log(`ID\tName\tTier\tMu\t場次\t勝率\t沒遇到`);
    console.log(`----------------------------------------------------------------------------------------------------`);
    const last = results[results.length - 1];
    // 我們需要重建 Tier 名稱
    last.players.sort((a,b) => a.matchCount - b.matchCount).forEach(p => {
        const tier = p.name.split('-')[0];
        const missed = (TOTAL_PLAYERS - 1) - (results[results.length-1] as any).avgUnique; // 這裡簡化顯示
        // 從 history 獲取真實的 missed 人數
        const anyI = new Set<string>();
        last.history.forEach(m => {
            const all = [...m.team1, ...m.team2].map(px => px.id);
            if (all.includes(p.id)) all.forEach(id => { if(id!==p.id) anyI.add(id); });
        });
        const realMissed = 15 - anyI.size;
        console.log(`${p.id}\t${p.name.split('-')[1]}\t${tier}\t${p.mu.toFixed(1)}\t${p.matchCount}\t${p.winRate}%\t${realMissed}`);
    });
    console.log(`----------------------------------------------------------------------------------------------------`);

    console.log(`\n🎞️  前 30 分鐘時間軸流水帳 (Sample Timeline)`);
    console.log(`----------------------------------------------------------------------------------------------------`);
    results[0].timeline.slice(0, 15).forEach(line => console.log(line));
    console.log(`... (後略)`);
    console.log(`----------------------------------------------------------------------------------------------------`);

    console.log(`\n結論分析:`);
    const strongMatches = results.reduce((a,b)=>a+b.tierStats['Strong'].avgMatches,0)/ITERATIONS;
    const weakMatches = results.reduce((a,b)=>a+b.tierStats['Weak'].avgMatches,0)/ITERATIONS;
    
    if (Math.abs(strongMatches - weakMatches) < 1.5) {
        console.log(`✅ 平衡成功：強者與弱者的平均場次落差極小，未發生嚴重霸場現象。`);
    } else {
        console.log(`🟡 注意：強弱場次差距達 ${Math.abs(strongMatches - weakMatches).toFixed(1)} 場，可考慮進一步加權補償。`);
    }
}

startUltimateSimulation().catch(console.error);
