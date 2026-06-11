import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import X from 'lucide-react/dist/esm/icons/x';
import HelpCircle from 'lucide-react/dist/esm/icons/help-circle';
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right';
import { cn } from '../../lib/utils';
import { GAME_GUIDE_SECTIONS, getTipIconBoxClass, type GuideSection } from '../../lib/gameGuide';
import { GuideIcon } from '../../lib/gameGuideIcons';

interface GameGuideModalProps {
  onClose: () => void;
  initialSection?: string;
  onOpenShop?: () => void;
  onOpenProfileLoans?: () => void;
}

export const GameGuideModal: React.FC<GameGuideModalProps> = ({
  onClose,
  initialSection,
  onOpenShop,
  onOpenProfileLoans,
}) => {
  const [activeId, setActiveId] = useState(
    GAME_GUIDE_SECTIONS.some((s) => s.id === initialSection)
      ? initialSection!
      : GAME_GUIDE_SECTIONS[0].id
  );
  const active = GAME_GUIDE_SECTIONS.find((s) => s.id === activeId) ?? GAME_GUIDE_SECTIONS[0];
  const activeIndex = GAME_GUIDE_SECTIONS.findIndex((s) => s.id === activeId);

  const goNext = () => {
    if (activeIndex < GAME_GUIDE_SECTIONS.length - 1) {
      setActiveId(GAME_GUIDE_SECTIONS[activeIndex + 1].id);
    } else {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/55 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 32, stiffness: 340 }}
          className="w-full sm:max-w-md max-h-[min(88dvh,640px)] sm:max-h-[80vh] bg-white dark:bg-slate-900 rounded-t-[1.75rem] sm:rounded-[1.75rem] shadow-2xl border border-slate-100 dark:border-slate-800 flex flex-col overflow-hidden safe-bottom"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-center pt-2.5 pb-1 sm:hidden shrink-0">
            <div className="w-10 h-1 rounded-full bg-slate-200 dark:bg-slate-700" />
          </div>

          <div className="flex items-center justify-between px-4 sm:px-5 py-2 sm:py-3 shrink-0">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900/40 rounded-lg">
                <HelpCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" strokeWidth={2.25} />
              </div>
              <h2 className="text-base font-black text-slate-900 dark:text-white">快速教學</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 -mr-1 rounded-xl text-slate-400 active:bg-slate-100 dark:active:bg-slate-800"
              aria-label="關閉"
            >
              <X className="w-5 h-5" strokeWidth={2.25} />
            </button>
          </div>

          <div className="grid grid-cols-4 gap-1.5 px-3 sm:px-4 pb-2 shrink-0">
            {GAME_GUIDE_SECTIONS.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveId(section.id)}
                className={cn(
                  'flex flex-col items-center gap-1 py-2 rounded-xl text-[10px] font-black transition-all active:scale-95',
                  activeId === section.id
                    ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                )}
              >
                <GuideIcon
                  name={section.icon}
                  size={18}
                  className={activeId === section.id ? 'text-white' : undefined}
                />
                <span className="leading-none">{section.title}</span>
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-2 custom-scrollbar min-h-0">
            <p className="text-center text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl py-2 px-3 mb-3">
              {active.tagline}
            </p>
            <GuideSectionContent section={active} />
          </div>

          <div className="shrink-0 px-3 sm:px-4 pt-2 pb-4 sm:pb-5 border-t border-slate-100 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm">
            <div className="flex items-center justify-center gap-1.5 mb-3">
              {GAME_GUIDE_SECTIONS.map((s, i) => (
                <div
                  key={s.id}
                  className={cn(
                    'h-1 rounded-full transition-all',
                    i === activeIndex ? 'w-4 bg-emerald-500' : 'w-1.5 bg-slate-200 dark:bg-slate-700'
                  )}
                />
              ))}
            </div>
            {activeIndex === GAME_GUIDE_SECTIONS.length - 1 && (onOpenShop || onOpenProfileLoans) && (
              <div className="flex gap-2 mb-2">
                {onOpenShop && (
                  <button
                    type="button"
                    onClick={onOpenShop}
                    className="flex-1 py-2.5 rounded-xl bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 font-black text-xs active:scale-[0.98] transition-all"
                  >
                    開商店
                  </button>
                )}
                {onOpenProfileLoans && (
                  <button
                    type="button"
                    onClick={onOpenProfileLoans}
                    className="flex-1 py-2.5 rounded-xl bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 font-black text-xs active:scale-[0.98] transition-all"
                  >
                    借貸管理
                  </button>
                )}
              </div>
            )}
            <button
              onClick={goNext}
              className="w-full flex items-center justify-center gap-1 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] text-white font-black text-sm shadow-lg shadow-emerald-500/25 transition-all"
            >
              {activeIndex < GAME_GUIDE_SECTIONS.length - 1 ? (
                <>
                  下一頁
                  <ChevronRight className="w-4 h-4" strokeWidth={2.25} />
                </>
              ) : (
                '知道了'
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

function GuideSectionContent({ section }: { section: GuideSection }) {
  return (
    <div className="grid grid-cols-1 gap-2 pb-1">
      {section.tips.map((tip, i) => (
        <div
          key={i}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/40"
        >
          <GuideIcon
            name={tip.icon}
            size={15}
            box
            boxClassName={getTipIconBoxClass(tip.iconTone)}
          />
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-black text-slate-800 dark:text-slate-100 leading-tight">
              {tip.title}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug mt-0.5">
              {tip.desc}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
