import React, { useState } from "react";
import { Player } from "../types";
import Trophy from "lucide-react/dist/esm/icons/trophy";
import X from "lucide-react/dist/esm/icons/x";
import { getAvatarUrl } from "../lib/utils";

interface WinnerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (winner: 1 | 2, score: string) => void;
  team1: Player[];
  team2: Player[];
  isSubmitting?: boolean;
}

export function WinnerModal({
  isOpen,
  onClose,
  onConfirm,
  team1,
  team2,
  isSubmitting = false,
}: WinnerModalProps) {
  const [score1, setScore1] = useState("");
  const [score2, setScore2] = useState("");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal Container */}
      <div className="bg-white/95 backdrop-blur-xl rounded-[1.5rem] md:rounded-[2rem] p-6 max-w-sm w-full shadow-2xl border border-white/50 relative z-10 animate-in fade-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner">
            <Trophy className="w-6 h-6 text-emerald-600" />
          </div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight">
            登記勝負
          </h2>
          <p className="text-[11px] font-bold text-slate-400 mt-1 uppercase tracking-widest">
            Record Match Result
          </p>
        </div>

        {/* Score Input (Separated Team 1 vs Team 2) */}
        <div className="mb-6 flex flex-col items-center">
          <label className="block text-[11px] font-bold text-slate-500 mb-2 tracking-wide uppercase text-center">
            比分 Score (選填)
          </label>
          <div className="flex items-center justify-center gap-3">
            <div className="flex flex-col items-center group">
              <span className="text-[10px] text-rose-400 font-bold mb-1 uppercase tracking-wider opacity-60 group-focus-within:opacity-100 transition-opacity">隊伍 1</span>
              <input
                type="number"
                pattern="\d*"
                value={score1}
                onChange={(e) => setScore1(e.target.value)}
                placeholder="21"
                className="w-[72px] h-14 text-center text-2xl font-black bg-slate-50 border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-rose-500/10 focus:border-rose-400 focus:bg-white text-rose-900 placeholder:text-slate-300 outline-none transition-all"
              />
            </div>
            
            <span className="text-slate-200 font-black text-2xl mt-4">:</span>
            
            <div className="flex flex-col items-center group">
              <span className="text-[10px] text-indigo-400 font-bold mb-1 uppercase tracking-wider opacity-60 group-focus-within:opacity-100 transition-opacity">隊伍 2</span>
              <input
                type="number"
                pattern="\d*"
                value={score2}
                onChange={(e) => setScore2(e.target.value)}
                placeholder="19"
                className="w-[72px] h-14 text-center text-2xl font-black bg-slate-50 border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 focus:bg-white text-indigo-900 placeholder:text-slate-300 outline-none transition-all"
              />
            </div>
          </div>
        </div>

        {/* Winner Selection */}
        <div className="space-y-3">
          <button
            onClick={() => {
              const finalScore = score1 || score2 ? `${score1}-${score2}` : "";
              onConfirm(1, finalScore);
              setScore1("");
              setScore2("");
            }}
            disabled={isSubmitting}
            className={`group w-full py-4 px-4 bg-gradient-to-br from-rose-50 to-orange-50 hover:from-rose-100 hover:to-orange-100 border-2 border-rose-200/50 rounded-2xl flex flex-col items-center justify-center transition-all duration-300 hover:shadow-lg hover:shadow-rose-500/20 active:scale-[0.98] md:hover:-translate-y-0.5 ${
              isSubmitting ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            <div className="flex items-center justify-center gap-3 mb-2 group-hover:scale-105 transition-transform">
              {team1.map((p, index) => (
                <React.Fragment key={p?.id || `t1p${index}`}>
                  {index > 0 && <span className="text-rose-300 font-black text-xs shrink-0">&amp;</span>}
                  <div className="flex flex-col items-center gap-1">
                    <img
                      src={getAvatarUrl(p?.avatar, p?.name || 'Unknown')}
                      alt={p?.name || 'Unknown'}
                      className="w-8 h-8 rounded-full object-cover bg-white shadow-sm border-2 border-rose-100"
                    />
                    <span className="text-rose-700 font-black text-sm truncate max-w-[70px] leading-none">{p?.name || 'Unknown'}</span>
                  </div>
                </React.Fragment>
              ))}
            </div>
            <span className="text-rose-500/80 font-bold text-[10px] uppercase tracking-[0.2em] bg-rose-100/50 px-2.5 py-0.5 rounded-full group-hover:bg-rose-200/50 transition-colors">
              選擇此隊獲勝
            </span>
          </button>

          <button
            onClick={() => {
              const finalScore = score1 || score2 ? `${score1}-${score2}` : "";
              onConfirm(2, finalScore);
              setScore1("");
              setScore2("");
            }}
            disabled={isSubmitting}
            className={`group w-full py-4 px-4 bg-gradient-to-br from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 border-2 border-blue-200/50 rounded-2xl flex flex-col items-center justify-center transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/20 active:scale-[0.98] md:hover:-translate-y-0.5 ${
              isSubmitting ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            <div className="flex items-center justify-center gap-3 mb-2 group-hover:scale-105 transition-transform">
              {team2.map((p, index) => (
                <React.Fragment key={p?.id || `t2p${index}`}>
                  {index > 0 && <span className="text-blue-300 font-black text-xs shrink-0">&amp;</span>}
                  <div className="flex flex-col items-center gap-1">
                    <img
                      src={getAvatarUrl(p?.avatar, p?.name || 'Unknown')}
                      alt={p?.name || 'Unknown'}
                      className="w-8 h-8 rounded-full object-cover bg-white shadow-sm border-2 border-blue-100"
                    />
                    <span className="text-blue-700 font-black text-sm truncate max-w-[70px] leading-none">{p?.name || 'Unknown'}</span>
                  </div>
                </React.Fragment>
              ))}
            </div>
            <span className="text-blue-500/80 font-bold text-[10px] uppercase tracking-[0.2em] bg-blue-100/50 px-2.5 py-0.5 rounded-full group-hover:bg-blue-200/50 transition-colors">
              選擇此隊獲勝
            </span>
          </button>
        </div>

        {/* Cancel Button */}
        <button
          onClick={onClose}
          className="mt-4 w-full py-3 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-1.5"
        >
          <X className="w-4 h-4" /> 取消
        </button>
      </div>
    </div>
  );
}
