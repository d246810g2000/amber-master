import React, { useMemo } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LogOut from 'lucide-react/dist/esm/icons/log-out';
import * as gasApi from '../../lib/gasApi';
import { cn, getAvatarUrl } from '../../lib/utils';

export function LoginButton() {
  const navigate = useNavigate();
  const { currentUser, loginWithUser, logout } = useAuth();

  const handleCustomLogin = useGoogleLogin({
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

  const bindingQuery = useQuery({
    queryKey: ['userBinding', currentUser?.email ?? ''],
    queryFn: () => gasApi.getUserBinding(currentUser!.email),
    enabled: !!currentUser?.email,
    staleTime: 30_000,
    refetchOnMount: 'always',
  });

  const basePlayersQuery = useQuery({
    queryKey: ['players-base'],
    queryFn: gasApi.fetchPlayers,
    enabled: !!currentUser?.email,
    staleTime: 60_000,
  });

  const binding = bindingQuery.data;

  const boundPlayer = useMemo(() => {
    if (!binding?.isBound || !binding.playerId) return undefined;
    return basePlayersQuery.data?.find(p => p.id === binding.playerId);
  }, [binding?.isBound, binding?.playerId, basePlayersQuery.data]);

  const mergedName = useMemo(() => {
    if (binding?.playerName?.trim()) return binding.playerName.trim();
    if (boundPlayer?.name) return boundPlayer.name;
    return currentUser?.name ?? '';
  }, [binding?.playerName, boundPlayer?.name, currentUser?.name]);

  const mergedAvatarStr = useMemo(() => {
    const fromBinding = binding?.avatar?.trim() ?? '';
    const fromSheet = boundPlayer?.avatar?.trim() ?? '';
    return fromBinding || fromSheet;
  }, [binding?.avatar, boundPlayer?.avatar]);

  const displayName = useMemo(() => {
    if (binding?.isBound && mergedName) return mergedName;
    return currentUser?.name ?? '';
  }, [binding?.isBound, mergedName, currentUser?.name]);

  const displayAvatarSrc = useMemo(() => {
    if (binding?.isBound) {
      if (mergedAvatarStr) {
        return getAvatarUrl(mergedAvatarStr, mergedName || currentUser?.name || '');
      }
      return getAvatarUrl('', mergedName || currentUser?.name || '');
    }
    return currentUser?.picture ?? '';
  }, [binding?.isBound, mergedAvatarStr, mergedName, currentUser?.name, currentUser?.picture]);

  const canGoToProfile = !!(binding?.isBound && binding.playerId);

  const handleNameClick = () => {
    if (canGoToProfile && binding?.playerId) {
      navigate(`/players/${binding.playerId}`);
    }
  };

  if (currentUser) {
    return (
      <div className="flex items-center gap-2 md:gap-3 bg-white/80 backdrop-blur-md pl-1 md:pl-1.5 pr-2 md:pr-4 py-1.5 md:py-2 rounded-full border border-slate-200 shadow-sm transition-all hover:bg-white shrink-0 h-fit self-center">
        <img
          src={displayAvatarSrc}
          alt={displayName}
          className="w-6 h-6 md:w-7 md:h-7 rounded-full object-cover border border-slate-200 shadow-sm shrink-0"
          referrerPolicy="no-referrer"
        />
        <div className="flex flex-col min-w-0 justify-center">
          <button
            type="button"
            onClick={handleNameClick}
            disabled={!canGoToProfile}
            title={canGoToProfile ? '進入我的球員頁' : '請先綁定球員'}
            className={cn(
              'text-left text-xs md:text-sm font-black text-slate-800 leading-tight truncate max-w-[120px] md:max-w-[160px]',
              canGoToProfile && 'cursor-pointer hover:text-emerald-600 hover:underline underline-offset-2',
              !canGoToProfile && 'cursor-default opacity-90'
            )}
          >
            {displayName}
          </button>
        </div>
        <button
          onClick={logout}
          className="ml-0.5 md:ml-1 p-1 md:p-1.5 rounded-full text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors shrink-0"
          title="登出"
        >
          <LogOut className="w-3.5 h-3.5 md:w-4 md:h-4" />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => handleCustomLogin()}
      className="flex items-center gap-2 px-3.5 md:px-5 py-1.5 md:py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-[10px] md:rounded-2xl transition-all shadow-xl shadow-slate-200 active:scale-95 shrink-0 border border-slate-800"
    >
      <div className="w-3.5 h-3.5 md:w-5 md:h-5 rounded-full bg-white flex items-center justify-center overflow-hidden shrink-0">
        <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 md:w-3.5 md:h-3.5">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-1 .67-2.28 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.67-.35-1.39-.35-2.09s.13-1.42.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
      </div>
      <span className="text-[12px] md:text-sm font-black uppercase tracking-wider block">登入</span>
    </button>
  );
}
