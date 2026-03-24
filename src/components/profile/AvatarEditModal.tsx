import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import X from "lucide-react/dist/esm/icons/x";
import Loader2 from "lucide-react/dist/esm/icons/loader-2";
import RefreshCw from "lucide-react/dist/esm/icons/refresh-cw";
import MoreHorizontal from "lucide-react/dist/esm/icons/more-horizontal";
import { getAvatarUrl } from '../../lib/utils';
import { AVATAR_STYLES, PRESET_SEEDS } from '../../constants/avatar';

interface AvatarEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeStyle: string;
  setActiveStyle: (style: string) => void;
  currentAvatarFull: string;
  saving: boolean;
  onSave: (style: string, seed: string) => void;
}

export const AvatarEditModal: React.FC<AvatarEditModalProps> = ({
  isOpen, onClose, activeStyle, setActiveStyle, currentAvatarFull, saving, onSave
}) => {
  const [showMoreModal, setShowMoreModal] = useState(false);

  const handleSelect = (seed: string) => {
    onSave(activeStyle, seed);
    onClose();
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="absolute inset-0 bg-slate-100/60 dark:bg-slate-950/80 backdrop-blur-xl"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-[2rem] md:rounded-[3rem] p-6 md:p-10 w-full max-w-2xl shadow-2xl shadow-black/10 dark:shadow-black/50 overflow-hidden transition-all duration-300"
            >
              <button
                onClick={onClose}
                className="absolute top-4 right-4 md:top-8 md:right-8 p-3 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-2xl text-slate-400 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-white transition-all z-10"
              >
                <X size={20} />
              </button>

              <div className="mb-10 text-center md:text-left">
                <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-wider mb-1">形象大廳 / Profile Identity Lab</h3>
                <p className="text-slate-500 dark:text-zinc-500 text-xs font-bold">為你的個人儀表板挑選一個專屬的數位身分。</p>
              </div>

              <div className="space-y-10">
                <div className="flex flex-wrap bg-slate-100 dark:bg-zinc-950 p-1.5 rounded-2xl border border-slate-200 dark:border-zinc-800 w-fit mx-auto md:mx-0 overflow-x-auto max-w-full custom-scrollbar gap-1">
                  {AVATAR_STYLES.map(style => (
                    <button
                      key={style.id}
                      onClick={() => setActiveStyle(style.id)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all shrink-0 ${
                        activeStyle === style.id
                        ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
                        : "text-slate-400 dark:text-zinc-500 hover:text-slate-900 dark:text-zinc-300 hover:bg-black/5 dark:hover:bg-white/5"
                      }`}
                    >
                      {style.icon}
                      <span>{style.name}</span>
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-4 sm:grid-cols-6 gap-4">
                  {PRESET_SEEDS.slice(0, 10).map((seed) => (
                    <button
                      key={seed}
                      onClick={() => handleSelect(seed)}
                      disabled={saving}
                      className={`aspect-square rounded-[2rem] border-2 transition-all p-1.5 group relative ${
                        currentAvatarFull === `${activeStyle}:${seed}`
                        ? "border-emerald-500 bg-emerald-500/10 scale-105 shadow-xl shadow-emerald-500/20"
                        : "border-slate-100 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-800/50 hover:border-emerald-200 dark:hover:border-zinc-500 hover:scale-105"
                      }`}
                    >
                      <img
                        src={getAvatarUrl(`${activeStyle}:${seed}`, seed)}
                        alt={seed}
                        className="w-full h-full object-cover rounded-[1.5rem]"
                      />
                    </button>
                  ))}

                   <button
                    onClick={() => {
                      const randomSeed = PRESET_SEEDS[Math.floor(Math.random() * PRESET_SEEDS.length)] + Math.floor(Math.random() * 100);
                      onSave(activeStyle, randomSeed);
                      onClose();
                    }}
                    disabled={saving}
                    className="aspect-square rounded-[2rem] border-2 border-dashed border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900/50 hover:bg-slate-50 dark:hover:bg-zinc-800 hover:border-slate-300 dark:hover:border-zinc-500 transition-all flex flex-col items-center justify-center gap-1 group text-slate-400 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-white"
                  >
                    <RefreshCw size={20} className="group-active:rotate-180 transition-transform duration-500" />
                    <span className="text-[9px] font-black uppercase tracking-widest">隨機</span>
                  </button>
                  <button
                    onClick={() => setShowMoreModal(true)}
                    className="aspect-square rounded-[2rem] border-2 border-dashed border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 text-slate-400 dark:text-zinc-500 flex flex-col items-center justify-center hover:border-emerald-500/50 hover:text-emerald-500 transition-all hover:scale-105"
                  >
                    <MoreHorizontal size={24} />
                    <span className="text-[8px] font-black uppercase mt-1">更多風格</span>
                  </button>
                </div>
              </div>

              {saving && (
                <div className="absolute inset-0 bg-slate-900/40 dark:bg-zinc-900/60 backdrop-blur-sm rounded-[3rem] flex items-center justify-center">
                  <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin flex"><Loader2 className="w-8 h-8 text-emerald-500" /></div>
                    <span className="text-xs font-black text-white uppercase tracking-widest">正在同步設定...</span>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: More Icons */}
      {showMoreModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 md:p-8 animate-in fade-in zoom-in duration-300">
          <div className="absolute inset-0 bg-slate-100/60 dark:bg-zinc-950/90 backdrop-blur-xl" onClick={() => setShowMoreModal(false)} />
          <div className="relative w-full max-w-4xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-[3rem] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-8 border-b border-slate-100 dark:border-white/5 flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">探索無限形象</h2>
                <p className="text-slate-400 dark:text-zinc-500 text-[10px] font-bold uppercase tracking-widest mt-1">Exploration Hub / Choose Your Identity</p>
              </div>
              <button
                onClick={() => setShowMoreModal(false)}
                className="p-3 bg-slate-200 dark:bg-zinc-800 hover:bg-slate-300 dark:hover:bg-zinc-700 rounded-full text-slate-500 dark:text-zinc-400 transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 md:p-8 overflow-y-auto overscroll-contain custom-scrollbar">
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3 pb-8">
                {PRESET_SEEDS.map(seed => (
                  <button
                    key={seed}
                    onClick={() => {
                      onSave(activeStyle, seed);
                      setShowMoreModal(false);
                      onClose();
                    }}
                    disabled={saving}
                    className={`aspect-square rounded-2xl border-2 p-1 transition-all ${
                      currentAvatarFull === `${activeStyle}:${seed}`
                      ? "border-emerald-500 bg-emerald-500/10 scale-105"
                      : "border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/5 hover:border-emerald-200 dark:hover:border-white/20 hover:scale-105"
                    }`}
                  >
                    <img
                      src={getAvatarUrl(`${activeStyle}:${seed}`, seed)}
                      alt={seed}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
