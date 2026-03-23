
import { matchmake, INITIAL_MU, INITIAL_SIGMA, DerivedPlayer } from '../src/lib/matchEngine';
import { MatchRecord } from '../src/types';

/**
 * 驗證「無視疲勞」功能的模擬腳本
 */

const basePlayers: DerivedPlayer[] = Array.from({ length: 8 }, (_, i) => ({
    id: String(i + 1),
    name: `球員${String(i + 1).padStart(2, '0')}`,
    mu: INITIAL_MU,
    sigma: INITIAL_SIGMA,
    matchCount: 10,
    winCount: 5,
    winRate: 50,
}));

// 模擬最後兩場比賽，讓球員 1, 2, 3, 4 變成「疲勞」狀態
const recentMatches: MatchRecord[] = [
    {
        id: 'm1',
        date: new Date().toISOString(),
        matchDate: '2026-03-21',
        team1: [{ id: '1', name: '球員01', muBefore: 25, muAfter: 25 }, { id: '2', name: '球員02', muBefore: 25, muAfter: 25 }],
        team2: [{ id: '3', name: '球員03', muBefore: 25, muAfter: 25 }, { id: '4', name: '球員04', muBefore: 25, muAfter: 25 }],
        winner: 1,
        score: '21-19',
        duration: '15:00'
    }
];

const readyPlayerIds = basePlayers.map(p => p.id);

console.log('--- [無視疲勞功能驗證模擬] ---');
console.log(`參與球員: ${readyPlayerIds.join(', ')}`);
console.log(`已連場 (疲勞) 球員: 1, 2, 3, 4`);
console.log(`休息中 (不疲勞) 球員: 5, 6, 7, 8`);
console.log('----------------------------\n');

// 情境 1: 一般模式 (避開疲勞)
console.log('【情境 1: 一般模式 (ignoreFatigue = false)】');
const suggestionsNormal = matchmake(basePlayers, readyPlayerIds, recentMatches, false);
if (suggestionsNormal.length > 0) {
    const best = suggestionsNormal[0];
    const bestIds = [...best.team1, ...best.team2].map(p => p.id).sort();
    console.log(`   -> 建議名單: ${bestIds.join(', ')}`);
    const hasFatigued = bestIds.some(id => ['1', '2', '3', '4'].includes(id));
    console.log(`   -> 是否包含疲勞球員: ${hasFatigued ? '是 (❌ 預期應避開)' : '否 (✅ 符合預期)'}`);
}

console.log('\n----------------------------\n');

// 情境 2: 無視疲勞模式
console.log('【情境 2: 無視疲勞模式 (ignoreFatigue = true)】');
const suggestionsIgnore = matchmake(basePlayers, readyPlayerIds, recentMatches, true);
if (suggestionsIgnore.length > 0) {
    // 由於隨機性，我們多測幾次看是否會選到疲勞球員
    let fatiguedFoundCount = 0;
    const testRounds = 10;
    for (let i = 0; i < testRounds; i++) {
        const suggs = matchmake(basePlayers, readyPlayerIds, recentMatches, true);
        const bestIds = [...suggs[0].team1, ...suggs[0].team2].map(p => p.id);
        if (bestIds.some(id => ['1', '2', '3', '4'].includes(id))) {
            fatiguedFoundCount++;
        }
    }
    console.log(`   -> 執行 ${testRounds} 次配對測試...`);
    console.log(`   -> 其中 ${fatiguedFoundCount} 次選到了疲勞球員`);
    console.log(`   -> 驗證結果: ${fatiguedFoundCount > 0 ? '✅ 成功隨機抽選到疲勞球員' : '❌ 未抽選到疲勞球員 (可能是機率問題)'}`);
}
