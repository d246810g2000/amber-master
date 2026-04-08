import * as dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

const GAS_URL = process.env.VITE_GAS_URL;
const GEMINI_API_KEY = process.env.VITE_GEMINI_API_KEY;

if (!GAS_URL || !GEMINI_API_KEY) {
  console.error("Missing environment variables. Please check .env");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

async function gasGet(params: Record<string, string>) {
  const url = new URL(GAS_URL!);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), { redirect: 'follow' });
  const json = await res.json();
  return json.data;
}

async function runSimulation() {
  console.log("🚀 Starting Optimized Amber AI Simulation...");
  
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  
  const [players, matches] = await Promise.all([
    gasGet({ action: 'getPlayers' }),
    gasGet({ action: 'getMatches', date: today })
  ]);

  const testPlayerName = "張銘"; // 假設我們測試張銘
  const testPlayer = players.find((p: any) => p.name === testPlayerName) || players[0];
  const testPlayerId = testPlayer.id;

  const userMatches = matches.filter((m: any) => 
    [...(m.team1 || []), ...(m.team2 || [])].some(p => p.name === testPlayer.name)
  );
  const userWins = userMatches.filter((m: any) => {
    const isTeam1 = (m.team1 || []).some((p: any) => p.name === testPlayer.name);
    return (isTeam1 && m.winner === 1) || (!isTeam1 && m.winner === 2);
  }).length;
  const userLosses = userMatches.length - userWins;

  const readyList = players.filter((p: any) => p.mu > 20).slice(0, 5).map((p: any) => `${p.name}(${p.mu.toFixed(1)})`); // 模擬備戰區

  const contextPrompt = `
你是一位精英級羽球教練（安柏羽球教練）。
現在日期：${today}
用戶姓名：${testPlayer.name}
戰力資訊: Mu ${testPlayer.mu.toFixed(2)} | 今日戰績: ${userWins}勝 ${userLosses}敗

🏀 球場局勢:
1. 備戰區 (Ready): ${readyList.join(', ')}
2. 今日對戰紀錄 (最新5場):
${userMatches.slice(-5).map((m: any) => {
  const isTeam1 = m.team1.some((p: any) => p.name === testPlayer.name);
  const resultTag = (isTeam1 && m.winner === 1) || (!isTeam1 && m.winner === 2) ? '[您勝]' : '[您敗]';
  return `- ${m.team1.map((p: any) => p.name).join('&')} vs ${m.team2.map((p: any) => p.name).join('&')} | 隊伍${m.winner}勝 ${resultTag}`;
}).join('\n')}

教練準則:
1. 在 <thought> 標籤內僅使用簡短繁體中文進行核心推理（100字內），嚴禁重複數據。
2. 直接回答核心問題，減少廢話，給出具體名單與戰術建議。
3. 語氣專業、親切且果斷。
`;

  const testQueries = [
    "分析我今天的表現與勝敗紀錄。",
    "從備戰區名單中，誰最適合當我下一個隊友？給出理由。",
    "誰是我的今日「靈魂伴侶」型隊友？分析我們配合的優勢。",
    "Amber，請用毒舌教練模式點評一下我今天的表現！",
    "預測我下一場比賽的奪冠（勝利）機率是多少？",
    "如果我在打職業聯賽，根據今天表現，你覺得我值得多少簽約金？"
  ];

  const MODELS = ["gemma-4-26b-a4b-it", "gemma-4-31b-it"];
  const finalResults: string[] = [];

  for (const query of testQueries) {
    console.log(`\n💬 Testing Query: "${query}"`);
    let responseText = "";
    try {
      const model = genAI.getGenerativeModel({ model: MODELS[0] });
      const result = await model.generateContent(contextPrompt + "\n\n用戶問題：" + query);
      responseText = result.response.text();
    } catch (err) {
      console.warn("Retrying with fallback model...");
      const model = genAI.getGenerativeModel({ model: MODELS[1] });
      const result = await model.generateContent(contextPrompt + "\n\n用戶問題：" + query);
      responseText = result.response.text();
    }
    console.log("-----------------------------------");
    console.log(responseText);
    finalResults.push(`### Q: ${query}\n\n${responseText}`);
  }

  return finalResults.join('\n\n---\n\n');
}

runSimulation().then(report => {
  console.log("\n✅ Simulation Complete.");
});
