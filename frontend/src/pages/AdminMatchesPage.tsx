import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BatchMatchEditor } from '../components/admin/BatchMatchEditor';
import { useAuth } from '../context/AuthContext';
import { cn, getTaipeiDateString } from '../lib/utils';
import ArrowLeft from "lucide-react/dist/esm/icons/arrow-left";
import ShieldCheck from "lucide-react/dist/esm/icons/shield-check";
import Users from "lucide-react/dist/esm/icons/users";
import Trophy from "lucide-react/dist/esm/icons/trophy";
import Activity from "lucide-react/dist/esm/icons/activity";
import Crown from "lucide-react/dist/esm/icons/crown";
import Rocket from "lucide-react/dist/esm/icons/rocket";
import Search from "lucide-react/dist/esm/icons/search";
import { RatingDistributionChart } from '../components/admin/RatingDistributionChart';
import { DailyAnalyticsWidgets } from '../components/admin/DailyAnalyticsWidgets';

export function AdminMatchesPage() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [selectedDate, setSelectedDate] = useState(getTaipeiDateString());

  const isAdmin = currentUser?.isAdmin;

  // Basic check (UI level)
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="text-center">
          <h1 className="text-2xl font-black text-slate-800 dark:text-white mb-4">權限不足</h1>
          <button onClick={() => navigate('/')} className="px-6 py-2 bg-emerald-500 text-white rounded-xl font-bold">返回首頁</button>
        </div>
      </div>
    );
  }

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-slate-950 font-sans selection:bg-amber-100 dark:selection:bg-amber-900/30 pb-20">
      {/* Premium Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-amber-500/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-500/5 blur-[120px] rounded-full" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-6 md:pt-12">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 md:mb-12">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate(-1)}
              className="p-2 md:p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all active:scale-95"
            >
              <ArrowLeft size={20} className="text-slate-600 dark:text-slate-400" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <Crown className="text-amber-500 animate-pulse" size={20} />
                <h1 className="text-xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tighter uppercase">大隊長作戰本部</h1>
              </div>
              <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] md:tracking-[0.3em] mt-1 ml-0.5">Captain's Operations Headquarters</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 md:gap-3">
            <div className="flex-1 md:flex-none flex items-center gap-2 bg-white dark:bg-slate-900 px-3 md:px-4 py-2 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
              <Search size={16} className="text-slate-400" />
              <input 
                type="date" 
                value={selectedDate} 
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent border-none outline-none text-xs md:text-sm font-black text-slate-700 dark:text-slate-200 w-full md:w-auto"
              />
            </div>
            <div className="px-3 md:px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl whitespace-nowrap">
              <span className="text-[9px] md:text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Online</span>
            </div>
          </div>
        </div>

        {/* Analytics Section */}
        <DailyAnalyticsWidgets date={selectedDate} />

        {/* Charts Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-8">
          <RatingDistributionChart type="instant" title="即時戰力分佈 (Instant)" color="#10b981" date={selectedDate} />
          <RatingDistributionChart type="comprehensive" title="生涯戰力分佈 (Comprehensive)" color="#f59e0b" date={selectedDate} />
        </div>

        {/* Content Box */}
        <div className="bg-white dark:bg-slate-900/50 rounded-[2rem] md:rounded-[3rem] border border-slate-100 dark:border-white/5 p-4 md:p-8 shadow-2xl overflow-hidden flex flex-col min-h-[500px] md:min-h-[600px]">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center">
              <Rocket size={18} className="text-slate-400" />
            </div>
            <h3 className="text-base md:text-lg font-black text-slate-800 dark:text-white">對戰批次編輯器</h3>
          </div>
          <div className="flex-1 overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
            <BatchMatchEditor onUpdate={() => {}} date={selectedDate} />
          </div>
        </div>
      </div>
    </div>
  );
}
