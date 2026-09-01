import React, { useState, useEffect } from 'react';
import { Screen, ShopProfile, StoreMode, TransactionType, InventoryItem, CustomerParty, SupplierParty, LoanRecord } from '../types';
import { formatQuantity } from '../utils/format';
import shopIconImg from '../assets/images/Shop.png';
import { AutoScrollText } from './AutoScrollText';
import {
  Home,
  Receipt,
  BookOpen,
  Package,
  Building2,
  FileCheck,
  FileBarChart2,
  Settings,
  Globe,
  ChevronDown,
  ShieldCheck,
  Lock,
  ScanBarcode,
  Layers,
  ArrowLeft,
  Bell,
  Mic,
  Search,
  X,
  ShoppingBag,
  Truck,
  HandCoins,
  Send,
  BarChart2,
  Calendar,
  Menu,
  Pin,
  PinOff,
  FolderSync,
  Cloud,
} from 'lucide-react';

interface HeaderProps {
  profile: ShopProfile;
  otherShops: Array<{ id: string; name: string }>;
  inventory?: InventoryItem[];
  customers?: CustomerParty[];
  suppliers?: SupplierParty[];
  loans?: LoanRecord[];
  isUrdu: boolean;
  currentScreen?: Screen;
  onBack?: () => void;
  onToggleUrdu: () => void;
  onSwitchShop: (shopId: string) => void;
  onLockApp: () => void;
  onOpenScanner?: () => void;
  onOpenVoiceEntry?: () => void;
  onOpenCalendar?: () => void;
  onToggleStoreMode?: () => void;
  onOpenQuickEntry?: (type: TransactionType) => void;
  onNavigateScreen?: (screen: Screen) => void;
  onToggleMenu?: () => void;
  isMenuOpen?: boolean;
}

interface AppNotification {
  id: string;
  textEn: string;
  textUr: string;
  emoji: string;
  bgColor: string;
  borderColor: string;
  emojiColor: string;
}

export const Header: React.FC<HeaderProps> = ({
  profile,
  otherShops,
  inventory = [],
  customers = [],
  suppliers = [],
  loans = [],
  isUrdu,
  currentScreen = Screen.DASHBOARD,
  onBack,
  onToggleUrdu,
  onSwitchShop,
  onLockApp,
  onOpenScanner,
  onOpenVoiceEntry,
  onOpenCalendar,
  onToggleStoreMode,
  onOpenQuickEntry,
  onNavigateScreen,
  onToggleMenu,
  isMenuOpen = false,
}) => {
  const [showShopDropdown, setShowShopDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifMsg, setShowNotifMsg] = useState(false);

  // Dynamic notifications state and loading
  const [calendarNotifs, setCalendarNotifs] = useState<AppNotification[]>([]);
  const [dismissedNotifIds, setDismissedNotifIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('my_shop_dismissed_notifs');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Load calendar reminders from local storage dynamically
  useEffect(() => {
    try {
      const savedReminders = localStorage.getItem('my_shop_reminders');
      if (savedReminders) {
        const parsed = JSON.parse(savedReminders);
        const pendingReminders = parsed.filter((r: any) => !r.isDone && !r.isArchived && !r.isDeleted);
        const remindersNotif = pendingReminders.map((r: any) => ({
          id: `reminder_${r.id}`,
          textEn: `Reminder: ${r.title} (Due: ${r.date})`,
          textUr: `یاد دہانی: ${r.titleUrdu || r.title} (آخری تاریخ: ${r.date})`,
          emoji: '📅',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200/60',
          emojiColor: 'text-blue-600',
        }));
        setCalendarNotifs(remindersNotif);
      } else {
        setCalendarNotifs([]);
      }
    } catch {
      setCalendarNotifs([]);
    }
  }, [showNotifMsg]); // reload when notification panel opens

  // Generate real-time alert notifications from existing data aspects
  // 1. Low stock items
  const lowStockNotifs: AppNotification[] = inventory
    .filter((item) => item.quantity <= item.minStockAlert)
    .map((item) => ({
      id: `low_stock_${item.id}`,
      textEn: `Low Stock Alert: ${item.name} (${formatQuantity(item.quantity, item.unit)} ${item.unit} remaining, limit is ${item.minStockAlert})`,
      textUr: `کم اسٹاک الرٹ: ${item.name} (${formatQuantity(item.quantity, item.unit)} ${item.unit} باقی، حد ${item.minStockAlert} ہے)`,
      emoji: '⚠️',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200/60',
      emojiColor: 'text-amber-600',
    }));

  // 2. High outstanding customer udhaar (over 10,000 PKR is considered high/warning)
  const highCreditNotifs: AppNotification[] = customers
    .filter((cust) => cust.totalCredit > 10000)
    .map((cust) => ({
      id: `high_credit_${cust.id}`,
      textEn: `High Udhaar Notice: ${cust.name} owes Rs. ${cust.totalCredit.toLocaleString()}`,
      textUr: `زیادہ بقایا ادھار: ${cust.name} کے ذمے Rs. ${cust.totalCredit.toLocaleString()} ہیں`,
      emoji: '💰',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-200/60',
      emojiColor: 'text-emerald-600',
    }));

  // 3. Suppliers due soon or overdue
  const supplierDueNotifs: AppNotification[] = suppliers
    .filter((sup) => sup.totalPayable > 0 && sup.dueDate)
    .map((sup) => {
      const isOverdue = new Date(sup.dueDate!) < new Date();
      return {
        id: `supplier_due_${sup.id}`,
        textEn: `${isOverdue ? 'Overdue' : 'Due'} Supplier Payment: Rs. ${sup.totalPayable.toLocaleString()} to ${sup.name}`,
        textUr: `${isOverdue ? 'تاخیر شدہ' : 'واجب الادا'} سپلائر ادائیگی: Rs. ${sup.totalPayable.toLocaleString()} برائے ${sup.name}`,
        emoji: '🚚',
        bgColor: 'bg-rose-50',
        borderColor: 'border-rose-200/60',
        emojiColor: 'text-rose-600',
      };
    });

  // 4. Loans approaching repayment or overdue
  const loanDueNotifs: AppNotification[] = loans
    .filter((loan) => loan.outstandingAmount > 0 && loan.repaymentDate)
    .map((loan) => {
      const isOverdue = new Date(loan.repaymentDate!) < new Date();
      return {
        id: `loan_due_${loan.id}`,
        textEn: `${isOverdue ? 'Overdue' : 'Due'} Loan Repayment: Rs. ${loan.outstandingAmount.toLocaleString()} (${loan.lenderOrBorrower})`,
        textUr: `${isOverdue ? 'تاخیر شدہ' : 'قریب ترین'} قرض واپسی: Rs. ${loan.outstandingAmount.toLocaleString()} (${loan.lenderOrBorrower})`,
        emoji: '🏦',
        bgColor: 'bg-indigo-50',
        borderColor: 'border-indigo-200/60',
        emojiColor: 'text-indigo-600',
      };
    });

  // Combine all generated live notifications
  const allLiveNotifs = [
    ...lowStockNotifs,
    ...highCreditNotifs,
    ...supplierDueNotifs,
    ...loanDueNotifs,
    ...calendarNotifs,
  ];

  // Filter out any notifications that have been manually marked as read/dismissed
  const activeUnreadNotifs = allLiveNotifs.filter((n) => !dismissedNotifIds.includes(n.id));

  // Default fallback safe message when no alerts are present
  const defaultSafeNotifs: AppNotification[] = [
    {
      id: 'default_safe_alert',
      textEn: 'Your shop is running perfectly! Low stock, pending udhaar, and loans are all clear.',
      textUr: 'آپ کی دکان کا نظام بہترین چل رہا ہے! کم اسٹاک، بقایا ادھار اور قرضے سب کلیئر ہیں۔',
      emoji: '✨',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-200/60',
      emojiColor: 'text-emerald-600',
    },
  ];

  const displayNotificationsList = activeUnreadNotifs.length > 0 ? activeUnreadNotifs : defaultSafeNotifs;
  const hasUnreadNotifs = activeUnreadNotifs.length > 0;

  const handleMarkAllAsRead = () => {
    const allIds = allLiveNotifs.map((n) => n.id);
    setDismissedNotifIds(allIds);
    try {
      localStorage.setItem('my_shop_dismissed_notifs', JSON.stringify(allIds));
    } catch {}
  };

  const showBackButton = currentScreen !== Screen.DASHBOARD && Boolean(onBack);

  // Quick Action Options for Search
  const quickActions = [
    { name: isUrdu ? 'فروخت اینٹری' : 'Add Sale / Invoice', type: 'SALE' as TransactionType, screen: Screen.DASHBOARD, icon: ShoppingBag, color: 'text-[#126A49]' },
    { name: isUrdu ? 'خریداری اینٹری' : 'Add Purchase', type: 'PURCHASE' as TransactionType, screen: Screen.DASHBOARD, icon: Truck, color: 'text-indigo-600' },
    { name: isUrdu ? 'اخراجات اینٹری' : 'Add Expense', type: 'EXPENSE' as TransactionType, screen: Screen.DASHBOARD, icon: Receipt, color: 'text-rose-600' },
    { name: isUrdu ? 'ادھار وصولی' : 'Collect Udhaar', type: 'RECEIPT' as TransactionType, screen: Screen.DASHBOARD, icon: HandCoins, color: 'text-amber-600' },
    { name: isUrdu ? 'سپلائر ادائیگی' : 'Pay Supplier', type: 'PAYMENT' as TransactionType, screen: Screen.DASHBOARD, icon: Send, color: 'text-purple-600' },
    { name: isUrdu ? 'اسٹاک چیک کریں' : 'Check Stock', screen: Screen.INVENTORY, icon: Package, color: 'text-blue-600' },
    { name: isUrdu ? 'کسٹمر کھاتہ' : 'Customer Khata', screen: Screen.KHATA, icon: BookOpen, color: 'text-teal-600' },
    { name: isUrdu ? 'کاروباری گراف' : 'Business Analytics', screen: Screen.ANALYTICS, icon: BarChart2, color: 'text-cyan-600' },
  ];

  const filteredActions = searchQuery.trim()
    ? quickActions.filter((a) => a.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

  const filteredCustomers = searchQuery.trim()
    ? customers.filter((c) => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

  const filteredInventory = searchQuery.trim()
    ? inventory.filter((i) => i.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

  const hasSearchResults =
    filteredActions.length > 0 || filteredCustomers.length > 0 || filteredInventory.length > 0;

  return (
    <header className="sticky top-0 z-49 bg-[#F8FAFC]/95 backdrop-blur-md border-b border-slate-200/60 shadow-2xs pt-[env(safe-area-inset-top,0px)]">
      {/* Mobile Status Bar Top Clearance Space */}
      <div className="h-1.5 sm:h-0 w-full bg-[#126A49]/10" />
      <div className="max-w-5xl mx-auto px-3.5 py-1.5 sm:py-2 space-y-0.5">
        {/* TOP ROW: Sleek App Title & Utilities */}
        <div className="flex items-center justify-between px-0.5">
          <div className="flex items-center gap-1.5 sm:gap-2">
            {onToggleMenu && (
              <button
                type="button"
                onClick={onToggleMenu}
                title={isUrdu ? 'نیویگیشن مینو کھولیں' : 'Open Navigation Menu'}
                className="p-1.5 rounded-xl bg-[#126A49]/10 hover:bg-[#126A49]/20 text-[#126A49] transition-all cursor-pointer flex items-center gap-1 shadow-2xs border border-[#126A49]/20"
              >
                <Menu className="w-5 h-5 stroke-[2.2]" />
                <span className="text-[10px] font-extrabold hidden sm:inline">
                  {isUrdu ? 'مینو' : 'Menu'}
                </span>
              </button>
            )}

            {showBackButton && (
              <button
                type="button"
                onClick={onBack}
                title={isUrdu ? 'پچھلے صفحے پر واپس جائیں' : 'Go Back'}
                className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-[#126A49] font-medium text-xs rounded-xl border border-emerald-200 transition-all cursor-pointer shrink-0"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>{isUrdu ? 'واپس' : 'Back'}</span>
              </button>
            )}
            <div className="text-[#126A49] font-bold text-lg sm:text-xl tracking-tight flex items-center">
              <span>MyShop</span>
              <span className="text-[#0B132B]">Manager</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Urdu Title on Right */}
            <div className="text-right font-bold text-base sm:text-lg flex items-center gap-0.5" dir="rtl">
              <span className="text-[#126A49]">مائی شاپ</span>
              <span className="text-[#0B132B]"> منیجر</span>
            </div>

            {profile.pinCode && (
              <button
                type="button"
                onClick={onLockApp}
                title={isUrdu ? 'ایپ لاک کریں' : 'Lock App'}
                className="p-1.5 rounded-xl bg-white border border-slate-200/80 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer shadow-2xs ml-1"
              >
                <Lock className="w-3.5 h-3.5 text-slate-600" />
              </button>
            )}
          </div>
        </div>

        {/* 1. TOP SHOP SECTION - EXACT DITTO MATCH TO USER SCREENSHOT */}
        <div className="flex items-center justify-between gap-6 sm:gap-8 px-0 py-0 -mt-1 sm:-mt-1.5">
          <div className="flex items-center gap-1 min-w-0 flex-1">
            {/* Borderless Shop 3D Illustration Graphic */}
            <div className="relative shrink-0 -ml-2 rtl:-mr-2 rtl:ml-0">
              <img
                src={shopIconImg}
                alt="Shop Icon"
                className={`w-36 h-36 sm:w-44 sm:h-44 rounded-[24px] object-contain select-none drop-shadow-xs transition-transform duration-200 ${
                  isUrdu ? 'scale-x-100' : '-scale-x-100'
                }`}
                referrerPolicy="no-referrer"
              />
            </div>

            {/* Shop Name & Subtitle */}
            <div className="relative min-w-0 flex-1 -ml-6 sm:-ml-8 rtl:ml-0 rtl:-mr-6 sm:rtl:-mr-8 pt-0.5 pr-2 sm:pr-3 rtl:pr-0 rtl:pl-2">
              <button
                type="button"
                onClick={() => setShowShopDropdown(!showShopDropdown)}
                className={`flex items-center gap-1.5 cursor-pointer group ${
                  isUrdu ? 'flex-row-reverse text-right' : 'flex-row text-left'
                }`}
              >
                <span className={`leading-tight tracking-tight group-hover:text-[#0F8A5F] transition-colors block ${
                  isUrdu ? 'text-[18px] sm:text-[21px] font-semibold text-[#0C152B]' : 'font-semibold text-[#0C152B] text-[16px] sm:text-[19px]'
                }`}>
                  {(() => {
                    let name = profile.shopName || 'Bismillah General Store';
                    if (isUrdu && name === 'Bismillah General Store') {
                      name = 'بسم اللہ جنرل اسٹور';
                    }
                    const bracketIndex = name.indexOf('(');
                    if (bracketIndex > 0) {
                      const firstPart = name.slice(0, bracketIndex).trim();
                      const secondPart = name.slice(bracketIndex).trim();
                      return (
                        <>
                          <span className="block whitespace-nowrap">{firstPart}</span>
                          <span className="block whitespace-nowrap text-[14px] sm:text-[16px] font-normal text-[#475569] mt-0.5">{secondPart}</span>
                        </>
                      );
                    }
                    if (name.length > 26) {
                      const lastSpaceIndex = name.lastIndexOf(' ');
                      if (lastSpaceIndex > 0) {
                        const firstPart = name.slice(0, lastSpaceIndex).trim();
                        const secondPart = name.slice(lastSpaceIndex).trim();
                        return (
                          <>
                            <span className="block whitespace-nowrap">{firstPart}</span>
                            <span className="block whitespace-nowrap text-[14px] sm:text-[16px] font-normal text-[#475569] mt-0.5">{secondPart}</span>
                          </>
                        );
                      }
                    }
                    return <span className="block whitespace-nowrap">{name}</span>;
                  })()}
                </span>
                <ChevronDown className="w-4 h-4 text-[#0C152B] shrink-0 stroke-[2.2]" />
              </button>
              <p className={`font-normal text-[#475569] whitespace-nowrap mt-0.5 mb-4 sm:mb-5 max-w-full overflow-hidden ${
                isUrdu ? 'text-[14px] sm:text-[15px] font-medium' : 'text-[12px] sm:text-[13px]'
              }`}>
                <AutoScrollText isUrdu={isUrdu} containerClassName="max-w-full">
                  {(() => {
                    let subtitleText = profile.subtitle || 'Dukan Management';
                    if (isUrdu) {
                      if (subtitleText === 'Dukan Management' || !profile.subtitle) {
                        subtitleText = 'دکان کا انتظام اور حساب کتاب';
                      }
                    }
                    return subtitleText;
                  })()}
                </AutoScrollText>
              </p>

              {/* Multi Shop Switcher Dropdown */}
              {showShopDropdown && (
                <div className="absolute top-full left-0 rtl:left-auto rtl:right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-slate-200 p-2 z-50 animate-in fade-in">
                  <p className="text-[10px] font-medium uppercase text-slate-400 px-3 py-1 rtl:text-right">
                    {isUrdu ? 'دکان منتخب کریں' : 'Select Active Shop'}
                  </p>
                  {otherShops.map((shop) => (
                    <button
                      key={shop.id}
                      type="button"
                      onClick={() => {
                        onSwitchShop(shop.id);
                        setShowShopDropdown(false);
                      }}
                      className={`w-full text-left rtl:text-right px-3 py-2 rounded-xl text-xs font-medium flex items-center justify-between transition-colors ${
                        shop.id === profile.id
                          ? 'bg-emerald-50 text-[#0F8A5F]'
                          : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <span className="truncate">{shop.name}</span>
                      {shop.id === profile.id && <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Frameless Notification Bell Icon & Urdu Voice Entry Button */}
          <div className="flex items-center shrink-0 ml-2 sm:ml-4 mr-1 sm:mr-2 gap-2 relative self-end pb-1 sm:pb-2">
            {/* Quick Home Dashboard Button */}
            <button
              type="button"
              onClick={() => {
                if (onNavigateScreen) {
                  onNavigateScreen(Screen.DASHBOARD);
                }
              }}
              title={isUrdu ? 'ہوم ڈیش بورڈ پر جائیں' : 'Go to Home Dashboard'}
              className="flex items-center gap-1.5 px-3.5 py-1.5 sm:px-4 sm:py-2 bg-white hover:bg-emerald-50 text-emerald-800 hover:text-emerald-900 border border-emerald-200/50 rounded-xl text-xs sm:text-[13px] font-bold shadow-2xs hover:shadow-xs transition-all cursor-pointer group active:scale-95 shrink-0"
            >
              <Home className="w-4 h-4 text-[#126A49] shrink-0" />
              <AutoScrollText isUrdu={isUrdu} className="whitespace-nowrap">{isUrdu ? 'ہوم' : 'Home'}</AutoScrollText>
            </button>

            {/* Urdu Voice Entry Button */}
            {onOpenVoiceEntry && (
              <button
                type="button"
                onClick={onOpenVoiceEntry}
                className="flex items-center gap-2 px-3.5 py-1.5 sm:px-4 sm:py-2 bg-gradient-to-r from-emerald-600 to-[#0F8A5F] hover:from-emerald-700 hover:to-[#066647] text-white text-xs sm:text-[13px] font-bold rounded-xl shadow-2xs hover:shadow-xs transition-all cursor-pointer group active:scale-95 shrink-0"
                title={isUrdu ? 'اردو وائس اینٹری' : 'Urdu Voice Entry'}
              >
                <Mic className="w-4 h-4 text-rose-300 animate-pulse shrink-0" />
                <AutoScrollText isUrdu={isUrdu} className="whitespace-nowrap">{isUrdu ? 'اردو وائس اینٹری' : 'Urdu Voice Entry'}</AutoScrollText>
              </button>
            )}

            {/* Notification Bell Icon */}
            <button
              type="button"
              onClick={() => setShowNotifMsg(!showNotifMsg)}
              title={isUrdu ? 'اطلاعات' : 'Notifications'}
              className="relative p-0.5 transition-colors cursor-pointer"
            >
              <Bell
                className={`w-5.5 h-5.5 sm:w-6.5 sm:h-6.5 stroke-[1.8] transition-colors ${
                  hasUnreadNotifs
                    ? 'text-[#0B132B]'
                    : 'text-emerald-500 hover:text-emerald-600'
                }`}
              />
              {hasUnreadNotifs && (
                <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-[#F8FAFC]" />
              )}
            </button>

            {/* Notification Popover Message */}
            {showNotifMsg && (
              <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-slate-200/90 p-3 z-50 animate-in fade-in text-xs space-y-2.5 max-h-96 overflow-y-auto">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2 gap-1">
                  <span className="font-bold text-slate-900 flex items-center gap-1 shrink-0">
                    <span>{isUrdu ? 'اطلاعات' : 'Notifications'}</span>
                    {hasUnreadNotifs && (
                      <span className="bg-red-100 text-red-700 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                        {activeUnreadNotifs.length}
                      </span>
                    )}
                  </span>

                  <button
                    type="button"
                    onClick={() => {
                      if (onNavigateScreen) {
                        onNavigateScreen(Screen.NOTIFICATIONS);
                      }
                      setShowNotifMsg(false);
                    }}
                    className="text-[10px] bg-emerald-50 hover:bg-emerald-100 text-[#126A49] font-bold px-2 py-0.5 rounded-md border border-emerald-200/50 transition-colors cursor-pointer shrink-0"
                  >
                    {isUrdu ? 'تمام دیکھیں' : 'View All'}
                  </button>

                  {hasUnreadNotifs ? (
                    <button
                      type="button"
                      onClick={handleMarkAllAsRead}
                      className="text-[10px] bg-rose-100 hover:bg-rose-200 text-rose-700 font-bold px-2 py-0.5 rounded-md transition-colors cursor-pointer shrink-0"
                    >
                      {isUrdu ? 'پڑھ لیں' : 'Mark Read'}
                    </button>
                  ) : (
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-md shrink-0">
                      {isUrdu ? 'صاف' : 'All Clear'}
                    </span>
                  )}
                </div>
                <div className="space-y-2">
                  {displayNotificationsList.map((notif) => (
                    <div
                       key={notif.id}
                       className={`p-2.5 ${notif.bgColor} rounded-xl border ${notif.borderColor} text-slate-700 font-medium text-[11px] flex items-start gap-2 shadow-2xs transition-all hover:scale-[1.01]`}
                    >
                      <span className={`${notif.emojiColor} font-bold shrink-0 text-sm`}>{notif.emoji}</span>
                      <span className="leading-relaxed">{isUrdu ? notif.textUr : notif.textEn}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 2. WORKING SEARCH INPUT BAR BELOW SHOP SECTION (EXACT DITTO MATCH TO SCREENSHOT) */}
        <div className="relative pt-0.5">
          <div className="bg-white border border-slate-200/80 shadow-2xs rounded-full p-2 pl-4 pr-2 flex items-center justify-between gap-2.5">
            <Search className="w-4.5 h-4.5 text-slate-400 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isUrdu ? 'کوئیک ایکشنز یا تلاش کریں...' : 'Quick Actions...'}
              className="w-full bg-transparent text-xs sm:text-sm text-slate-800 placeholder-slate-400/90 focus:outline-none font-normal"
            />

            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-full shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            ) : null}

            {/* Barcode Scanner Icon inside light rounded square box on right (Exact match to screenshot!) */}
            {onOpenScanner && (
              <button
                type="button"
                onClick={onOpenScanner}
                title={isUrdu ? 'بارکوڈ سکینر کھولیں' : 'Open Barcode Scanner'}
                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors cursor-pointer shrink-0 border border-slate-200/50"
              >
                <ScanBarcode className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* WORKING SEARCH RESULTS DROPDOWN OVERLAY */}
          {searchQuery.trim() && (
            <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl shadow-2xl border border-slate-200 p-2 z-50 max-h-80 overflow-y-auto space-y-2 animate-in fade-in">
              {hasSearchResults ? (
                <>
                  {/* Matching Actions */}
                  {filteredActions.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 py-1">
                        {isUrdu ? 'کوئیک ایکشنز' : 'Quick Actions'}
                      </p>
                      <div className="space-y-0.5">
                        {filteredActions.map((act, idx) => {
                          const IconComp = act.icon;
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                if (act.type && onOpenQuickEntry) {
                                  onOpenQuickEntry(act.type);
                                } else if (act.screen && onNavigateScreen) {
                                  onNavigateScreen(act.screen);
                                }
                                setSearchQuery('');
                              }}
                              className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-slate-800 hover:bg-slate-50 flex items-center gap-2 transition-colors cursor-pointer"
                            >
                              <IconComp className={`w-4 h-4 ${act.color}`} />
                              <span>{act.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Matching Customers */}
                  {filteredCustomers.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 py-1">
                        {isUrdu ? 'کسٹمرز کھاتہ' : 'Customers'}
                      </p>
                      <div className="space-y-0.5">
                        {filteredCustomers.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              if (onNavigateScreen) onNavigateScreen(Screen.KHATA);
                              setSearchQuery('');
                            }}
                            className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-slate-800 hover:bg-slate-50 flex items-center justify-between transition-colors cursor-pointer"
                          >
                            <span>{c.name} ({c.phone})</span>
                            <span className="font-bold text-amber-700">Rs. {c.totalCredit}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Matching Inventory Items */}
                  {filteredInventory.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 py-1">
                        {isUrdu ? 'اسٹاک اشیاء' : 'Inventory Items'}
                      </p>
                      <div className="space-y-0.5">
                        {filteredInventory.map((i) => (
                          <button
                            key={i.id}
                            type="button"
                            onClick={() => {
                              if (onNavigateScreen) onNavigateScreen(Screen.INVENTORY);
                              setSearchQuery('');
                            }}
                            className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-slate-800 hover:bg-slate-50 flex items-center justify-between transition-colors cursor-pointer"
                          >
                            <span>{i.name} ({i.category})</span>
                            <span className="font-bold text-emerald-700">Rs. {i.salePrice}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p className="p-3 text-center text-xs text-slate-500 font-medium">
                  {isUrdu ? 'کوئی نتیجہ نہیں ملا' : 'No matching items or actions found.'}
                </p>
              )}
            </div>
          )}
        </div>

        {/* 3. UTILITY STRIP (Language Toggle, Barcode/QR Scanner, Retail Mode Switcher) */}
        <div className="flex items-center justify-between gap-1.5 pt-0.5">
          {/* Language Toggle */}
          <button
            type="button"
            onClick={onToggleUrdu}
            className="flex-1 min-w-0 py-1.5 px-1 bg-white hover:bg-slate-50 text-slate-700 font-bold rounded-xl border border-slate-200/80 shadow-2xs transition-colors cursor-pointer flex items-center justify-center gap-1 sm:gap-1.5 overflow-hidden"
          >
            <Globe className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
            <AutoScrollText
              isUrdu={isUrdu}
              containerClassName="max-w-full"
              className={`text-center leading-normal py-0.5 ${isUrdu ? 'text-[12.5px] font-extrabold text-slate-900' : 'text-[11px] sm:text-xs font-semibold'}`}
            >
              {isUrdu ? 'اردو / English' : 'English / اردو'}
            </AutoScrollText>
          </button>

          {/* Barcode / QR Code Scanner Button in Center */}
          {onOpenScanner && (
            <button
              type="button"
              onClick={onOpenScanner}
              title={isUrdu ? 'بارکوڈ / QR اسکینر کھولیں' : 'Open Barcode / QR Scanner'}
              className="flex-1 min-w-0 py-1.5 px-1 bg-white hover:bg-emerald-50 text-slate-700 hover:text-[#126A49] font-bold rounded-xl border border-slate-200/80 shadow-2xs transition-colors cursor-pointer flex items-center justify-center gap-1 sm:gap-1.5 overflow-hidden"
            >
              <ScanBarcode className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <AutoScrollText
                isUrdu={isUrdu}
                containerClassName="max-w-full"
                className={`text-center leading-normal py-0.5 ${isUrdu ? 'text-[12.5px] font-extrabold text-slate-900' : 'text-[11px] sm:text-xs font-semibold'}`}
              >
                {isUrdu ? 'بارکوڈ اسکینر' : 'Barcode / QR'}
              </AutoScrollText>
            </button>
          )}

          {/* Calendar Widget (if present) */}
          {onOpenCalendar && (
            <button
              type="button"
              onClick={onOpenCalendar}
              title={isUrdu ? 'کالنڈر اور یاد دہانی' : 'Calendar & Reminders'}
              className="py-1.5 px-2 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs rounded-xl border border-slate-200/80 shadow-2xs transition-colors cursor-pointer flex items-center justify-center gap-1 shrink-0"
            >
              <Calendar className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            </button>
          )}

          {/* Working Switchable Retail Mode Button */}
          <button
            type="button"
            onClick={onToggleStoreMode}
            title={isUrdu ? 'دکان کا موڈ تبدیل کریں' : 'Click to Switch Store Mode'}
            className={`flex-1 min-w-0 py-1.5 px-1 font-bold rounded-xl border flex items-center justify-center gap-1 sm:gap-1.5 transition-all cursor-pointer shadow-2xs overflow-hidden ${
              profile.storeMode === StoreMode.SIMPLE
                ? 'bg-emerald-50 hover:bg-emerald-100 text-[#126A49] border-emerald-300/80'
                : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border-indigo-300/80'
            }`}
          >
            <Layers className={`w-3.5 h-3.5 shrink-0 ${profile.storeMode === StoreMode.SIMPLE ? 'text-[#126A49]' : 'text-indigo-600'}`} />
            <AutoScrollText
              isUrdu={isUrdu}
              containerClassName="max-w-full"
              className={`text-center leading-normal py-0.5 ${isUrdu ? 'text-[12.5px] font-extrabold text-slate-900' : 'text-[11px] sm:text-xs font-semibold'}`}
            >
              {profile.storeMode === StoreMode.SIMPLE
                ? (isUrdu ? 'ریٹیل موڈ' : 'Retail Mode')
                : (isUrdu ? 'ہول سیل موڈ' : 'Wholesale Mode')}
            </AutoScrollText>
          </button>
        </div>
      </div>
    </header>
  );
};

interface LeftSidebarNavProps {
  currentScreen: Screen;
  onSelectScreen: (s: Screen) => void;
  isUrdu: boolean;
  isOpen: boolean;
  onClose: () => void;
  isPinned: boolean;
  onTogglePin: () => void;
}

export const LeftSidebarNav: React.FC<LeftSidebarNavProps> = ({
  currentScreen,
  onSelectScreen,
  isUrdu,
  isOpen,
  onClose,
  isPinned,
  onTogglePin,
}) => {
  // Standard navigation menu items
  const navItems = [
    {
      screen: Screen.DASHBOARD,
      labelEn: 'Home',
      labelUr: 'ہوم',
      icon: Home,
    },
    {
      screen: Screen.TRANSACTIONS,
      labelEn: 'Recent Journal',
      labelUr: 'روزنامچہ (اینٹریز)',
      icon: Receipt,
    },
    {
      screen: Screen.KHATA,
      labelEn: 'Khata',
      labelUr: 'کھاتہ',
      icon: BookOpen,
    },
    {
      screen: Screen.INVENTORY,
      labelEn: 'Stock',
      labelUr: 'اسٹاک',
      icon: Package,
    },
    {
      screen: Screen.ASSETS_LOANS,
      labelEn: 'Assets',
      labelUr: 'اثاثے و قرضے',
      icon: Building2,
    },
    {
      screen: Screen.FBR_TAX,
      labelEn: 'Tax',
      labelUr: 'ٹیکس تیاری',
      icon: FileCheck,
    },
    {
      screen: Screen.REPORTS,
      labelEn: 'Reports',
      labelUr: 'رپورٹس',
      icon: FileBarChart2,
    },
    {
      screen: Screen.SETTINGS,
      labelEn: 'Settings',
      labelUr: 'سیٹنگز',
      icon: Settings,
    },
  ];

  const isBackupSelected = currentScreen === Screen.BACKUP_SYNC;

  if (!isOpen && !isPinned) {
    return null;
  }

  return (
    <>
      {/* 1. PINNED MINI-RAIL (Ultra-thin 36-40px semi-transparent icon rail) */}
      {isPinned && (
        <aside
          className={`fixed top-0 bottom-0 h-screen h-[100dvh] z-50 w-9 sm:w-10 bg-white/80 backdrop-blur-md border-slate-200/80 shadow-xs flex flex-col justify-between pt-[calc(env(safe-area-inset-top,0px)+0.5rem)] pb-2 px-0.5 items-center select-none overflow-y-auto no-scrollbar transition-all ${
            isUrdu ? 'right-0 border-l' : 'left-0 border-r'
          }`}
        >
          {/* Top Pin / Unpin Button */}
          <div className="flex flex-col items-center gap-1 pb-1.5 border-b border-slate-200/60 w-full">
            <button
              type="button"
              onClick={onTogglePin}
              title={isUrdu ? 'مینو ان پن کریں (آٹو ہائیڈ)' : 'Unpin Menu (Auto-Hide)'}
              className="p-1.5 rounded-lg bg-emerald-100/90 text-emerald-800 hover:bg-emerald-200/90 transition-all cursor-pointer border border-emerald-300/80 shadow-2xs"
            >
              <Pin className="w-3.5 h-3.5 fill-emerald-700" />
            </button>
          </div>

          {/* Middle Vertical Icons List */}
          <nav className="flex flex-col items-center gap-1 mt-1.5 mb-auto py-1 w-full">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isSelected = currentScreen === item.screen;
              const label = isUrdu ? item.labelUr : item.labelEn;

              return (
                <button
                  key={item.screen}
                  type="button"
                  onClick={() => onSelectScreen(item.screen)}
                  title={label}
                  className={`w-7.5 h-7.5 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#126A49] text-white shadow-2xs font-bold scale-105'
                      : 'text-slate-600 hover:bg-slate-200/60 hover:text-slate-900'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                </button>
              );
            })}
          </nav>

          {/* Dedicated Distinct Backup & Sync Button at the VERY END OF VERTICAL BAR */}
          <div className="flex flex-col items-center gap-1 pt-2 border-t border-slate-200/80 w-full mt-auto">
            <button
              type="button"
              onClick={() => onSelectScreen(Screen.BACKUP_SYNC)}
              title={isUrdu ? 'بیک اپ اور خودکار سنک (Backup & Sync)' : 'Backup & Auto Sync'}
              className={`relative w-7.5 h-7.5 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer group ${
                isBackupSelected
                  ? 'bg-gradient-to-tr from-emerald-800 via-teal-700 to-emerald-600 text-white shadow-md ring-2 ring-emerald-400 scale-105'
                  : 'bg-gradient-to-tr from-teal-50 to-emerald-100/90 text-teal-800 border border-teal-300/80 hover:bg-teal-100 hover:text-teal-900 shadow-2xs hover:scale-105'
              }`}
            >
              <FolderSync className="w-4 h-4 shrink-0 transition-transform group-hover:rotate-45" />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-1 ring-white animate-pulse" />
            </button>
          </div>
        </aside>
      )}

      {/* 2. FULL OVERLAY DRAWER (When isOpen is true) */}
      {isOpen && (
        <>
          {/* Dark backdrop overlay (Clicking backdrop closes drawer) */}
          <div
            onClick={onClose}
            className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-2xs transition-opacity animate-in fade-in cursor-pointer"
          />

          {/* Slide-over floating compact drawer - Semi-transparent & Minimal footprint */}
          <aside
            className={`fixed top-0 bottom-0 z-50 w-52 sm:w-60 bg-white/95 backdrop-blur-md shadow-2xl flex flex-col justify-between pt-[calc(env(safe-area-inset-top,0px)+0.625rem)] pb-3.5 p-3 select-none overflow-y-auto animate-in duration-200 ${
              isUrdu
                ? 'right-0 border-l border-slate-200/80 slide-in-from-right'
                : 'left-0 border-r border-slate-200/80 slide-in-from-left'
            }`}
          >
            <div className="flex-1 flex flex-col justify-between h-full min-h-0">
              {/* Upper Section: Brand Header & Standard Navigation Menu */}
              <div className="space-y-2">
                {/* Header of Drawer */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                  <div className="flex items-center gap-2">
                    <div className="w-7.5 h-7.5 rounded-xl bg-gradient-to-tr from-emerald-800 to-teal-700 text-white flex items-center justify-center font-black text-xs shadow-2xs shrink-0">
                      MS
                    </div>
                    <div className="min-w-0">
                      <h1 className="text-[11px] font-extrabold text-slate-800 tracking-tight truncate">
                        MyShop Manager
                      </h1>
                      <p className="text-[9px] text-emerald-700 font-bold truncate">
                        {isUrdu ? 'دکان مینیجر' : 'Dukan Management'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {/* Pin / Unpin Button */}
                    <button
                      type="button"
                      onClick={() => {
                        onTogglePin();
                        onClose(); // Auto-close big drawer when Pin is clicked
                      }}
                      title={
                        isPinned
                          ? isUrdu
                            ? 'مینو کو آٹو ہائیڈ موڈ میں کریں'
                            : 'Unpin Sidebar (Auto-Hide)'
                          : isUrdu
                          ? 'مینو کو اسکرین پر پن کریں'
                          : 'Pin Sidebar to Screen'
                      }
                      className={`p-1 rounded-lg transition-all cursor-pointer ${
                        isPinned
                          ? 'bg-emerald-100/90 text-emerald-800 border border-emerald-300'
                          : 'bg-slate-100/80 text-slate-500 hover:text-slate-800 hover:bg-slate-200/80'
                      }`}
                    >
                      {isPinned ? <Pin className="w-3.5 h-3.5 fill-emerald-700" /> : <PinOff className="w-3.5 h-3.5" />}
                    </button>

                    {/* Close Button */}
                    <button
                      type="button"
                      onClick={onClose}
                      className="p-1 rounded-lg bg-slate-100/80 hover:bg-slate-200/80 text-slate-600 transition-colors cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Navigation Items - Compact list */}
                <nav className="space-y-0.5">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const isSelected = currentScreen === item.screen;
                    const label = isUrdu ? item.labelUr : item.labelEn;

                    return (
                      <button
                        key={item.screen}
                        type="button"
                        onClick={() => {
                          onSelectScreen(item.screen);
                          onClose(); // Close full overlay after selection
                        }}
                        className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-50/90 text-[#126A49] font-bold shadow-2xs border border-emerald-200/80'
                            : 'text-slate-700 hover:bg-slate-100/80 hover:text-slate-900 font-medium'
                        }`}
                      >
                        <div
                          className={`p-1 rounded-md shrink-0 transition-all ${
                            isSelected ? 'bg-[#126A49] text-white shadow-2xs' : 'bg-slate-100/80 text-slate-600'
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <AutoScrollText
                          isUrdu={isUrdu}
                          containerClassName="flex-1 min-w-0"
                          className={`text-xs font-bold ${isUrdu ? 'leading-normal py-0.5' : 'leading-tight'}`}
                        >
                          {label}
                        </AutoScrollText>
                      </button>
                    );
                  })}
                </nav>
              </div>

              {/* Dedicated Distinct Option at the VERY END OF THE VERTICAL BAR */}
              <div className="pt-3 mt-auto border-t border-slate-200/80">
                <button
                  type="button"
                  onClick={() => {
                    onSelectScreen(Screen.BACKUP_SYNC);
                    onClose();
                  }}
                  className={`w-full text-left rtl:text-right p-2.5 rounded-2xl transition-all cursor-pointer group flex items-center justify-between gap-2.5 shadow-2xs border ${
                    isBackupSelected
                      ? 'bg-gradient-to-tr from-emerald-800 via-teal-800 to-emerald-700 text-white border-emerald-600 shadow-md ring-1 ring-emerald-400'
                      : 'bg-gradient-to-tr from-emerald-50/90 via-teal-50/60 to-emerald-50/80 hover:from-emerald-100 hover:to-teal-100 border-emerald-200/90 text-slate-800 hover:border-emerald-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div
                      className={`p-2 rounded-xl shrink-0 transition-all ${
                        isBackupSelected
                          ? 'bg-white/20 text-white shadow-inner'
                          : 'bg-gradient-to-tr from-emerald-700 to-teal-600 text-white shadow-xs group-hover:scale-105'
                      }`}
                    >
                      <FolderSync className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <AutoScrollText
                          isUrdu={isUrdu}
                          containerClassName="flex-1 min-w-0"
                          className={`text-xs font-black ${isBackupSelected ? 'text-white' : 'text-slate-900'}`}
                        >
                          {isUrdu ? 'بیک اپ اور سنک' : 'Backup & Sync'}
                        </AutoScrollText>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                      </div>
                      <p className={`text-[10px] truncate font-medium mt-0.5 ${isBackupSelected ? 'text-emerald-100' : 'text-emerald-700 font-semibold'}`}>
                        {isUrdu ? 'کلاؤڈ و لوکل بیک اپ' : 'Cloud & Local Sync'}
                      </p>
                    </div>
                  </div>

                  <div className={`p-1.5 rounded-lg shrink-0 ${isBackupSelected ? 'bg-white/15 text-white' : 'bg-emerald-100/80 text-emerald-800'}`}>
                    <Cloud className="w-3.5 h-3.5" />
                  </div>
                </button>
              </div>
            </div>
          </aside>
        </>
      )}
    </>
  );
};

export const BottomNav: React.FC<LeftSidebarNavProps> = (props) => {
  return <LeftSidebarNav {...props} />;
};

