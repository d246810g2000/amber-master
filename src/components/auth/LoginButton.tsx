import React, { useMemo } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LogOut from 'lucide-react/dist/esm/icons/log-out';
import * as gasApi from '../../lib/gasApi';
import { cn, getAvatarUrl } from '../../lib/utils';

export function LoginButton() {
  const navigate = useNavigate();
  const { currentUser, login, logout } = useAuth();

  const bindingQuery = useQuery({
    queryKey: ['userBinding', currentUser?.email ?? ''],
    queryFn: () => gasApi.getUserBinding(currentUser!.email),
    enabled: !!currentUser?.email,
    staleTime: 30_000,
    refetchOnMount: 'always',
  });

  /** 與 PlayerProfile / 列表共用，用試算表 C 欄頭像補齊 getUserBinding 未帶 avatar 的情況 */
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
      <div className="flex items-center gap-2 md:gap-3 bg-white/50 backdrop-blur-md pl-1 md:pl-1.5 pr-2 md:pr-3 py-1 md:py-1.5 rounded-full border border-slate-200/50 shadow-sm transition-all hover:bg-white/80">
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
    <div className="scale-[0.70] md:scale-90 origin-right md:origin-center drop-shadow-sm shrink-0 -ml-6 md:-ml-2">
      <GoogleLogin
        onSuccess={credentialResponse => {
          if (credentialResponse.credential) {
            login(credentialResponse.credential);
          }
        }}
        onError={() => {
          console.error('Google Sign-In Failed');
        }}
        shape="pill"
        theme="filled_black"
        text="signin"
      />
    </div>
  );
}
