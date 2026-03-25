import React, { useState, useMemo, Suspense } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
import ShieldCheck from "lucide-react/dist/esm/icons/shield-check";
import UserPlus from "lucide-react/dist/esm/icons/user-plus";
import Share2 from "lucide-react/dist/esm/icons/share-2";
import { BadmintonLoader } from "./BadmintonLoader";
import * as gasApi from '../lib/gasApi';
import { useAuth } from '../context/AuthContext';
import { getAvatarUrl, isGoogleAvatarString, cn } from '../lib/utils';
import { usePlayerProfile } from '../hooks/usePlayerProfile';

// Sub-components
import { StatCard } from './profile/StatCard';
const CpTrendChart = React.lazy(() => import('./profile/CpTrendChart').then(m => ({ default: m.CpTrendChart })));
import { PartnerTable } from './profile/PartnerTable';
import { MatchHistoryTable } from './profile/MatchHistoryTable';
import { AvatarEditModal } from './profile/AvatarEditModal';
import { ShareModal } from './share/ShareModal';

interface PlayerProfileProps {
  playerId: string;
  onBack: () => void;
  onUpdate?: () => void;
}

export const PlayerProfile: React.FC<PlayerProfileProps> = ({ playerId, onBack, onUpdate }) => {
  // ─── TanStack Query 資料獲取 ───
  const queryClient = useQueryClient();
  const profileQuery = usePlayerProfile(playerId);
  const { currentUser, loginWithUser } = useAuth();
  const { showAlert, showInput } = useDialog();

  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        const userInfo = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
        }).then(res => res.json());

        loginWithUser({
          email: userInfo.email,
          name: userInfo.name,
          picture: userInfo.picture,
          token: tokenResponse.access_token,
        });
      } catch (err) {
        console.error('Failed to get user info:', err);
      }
    },
    onError: (error) => console.error('Login Failed:', error),
  });

  // ─── 密碼連動 Session ───
  const [sessionPassword, setSessionPassword] = useState<string | null>(() => {
    const stored = localStorage.getItem('player_passwords');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        return parsed[playerId] || null;
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  const syncHeaderUserBinding = () => {
    queryClient.invalidateQueries({ queryKey: ['userBinding'] });
    queryClient.invalidateQueries({ queryKey: ['playerBinding', playerId] });
    queryClient.invalidateQueries({ queryKey: ['passwordBinding', playerId] });
    queryClient.invalidateQueries({ queryKey: ['playerProfile', playerId] });
    queryClient.invalidateQueries({ queryKey: ['players-base'] });
    queryClient.invalidateQueries({ queryKey: ['players'] });
  };
  const googleBindingQuery = useQuery({
    queryKey: ['playerBinding', playerId, currentUser?.email || 'anonymous'],
    queryFn: () => gasApi.getPlayerBinding(playerId, currentUser!.email),
    enabled: !!currentUser?.email,
    staleTime: 60_000,
  });

  const passwordBindingQuery = useQuery({
    queryKey: ['passwordBinding', playerId, sessionPassword || 'none'],
    queryFn: () => gasApi.getPlayerBinding(playerId, sessionPassword!),
    enabled: !!sessionPassword,
    staleTime: 60_000,
  });
  const userBindingQuery = useQuery({
    queryKey: ['userBinding', currentUser?.email || 'anonymous'],
    queryFn: () => gasApi.getUserBinding(currentUser!.email),
    enabled: !!currentUser?.email,
    staleTime: 60_000,
  });

  const handleDecrypt = () => {
    showInput("數據解密", "請輸入此球員的自訂密碼：", async (password) => {
      if (!password) return;
      if (password.includes('@')) {
        showAlert("格式錯誤", "自訂密碼不能包含 '@' 符號。");
        return;
      }
      try {
        setSaving(true);
        // 這邊直接測試綁定，若密碼正確（或是新設定）則會成功
        await gasApi.bindPlayer(playerId, password);
        
        // 儲存到本地
        const stored = JSON.parse(localStorage.getItem('player_passwords') || '{}');
        stored[playerId] = password;
        localStorage.setItem('player_passwords', JSON.stringify(stored));
        
        setSessionPassword(password);
        await syncHeaderUserBinding();
        showAlert("解密成功", "已成功解密。您可以查看詳細統計數據了。");
        onUpdate?.();
      } catch (err: any) {
        showAlert("解密失敗", err.message || "密碼錯誤或發生連線問題。");
      } finally {
        setSaving(false);
      }
    });
  };

  const handleLogoutSession = () => {
    const stored = JSON.parse(localStorage.getItem('player_passwords') || '{}');
    delete stored[playerId];
    localStorage.setItem('player_passwords', JSON.stringify(stored));
    setSessionPassword(null);
    showAlert("已解除授權", "已清除此瀏覽器的解密紀錄。");
  };

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
  const [bindingNow, setBindingNow] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  // 從 query 中提取
  const profileData = profileQuery.data;
  const data = profileData?.data ?? null;
  const combinedTrend = profileData?.combinedTrend ?? [];
  const playerMap = profileData?.playerMap ?? {};
  const instantMu = profileData?.instantMu ?? null;
  const comprehensiveMu = profileData?.comprehensiveMu ?? null;

  // 與後端資料同步頭像（含 Google / 自訂）
  React.useEffect(() => {
    if (!data?.player) return;
    const av = data.player.avatar || '';
    if (isGoogleAvatarString(av)) {
      setCurrentAvatarFull(av);
      setActiveStyle('avataaars');
    } else {
      setCurrentAvatarFull(av || `avataaars:${data.player.name}`);
      const style = (av || '').split(':')[0] || 'avataaars';
      setActiveStyle(style);
    }
  }, [data?.player?.id, data?.player?.avatar, data?.player?.name]);

  // ─── Handlers ───
  const updateAvatar = async (style: string, seed: string) => {
    if (!data?.player) return;
    const newAvatar = `${style}:${seed}`;
    try {
      setSaving(true);
      await gasApi.updatePlayer(data.player.id, data.player.name, newAvatar);
      setCurrentAvatarFull(newAvatar);
      data.player.avatar = newAvatar;
      syncHeaderUserBinding();
      onUpdate?.();
    } catch (err) {
      showAlert("更新失敗", "無法儲存新的頭像設定。");
    } finally {
      setSaving(false);
    }
  };

  const handleUseGoogleAvatar = async () => {
    if (!data?.player) return;
    if (!currentUser?.picture) {
      showAlert('無法取得 Google 頭像', '請先使用 Google 登入。');
      return;
    }
    try {
      setSaving(true);
      const googleStr = `google|${currentUser.picture}`;
      await gasApi.updatePlayer(data.player.id, data.player.name, googleStr);
      setCurrentAvatarFull(googleStr);
      data.player.avatar = googleStr;
      syncHeaderUserBinding();
      onUpdate?.();
    } catch (err) {
      showAlert('更新失敗', '無法儲存 Google 頭像設定。');
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
      syncHeaderUserBinding();
      onUpdate?.();
    } catch (err) {
      showAlert("更新姓名失敗", "請確認操作是否正確或網路連線。");
    } finally {
      setSaving(false);
    }
  };

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
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white dark:bg-slate-950 transition-colors">
        <BadmintonLoader />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-20 bg-slate-50 dark:bg-slate-900/50 rounded-[3rem] border border-slate-200 dark:border-slate-800 transition-colors">
        <p className="text-slate-500 dark:text-slate-400 font-bold mb-6">找不到該球員資料</p>
        <button onClick={onBack} className="px-8 py-3 bg-emerald-500 text-white rounded-2xl font-black">返回大廳</button>
      </div>
    );
  }

  const { player, stats } = data;

  const isGoogleAvatar = isGoogleAvatarString(currentAvatarFull);
  const currentStyle = isGoogleAvatar
    ? activeStyle
    : (currentAvatarFull.split(':')[0] || 'avataaars');
  const currentSeed = isGoogleAvatar
    ? player.name
    : (currentAvatarFull.split(':')[1] || player.name);
  
  // isOwner if: 
  // 1. Backend confirms ownership (Google OR Password)
  const isOwner = !!googleBindingQuery.data?.isOwner || !!passwordBindingQuery.data?.isOwner;
  const ownerCheckLoading = (!!currentUser?.email && googleBindingQuery.isLoading)
                         || (!!sessionPassword && passwordBindingQuery.isLoading);

  const canQuickBind = !googleBindingQuery.data?.isBound && !userBindingQuery.data?.isBound && !player.hasBinding;

  const handleBindAndEnter = async () => {
    if (!currentUser?.email || !player?.id) {
      showAlert("請先登入", "請先使用 Google 登入後再進行綁定。");
      return;
    }
    try {
      setBindingNow(true);
      
      // 如果目前是透過密碼存取 (sessionPassword 為真且非正式 Email)，先嘗試解除目前密碼綁定
      if (sessionPassword && !player.isGoogleLinked) {
        try {
          await gasApi.unbindPlayer(player.id, sessionPassword);
        } catch (err) {
          console.warn('Silent unbind failed:', err);
        }
      }
      
      await gasApi.bindPlayer(player.id, currentUser.email);
      
      // 綁定成功後，清除本地儲存的此球員密碼 (如果有)
      try {
        const stored = JSON.parse(localStorage.getItem('player_passwords') || '{}');
        if (stored[player.id]) {
          delete stored[player.id];
          localStorage.setItem('player_passwords', JSON.stringify(stored));
        }
        setSessionPassword(null);
      } catch (e) {
        console.warn('Failed to cleanup local password:', e);
      }

      await Promise.all([
        googleBindingQuery.refetch(),
        passwordBindingQuery.refetch(),
        userBindingQuery.refetch(),
        profileQuery.refetch(),
      ]);
      syncHeaderUserBinding();
      onUpdate?.();
    } catch (err) {
      const e = err as Error & { code?: string };
      if (e.code === 'ALREADY_BOUND_TO_OTHER_PLAYER') {
        showAlert("綁定失敗", "你的帳號已綁定其他球員，請先解除原綁定。");
      } else if (e.code === 'PLAYER_ALREADY_BOUND') {
        showAlert("綁定失敗", "此球員已被其他使用者綁定。");
      } else {
        showAlert("綁定失敗", e.message || "無法完成綁定，請稍後再試。");
      }
    } finally {
      setBindingNow(false);
    }
  };

  if (ownerCheckLoading) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white dark:bg-slate-950 transition-colors">
        <BadmintonLoader />
      </div>
    );
  }

  // ─── Render ───
  const canEdit = isOwner || !player.hasBinding;
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 relative">
      {/* Top Banner Header */}
      <div className="bg-slate-50/80 dark:bg-slate-950/20 backdrop-blur-xl border-b border-slate-100 dark:border-white/5 -mx-6 -mt-6 px-4 md:px-6 py-4 md:py-6 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3 md:gap-6">
          <button onClick={onBack} className="p-2 md:p-3 hover:bg-white dark:hover:bg-slate-800 rounded-xl md:rounded-2xl transition-all text-slate-400 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white border border-transparent hover:border-slate-100 dark:hover:border-white/5">
            <ArrowLeft className="w-5 h-5 md:w-6 md:h-6" />
          </button>
          <div className="flex flex-col">
            <h1 className="text-lg md:text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase leading-none">球員資訊</h1>
            {/* 密碼授權狀態小按鈕：含「轉為正式綁定」選項 */}
            {isOwner && sessionPassword && (
              <div className="mt-1 flex items-center gap-2">
                <button
                  onClick={handleLogoutSession}
                  className="flex items-center gap-1 text-[10px] font-black text-slate-400 hover:text-rose-500 transition-colors uppercase tracking-widest border-r border-slate-200 dark:border-white/10 pr-2"
                >
                  <ShieldCheck size={10} className="text-emerald-500" />
                  已解密 (登出)
                </button>
                {/* 如果目前有 Google 帳號且尚未正式綁定，則可以「升級」 */}
                {currentUser?.email && !userBindingQuery.data?.isBound && !player.isGoogleLinked && (
                  <button
                    onClick={handleBindAndEnter}
                    disabled={bindingNow}
                    className="flex items-center gap-1 text-[10px] font-black text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 transition-colors uppercase tracking-widest pr-2 border-r border-slate-200 dark:border-white/10 last:border-0"
                    title="將此帳號正式綁定到 Google"
                  >
                    <UserPlus size={10} />
                    {bindingNow ? '綁定中...' : '轉為 Google 正式綁定'}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 md:gap-4">
          <div className="flex items-center min-w-[80px] md:min-w-[120px] justify-end">
            {isEditingName ? (
              <input
                autoFocus
                className="bg-white dark:bg-slate-800 border-b-2 border-emerald-500 px-2 py-0.5 text-slate-900 dark:text-white text-lg md:text-2xl font-black outline-none w-24 md:w-32 text-right rounded-t-lg"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={handleUpdateName}
                onKeyDown={(e) => e.key === 'Enter' && handleUpdateName()}
              />
            ) : (
              <span
                onClick={() => { 
                  if (canEdit) {
                    setIsEditingName(true); 
                    setEditName(player.name); 
                  } else {
                    showAlert("權限限制", `只有 ${player.name} 本人才能修改姓名。`);
                  }
                }}
                className={`px-2 text-lg md:text-2xl font-black text-slate-700 dark:text-zinc-200 ${canEdit ? 'hover:text-slate-900 dark:hover:text-white cursor-pointer' : 'opacity-80'} transition-colors tracking-tighter`}
                title={canEdit ? "點擊修改姓名" : "已綁定，無法修改"}
              >
                {player.name}
              </span>
            )}
          </div>
          <div
            onClick={() => {
              if (canEdit) {
                setIsEditModalOpen(true);
              } else {
                showAlert("權限限制", `只有 ${player.name} 本人才能修改頭像。`);
              }
            }}
            className={`w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-white dark:bg-zinc-800 overflow-hidden border-2 border-slate-100 dark:border-white/10 shadow-lg ${canEdit ? 'cursor-pointer hover:border-emerald-500/50' : 'opacity-80'} transition-all flex items-center justify-center group shrink-0`}
            title={canEdit ? "點擊修改頭像" : "已綁定，無法修改"}
          >
            <img
              src={getAvatarUrl(currentAvatarFull, player.name)}
              alt={player.name}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform"
              referrerPolicy="no-referrer"
            />
          </div>
          <button
            onClick={() => setIsShareModalOpen(true)}
            disabled={!isOwner}
            className={cn(
              "p-2 md:p-3 rounded-xl md:rounded-2xl transition-all border flex items-center gap-2",
              isOwner 
                ? "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:border-emerald-500/40 active:scale-95" 
                : "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700 cursor-not-allowed opacity-60"
            )}
            title={!isOwner ? "僅本人可分享戰績" : "分享戰績"}
          >
            <Share2 className="w-5 h-5" />
            <span className="hidden sm:inline text-xs font-black uppercase">分享戰績</span>
            {!isOwner && <Lock size={12} className="opacity-60" />}
          </button>
        </div>
      </div>



      {/* Stats Grid */}
      <div className="flex overflow-x-auto md:grid md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-6 pb-4 sm:pb-0 scrollbar-hide snap-x snap-mandatory px-6 -mx-6 sm:px-0 sm:mx-0 touch-pan-x">
        <div className="snap-center shrink-0 w-[30vw] md:w-auto max-w-[200px] md:max-w-none">
          <StatCard 
            icon={<Hash className={`${isOwner ? 'text-zinc-600' : 'text-slate-400'} sm:w-6 sm:h-6 w-5 h-5`} />} 
            label="總場次" 
            value={isOwner ? stats.totalMatches : "---"} 
            unit={isOwner ? "場" : ""} 
            subValue={isOwner ? `W:${stats.winCount} / L:${stats.lossCount}` : "受保護數據"} 
            theme={isOwner ? "zinc" : "zinc"}
          />
        </div>
        <div className="snap-center shrink-0 w-[30vw] md:w-auto max-w-[200px] md:max-w-none">
          <StatCard 
            icon={<Trophy className={`${isOwner ? 'text-emerald-500' : 'text-slate-400'} sm:w-6 sm:h-6 w-5 h-5`} />} 
            label="勝率" 
            value={isOwner ? stats.winRate : "---"} 
            unit={isOwner ? "%" : ""} 
            subValue={!isOwner ? "請先解鎖" : undefined}
            theme={isOwner ? "emerald" : "zinc"}
          />
        </div>
        <div className="snap-center shrink-0 w-[30vw] md:w-auto max-w-[200px] md:max-w-none">
          <StatCard 
            icon={<Activity className={`${isOwner ? 'text-amber-500' : 'text-slate-400'} sm:w-6 sm:h-6 w-5 h-5`} />} 
            label="即時戰力" 
            value={isOwner ? currentStats.instant : "---"} 
            subValue={isOwner ? "當前手感與競技狀態" : "暫無權限查看"} 
            unit={isOwner ? "CP" : ""} 
            theme={isOwner ? "amber" : "zinc"} 
          />
        </div>
        <div className="snap-center shrink-0 w-[30vw] md:w-auto max-w-[200px] md:max-w-none">
          <StatCard 
            icon={<Sparkles className={`${isOwner ? 'text-emerald-500' : 'text-slate-400'} sm:w-6 sm:h-6 w-5 h-5`} />} 
            label="生涯戰力" 
            value={isOwner ? currentStats.career : "---"} 
            subValue={isOwner ? "長期穩定的技術累積" : "請先登入帳號以解鎖"} 
            unit={isOwner ? "CP" : ""}
            theme={isOwner ? "emerald" : "zinc"} 
          />
        </div>
        <div className="snap-center shrink-0 w-[30vw] md:w-auto max-w-[200px] md:max-w-none">
          <StatCard 
            icon={<Crown className={`${isOwner ? 'text-amber-400 saturate-150' : 'text-slate-400'} sm:w-6 sm:h-6 w-5 h-5`} />} 
            label="最佳拍檔" 
            value={isOwner ? (teammateStats[0]?.name || "無") : "---"} 
            subValue={isOwner ? `${teammateStats[0]?.winRate.toFixed(1) || 0}% 共同勝率` : "需本人解鎖"} 
            unit="" 
            theme={isOwner ? "amber" : "zinc"}
          />
        </div>
        {/* Mobile scroll spacer */}
        <div className="w-2 sm:hidden shrink-0" />
      </div>

      {/* Tab Bar */}
      <div className="flex bg-slate-100/80 dark:bg-zinc-950/50 p-1.5 rounded-3xl border border-slate-200 dark:border-white/5 w-fit gap-1 sticky top-[88px] z-40 backdrop-blur-lg mx-auto md:mx-0 shadow-xl dark:shadow-2xl transition-all">
        {[
          { id: 'trend' as const, label: '戰力趨勢', icon: <Activity size={14} /> },
          { id: 'partners' as const, label: '拍檔分析', icon: <Target size={14} /> },
          { id: 'history' as const, label: '詳細對戰', icon: <Calendar size={14} /> }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 sm:gap-2.5 px-3.5 sm:px-6 py-2 sm:py-2.5 rounded-2xl text-[11px] font-black transition-all relative ${
              activeTab === tab.id ? "text-white" : "text-slate-500 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-zinc-300"
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
          {!isOwner ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-6 bg-slate-50/50 dark:bg-slate-900/30 rounded-[3rem] border border-slate-200/50 dark:border-white/5 shadow-inner">
              <div className="w-16 h-16 bg-white dark:bg-slate-900 rounded-2xl flex items-center justify-center mb-4 shadow-xl border border-slate-100 dark:border-white/5">
                <Lock className="w-8 h-8 text-rose-500" />
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">數據受保護</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-6 max-w-xs leading-relaxed uppercase tracking-wider">
                只有 <span className="text-slate-900 dark:text-white font-black">{player.name}</span> 本人綁定帳號後<br/>才能查看詳細趨勢圖與對戰紀錄
              </p>
              <div className="flex flex-col items-center gap-4">
                {canQuickBind && (
                  <div className="flex flex-col items-center gap-3">
                    {!currentUser ? (
                      <button
                        onClick={() => handleGoogleLogin()}
                        className="px-6 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-xs font-black transition-all active:scale-95 border border-slate-700 dark:border-slate-200 shadow-lg flex items-center gap-2"
                      >
                        <div className="w-4 h-4 rounded-full bg-white flex items-center justify-center overflow-hidden shrink-0">
                          <svg viewBox="0 0 24 24" className="w-3 h-3">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-1 .67-2.28 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                            <path d="M5.84 14.09c-.22-.67-.35-1.39-.35-2.09s.13-1.42.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                          </svg>
                        </div>
                        Google 登入並綁定
                      </button>
                    ) : (
                      <button
                        onClick={handleBindAndEnter}
                        disabled={bindingNow}
                        className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black transition-all active:scale-95 border border-emerald-400/20 disabled:opacity-50 shadow-lg shadow-emerald-500/20"
                      >
                        {bindingNow ? '綁定中...' : '使用 Google 帳號綁定此球員'}
                      </button>
                    )}
                  </div>
                )}
                
                {/* 訪客解鎖：設定或輸入密碼 */}
                {!isOwner && !player.isGoogleLinked && (
                  <div className="flex flex-col items-center gap-3">
                    <button
                      onClick={handleDecrypt}
                      className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-white rounded-xl text-xs font-black transition-all active:scale-95 border border-amber-400/20 shadow-lg shadow-amber-500/20"
                    >
                      {player.hasBinding ? '點此輸入密碼解鎖數據' : '設定自訂解鎖密碼 (訪客適用)'}
                    </button>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter text-center max-w-[240px]">
                      {player.hasBinding 
                        ? '輸入自訂解鎖密碼' 
                        : '設定後僅需此密碼即可在此瀏覽器解鎖查看數據'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
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
            </>
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
        isOwner={isOwner}
        currentUser={currentUser}
        isGoogleAvatar={isGoogleAvatar}
        onUseGoogleAvatar={handleUseGoogleAvatar}
      />

      {/* Share Modal */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        player={player}
        stats={stats}
        currentStats={currentStats}
        combinedTrend={combinedTrend}
        teammateStats={teammateStats}
        matchHistory={matchHistory}
        playerMap={playerMap}
      />
    </div>
  );
};
