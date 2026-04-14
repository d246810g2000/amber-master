import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, Send, X, Bot, User, Minimize2, Trash2, Trophy, TrendingUp, Users, Timer, 
  Swords, GraduationCap, Activity, Scale, Zap, Medal, Heart, Ghost, Flame, Crown, 
  Dice6, Contact, BadgeDollarSign, Star, TableProperties, Square
} from 'lucide-react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { useAuth } from '@/src/context/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { useMatches } from '@/src/hooks/useMatches';
import { usePlayerProfile, type PlayerProfileData } from '@/src/hooks/usePlayerProfile';
import type { MatchRecord } from '@/src/types';
import { getUserBinding, type UserBinding } from '@/src/lib/gasApi';
import { getTaipeiDateString, getAvatarUrl } from '@/src/lib/utils';
import { clsx } from 'clsx';
import type { DerivedPlayer } from '@/src/lib/matchEngine';
import type { PlayerStatus } from '@/src/hooks/usePlayers';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Initialize Gemini
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || '');

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface GeminiBotProps {
  players?: DerivedPlayer[];
  playerStatus?: Record<string, PlayerStatus>;
  courts?: any[];
  recommendedPlayers?: (DerivedPlayer | null)[];
}

const PROFESSIONAL_QUESTIONS = [
  { label: "總結今日戰績", icon: <Trophy className="w-4 h-4" />, query: "請總結我今天的對戰成果與勝率。" },
  { label: "排點隊友建議", icon: <Users className="w-4 h-4" />, query: "觀察備戰區名單，誰最適合當我下場的隊友？" },
  { label: "戰力趨勢分析", icon: <TrendingUp className="w-4 h-4" />, query: "根據我最近的戰力變化，分析我的進步曲線。" },
  { label: "排隊時間預測", icon: <Timer className="w-4 h-4" />, query: "現在各球場的使用情況如何？我大約還要等多久？" },
  { label: "分析最強對手", icon: <Swords className="w-4 h-4" />, query: "今天我的對手裡面，誰的戰力最高？我該如何應對？" },
  { label: "個人技術指導", icon: <GraduationCap className="w-4 h-4" />, query: "依據我今天的表現，我應該優先加強什麼技術？" },
  { label: "場地忙碌度分析", icon: <Activity className="w-4 h-4" />, query: "現在球場的人數飽和嗎？建議繼續排隊還是先休息？" },
  { label: "勝場平衡評估", icon: <Scale className="w-4 h-4" />, query: "分析我今天贏球跟輸球的情況，通常是搭檔還是對手影響較大？" },
  { label: "體能消耗觀察", icon: <Zap className="w-4 h-4" />, query: "根據我打的場次與對手強度，評估我目前的體能狀態。" },
  { label: "最佳搭檔分析", icon: <Medal className="w-4 h-4" />, query: "歷史紀錄中，我和誰搭檔的勝率最高？為什麼？" }
];

const FUN_QUESTIONS = [
  { label: "尋找今日靈魂伴侶", icon: <Heart className="w-4 h-4" />, query: "誰是我的今日「靈魂伴侶」型隊友？就是那種不用講話就懂配合的人。" },
  { label: "偵測我的球場天敵", icon: <Ghost className="w-4 h-4" />, query: "幫我看看，誰是我的今日天敵？遇到他我就沒轍的那種。" },
  { label: "教練噴我一下", icon: <Flame className="w-4 h-4" />, query: "Amber，請用毒舌教練模式點評一下我今天的表現！" },
  { label: "給我一個浮誇誇獎", icon: <Crown className="w-4 h-4" />, query: "我今天太帥了，給我一個史詩級的、超浮誇的誇獎！" },
  { label: "預測下一場機率", icon: <Dice6 className="w-4 h-4" />, query: "掐指一算，預測我下一場比賽的勝利機率是多少？" },
  { label: "生成我的球員卡", icon: <Contact className="w-4 h-4" />, query: "幫我生成今日的「球員技能卡」，用攻擊、防守、體力來評分。" },
  { label: "分析目前最強桌", icon: <TableProperties className="w-4 h-4" />, query: "看看現在場上哪一桌是「神仙打架」？哪一桌火藥味最濃？" },
  { label: "職業聯賽簽約金", icon: <BadgeDollarSign className="w-4 h-4" />, query: "如果我在打職業聯賽，根據今天表現，你覺得我值得多少簽約金？" },
  { label: "組建夢幻四人隊", icon: <Star className="w-4 h-4" />, query: "如果有大賽，請從現有的球員中選三個人組成我的夢幻 Dream Team。" },
  { label: "今日氣場強度", icon: <Sparkles className="w-4 h-4" />, query: "分析一下我目前的「氣場」，是處於巔峰還是需要充電？" }
];

export function GeminiBot({ players = [], playerStatus = {}, courts = [], recommendedPlayers = [] }: GeminiBotProps) {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [randomQuestions, setRandomQuestions] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  const { currentUser } = useAuth();
  const today = getTaipeiDateString();
  const { matches } = useMatches(today);
  const [binding, setBinding] = useState<UserBinding | null>(null);
  const [boundPlayerId, setBoundPlayerId] = useState<string | null>(null);

  useEffect(() => {
    if (messages.length === 0) {
      // Pick 2 professional and 2 fun questions
      const prof = [...PROFESSIONAL_QUESTIONS].sort(() => Math.random() - 0.5).slice(0, 2);
      const fun = [...FUN_QUESTIONS].sort(() => Math.random() - 0.5).slice(0, 2);
      setRandomQuestions([...prof, ...fun].sort(() => Math.random() - 0.5));
    }
  }, [messages.length]);

  useEffect(() => {
    if (currentUser?.email) {
      getUserBinding(currentUser.email)
        .then(b => {
          setBinding(b);
          if (b?.playerId) setBoundPlayerId(b.playerId);
        })
        .catch(err => console.error('Binding error:', err));
    }
  }, [currentUser]);

  const { data: profile } = usePlayerProfile(boundPlayerId || '');

  const displayAvatarSrc = useMemo(() => {
    if (binding?.isBound) {
      const mergedName = binding.playerName || profile?.data.player.name || currentUser?.name || '';
      const avatarStr = binding.avatar || profile?.data.player.avatar || '';
      return getAvatarUrl(avatarStr, mergedName);
    }
    return currentUser?.picture ?? '';
  }, [binding, profile?.data.player, currentUser]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsLoading(false);
    }
  };

  const handleSend = async (overrideInput?: string) => {
    const userMessage = (overrideInput || input).trim();
    if (!userMessage || isLoading) return;

    if (!overrideInput) setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    // Setup abort controller
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      // 發送前強制與後端對齊，避免閉包內仍是賽前／舊 GAS 快取（結束比賽後不必手動重整）
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['matches', today], type: 'active' }),
        queryClient.refetchQueries({ queryKey: ['players', today], type: 'active' }),
        boundPlayerId
          ? queryClient.refetchQueries({ queryKey: ['playerProfile', boundPlayerId], type: 'active' })
          : Promise.resolve(),
      ]);
      const matchesForPrompt =
        queryClient.getQueryData<MatchRecord[]>(['matches', today]) ?? matches;
      const profileForPrompt = boundPlayerId
        ? queryClient.getQueryData<PlayerProfileData>(['playerProfile', boundPlayerId]) ?? profile
        : profile;
      const playersForPrompt =
        queryClient.getQueryData<DerivedPlayer[]>(['players', today]) ?? players;

      const readyList = playersForPrompt.filter(p => playerStatus[p.id] === 'ready').map(p => `${p.name}(戰力:${(p.mu * 10).toFixed(0)})`);
      const restingList = playersForPrompt.filter(p => playerStatus[p.id] === 'resting').map(p => `${p.name}(戰力:${(p.mu * 10).toFixed(0)})`);
      const activeCourts = courts.filter(c => c.players.some((p: any) => p !== null));
      const recommended = recommendedPlayers.filter(p => p !== null).map(p => p?.name);

      const selfName =
        binding?.playerName ||
        profileForPrompt?.data?.player?.name ||
        currentUser?.name;
      const userMatches = matchesForPrompt.filter((m) => {
        if (boundPlayerId) {
          return (
            m.team1.some((p) => String(p.id) === boundPlayerId) ||
            m.team2.some((p) => String(p.id) === boundPlayerId)
          );
        }
        if (selfName) {
          return m.team1.some((p) => p.name === selfName) || m.team2.some((p) => p.name === selfName);
        }
        return false;
      });
      const userWins = userMatches.filter((m) => {
        const isTeam1 = boundPlayerId
          ? m.team1.some((p) => String(p.id) === boundPlayerId)
          : selfName
            ? m.team1.some((p) => p.name === selfName)
            : false;
        return (isTeam1 && m.winner === 1) || (!isTeam1 && m.winner === 2);
      }).length;
      const userLosses = userMatches.length - userWins;

      const contextPrompt = `
你是一位精英級羽球教練（安柏 | Coach Amber）。你的風格冷靜、專業、以戰力數據為核心，但對球友持有專業的尊重與支持。

【當前環境上下文 (內部數據)】
- 用戶: ${selfName || currentUser?.name || '匿名球友'}
- 用戶生涯戰力: ${profileForPrompt?.comprehensiveMu ? (profileForPrompt.comprehensiveMu * 10).toFixed(0) : '250'}
- 用戶今日即時戰力: ${profileForPrompt?.instantMu ? (profileForPrompt.instantMu * 10).toFixed(0) : '250'} (若為250且今日無紀錄，代表今日首場尚未開始)
- 今日紀錄: ${userWins}勝 ${userLosses}敗
- 備戰區玩家(即時): ${readyList.length > 0 ? readyList.join(', ') : '無'}
- 休息中玩家(即時): ${restingList.length > 0 ? restingList.join(', ') : '無'}
- 球場狀態: ${activeCourts.map(c => `${c.name}號場(${c.players.filter((p: any) => p).map((p: any) => p.name).join('&')})`).join(', ') || '目前全空'}
- 推薦組合(即時): ${recommended.length === 4 ? recommended.join('&') : '計算中'}

【教練準則】
1. **戰力至上**：在球場上，實力（戰力值）是唯一標準。性別修正不影響戰力計算，但應調整你的指導語氣。
2. **術語限制**：嚴禁提及 "Mu", "Mu值" 或 "CP"。一律稱為「戰力值」。
3. **即時性原則**：**生涯戰力**代表球員的長期底蘊；**即時戰力**代表球員今日的手感與爆發力。在分析「今日推薦隊友」、「勝率預測」或「對戰點評」時，**請務必以「即時戰力」為核心判斷依據**。
4. **隱私守則**：嚴禁在正式回覆中 echo 或羅列後端上下文。將數據轉化為自然的專業建議。
5. **思考規範**：所有分析推導必須放在 <thought> 標籤內，且在標籤前嚴禁輸出任何文字。
6. **行動導向**：如果球場目前全空，請主動詢問用戶是否要安排下一場對戰。
`;

      const MODELS = ["gemma-4-26b-a4b-it", "gemma-4-31b-it"];
      
      // Prepare chat history for persistent context
      const chatHistory = messages.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }));

      let result;
      try {
        const model = genAI.getGenerativeModel({ model: MODELS[0] });
        // Use history to maintain the adjusted tone (e.g. after identity correction)
        result = await model.generateContentStream({ 
          contents: [
            ...chatHistory,
            { role: 'user', parts: [{ text: contextPrompt + "\n\n用戶最新問題：" + userMessage }] }
          ] 
        });
      } catch (err) {
        if (controller.signal.aborted) return;
        console.warn('Fallback to 31B...', err);
        const model = genAI.getGenerativeModel({ model: MODELS[1] });
        result = await model.generateContentStream({ 
          contents: [
            ...chatHistory,
            { role: 'user', parts: [{ text: contextPrompt + "\n\n用戶最新問題：" + userMessage }] }
          ] 
        });
      }

      let fullText = '';
      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);
      for await (const chunk of result.stream) {
        if (controller.signal.aborted) break;
        fullText += chunk.text();
        setMessages(prev => [...prev.slice(0, -1), { role: 'assistant', content: fullText }]);
      }
    } catch (error: any) {
      if (error.name === 'AbortError' || controller.signal.aborted) return;
      setMessages(prev => [...prev, { role: 'assistant', content: `API Error: ${error?.message || '未知錯誤'}` }]);
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
      setIsLoading(false);
    }
  };

  // 注入自定義動畫 CSS
  const animationStyles = `
    @keyframes gemini-rotate {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    .gemini-loader {
      position: absolute;
      inset: -2px;
      border-radius: 50%;
      background: conic-gradient(from 0deg, transparent 30%, #fbbf24 70%, #f59e0b 85%, transparent 100%);
      -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 2.5px), black 100%);
      mask: radial-gradient(farthest-side, transparent calc(100% - 2px), black 100%);
      animation: gemini-rotate 1.2s linear infinite;
      filter: blur(0.5px);
    }
  `;

  const renderMessageContent = (content: string) => {
    const hasThoughtEnd = content.includes('</thought>');
    
    let thoughtProcess = "";
    let rawAnswer = "";

    if (hasThoughtEnd) {
      const parts = content.split('</thought>');
      thoughtProcess = parts[0];
      rawAnswer = parts.slice(1).join('</thought>').trim();
    } else {
      thoughtProcess = content;
      rawAnswer = "";
    }

    thoughtProcess = thoughtProcess.replace(/<thought>/g, '').trim();

    // If it's streaming and we haven't seen </thought>, or if it's completely empty but we are waiting.
    const isThinkingInProgress = !hasThoughtEnd && content.length > 0;

    return (
      <div className="space-y-3 prose prose-sm max-w-none">
        {thoughtProcess && (
          <details className="group rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50/50 dark:bg-white/5 overflow-hidden transition-all duration-300">
            <summary className="flex items-center gap-2 px-3 py-2 text-[10px] text-zinc-500 dark:text-white/30 cursor-pointer hover:bg-zinc-100 dark:hover:bg-white/5 list-none select-none outline-none">
              <Sparkles className={clsx("h-3 w-3", isThinkingInProgress && "animate-pulse text-amber-500")} />
              <span className={clsx(isThinkingInProgress && "animate-pulse")}>
                {isThinkingInProgress ? "安柏教練正在分析中..." : "查看安柏教練的分析過程"}
              </span>
            </summary>
            <div className="max-h-[200px] overflow-y-auto custom-scrollbar px-3 pb-3 pt-1 text-[11px] text-zinc-600 dark:text-white/40 italic border-t border-zinc-200 dark:border-white/5 bg-zinc-100/30 dark:bg-black/20 font-light leading-relaxed whitespace-pre-wrap">
              {thoughtProcess}
              {isThinkingInProgress && <span className="inline-block w-1.5 h-3 ml-1 bg-amber-500/50 animate-pulse align-middle" />}
            </div>
          </details>
        )}
        
        {rawAnswer && (
          <div className="markdown-content">
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]}
              components={{
                table: ({node, ...props}) => (
                  <div className="overflow-x-auto my-3 rounded-lg border border-zinc-200 dark:border-white/10 shadow-sm">
                    <table className="min-w-full divide-y divide-zinc-200 dark:divide-white/10 bg-white dark:bg-white/5" {...props} />
                  </div>
                ),
                th: ({node, ...props}) => <th className="px-3 py-2 text-left text-[11px] font-bold text-amber-700 dark:text-amber-500 bg-zinc-50 dark:bg-white/5" {...props} />,
                td: ({node, ...props}) => <td className="px-3 py-1.5 text-[11px] text-zinc-700 dark:text-zinc-300 border-t border-zinc-100 dark:border-white/5" {...props} />,
                ul: ({node, ...props}) => <ul className="list-disc list-inside space-y-1.5 my-2 text-zinc-700 dark:text-zinc-200" {...props} />,
                li: ({node, ...props}) => <li className="text-[13px]" {...props} />,
                p: ({node, ...props}) => <p className="text-[13px] leading-relaxed mb-3 last:mb-0 text-zinc-800 dark:text-zinc-100" {...props} />,
                strong: ({node, ...props}) => <strong className="text-amber-600 dark:text-amber-400 font-bold" {...props} />,
                h1: ({node, ...props}) => <h1 className="text-lg font-bold text-zinc-900 dark:text-white mt-4 mb-2" {...props} />,
                h2: ({node, ...props}) => <h2 className="text-base font-bold text-zinc-900 dark:text-white mt-3 mb-1" {...props} />,
                blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-amber-500 pl-4 py-1 my-3 bg-amber-500/5 text-zinc-700 dark:text-zinc-300 italic rounded-r" {...props} />,
              }}
            >
              {rawAnswer}
            </ReactMarkdown>
          </div>
        )}
      </div>
    );
  };

  if (!currentUser) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="mb-4 w-[350px] sm:w-[400px] h-[550px] flex flex-col overflow-hidden rounded-2xl border border-zinc-200 dark:border-white/20 bg-white/95 dark:bg-black/80 shadow-2xl backdrop-blur-xl transition-colors duration-300"
          >
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-white/10 px-4 py-3 bg-zinc-50/50 dark:bg-white/5">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-orange-600 shadow-lg">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-zinc-800 dark:text-white">安柏羽球教練</h3>
                  <p className="text-[10px] text-zinc-500 dark:text-white/50 font-medium">您的專業球場戰術大腦</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => setMessages([])} className="p-2 text-zinc-400 hover:text-amber-600 dark:text-white/40 dark:hover:text-white transition-colors" title="清空對話"><Trash2 className="h-4 w-4" /></button>
                <button onClick={() => setIsOpen(false)} className="p-2 text-zinc-400 hover:text-zinc-600 dark:text-white/40 dark:hover:text-white transition-colors"><Minimize2 className="h-4 w-4" /></button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar scroll-smooth">
              {messages.length === 0 && (
                <div className="flex flex-col h-full space-y-6 pt-4">
                  <div className="px-2">
                    <h2 className="text-xl font-semibold text-zinc-800 dark:text-white/90 mb-1 leading-tight">安柏教練，<br />今天想聊聊場邊戰術嗎？</h2>
                    <p className="text-sm text-zinc-500 dark:text-white/40 font-light italic">我是安柏，您的專屬球場掛名教練</p>
                  </div>
                  <div className="flex flex-col gap-2">
                    {randomQuestions.map((q, i) => (
                      <button key={i} onClick={() => handleSend(q.query)} className="flex items-center gap-3 w-full px-4 py-3 rounded-xl bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-white/70 hover:bg-zinc-50 dark:hover:bg-white/10 hover:text-amber-600 dark:hover:text-white hover:border-amber-500/30 dark:hover:border-amber-500/30 transition-all text-sm group shadow-sm hover:shadow-md">
                        <div className="p-1.5 rounded-lg bg-zinc-100 dark:bg-white/5 group-hover:bg-amber-500/20 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors uppercase">{q.icon}</div>
                        <span className="font-medium">{q.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map((msg, i) => {
                const isStreaming = isLoading && i === messages.length - 1 && msg.role === 'assistant';
                
                return (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key={i} className={clsx("flex gap-3", msg.role === 'user' ? "flex-row-reverse" : "flex-row")}>
                    <div className="relative shrink-0 h-8 w-8 flex-none">
                      {isStreaming && (
                        <div className="gemini-loader" />
                      )}
                      <div className={clsx(
                        "relative flex w-full h-full items-center justify-center rounded-full shadow-inner overflow-hidden border border-white/10",
                        msg.role === 'user' ? "bg-zinc-100 dark:bg-white/10" : "bg-white dark:bg-zinc-900 text-amber-600 dark:text-amber-400"
                      )}>
                        {msg.role === 'user' ? (
                          displayAvatarSrc ? (
                            <img src={displayAvatarSrc} alt="User" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <User className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
                          )
                        ) : <Sparkles className={clsx("h-4 w-4", isStreaming && "animate-pulse")} />}
                      </div>
                    </div>
                    <div className={clsx("max-w-[85%] rounded-2xl px-4 py-2 text-sm shadow-sm", msg.role === 'user' ? "bg-amber-600 text-white" : "bg-white dark:bg-white/10 border border-zinc-200 dark:border-white/10")}>
                      <style>{animationStyles}</style>
                      {msg.role === 'user' ? msg.content : renderMessageContent(msg.content)}
                    </div>
                  </motion.div>
                );
              })}
              <div ref={messagesEndRef} className="h-px" />
            </div>

            <div className="p-4 border-t border-zinc-100 dark:border-white/10 bg-zinc-50/50 dark:bg-white/5">
              <div className="relative flex items-center">
                <input 
                  type="text" 
                  value={input} 
                  onChange={(e) => setInput(e.target.value)} 
                  onKeyDown={(e) => e.key === 'Enter' && !e.nativeEvent.isComposing && handleSend()} 
                  placeholder={isLoading ? "安柏教練正在思考..." : "問問安柏教練..."} 
                  disabled={isLoading} 
                  className="w-full rounded-xl bg-white dark:bg-white/10 border border-zinc-200 dark:border-white/20 py-3 pl-4 pr-12 text-sm text-zinc-800 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-amber-500/50 disabled:opacity-50 transition-all shadow-sm" 
                />
                <button 
                  onClick={() => isLoading ? handleStop() : handleSend()} 
                  disabled={!isLoading && !input.trim()} 
                  className={clsx(
                    "absolute right-2 p-2 rounded-lg shadow-lg h-10 w-10 flex items-center justify-center transition-all",
                    isLoading ? "bg-red-500 hover:bg-red-600" : "bg-amber-600 hover:bg-amber-700 disabled:opacity-30"
                  )}
                  title={isLoading ? "停止生成" : "發送訊息"}
                >
                  {isLoading ? <Square className="h-4 w-4 fill-current text-white" /> : <Send className="h-4 w-4 text-white" />}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setIsOpen(!isOpen)} className={clsx("flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-colors border-2 border-white/10", isOpen ? "bg-white text-amber-600" : "bg-gradient-to-br from-amber-400 to-orange-600 text-white")}>
        <Sparkles className="h-6 w-6" />
      </motion.button>
    </div>
  );
}
