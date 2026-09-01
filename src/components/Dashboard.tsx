import React, { useEffect, useRef, useState } from "react";

import {
  Mic,
  Sparkles,
  Receipt,
  ShoppingBag,
  Calendar,
  ArrowUpRight,
  ArrowDownLeft,
  Minus,
  Coins,
  Wallet,
  Users,
  Search,
  HandCoins,
  Send,
  Truck,
  Bot,
  BarChart2,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

import { AppState, TransactionType } from '../types';
import { formatMoney, formatDate, formatShortDateTime, formatFullDateTime, formatFinancialValue } from '../utils/format';
import { calculateFbrSummary } from '../utils/taxEngine';

import { CalendarRemindersModal } from './CalendarRemindersModal';
import { GraphsModal } from './GraphsModal';
import { AiAssistantModal } from './AiAssistantModal';
import { AutoScrollText } from './AutoScrollText';

import shopPng from '../assets/images/Shop.png';

interface DashboardProps {
  state: AppState;
  isUrdu: boolean;
  onOpenQuickEntry: (type: TransactionType) => void;
  onOpenVoiceEntry: () => void;
  onNavigateScreen: (screen: any) => void;
  onOpenCalendar?: () => void;
  onOpenGraphs?: () => void;
  onOpenAi?: () => void;
  onOpenCashAccounts?: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  state,
  isUrdu,
  onOpenQuickEntry,
  onOpenVoiceEntry,
  onNavigateScreen,
  onOpenCalendar,
  onOpenGraphs,
  onOpenAi,
  onOpenCashAccounts,
}) => {
  const [recentSearch, setRecentSearch] = useState('');
  const [isCalendarOpenLocal, setIsCalendarOpenLocal] = useState(false);
  const [isGraphsOpenLocal, setIsGraphsOpenLocal] = useState(false);
  const [isAiOpenLocal, setIsAiOpenLocal] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const toggleGroupCollapse = (key: string) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleOpenCalendar = () => {
    if (onOpenCalendar) onOpenCalendar();
    else setIsCalendarOpenLocal(true);
  };

  const handleOpenGraphs = () => {
    if (onOpenGraphs) onOpenGraphs();
    else setIsGraphsOpenLocal(true);
  };

  const handleOpenAi = () => {
    if (onOpenAi) onOpenAi();
    else setIsAiOpenLocal(true);
  };

  const taxSummary = calculateFbrSummary(state);

  // Today's metrics calculation (timezone-safe local date matching)
  const getLocalDateStr = (dObj: Date) => {
    const y = dObj.getFullYear();
    const m = String(dObj.getMonth() + 1).padStart(2, '0');
    const d = String(dObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const todayStr = getLocalDateStr(new Date());

  const todayTransactions = state.transactions.filter((t) => {
    if (!t.date) return false;
    try {
      const txDateStr = getLocalDateStr(new Date(t.date));
      return txDateStr === todayStr;
    } catch {
      return false;
    }
  });

  const todaySales = todayTransactions
    .filter((t) => t.type === 'SALE')
    .reduce((s, t) => s + t.amount, 0);

  const todayPurchases = todayTransactions
    .filter((t) => t.type === 'PURCHASE')
    .reduce((s, t) => s + t.amount, 0);

  const todayExpenses = todayTransactions
    .filter((t) => t.type === 'EXPENSE')
    .reduce((s, t) => s + t.amount, 0);

  const todayProfit = todaySales > 0 || todayPurchases > 0 || todayExpenses > 0
    ? todaySales - (todayPurchases * 0.85 + todayExpenses)
    : 0;

  const hasTodayActivity = todaySales > 0 || todayPurchases > 0 || todayExpenses > 0;

  // Balances
  const cashAcc = state.bankAccounts.find((a) => a.type === 'CASH')?.balance ?? 0;

  const filteredRecent = state.transactions
    .filter((t) => {
      if (!recentSearch) return true;
      const q = recentSearch.toLowerCase();
      return (
        t.category.toLowerCase().includes(q) ||
        (t.partyName && t.partyName.toLowerCase().includes(q)) ||
        (t.notes && t.notes.toLowerCase().includes(q))
      );
    })
    .slice(0, 6);

  const todayDateObj = new Date();
  const dayName = todayDateObj.toLocaleDateString('en-PK', { weekday: 'short' });
  const dateStr = todayDateObj.toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' });
  const nameRef = useRef<HTMLParagraphElement>(null);
  const [fontSize, setFontSize] = useState(36);

  useEffect(() => {
    const fitText = () => {
      const el = nameRef.current;
      if (!el) return;

      let size = 36;
      el.style.fontSize = `${size}px`;

      while (el.scrollWidth > el.clientWidth && size > 18) {
        size--;
        el.style.fontSize = `${size}px`;
      }

      setFontSize(size);
    };

    fitText();
    window.addEventListener("resize", fitText);

    return () => window.removeEventListener("resize", fitText);
  }, [state.profile.ownerName]);

  return (
    <div className="space-y-4 pb-20 max-w-5xl mx-auto px-1">
      {/* 1. HERO WELCOME BANNER CARD ("Assalam o Alaikum, Muhammad Saleem!") - MATERIAL 3 / FINTECH STYLE (STRICT 60/40) */}
      <div 
        dir={isUrdu ? 'rtl' : 'ltr'}
        className={`${isUrdu ? 'bg-gradient-to-bl' : 'bg-gradient-to-br'} from-[#FFFFFF] via-[#F0FDF4] to-[#D1FAE5] px-4 pt-3.5 pb-14 sm:px-7 sm:pt-5 sm:pb-16 rounded-[28px] sm:rounded-[32px] border border-emerald-200/50 shadow-2xs relative overflow-hidden flex items-start justify-between min-h-[210px] sm:min-h-[250px]`}
      >
         {/* Left/Right 60% Reserved Area: Text ONLY with strict padding margin */}
        <div className={`w-[54%] sm:w-[50%] z-30 flex flex-col justify-start space-y-1.5 sm:space-y-2 shrink-0 ${isUrdu ? 'items-start text-right pl-2 sm:pl-6' : 'items-start text-left pr-2 sm:pr-6'}`}>
          {/* Greeting & Name */}
          <div className="space-y-0.5 w-full">
             <h1 className={`text-slate-800 tracking-tight whitespace-nowrap ${isUrdu ? 'text-[21px] sm:text-[28px] font-bold' : 'text-lg sm:text-2xl font-normal'}`}>
              {isUrdu ? 'السلام علیکم،' : 'Assalam o Alaikum,'}
            </h1>
            <p
              ref={nameRef}
              className="font-bold text-[#0F8A5F] whitespace-nowrap w-full leading-tight"
              style={{ fontSize: `${fontSize}px` }}
            >
              {state.profile.ownerName || "Muhammad Saleem"}!
            </p>
          </div>

          {/* Body Subtext */}
          <div className={isUrdu ? "text-[14px] sm:text-[17px] text-slate-800 font-medium leading-normal space-y-1 pt-1.5 sm:pt-2" : "text-xs sm:text-sm text-slate-700 font-normal leading-relaxed space-y-0.5 pt-1.5 sm:pt-2.5"}>
            <p className="whitespace-normal sm:whitespace-nowrap">{isUrdu ? 'یہاں آپ کے بزنس کا پورا کنٹرول،' : 'Complete control of your business here,'}</p>
            <p className="whitespace-normal sm:whitespace-nowrap">{isUrdu ? 'ایک جگہ, آسان اور اسمارٹ طریقے سے۔' : 'in one place, simple and smart.'}</p>
          </div>
        </div>

        {/* Get Help from AI Assistant Tab - Centered at the Bottom */}
        <div className="absolute bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 z-40 max-w-[90%]">
          <button
            type="button"
            onClick={onOpenAi}
            className={`inline-flex items-center gap-2 bg-gradient-to-r from-[#0F8A5F] to-[#066647] hover:from-[#066647] hover:to-[#044832] text-white font-bold rounded-xl shadow-xs hover:shadow-md transition-all cursor-pointer group active:scale-95 whitespace-nowrap max-w-full overflow-hidden ${isUrdu ? 'px-6 py-2 sm:py-2.5 text-[13.5px]' : 'px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm'}`}
          >
            <Bot className="w-4 h-4 text-emerald-200 group-hover:scale-110 transition-transform shrink-0" />
            <AutoScrollText isUrdu={isUrdu} containerClassName="max-w-full" className="leading-normal py-0.5">
              {isUrdu ? 'اے آئی اسسٹنٹ سے مدد لیں' : 'Get Help from AI Assistant'}
            </AutoScrollText>
            <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" />
          </button>
        </div>

        {/* Date Capsule Pill (Top Right / Left - Primary Green Tint) */}
        <button
          type="button"
          onClick={handleOpenCalendar}
          className={`absolute top-3.5 z-40 inline-flex items-center gap-1.5 sm:gap-2 bg-emerald-50/95 hover:bg-emerald-100/90 text-emerald-900 border border-emerald-200/90 px-2.5 py-1 sm:px-3.5 sm:py-1.5 rounded-full text-[11px] sm:text-sm font-semibold shadow-2xs transition-all cursor-pointer group max-w-[45%] overflow-hidden ${isUrdu ? 'left-3.5 sm:left-6' : 'right-3.5 sm:right-6'}`}
          title={isUrdu ? 'کالنڈر، ایونٹس اور یاد دہانی' : 'Calendar, Events & Reminders'}
        >
          <span className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-[#0F8A5F] text-white flex items-center justify-center shrink-0 shadow-2xs">
            <Calendar className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 stroke-[2.2]" />
          </span>
          <AutoScrollText isUrdu={isUrdu} containerClassName="max-w-full" className="font-bold text-emerald-950 leading-normal py-0.5">
            {dayName}, {dateStr}
          </AutoScrollText>
        </button>

        {/* 3D General Store Asset anchored cleanly at bottom-right/left matching reference layout */}
        {!isUrdu ? (
          <div className="absolute right-0 bottom-0 w-[38%] sm:w-[36%] h-full overflow-visible pointer-events-none z-20 flex items-end justify-end">
            <img
              src={shopPng}
              alt="3D Store"
              className="
                object-contain
                object-bottom object-right
                scale-[2.8]
                origin-bottom-right
                translate-x-[60%]
                translate-y-[35%]
                drop-shadow-[0_25px_50px_rgba(0,0,0,0.18)]
                select-none
              "
              style={{
                WebkitMaskImage: 'linear-gradient(to right, transparent, black 15px, black calc(100% - 15px), transparent)',
                maskImage: 'linear-gradient(to right, transparent, black 15px, black calc(100% - 15px), transparent)',
              }}
            />
          </div>
        ) : (
          <div className="absolute left-0 bottom-0 w-[38%] sm:w-[36%] h-full overflow-visible pointer-events-none z-20 flex items-end justify-end scale-x-[-1]">
            <img
              src={shopPng}
              alt="3D Store"
              className="
                object-contain
                object-bottom object-right
                scale-[2.8]
                origin-bottom-right
                translate-x-[60%]
                translate-y-[35%]
                drop-shadow-[0_25px_50px_rgba(0,0,0,0.18)]
                select-none
              "
              style={{
                WebkitMaskImage: 'linear-gradient(to right, transparent, black 15px, black calc(100% - 15px), transparent)',
                maskImage: 'linear-gradient(to right, transparent, black 15px, black calc(100% - 15px), transparent)',
              }}
            />
          </div>
        )}
      </div>

      {/* 2. TOP QUICK ACTION BUTTONS ROW (Responsive Grid: 3 Cols on Mobile, 4 on Tablet, 7 on Desktop) */}
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-1.5 sm:gap-2.5">
        {/* 1. Sales */}
        <button
          type="button"
          onClick={() => onOpenQuickEntry('SALE')}
          className={`bg-white hover:bg-emerald-50/40 border border-slate-200/90 hover:border-emerald-300 px-1 sm:px-2.5 py-1.5 sm:py-2.5 rounded-xl shadow-2xs hover:shadow-xs flex items-center gap-1 sm:gap-1.5 transition-all cursor-pointer group min-w-0 overflow-hidden ${isUrdu ? 'text-right' : 'text-left'}`}
        >
          <ShoppingBag className="w-4 h-4 sm:w-5.5 sm:h-5.5 text-[#0F8A5F] shrink-0 stroke-[2]" />

          {/* Vertical Divider Line */}
          <div className="h-6 sm:h-7 w-[1px] bg-slate-200 shrink-0" />

          <div className="min-w-0 flex-1 flex flex-col justify-center w-full overflow-hidden">
            <AutoScrollText
              isUrdu={isUrdu}
              containerClassName="max-w-full"
              className={`font-bold text-slate-800 group-hover:text-[#0F8A5F] transition-colors leading-tight tracking-tight ${isUrdu ? 'text-[13px] sm:text-[15px]' : 'text-[10px] sm:text-xs'}`}
            >
              {isUrdu ? 'فروخت' : 'Sales'}
            </AutoScrollText>
            <AutoScrollText
              isUrdu={isUrdu}
              containerClassName="max-w-full"
              className={`mt-0.5 leading-[1.15] ${isUrdu ? 'text-[10px] sm:text-[11.5px] font-semibold text-slate-500' : 'text-[8px] sm:text-[10px] font-medium text-slate-500'}`}
            >
              {isUrdu ? 'سیلز کا جائزہ' : 'Track sales'}
            </AutoScrollText>
          </div>
        </button>

        {/* 2. Purchases */}
        <button
          type="button"
          onClick={() => onOpenQuickEntry('PURCHASE')}
          className={`bg-white hover:bg-blue-50/40 border border-slate-200/90 hover:border-blue-300 px-1 sm:px-2.5 py-1.5 sm:py-2.5 rounded-xl shadow-2xs hover:shadow-xs flex items-center gap-1 sm:gap-1.5 transition-all cursor-pointer group min-w-0 overflow-hidden ${isUrdu ? 'text-right' : 'text-left'}`}
        >
          <Truck className="w-4 h-4 sm:w-5.5 sm:h-5.5 text-blue-600 shrink-0 stroke-[2]" />

          {/* Vertical Divider Line */}
          <div className="h-6 sm:h-7 w-[1px] bg-slate-200 shrink-0" />

          <div className="min-w-0 flex-1 flex flex-col justify-center w-full overflow-hidden">
            <AutoScrollText
              isUrdu={isUrdu}
              containerClassName="max-w-full"
              className={`font-bold text-slate-800 group-hover:text-blue-700 transition-colors leading-tight tracking-tight ${isUrdu ? 'text-[13px] sm:text-[15px]' : 'text-[10px] sm:text-xs'}`}
            >
              {isUrdu ? 'خریداری' : 'Purchases'}
            </AutoScrollText>
            <AutoScrollText
              isUrdu={isUrdu}
              containerClassName="max-w-full"
              className={`mt-0.5 leading-[1.15] ${isUrdu ? 'text-[10px] sm:text-[11.5px] font-semibold text-slate-500' : 'text-[8px] sm:text-[10px] font-medium text-slate-500'}`}
            >
              {isUrdu ? 'مال کا جائزہ' : 'Track purchases'}
            </AutoScrollText>
          </div>
        </button>

        {/* 3. Expenses */}
        <button
          type="button"
          onClick={() => onOpenQuickEntry('EXPENSE')}
          className={`bg-white hover:bg-rose-50/40 border border-slate-200/90 hover:border-rose-300 px-1 sm:px-2.5 py-1.5 sm:py-2.5 rounded-xl shadow-2xs hover:shadow-xs flex items-center gap-1 sm:gap-1.5 transition-all cursor-pointer group min-w-0 overflow-hidden ${isUrdu ? 'text-right' : 'text-left'}`}
        >
          <Receipt className="w-4 h-4 sm:w-5.5 sm:h-5.5 text-rose-600 shrink-0 stroke-[2]" />

          {/* Vertical Divider Line */}
          <div className="h-6 sm:h-7 w-[1px] bg-slate-200 shrink-0" />

          <div className="min-w-0 flex-1 flex flex-col justify-center w-full overflow-hidden">
            <AutoScrollText
              isUrdu={isUrdu}
              containerClassName="max-w-full"
              className={`font-bold text-slate-800 group-hover:text-rose-700 transition-colors leading-tight tracking-tight ${isUrdu ? 'text-[13px] sm:text-[15px]' : 'text-[10px] sm:text-xs'}`}
            >
              {isUrdu ? 'اخراجات' : 'Expenses'}
            </AutoScrollText>
            <AutoScrollText
              isUrdu={isUrdu}
              containerClassName="max-w-full"
              className={`mt-0.5 leading-[1.15] ${isUrdu ? 'text-[10px] sm:text-[11.5px] font-semibold text-slate-500' : 'text-[8px] sm:text-[10px] font-medium text-slate-500'}`}
            >
              {isUrdu ? 'اخراجات کا حساب' : 'Track expenses'}
            </AutoScrollText>
          </div>
        </button>

        {/* 4. Collect Udhaar */}
        <button
          type="button"
          onClick={() => onOpenQuickEntry('RECEIPT')}
          className={`bg-white hover:bg-amber-50/40 border border-slate-200/90 hover:border-amber-300 px-1 sm:px-2.5 py-1.5 sm:py-2.5 rounded-xl shadow-2xs hover:shadow-xs flex items-center gap-1 sm:gap-1.5 transition-all cursor-pointer group min-w-0 overflow-hidden ${isUrdu ? 'text-right' : 'text-left'}`}
        >
          <HandCoins className="w-4 h-4 sm:w-5.5 sm:h-5.5 text-amber-600 shrink-0 stroke-[2]" />

          {/* Vertical Divider Line */}
          <div className="h-6 sm:h-7 w-[1px] bg-slate-200 shrink-0" />

          <div className="min-w-0 flex-1 flex flex-col justify-center w-full overflow-hidden">
            <AutoScrollText
              isUrdu={isUrdu}
              containerClassName="max-w-full"
              className={`font-bold text-slate-800 group-hover:text-amber-700 transition-colors leading-tight tracking-tight ${isUrdu ? 'text-[13px] sm:text-[15px]' : 'text-[10px] sm:text-xs'}`}
            >
              {isUrdu ? 'ادھار وصولی' : 'Collect Udhaar'}
            </AutoScrollText>
            <AutoScrollText
              isUrdu={isUrdu}
              containerClassName="max-w-full"
              className={`mt-0.5 leading-[1.15] ${isUrdu ? 'text-[10px] sm:text-[11.5px] font-semibold text-slate-500' : 'text-[8px] sm:text-[10px] font-medium text-slate-500'}`}
            >
              {isUrdu ? 'وصولی کا ریکارڈ' : 'Collect dues'}
            </AutoScrollText>
          </div>
        </button>

        {/* 5. Pay Supplier */}
        <button
          type="button"
          onClick={() => onOpenQuickEntry('PAYMENT')}
          className={`bg-white hover:bg-purple-50/40 border border-slate-200/90 hover:border-purple-300 px-1 sm:px-2.5 py-1.5 sm:py-2.5 rounded-xl shadow-2xs hover:shadow-xs flex items-center gap-1 sm:gap-1.5 transition-all cursor-pointer group min-w-0 overflow-hidden ${isUrdu ? 'text-right' : 'text-left'}`}
        >
          <Send className="w-4 h-4 sm:w-5.5 sm:h-5.5 text-purple-600 shrink-0 stroke-[2]" />

          {/* Vertical Divider Line */}
          <div className="h-6 sm:h-7 w-[1px] bg-slate-200 shrink-0" />

          <div className="min-w-0 flex-1 flex flex-col justify-center w-full overflow-hidden">
            <AutoScrollText
              isUrdu={isUrdu}
              containerClassName="max-w-full"
              className={`font-bold text-slate-800 group-hover:text-purple-700 transition-colors leading-tight tracking-tight ${isUrdu ? 'text-[13px] sm:text-[15px]' : 'text-[10px] sm:text-xs'}`}
            >
              {isUrdu ? 'سپلائر ادائیگی' : 'Pay Supplier'}
            </AutoScrollText>
            <AutoScrollText
              isUrdu={isUrdu}
              containerClassName="max-w-full"
              className={`mt-0.5 leading-[1.15] ${isUrdu ? 'text-[10px] sm:text-[11.5px] font-semibold text-slate-500' : 'text-[8px] sm:text-[10px] font-medium text-slate-500'}`}
            >
              {isUrdu ? 'سپلائرز کو ادائیگی' : 'Pay suppliers'}
            </AutoScrollText>
          </div>
        </button>

        {/* 6. Analytics */}
        <button
          type="button"
          onClick={handleOpenGraphs}
          className={`bg-white hover:bg-indigo-50/40 border border-slate-200/90 hover:border-indigo-300 px-1 sm:px-2.5 py-1.5 sm:py-2.5 rounded-xl shadow-2xs hover:shadow-xs flex items-center gap-1 sm:gap-1.5 transition-all cursor-pointer group min-w-0 overflow-hidden ${isUrdu ? 'text-right' : 'text-left'}`}
        >
          <BarChart2 className="w-4 h-4 sm:w-5.5 sm:h-5.5 text-indigo-600 shrink-0 stroke-[2]" />

          {/* Vertical Divider Line */}
          <div className="h-6 sm:h-7 w-[1px] bg-slate-200 shrink-0" />

          <div className="min-w-0 flex-1 flex flex-col justify-center w-full overflow-hidden">
            <AutoScrollText
              isUrdu={isUrdu}
              containerClassName="max-w-full"
              className={`font-bold text-slate-800 group-hover:text-indigo-700 transition-colors leading-tight tracking-tight ${isUrdu ? 'text-[13px] sm:text-[15px]' : 'text-[10px] sm:text-xs'}`}
            >
              {isUrdu ? 'گراف و تجزیہ' : 'Analytics'}
            </AutoScrollText>
            <AutoScrollText
              isUrdu={isUrdu}
              containerClassName="max-w-full"
              className={`mt-0.5 leading-[1.15] ${isUrdu ? 'text-[10px] sm:text-[11.5px] font-semibold text-slate-500' : 'text-[8px] sm:text-[10px] font-medium text-slate-500'}`}
            >
              {isUrdu ? 'کاروباری رپورٹ' : 'View analytics'}
            </AutoScrollText>
          </div>
        </button>

        {/* 7. Cash on Hand */}
        <button
          type="button"
          onClick={onOpenCashAccounts}
          className={`col-span-3 sm:col-span-2 lg:col-span-1 bg-emerald-50/80 hover:bg-emerald-100/80 border border-emerald-200/90 hover:border-emerald-300 px-1 sm:px-2.5 py-1.5 sm:py-2.5 rounded-xl shadow-2xs hover:shadow-xs flex items-center gap-1 sm:gap-1.5 transition-all cursor-pointer group min-w-0 overflow-hidden ${isUrdu ? 'text-right' : 'text-left'}`}
        >
          <Wallet className="w-4 h-4 sm:w-5.5 sm:h-5.5 text-emerald-700 shrink-0 stroke-[2]" />

          {/* Vertical Divider Line */}
          <div className="h-6 sm:h-7 w-[1px] bg-emerald-200 shrink-0" />

          <div className="min-w-0 flex-1 flex flex-col justify-center w-full overflow-hidden">
            <AutoScrollText
              isUrdu={isUrdu}
              containerClassName="max-w-full"
              className={`font-bold text-slate-800 group-hover:text-emerald-950 transition-colors leading-tight tracking-tight ${isUrdu ? 'text-[13px] sm:text-[15px]' : 'text-[10px] sm:text-xs'}`}
            >
              {isUrdu ? 'نقدی ہاتھ میں' : 'Cash on Hand'}
            </AutoScrollText>
            <AutoScrollText
              isUrdu={isUrdu}
              containerClassName="max-w-full"
              className={`mt-0.5 leading-[1.15] ${isUrdu ? 'text-[10px] sm:text-[12px] font-bold text-emerald-800' : 'text-[8px] sm:text-[10px] font-extrabold text-emerald-800'}`}
            >
              {formatMoney(cashAcc)}
            </AutoScrollText>
          </div>
        </button>
      </div>

      {/* 4. "Aaj ka Overview" SECTION (Resized Cards - No Text Warping) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className={`font-bold text-slate-900 ${isUrdu ? 'text-sm sm:text-base' : 'text-xs sm:text-sm'}`}>
            {isUrdu ? 'آج کا جائزہ' : "Today's Overview"}
          </h2>
          <button
            type="button"
            onClick={() => onNavigateScreen('REPORTS')}
            className={`font-semibold text-[#0F8A5F] hover:underline cursor-pointer ${isUrdu ? 'text-xs sm:text-sm' : 'text-xs'}`}
          >
            {isUrdu ? 'تمام دیکھیں' : 'View All'}
          </button>
        </div>

        {/* Top 2 Metric Cards Grid - Side-by-side on all screens */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          {/* Total Sales */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-2.5 sm:p-3.5 shadow-2xs flex flex-col justify-between gap-1.5 min-w-0 overflow-hidden">
            {/* Top Row: Heading on Left, Arrow Icon in Right Corner */}
            <div className="flex items-center justify-between gap-1 w-full min-w-0">
              <AutoScrollText
                isUrdu={isUrdu}
                containerClassName="flex-1 min-w-0"
                className={`font-bold text-slate-500 ${isUrdu ? 'text-[12.5px] sm:text-[14px]' : 'text-[11px] sm:text-xs font-semibold'}`}
              >
                {isUrdu ? 'کل فروخت' : 'Total Sales'}
              </AutoScrollText>
              <span className="p-1 rounded-md bg-emerald-50 text-emerald-600 shrink-0">
                <ArrowUpRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              </span>
            </div>

            {/* Bottom Row: Amount & % vs kal on Left, Sparkline Graph on Right */}
            <div className="flex items-end justify-between gap-1 min-w-0">
              <div className="min-w-0 flex-1 overflow-hidden">
                <AutoScrollText
                  isUrdu={isUrdu}
                  containerClassName="max-w-full"
                  className="text-sm sm:text-lg font-bold text-[#0F8A5F] tracking-tight"
                >
                  {formatMoney(todaySales)}
                </AutoScrollText>
                <div className="mt-0.5 inline-flex items-center gap-0.5 bg-emerald-50 text-emerald-700 text-[10px] sm:text-[11px] font-semibold px-1.5 py-0.5 rounded-md max-w-full overflow-hidden">
                  <AutoScrollText isUrdu={isUrdu} containerClassName="max-w-full">
                    {isUrdu ? '▲ 12٪ بمقابلہ کل' : '▲ 12% vs yesterday'}
                  </AutoScrollText>
                </div>
              </div>

              {/* Mini Trend Sparkline Graph (Green Gradient) */}
              <div className="w-10 sm:w-14 h-7 sm:h-9 shrink-0 flex items-center justify-end">
                <svg viewBox="0 0 60 30" className="w-full h-full overflow-visible">
                  <defs>
                    <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10B981" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M 0 25 Q 15 20, 25 14 T 45 10 T 60 4 L 60 30 L 0 30 Z"
                    fill="url(#salesGrad)"
                  />
                  <path
                    d="M 0 25 Q 15 20, 25 14 T 45 10 T 60 4"
                    fill="none"
                    stroke="#0F8A5F"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* Total Purchases */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-2.5 sm:p-3.5 shadow-2xs flex flex-col justify-between gap-1.5 min-w-0 overflow-hidden">
            {/* Top Row: Heading on Left, Arrow Icon in Right Corner */}
            <div className="flex items-center justify-between gap-1 w-full min-w-0">
              <AutoScrollText
                isUrdu={isUrdu}
                containerClassName="flex-1 min-w-0"
                className={`font-bold text-slate-500 ${isUrdu ? 'text-[12.5px] sm:text-[14px]' : 'text-[11px] sm:text-xs font-semibold'}`}
              >
                {isUrdu ? 'کل خریداری' : 'Total Purchases'}
              </AutoScrollText>
              <span className="p-1 rounded-md bg-indigo-50 text-indigo-600 shrink-0">
                <ArrowDownLeft className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              </span>
            </div>

            {/* Bottom Row: Amount & % vs kal on Left, Sparkline Graph on Right */}
            <div className="flex items-end justify-between gap-1 min-w-0">
              <div className="min-w-0 flex-1 overflow-hidden">
                <AutoScrollText
                  isUrdu={isUrdu}
                  containerClassName="max-w-full"
                  className="text-sm sm:text-lg font-bold text-indigo-900 tracking-tight"
                >
                  {formatMoney(todayPurchases || 0)}
                </AutoScrollText>
                <div className="mt-0.5 inline-flex items-center gap-0.5 bg-slate-100 text-slate-600 text-[10px] sm:text-[11px] font-medium px-1.5 py-0.5 rounded-md max-w-full overflow-hidden">
                  <AutoScrollText isUrdu={isUrdu} containerClassName="max-w-full">
                    {isUrdu ? '— 0٪ بمقابلہ کل' : '— 0% vs yesterday'}
                  </AutoScrollText>
                </div>
              </div>

              {/* Mini Trend Sparkline Graph (Indigo Gradient) */}
              <div className="w-10 sm:w-14 h-7 sm:h-9 shrink-0 flex items-center justify-end">
                <svg viewBox="0 0 60 30" className="w-full h-full overflow-visible">
                  <defs>
                    <linearGradient id="purchasesGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366F1" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="#6366F1" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M 0 18 Q 15 24, 30 16 T 48 20 T 60 12 L 60 30 L 0 30 Z"
                    fill="url(#purchasesGrad)"
                  />
                  <path
                    d="M 0 18 Q 15 24, 30 16 T 48 20 T 60 12"
                    fill="none"
                    stroke="#4338CA"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom 4 Metric Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {/* Net Profit */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-2 sm:p-3 shadow-2xs flex items-center gap-2 min-w-0 overflow-hidden">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Coins className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
            <div className="min-w-0 flex-1 overflow-hidden">
              <AutoScrollText
                isUrdu={isUrdu}
                containerClassName="max-w-full"
                className={`font-bold text-slate-500 ${isUrdu ? 'text-[12px] sm:text-[13px]' : 'text-[10px] font-semibold'}`}
              >
                {isUrdu ? 'کل منافع' : 'Net Profit'}
              </AutoScrollText>
              <AutoScrollText
                isUrdu={isUrdu}
                containerClassName="max-w-full mt-0.5"
                className={`font-bold text-slate-900 ${isUrdu ? 'text-[12.5px] sm:text-[14px]' : 'text-xs'}`}
              >
                {formatFinancialValue(taxSummary.netProfit, taxSummary.isStockDataMissing, isUrdu)}
              </AutoScrollText>
            </div>
          </div>

          {/* Total Capital */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-2 sm:p-3 shadow-2xs flex items-center gap-2 min-w-0 overflow-hidden">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
            <div className="min-w-0 flex-1 overflow-hidden">
              <AutoScrollText
                isUrdu={isUrdu}
                containerClassName="max-w-full"
                className={`font-bold text-slate-500 ${isUrdu ? 'text-[12px] sm:text-[13px]' : 'text-[10px] font-semibold'}`}
              >
                {isUrdu ? 'مجموعہ اصل' : 'Total Capital'}
              </AutoScrollText>
              <AutoScrollText
                isUrdu={isUrdu}
                containerClassName="max-w-full mt-0.5"
                className={`font-bold text-slate-900 ${isUrdu ? 'text-[12.5px] sm:text-[14px]' : 'text-xs'}`}
              >
                {taxSummary.ownerCapital === null
                  ? (isUrdu ? 'نامکمل / غیر حتمی' : 'Incomplete / Not Final')
                  : formatMoney(taxSummary.ownerCapital)}
              </AutoScrollText>
            </div>
          </div>

          {/* Total Expenses */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-2 sm:p-3 shadow-2xs flex items-center gap-2 min-w-0 overflow-hidden">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
              <Receipt className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
            <div className="min-w-0 flex-1 overflow-hidden">
              <AutoScrollText
                isUrdu={isUrdu}
                containerClassName="max-w-full"
                className={`font-bold text-slate-500 ${isUrdu ? 'text-[12px] sm:text-[13px]' : 'text-[10px] font-semibold'}`}
              >
                {isUrdu ? 'کل خرچہ' : 'Total Expenses'}
              </AutoScrollText>
              <AutoScrollText
                isUrdu={isUrdu}
                containerClassName="max-w-full mt-0.5"
                className={`font-bold text-slate-900 ${isUrdu ? 'text-[12.5px] sm:text-[14px]' : 'text-xs'}`}
              >
                {formatMoney(taxSummary.directExpenses)}
              </AutoScrollText>
            </div>
          </div>

          {/* Total Liabilities */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-2 sm:p-3 shadow-2xs flex items-center gap-2 min-w-0 overflow-hidden">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
              <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
            <div className="min-w-0 flex-1 overflow-hidden">
              <AutoScrollText
                isUrdu={isUrdu}
                containerClassName="max-w-full"
                className={`font-bold text-slate-500 ${isUrdu ? 'text-[12px] sm:text-[13px]' : 'text-[10px] font-semibold'}`}
              >
                {isUrdu ? 'مجموعہ قرضہ' : 'Total Liabilities'}
              </AutoScrollText>
              <AutoScrollText
                isUrdu={isUrdu}
                containerClassName="max-w-full mt-0.5"
                className={`font-bold text-slate-900 ${isUrdu ? 'text-[12.5px] sm:text-[14px]' : 'text-xs'}`}
              >
                {formatMoney(taxSummary.totalLiabilities)}
              </AutoScrollText>
            </div>
          </div>
        </div>
      </div>

      {/* 5. ULTRA PREMIUM & COMPACT RECEIVABLES (TOTAL UDHAAR) CARD */}
      <div className="bg-gradient-to-r from-slate-900 via-amber-950 to-slate-900 border border-amber-500/30 text-white p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl shadow-md relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Subtle Ambient Background Lighting */}
        <div className="absolute -top-8 -right-8 w-32 h-32 bg-amber-500/10 rounded-full blur-xl pointer-events-none" />
        <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-emerald-500/10 rounded-full blur-xl pointer-events-none" />

        <div className="min-w-0 flex-1 space-y-1 z-10 overflow-hidden">
          <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
            <Coins className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 shrink-0" />
            <AutoScrollText
              isUrdu={isUrdu}
              containerClassName="flex-1 min-w-0"
              className={`uppercase tracking-wider ${isUrdu ? 'text-[12.5px] sm:text-[14px] font-extrabold text-amber-300' : 'text-[11px] sm:text-xs font-bold text-amber-300'}`}
            >
              {isUrdu ? 'کل بقایا ادھار' : 'Total Receivables (Udhaar)'}
            </AutoScrollText>
          </div>
          <AutoScrollText
            isUrdu={isUrdu}
            containerClassName="max-w-full"
            className="text-xl sm:text-2xl font-bold text-amber-50 tracking-tight"
          >
            {formatMoney(taxSummary.totalReceivables)}
          </AutoScrollText>
          <AutoScrollText
            isUrdu={isUrdu}
            containerClassName="max-w-full"
            className={`text-amber-200/90 ${isUrdu ? 'text-[11.5px] sm:text-[13px] font-bold' : 'text-[10.5px] sm:text-xs font-medium'}`}
          >
            {isUrdu ? 'کسٹمرز کے ذمہ واجب الادا رقم' : 'Pending Customer Dues'}
          </AutoScrollText>
        </div>

        {/* Compact Metallic Wallet Icon & Sleek Action Button */}
        <div className="relative z-10 flex items-center justify-between sm:justify-end gap-2.5 shrink-0 pt-1 sm:pt-0 border-t border-amber-500/20 sm:border-t-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-amber-500/15 border border-amber-400/30 flex items-center justify-center shrink-0">
            <Wallet className="w-4 h-4 text-amber-300" />
          </div>

          <button
            type="button"
            onClick={() => onNavigateScreen('KHATA')}
            className="bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold text-xs px-3.5 py-2 rounded-xl shadow-md border border-amber-200/80 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap hover:scale-[1.02] active:scale-98"
          >
            <span className={isUrdu ? 'text-[12.5px] sm:text-[13.5px] font-extrabold' : ''}>{isUrdu ? 'تفصیلات دیکھیں' : 'View Details'}</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-slate-950 stroke-[2.5]" />
          </button>
        </div>
      </div>

      {/* Fallback Modals if not handled by parent */}
      {!onOpenCalendar && (
        <CalendarRemindersModal
          isOpen={isCalendarOpenLocal}
          onClose={() => setIsCalendarOpenLocal(false)}
          isUrdu={isUrdu}
        />
      )}

      {!onOpenGraphs && (
        <GraphsModal
          isOpen={isGraphsOpenLocal}
          onClose={() => setIsGraphsOpenLocal(false)}
          state={state}
          isUrdu={isUrdu}
        />
      )}

      {!onOpenAi && (
        <AiAssistantModal
          isOpen={isAiOpenLocal}
          onClose={() => setIsAiOpenLocal(false)}
          onOpenVoiceEntry={onOpenVoiceEntry}
          state={state}
          isUrdu={isUrdu}
        />
      )}
    </div>
  );
};
