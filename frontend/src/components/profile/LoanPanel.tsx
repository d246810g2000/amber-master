import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import Handshake from 'lucide-react/dist/esm/icons/handshake';
import ArrowUpRight from 'lucide-react/dist/esm/icons/arrow-up-right';
import ArrowDownLeft from 'lucide-react/dist/esm/icons/arrow-down-left';
import Plus from 'lucide-react/dist/esm/icons/plus';
import Coins from 'lucide-react/dist/esm/icons/coins';
import AlertCircle from 'lucide-react/dist/esm/icons/alert-circle';
import CheckCircle2 from 'lucide-react/dist/esm/icons/check-circle-2';
import Loader2 from 'lucide-react/dist/esm/icons/loader-2';
import Calendar from 'lucide-react/dist/esm/icons/calendar';
import ChevronDown from 'lucide-react/dist/esm/icons/chevron-down';
import * as gasApi from '../../lib/gasApi';
import { useDialog } from '../../context/DialogContext';
import { cn } from '../../lib/utils';

interface LoanPanelProps {
  playerId: string;
  lenderFeathers: number;
}

export const LoanPanel: React.FC<LoanPanelProps> = ({ playerId, lenderFeathers }) => {
  const queryClient = useQueryClient();
  const { showAlert } = useDialog();

  // ─── Queries ───
  const { data: loanData, isLoading: isLoansLoading, refetch: refetchLoans } = useQuery({
    queryKey: ['playerLoans', playerId],
    queryFn: () => gasApi.getPlayerLoans(playerId),
    staleTime: 10_000,
  });

  const { data: players } = useQuery({
    queryKey: ['players-base'],
    queryFn: () => gasApi.fetchPlayers(),
    staleTime: 60_000,
  });

  // ─── UI States ───
  const [subTab, setSubTab] = useState<'borrowed' | 'lent'>('borrowed');
  
  // Create Loan Form States
  const [targetBorrowerId, setTargetBorrowerId] = useState('');
  const [principal, setPrincipal] = useState<number | ''>('');
  const [interestRate, setInterestRate] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Repayment States
  const [repayLoanId, setRepayLoanId] = useState<number | null>(null);
  const [repayAmount, setRepayAmount] = useState<number | ''>('');
  const [isRepaying, setIsRepaying] = useState(false);

  // Filter other players for dropdown
  const otherPlayers = React.useMemo(() => {
    if (!players) return [];
    return players.filter(p => p.id !== playerId);
  }, [players, playerId]);

  // Calculate projected payment
  const projectedDue = React.useMemo(() => {
    if (!principal || isNaN(principal)) return 0;
    return Math.floor(principal * (1 + interestRate / 100.0));
  }, [principal, interestRate]);

  // ─── Actions ───
  const handleCreateLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!targetBorrowerId) {
      setFormError('請選擇欲借款的好友');
      return;
    }
    if (!principal || principal <= 0) {
      setFormError('本金必須大於 0');
      return;
    }
    if (principal > lenderFeathers) {
      setFormError(`羽毛餘額不足 (目前: ${lenderFeathers} 根)`);
      return;
    }
    if (interestRate < 0 || interestRate > 100) {
      setFormError('利息比例須介於 0% ~ 100%');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await gasApi.createLoan(playerId, targetBorrowerId, principal, interestRate);
      if (res.status === 'success') {
        showAlert('成功', res.message || '已成功轉帳並建立借貸合約！');
        // Reset form
        setTargetBorrowerId('');
        setPrincipal('');
        setInterestRate(0);
        // Refresh data
        queryClient.invalidateQueries({ queryKey: ['playerLoans', playerId] });
        queryClient.invalidateQueries({ queryKey: ['playerProfile', playerId] });
        queryClient.invalidateQueries({ queryKey: ['players'] });
      } else {
        setFormError(res.message || '借款失敗，請重試。');
      }
    } catch (err: any) {
      setFormError(err.message || '網路或伺服器錯誤');
    } finally {
      setIsSubmitting(false);
    }
  };

  const [actioningLoanId, setActioningLoanId] = useState<number | null>(null);
  const [actionType, setActionType] = useState<'accept' | 'reject' | 'cancel' | null>(null);

  const handleAcceptLoan = async (loanId: number) => {
    try {
      setActioningLoanId(loanId);
      setActionType('accept');
      const res = await gasApi.acceptLoan(loanId);
      if (res.status === 'success') {
        showAlert('成功', res.message || '已成功接受借貸！');
        queryClient.invalidateQueries({ queryKey: ['playerLoans', playerId] });
        queryClient.invalidateQueries({ queryKey: ['playerProfile', playerId] });
        queryClient.invalidateQueries({ queryKey: ['players'] });
      }
    } catch (err: any) {
      showAlert('失敗', err.message || '接受借貸失敗，請稍後再試。');
    } finally {
      setActioningLoanId(null);
      setActionType(null);
    }
  };

  const handleRejectLoan = async (loanId: number) => {
    try {
      setActioningLoanId(loanId);
      setActionType('reject');
      const res = await gasApi.rejectLoan(loanId);
      if (res.status === 'success') {
        showAlert('成功', res.message || '已拒絕該筆借貸申請。');
        queryClient.invalidateQueries({ queryKey: ['playerLoans', playerId] });
        queryClient.invalidateQueries({ queryKey: ['playerProfile', playerId] });
        queryClient.invalidateQueries({ queryKey: ['players'] });
      }
    } catch (err: any) {
      showAlert('失敗', err.message || '拒絕失敗，請稍後再試。');
    } finally {
      setActioningLoanId(null);
      setActionType(null);
    }
  };

  const handleCancelLoan = async (loanId: number) => {
    try {
      setActioningLoanId(loanId);
      setActionType('cancel');
      const res = await gasApi.cancelLoan(loanId);
      if (res.status === 'success') {
        showAlert('成功', res.message || '已取消借出申請，本金已退回餘額。');
        queryClient.invalidateQueries({ queryKey: ['playerLoans', playerId] });
        queryClient.invalidateQueries({ queryKey: ['playerProfile', playerId] });
        queryClient.invalidateQueries({ queryKey: ['players'] });
      }
    } catch (err: any) {
      showAlert('失敗', err.message || '取消失敗，請稍後再試。');
    } finally {
      setActioningLoanId(null);
      setActionType(null);
    }
  };

  const handleRepay = async (loanId: number, maxAmount: number) => {
    try {
      setIsRepaying(true);
      const amountParam = repayAmount !== '' ? Number(repayAmount) : undefined;
      
      if (amountParam !== undefined && (amountParam <= 0 || amountParam > lenderFeathers)) {
        showAlert('錯誤', `還款金額必須大於 0 且不高於您的羽毛餘額 (${lenderFeathers} 根)`);
        return;
      }

      const res = await gasApi.repayLoan(loanId, amountParam);
      if (res.status === 'success') {
        showAlert('成功', res.message || '還款成功！');
        setRepayLoanId(null);
        setRepayAmount('');
        queryClient.invalidateQueries({ queryKey: ['playerLoans', playerId] });
        queryClient.invalidateQueries({ queryKey: ['playerProfile', playerId] });
        queryClient.invalidateQueries({ queryKey: ['players'] });
      }
    } catch (err: any) {
      showAlert('失敗', err.message || '還款失敗，請稍後再試。');
    } finally {
      setIsRepaying(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview Status Bar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-slate-50/50 dark:bg-slate-900/30 rounded-3xl p-6 border border-slate-200/50 dark:border-white/5 shadow-inner">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500">
            <Handshake size={24} />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white">羽毛借貸交易中心</h3>
            <p className="text-[11px] text-slate-500 dark:text-zinc-500 font-bold uppercase tracking-wider">
              當借貸人帳戶有債務時，將於週三領取羽毛時優先扣款清償。
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 px-5 py-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-white/5 shadow-sm">
          <Coins size={16} className="text-amber-500" />
          <span className="text-xs font-bold text-slate-400">當前羽毛餘額:</span>
          <span className="text-sm font-black text-slate-900 dark:text-white">{lenderFeathers} 根</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Create Loan (5 cols) */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-[2rem] p-6 border border-slate-100 dark:border-white/5 shadow-sm space-y-5">
          <div className="flex items-center gap-2">
            <Plus size={16} className="text-emerald-500" />
            <h4 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest">發起好友借貸</h4>
          </div>

          <form onSubmit={handleCreateLoan} className="space-y-4">
            {/* Select Borrower */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">借款人 (好友)</label>
              <div className="relative">
                <select
                  value={targetBorrowerId}
                  onChange={(e) => setTargetBorrowerId(e.target.value)}
                  className="w-full pl-4 pr-10 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-white/5 rounded-2xl text-xs font-bold text-slate-900 dark:text-white appearance-none focus:outline-none focus:border-emerald-500 transition-colors"
                >
                  <option value="">選擇一位球員...</option>
                  {otherPlayers.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.feathers || 0} 羽毛)</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Principal */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">借款本金</label>
              <div className="relative">
                <input
                  type="number"
                  placeholder="輸入要借出的本金"
                  value={principal}
                  onChange={(e) => setPrincipal(e.target.value !== '' ? Number(e.target.value) : '')}
                  className="w-full pl-4 pr-16 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-white/5 rounded-2xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 transition-colors"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400">羽毛</span>
              </div>
              {/* Quick options */}
              <div className="flex gap-1.5 flex-wrap">
                {[100, 200, 500, 1000].map(amt => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setPrincipal(amt)}
                    className="px-3 py-1.5 bg-slate-100 dark:bg-zinc-800 text-[10px] font-bold text-slate-600 dark:text-zinc-400 rounded-xl hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors"
                  >
                    {amt}
                  </button>
                ))}
              </div>
            </div>

            {/* Interest Rate */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">約定年/期利率 (%)</label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="100"
                  placeholder="0"
                  value={interestRate}
                  onChange={(e) => setInterestRate(Math.min(100, Math.max(0, Number(e.target.value))))}
                  className="w-full pl-4 pr-16 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-white/5 rounded-2xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 transition-colors"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400">%</span>
              </div>
              {/* Quick options */}
              <div className="flex gap-1.5">
                {[0, 5, 10, 20].map(rate => (
                  <button
                    key={rate}
                    type="button"
                    onClick={() => setInterestRate(rate)}
                    className={cn(
                      "px-3 py-1.5 text-[10px] font-bold rounded-xl transition-colors",
                      interestRate === rate 
                        ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" 
                        : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-200"
                    )}
                  >
                    {rate}%
                  </button>
                ))}
              </div>
            </div>

            {/* Projected Display */}
            {principal !== '' && principal > 0 && (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/50 rounded-2xl space-y-1.5">
                <div className="flex justify-between text-xs font-bold text-emerald-800 dark:text-emerald-400">
                  <span>本金:</span>
                  <span>{principal} 羽毛</span>
                </div>
                <div className="flex justify-between text-xs font-bold text-emerald-800 dark:text-emerald-400">
                  <span>利息 ({interestRate}%):</span>
                  <span>+{projectedDue - principal} 羽毛</span>
                </div>
                <div className="h-px bg-emerald-200 dark:bg-emerald-900/50 my-2" />
                <div className="flex justify-between text-xs font-black text-emerald-900 dark:text-emerald-300">
                  <span>預期回收總金額:</span>
                  <span className="text-sm font-black">{projectedDue} 羽毛</span>
                </div>
              </div>
            )}

            {formError && (
              <div className="flex items-center gap-2 p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-bold">
                <AlertCircle size={14} className="shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || !targetBorrowerId || !principal}
              className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-white rounded-2xl text-xs font-black transition-all shadow-lg shadow-emerald-500/10 active:scale-98 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  發送借款中...
                </>
              ) : (
                '確認轉帳借出'
              )}
            </button>
          </form>
        </div>

        {/* Right Column: Loan Lists (7 cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-[2rem] p-6 border border-slate-100 dark:border-white/5 shadow-sm space-y-5">
          <div className="flex border-b border-slate-100 dark:border-white/5 p-1 gap-2 bg-slate-50 dark:bg-slate-950 rounded-2xl w-fit">
            {[
              { id: 'borrowed' as const, label: '借入債務', icon: <ArrowDownLeft size={14} className="text-rose-500" /> },
              { id: 'lent' as const, label: '借出債權', icon: <ArrowUpRight size={14} className="text-emerald-500" /> }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setSubTab(tab.id)}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition-all",
                  subTab === tab.id 
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm" 
                    : "text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200"
                )}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {isLoansLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Loader2 size={24} className="animate-spin text-emerald-500" />
                <span className="text-xs font-bold text-slate-400">載入帳單中...</span>
              </div>
            ) : !loanData || (subTab === 'borrowed' ? loanData.borrowed.length === 0 : loanData.lent.length === 0) ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-20 text-center gap-2.5"
              >
                <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-white/5 flex items-center justify-center text-slate-300 dark:text-zinc-700">
                  <Handshake size={20} />
                </div>
                <h5 className="text-xs font-black text-slate-500 dark:text-zinc-400">尚無任何借貸合約</h5>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold max-w-[200px]">當有借還羽毛時，合約與交易明細會即時記錄在此。</p>
              </motion.div>
            ) : (
              <motion.div
                key={subTab}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="space-y-4"
              >
                {(subTab === 'borrowed' ? loanData.borrowed : loanData.lent).map((loan) => {
                  const remaining = loan.total_due - loan.repaid_amount;
                  const isRepaid = loan.status === 'repaid';
                  const isHistorical = ['repaid', 'rejected', 'cancelled', 'expired'].includes(loan.status);

                  const getStatusBadge = (status: string, isLent: boolean) => {
                    switch (status) {
                      case 'pending':
                        return {
                          text: isLent ? '等待確認' : '待接受',
                          className: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-500/20'
                        };
                      case 'active':
                        return {
                          text: '借款中',
                          className: 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                        };
                      case 'repaid':
                        return {
                          text: '已結清',
                          className: 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                        };
                      case 'rejected':
                        return {
                          text: '已拒絕',
                          className: 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                        };
                      case 'cancelled':
                        return {
                          text: '已取消',
                          className: 'bg-slate-100 text-slate-500 dark:bg-zinc-800 dark:text-zinc-400'
                        };
                      case 'expired':
                        return {
                          text: '已過期',
                          className: 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                        };
                      default:
                        return {
                          text: status,
                          className: 'bg-slate-100 text-slate-500 dark:bg-zinc-800'
                        };
                    }
                  };

                  const badge = getStatusBadge(loan.status, subTab === 'lent');

                  return (
                    <div
                      key={loan.id}
                      className={cn(
                        "p-5 rounded-[1.5rem] border transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4",
                        isHistorical
                          ? "bg-slate-50/50 dark:bg-zinc-950/20 border-slate-100 dark:border-white/5 opacity-70"
                          : "bg-white dark:bg-slate-900 border-slate-100 dark:border-white/5 hover:border-slate-200 dark:hover:border-white/10 shadow-sm"
                      )}
                    >
                      <div className="space-y-2">
                        {/* Title & Status */}
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                            {subTab === 'borrowed' ? `債主: ${loan.lender_name}` : `借款人: ${loan.borrower_name}`}
                          </span>
                          <span className={cn("px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider", badge.className)}>
                            {badge.text}
                          </span>
                        </div>

                        {/* Breakdown */}
                        <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-slate-400 font-bold">
                          <div>本金: <span className="font-extrabold text-slate-600 dark:text-slate-300">{loan.principal}</span></div>
                          <div>利息: <span className="font-extrabold text-slate-600 dark:text-slate-300">{loan.interest_rate}%</span></div>
                          <div>應還總額: <span className="font-extrabold text-slate-600 dark:text-slate-300">{loan.total_due}</span></div>
                          <div>已還款: <span className="font-extrabold text-emerald-500">{loan.repaid_amount}</span></div>
                        </div>

                        {/* Date */}
                        {loan.created_at && (
                          <div className="flex items-center gap-1 text-[10px] text-slate-400 font-bold">
                            <Calendar size={10} />
                            <span>建立時間: {new Date(loan.created_at).toLocaleString('zh-TW')}</span>
                          </div>
                        )}
                      </div>

                      {/* Right Action side */}
                      <div className="w-full sm:w-auto text-right space-y-2 flex flex-col items-end">
                        {loan.status === 'active' && (
                          <div className="text-xs font-bold text-rose-500">
                            未清償: <span className="text-sm font-black">{remaining}</span> 羽毛
                          </div>
                        )}
                        
                        {subTab === 'borrowed' && loan.status === 'active' && (
                          <div className="space-y-1.5 w-full sm:w-auto">
                            {repayLoanId === loan.id ? (
                              <div className="flex flex-col gap-2 w-full sm:w-48 bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-white/5">
                                <input
                                  type="number"
                                  placeholder="全部還清..."
                                  value={repayAmount}
                                  onChange={(e) => setRepayAmount(e.target.value !== '' ? Number(e.target.value) : '')}
                                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-white/5 rounded-lg text-xs font-bold text-slate-900 dark:text-white focus:outline-none"
                                />
                                <div className="flex gap-2.5">
                                  <button
                                    onClick={() => handleRepay(loan.id, remaining)}
                                    disabled={isRepaying}
                                    className="flex-1 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-white rounded-lg text-[10px] font-black transition-colors"
                                  >
                                    確認還款
                                  </button>
                                  <button
                                    onClick={() => { setRepayLoanId(null); setRepayAmount(''); }}
                                    className="px-2.5 py-1.5 bg-slate-200 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 rounded-lg text-[10px] font-bold"
                                  >
                                    取消
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={() => { setRepayLoanId(loan.id); setRepayAmount(''); }}
                                className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-[10px] font-black transition-colors shadow-sm w-full sm:w-auto"
                              >
                                還款
                              </button>
                            )}
                          </div>
                        )}

                        {subTab === 'borrowed' && loan.status === 'pending' && (
                          <div className="flex gap-2 w-full sm:w-auto">
                            <button
                              onClick={() => handleAcceptLoan(loan.id)}
                              disabled={actioningLoanId !== null}
                              className="flex-1 sm:flex-initial px-4 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white rounded-xl text-[10px] font-black transition-all shadow-sm active:scale-95"
                            >
                              {actioningLoanId === loan.id && actionType === 'accept' ? '接受中...' : '接受'}
                            </button>
                            <button
                              onClick={() => handleRejectLoan(loan.id)}
                              disabled={actioningLoanId !== null}
                              className="flex-1 sm:flex-initial px-4 py-2 bg-rose-500 hover:bg-rose-400 disabled:opacity-50 text-white rounded-xl text-[10px] font-black transition-all shadow-sm active:scale-95"
                            >
                              {actioningLoanId === loan.id && actionType === 'reject' ? '拒絕中...' : '拒絕'}
                            </button>
                          </div>
                        )}

                        {subTab === 'lent' && loan.status === 'pending' && (
                          <button
                            onClick={() => handleCancelLoan(loan.id)}
                            disabled={actioningLoanId !== null}
                            className="px-4 py-2 bg-rose-500 hover:bg-rose-400 disabled:opacity-50 text-white rounded-xl text-[10px] font-black transition-all shadow-sm active:scale-95 w-full sm:w-auto"
                          >
                            {actioningLoanId === loan.id && actionType === 'cancel' ? '取消中...' : '取消借貸'}
                          </button>
                        )}

                        {subTab === 'lent' && loan.status === 'active' && (
                          <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 max-w-[140px] leading-relaxed">
                            等待好友主動還款，或週三自動扣款。
                          </div>
                        )}

                        {isRepaid && (
                          <div className="flex items-center justify-end gap-1 text-emerald-500 text-xs font-black">
                            <CheckCircle2 size={12} />
                            <span>已結清</span>
                          </div>
                        )}

                        {loan.status === 'rejected' && (
                          <span className="text-[10px] font-bold text-rose-500">已拒絕</span>
                        )}

                        {loan.status === 'cancelled' && (
                          <span className="text-[10px] font-bold text-slate-400">已取消</span>
                        )}

                        {loan.status === 'expired' && (
                          <span className="text-[10px] font-bold text-rose-500/80">已過期退還</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
