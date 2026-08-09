import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import X from 'lucide-react/dist/esm/icons/x';
import Terminal from 'lucide-react/dist/esm/icons/terminal';
import Loader2 from 'lucide-react/dist/esm/icons/loader-2';
import Search from 'lucide-react/dist/esm/icons/search';
import { useQuery } from '@tanstack/react-query';
import * as gasApi from '../../lib/gasApi';
import { useAuth } from '../../context/AuthContext';

interface DevLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DevLoginModal({ isOpen, onClose }: DevLoginModalProps) {
  const { loginWithUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [customEmail, setCustomEmail] = useState('');
  const [customName, setCustomName] = useState('');

  // Fetch all players to list them for selection
  const { data: players, isLoading } = useQuery({
    queryKey: ['players-base'],
    queryFn: gasApi.fetchPlayers,
    enabled: isOpen,
  });

  if (!isOpen) return null;

  // Filter players that have bound emails
  const boundPlayers = players 
    ? players.filter(p => p.email && (
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        p.email.toLowerCase().includes(searchTerm.toLowerCase())
      ))
    : [];

  const handleSelectPlayer = (player: any) => {
    loginWithUser({
      email: player.email,
      name: player.name,
      picture: player.avatar || '',
      token: `mock-dev-token-${player.id}`,
    });
    onClose();
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customEmail || !customName) return;
    loginWithUser({
      email: customEmail.trim(),
      name: customName.trim(),
      picture: '',
      token: `mock-dev-token-custom-${Date.now()}`,
    });
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2rem] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="p-6 md:p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-start shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl">
              <Terminal className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">開發者測試登入</h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm">請選擇現有測試帳號或手動輸入以進行對戰模擬</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-400"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
          
          {/* Section 1: Choose Existing Player */}
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">選擇系統現有球員</h3>
            
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="搜尋球員姓名或信箱..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 text-sm text-slate-950 dark:text-white"
              />
            </div>

            {/* Players List */}
            <div className="border border-slate-150 dark:border-slate-800 rounded-2xl overflow-hidden max-h-[220px] overflow-y-auto bg-slate-50 dark:bg-slate-900/50">
              {isLoading ? (
                <div className="p-8 flex items-center justify-center gap-2 text-slate-400 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  載入球員名單中...
                </div>
              ) : boundPlayers.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-sm">
                  找不到已綁定信箱的測試球員
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {boundPlayers.map((player: any) => (
                    <button
                      key={player.id}
                      onClick={() => handleSelectPlayer(player)}
                      className="w-full px-5 py-3 flex items-center justify-between text-left hover:bg-emerald-500/5 dark:hover:bg-emerald-400/5 transition-colors group"
                    >
                      <div>
                        <div className="text-sm font-black text-slate-800 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                          {player.name}
                        </div>
                        <div className="text-xs text-slate-400 font-mono">{player.email}</div>
                      </div>
                      <span className="text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2.5 py-1 rounded-full font-bold group-hover:bg-emerald-500 group-hover:text-white dark:group-hover:bg-emerald-500 dark:group-hover:text-white transition-colors">
                        點擊切換
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 py-1">
            <div className="h-px bg-slate-100 dark:bg-slate-800 flex-1" />
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">或</span>
            <div className="h-px bg-slate-100 dark:bg-slate-800 flex-1" />
          </div>

          {/* Section 2: Mock Custom Email */}
          <form onSubmit={handleCustomSubmit} className="space-y-4">
            <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">手動建立測試帳號</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">球員姓名</label>
                <input
                  type="text"
                  required
                  placeholder="例如：測試人員一號"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 text-sm text-slate-950 dark:text-white"
                />
              </div>
              
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">電子信箱</label>
                <input
                  type="email"
                  required
                  placeholder="例如：test1@example.com"
                  value={customEmail}
                  onChange={(e) => setCustomEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 text-sm text-slate-950 dark:text-white"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={!customEmail || !customName}
              className="w-full py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black rounded-xl hover:bg-slate-800 dark:hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md flex items-center justify-center gap-2 text-sm"
            >
              模擬登入此帳號
            </button>
          </form>

        </div>
      </div>
    </div>,
    document.body
  );
}
