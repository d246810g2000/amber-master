import React, { useState, useMemo, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDialog } from '../context/DialogContext';
import ArrowLeft from "lucide-react/dist/esm/icons/arrow-left";
import Trophy from "lucide-react/dist/esm/icons/trophy";
import Target from "lucide-react/dist/esm/icons/target";
import Activity from "lucide-react/dist/esm/icons/activity";
import Calendar from "lucide-react/dist/esm/icons/calendar";
import Hash from "lucide-react/dist/esm/icons/hash";
import Crown from "lucide-react/dist/esm/icons/crown";
import Sparkles from "lucide-react/dist/esm/icons/sparkles";
import Edit2 from "lucide-react/dist/esm/icons/edit-2";
import Lock from "lucide-react/dist/esm/icons/lock";
import { BadmintonLoader } from "./BadmintonLoader";
import * as gasApi from '../lib/gasApi';
import { useAuth } from '../context/AuthContext';
import { getAvatarUrl } from '../lib/utils';
import { usePlayerProfile } from '../hooks/usePlayerProfile';

// Sub-components
import { StatCard } from './profile/StatCard';
const CpTrendChart = React.lazy(() => import('./profile/CpTrendChart').then(m => ({ default: m.CpTrendChart })));
import { PartnerTable } from './profile/PartnerTable';
import { MatchHistoryTable } from './profile/MatchHistoryTable';
import { AvatarEditModal } from './profile/AvatarEditModal';

interface PlayerProfileProps {
  playerId: string;
  onBack: () => void;
  onUpdate?: () => void;
}

export const PlayerProfile: React.FC<PlayerProfileProps> = ({ playerId, onBack, onUpdate }) => {
  // ─── TanStack Query 資料獲取 ───
  const profileQuery = usePlayerProfile(playerId);
  const { currentUser } = useAuth();

  // ─── UI-only 狀態 ───
  const [currentAvatarFull, setCurrentAvatarFull] = useState("");
  const [saving, setSaving] = useState(false);
  const [activeStyle, setActiveStyle] = useState('avataaars');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState("");
  const [activeTab, setActiveTab] = useState<'trend' | 'partners' | 'history'>('trend');
  const [partnerSort, setPartnerSort] = useState<{ key: string, dir: 'asc' | 'desc' }>({ key: 'winRate', dir: 'desc' });
  const [historySort, setHistorySort] = useState<{ key: string, dir: 'asc' | 'desc' }>({ key: 'date', dir: 'desc' });
  const { showAlert } = useDialog();

  // 從 query 中提取
  const profileData = profileQuery.data;
  const data = profileData?.data ?? null;
  const combinedTrend = profileData?.combinedTrend ?? [];
  const playerMap = profileData?.playerMap ?? {};
  const instantMu = profileData?.instantMu ?? null;
  const comprehensiveMu = profileData?.comprehensiveMu ?? null;

  // 初始化頭像
  const avatarInitialized = React.useRef(false);
  React.useEffect(() => {
    if (data?.player && !avatarInitialized.current) {
      avatarInitialized.current = true;
      setCurrentAvatarFull(data.player.avatar || `avataaars:${data.player.name}`);
      const style = (data.player.avatar || '').split(':')[0] || 'avataaars';
      setActiveStyle(style);
    }
  }, [data?.player]);

  // ─── Handlers ───
  const updateAvatar = async (style: string, seed: string) => {
    if (!data?.player) return;
    const newAvatar = `${style}:${seed}`;
    try {
      setSaving(true);
      await gasApi.updatePlayer(data.player.id, data.player.name, newAvatar);
      setCurrentAvatarFull(newAvatar);
      onUpdate?.();
    } catch (err) {
      showAlert("更新失敗", "無法儲存新的頭像設定。");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateName = async () => {
    if (!data?.player) return;
    if (!editName.trim() || editName === data.player.name) {
      setIsEditingName(false);
      return;
    }
    try {
      setSaving(true);
      await gasApi.updatePlayer(data.player.id, editName.trim(), currentAvatarFull);
      data.player.name = editName.trim();
      setIsEditingName(false);
      onUpdate?.();
    } catch (err) {
      showAlert("更新姓名失敗", "請確認操作是否正確或網路連線。");
    } finally {
      setSaving(false);
    }
  };

  const currentStyle = currentAvatarFull.split(':')[0];
  const currentSeed = currentAvatarFull.split(':')[1];

  // ─── Computed data (useMemo) ───
  const teammateStats = useMemo(() => {
    if (!data?.player || !data?.history) return [];
    const { player, history } = data;
    const statsMap = new Map<string, { count: number, wins: number }>();

    history.forEach(m => {
      const p1 = m.team1.find(p => p.id === player.id);
      const p2 = m.team2.find(p => p.id === player.id);
      if (!p1 && !p2) return;

      const isTeam1 = !!p1;
      const myTeam = isTeam1 ? m.team1 : m.team2;
      const isWinner = (isTeam1 && m.winner === 1) || (!isTeam1 && m.winner === 2);

      const teammate = myTeam.find(p => p.id !== player.id);
      if (teammate) {
        const s = statsMap.get(teammate.name) || { count: 0, wins: 0 };
        s.count++;
        if (isWinner) s.wins++;
        statsMap.set(teammate.name, s);
      }
    });

    return Array.from(statsMap.entries()).map(([name, s]) => ({
      name,
      count: s.count,
      wins: s.wins,
      winRate: (s.wins / s.count * 100)
    })).sort((a, b) => {
      const modifier = partnerSort.dir === 'asc' ? 1 : -1;
      const key = partnerSort.key as keyof typeof a;
      if (typeof a[key] === 'string') return (a[key] as string).localeCompare(b[key] as string) * modifier;
      return ((a[key] as number) - (b[key] as number)) * modifier;
    });
  }, [data?.history, data?.player?.id, partnerSort]);

  const matchHistory = useMemo(() => {
    if (!data?.player || !data?.history) return [];
    const { player, history } = data;

    const compMap = new Map<string, number>();
    combinedTrend.forEach(t => compMap.set(t.matchId, t.matchMu));

    const chronological = [...history].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const instantMap = new Map<string, { before: number, after: number, isInit: boolean }>();
    let lastDate = "";
    chronological.forEach(m => {
      const p1 = m.team1.find(p => p.id === player.id);
      const p2 = m.team2.find(p => p.id === player.id);
      const myP = p1 || p2;
      if (!myP) return;
      const currD = m.date?.split(' ')[0] || m.matchDate || "";
      const isNewDay = currD !== lastDate;
      const realBefore = myP.muBefore ?? 25.0;
      const realAfter = myP.muAfter ?? 25.0;
      const diff = Math.round((realAfter - realBefore) * 10);
      const effectiveBefore = isNewDay ? 250 : Math.round(realBefore * 10);
      const effectiveAfter = effectiveBefore + diff;
      instantMap.set(m.id, { before: effectiveBefore, after: effectiveAfter, isInit: isNewDay });
      lastDate = currD;
    });

    return history.map(m => {
      const p1 = m.team1.find(p => p.id === player.id);
      const p2 = m.team2.find(p => p.id === player.id);
      if (!p1 && !p2) return null;

      const isTeam1 = !!p1;
      const oppTeam = isTeam1 ? m.team2 : m.team1;
      const teammate = (isTeam1 ? m.team1 : m.team2).find(p => p.id !== player.id);
      const isWinner = (isTeam1 && m.winner === 1) || (!isTeam1 && m.winner === 2);

      const myTeam = isTeam1 ? m.team1 : m.team2;
      const oTeam = isTeam1 ? m.team2 : m.team1;
      const myTeamScore = Math.round(myTeam.reduce((acc, p) => acc + (p.muBefore ?? p.mu ?? 25), 0) * 10);
      const oppTeamScore = Math.round(oTeam.reduce((acc, p) => acc + (p.muBefore ?? p.mu ?? 25), 0) * 10);

      const trendIdx = combinedTrend.findIndex(t => t.matchId === m.id);
      const compBeforeMu = trendIdx > 0 ? combinedTrend[trendIdx - 1].matchMu : 25.0;
      const compAfterMu = compMap.get(m.id) || 25;
      const compBefore = Math.round(compBeforeMu * 10);
      const compAfter = Math.round(compAfterMu * 10);
      const compDiff = compAfter - compBefore;

      const instData = instantMap.get(m.id) || { before: 250, after: 250, isInit: true };

      return {
        id: m.id,
        date: m.date,
        teammate: teammate?.name || "-",
        opponents: oppTeam.map(p => p.name).join(" & "),
        teamIds: [...m.team1, ...m.team2].map(p => p.id),
        result: isWinner ? 'W' : 'L',
        compBefore, compAfter, compDiff,
        instantBefore: instData.before,
        instantAfter: instData.after,
        instantDiff: instData.after - instData.before,
        isInstantInit: instData.isInit,
        myTeamScore, oppTeamScore,
      };
    }).filter(Boolean).sort((a, b) => {
      const modifier = historySort.dir === 'asc' ? 1 : -1;
      const key = historySort.key as keyof typeof a;
      if (key === 'date') return (new Date(a[key] as string).getTime() - new Date(b[key] as string).getTime()) * modifier;
      if (typeof a[key] === 'string') return (a[key] as string).localeCompare(b[key] as string) * modifier;
      return ((a[key] as number) - (b[key] as number)) * modifier;
    });
  }, [data?.player, data?.history, combinedTrend, historySort]);

  const activeMatchDates = useMemo(() => {
    const dates = new Set<string>();
    matchHistory.forEach(m => {
      if (m?.date) dates.add(m.date.split(' ')[0]);
    });
    return dates;
  }, [matchHistory]);

  const currentStats = useMemo(() => {
    const sorted = [...matchHistory].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    if (sorted.length === 0) return {
      instant: Math.round((instantMu || 25) * 10),
      career: Math.round((comprehensiveMu || 25) * 10)
    };
    return { instant: sorted[0].instantAfter, career: sorted[0].compAfter };
  }, [matchHistory, instantMu, comprehensiveMu]);

  // ─── Loading / Error ───
  if (profileQuery.isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[65vh] md:min-h-[75vh]">
        <BadmintonLoader />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-20 bg-zinc-900/50 rounded-[3rem] border border-zinc-800">
        <p className="text-zinc-400 font-bold mb-6">找不到該球員資料</p>
        <button onClick={onBack} className="px-8 py-3 bg-emerald-500 text-white rounded-2xl font-black">返回大廳</button>
      </div>
    );
  }

  const { player, stats } = data;
  
  // Temporary bypass for empty email columns: If the database hasn't populated emails yet, we grant access if player.email is empty.
  // Otherwise, strict auth matching is applied.
  const isOwner = !player.email || (currentUser && currentUser.email === player.email);

  if (!isOwner) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[65vh] md:min-h-[75vh] text-center px-6 animate-in fade-in zoom-in duration-500">
        <div className="w-24 h-24 bg-zinc-900 rounded-full flex items-center justify-center mb-6 shadow-2xl border border-zinc-800">
          <Lock className="w-10 h-10 text-rose-500" />
        </div>
        <h2 className="text-2xl font-black text-white mb-2">隱私保護</h2>
        <p className="text-zinc-400 font-medium mb-8 max-w-sm leading-relaxed">
          基於隱私保護，只有 <span className="text-white font-black">{player.name}</span> 本人登入帳號後，才能解鎖並查看詳細的生涯戰力數據與對戰詳情。
        </p>
        <button onClick={onBack} className="px-8 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-2xl font-black transition-all active:scale-95 border border-zinc-700">
          返回大廳
        </button>
      </div>
    );
  }

  // ─── Render ───
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 relative">
      {/* Top Banner Header */}
      <div className="bg-zinc-950/20 backdrop-blur-xl border-b border-white/5 -mx-6 -mt-6 px-4 md:px-6 py-4 md:py-6 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3 md:gap-6">
          <button onClick={onBack} className="p-2 md:p-3 hover:bg-zinc-800 rounded-xl md:rounded-2xl transition-all text-zinc-400 hover:text-white">
            <ArrowLeft className="w-5 h-5 md:w-6 md:h-6" />
          </button>
          <h1 className="text-lg md:text-3xl font-black text-white tracking-tighter uppercase">球員資訊</h1>
        </div>
        <div className="flex items-center gap-3 md:gap-4">
          <div className="flex items-center min-w-[80px] md:min-w-[120px] justify-end">
            {isEditingName ? (
              <input
                autoFocus
                className="bg-zinc-800 border-b-2 border-emerald-500 px-2 py-0.5 text-white text-lg md:text-2xl font-black outline-none w-24 md:w-32 text-right"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={handleUpdateName}
                onKeyDown={(e) => e.key === 'Enter' && handleUpdateName()}
              />
            ) : (
              <span
                onClick={() => { setIsEditingName(true); setEditName(player.name); }}
                className="px-2 text-lg md:text-2xl font-black text-zinc-200 hover:text-white cursor-pointer transition-colors tracking-tighter"
                title="點擊修改姓名"
              >
                {player.name}
              </span>
            )}
          </div>
          <div
            onClick={() => setIsEditModalOpen(true)}
            className="w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-zinc-800 overflow-hidden border-2 border-white/10 shadow-2xl cursor-pointer hover:border-emerald-500/50 transition-all flex items-center justify-center group shrink-0"
          >
            <img
              src={getAvatarUrl(`${currentStyle}:${currentSeed}`, currentSeed)}
              alt={player.name}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform"
            />
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="flex overflow-x-auto md:grid md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-6 pb-4 sm:pb-0 scrollbar-hide snap-x snap-mandatory px-6 -mx-6 sm:px-0 sm:mx-0 touch-pan-x">
        <div className="snap-center shrink-0 w-[30vw] md:w-auto max-w-[200px] md:max-w-none">
          <StatCard icon={<Hash className="text-zinc-600 sm:w-6 sm:h-6 w-5 h-5" />} label="總場次" value={stats.totalMatches} unit="場" subValue={`W:${stats.winCount} / L:${stats.lossCount}`} />
        </div>
        <div className="snap-center shrink-0 w-[30vw] md:w-auto max-w-[200px] md:max-w-none">
          <StatCard icon={<Trophy className="text-emerald-500 sm:w-6 sm:h-6 w-5 h-5" />} label="勝率" value={stats.winRate} unit="%" />
        </div>
        <div className="snap-center shrink-0 w-[30vw] md:w-auto max-w-[200px] md:max-w-none">
          <StatCard icon={<Activity className="text-amber-500 sm:w-6 sm:h-6 w-5 h-5" />} label="即時戰力" value={currentStats.instant} subValue="當前手感與競技狀態" unit="CP" theme="amber" />
        </div>
        <div className="snap-center shrink-0 w-[30vw] md:w-auto max-w-[200px] md:max-w-none">
          <StatCard icon={<Sparkles className="text-emerald-500 sm:w-6 sm:h-6 w-5 h-5" />} label="生涯戰力" value={currentStats.career} subValue="長期穩定的技術累積" unit="CP" theme="emerald" />
        </div>
        <div className="snap-center shrink-0 w-[30vw] md:w-auto max-w-[200px] md:max-w-none">
          <StatCard icon={<Crown className="text-amber-400 saturate-150 sm:w-6 sm:h-6 w-5 h-5" />} label="最佳拍檔" value={teammateStats[0]?.name || "無"} subValue={`${teammateStats[0]?.winRate.toFixed(1) || 0}% 共同勝率`} unit="" />
        </div>
        {/* Mobile scroll spacer */}
        <div className="w-2 sm:hidden shrink-0" />
      </div>

      {/* Tab Bar */}
      <div className="flex bg-zinc-950/50 p-1.5 rounded-3xl border border-white/5 w-fit gap-1 sticky top-[88px] z-40 backdrop-blur-lg mx-auto md:mx-0 shadow-2xl">
        {[
          { id: 'trend' as const, label: '戰力趨勢', icon: <Activity size={14} /> },
          { id: 'partners' as const, label: '拍檔分析', icon: <Target size={14} /> },
          { id: 'history' as const, label: '詳細對戰', icon: <Calendar size={14} /> }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 sm:gap-2.5 px-3.5 sm:px-6 py-2 sm:py-2.5 rounded-2xl text-[11px] font-black transition-all relative ${
              activeTab === tab.id ? "text-white" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {activeTab === tab.id && (
              <motion.div
                layoutId="activeTabBg"
                className="absolute inset-0 bg-emerald-500 rounded-2xl shadow-lg shadow-emerald-500/20"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5 sm:gap-2 whitespace-nowrap">{tab.icon}{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'trend' && (
            <Suspense fallback={<div className="flex items-center justify-center h-[400px] text-zinc-500 text-sm font-bold">載入趨勢圖...</div>}>
              <CpTrendChart combinedTrend={combinedTrend} />
            </Suspense>
          )}
          {activeTab === 'partners' && (
            <PartnerTable
              teammateStats={teammateStats}
              playerMap={playerMap}
              partnerSort={partnerSort}
              setPartnerSort={setPartnerSort}
            />
          )}
          {activeTab === 'history' && (
            <MatchHistoryTable
              playerId={player.id}
              matchHistory={matchHistory}
              historySort={historySort}
              setHistorySort={setHistorySort}
              players={Object.values(playerMap)}
              activeMatchDates={activeMatchDates}
            />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Avatar Edit Modal */}
      <AvatarEditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        activeStyle={activeStyle}
        setActiveStyle={setActiveStyle}
        currentAvatarFull={currentAvatarFull}
        saving={saving}
        onSave={updateAvatar}
      />
    </div>
  );
};
