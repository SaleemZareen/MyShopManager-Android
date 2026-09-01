import React, { useState, useEffect } from 'react';
import { AppState, Transaction, TransactionType } from '../types';
import { formatMoney, formatDate, formatTime, formatShortDateTime, formatFullDateTime } from '../utils/format';
import { Plus, Search, Filter, Receipt, Trash2, Camera, ExternalLink, ChevronDown, ChevronUp, ChevronRight, Calendar, X, Edit2, RotateCcw, Check, AlertTriangle, Trash, ArrowLeft } from 'lucide-react';
import { useBackHandler } from '../hooks/useBackHandler';

interface TransactionsModuleProps {
  state: AppState;
  isUrdu: boolean;
  onOpenQuickEntry: (type: TransactionType) => void;
  onDeleteTransaction: (id: string) => void;
  onUpdateTransaction?: (id: string, updated: Partial<Transaction>) => void;
  onRestoreTransaction?: (id: string) => void;
  onEditTransaction?: (t: Transaction) => void;
  onEmptyTrash?: () => void;
}

export const TransactionsModule: React.FC<TransactionsModuleProps> = ({
  state,
  isUrdu,
  onOpenQuickEntry,
  onDeleteTransaction,
  onUpdateTransaction,
  onRestoreTransaction,
  onEditTransaction,
  onEmptyTrash,
}) => {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [selectedReceiptUrl, setSelectedReceiptUrl] = useState<string | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  // Confirm delete & edit states
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);
  const [transactionToEdit, setTransactionToEdit] = useState<Transaction | null>(null);
  const [isTrashOpen, setIsTrashOpen] = useState(false);
  const [filterDateRange, setFilterDateRange] = useState<string>('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Edit fields states
  const [editAmount, setEditAmount] = useState(0);
  const [editCategory, setEditCategory] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editPaymentMethod, setEditPaymentMethod] = useState<any>('CASH');
  const [editPartyName, setEditPartyName] = useState('');
  const [editDate, setEditDate] = useState('');

  // Register Back Handlers
  useBackHandler(Boolean(selectedReceiptUrl), () => setSelectedReceiptUrl(null), 'TransactionReceiptViewer');
  useBackHandler(Boolean(transactionToEdit), () => setTransactionToEdit(null), 'TransactionEditModal');
  useBackHandler(Boolean(isTrashOpen), () => setIsTrashOpen(false), 'TransactionTrashBinModal');

  // Prevent background scrolling when Trash modal is active
  useEffect(() => {
    if (isTrashOpen) {
      const originalStyle = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [isTrashOpen]);

  const startEditing = (t: Transaction) => {
    setTransactionToEdit(t);
    setEditAmount(t.amount);
    setEditCategory(t.category);
    setEditNotes(t.notes || '');
    setEditPaymentMethod(t.paymentMethod);
    setEditPartyName(t.partyName || '');
    try {
      const d = new Date(t.date);
      const iso = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      setEditDate(iso);
    } catch {
      setEditDate(t.date.slice(0, 16));
    }
  };

  const saveEdit = () => {
    if (!transactionToEdit || !onUpdateTransaction) return;
    onUpdateTransaction(transactionToEdit.id, {
      amount: Number(editAmount),
      category: editCategory,
      notes: editNotes,
      paymentMethod: editPaymentMethod,
      partyName: editPartyName,
      date: new Date(editDate).toISOString(),
    });
    setTransactionToEdit(null);
  };

  const toggleGroupCollapse = (key: string) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const filtered = state.transactions.filter((t) => {
    if (filterType !== 'ALL' && t.type !== filterType) return false;

    // Date range filtering
    if (filterDateRange !== 'ALL') {
      const txDate = new Date(t.date);
      const today = new Date();

      if (filterDateRange === 'TODAY') {
        const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        if (txDate < startOfToday) return false;
      } else if (filterDateRange === 'YESTERDAY') {
        const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const startOfYesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
        if (txDate < startOfYesterday || txDate >= startOfToday) return false;
      } else if (filterDateRange === 'THIS_MONTH') {
        const startOfThisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        if (txDate < startOfThisMonth) return false;
      } else if (filterDateRange === 'LAST_MONTH') {
        const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const startOfThisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        if (txDate < startOfLastMonth || txDate >= startOfThisMonth) return false;
      } else if (filterDateRange === 'CUSTOM') {
        if (startDate) {
          const sD = new Date(startDate);
          sD.setHours(0, 0, 0, 0);
          if (txDate < sD) return false;
        }
        if (endDate) {
          const eD = new Date(endDate);
          eD.setHours(23, 59, 59, 999);
          if (txDate > eD) return false;
        }
      }
    }

    if (!search) return true;
    const q = search.toLowerCase();
    return (
      t.category.toLowerCase().includes(q) ||
      (t.partyName && t.partyName.toLowerCase().includes(q)) ||
      (t.notes && t.notes.toLowerCase().includes(q)) ||
      t.paymentMethod.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4 pb-20">
      {/* Top Header */}
      <div className="flex flex-col items-center justify-center text-center gap-3 bg-white p-4 rounded-3xl border border-slate-200/80 shadow-2xs">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center justify-center gap-2">
            <Receipt className="w-5 h-5 text-[#126A49]" />
            <span>{isUrdu ? 'روزنامچہ / لین دین (Journal Entries)' : 'Daily Journal & Transactions'}</span>
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            {isUrdu ? 'تمام فروخت، خریداری، اور دکان کے اخراجات کا ریکارڈ' : 'Complete ledger of all shop sales, purchases & expenses'}
          </p>
        </div>

        <button
          type="button"
          onClick={() => onOpenQuickEntry('SALE')}
          className={`bg-[#126A49] hover:bg-[#0e543a] text-white font-bold rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1 mx-auto ${isUrdu ? 'px-6 py-2.5 text-[13.5px]' : 'px-3.5 py-1.5 text-xs'}`}
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{isUrdu ? 'نیا اندراج' : 'New Entry'}</span>
        </button>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row items-center gap-2.5">
        <div className="relative flex-1 w-full">
          <input
            type="search"
            placeholder={isUrdu ? 'پارٹی، قسم یا تفصیل تلاش کریں...' : 'Search by party, category or note...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
              }
            }}
            className="w-full pl-3.5 pr-10 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#126A49]"
          />
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-[#126A49] transition-colors cursor-pointer"
            title={isUrdu ? 'تلاش کریں' : 'Search'}
          >
            <Search className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl w-full md:w-auto overflow-x-auto">
          {['ALL', 'SALE', 'PURCHASE', 'EXPENSE', 'RECEIPT', 'PAYMENT'].map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setFilterType(type)}
              className={`px-3 py-1.5 text-[11px] font-bold rounded-xl transition-all cursor-pointer shrink-0 ${
                filterType === type
                  ? 'bg-white text-[#126A49] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {type === 'ALL'
                ? isUrdu
                  ? 'تمام'
                  : 'All'
                : type === 'SALE'
                ? isUrdu
                  ? 'فروخت'
                  : 'Sales'
                : type === 'PURCHASE'
                ? isUrdu
                  ? 'خریداری'
                  : 'Purchases'
                : type === 'EXPENSE'
                ? isUrdu
                  ? 'اخراجات'
                  : 'Expenses'
                : type === 'RECEIPT'
                ? isUrdu
                  ? 'وصولی (آمدن)'
                  : 'Receipts'
                : type === 'PAYMENT'
                ? isUrdu
                  ? 'ادائیگی (خرچ)'
                  : 'Payments'
                : type}
            </button>
          ))}
        </div>
      </div>

      {/* Sub-controls: Date Filter, Collapse/Expand All, Trash Bin */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-slate-50 p-2.5 rounded-2xl border border-slate-200/80 text-xs font-semibold">
        {/* Date Filter Dropdown */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-slate-500 shrink-0">{isUrdu ? 'تاریخ:' : 'Date:'}</span>
          <select
            value={filterDateRange}
            onChange={(e) => setFilterDateRange(e.target.value)}
            className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#126A49]"
          >
            <option value="ALL">{isUrdu ? 'تمام وقت' : 'All Time'}</option>
            <option value="TODAY">{isUrdu ? 'آج' : 'Today'}</option>
            <option value="YESTERDAY">{isUrdu ? 'کل' : 'Yesterday'}</option>
            <option value="THIS_MONTH">{isUrdu ? 'موجودہ مہینہ' : 'This Month'}</option>
            <option value="LAST_MONTH">{isUrdu ? 'پچھلا مہینہ' : 'Last Month'}</option>
            <option value="CUSTOM">{isUrdu ? 'مخصوص تاریخ...' : 'Custom Range...'}</option>
          </select>
          {filterDateRange === 'CUSTOM' && (
            <div className="flex items-center gap-1.5 animate-in fade-in duration-150">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-white border border-slate-200 rounded-lg px-1.5 py-0.5 text-[10px] font-medium"
              />
              <span className="text-slate-400 font-medium">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-white border border-slate-200 rounded-lg px-1.5 py-0.5 text-[10px] font-medium"
              />
            </div>
          )}
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2 border-t sm:border-t-0 border-slate-100 pt-2 sm:pt-0">
          {/* Collapse/Expand All Toggle */}
          <button
            type="button"
            onClick={() => {
              const groupsMap: Record<string, boolean> = {};
              filtered.forEach((t) => {
                groupsMap[formatDate(t.date) || 'Transactions'] = true;
              });
              const keys = Object.keys(groupsMap);
              const allAlreadyCollapsed = keys.every((k) => collapsedGroups[k]);
              
              const nextCollapsed: Record<string, boolean> = {};
              if (!allAlreadyCollapsed) {
                keys.forEach((k) => {
                  nextCollapsed[k] = true;
                });
              }
              setCollapsedGroups(nextCollapsed);
            }}
            className="px-2.5 py-1 hover:bg-slate-200 text-slate-600 rounded-lg transition-all text-[11px] font-bold cursor-pointer"
          >
            {Object.keys(collapsedGroups).length > 0 ? (isUrdu ? 'سب کھولیں' : 'Expand All') : (isUrdu ? 'سب بند کریں' : 'Collapse All')}
          </button>

          {/* Trash Bin Toggle */}
          <button
            type="button"
            onClick={() => setIsTrashOpen(true)}
            className="px-2.5 py-1 bg-slate-200/80 hover:bg-slate-200 text-slate-700 rounded-lg transition-all text-[11px] font-bold flex items-center gap-1 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
            <span>{isUrdu ? 'حذف شدہ' : 'Trash'}</span>
            <span className="bg-white text-[9px] px-1.5 py-0.2 rounded-full font-black text-rose-600 border border-slate-200">
              {state.deletedTransactions?.length || 0}
            </span>
          </button>
        </div>
      </div>

      {/* Transactions List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-white border border-slate-200/80 rounded-3xl p-10 text-center space-y-2 shadow-2xs">
            <Receipt className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-xs font-bold text-slate-500">
              {isUrdu ? 'کوئی اینٹری نہیں ملی' : 'No matching transactions found.'}
            </p>
          </div>
        ) : (
          (() => {
            // Group transactions by date/month
            const groupsMap: Record<string, { groupLabel: string; items: typeof filtered }> = {};

            filtered.forEach((t) => {
              const label = formatDate(t.date) || 'Transactions';
              if (!groupsMap[label]) {
                groupsMap[label] = { groupLabel: label, items: [] };
              }
              groupsMap[label].items.push(t);
            });

            const groups = Object.values(groupsMap);

            return groups.map((group) => {
              const isCollapsed = collapsedGroups[group.groupLabel];

              return (
                <div key={group.groupLabel} className="border border-slate-200/80 rounded-2xl overflow-hidden bg-slate-50/50 shadow-2xs">
                  {/* Collapsible Date Group Header */}
                  <button
                    type="button"
                    onClick={() => toggleGroupCollapse(group.groupLabel)}
                    className="w-full bg-slate-100/90 hover:bg-slate-200/80 px-3.5 py-2.5 flex items-center justify-between text-xs font-bold text-slate-800 transition-colors cursor-pointer border-b border-slate-200/60"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {isCollapsed ? (
                        <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-[#0F8A5F] shrink-0" />
                      )}
                      <Calendar className="w-3.5 h-3.5 text-[#0F8A5F] shrink-0" />
                      <span className="font-bold text-slate-800 text-xs truncate">{group.groupLabel}</span>
                      <span className="text-[10px] bg-white text-slate-600 px-2 py-0.5 rounded-full font-semibold border border-slate-200 shrink-0">
                        {group.items.length} {isUrdu ? 'اینٹریز' : 'entries'}
                      </span>
                    </div>

                    <span className="text-[10px] font-bold text-[#0F8A5F] shrink-0">
                      {isCollapsed ? (isUrdu ? 'دیکھیں' : 'Expand') : (isUrdu ? 'بند کریں' : 'Collapse')}
                    </span>
                  </button>

                  {/* Group Content Card Items */}
                  {!isCollapsed && (
                    <div className="p-2 sm:p-3 space-y-2 bg-slate-50/30">
                      {group.items.map((t) => {
                        const isGreen = t.type === 'SALE' || t.type === 'RECEIPT';
                        const isIndigo = t.type === 'PURCHASE' || t.type === 'PAYMENT';
                        const isLoanTx = t.type === 'LOAN_TAKEN' || (t.type === 'PAYMENT' && t.category === 'LOAN_REPAYMENT');
                        const needsClassification = isLoanTx && !t.loanAccountId;

                        return (
                          <div
                            key={t.id}
                            className="p-2 sm:p-2.5 bg-white border border-slate-200/90 rounded-xl shadow-2xs space-y-1 hover:border-slate-300 transition-colors text-xs relative"
                          >
                            {transactionToDelete?.id === t.id && (
                              <div className="absolute inset-0 bg-rose-50/98 border border-rose-500 rounded-xl p-2.5 flex flex-col justify-between z-20 animate-in fade-in zoom-in-95 duration-100">
                                <div className="flex items-start gap-2">
                                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5 animate-bounce" />
                                  <div className="space-y-0.5">
                                    <h4 className="font-bold text-[11px] text-rose-800 leading-none">
                                      {isUrdu ? 'اینٹری حذف کریں؟' : 'Delete Entry?'}
                                    </h4>
                                    <p className="text-[10px] text-rose-600 font-semibold leading-tight">
                                      {isUrdu 
                                        ? 'کیا آپ واقعی اس اندراج کو حذف کرنا چاہتے ہیں؟' 
                                        : 'Are you sure you want to delete this transaction?'}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setTransactionToDelete(null);
                                    }}
                                    className="flex-1 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-extrabold text-[10px] rounded-lg cursor-pointer"
                                  >
                                    {isUrdu ? 'کینسل' : 'Cancel'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onDeleteTransaction(t.id);
                                      setTransactionToDelete(null);
                                    }}
                                    className="flex-1 py-1 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-[10px] rounded-lg cursor-pointer"
                                  >
                                    {isUrdu ? 'حذف کریں' : 'Delete'}
                                  </button>
                                </div>
                              </div>
                            )}
                            {/* Line 1: Type : Sales */}
                            <div className="flex items-center justify-between gap-1.5 flex-wrap">
                              <div className="flex items-center gap-1.5">
                                <span className={`${isUrdu ? 'w-22 sm:w-24 whitespace-nowrap' : 'w-14 sm:w-16'} text-[10px] font-bold text-slate-500 uppercase leading-none tracking-tight shrink-0`}>
                                  {isUrdu ? 'قسم' : 'Type'}
                                </span>
                                <span className="font-bold text-slate-400 text-xs shrink-0">:</span>
                                <span
                                  className={`font-black uppercase tracking-wide text-xs ${
                                    isGreen
                                      ? 'text-[#0F8A5F]'
                                      : isIndigo
                                      ? 'text-indigo-700'
                                      : 'text-rose-600'
                                  }`}
                                >
                                  {isUrdu ? (
                                    t.type === 'SALE' ? 'فروخت' :
                                    t.type === 'PURCHASE' ? 'خریداری' :
                                    t.type === 'EXPENSE' ? 'اخراجات' :
                                    t.type === 'RECEIPT' ? 'وصولی' :
                                    t.type === 'PAYMENT' ? 'ادائیگی' :
                                    t.type
                                  ) : (
                                    t.type
                                  )}
                                </span>
                              </div>
                              {needsClassification && (
                                <span className="text-[10px] bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full font-extrabold border border-rose-200">
                                  {isUrdu ? 'درجہ بندی درکار ہے' : 'Needs loan classification'}
                                </span>
                              )}
                            </div>

                            {/* Line 2: Party/Details : Muhammad Amjad Khan */}
                            <div className="flex items-start gap-1.5">
                              <span className={`${isUrdu ? 'w-22 sm:w-24 whitespace-nowrap' : 'w-14 sm:w-16 whitespace-pre-line'} text-[10px] font-bold text-slate-500 uppercase leading-tight tracking-tight shrink-0 pt-0.5`}>
                                {isUrdu ? 'پارٹی / تفصیل' : 'Party/\nDetails'}
                              </span>
                              <span className="font-bold text-slate-400 text-xs shrink-0 pt-0.5">:</span>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-bold text-xs text-slate-900">
                                    {t.partyName || t.category}
                                  </span>
                                  {t.invoiceNo && (
                                    <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-mono shrink-0">
                                      #{t.invoiceNo}
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-slate-500 font-medium break-words leading-tight">
                                  {t.notes ? t.notes : t.category}
                                </p>
                              </div>
                            </div>

                            {/* Line 3: Payment/Type : Cash */}
                            <div className="flex items-center gap-1.5">
                              <span className={`${isUrdu ? 'w-22 sm:w-24 whitespace-nowrap' : 'w-14 sm:w-16 whitespace-pre-line'} text-[10px] font-bold text-slate-500 uppercase leading-tight tracking-tight shrink-0`}>
                                {isUrdu ? 'طریقہ ادائیگی' : 'Payment/\nType'}
                              </span>
                              <span className="font-bold text-slate-400 text-xs shrink-0">:</span>
                              <span className="font-semibold text-slate-700 text-xs">
                                {isUrdu ? (
                                  t.paymentMethod === 'CASH' ? 'کیش' :
                                  t.paymentMethod === 'BANK' ? 'بینک ٹرانسفر' :
                                  t.paymentMethod === 'CREDIT' ? 'ادھار (کھاتہ)' :
                                  t.paymentMethod
                                ) : (
                                  t.paymentMethod || 'Cash'
                                )}
                              </span>
                            </div>

                            {/* Line 4: Date & Amount : 10-Aug-26 07:30 PM / Rs. 3000 */}
                            <div className="flex items-center justify-between gap-1.5 border-t border-slate-100 pt-1 mt-0.5">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className={`${isUrdu ? 'w-22 sm:w-24 whitespace-nowrap' : 'w-14 sm:w-16 whitespace-pre-line'} text-[10px] font-bold text-slate-500 uppercase leading-tight tracking-tight shrink-0`}>
                                  {isUrdu ? 'تاریخ اور رقم' : 'Date &\nAmount'}
                                </span>
                                <span className="font-bold text-slate-400 text-xs shrink-0">:</span>
                                <div className="flex items-center gap-2 flex-wrap min-w-0 text-[11px]">
                                  <span className="font-medium text-slate-500 whitespace-nowrap">
                                    {formatFullDateTime(t.date)}
                                  </span>
                                  <span
                                    className={`font-black text-xs sm:text-sm whitespace-nowrap ${
                                      isGreen
                                        ? 'text-[#0F8A5F]'
                                        : isIndigo
                                        ? 'text-indigo-700'
                                        : 'text-rose-600'
                                    }`}
                                  >
                                    {isGreen ? '+' : '-'}{formatMoney(t.amount)}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                {t.receiptImageUrl && (
                                  <button
                                    type="button"
                                    onClick={() => setSelectedReceiptUrl(t.receiptImageUrl!)}
                                    className="p-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                                    title={isUrdu ? 'رسید دیکھیں' : 'View Receipt'}
                                  >
                                    <Camera className="w-3.5 h-3.5 text-[#126A49]" />
                                  </button>
                                )}

                                {(onEditTransaction || onUpdateTransaction) && (
                                  <button
                                    type="button"
                                    onClick={() => onEditTransaction ? onEditTransaction(t) : startEditing(t)}
                                    className="p-1 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-600 transition-colors cursor-pointer"
                                    title={isUrdu ? 'تبدیل کریں' : 'Edit Entry'}
                                  >
                                    <Edit2 className="w-3.5 h-3.5 text-blue-600" />
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => setTransactionToDelete(t)}
                                  className="p-1 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors cursor-pointer"
                                  title={isUrdu ? 'حذف کریں' : 'Delete Entry'}
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                                </button>
                              </div>
                            </div>

                            {/* Needs Classification Quick Selection Dropdown */}
                            {needsClassification && (
                              <div className="mt-2.5 p-2 bg-rose-50/70 border border-rose-100 rounded-xl space-y-1.5 animate-in fade-in slide-in-from-top-1">
                                <p className="text-[10px] font-extrabold text-rose-800 uppercase tracking-wider">
                                  {isUrdu ? 'اس ٹرانزیکشن کو کسی قرضہ اکاؤنٹ سے منسلک کریں:' : 'Link to a Loan Account:'}
                                </p>
                                {state.loans.length > 0 ? (
                                  <select
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      if (val && onUpdateTransaction) {
                                        const matchedLoan = state.loans.find(l => l.id === val);
                                        onUpdateTransaction(t.id, {
                                          loanAccountId: val,
                                          partyName: matchedLoan ? matchedLoan.lenderOrBorrower : t.partyName
                                        });
                                      }
                                    }}
                                    className="w-full px-2 py-1.5 bg-white border border-rose-200 rounded-lg text-[11px] font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-rose-500"
                                    defaultValue=""
                                  >
                                    <option value="" disabled>
                                      {isUrdu ? '-- اکاؤنٹ منتخب کریں --' : '-- Select Loan Account --'}
                                    </option>
                                    {state.loans.map((l) => (
                                      <option key={l.id} value={l.id}>
                                        {l.lenderOrBorrower} ({l.classification === 'BUSINESS_LOAN' ? (isUrdu ? 'کاروباری' : 'Business') : (isUrdu ? 'ذاتی' : 'Personal')})
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <p className="text-[10px] font-semibold text-rose-600 italic">
                                    {isUrdu ? 'براہ کرم پہلے دکان و ذاتی قرضہ جات میں قرضہ اکاؤنٹ شامل کریں۔' : 'Please register a Loan Account in "Assets & Loans" tab first.'}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            });
          })()
        )}
      </div>

      {/* Receipt Image Viewer Modal */}
      {selectedReceiptUrl && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white p-4 rounded-3xl max-w-md w-full space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-sm text-slate-900">
                {isUrdu ? 'منسلکہ رسید' : 'Attached Bill Receipt'}
              </h3>
              <button
                type="button"
                onClick={() => setSelectedReceiptUrl(null)}
                className="text-xs font-bold text-slate-500 hover:text-slate-800"
              >
                {isUrdu ? 'بند کریں' : 'Close'}
              </button>
            </div>
            <img src={selectedReceiptUrl} alt="Bill" className="w-full h-64 object-cover rounded-2xl border" />
          </div>
        </div>
      )}

      {/* Trash Bin Modal - Full Screen */}
      {isTrashOpen && (
        <div className="fixed inset-0 z-50 bg-slate-50 flex flex-col h-[100dvh] w-full overflow-hidden pt-[env(safe-area-inset-top,0px)] animate-in slide-in-from-bottom duration-200">
          {/* Header */}
          <header className="bg-white border-b border-slate-200 shrink-0 px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsTrashOpen(false)}
                className="p-1.5 -ml-1 rounded-full hover:bg-slate-100 text-slate-700 cursor-pointer"
                aria-label="Back"
              >
                <ArrowLeft className="w-5 h-5 text-[#126A49]" />
              </button>
              <h2 className="font-extrabold text-slate-800 text-base">
                {isUrdu ? 'حذف شدہ اندراجات (Trash Bin)' : 'Deleted Entries (Trash Bin)'}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              {state.deletedTransactions && state.deletedTransactions.length > 0 && onEmptyTrash && (
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(isUrdu ? 'کیا آپ تمام حذف شدہ اندراجات کو مستقل طور پر صاف کرنا چاہتے ہیں؟' : 'Are you sure you want to permanently clear all deleted entries? This action cannot be undone.')) {
                      onEmptyTrash();
                    }
                  }}
                  className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-xl text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all active:scale-95 shadow-2xs shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>{isUrdu ? 'کوڑا دان خالی کریں' : 'Empty Trash'}</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsTrashOpen(false)}
                className="text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                {isUrdu ? 'بند کریں' : 'Close'}
              </button>
            </div>
          </header>

          {/* List of Deleted Transactions */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {(!state.deletedTransactions || state.deletedTransactions.length === 0) ? (
              <div className="text-center py-16 text-slate-400 space-y-2">
                <Trash className="w-12 h-12 mx-auto text-slate-200 animate-pulse" />
                <p className="text-sm font-semibold">
                  {isUrdu ? 'کوئی حذف شدہ اینٹری دستیاب نہیں' : 'No deleted entries available.'}
                </p>
              </div>
            ) : (
              state.deletedTransactions.map((dt) => (
                <div key={dt.id} className="p-4 bg-white border border-slate-200/80 rounded-2xl flex items-center justify-between gap-4 shadow-xs">
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md">
                        {isUrdu ? (
                          dt.type === 'SALE' ? 'فروخت' :
                          dt.type === 'PURCHASE' ? 'خریداری' :
                          dt.type === 'EXPENSE' ? 'اخراجات' :
                          dt.type === 'RECEIPT' ? 'وصولی' :
                          dt.type === 'PAYMENT' ? 'ادائیگی' :
                          dt.type
                        ) : (
                          dt.type
                        )}
                      </span>
                      <span className="text-sm font-extrabold text-slate-800 truncate">
                        {dt.partyName || dt.category}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium">
                      {formatShortDateTime(dt.date)} • <span className="font-bold text-slate-700">Rs. {dt.amount.toLocaleString()}</span> ({dt.paymentMethod})
                    </p>
                    {dt.notes && (
                      <p className="text-[10px] text-slate-400 font-medium line-clamp-1 italic">
                        {dt.notes}
                      </p>
                    )}
                  </div>
                  {onRestoreTransaction && (
                    <button
                      type="button"
                      onClick={() => {
                        onRestoreTransaction(dt.id);
                      }}
                      className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-[#0F8A5F] border border-emerald-200 rounded-xl text-xs font-extrabold flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>{isUrdu ? 'بحال کریں' : 'Restore'}</span>
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
