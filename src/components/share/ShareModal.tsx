import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Share2, Loader2 } from 'lucide-react';
import { toPng } from 'html-to-image';
import { ShareStatsCard } from './ShareStatsCard';
import type { Player } from '../../types';
import type { CombinedTrendPoint } from '../../hooks/usePlayerProfile';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: Player;
  stats: any;
  currentStats: any;
  combinedTrend: CombinedTrendPoint[];
  teammateStats: any[];
  matchHistory: any[];
  playerMap: Record<string, Player>;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  player,
  stats,
  currentStats,
  combinedTrend,
  teammateStats,
  matchHistory,
  playerMap
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleDownload = async () => {
    if (!cardRef.current) return;
    try {
      setIsExporting(true);
      
      // We need to make sure images are loaded. 
      // The component is already rendered in the DOM but might be scaled/hidden.
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        width: 600,
        height: 800,
        style: {
           transform: 'scale(1)',
           transformOrigin: 'top left',
           display: 'flex', // Ensure it's visible for the capture
        }
      });
      
      const link = document.createElement('a');
      link.download = `badminton-stats-${player.name}-${new Date().toISOString().slice(0,10)}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to export image:', err);
      alert('匯出圖片失敗，請稍後再試。');
    } finally {
      setIsExporting(false);
    }
  };

  const handleNativeShare = async () => {
    if (!cardRef.current) return;
    try {
      setIsExporting(true);
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        width: 600,
        height: 800,
        style: { transform: 'scale(1)', transformOrigin: 'top left', display: 'flex' }
      });
      
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      const filename = `amber-master-${player.name}-${new Date().toISOString().slice(0, 10)}.png`;
      const file = new File([blob], filename, { type: 'image/png' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: '安柏排點大師 - 戰績分享',
          text: `快來看看 ${player.name} 的羽球戰績！`,
        });
      } else {
        // Fallback for browsers that don't support sharing files
        handleDownload();
      }
    } catch (err) {
      console.error('Failed to share:', err);
      // Fallback to download if sharing fails
      handleDownload();
    } finally {
      setIsExporting(false);
    }
  };

  const canShareNative = !!(navigator.canShare && navigator.share);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-4">
          {/* Backdrop - Explicitly handle click to close */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl cursor-pointer"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 30 }}
            onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
            className="relative w-full h-full sm:h-auto sm:max-w-xl bg-slate-950 sm:bg-slate-900 border-x-0 sm:border border-white/10 sm:rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col sm:max-h-[90vh]"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 sm:p-6 border-b border-white/5 bg-slate-950 sm:bg-transparent">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/10 rounded-xl">
                    <Share2 size={20} className="text-emerald-500" />
                </div>
                <div className="flex flex-col">
                  <h3 className="text-sm sm:text-lg font-black text-white uppercase tracking-wider">分享我的戰績</h3>
                  <span className="text-[10px] text-emerald-500/60 font-bold uppercase tracking-widest">Amber Master Preview</span>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2.5 bg-white/5 hover:bg-white/10 rounded-full transition-all text-slate-400 hover:text-white active:scale-90"
              >
                <X size={20} />
              </button>
            </div>

            {/* Preview Area - Optimized for mobile width */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-8 flex flex-col items-center bg-black/40 custom-scrollbar overscroll-contain">
              <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6 opacity-40">卡片預覽 (可捲動)</div>
              
              <div className="shadow-2xl rounded-[32px] overflow-hidden shrink-0 mb-12 transform scale-[0.65] xs:scale-[0.75] sm:scale-90 md:scale-100 origin-top">
                <div ref={cardRef}>
                    <ShareStatsCard 
                        player={player}
                        stats={stats}
                        currentStats={currentStats}
                        combinedTrend={combinedTrend}
                        teammateStats={teammateStats}
                        matchHistory={matchHistory}
                        playerMap={playerMap}
                    />
                </div>
              </div>
            </div>

            {/* Actions - Fixed at bottom on mobile */}
            <div className="p-5 sm:p-6 pb-8 sm:pb-6 bg-slate-950 sm:bg-slate-900/80 backdrop-blur-2xl border-t border-white/5 flex flex-col sm:flex-row gap-3">
              {canShareNative && (
                <button
                  onClick={handleNativeShare}
                  disabled={isExporting}
                  className="flex-1 py-4 bg-white text-slate-900 hover:bg-slate-100 disabled:opacity-50 rounded-2xl font-black transition-all active:scale-95 flex items-center justify-center gap-3 shadow-xl"
                >
                  {isExporting ? <Loader2 className="animate-spin" size={20} /> : <Share2 size={20} />}
                  直接分享
                </button>
              )}
              <button
                onClick={handleDownload}
                disabled={isExporting}
                className={`flex-[1.2] py-4 ${canShareNative ? 'bg-emerald-600/10 text-emerald-400 border border-emerald-500/20' : 'bg-emerald-500 text-white'} hover:bg-emerald-500 hover:text-white disabled:opacity-50 rounded-2xl font-black transition-all active:scale-95 flex items-center justify-center gap-3 shadow-lg`}
              >
                {isExporting ? <Loader2 className="animate-spin" size={20} /> : <Download size={20} />}
                儲存圖片 (PNG)
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
