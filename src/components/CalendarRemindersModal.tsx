import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  X,
  Clock,
  Plus,
  CheckCircle2,
  Bell,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Archive,
  ArchiveRestore,
  Trash2,
  Circle,
  Tag,
  Filter,
  ArrowLeft
} from 'lucide-react';
import { formatDate } from '../utils/format';

interface CalendarRemindersModalProps {
  isOpen: boolean;
  onClose: () => void;
  isUrdu: boolean;
}

interface Reminder {
  id: string;
  title: string;
  titleUrdu: string;
  date: string; // YYYY-MM-DD
  type: 'TAX' | 'SUPPLIER' | 'UTILITY' | 'OTHER';
  isDone: boolean;
  isArchived?: boolean;
  isDeleted?: boolean;
}

const DEFAULT_REMINDERS: Reminder[] = [
  {
    id: 'rem_1',
    title: 'FBR Monthly Sales Tax Return Filing',
    titleUrdu: 'ایف بی آر ماہانہ سیلز ٹیکس گوشوارہ جمع کروائیں',
    date: '2026-08-15',
    type: 'TAX',
    isDone: false,
    isArchived: false,
    isDeleted: false,
  },
  {
    id: 'rem_2',
    title: 'Pay Metro Cash & Carry Wholesale Bill',
    titleUrdu: 'میٹرو ہول سیلر بل کی ادائیگی',
    date: '2026-08-05',
    type: 'SUPPLIER',
    isDone: false,
    isArchived: false,
    isDeleted: false,
  },
  {
    id: 'rem_3',
    title: 'Dukan Commercial Electricity Bill',
    titleUrdu: 'دکان کے بجلی بل کی آخری تاریخ',
    date: '2026-08-07',
    type: 'UTILITY',
    isDone: true,
    isArchived: false,
    isDeleted: false,
  },
];

const MONTH_NAMES_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const MONTH_NAMES_UR = [
  'جنوری', 'فروری', 'مارچ', 'اپریل', 'مئی', 'جون',
  'جولائی', 'اگست', 'تمبر', 'اکتوبر', 'نومبر', 'دسمبر'
];

export const CalendarRemindersModal: React.FC<CalendarRemindersModalProps> = ({
  isOpen,
  onClose,
  isUrdu,
}) => {
  const todayObj = new Date();
  const todayYMD = `${todayObj.getFullYear()}-${String(todayObj.getMonth() + 1).padStart(2, '0')}-${String(todayObj.getDate()).padStart(2, '0')}`;

  const [viewYear, setViewYear] = useState<number>(todayObj.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(todayObj.getMonth()); // 0-indexed
  const [selectedDate, setSelectedDate] = useState<string>(todayYMD);

  const [reminders, setReminders] = useState<Reminder[]>(() => {
    try {
      const saved = localStorage.getItem('my_shop_reminders');
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return DEFAULT_REMINDERS;
  });

  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<'TAX' | 'SUPPLIER' | 'UTILITY' | 'OTHER'>('OTHER');
  const [filterTab, setFilterTab] = useState<'SELECTED' | 'CURRENT' | 'PENDING' | 'COMPLETED' | 'ALL' | 'ARCHIVED' | 'DELETED'>('SELECTED');
  const [selectedOverallMonth, setSelectedOverallMonth] = useState<string>('ALL');
  const [collapsedMonths, setCollapsedMonths] = useState<Record<string, boolean>>({});

  const toggleCollapseMonth = (monthKey: string) => {
    setCollapsedMonths((prev) => ({
      ...prev,
      [monthKey]: !prev[monthKey],
    }));
  };

  const [isMouseDown, setIsMouseDown] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeftPos, setScrollLeftPos] = useState(0);

  // Swipe gesture tracking states
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    setTouchStartX(e.touches[0].clientX);
    setTouchStartY(e.touches[0].clientY);
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (touchStartX === null || touchStartY === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    
    const diffX = touchStartX - touchEndX;
    const diffY = touchStartY - touchEndY;

    // Minimum swipe threshold of 45px, and horizontal move must be larger than vertical drag
    if (Math.abs(diffX) > 45 && Math.abs(diffX) > Math.abs(diffY)) {
      if (diffX > 0) {
        // Swipe Left -> Next Month
        handleNextMonth();
      } else {
        // Swipe Right -> Previous Month
        handlePrevMonth();
      }
    }
    setTouchStartX(null);
    setTouchStartY(null);
  };

  useEffect(() => {
    try {
      localStorage.setItem('my_shop_reminders', JSON.stringify(reminders));
    } catch {
      // ignore
    }
  }, [reminders]);

  if (!isOpen) return null;

  // Month navigation
  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  // Year navigation
  const handlePrevYear = () => setViewYear((y) => y - 1);
  const handleNextYear = () => setViewYear((y) => y + 1);

  const handleJumpToToday = () => {
    setViewYear(todayObj.getFullYear());
    setViewMonth(todayObj.getMonth());
    setSelectedDate(todayYMD);
  };

  // Generate perpetual Year dropdown options dynamically around viewYear
  const minYear = Math.min(1950, viewYear - 30);
  const maxYear = Math.max(2100, viewYear + 30);
  const yearOptions = Array.from({ length: maxYear - minYear + 1 }, (_, i) => minYear + i);

  const handleAddReminder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newRem: Reminder = {
      id: `rem_${Date.now()}`,
      title: newTitle.trim(),
      titleUrdu: newTitle.trim(),
      date: selectedDate,
      type: newType,
      isDone: false,
      isArchived: false,
    };

    setReminders((prev) => [newRem, ...prev]);
    setNewTitle('');
  };

  const toggleReminder = (id: string) => {
    setReminders((prev) =>
      prev.map((r) => (r.id === id ? { ...r, isDone: !r.isDone } : r))
    );
  };

  const toggleArchiveReminder = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setReminders((prev) =>
      prev.map((r) => (r.id === id ? { ...r, isArchived: !r.isArchived } : r))
    );
  };

  const deleteReminder = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setReminders((prev) =>
      prev.map((r) => (r.id === id ? { ...r, isDeleted: true } : r))
    );
  };

  const restoreDeletedReminder = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setReminders((prev) =>
      prev.map((r) => (r.id === id ? { ...r, isDeleted: false } : r))
    );
  };

  const permanentDeleteReminder = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setReminders((prev) => prev.filter((r) => r.id !== id));
  };

  // Calendar math
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay(); // 0 = Sun
  const monthDateObj = new Date(viewYear, viewMonth, 1);
  const monthName = monthDateObj.toLocaleDateString('en-PK', { month: 'long', year: 'numeric' });

  const formatDayYMD = (dayNum: number) => {
    return `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
  };

  // Current viewed month calculations
  const monthPrefix = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`;
  const monthReminders = reminders.filter((r) => r.date.startsWith(monthPrefix));

  // Category counts for current/viewed month
  const currentMonthCount = monthReminders.filter(
    (r) => r.date === todayYMD && !r.isArchived && !r.isDeleted
  ).length;

  const pendingMonthCount = monthReminders.filter(
    (r) => !r.isDone && !r.isArchived && !r.isDeleted
  ).length;

  const completedMonthCount = monthReminders.filter(
    (r) => r.isDone && !r.isArchived && !r.isDeleted
  ).length;

  const allMonthCount = monthReminders.filter(
    (r) => !r.isArchived && !r.isDeleted
  ).length;

  const archivedMonthCount = monthReminders.filter(
    (r) => r.isArchived && !r.isDeleted
  ).length;

  const deletedMonthCount = monthReminders.filter(
    (r) => r.isDeleted
  ).length;

  // Unique YYYY-MM months present in all reminders
  const availableMonths = Array.from(
    new Set(reminders.map((r) => r.date.slice(0, 7)))
  ).sort((a, b) => b.localeCompare(a));

  // Category counts based on selectedOverallMonth
  const targetReminders = selectedOverallMonth === 'ALL'
    ? reminders
    : reminders.filter((r) => r.date.startsWith(selectedOverallMonth));

  const overallSelectedCount = targetReminders.filter(
    (r) => r.date === selectedDate && !r.isArchived && !r.isDeleted
  ).length;

  const overallCurrentCount = targetReminders.filter(
    (r) => r.date === todayYMD && !r.isArchived && !r.isDeleted
  ).length;

  const overallPendingCount = targetReminders.filter(
    (r) => !r.isDone && !r.isArchived && !r.isDeleted
  ).length;

  const overallCompletedCount = targetReminders.filter(
    (r) => r.isDone && !r.isArchived && !r.isDeleted
  ).length;

  const overallAllCount = targetReminders.filter(
    (r) => !r.isArchived && !r.isDeleted
  ).length;

  const overallArchivedCount = targetReminders.filter(
    (r) => r.isArchived && !r.isDeleted
  ).length;

  const overallDeletedCount = targetReminders.filter(
    (r) => r.isDeleted
  ).length;

  const handleWheelScroll = (e: React.WheelEvent<HTMLDivElement>) => {
    if (e.deltaY !== 0) {
      e.currentTarget.scrollLeft += e.deltaY;
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsMouseDown(true);
    setStartX(e.pageX - e.currentTarget.offsetLeft);
    setScrollLeftPos(e.currentTarget.scrollLeft);
  };

  const handleMouseLeaveOrUp = () => {
    setIsMouseDown(false);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isMouseDown) return;
    e.preventDefault();
    const x = e.pageX - e.currentTarget.offsetLeft;
    const walk = (x - startX) * 1.5;
    e.currentTarget.scrollLeft = scrollLeftPos - walk;
  };

  // Filtered Reminders List
  const filteredReminders = reminders.filter((rem) => {
    if (selectedOverallMonth !== 'ALL' && !rem.date.startsWith(selectedOverallMonth)) {
      return false;
    }
    if (filterTab === 'DELETED') return !!rem.isDeleted;
    if (rem.isDeleted) return false;

    if (filterTab === 'ARCHIVED') return !!rem.isArchived;
    if (rem.isArchived) return false;

    if (filterTab === 'SELECTED') return rem.date === selectedDate;
    if (filterTab === 'CURRENT') return rem.date === todayYMD;
    if (filterTab === 'PENDING') return !rem.isDone;
    if (filterTab === 'COMPLETED') return rem.isDone;
    if (filterTab === 'ALL') return true;
    return true;
  });

  // Group filtered reminders by YYYY-MM month key
  const groupedReminders: { [monthKey: string]: Reminder[] } = {};
  const sortedFiltered = [...filteredReminders].sort((a, b) => b.date.localeCompare(a.date));
  for (const rem of sortedFiltered) {
    const monthKey = rem.date.slice(0, 7); // YYYY-MM
    if (!groupedReminders[monthKey]) {
      groupedReminders[monthKey] = [];
    }
    groupedReminders[monthKey].push(rem);
  }

  const selectedDateRemindersCount = reminders.filter(
    (r) => r.date === selectedDate && !r.isArchived && !r.isDeleted
  ).length;

  const getTypeBadge = (type: Reminder['type']) => {
    switch (type) {
      case 'TAX':
        return <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 border border-purple-200">TAX</span>;
      case 'SUPPLIER':
        return <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">SUPPLIER</span>;
      case 'UTILITY':
        return <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200">UTILITY</span>;
      default:
        return <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">SHOP</span>;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-white sm:bg-slate-900/60 backdrop-blur-sm flex items-start sm:items-center justify-center p-0 sm:p-4 pt-[env(safe-area-inset-top,0px)] sm:pt-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-3xl sm:max-w-4xl lg:max-w-5xl sm:rounded-3xl shadow-2xl border-0 sm:border border-slate-200 overflow-hidden flex flex-col h-[calc(100dvh-env(safe-area-inset-top,0px))] sm:h-[88vh] my-0 sm:my-auto rounded-none">
        {/* Header - Premium Primary Green Theme */}
        <div className="bg-gradient-to-r from-[#0F8A5F] via-[#0B724E] to-[#066647] text-white p-4.5 flex items-center justify-between shadow-sm relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.2),transparent)] pointer-events-none" />
          <div className="flex items-center gap-3 relative z-10">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center border border-white/30 shadow-inner backdrop-blur-md">
              <CalendarIcon className="w-5 h-5 text-emerald-100" />
            </div>
            <div>
              <h2 className="font-black text-base tracking-tight leading-tight text-white drop-shadow-2xs">
                {isUrdu ? 'کالنڈر اور یاد دہانی (Reminders)' : 'Calendar & Shop Reminders'}
              </h2>
              <p className="text-[11px] text-emerald-100/90 font-medium mt-0.5">
                {formatDate(selectedDate)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 relative z-10">
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full bg-white/10 hover:bg-white/25 text-white transition-all cursor-pointer"
              title={isUrdu ? 'واپس' : 'Back'}
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full bg-white/10 hover:bg-white/25 text-white transition-all cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto bg-slate-50/60 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {/* Mini Calendar View with Primary Green Theme */}
          <div 
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            className="bg-white border border-emerald-100/80 rounded-2xl p-2.5 sm:p-3 shadow-sm w-full max-w-[560px] mx-auto select-none"
          >
            {/* Header Controls: Month LOV + Arrows, Year LOV + Arrows */}
            <div className="flex items-center justify-between gap-1 mb-1 w-full">
              {/* Month Controls */}
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="p-0.5 rounded hover:bg-emerald-100 text-emerald-800 transition-colors cursor-pointer"
                  title={isUrdu ? 'پچھلا مہینہ' : 'Previous Month'}
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <select
                  value={viewMonth}
                  onChange={(e) => setViewMonth(Number(e.target.value))}
                  className="text-[11px] font-extrabold text-emerald-950 bg-transparent border-none py-0.5 px-0.5 focus:outline-none cursor-pointer hover:text-[#0F8A5F] transition-colors"
                >
                  {(isUrdu ? MONTH_NAMES_UR : MONTH_NAMES_EN).map((mName, idx) => (
                    <option key={idx} value={idx}>
                      {mName}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="p-0.5 rounded hover:bg-emerald-100 text-emerald-800 transition-colors cursor-pointer"
                  title={isUrdu ? 'اگلا مہینہ' : 'Next Month'}
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Year Controls */}
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={handlePrevYear}
                  className="p-0.5 rounded hover:bg-emerald-100 text-emerald-800 transition-colors cursor-pointer"
                  title={isUrdu ? 'پچھلا سال' : 'Previous Year'}
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <select
                  value={viewYear}
                  onChange={(e) => setViewYear(Number(e.target.value))}
                  className="text-[11px] font-extrabold text-emerald-950 bg-transparent border-none py-0.5 px-0.5 focus:outline-none cursor-pointer hover:text-[#0F8A5F] transition-colors"
                >
                  {yearOptions.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleNextYear}
                  className="p-0.5 rounded hover:bg-emerald-100 text-emerald-800 transition-colors cursor-pointer"
                  title={isUrdu ? 'اگلا سال' : 'Next Year'}
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Weekday Labels */}
            <div className="grid grid-cols-7 gap-1 text-center text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1">
              <span>Su</span>
              <span>Mo</span>
              <span>Tu</span>
              <span>We</span>
              <span>Th</span>
              <span>Fr</span>
              <span>Sa</span>
            </div>

            {/* Day Grid */}
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold">
              {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
                <div key={`empty_${idx}`} className="h-5" />
              ))}

              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                const dayYMD = formatDayYMD(day);
                const isSelected = dayYMD === selectedDate;
                const isToday = dayYMD === todayYMD;

                const dayReminders = reminders.filter(
                  (r) => r.date === dayYMD && !r.isArchived
                );
                const hasPending = dayReminders.some((r) => !r.isDone);
                const hasDone = dayReminders.some((r) => r.isDone);

                return (
                  <button
                    key={`day_${day}`}
                    type="button"
                    onClick={() => setSelectedDate(dayYMD)}
                    className={`h-5 rounded relative flex items-center justify-center cursor-pointer text-[10px] transition-all ${
                      isSelected
                        ? 'bg-gradient-to-r from-[#0F8A5F] to-[#066647] text-white font-extrabold ring-1 ring-emerald-300 scale-105 shadow-2xs z-10'
                        : isToday
                        ? 'bg-amber-100/90 border border-amber-500 text-amber-950 font-black'
                        : 'hover:bg-emerald-50 text-slate-700 bg-slate-50/70 border border-slate-200/60'
                    }`}
                  >
                    <span>{day}</span>

                    {/* Status Indicators at Top-Right Corner */}
                    {(hasPending || hasDone) && (
                      <span
                        className={`absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full ring-1 ${
                          isSelected ? 'ring-emerald-600' : 'ring-white'
                        } ${hasPending ? 'bg-rose-500' : 'bg-emerald-500'}`}
                        title={
                          hasPending
                            ? isUrdu
                              ? 'غیر مکمل یاد دہانی'
                              : 'Pending Reminder'
                            : isUrdu
                            ? 'مکمل یاد دہانی'
                            : 'Completed Reminder'
                        }
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Selected Date Indicator Banner with Today in parentheses */}
            <div className="mt-2.5 pt-2 border-t border-slate-200/80 flex flex-col gap-2">
              {/* Row 1: Selected Date + Today button */}
              <div className="font-bold text-slate-700 flex items-center gap-1.5 flex-nowrap whitespace-nowrap text-[11px] overflow-x-auto">
                <span className="w-2 h-2 rounded-full bg-[#0F8A5F] shrink-0" />
                <span className="shrink-0">{isUrdu ? 'منتخب تاریخ:' : 'Selected Date:'}</span>
                <strong className="text-slate-900 font-black shrink-0">{formatDate(selectedDate)}</strong>
                <button
                  type="button"
                  onClick={handleJumpToToday}
                  className="text-[#0F8A5F] hover:text-[#066647] hover:underline font-bold transition-colors cursor-pointer text-[10px] shrink-0 inline-flex items-center"
                  title={isUrdu ? 'آج پر جائیں' : 'Jump to Today'}
                >
                  {isUrdu
                    ? `(آج: ${todayObj.getDate()} ${MONTH_NAMES_UR[todayObj.getMonth()]})`
                    : `(Today: ${todayObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })})`}
                </button>
              </div>

              {/* Row 2: Current Month's Reminders Heading & Category Counts */}
              <div className="pt-2 border-t border-slate-100 flex flex-col gap-1.5">
                <h4 className="text-[11px] font-black text-slate-800 flex items-center gap-1">
                  <span>
                    {isUrdu
                      ? `${MONTH_NAMES_UR[viewMonth]} کی یاد دہانیاں:`
                      : `Current Month's Reminders (${MONTH_NAMES_EN[viewMonth]}):`}
                  </span>
                </h4>

                {/* Category Counts: Current -> Pending -> Completed -> All -> Archived -> Deleted */}
                <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap text-[10px] font-bold">
                  {/* Current */}
                  <button
                    type="button"
                    onClick={() => setFilterTab('CURRENT')}
                    className={`px-2 py-0.5 rounded-md border transition-all cursor-pointer flex items-center gap-1 ${
                      filterTab === 'CURRENT'
                        ? 'bg-[#0F8A5F] text-white border-[#066647] font-black shadow-2xs'
                        : 'bg-emerald-50 text-emerald-900 border-emerald-200 hover:bg-emerald-100'
                    }`}
                  >
                    <span>{isUrdu ? 'آج:' : 'Current:'}</span>
                    <strong className="font-extrabold">{currentMonthCount}</strong>
                  </button>

                  {/* Pending */}
                  <button
                    type="button"
                    onClick={() => setFilterTab('PENDING')}
                    className={`px-2 py-0.5 rounded-md border transition-all cursor-pointer flex items-center gap-1 ${
                      filterTab === 'PENDING'
                        ? 'bg-rose-600 text-white border-rose-700 font-black shadow-2xs'
                        : 'bg-rose-50 text-rose-900 border-rose-200 hover:bg-rose-100'
                    }`}
                  >
                    <span>{isUrdu ? 'زیر التواء:' : 'Pending:'}</span>
                    <strong className="font-extrabold">{pendingMonthCount}</strong>
                  </button>

                  {/* Completed */}
                  <button
                    type="button"
                    onClick={() => setFilterTab('COMPLETED')}
                    className={`px-2 py-0.5 rounded-md border transition-all cursor-pointer flex items-center gap-1 ${
                      filterTab === 'COMPLETED'
                        ? 'bg-emerald-600 text-white border-emerald-700 font-black shadow-2xs'
                        : 'bg-emerald-50 text-emerald-900 border-emerald-200 hover:bg-emerald-100'
                    }`}
                  >
                    <span>{isUrdu ? 'مکمل:' : 'Completed:'}</span>
                    <strong className="font-extrabold">{completedMonthCount}</strong>
                  </button>

                  {/* All */}
                  <button
                    type="button"
                    onClick={() => setFilterTab('ALL')}
                    className={`px-2 py-0.5 rounded-md border transition-all cursor-pointer flex items-center gap-1 ${
                      filterTab === 'ALL'
                        ? 'bg-slate-700 text-white border-slate-800 font-black shadow-2xs'
                        : 'bg-slate-100 text-slate-800 border-slate-200 hover:bg-slate-200'
                    }`}
                  >
                    <span>{isUrdu ? 'تمام:' : 'All:'}</span>
                    <strong className="font-extrabold">{allMonthCount}</strong>
                  </button>

                  {/* Archived */}
                  <button
                    type="button"
                    onClick={() => setFilterTab('ARCHIVED')}
                    className={`px-2 py-0.5 rounded-md border transition-all cursor-pointer flex items-center gap-1 ${
                      filterTab === 'ARCHIVED'
                        ? 'bg-amber-600 text-white border-amber-700 font-black shadow-2xs'
                        : 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100'
                    }`}
                  >
                    <span>{isUrdu ? 'آرکائیو:' : 'Archived:'}</span>
                    <strong className="font-extrabold">{archivedMonthCount}</strong>
                  </button>

                  {/* Deleted */}
                  <button
                    type="button"
                    onClick={() => setFilterTab('DELETED')}
                    className={`px-2 py-0.5 rounded-md border transition-all cursor-pointer flex items-center gap-1 ${
                      filterTab === 'DELETED'
                        ? 'bg-red-600 text-white border-red-700 font-black shadow-2xs'
                        : 'bg-red-50 text-red-900 border-red-200 hover:bg-red-100'
                    }`}
                  >
                    <span>{isUrdu ? 'حذف شدہ:' : 'Deleted:'}</span>
                    <strong className="font-extrabold">{deletedMonthCount}</strong>
                  </button>
                </div>
              </div>
            </div>

          </div>

          {/* Reminders List & Filter Tabs */}
          <div className="space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h3 className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5 shrink-0">
                  <Bell className="w-4 h-4 text-[#0F8A5F]" />
                  <span>{isUrdu ? 'دکان کی یاد دہانیاں (مجموعی)' : 'Dukan Reminders (Overall)'}</span>
                </h3>

                {/* Month Dropdown Filter */}
                <div className="flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-600">{isUrdu ? 'مہینہ:' : 'Month:'}</span>
                  <select
                    value={selectedOverallMonth}
                    onChange={(e) => setSelectedOverallMonth(e.target.value)}
                    className="text-[10px] font-extrabold text-emerald-900 bg-transparent focus:outline-none cursor-pointer"
                  >
                    <option value="ALL">
                      {isUrdu ? 'تمام مہینے (All Months)' : 'All Months'}
                    </option>
                    {availableMonths.map((mKey) => {
                      const [yStr, mStr] = mKey.split('-');
                      const mIdx = parseInt(mStr, 10) - 1;
                      const mName = isUrdu
                        ? `${MONTH_NAMES_UR[mIdx]} ${yStr}`
                        : `${MONTH_NAMES_EN[mIdx]} ${yStr}`;
                      return (
                        <option key={mKey} value={mKey}>
                          {mName}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              {/* Filter Tabs - No outer box, hidden scrollbar, swipeable & mouse wheel / drag scrollable */}
              <div
                onWheel={handleWheelScroll}
                onMouseDown={handleMouseDown}
                onMouseLeave={handleMouseLeaveOrUp}
                onMouseUp={handleMouseLeaveOrUp}
                onMouseMove={handleMouseMove}
                className="flex items-center gap-1 text-[10px] font-bold flex-nowrap whitespace-nowrap overflow-x-auto max-w-full [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden py-0.5 select-none cursor-grab active:cursor-grabbing"
              >
                <button
                  type="button"
                  onClick={() => setFilterTab('SELECTED')}
                  className={`px-1.5 py-0.5 rounded-md transition-all cursor-pointer shrink-0 border ${
                    filterTab === 'SELECTED'
                      ? 'bg-[#0F8A5F] text-white border-[#066647] shadow-2xs font-black'
                      : 'bg-slate-100 text-slate-600 border-slate-200/80 hover:bg-slate-200 hover:text-slate-900'
                  }`}
                >
                  {isUrdu ? 'منتخب دن' : 'Selected'} ({overallSelectedCount})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterTab('CURRENT')}
                  className={`px-1.5 py-0.5 rounded-md transition-all cursor-pointer shrink-0 border ${
                    filterTab === 'CURRENT'
                      ? 'bg-[#0F8A5F] text-white border-[#066647] shadow-2xs font-black'
                      : 'bg-slate-100 text-slate-600 border-slate-200/80 hover:bg-slate-200 hover:text-slate-900'
                  }`}
                >
                  {isUrdu ? 'آج' : 'Current'} ({overallCurrentCount})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterTab('PENDING')}
                  className={`px-1.5 py-0.5 rounded-md transition-all cursor-pointer shrink-0 border ${
                    filterTab === 'PENDING'
                      ? 'bg-rose-600 text-white border-rose-600 shadow-2xs font-black'
                      : 'bg-slate-100 text-slate-600 border-slate-200/80 hover:bg-slate-200 hover:text-slate-900'
                  }`}
                >
                  {isUrdu ? 'زیر التواء' : 'Pending'} ({overallPendingCount})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterTab('COMPLETED')}
                  className={`px-1.5 py-0.5 rounded-md transition-all cursor-pointer shrink-0 border ${
                    filterTab === 'COMPLETED'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs font-black'
                      : 'bg-slate-100 text-slate-600 border-slate-200/80 hover:bg-slate-200 hover:text-slate-900'
                  }`}
                >
                  {isUrdu ? 'مکمل' : 'Completed'} ({overallCompletedCount})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterTab('ALL')}
                  className={`px-1.5 py-0.5 rounded-md transition-all cursor-pointer shrink-0 border ${
                    filterTab === 'ALL'
                      ? 'bg-slate-700 text-white border-slate-700 shadow-2xs font-black'
                      : 'bg-slate-100 text-slate-600 border-slate-200/80 hover:bg-slate-200 hover:text-slate-900'
                  }`}
                >
                  {isUrdu ? 'تمام' : 'All'} ({overallAllCount})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterTab('ARCHIVED')}
                  className={`px-1.5 py-0.5 rounded-md transition-all cursor-pointer shrink-0 border ${
                    filterTab === 'ARCHIVED'
                      ? 'bg-amber-600 text-white border-amber-600 shadow-2xs font-black'
                      : 'bg-slate-100 text-slate-600 border-slate-200/80 hover:bg-slate-200 hover:text-slate-900'
                  }`}
                >
                  {isUrdu ? 'آرکائیو' : 'Archived'} ({overallArchivedCount})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterTab('DELETED')}
                  className={`px-1.5 py-0.5 rounded-md transition-all cursor-pointer shrink-0 border ${
                    filterTab === 'DELETED'
                      ? 'bg-red-600 text-white border-red-600 shadow-2xs font-black'
                      : 'bg-slate-100 text-slate-600 border-slate-200/80 hover:bg-slate-200 hover:text-slate-900'
                  }`}
                >
                  {isUrdu ? 'حذف شدہ' : 'Deleted'} ({overallDeletedCount})
                </button>
              </div>
            </div>

            {filterTab === 'DELETED' && overallDeletedCount > 0 && (
              <div className="flex justify-end px-1 pb-1">
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(isUrdu ? 'کیا آپ تمام حذف شدہ یاد دہانیوں کو مستقل طور پر صاف کرنا چاہتے ہیں؟' : 'Are you sure you want to permanently clear all deleted reminders? This action cannot be undone.')) {
                      setReminders(prev => prev.filter(r => !r.isDeleted));
                    }
                  }}
                  className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-xl text-[10px] font-bold flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-2xs"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>{isUrdu ? 'کوڑا دان خالی کریں' : 'Empty Trash'}</span>
                </button>
              </div>
            )}

            {/* Reminders items grouped month-by-month */}
            <div className="space-y-3 max-h-56 overflow-y-auto pr-0.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              {Object.keys(groupedReminders).length === 0 ? (
                <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-2xl bg-white">
                  <Clock className="w-6 h-6 text-slate-300 mx-auto mb-1" />
                  <p className="text-xs font-semibold text-slate-500">
                    {filterTab === 'SELECTED'
                      ? isUrdu
                        ? 'اس تاریخ کے لیے کوئی یاد دہانی نہیں ہے'
                        : `No reminders for ${formatDate(selectedDate)}`
                      : filterTab === 'CURRENT'
                      ? isUrdu
                        ? 'آج کے لیے کوئی یاد دہانی نہیں ہے'
                        : 'No reminders for today'
                      : filterTab === 'PENDING'
                      ? isUrdu
                        ? 'کوئی زیر التواء یاد دہانی نہیں ہے'
                        : 'No pending reminders'
                      : filterTab === 'COMPLETED'
                      ? isUrdu
                        ? 'کوئی مکمل شدہ یاد دہانی نہیں ہے'
                        : 'No completed reminders'
                      : filterTab === 'ARCHIVED'
                      ? isUrdu
                        ? 'کوئی آرکائیو یاد دہانی نہیں'
                        : 'No archived reminders'
                      : filterTab === 'DELETED'
                      ? isUrdu
                        ? 'کوئی حذف شدہ یاد دہانی نہیں'
                        : 'No deleted reminders'
                      : isUrdu
                      ? 'کوئی یاد دہانی نہیں ہے'
                      : 'No reminders found'}
                  </p>
                </div>
              ) : (
                Object.entries(groupedReminders).map(([monthKey, monthRems]) => {
                  const [yStr, mStr] = monthKey.split('-');
                  const mIdx = parseInt(mStr, 10) - 1;
                  const monthLabel = isUrdu
                    ? `${MONTH_NAMES_UR[mIdx]} ${yStr}`
                    : `${MONTH_NAMES_EN[mIdx]} ${yStr}`;

                  const mPending = monthRems.filter((r) => !r.isDone && !r.isArchived && !r.isDeleted).length;
                  const mCompleted = monthRems.filter((r) => r.isDone && !r.isArchived && !r.isDeleted).length;
                  const mArchived = monthRems.filter((r) => r.isArchived && !r.isDeleted).length;
                  const mDeleted = monthRems.filter((r) => r.isDeleted).length;
                  const isCollapsed = !!collapsedMonths[monthKey];

                  return (
                    <div key={monthKey} className="space-y-1.5">
                      {/* Month Header Banner with Category Breakdown & Collapse Toggle */}
                      <div
                        onClick={() => toggleCollapseMonth(monthKey)}
                        className="flex items-center justify-between py-1 px-2.5 bg-slate-200/90 hover:bg-slate-300/90 transition-colors cursor-pointer rounded-xl text-[10px] font-black text-slate-800 border border-slate-300/80 sticky top-0 backdrop-blur-md z-10 shadow-2xs flex-wrap gap-1 select-none"
                        title={isCollapsed ? (isUrdu ? 'پھیلاؤ' : 'Expand Month') : (isUrdu ? 'سمیٹیں' : 'Collapse Month')}
                      >
                        <div className="flex items-center gap-1.5">
                          <div className="p-0.5 rounded bg-white/80 text-slate-700 border border-slate-300/80 shrink-0">
                            {isCollapsed ? (
                              <ChevronRight className="w-3 h-3 text-slate-700" />
                            ) : (
                              <ChevronDown className="w-3 h-3 text-slate-700" />
                            )}
                          </div>
                          <CalendarIcon className="w-3.5 h-3.5 text-[#0F8A5F] shrink-0" />
                          <span className="text-[11px] font-black">{monthLabel}</span>
                        </div>
                        <div className="flex items-center gap-1 text-[9px] flex-wrap">
                          {mPending > 0 && (
                            <span className="px-1.5 py-0.2 bg-rose-100 text-rose-900 rounded font-extrabold border border-rose-200">
                              {isUrdu ? 'زیر التواء:' : 'Pending:'} {mPending}
                            </span>
                          )}
                          {mCompleted > 0 && (
                            <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-900 rounded font-extrabold border border-emerald-200">
                              {isUrdu ? 'مکمل:' : 'Done:'} {mCompleted}
                            </span>
                          )}
                          {mArchived > 0 && (
                            <span className="px-1.5 py-0.2 bg-amber-100 text-amber-900 rounded font-extrabold border border-amber-200">
                              {isUrdu ? 'آرکائیو:' : 'Archived:'} {mArchived}
                            </span>
                          )}
                          {mDeleted > 0 && (
                            <span className="px-1.5 py-0.2 bg-red-100 text-red-900 rounded font-extrabold border border-red-200">
                              {isUrdu ? 'حذف:' : 'Deleted:'} {mDeleted}
                            </span>
                          )}
                          <span className="px-1.5 py-0.2 bg-white rounded-full border border-slate-300 text-emerald-900 font-extrabold ml-1">
                            {monthRems.length} {isUrdu ? 'یاد دہانیاں' : 'Total'}
                          </span>
                        </div>
                      </div>

                      {/* Reminders list for this month */}
                      {!isCollapsed && (
                        <div className="space-y-1.5">
                          {monthRems.map((rem) => (
                            <div
                              key={rem.id}
                              onClick={() => toggleReminder(rem.id)}
                              className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-2.5 ${
                                rem.isDeleted
                                  ? 'bg-red-50/60 border-red-200 opacity-80'
                                  : rem.isArchived
                                  ? 'bg-slate-100 border-slate-200 opacity-75'
                                  : rem.isDone
                                  ? 'bg-emerald-50/60 border-emerald-200/80'
                                  : 'bg-white border-slate-200/90 shadow-2xs hover:border-emerald-300'
                              }`}
                            >
                              <div className="flex items-start gap-2.5 min-w-0 flex-1">
                                {/* Check / Status Button */}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (!rem.isDeleted) toggleReminder(rem.id);
                                  }}
                                  disabled={!!rem.isDeleted}
                                  className="mt-0.5 shrink-0 hover:scale-110 transition-transform cursor-pointer disabled:cursor-not-allowed"
                                  title={rem.isDone ? 'Mark Incomplete' : 'Mark Complete'}
                                >
                                  {rem.isDone ? (
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600 fill-emerald-100" />
                                  ) : (
                                    <Circle className="w-4 h-4 text-slate-400 hover:text-[#0F8A5F]" />
                                  )}
                                </button>

                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <p
                                      className={`text-xs font-bold leading-snug ${
                                        rem.isDeleted
                                          ? 'line-through text-red-700'
                                          : rem.isDone
                                          ? 'line-through text-slate-400'
                                          : 'text-slate-800'
                                      }`}
                                    >
                                      {isUrdu ? rem.titleUrdu : rem.title}
                                    </p>
                                    {getTypeBadge(rem.type)}
                                  </div>

                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[10px] text-slate-500 font-semibold flex items-center gap-1">
                                      <Clock className="w-3 h-3 text-slate-400" />
                                      {formatDate(rem.date)}
                                    </span>

                                    {rem.isDone && !rem.isDeleted && (
                                      <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded">
                                        {isUrdu ? 'مکمل شدہ' : 'Completed'}
                                      </span>
                                    )}

                                    {rem.isArchived && !rem.isDeleted && (
                                      <span className="text-[9px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded">
                                        {isUrdu ? 'آرکائیو' : 'Archived'}
                                      </span>
                                    )}

                                    {rem.isDeleted && (
                                      <span className="text-[9px] font-bold text-red-800 bg-red-100 px-1.5 py-0.2 rounded">
                                        {isUrdu ? 'حذف شدہ' : 'Deleted'}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Action buttons */}
                              <div className="flex items-center gap-1 shrink-0 pt-0.5">
                                {rem.isDeleted ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={(e) => restoreDeletedReminder(rem.id, e)}
                                      className="p-1.5 rounded-lg border border-slate-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors cursor-pointer"
                                      title="Restore Reminder"
                                    >
                                      <ArchiveRestore className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => permanentDeleteReminder(rem.id, e)}
                                      className="p-1.5 rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-colors cursor-pointer"
                                      title="Delete Permanently"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      type="button"
                                      onClick={(e) => toggleArchiveReminder(rem.id, e)}
                                      className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                                        rem.isArchived
                                          ? 'bg-amber-100 border-amber-300 text-amber-800 hover:bg-amber-200'
                                          : 'bg-slate-50 border-slate-200 text-slate-500 hover:text-amber-800 hover:bg-amber-50'
                                      }`}
                                      title={rem.isArchived ? 'Unarchive' : 'Archive'}
                                    >
                                      {rem.isArchived ? (
                                        <ArchiveRestore className="w-3.5 h-3.5" />
                                      ) : (
                                        <Archive className="w-3.5 h-3.5" />
                                      )}
                                    </button>

                                    <button
                                      type="button"
                                      onClick={(e) => deleteReminder(rem.id, e)}
                                      className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                      title="Delete Reminder"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </>
                                )}
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
          </div>

          {/* Add Reminder Form */}
          <form onSubmit={handleAddReminder} className="pt-2 space-y-2 border-t border-slate-200">
            <div className="flex items-center justify-between gap-1 flex-wrap text-[11px] font-bold text-slate-700">
              <span>
                {isUrdu ? 'نئی یاد دہانی:' : 'Add Reminder:'}{' '}
                <strong className="text-emerald-950 font-extrabold">{formatDate(selectedDate)}</strong>
              </span>

              {/* Category pills */}
              <div className="flex items-center gap-1">
                {(['OTHER', 'TAX', 'SUPPLIER', 'UTILITY'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setNewType(t)}
                    className={`text-[9px] font-extrabold px-2 py-0.5 rounded cursor-pointer transition-all ${
                      newType === t
                        ? 'bg-[#0F8A5F] text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder={
                  isUrdu
                    ? `مثال: ${formatDate(selectedDate)} کا سپلائر بل...`
                    : `Reminder for ${formatDate(selectedDate)}...`
                }
                className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#0F8A5F] focus:border-transparent shadow-2xs"
              />
              <button
                type="submit"
                disabled={!newTitle.trim()}
                className="px-4 py-2 bg-[#0F8A5F] hover:bg-[#066647] disabled:opacity-50 text-white font-black text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1 shrink-0 shadow-2xs"
              >
                <Plus className="w-4 h-4" />
                <span>{isUrdu ? 'شامل کریں' : 'Add'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

