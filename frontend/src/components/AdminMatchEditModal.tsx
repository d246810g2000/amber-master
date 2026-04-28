import React, { useState, useEffect } from "react";
import { MatchRecord, Player } from "../types";
import Trophy from "lucide-react/dist/esm/icons/trophy";
import X from "lucide-react/dist/esm/icons/x";
import Save from "lucide-react/dist/esm/icons/save";
import { getAvatarUrl } from "../lib/utils";

interface AdminMatchEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (matchId: string, data: { winner: number; score: string }) => void;
  match: MatchRecord | null;
  isSubmitting?: boolean;
}

export function AdminMatchEditModal({
  isOpen,
  onClose,
  onConfirm,
  match,
  isSubmitting = false,
}: AdminMatchEditModalProps) {
  const [score1, setScore1] = useState("");
  const [score2, setScore2] = useState("");
  const [winner, setWinner] = useState<1 | 2>(1);

  useEffect(() => {
    if (match) {
      const [s1, s2] = (match.score || "0-0").split("-");
      setScore1(s1 || "");
      setScore2(s2 || "");
      setWinner(match.winner || 1);
    }
  }, [match]);

  if (!isOpen || !match) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
        onClick={onClose}
      />
      
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 max-w-md w-full shadow-2xl border border-slate-200 dark:border-white/10 relative z-10 animate-in fade-in zoom-in-95 duration-300">
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-amber-50 dark:bg-amber-500/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Trophy className="w-6 h-6 text-amber-600 dark:text-amber-500" />
          </div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white">修改比賽紀錄</h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Admin Match Editor</p>
        </div>

        <div className="space-y-6">
          {/* Winner Selection */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setWinner(1)}
              className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${
                winner === 1 
                ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10" 
                : "border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 grayscale opacity-60"
              }`}
            >
              <div className="flex -space-x-2">
                {match.team1.map(p => (
                  <img key={p.id} src={getAvatarUrl(p.avatar, p.name)} className="w-8 h-8 rounded-full border-2 border-white dark:border-slate-900 object-cover" alt={p.name} />
                ))}
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Team 1 獲勝</span>
            </button>

            <button
              onClick={() => setWinner(2)}
              className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${
                winner === 2 
                ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10" 
                : "border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 grayscale opacity-60"
              }`}
            >
              <div className="flex -space-x-2">
                {match.team2.map(p => (
                  <img key={p.id} src={getAvatarUrl(p.avatar, p.name)} className="w-8 h-8 rounded-full border-2 border-white dark:border-slate-900 object-cover" alt={p.name} />
                ))}
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Team 2 獲勝</span>
            </button>
          </div>

          {/* Score Input */}
          <div className="flex flex-col items-center gap-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">修正比分</label>
            <div className="flex items-center gap-4">
              <input
                type="number"
                value={score1}
                onChange={(e) => setScore1(e.target.value)}
                className="w-16 h-12 text-center text-xl font-black bg-slate-50 dark:bg-slate-800 rounded-xl border-2 border-slate-100 dark:border-slate-800 outline-none focus:border-emerald-500 transition-all"
              />
              <span className="font-black text-slate-300">:</span>
              <input
                type="number"
                value={score2}
                onChange={(e) => setScore2(e.target.value)}
                className="w-16 h-12 text-center text-xl font-black bg-slate-50 dark:bg-slate-800 rounded-xl border-2 border-slate-100 dark:border-slate-800 outline-none focus:border-emerald-500 transition-all"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-4 px-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-black rounded-2xl hover:bg-slate-200 transition-colors"
            >
              取消
            </button>
            <button
              onClick={() => onConfirm(match.id, { winner, score: `${score1}-${score2}` })}
              disabled={isSubmitting}
              className="flex-2 py-4 px-8 bg-emerald-600 text-white font-black rounded-2xl hover:bg-emerald-700 shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              {isSubmitting ? "儲存中..." : <><Save size={18} /> 儲存變更</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
