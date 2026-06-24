import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import X from 'lucide-react/dist/esm/icons/x';
import Loader2 from 'lucide-react/dist/esm/icons/loader-2';
import ChevronDown from 'lucide-react/dist/esm/icons/chevron-down';
import ChevronUp from 'lucide-react/dist/esm/icons/chevron-up';
import * as gasApi from '../../lib/gasApi';
import { useAuth } from '../../context/AuthContext';

interface HouseDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  date?: string;
}

function formatDateLabel(ymd?: string): string {
  if (!ymd) return '';
  const parts = ymd.split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return ymd;
  const [y, m, d] = parts;
  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
  const dt = new Date(y, m - 1, d);
  if (Number.isNaN(dt.getTime())) return ymd;
  const w = weekdays[dt.getDay()];
  return `${y}年${m}月${d}日（週${w}）`;
}

export const HouseDetailModal: React.FC<HouseDetailModalProps> = ({ isOpen, onClose, date }) => {
  const { currentUser } = useAuth();
  const [donateAmount, setDonateAmount] = useState<number>(1000);
  const [isDonating, setIsDonating] = useState<boolean>(false);
  const [donationError, setDonationError] = useState<string | null>(null);
  const [donationSuccess, setDonationSuccess] = useState<string | null>(null);

  const { data, isLoading, error, refetch: refetchDetail } = useQuery({
    queryKey: ['houseDetail', date],
    queryFn: () => gasApi.fetchHouseDetail(date),
    enabled: isOpen && !!date,
  });

  const { data: rescueData, refetch: refetchRescue } = useQuery({
    queryKey: ['houseRescueInfo', date],
    queryFn: () => gasApi.fetchHouseRescueInfo(date),
    enabled: isOpen && !!date,
  });

  const [expandedMatches, setExpandedMatches] = useState<Record<string, boolean>>({});

  const toggleMatch = (matchId: string) => {
    setExpandedMatches(prev => ({
      ...prev,
      [matchId]: !prev[matchId]
    }));
  };

  const handleDonate = async () => {
    if (!currentUser?.email) {
      setDonationError('請先登入帳號');
      return;
    }
    if (donateAmount <= 0) {
      setDonationError('捐贈金額必須大於 0');
      return;
    }
    setIsDonating(true);
    setDonationError(null);
    setDonationSuccess(null);
    try {
      const res = await gasApi.donateToHouse(currentUser.email, donateAmount);
      if (res.status === 'error' || res.detail) {
        setDonationError(res.detail || res.message || '捐贈失敗');
      } else {
        setDonationSuccess(`成功捐贈了 ${donateAmount} 根羽毛！`);
        refetchDetail();
        refetchRescue();
      }
    } catch (err: any) {
      setDonationError(err.message || '連線錯誤');
    } finally {
      setIsDonating(false);
    }
  };

  const houseNet = data?.houseNet ?? 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', duration: 0.5 }}
            className="relative w-full max-w-4xl max-h-[90vh] md:max-h-[85vh] flex flex-col bg-white dark:bg-slate-900 rounded-[1.5rem] md:rounded-[2rem] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden"
          >
            {/* Header */}
            <div className="flex justify-between items-center px-4 md:px-6 py-4 md:py-5 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <div>
                <h3 className="text-lg md:text-xl font-black text-slate-900 dark:text-white">莊家每日收支明細</h3>
                <p className="text-[10px] md:text-xs font-semibold text-slate-500 mt-0.5">{formatDateLabel(date)}</p>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 md:p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 md:space-y-6 custom-scrollbar">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                  <p className="mt-3 text-sm font-bold text-slate-500">載入明細中...</p>
                </div>
              ) : error ? (
                <div className="text-center py-16 text-red-500 font-bold">
                  載入失敗: {(error as any).message || '未知錯誤'}
                </div>
              ) : (
                <>
                  {/* Summary Cards */}
                  <div className="grid grid-cols-3 gap-2 md:gap-4">
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-3 md:p-4 rounded-xl md:rounded-2xl border border-slate-100 dark:border-slate-800">
                      <div className="text-[10px] md:text-xs font-bold text-slate-400 dark:text-slate-500">總抽水 (Rake)</div>
                      <div className="text-sm md:text-xl font-black text-slate-900 dark:text-white mt-1 tabular-nums">
                        +{data?.rakeCollected.toLocaleString()}
                      </div>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-3 md:p-4 rounded-xl md:rounded-2xl border border-slate-100 dark:border-slate-800">
                      <div className="text-[10px] md:text-xs font-bold text-slate-400 dark:text-slate-500">總補貼 (Subsidy)</div>
                      <div className="text-sm md:text-xl font-black text-slate-900 dark:text-white mt-1 tabular-nums">
                        -{data?.houseSubsidy.toLocaleString()}
                      </div>
                    </div>
                    <div className={`p-3 md:p-4 rounded-xl md:rounded-2xl border ${
                      houseNet <= -50000
                        ? (rescueData?.isRescued
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-extrabold'
                            : 'bg-red-500/10 border-red-500/20 text-red-500 animate-pulse font-extrabold')
                        : (houseNet >= 0
                            ? 'bg-amber-500/5 border-amber-500/10 text-amber-500'
                            : 'bg-sky-500/5 border-sky-500/10 text-sky-500')
                    }`}>
                      <div className="text-[10px] md:text-xs font-bold opacity-80">
                        {houseNet <= -50000 ? '莊家狀態' : '莊家淨收 (Net)'}
                      </div>
                      <div className="text-sm md:text-xl font-black mt-1 tabular-nums">
                        {houseNet <= -50000 
                          ? (rescueData?.isRescued ? '已東山再起' : '已破產跑路') 
                          : `${houseNet >= 0 ? '+' : ''}${houseNet.toLocaleString()}`}
                      </div>
                    </div>
                  </div>

                  {/* 莊家拯救募資計畫區塊 */}
                  {((houseNet <= -50000) || (rescueData && rescueData.totalRaised > 0)) && (
                    <div className="bg-amber-500/10 dark:bg-amber-500/5 border border-amber-500/20 rounded-xl md:rounded-2xl p-4 md:p-5 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xl md:text-2xl">{rescueData?.isRescued ? '🎉' : '🆘'}</span>
                          <div>
                            <h4 className="text-sm md:text-base font-black text-amber-600 dark:text-amber-400">
                              {rescueData?.isRescued ? '莊家重組成功！東山再起' : '莊家瀕臨破產！東山再起募資計畫'}
                            </h4>
                            <p className="text-[10px] md:text-xs text-slate-500 dark:text-slate-400 font-semibold mt-0.5">
                              {rescueData?.isRescued 
                                ? '今日募資已達標！感謝球員熱心支援，所有捐贈者已獲得 1.2 倍羽毛獎勵！' 
                                : '莊家因賠付過多宣告破產。募集達到 50,000 羽毛後莊家將東山再起，並加倍奉還所有捐贈者 1.2 倍羽毛！'}
                            </p>
                          </div>
                        </div>
                        <span className="text-xs font-bold px-2 py-1 bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-md">
                          {rescueData?.isRescued ? '已達成' : '募資中'}
                        </span>
                      </div>

                      {/* 進度條 */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs font-extrabold text-slate-600 dark:text-slate-300">
                          <span>募集進度 ({rescueData?.donationsCount ?? 0} 次捐贈)</span>
                          <span>
                            {rescueData?.totalRaised?.toLocaleString()} / {rescueData?.goal?.toLocaleString()} 羽毛
                            ({Math.min(100, Math.round(((rescueData?.totalRaised ?? 0) / (rescueData?.goal ?? 50000)) * 100))}%）
                          </span>
                        </div>
                        <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700/50">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(100, ((rescueData?.totalRaised ?? 0) / (rescueData?.goal ?? 50000)) * 100)}%` }}
                            transition={{ duration: 0.5, ease: 'easeOut' }}
                            className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full"
                          />
                        </div>
                      </div>

                      {/* 捐贈輸入與按鈕 */}
                      {!rescueData?.isRescued && currentUser?.email && (
                        <div className="flex flex-col sm:flex-row gap-3 items-end sm:items-center bg-white dark:bg-slate-900/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                          <div className="w-full sm:flex-1 space-y-1">
                            <label className="text-[10px] md:text-xs font-bold text-slate-400">捐贈羽毛數量</label>
                            <input
                              type="number"
                              value={donateAmount || ''}
                              onChange={(e) => setDonateAmount(Math.max(1, parseInt(e.target.value) || 0))}
                              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-black text-slate-800 dark:text-white focus:outline-none focus:border-amber-400"
                              placeholder="請輸入捐贈數量"
                              min={1}
                              disabled={isDonating}
                            />
                          </div>
                          <button
                            onClick={handleDonate}
                            disabled={isDonating || donateAmount <= 0}
                            className="w-full sm:w-auto bg-amber-500 hover:bg-amber-600 active:scale-95 disabled:opacity-50 disabled:pointer-events-none text-white font-extrabold text-sm px-6 py-2.5 rounded-lg shadow-md shadow-amber-500/10 transition-all flex items-center justify-center gap-1.5"
                          >
                            {isDonating ? <Loader2 className="w-4 h-4 animate-spin" /> : '🪙'}
                            捐贈羽毛救莊家
                          </button>
                        </div>
                      )}

                      {donationError && (
                        <p className="text-xs font-extrabold text-red-500 dark:text-red-400 mt-1">❌ {donationError}</p>
                      )}
                      {donationSuccess && (
                        <p className="text-xs font-extrabold text-emerald-500 mt-1">✅ {donationSuccess}</p>
                      )}
                    </div>
                  )}

                  {/* Matches Breakdown */}
                  <div className="space-y-3 md:space-y-4">
                    <h4 className="text-xs md:text-sm font-black text-slate-900 dark:text-white tracking-wide">場次收支明細</h4>

                    {(!data?.matches || data.matches.length === 0) ? (
                      <div className="text-center py-12 text-slate-400 font-bold bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                        本日無投注對戰紀錄
                      </div>
                    ) : (
                      data.matches.map((match: any, index: number) => {
                        const hasBets = match.betTypes && match.betTypes.length > 0;
                        const isExpanded = !!expandedMatches[match.id];

                        return (
                          <div
                            key={match.id}
                            className="border border-slate-100 dark:border-slate-800 rounded-xl md:rounded-2xl overflow-hidden bg-white dark:bg-slate-900"
                          >
                            {/* Match Header */}
                            <div
                              onClick={() => hasBets && toggleMatch(match.id)}
                              className={`flex flex-col sm:flex-row sm:justify-between sm:items-center p-3 md:p-4 gap-2 select-none ${
                                hasBets ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50' : ''
                              }`}
                            >
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-[10px] font-black px-1.5 py-0.5 bg-emerald-500/10 text-emerald-500 rounded">
                                  場地 {match.courtName}
                                </span>
                                <span className="text-[10px] font-mono font-bold text-slate-400 dark:text-slate-600">
                                  #{index + 1}
                                </span>
                                <div className="text-xs md:text-sm font-bold text-slate-900 dark:text-white">
                                  <span className={match.winner === 1 ? 'text-emerald-500 font-black' : ''}>{match.t1Names}</span>
                                  <span className="mx-1 text-slate-400 dark:text-slate-600">vs</span>
                                  <span className={match.winner === 2 ? 'text-emerald-500 font-black' : ''}>{match.t2Names}</span>
                                </div>
                                <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 px-1 py-0.5 bg-slate-100 dark:bg-slate-800 rounded">
                                  {match.score}
                                </span>
                              </div>

                              <div className="flex justify-between items-center sm:justify-end gap-4">
                                {!hasBets ? (
                                  <span className="text-[10px] md:text-xs font-bold text-slate-400">無投注</span>
                                ) : (
                                  <>
                                    <div className="flex gap-3 text-[10px] md:text-xs font-bold">
                                      <span className="text-slate-400">
                                        抽水: <span className="text-slate-700 dark:text-slate-300 tabular-nums">+{match.betTypes.reduce((sum: number, b: any) => sum + b.rake, 0).toLocaleString()}</span>
                                      </span>
                                      <span className="text-slate-400">
                                        補貼: <span className="text-slate-700 dark:text-slate-300 tabular-nums">-{match.betTypes.reduce((sum: number, b: any) => sum + b.subsidy, 0).toLocaleString()}</span>
                                      </span>
                                    </div>
                                    {isExpanded ? (
                                      <ChevronUp className="w-4 h-4 text-slate-400" />
                                    ) : (
                                      <ChevronDown className="w-4 h-4 text-slate-400" />
                                    )}
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Match Bets Detail */}
                            {hasBets && isExpanded && (
                              <div className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 p-2 md:p-4 space-y-3">
                                {match.betTypes.map((bt: any) => (
                                  <div key={bt.betType} className="space-y-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl p-3">
                                    <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-2">
                                      <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                                        【{bt.betTypeLabel}】
                                      </span>
                                      <div className="text-[10px] md:text-xs font-bold flex gap-2.5 text-slate-500">
                                        <span>總投注: <span className="tabular-nums">{(bt.totalT1 + bt.totalT2).toLocaleString()}</span></span>
                                        <span>抽水: <span className="text-emerald-500 tabular-nums">+{bt.rake}</span></span>
                                        <span>補貼: <span className="text-red-500 tabular-nums">-{bt.subsidy}</span></span>
                                      </div>
                                    </div>

                                    {/* Desktop Table (hidden on mobile) */}
                                    <table className="hidden md:table w-full text-left border-collapse text-xs">
                                      <thead>
                                        <tr className="text-[10px] font-black text-slate-400 dark:text-slate-500 border-b border-slate-50 dark:border-slate-800 uppercase tracking-wider">
                                          <th className="py-2">玩家</th>
                                          <th className="py-2">投注項目</th>
                                          <th className="py-2 text-right">投注額</th>
                                          <th className="py-2 text-right">鎖定賠率</th>
                                          <th className="py-2 text-right">池賠率</th>
                                          <th className="py-2 text-center">結果</th>
                                          <th className="py-2 text-right">莊家補貼</th>
                                          <th className="py-2 text-right">總返還</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {bt.bets.map((b: any, idx: number) => (
                                          <tr key={idx} className="border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                                            <td className="py-2 font-bold text-slate-700 dark:text-slate-300">{b.playerName}</td>
                                            <td className="py-2 text-slate-500">
                                              {bt.betType === 'moneyline' && `Team ${b.team}`}
                                              {bt.betType === 'handicap' && `Team ${b.team}`}
                                              {bt.betType === 'over_under' && (b.team === 1 ? '大' : '小')}
                                            </td>
                                            <td className="py-2 text-right font-mono tabular-nums">{b.amount.toLocaleString()}</td>
                                            <td className="py-2 text-right font-mono text-slate-500">{b.lockedOdds.toFixed(2)}</td>
                                            <td className="py-2 text-right font-mono text-slate-500">{b.poolOdds ? b.poolOdds.toFixed(2) : '-'}</td>
                                            <td className="py-2 text-center">
                                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-black ${
                                                b.status === 'WIN' ? 'bg-emerald-500/10 text-emerald-500' :
                                                b.status === 'PUSH' ? 'bg-slate-100 text-slate-500 dark:bg-slate-800' :
                                                'bg-red-500/10 text-red-500'
                                              }`}>
                                                {b.status}
                                              </span>
                                            </td>
                                            <td className="py-2 text-right font-mono text-amber-500 tabular-nums">{b.subsidy > 0 ? `+${b.subsidy.toLocaleString()}` : '-'}</td>
                                            <td className="py-2 text-right font-mono font-bold text-slate-800 dark:text-slate-200 tabular-nums">
                                              {b.payout.toLocaleString()}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>

                                    {/* Mobile Card List (hidden on desktop) */}
                                    <div className="block md:hidden space-y-2">
                                      {bt.bets.map((b: any, idx: number) => (
                                        <div key={idx} className="bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 space-y-1.5">
                                          <div className="flex justify-between items-center">
                                            <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">{b.playerName}</span>
                                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-black ${
                                              b.status === 'WIN' ? 'bg-emerald-500/10 text-emerald-500' :
                                              b.status === 'PUSH' ? 'bg-slate-100 text-slate-500 dark:bg-slate-800' :
                                              'bg-red-500/10 text-red-500'
                                            }`}>
                                              {b.status}
                                            </span>
                                          </div>
                                          
                                          <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] text-slate-500">
                                            <div>
                                              項目: <span className="font-semibold text-slate-700 dark:text-slate-300">
                                                {bt.betType === 'moneyline' && `Team ${b.team}`}
                                                {bt.betType === 'handicap' && `Team ${b.team}`}
                                                {bt.betType === 'over_under' && (b.team === 1 ? '大' : '小')}
                                              </span>
                                            </div>
                                            <div>投注: <span className="font-semibold text-slate-700 dark:text-slate-300">{b.amount.toLocaleString()}</span></div>
                                            <div>鎖定賠率: <span className="font-semibold text-slate-700 dark:text-slate-300">{b.lockedOdds.toFixed(2)}</span></div>
                                            <div>池賠率: <span className="font-semibold text-slate-700 dark:text-slate-300">{b.poolOdds ? b.poolOdds.toFixed(2) : '-'}</span></div>
                                          </div>
                                          
                                          <div className="flex justify-between items-center pt-1.5 border-t border-slate-100 dark:border-slate-800 text-[10px]">
                                            <div>
                                              {b.subsidy > 0 && (
                                                <span className="text-amber-500 font-medium">補貼: +{b.subsidy.toLocaleString()}</span>
                                              )}
                                            </div>
                                            <div className="font-bold text-slate-600 dark:text-slate-400">
                                              返還: <span className="font-black text-emerald-500 text-xs">{b.payout.toLocaleString()}</span>
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
