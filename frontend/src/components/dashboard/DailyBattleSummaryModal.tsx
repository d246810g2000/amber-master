import React, { useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { toPng } from 'html-to-image';
import ImageDown from 'lucide-react/dist/esm/icons/image-down';
import Loader2 from 'lucide-react/dist/esm/icons/loader-2';
import X from 'lucide-react/dist/esm/icons/x';
import type { MatchRecord, Player } from '../../types';
import { getAvatarUrl } from '../../lib/utils';
import { computeDailyPlayerSummary, type DailyPlayerSummaryRow } from '../../lib/dailySummaryStats';
import { PowerMedalIcon, computePowerMedalTiers } from './PowerMedalIcon';

type SummaryRowWithAvatar = DailyPlayerSummaryRow & { avatarUrl: string };

function formatDateLabel(ymd: string): string {
  const parts = ymd.split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return ymd;
  const [y, m, d] = parts;
  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
  const dt = new Date(y, m - 1, d);
  if (Number.isNaN(dt.getTime())) return ymd;
  const w = weekdays[dt.getDay()];
  return `${y}年${m}月${d}日（週${w}）`;
}

type AbsentResidentChip = { id: string; name: string; avatarUrl: string };

function SummaryTableCard({
  dateLabel,
  rows,
  rangeHint,
  absentResidents,
}: {
  dateLabel: string;
  rows: SummaryRowWithAvatar[];
  /** 有篩選筆數時顯示於標題下（例如僅列前 10 名） */
  rangeHint?: string | null;
  /** 當日常駐且該日無任何對戰紀錄者 */
  absentResidents: AbsentResidentChip[];
}) {
  const powerMedalTiers = React.useMemo(() => computePowerMedalTiers(rows), [rows]);

  return (
    <div
      className="inline-flex w-max min-w-[300px] max-w-full flex-col rounded-[24px] overflow-hidden border border-slate-200/90 align-top shadow-2xl"
      style={{
        fontFamily:
          'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans TC", "PingFang TC", sans-serif',
        background: 'linear-gradient(165deg, #ecfdf5 0%, #f8fafc 38%, #f1f5f9 100%)',
      }}
    >
      <div
        className="px-7 pt-8 pb-5 text-center"
        style={{
          background: 'linear-gradient(120deg, #059669 0%, #0d9488 45%, #047857 100%)',
        }}
      >
        <h1 className="text-[26px] font-black text-white tracking-tight drop-shadow-sm">當日戰績摘要</h1>
        <p className="mt-1.5 text-[13px] font-bold text-emerald-50/95 tabular-nums">{dateLabel}</p>
        {rangeHint ? (
          <p className="mt-2 text-[11px] font-bold text-emerald-100/90 tabular-nums leading-snug px-2">{rangeHint}</p>
        ) : null}
      </div>

      <div className="px-5 py-5">
        {/* 同一欄寬：請假區 w-0 min-w-full 避免 flex-wrap 的 max-content 把欄寬撐成「單行 chip 總寬」 */}
        <div className="flex w-max max-w-full min-w-0 flex-col items-stretch">
        {rows.length === 0 ? (
          <div className="min-w-[300px] max-w-full overflow-hidden rounded-2xl border border-slate-200/80 bg-white/80 py-16 text-center text-slate-500 font-bold text-lg">
            本日尚無對戰紀錄
          </div>
        ) : (
          <div className="w-max max-w-full min-w-0 overflow-hidden rounded-2xl border border-slate-200/90 bg-white/90 shadow-inner">
            <table className="border-collapse text-left table-auto">
              <thead>
                <tr className="bg-slate-900 text-[9px] font-black text-white uppercase tracking-wide align-middle">
                  <th className="px-2 py-2.5 text-left whitespace-nowrap">球員</th>
                  <th className="px-1 py-2.5 text-center whitespace-nowrap">勝-敗</th>
                  <th className="px-1.5 py-2.5 text-center whitespace-nowrap">勝率</th>
                  <th className="px-1.5 py-2.5 text-center whitespace-nowrap">戰力</th>
                  <th className="px-1.5 py-2.5 text-center whitespace-nowrap">連休</th>
                  <th className="px-1.5 py-2.5 text-center normal-case whitespace-nowrap">夥伴</th>
                  <th className="px-1.5 py-2.5 text-center normal-case whitespace-nowrap">天敵</th>
                  <th className="px-1.5 py-2 text-center text-[8px] leading-tight font-black normal-case whitespace-normal">
                    場均
                    <br />
                    戰力差
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr
                    key={r.key}
                    className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/90'}
                    style={{ color: '#0f172a' }}
                  >
                    <td className="px-2 py-2 text-[12px] font-black border-t border-slate-100 align-middle max-w-[10rem]" title={r.name}>
                      <div className="flex items-center gap-1.5 min-w-0 max-w-[10rem]">
                        <img
                          src={r.avatarUrl}
                          alt=""
                          width={20}
                          height={20}
                          className="w-5 h-5 rounded-full object-cover border border-slate-200/90 shrink-0 bg-slate-100"
                          referrerPolicy="no-referrer"
                        />
                        <span className="truncate min-w-0">{r.name}</span>
                      </div>
                    </td>
                    <td className="px-1 py-2 text-center text-[12px] font-black tabular-nums border-t border-slate-100 whitespace-nowrap align-middle">
                      <span className="text-emerald-600">{r.wins}</span>
                      <span className="text-slate-300 font-bold mx-0.5">-</span>
                      <span className="text-rose-600">{r.losses}</span>
                    </td>
                    <td className="px-1.5 py-2 text-center text-[12px] font-black tabular-nums border-t border-slate-100 whitespace-nowrap align-middle">
                      {r.winRate}%
                    </td>
                    <td className="px-1.5 py-2 text-center text-[12px] font-black tabular-nums text-sky-700 border-t border-slate-100 whitespace-nowrap align-middle">
                      <span className="inline-flex items-center justify-center gap-1">
                        {(() => {
                          const t = powerMedalTiers.get(r.key);
                          return t ? <PowerMedalIcon tier={t} /> : null;
                        })()}
                        {r.powerCp}
                      </span>
                    </td>
                    <td className="px-1.5 py-2 text-center text-[11px] font-bold tabular-nums text-amber-800 border-t border-slate-100 whitespace-nowrap align-middle">
                      {r.maxRestMatches}
                    </td>
                    <td
                      className="px-1.5 py-2 text-[10px] font-bold border-t border-slate-100 align-top leading-snug min-w-0 max-w-[7.5rem]"
                      title={r.bestPartner ? `${r.bestPartner.name} ${r.bestPartner.winRate}%` : undefined}
                    >
                      {r.bestPartner ? (
                        <div className="text-slate-800 line-clamp-2 break-words">
                          <span className="font-black">{r.bestPartner.name}</span>
                          <span className="text-slate-500 font-black tabular-nums ml-0.5">{r.bestPartner.winRate}%</span>
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td
                      className="px-1.5 py-2 text-center text-[10px] font-bold border-t border-slate-100 align-middle leading-snug min-w-0 max-w-[7.5rem]"
                      title={
                        r.nemesis
                          ? `${r.nemesis.names.join(' & ')} 敗${r.nemesis.lossesVs}`
                          : undefined
                      }
                    >
                      {r.nemesis ? (
                        <div className="text-slate-800 line-clamp-2 break-words text-center">
                          <span className="font-black">{r.nemesis.names.join(' & ')}</span>
                          <span className="text-rose-600 font-black tabular-nums">
                            {' '}
                            敗{r.nemesis.lossesVs}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-500 font-bold">無天敵</span>
                      )}
                    </td>
                    <td className="px-1.5 py-2 text-center text-[10px] font-black tabular-nums border-t border-slate-100 align-middle leading-tight whitespace-nowrap">
                      {r.avgCpDelta === null ? (
                        '—'
                      ) : (
                        <span className={r.avgCpDelta >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                          {r.avgCpDelta >= 0 ? '+' : ''}
                          {r.avgCpDelta}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {absentResidents.length > 0 ? (
          <div className="mt-4 w-0 min-w-full max-w-full min-h-0 shrink-0 rounded-2xl border border-amber-200/70 bg-amber-50/50 px-3 py-2.5">
            <p className="mb-1.5 text-center text-[10px] font-black uppercase tracking-wider text-amber-900/70">
              請假球員
            </p>
            <div className="flex min-w-0 flex-wrap justify-center gap-x-2 gap-y-1.5">
              {absentResidents.map((p) => (
                <span
                  key={p.id}
                  className="inline-flex max-w-full min-w-0 shrink-0 items-center gap-1 rounded-full border border-slate-200/90 bg-white/90 px-2 py-0.5 text-[11px] font-bold text-slate-800 shadow-sm"
                >
                  <img
                    src={p.avatarUrl}
                    alt=""
                    width={14}
                    height={14}
                    className="h-3.5 w-3.5 shrink-0 rounded-full object-cover ring-1 ring-slate-200/80"
                    referrerPolicy="no-referrer"
                  />
                  <span className="max-w-[11rem] break-words text-left leading-tight">{p.name}</span>
                </span>
              ))}
            </div>
          </div>
        ) : null}
        </div>
      </div>

      <div className="px-6 py-3 bg-slate-900/5 border-t border-slate-200/80 text-center text-[9px] font-black text-slate-400 tracking-[0.15em] uppercase">
        安柏羽球社 · amber-master
      </div>
    </div>
  );
}

export interface DailyBattleSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  filterDate: string;
  matchHistory: MatchRecord[];
  players: Player[];
}

const DEFAULT_TOP_N = 10;

export const DailyBattleSummaryModal: React.FC<DailyBattleSummaryModalProps> = ({
  isOpen,
  onClose,
  filterDate,
  matchHistory,
  players,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);
  const [limitTopEnabled, setLimitTopEnabled] = useState(false);
  const [topNInput, setTopNInput] = useState(String(DEFAULT_TOP_N));

  const dateLabel = useMemo(() => formatDateLabel(filterDate), [filterDate]);

  const rows = useMemo((): SummaryRowWithAvatar[] => {
    const base = computeDailyPlayerSummary(matchHistory, players);
    const byId = new Map(players.map((p) => [String(p.id), p]));
    const byName = new Map(players.map((p) => [p.name, p]));
    return base.map((r) => {
      const p = r.key.startsWith('name:')
        ? byName.get(r.name)
        : byId.get(r.key);
      const avatarUrl = getAvatarUrl(p?.avatar, r.name);
      return { ...r, avatarUrl };
    });
  }, [matchHistory, players]);

  const topN = useMemo(() => {
    const n = Math.floor(Number(topNInput));
    if (!Number.isFinite(n) || n < 1) return DEFAULT_TOP_N;
    return Math.min(999, n);
  }, [topNInput]);

  const displayRows = useMemo(() => {
    if (!limitTopEnabled) return rows;
    return rows.slice(0, Math.min(rows.length, topN));
  }, [rows, limitTopEnabled, topN]);

  const rangeHint = useMemo(() => {
    if (!limitTopEnabled || rows.length === 0) return null;
    if (displayRows.length >= rows.length) {
      return `依「前 ${topN} 名」篩選 · 共 ${rows.length} 人已全部列出`;
    }
    return `依「前 ${topN} 名」篩選 · 第 1–${displayRows.length} 名（共 ${rows.length} 人，依戰力排序）`;
  }, [limitTopEnabled, rows.length, displayRows.length, topN]);

  /** 常駐球員中，當日 matchHistory 完全未上場者 */
  const absentResidents = useMemo((): AbsentResidentChip[] => {
    const played = new Set<string>();
    for (const m of matchHistory) {
      for (const p of [...(m.team1 || []), ...(m.team2 || [])]) {
        if (p.id) played.add(String(p.id));
      }
    }
    return players
      .filter((p) => (p.type || 'guest') === 'resident' && !played.has(String(p.id)))
      .map((p) => ({
        id: p.id,
        name: p.name,
        avatarUrl: getAvatarUrl(p.avatar, p.name),
      }))
      .sort((a, b) => a.name.localeCompare(b.name, 'zh-Hant'));
  }, [matchHistory, players]);

  const handleDownload = async () => {
    if (!cardRef.current) return;
    if (displayRows.length === 0 && absentResidents.length === 0) return;
    try {
      setExporting(true);
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: '#f8fafc',
      });
      const link = document.createElement('a');
      const suffix = limitTopEnabled && rows.length > 0 ? `-前${displayRows.length}名` : '';
      link.download = `安柏戰績摘要-${filterDate}${suffix}.png`;
      link.href = dataUrl;
      link.click();
    } catch (e) {
      console.error(e);
      alert('匯出圖片失敗，請稍後再試。');
    } finally {
      setExporting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/85 backdrop-blur-md cursor-pointer"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-[min(96vw,600px)] max-h-[92vh] sm:max-h-[90vh] bg-white dark:bg-slate-900 rounded-none sm:rounded-[2rem] border-0 sm:border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-4 sm:px-6 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <div>
                <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-slate-100 tracking-tight">
                  匯出戰績摘要圖
                </h3>
                <p className="text-[10px] sm:text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
                  {dateLabel}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
                aria-label="關閉"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 bg-slate-50 dark:bg-slate-950/50 custom-scrollbar flex flex-col items-center">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                預覽（依目前日期篩選）
              </p>
              <div className="w-full max-w-[340px] sm:max-w-sm mb-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/80 px-3 py-3 shadow-sm">
                <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  顯示範圍
                </p>
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    checked={limitTopEnabled}
                    onChange={(e) => setLimitTopEnabled(e.target.checked)}
                  />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 shrink-0">僅前</span>
                  <input
                    type="number"
                    min={1}
                    max={999}
                    disabled={!limitTopEnabled}
                    value={topNInput}
                    onChange={(e) => setTopNInput(e.target.value)}
                    onBlur={() => {
                      const n = Math.floor(Number(topNInput));
                      if (!Number.isFinite(n) || n < 1) setTopNInput(String(DEFAULT_TOP_N));
                      else setTopNInput(String(Math.min(999, n)));
                    }}
                    className="w-14 shrink-0 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-1 text-center text-xs font-black tabular-nums text-slate-900 dark:text-slate-100 disabled:opacity-45"
                  />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">名</span>
                </label>
                <p className="mt-2 text-[10px] font-bold text-slate-500 dark:text-slate-400 leading-relaxed">
                  未勾選時匯出全部球員；勾選後依表格排序取前 N 名（預設 {DEFAULT_TOP_N}）。
                </p>
              </div>
              <div className="origin-top scale-[0.52] xs:scale-[0.58] sm:scale-[0.68] md:scale-[0.78] mb-4 sm:mb-6 shadow-2xl rounded-[24px]">
                <div ref={cardRef}>
                  <SummaryTableCard
                    dateLabel={dateLabel}
                    rows={displayRows}
                    rangeHint={rangeHint}
                    absentResidents={absentResidents}
                  />
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 rounded-2xl font-black text-xs sm:text-sm bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                關閉
              </button>
              <button
                type="button"
                disabled={exporting || (displayRows.length === 0 && absentResidents.length === 0)}
                onClick={handleDownload}
                className="flex-[1.4] py-3 rounded-2xl font-black text-xs sm:text-sm bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-45 disabled:pointer-events-none transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25"
              >
                {exporting ? (
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                ) : (
                  <ImageDown className="w-4 h-4 shrink-0" />
                )}
                儲存 PNG
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
