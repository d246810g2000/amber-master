// @ts-nocheck
import express from 'express';
import dotenv from 'dotenv';
dotenv.config();
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { Rating, rate, quality } from 'ts-trueskill';

const GAS_URL = process.env.VITE_GAS_URL;

const app = express();
const PORT = 3000;

app.use(express.json());

// The Google Apps Script Web App URL provided by the user
// (Already handled at the top of the file)

// In-memory match history fallback
let matchHistory: any[] = [];

// Helper: 取得台北時區的 ISO 格式時間字串
function getTaipeiDateTimeString() {
  const now = new Date();
  const taipeiDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(now);
  
  // 轉換格式: YYYY/MM/DD HH:MM:SS -> YYYY-MM-DDTHH:MM:SS
  const [datePart, timePart] = taipeiDate.split(', ');
  return `${datePart.replace(/\//g, '-')}T${timePart}`;
}
// Helper to calculate match counts
function getMatchCounts(history: any[]) {
  const counts: Record<string, number> = {};
  history.forEach(match => {
    const players = [...(match.team1 || []), ...(match.team2 || [])];
    players.forEach(p => {
      if (p && p.id) {
        counts[p.id] = (counts[p.id] || 0) + 1;
      }
    });
  });
  return counts;
}

// Helper: 取得台北日期字串 (YYYY-MM-DD)
function getLocalDateString(dateVal?: any) {
  if (typeof dateVal === 'string') {
    // 如果已經是 YYYY-MM-DD 格式，直接回傳
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateVal)) {
      return dateVal;
    }
    // 如果是 YYYY-MM-DD HH:mm:ss 格式，擷取日期部分
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(dateVal)) {
      return dateVal.split(' ')[0];
    }
    // 如果是 ISO 格式，擷取日期部分
    if (dateVal.includes('T')) {
      return dateVal.split('T')[0];
    }
  }

  const d = dateVal ? new Date(dateVal) : new Date();
  if (isNaN(d.getTime())) return '';
  
  // 使用 Intl.DateTimeFormat 確保為台北時區 (Asia/Taipei)，en-CA 格式為 YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(d);
}

function getSafeTime(dateVal: any): number {
  if (!dateVal) return 0;
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return 0;
  return d.getTime();
}

// Helper: 從對戰紀錄推算球員的即時戰力與統計數據
// 快取機制
let playersCache: { data: any, timestamp: number } | null = null;
const CACHE_DURATION = 60 * 1000; // 1 minute

async function getDerivedPlayers(filterDate?: string) {
  const targetDate = filterDate || getLocalDateString();
  const today = getLocalDateString();

  // 如果是今天且有快取，直接回傳
  if (targetDate === today && playersCache && (Date.now() - playersCache.timestamp < CACHE_DURATION)) {
    return playersCache.data;
  }

  try {
    // 1. 取得基本球員名單
    const playersRes = await fetch(GAS_URL);
    const playersResult = await playersRes.json();
    if (playersResult.status !== 'success') throw new Error(playersResult.message);
    const basePlayers = playersResult.data;

    // 2. 嘗試從 PlayerStats 表讀取「該日期」的快照 (Snapshot)
    // 這是為了解決使用者提到的：篩選日期時應抓取對應日期的屬性
    let dailySnapshots: Record<string, any> = {};
    try {
      const statsRes = await fetch(`${GAS_URL}?action=getPlayerStats`);
      const statsResult = await statsRes.json();
      if (statsResult.status === 'success' && statsResult.data) {
        statsResult.data.forEach((stat: any) => {
          const statDate = getLocalDateString(stat.date || stat.Date);
          if (statDate === targetDate) {
            const idVal = stat.id || stat.ID;
            dailySnapshots[idVal] = {
              mu: Number(stat.mu || stat.Mu) || 25.0,
              sigma: Number(stat.sigma || stat.Sigma) || 8.333,
              matchCount: Number(stat.matchCount || stat.MatchCount) || 0,
              winCount: Number(stat.winCount || stat.WinCount) || 0,
              winRate: Number(stat.winRate || stat.WinRate) || 0
            };
          }
        });
      }
    } catch (e) {
      console.warn("Failed to fetch PlayerStats snapshots", e);
    }

    // 3. 取得所有比賽 (從 GAS + 本地快取) 用於即時推算
    const response = await fetch(`${GAS_URL}?action=getMatches`);
    let gasMatches = [];
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      const result = await response.json();
      if (result.status === 'success') {
        gasMatches = result.data;
      }
    } else {
      const text = await response.text();
      console.error("GAS returned non-JSON response:", text);
    }
    const combinedMap = new Map();
    gasMatches.forEach((m: any) => {
      const mDate = m.matchDate || getLocalDateString(m.date || m.Date);
      if (mDate === targetDate) {
        combinedMap.set(String(m.id), m);
      }
    });
    
    matchHistory.forEach((m: any) => {
      const mDate = m.matchDate || getLocalDateString(m.date || m.Date);
      if (mDate === targetDate) {
        combinedMap.set(String(m.id), m);
      }
    });

    const dailyMatches = Array.from(combinedMap.values()).sort((a: any, b: any) => 
      getSafeTime(a.date || a.Date) - getSafeTime(b.date || b.Date)
    );

    // 4. 決定初始狀態
    const dailyState: Record<string, any> = {};
    
    // 如果是「過去的日期」且有快照，則直接使用快照 (因為過去的比賽已經結算)
    // 如果是「今天」或者「沒有快照的日期」，則從 25.0 開始重新計算
    const useSnapshot = targetDate !== today && Object.keys(dailySnapshots).length > 0;

    basePlayers.forEach((p: any) => {
      if (useSnapshot && dailySnapshots[p.id]) {
        dailyState[p.name] = { 
          ...p, 
          ...dailySnapshots[p.id] 
        };
      } else {
        dailyState[p.name] = { 
          ...p, 
          mu: 25.0, 
          sigma: 8.333, 
          matchCount: 0, 
          winCount: 0, 
          winRate: 0 
        };
      }
    });

    // 5. 如果是「今天」或者「沒有快照」，則需要逐場計算以獲得最新戰力
    if (!useSnapshot) {
      dailyMatches.forEach((match: any) => {
        const team1Names = (match.team1 || []).map((p: any) => p.name || p);
        const team2Names = (match.team2 || []).map((p: any) => p.name || p);
        
        const t1p1 = dailyState[team1Names[0]];
        const t1p2 = dailyState[team1Names[1]];
        const t2p1 = dailyState[team2Names[0]];
        const t2p2 = dailyState[team2Names[1]];

        if (t1p1 && t1p2 && t2p1 && t2p2) {
          const team1Ratings = [new Rating(t1p1.mu, t1p1.sigma), new Rating(t1p2.mu, t1p2.sigma)];
          const team2Ratings = [new Rating(t2p1.mu, t2p1.sigma), new Rating(t2p2.mu, t2p2.sigma)];
          
          const winnerVal = (match.winner === 1 || match.winner === '1' || match.winner === 'Team 1') ? 1 : 2;
          const ranks = winnerVal === 1 ? [0, 1] : [1, 0];
          
          const [newTeam1, newTeam2] = rate([team1Ratings, team2Ratings], ranks);

          t1p1.mu = newTeam1[0].mu;
          t1p1.sigma = newTeam1[0].sigma;
          t1p2.mu = newTeam1[1].mu;
          t1p2.sigma = newTeam1[1].sigma;
          t2p1.mu = newTeam2[0].mu;
          t2p1.sigma = newTeam2[0].sigma;
          t2p2.mu = newTeam2[1].mu;
          t2p2.sigma = newTeam2[1].sigma;

          [t1p1, t1p2, t2p1, t2p2].forEach(p => p.matchCount++);
          if (winnerVal === 1) {
            t1p1.winCount++;
            t1p2.winCount++;
          } else {
            t2p1.winCount++;
            t2p2.winCount++;
          }
          
          [t1p1, t1p2, t2p1, t2p2].forEach(p => {
            p.winRate = p.matchCount > 0 ? Math.round((p.winCount / p.matchCount) * 100) : 0;
          });
        }
      });
    }

    const result = Object.values(dailyState);
    
    // 更新快取
    if (targetDate === today) {
      playersCache = { data: result, timestamp: Date.now() };
    }

    return result;
  } catch (error) {
    console.error("getDerivedPlayers error:", error);
    throw error;
  }
}

// API Routes
app.get('/api/players', async (req, res) => {
  const { date } = req.query;
  try {
    const players = await getDerivedPlayers(date as string);
    // 排序：戰力由高到低
    players.sort((a: any, b: any) => b.mu - a.mu);
    res.json(players);
  } catch (error) {
    console.error("Fetch players error:", error);
    res.status(500).json({ error: 'Failed to derive player stats' });
  }
});

app.post('/api/players', async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });
  try {
    const response = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'addPlayer', name })
    });
    const result = await response.json();
    if (result.status === 'success') res.json(result.data);
    else res.status(500).json({ error: result.message });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add player' });
  }
});

app.post('/api/players/batch', async (req, res) => {
  const { names } = req.body;
  if (!names || !Array.isArray(names)) return res.status(400).json({ error: 'Names required' });
  try {
    const response = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'addPlayersBatch', names })
    });
    const result = await response.json();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Batch add failed' });
  }
});

app.put('/api/players/:id', async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });
  try {
    const response = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'updatePlayer', id, name })
    });
    const result = await response.json();
    if (result.status === 'success') res.json(result.data);
    else res.status(500).json({ error: result.message });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update player' });
  }
});

app.delete('/api/players/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const response = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'deletePlayer', id })
    });
    const result = await response.json();
    if (result.status === 'success') res.json({ success: true });
    else res.status(500).json({ error: result.message });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete player' });
  }
});

// Start match route (missing previously)
app.post('/api/matches/start', (req, res) => {
  const { team1, team2, courtName, playerNames } = req.body;
  const matchId = Date.now().toString();
  console.log(`Match started on ${courtName} with players: ${playerNames?.join(', ')}`);
  res.json({ success: true, matchId });
});

// Matchmaking logic
app.post('/api/matchmake', async (req, res) => {
  const { playerIds } = req.body;
  
  if (!playerIds || playerIds.length < 4) {
    return res.status(400).json({ error: 'At least 4 players are required' });
  }

  try {
    // 核心修正：使用「推算後」的即時戰力進行配對
    const allPlayers = await getDerivedPlayers();
    let targetPlayers = allPlayers.filter((p: any) => playerIds.includes(p.id));
    
    if (targetPlayers.length < 4) {
      return res.status(400).json({ error: 'Some players were not found' });
    }

    // --- 優先權邏輯：場數少的人優先 ---
    targetPlayers.sort((a: any, b: any) => a.matchCount - b.matchCount);
    
    const groupedByCount: Record<number, any[]> = {};
    targetPlayers.forEach(p => {
      const c = p.matchCount;
      if (!groupedByCount[c]) groupedByCount[c] = [];
      groupedByCount[c].push(p);
    });

    const sortedCounts = Object.keys(groupedByCount).map(Number).sort((a, b) => a - b);
    let priorityPool: any[] = [];
    for (const count of sortedCounts) {
      priorityPool = [...priorityPool, ...groupedByCount[count]];
      if (priorityPool.length >= 4) break;
    }

    const matchmakingPool = priorityPool.slice(0, 12);
    const players = matchmakingPool;

    // 生成組合並計算品質 (使用推算出的 mu/sigma)
    // 優化：使用貪婪演算法，只針對戰力相近的球員進行配對，大幅減少計算量
    const matches: any[] = [];
    const n = players.length;

    // 1. 將球員按戰力排序
    const sortedPlayers = [...players].sort((a, b) => a.mu - b.mu);

    // 2. 尋找戰力相近的 4 人組合 (滑動視窗)
    for (let i = 0; i <= n - 4; i++) {
      const group = sortedPlayers.slice(i, i + 4);
      
      // 3. 在這 4 人中找出最佳的 2v2 分組
      const matchups = [
        [[group[0], group[3]], [group[1], group[2]]], // 最強+最弱 vs 次強+次弱
        [[group[0], group[2]], [group[1], group[3]]], // 最強+次強 vs 次弱+最弱
        [[group[0], group[1]], [group[2], group[3]]]  // 最強+次弱 vs 次強+最弱
      ];

      matchups.forEach(matchup => {
        const team1 = matchup[0].map(p => new Rating(p.mu, p.sigma));
        const team2 = matchup[1].map(p => new Rating(p.mu, p.sigma));
        const matchQuality = quality([team1, team2]);
        
        matches.push({
          team1: matchup[0],
          team2: matchup[1],
          quality: matchQuality
        });
      });
    }

    matches.sort((a, b) => b.quality - a.quality);
    res.json(matches.slice(0, 10));
  } catch (error) {
    console.error("Matchmaking error:", error);
    res.status(500).json({ error: 'Matchmaking failed' });
  }
});

app.get('/api/matches', async (req, res) => {
  const { date } = req.query;
  try {
    // 嘗試從 GAS 獲取紀錄
    const response = await fetch(`${GAS_URL}?action=getMatches${date ? `&date=${date}` : ''}`);
    
    let gasMatches = [];

    // 檢查回應是否為 JSON
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      const result = await response.json();
      if (result.status === 'success') {
        gasMatches = result.data;
      }
    } else {
      const text = await response.text();
      console.warn("GAS returned non-JSON response:", text);
    }
    
    // 使用 Map 進行去重，以 ID 為鍵
    const combinedMap = new Map();
    
    // 先放 GAS 的紀錄 (歷史資料)
    gasMatches.forEach((gm: any) => {
      if (gm.id) combinedMap.set(String(gm.id), gm);
    });
    
    // 再放記憶體中的紀錄 (可能包含剛打完尚未同步到 GAS 的最新資料)
    // 如果 ID 相同，記憶體中的資料會覆蓋 GAS 的 (通常記憶體中的資料包含更詳細的 mu 變化)
    matchHistory.forEach((m: any) => {
      if (m.id) combinedMap.set(String(m.id), m);
    });
    
    let finalMatches = Array.from(combinedMap.values());

    // 如果有日期篩選，確保最終結果只包含該日期的對戰
    if (date) {
      const filterDateStr = String(date); // 格式: YYYY-MM-DD
      finalMatches = finalMatches.filter(m => {
        const mDate = m.matchDate || getLocalDateString(m.date || m.Date);
        return mDate === filterDateStr;
      });
    }

    // 排序：日期由新到舊
    finalMatches.sort((a, b) => getSafeTime(b.date || b.Date) - getSafeTime(a.date || a.Date));
    
    res.json(finalMatches);
  } catch (error) {
    console.error("Fetch matches error:", error);
    res.json(matchHistory);
  }
});

app.get('/api/players/:id/history', async (req, res) => {
  const { id } = req.params;
  try {
    // 1. 取得所有球員基本資料
    const playersRes = await fetch(GAS_URL);
    const playersResult = await playersRes.json();
    if (playersResult.status !== 'success') throw new Error(playersResult.message);
    const player = playersResult.data.find((p: any) => String(p.id) === id);

    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    // 2. 取得所有對戰紀錄
    const matchesRes = await fetch(`${GAS_URL}?action=getMatches`);
    let gasMatches = [];
    const contentType = matchesRes.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      const result = await matchesRes.json();
      if (result.status === 'success') {
        gasMatches = result.data;
      }
    }

    // 合併記憶體中的紀錄
    const combinedMap = new Map();
    gasMatches.forEach((gm: any) => {
      if (gm.id) combinedMap.set(String(gm.id), gm);
    });
    matchHistory.forEach((m: any) => {
      if (m.id) combinedMap.set(String(m.id), m);
    });
    const allMatches = Array.from(combinedMap.values());

    // 3. 篩選該球員的對戰
    const playerMatches = allMatches.filter(m => {
      const t1 = m.team1 || [];
      const t2 = m.team2 || [];
      return t1.some((p: any) => String(p.id) === id) || t2.some((p: any) => String(p.id) === id);
    });

    // 排序：日期由舊到新 (為了計算趨勢)
    playerMatches.sort((a, b) => getSafeTime(a.date || a.Date) - getSafeTime(b.date || b.Date));

    // 4. 計算統計數據與趨勢
    let winCount = 0;
    const trend: any[] = [];
    
    playerMatches.forEach(m => {
      const t1 = m.team1 || [];
      const t2 = m.team2 || [];
      const isTeam1 = t1.some((p: any) => String(p.id) === id);
      const playerInMatch = isTeam1 ? t1.find((p: any) => String(p.id) === id) : t2.find((p: any) => String(p.id) === id);
      
      const winner = Number(m.winner);
      if ((winner === 1 && isTeam1) || (winner === 2 && !isTeam1)) {
        winCount++;
      }

      if (playerInMatch && playerInMatch.muAfter !== undefined) {
        trend.push({
          date: m.matchDate || getLocalDateString(m.date || m.Date),
          mu: playerInMatch.muAfter,
          matchId: m.id
        });
      }
    });

    // 排序回由新到舊 (為了顯示歷史列表)
    playerMatches.sort((a, b) => getSafeTime(b.date || b.Date) - getSafeTime(a.date || a.Date));

    res.json({
      player,
      stats: {
        totalMatches: playerMatches.length,
        winCount,
        lossCount: playerMatches.length - winCount,
        winRate: playerMatches.length > 0 ? (winCount / playerMatches.length * 100).toFixed(1) : 0
      },
      history: playerMatches,
      trend
    });
  } catch (error) {
    console.error("Fetch player history error:", error);
    res.status(500).json({ error: 'Failed to fetch player history' });
  }
});

app.post('/api/matches', async (req, res) => {
  const { team1, team2, winner, score, duration, matchId, date } = req.body;
  
  if (!team1 || !team2 || !winner) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // 防止重複記錄同一個 MatchId
  if (matchId && matchHistory.some(m => String(m.id) === String(matchId))) {
    console.warn(`Match ${matchId} already recorded in memory, skipping.`);
    return res.json({ success: true, message: 'Match already recorded' });
  }

  try {
    // 核心修正：使用推算後的即時戰力作為計算基礎
    const matchDate = date || getLocalDateString();
    const allPlayers = await getDerivedPlayers(matchDate);
    const getPlayer = (id: string | number) => allPlayers.find((p: any) => p.id === id);

    const t1p1 = getPlayer(team1[0]);
    const t1p2 = getPlayer(team1[1]);
    const t2p1 = getPlayer(team2[0]);
    const t2p2 = getPlayer(team2[1]);

    if (!t1p1 || !t1p2 || !t2p1 || !t2p2) {
      return res.status(400).json({ error: 'One or more players not found' });
    }

    const team1Ratings = [new Rating(t1p1.mu, t1p1.sigma), new Rating(t1p2.mu, t1p2.sigma)];
    const team2Ratings = [new Rating(t2p1.mu, t2p1.sigma), new Rating(t2p2.mu, t2p2.sigma)];

    // 計算新戰力
    const ranks = winner === 1 ? [0, 1] : [1, 0];
    const [newTeam1, newTeam2] = rate([team1Ratings, team2Ratings], ranks);

    // 準備更新資料
    const updatedPlayers = [
      { id: t1p1.id, name: t1p1.name, muBefore: t1p1.mu, muAfter: newTeam1[0].mu, mu: newTeam1[0].mu, sigma: newTeam1[0].sigma },
      { id: t1p2.id, name: t1p2.name, muBefore: t1p2.mu, muAfter: newTeam1[1].mu, mu: newTeam1[1].mu, sigma: newTeam1[1].sigma },
      { id: t2p1.id, name: t2p1.name, muBefore: t2p1.mu, muAfter: newTeam2[0].mu, mu: newTeam2[0].mu, sigma: newTeam2[0].sigma },
      { id: t2p2.id, name: t2p2.name, muBefore: t2p2.mu, muAfter: newTeam2[1].mu, mu: newTeam2[1].mu, sigma: newTeam2[1].sigma }
    ];

    // 準備 PlayerStats 更新資料 (包含勝率與場數)
    const updatePlayerStat = (p: any, newMu: number, newSigma: number, isWin: boolean) => {
      const matchCount = (p.matchCount || 0) + 1;
      const winCount = (p.winCount || 0) + (isWin ? 1 : 0);
      const winRate = Math.round((winCount / matchCount) * 100);
      return { 
        Date: matchDate, 
        ID: p.id, 
        Name: p.name, 
        Mu: newMu, 
        Sigma: newSigma, 
        MatchCount: matchCount, 
        WinCount: winCount, 
        WinRate: winRate 
      };
    };

    const updatedStats = [
      updatePlayerStat(t1p1, newTeam1[0].mu, newTeam1[0].sigma, winner === 1),
      updatePlayerStat(t1p2, newTeam1[1].mu, newTeam1[1].sigma, winner === 1),
      updatePlayerStat(t2p1, newTeam2[0].mu, newTeam2[0].sigma, winner === 2),
      updatePlayerStat(t2p2, newTeam2[1].mu, newTeam2[1].sigma, winner === 2),
    ];

    const matchRecord = {
      id: matchId || Date.now().toString(),
      date: getTaipeiDateTimeString(),
      matchDate: matchDate, // 儲存本地日期 (yyyy-MM-dd)
      team1: [
        { id: t1p1.id, name: t1p1.name, muBefore: t1p1.mu, muAfter: newTeam1[0].mu, sigma: newTeam1[0].sigma },
        { id: t1p2.id, name: t1p2.name, muBefore: t1p2.mu, muAfter: newTeam1[1].mu, sigma: newTeam1[1].sigma }
      ],
      team2: [
        { id: t2p1.id, name: t2p1.name, muBefore: t2p1.mu, muAfter: newTeam2[0].mu, sigma: newTeam2[0].sigma },
        { id: t2p2.id, name: t2p2.name, muBefore: t2p2.mu, muAfter: newTeam2[1].mu, sigma: newTeam2[1].sigma }
      ],
      winner,
      score: score || '',
      duration: duration || ''
    };

    // 更新本地快取
    matchHistory.unshift(matchRecord);
    // 限制快取大小，避免無限增長
    if (matchHistory.length > 50) matchHistory.pop();

    // 清除球員快取，確保下次前端讀取時能重新計算最新戰力
    playersCache = null;

    // 立即回應前端
    res.json({ success: true, match: matchRecord });

    // 非同步寫入 GAS
    try {
      await fetch(GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'recordMatchAndUpdate',
          matchId,
          date: matchDate,
          t1p1: t1p1.name,
          t1p2: t1p2.name,
          t2p1: t2p1.name,
          t2p2: t2p2.name,
          winnerTeam: winner === 1 ? 'Team 1' : 'Team 2',
          updatedPlayers: updatedPlayers,
          updatedStats: updatedStats,
          duration: duration || '',
          score: score || ''
        })
      });
    } catch (err) {
      console.error('Background GAS update error:', err);
    }
  } catch (error) {
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to record match' });
    }
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
