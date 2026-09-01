import React, { useState, useEffect, useMemo } from 'react';
import { AppState, CustomerParty, SupplierParty, Transaction } from '../types';
import { formatMoney, formatDate, formatTime, getApiUrl, fetchWithFailover } from '../utils/format';
import { BookOpen, UserCheck, MessageCircle, Plus, Send, Phone, Search, AlertCircle, Sparkles, Camera, RefreshCw, ChevronRight, ChevronDown, Edit2, Trash2, RotateCcw, Trash, ArrowLeft, Calendar, X, Receipt, AlertTriangle } from 'lucide-react';
import { useBackHandler } from '../hooks/useBackHandler';
import { AutoScrollText } from './AutoScrollText';

interface KhataModuleProps {
  state: AppState;
  isUrdu: boolean;
  onAddCustomer: (cust: Omit<CustomerParty, 'id'>) => void;
  onAddSupplier: (sup: Omit<SupplierParty, 'id'>) => void;
  onRecordUdhaarPayment: (type: 'RECEIPT' | 'PAYMENT', name: string, amount: number) => void;
  onDeleteCustomer?: (id: string) => void;
  onDeleteSupplier?: (id: string) => void;
  onUpdateCustomerStatus?: (id: string, status: 'ACTIVE' | 'CLOSED' | 'WRITTEN_OFF' | 'ARCHIVED') => void;
  onUpdateSupplierStatus?: (id: string, status: 'ACTIVE' | 'CLOSED' | 'ARCHIVED') => void;
  onRecordSpecialTransaction?: (type: 'BAD_DEBT' | 'SUPPLIER_WAIVER', name: string, amount: number) => void;
  onDeleteTransaction?: (id: string) => void;
  onUpdateTransaction?: (id: string, updated: Partial<Transaction>) => void;
  onRestoreTransaction?: (id: string) => void;
  onEditTransaction?: (tx: Transaction) => void;
  onEmptyTrash?: (partyName?: string) => void;
}

export const KhataModule: React.FC<KhataModuleProps> = ({
  state,
  isUrdu,
  onAddCustomer,
  onAddSupplier,
  onRecordUdhaarPayment,
  onDeleteCustomer,
  onDeleteSupplier,
  onUpdateCustomerStatus,
  onUpdateSupplierStatus,
  onRecordSpecialTransaction,
  onDeleteTransaction,
  onUpdateTransaction,
  onRestoreTransaction,
  onEditTransaction,
  onEmptyTrash,
}) => {
  const [tab, setTab] = useState<'CUSTOMERS' | 'SUPPLIERS'>('CUSTOMERS');
  const [search, setSearch] = useState('');
  const [showClosedAndArchived, setShowClosedAndArchived] = useState(false);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [newInitialBalance, setNewInitialBalance] = useState('');
  const [isScanningCard, setIsScanningCard] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  // Quick Pay Modal
  const [payModalParty, setPayModalParty] = useState<{ name: string; type: 'CUSTOMER' | 'SUPPLIER'; balance: number } | null>(null);
  const [payAmount, setPayAmount] = useState('');

  // WhatsApp Reminder Generator
  const [whatsappShareData, setWhatsappShareData] = useState<{ phone: string; message: string } | null>(null);

  // Detailed Ledger states
  const [selectedParty, setSelectedParty] = useState<{ id: string; name: string; type: 'CUSTOMER' | 'SUPPLIER' } | null>(null);
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [ledgerFilterType, setLedgerFilterType] = useState<string>('ALL');
  const [ledgerDateRange, setLedgerDateRange] = useState<string>('ALL');
  const [ledgerStartDate, setLedgerStartDate] = useState('');
  const [ledgerEndDate, setLedgerEndDate] = useState('');
  const [ledgerCollapsedGroups, setLedgerCollapsedGroups] = useState<Record<string, boolean>>({});
  const [ledgerTransactionToDelete, setLedgerTransactionToDelete] = useState<string | null>(null);
  const [isLedgerTrashOpen, setIsLedgerTrashOpen] = useState(false);

  // Register Back Handlers for Sub-Modals
  useBackHandler(showAddModal, () => setShowAddModal(false), 'KhataAddParty');
  useBackHandler(Boolean(payModalParty), () => setPayModalParty(null), 'KhataPayParty');
  useBackHandler(Boolean(whatsappShareData), () => setWhatsappShareData(null), 'KhataWhatsappShare');
  useBackHandler(Boolean(selectedParty), () => setSelectedParty(null), 'KhataPartyLedger');
  useBackHandler(Boolean(isLedgerTrashOpen), () => setIsLedgerTrashOpen(false), 'KhataLedgerTrashBin');

  // Prevent scroll background when ledger trash is active
  useEffect(() => {
    if (isLedgerTrashOpen) {
      const originalStyle = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [isLedgerTrashOpen]);

  // Compute ledger entries
  const partyTransactions = useMemo(() => {
    if (!selectedParty) return [];
    return state.transactions.filter((t) => {
      return t.partyName?.toLowerCase() === selectedParty.name.toLowerCase();
    });
  }, [state.transactions, selectedParty]);

  const filteredLedger = useMemo(() => {
    let result = partyTransactions;

    // Search filter
    if (ledgerSearch.trim()) {
      const s = ledgerSearch.toLowerCase().trim();
      result = result.filter((t) => 
        (t.category || '').toLowerCase().includes(s) ||
        (t.notes || '').toLowerCase().includes(s) ||
        t.amount.toString().includes(s) ||
        (t.paymentMethod || '').toLowerCase().includes(s)
      );
    }

    // Type filter
    if (ledgerFilterType !== 'ALL') {
      result = result.filter((t) => t.type === ledgerFilterType);
    }

    // Date range filter
    if (ledgerDateRange !== 'ALL') {
      const now = new Date();
      result = result.filter((t) => {
        const txDate = new Date(t.date);
        if (ledgerDateRange === 'TODAY') {
          return txDate.toDateString() === now.toDateString();
        }
        if (ledgerDateRange === 'YESTERDAY') {
          const yesterday = new Date();
          yesterday.setDate(now.getDate() - 1);
          return txDate.toDateString() === yesterday.toDateString();
        }
        if (ledgerDateRange === 'THIS_MONTH') {
          return txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear();
        }
        if (ledgerDateRange === 'LAST_MONTH') {
          const lastMonth = new Date();
          lastMonth.setMonth(now.getMonth() - 1);
          return txDate.getMonth() === lastMonth.getMonth() && txDate.getFullYear() === lastMonth.getFullYear();
        }
        if (ledgerDateRange === 'CUSTOM' && ledgerStartDate && ledgerEndDate) {
          const start = new Date(ledgerStartDate);
          start.setHours(0, 0, 0, 0);
          const end = new Date(ledgerEndDate);
          end.setHours(23, 59, 59, 999);
          return txDate >= start && txDate <= end;
        }
        return true;
      });
    }

    // Sort newest first
    return [...result].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [partyTransactions, ledgerSearch, ledgerFilterType, ledgerDateRange, ledgerStartDate, ledgerEndDate]);

  const partyDeletedTransactions = useMemo(() => {
    if (!selectedParty) return [];
    return (state.deletedTransactions || []).filter((t) => {
      return t.partyName?.toLowerCase() === selectedParty.name.toLowerCase();
    });
  }, [state.deletedTransactions, selectedParty]);

  const groupedLedger = useMemo(() => {
    const groupsMap: Record<string, { groupLabel: string; items: typeof filteredLedger }> = {};

    filteredLedger.forEach((t) => {
      const label = formatDate(t.date) || 'Transactions';
      if (!groupsMap[label]) {
        groupsMap[label] = { groupLabel: label, items: [] };
      }
      groupsMap[label].items.push(t);
    });

    return Object.values(groupsMap);
  }, [filteredLedger]);

  const toggleGroupCollapse = (label: string) => {
    setLedgerCollapsedGroups((prev) => ({
      ...prev,
      [label]: !prev[label],
    }));
  };

  const filteredCustomers = state.customers.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search)
  );

  const displayedCustomers = filteredCustomers.filter((c) => {
    const s = c.status || 'ACTIVE';
    if (showClosedAndArchived) return true;
    return s === 'ACTIVE' || s === 'WRITTEN_OFF';
  });

  const filteredSuppliers = state.suppliers.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) || s.phone.includes(search)
  );

  const displayedSuppliers = filteredSuppliers.filter((s) => {
    const st = s.status || 'ACTIVE';
    if (showClosedAndArchived) return true;
    return st === 'ACTIVE';
  });

  const handleCustomerStatusChange = (id: string, newStatus: 'ACTIVE' | 'CLOSED' | 'WRITTEN_OFF' | 'ARCHIVED') => {
    const c = state.customers.find((cust) => cust.id === id);
    if (!c) return;
    if (newStatus === 'CLOSED' && c.totalCredit !== 0) {
      alert(isUrdu ? "اکاؤنٹ بند کرنے کے لیے بقایا رقم کا زیرو ہونا ضروری ہے!" : "Outstanding balance must be exactly Rs. 0 to close this account.");
      return;
    }
    onUpdateCustomerStatus?.(id, newStatus);
  };

  const handleSupplierStatusChange = (id: string, newStatus: 'ACTIVE' | 'CLOSED' | 'ARCHIVED') => {
    const s = state.suppliers.find((sup) => sup.id === id);
    if (!s) return;
    if (newStatus === 'CLOSED' && s.totalPayable !== 0) {
      alert(isUrdu ? "اکاؤنٹ بند کرنے کے لیے بقایا رقم کا زیرو ہونا ضروری ہے!" : "Outstanding balance must be exactly Rs. 0 to close this account.");
      return;
    }
    onUpdateSupplierStatus?.(id, newStatus);
  };

  const handleScanCard = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanningCard(true);
    setScanError(null);

    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64String = reader.result as string;

        const response = await fetchWithFailover('/api/ai/scan-business-card', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ image: base64String }),
        });

        const data = await response.json();
        if (response.ok && data.success && data.parsed) {
          const { shopName, contactPerson, phone, address, email } = data.parsed;
          
          let combinedName = '';
          if (contactPerson && shopName) {
            combinedName = `${contactPerson} (${shopName})`;
          } else {
            combinedName = contactPerson || shopName || '';
          }

          if (combinedName) setNewName(combinedName);
          if (phone) setNewPhone(phone);
          
          let notesText = '';
          if (email) notesText += `Email: ${email}. `;
          if (address) notesText += `Address: ${address}.`;
          if (notesText) setNewNotes(notesText);
        } else {
          setScanError(data.error || (isUrdu ? 'کارڈ اسکین کرنے میں ناکامی۔ براہ کرم تصویر صاف کھینچیں۔' : 'Failed to parse business card. Please ensure the photo is clear.'));
        }
        setIsScanningCard(false);
      };
      reader.onerror = () => {
        setScanError(isUrdu ? 'تصویر پڑھنے میں خرابی۔' : 'Error reading the image file.');
        setIsScanningCard(false);
      };
    } catch (err: any) {
      console.error(err);
      setScanError(err.message || 'Error uploading card');
      setIsScanningCard(false);
    }
  };

  const handleCreateParty = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const initVal = parseFloat(newInitialBalance) || 0;

    if (tab === 'CUSTOMERS') {
      onAddCustomer({
        name: newName.trim(),
        phone: newPhone.trim() || '03000000000',
        totalCredit: initVal,
        lastTransactionDate: new Date().toISOString(),
        notes: newNotes.trim() || undefined,
      });
    } else {
      onAddSupplier({
        name: newName.trim(),
        phone: newPhone.trim() || '03000000000',
        totalPayable: initVal,
        dueDate: new Date(Date.now() + 86400000 * 7).toISOString(),
        notes: newNotes.trim() || undefined,
      });
    }

    setNewName('');
    setNewPhone('');
    setNewNotes('');
    setNewInitialBalance('');
    setScanError(null);
    setIsScanningCard(false);
    setShowAddModal(false);
  };

  const handleGenerateWhatsAppMessage = (name: string, phone: string, amount: number) => {
    const shopName = state.profile.shopName || 'Bismillah Store';
    const msg = isUrdu
      ? `السلام علیکم ${name} صاحب! ${shopName} کی طرف آپ کا بقایا ادھار Rs. ${amount.toLocaleString()} ہے۔ برائے کرم جلد ادائیگی فرمائیں۔ شکریہ!`
      : `Assalam-o-Alaikum ${name}, your outstanding balance at ${shopName} is Rs. ${amount.toLocaleString()}. Kindly clear your bill at your earliest convenience. Thank you!`;

    setWhatsappShareData({ phone, message: msg });
  };

  const handleConfirmPayModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payModalParty) return;
    const val = parseFloat(payAmount);
    if (isNaN(val) || val <= 0) return;

    if (payModalParty.type === 'CUSTOMER') {
      onRecordUdhaarPayment('RECEIPT', payModalParty.name, val);
    } else {
      onRecordUdhaarPayment('PAYMENT', payModalParty.name, val);
    }

    setPayModalParty(null);
    setPayAmount('');
  };

  if (selectedParty) {
    const isCustomer = selectedParty.type === 'CUSTOMER';
    const totalBalance = isCustomer
      ? (state.customers.find((c) => c.name.toLowerCase() === selectedParty.name.toLowerCase())?.totalCredit || 0)
      : (state.suppliers.find((s) => s.name.toLowerCase() === selectedParty.name.toLowerCase())?.totalPayable || 0);

    const partyPhone = isCustomer
      ? (state.customers.find((c) => c.name.toLowerCase() === selectedParty.name.toLowerCase())?.phone || '')
      : (state.suppliers.find((s) => s.name.toLowerCase() === selectedParty.name.toLowerCase())?.phone || '');

    const partyStatus = isCustomer
      ? (state.customers.find((c) => c.name.toLowerCase() === selectedParty.name.toLowerCase())?.status || 'ACTIVE')
      : (state.suppliers.find((s) => s.name.toLowerCase() === selectedParty.name.toLowerCase())?.status || 'ACTIVE');

    return (
      <div className="space-y-4 pb-20">
        {/* Ledger Header */}
        <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-2xs space-y-3.5">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSelectedParty(null)}
              className="p-2 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer shrink-0 border border-slate-200/40"
              title={isUrdu ? 'واپس جائیں' : 'Go Back'}
            >
              <ArrowLeft className="w-5 h-5 text-slate-700" />
            </button>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-slate-900 truncate">{selectedParty.name}</h2>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  partyStatus === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' :
                  partyStatus === 'CLOSED' ? 'bg-slate-100 text-slate-600' :
                  partyStatus === 'WRITTEN_OFF' ? 'bg-rose-100 text-rose-800' :
                  'bg-amber-100 text-amber-800'
                }`}>
                  {partyStatus}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-semibold flex items-center gap-1 mt-0.5">
                <Phone className="w-3.5 h-3.5 text-[#126A49]" />
                <span>{partyPhone}</span>
              </p>
            </div>
            <div className="text-right shrink-0">
              <span className="text-[10px] font-bold text-slate-500 block uppercase">
                {isCustomer ? (isUrdu ? 'بقایا ادھار' : 'Total Udhaar') : (isUrdu ? 'واجب الادا' : 'Total Payable')}
              </span>
              <span className={`text-base font-bold px-2.5 py-1 rounded-xl block mt-0.5 ${
                totalBalance > 0
                  ? (isCustomer ? 'bg-amber-100 text-amber-900' : 'bg-indigo-100 text-indigo-900')
                  : 'bg-slate-100 text-slate-700'
              }`}>
                {formatMoney(totalBalance)}
              </span>
            </div>
          </div>

          {/* Quick Actions inside Ledger */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              disabled={partyStatus !== 'ACTIVE'}
              onClick={() => handleGenerateWhatsAppMessage(selectedParty.name, partyPhone, totalBalance)}
              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-40 disabled:cursor-not-allowed text-[#126A49] font-bold text-xs rounded-xl flex items-center gap-1.5 border border-emerald-200 transition-colors cursor-pointer"
            >
              <MessageCircle className="w-4 h-4 text-[#126A49]" />
              <span>WhatsApp Reminder</span>
            </button>

            {isCustomer && totalBalance > 0 && partyStatus === 'ACTIVE' && (
              <button
                type="button"
                onClick={() => {
                  if (confirm(isUrdu ? `کیا آپ واقعی Rs. ${totalBalance.toLocaleString()} کا ادھار معاف/خراب قرضہ کے طور پر درج کرنا چاہتے ہیں؟ اس سے ان کا بیلنس 0 ہو جائے گا اور اسٹیٹس بدل جائے گا۔` : `Are you sure you want to write off the bad debt of Rs. ${totalBalance.toLocaleString()} for ${selectedParty.name}? This will settle their outstanding balance to 0.`)) {
                    onRecordSpecialTransaction?.('BAD_DEBT', selectedParty.name, totalBalance);
                    handleCustomerStatusChange(selectedParty.id, 'WRITTEN_OFF');
                  }
                }}
                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl border border-rose-200 transition-colors cursor-pointer"
              >
                {isUrdu ? 'معاف (Write Off)' : 'Write Off Bad Debt'}
              </button>
            )}

            {!isCustomer && totalBalance > 0 && partyStatus === 'ACTIVE' && (
              <button
                type="button"
                onClick={() => {
                  if (confirm(isUrdu ? `کیا آپ واقعی Rs. ${totalBalance.toLocaleString()} کی سپلائر معافی درج کرنا چاہتے ہیں؟ اس سے آپ کا پے ایبل بیلنس 0 ہو جائے گا۔` : `Are you sure you want to record a waiver of Rs. ${totalBalance.toLocaleString()} for supplier ${selectedParty.name}?`)) {
                    onRecordSpecialTransaction?.('SUPPLIER_WAIVER', selectedParty.name, totalBalance);
                    handleSupplierStatusChange(selectedParty.id, 'CLOSED');
                  }
                }}
                className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl border border-indigo-200 transition-colors cursor-pointer"
              >
                {isUrdu ? 'رعایت / ڈسکاؤنٹ' : 'Supplier Discount'}
              </button>
            )}

            <button
              type="button"
              disabled={partyStatus !== 'ACTIVE'}
              onClick={() =>
                setPayModalParty({
                  name: selectedParty.name,
                  type: selectedParty.type,
                  balance: totalBalance,
                })
              }
              className="px-3 py-1.5 bg-[#126A49] hover:bg-[#0e543a] disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl transition-colors cursor-pointer ml-auto"
            >
              {isCustomer ? (isUrdu ? 'وصولی کیش' : 'Collect Cash') : (isUrdu ? 'ادائیگی کریں' : 'Pay Supplier')}
            </button>
          </div>
        </div>

        {/* Ledger Filters */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2.5">
          <div className="relative flex-1">
            <input
              type="search"
              placeholder={isUrdu ? 'تفصیل، رقم، یا زمرہ تلاش کریں...' : 'Search in ledger by note, category or payment...'}
              value={ledgerSearch}
              onChange={(e) => setLedgerSearch(e.target.value)}
              className="w-full pl-3.5 pr-10 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#126A49]"
            />
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-[#126A49] transition-colors cursor-pointer"
            >
              <Search className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl overflow-x-auto shrink-0">
            {['ALL', isCustomer ? 'SALE' : 'PURCHASE', isCustomer ? 'RECEIPT' : 'PAYMENT'].map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setLedgerFilterType(type)}
                className={`px-3 py-1.5 text-[11px] font-bold rounded-xl transition-all cursor-pointer shrink-0 ${
                  ledgerFilterType === type
                    ? 'bg-white text-[#126A49] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {type === 'ALL'
                  ? (isUrdu ? 'تمام' : 'All')
                  : type === 'SALE'
                  ? (isUrdu ? 'فروخت' : 'Sales')
                  : type === 'RECEIPT'
                  ? (isUrdu ? 'وصولی' : 'Receipts')
                  : type === 'PURCHASE'
                  ? (isUrdu ? 'خریداری' : 'Purchases')
                  : (isUrdu ? 'ادائیگی' : 'Payments')}
              </button>
            ))}
          </div>
        </div>

        {/* Sub-controls: Date Filter, Collapse Toggle, Trash Bin */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-slate-50 p-2.5 rounded-2xl border border-slate-200/80 text-xs font-semibold">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-slate-500 shrink-0">{isUrdu ? 'تاریخ:' : 'Date:'}</span>
            <select
              value={ledgerDateRange}
              onChange={(e) => setLedgerDateRange(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#126A49]"
            >
              <option value="ALL">{isUrdu ? 'تمام وقت' : 'All Time'}</option>
              <option value="TODAY">{isUrdu ? 'آج' : 'Today'}</option>
              <option value="YESTERDAY">{isUrdu ? 'کل' : 'Yesterday'}</option>
              <option value="THIS_MONTH">{isUrdu ? 'موجودہ مہینہ' : 'This Month'}</option>
              <option value="LAST_MONTH">{isUrdu ? 'پچھلا مہینہ' : 'Last Month'}</option>
              <option value="CUSTOM">{isUrdu ? 'مخصوص تاریخ...' : 'Custom Range...'}</option>
            </select>
            {ledgerDateRange === 'CUSTOM' && (
              <div className="flex items-center gap-1.5 animate-in fade-in duration-150">
                <input
                  type="date"
                  value={ledgerStartDate}
                  onChange={(e) => setLedgerStartDate(e.target.value)}
                  className="bg-white border border-slate-200 rounded-lg px-1.5 py-0.5 text-[10px] font-medium"
                />
                <span className="text-slate-400 font-medium">to</span>
                <input
                  type="date"
                  value={ledgerEndDate}
                  onChange={(e) => setLedgerEndDate(e.target.value)}
                  className="bg-white border border-slate-200 rounded-lg px-1.5 py-0.5 text-[10px] font-medium"
                />
              </div>
            )}
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2 border-t sm:border-t-0 border-slate-100 pt-2 sm:pt-0">
            <button
              type="button"
              onClick={() => {
                const groupsMap: Record<string, boolean> = {};
                filteredLedger.forEach((t) => {
                  groupsMap[formatDate(t.date) || 'Transactions'] = true;
                });
                const keys = Object.keys(groupsMap);
                const allAlreadyCollapsed = keys.every((k) => ledgerCollapsedGroups[k]);
                
                const nextCollapsed: Record<string, boolean> = {};
                if (!allAlreadyCollapsed) {
                  keys.forEach((k) => {
                    nextCollapsed[k] = true;
                  });
                }
                setLedgerCollapsedGroups(nextCollapsed);
              }}
              className="px-2.5 py-1 hover:bg-slate-200 text-slate-600 rounded-lg transition-all text-[11px] font-bold cursor-pointer"
            >
              {Object.keys(ledgerCollapsedGroups).length > 0 ? (isUrdu ? 'سب کھولیں' : 'Expand All') : (isUrdu ? 'سب بند کریں' : 'Collapse All')}
            </button>

            <button
              type="button"
              onClick={() => setIsLedgerTrashOpen(true)}
              className="px-2.5 py-1 bg-slate-200/80 hover:bg-slate-200 text-slate-700 rounded-lg transition-all text-[11px] font-bold flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span>{isUrdu ? 'حذف شدہ' : 'Trash'}</span>
              <span className="bg-white text-[9px] px-1.5 py-0.2 rounded-full font-black text-rose-600 border border-slate-200">
                {partyDeletedTransactions.length}
              </span>
            </button>
          </div>
        </div>

        {/* Ledger entries lists */}
        <div className="space-y-3">
          {filteredLedger.length === 0 ? (
            <div className="bg-white border border-slate-200/80 rounded-3xl p-10 text-center space-y-2 shadow-2xs">
              <Receipt className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-xs font-bold text-slate-500">
                {isUrdu ? 'کوئی اینٹری نہیں ملی' : 'No matching entries found.'}
              </p>
            </div>
          ) : (
            groupedLedger.map((group) => {
              const isCollapsed = ledgerCollapsedGroups[group.groupLabel];

              return (
                <div key={group.groupLabel} className="border border-slate-200/80 rounded-2xl overflow-hidden bg-slate-50/50 shadow-2xs">
                  {/* Collapsible Date Header */}
                  <button
                    type="button"
                    onClick={() => toggleGroupCollapse(group.groupLabel)}
                    className="w-full bg-slate-100/90 hover:bg-slate-200/80 px-3.5 py-2.5 flex items-center justify-between text-xs font-bold text-slate-800 transition-colors cursor-pointer border-b border-slate-200/60"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {isCollapsed ? (
                        <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />
                      )}
                      <span className="truncate">{group.groupLabel}</span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                      {group.items.length} {isUrdu ? 'اندراجات' : 'entries'}
                    </span>
                  </button>

                  {!isCollapsed && (
                    <div className="divide-y divide-slate-100 bg-white">
                      {group.items.map((t) => {
                        const isReduction = t.type === 'RECEIPT' || t.type === 'PAYMENT' || t.category === 'SUPPLIER_WAIVER';
                        const showDeleteWarning = ledgerTransactionToDelete === t.id;

                        return (
                          <div key={t.id} className="p-4 relative hover:bg-slate-50/40 transition-colors">
                            {/* Inner deletion overlay */}
                            {showDeleteWarning && (
                              <div className="absolute inset-0 bg-rose-500/95 backdrop-blur-xs z-20 flex flex-col items-center justify-center p-3 animate-in fade-in zoom-in-95 duration-150">
                                <AlertTriangle className="w-5 h-5 text-white animate-bounce mb-1" />
                                <p className="text-white text-[11px] font-bold text-center">
                                  {isUrdu
                                    ? 'کیا آپ واقعی اس اینٹری کو حذف کرنا چاہتے ہیں؟ کھاتہ کا بیلنس اپ ڈیٹ ہو جائے گا۔'
                                    : 'Are you sure you want to delete this ledger entry? Outstanding balances will be updated.'}
                                </p>
                                <div className="flex items-center gap-3 mt-3 w-full max-w-xs">
                                  <button
                                    type="button"
                                    onClick={() => setLedgerTransactionToDelete(null)}
                                    className="flex-1 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg font-bold text-[10px] cursor-pointer transition-colors"
                                  >
                                    {isUrdu ? 'منسوخ' : 'Cancel'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onDeleteTransaction?.(t.id);
                                      setLedgerTransactionToDelete(null);
                                    }}
                                    className="flex-1 py-1.5 bg-white text-rose-700 hover:bg-rose-50 rounded-lg font-bold text-[10px] shadow-sm cursor-pointer transition-colors"
                                  >
                                    {isUrdu ? 'حذف کریں' : 'Delete'}
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Standard entry row */}
                            <div className="flex items-start justify-between gap-3">
                              <div className="space-y-1 min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase shrink-0 ${
                                    t.type === 'SALE' ? 'bg-amber-100 text-amber-900' :
                                    t.type === 'PURCHASE' ? 'bg-indigo-100 text-indigo-900' :
                                    t.type === 'RECEIPT' ? 'bg-emerald-100 text-emerald-900' :
                                    t.type === 'PAYMENT' ? 'bg-purple-100 text-purple-900' :
                                    'bg-rose-100 text-rose-900'
                                  }`}>
                                    {isUrdu
                                      ? t.type === 'SALE' ? 'ادھار فروخت' : t.type === 'RECEIPT' ? 'وصولی' : t.type === 'PURCHASE' ? 'ادھار خریداری' : t.type === 'PAYMENT' ? 'ادائیگی' : t.type
                                      : t.type}
                                  </span>
                                  <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-md font-medium shrink-0">
                                    {t.paymentMethod}
                                  </span>
                                  {t.category && (
                                    <span className="text-[10px] text-slate-500 font-semibold truncate max-w-[120px]">
                                      • {t.category}
                                    </span>
                                  )}
                                  <span className="text-[9px] text-slate-400 font-medium">
                                    {formatTime(t.date)}
                                  </span>
                                </div>

                                {t.notes && (
                                  <p className="text-[11px] text-slate-700 leading-relaxed font-medium bg-slate-50 p-2 rounded-xl border border-slate-100 mt-1.5">
                                    {t.notes}
                                  </p>
                                )}
                              </div>

                              <div className="flex flex-col items-end gap-1.5 shrink-0">
                                <span className={`text-sm font-bold ${
                                  isReduction ? 'text-emerald-700' : 'text-slate-900'
                                }`}>
                                  {isReduction ? '-' : '+'} {formatMoney(t.amount)}
                                </span>

                                {/* Quick Controls for Transaction */}
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => onEditTransaction?.(t)}
                                    className="p-1 hover:bg-slate-100 text-slate-500 hover:text-[#126A49] rounded-lg transition-colors cursor-pointer"
                                    title={isUrdu ? 'ترمیم کریں' : 'Edit'}
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setLedgerTransactionToDelete(t.id)}
                                    className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                                    title={isUrdu ? 'حذف کریں' : 'Delete'}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Local Trash Bin overlay */}
        {isLedgerTrashOpen && (
          <div className="fixed inset-0 z-50 overflow-hidden flex justify-end animate-in fade-in duration-200">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
              onClick={() => setIsLedgerTrashOpen(false)}
            />

            {/* Sidebar content */}
            <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-250">
              {/* Header */}
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-2">
                  <Trash className="w-4 h-4 text-rose-600" />
                  <h3 className="font-bold text-sm text-slate-900">
                    {isUrdu ? `${selectedParty.name} کا کوڑا دان` : `${selectedParty.name} Trash Bin`}
                  </h3>
                </div>
                <div className="flex items-center gap-1.5">
                  {partyDeletedTransactions.length > 0 && onEmptyTrash && (
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(isUrdu ? `کیا آپ ${selectedParty.name} کی تمام حذف شدہ اینٹریز کو مستقل صاف کرنا چاہتے ہیں؟` : `Are you sure you want to permanently clear all deleted entries for ${selectedParty.name}? This action cannot be undone.`)) {
                          onEmptyTrash(selectedParty.name);
                          setIsLedgerTrashOpen(false);
                        }
                      }}
                      className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-xl text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all active:scale-95 shadow-2xs shrink-0"
                    >
                      <Trash className="w-3.5 h-3.5 text-rose-600" />
                      <span>{isUrdu ? 'خالی کریں' : 'Empty Trash'}</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsLedgerTrashOpen(false)}
                    className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Scrollable list of deleted items */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {partyDeletedTransactions.length === 0 ? (
                  <div className="text-center py-12 space-y-2">
                    <Trash className="w-10 h-10 text-slate-300 mx-auto" />
                    <p className="text-xs text-slate-400 font-semibold">
                      {isUrdu ? 'کوئی حذف شدہ اینٹری نہیں ملی' : 'Your deleted items ledger is clean.'}
                    </p>
                  </div>
                ) : (
                  partyDeletedTransactions.map((t) => (
                    <div key={t.id} className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/50 space-y-2 flex flex-col justify-between">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[9px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-bold uppercase">
                              {t.type}
                            </span>
                            <span className="text-[10px] text-slate-500 font-semibold">
                              {formatDate(t.date)}
                            </span>
                          </div>
                          {t.notes && (
                            <p className="text-[11px] text-slate-600 italic mt-1 bg-white p-1.5 rounded-lg border border-slate-100">"{t.notes}"</p>
                          )}
                        </div>
                        <span className="text-xs font-bold text-rose-600 shrink-0">
                          {formatMoney(t.amount)}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          onRestoreTransaction?.(t.id);
                          setIsLedgerTrashOpen(false);
                        }}
                        className="w-full py-1.5 bg-emerald-50 hover:bg-emerald-100 text-[#126A49] font-bold text-[10px] rounded-xl border border-emerald-200 flex items-center justify-center gap-1 cursor-pointer transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>{isUrdu ? 'اینٹری بحال کریں' : 'Restore Entry'}</span>
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-3xl border border-slate-200/80 shadow-2xs">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 min-w-0">
            <BookOpen className="w-5 h-5 text-[#126A49] shrink-0" />
            <AutoScrollText
              isUrdu={isUrdu}
              containerClassName="flex-1 min-w-0"
              className="text-base sm:text-lg font-bold text-slate-900"
            >
              {isUrdu ? 'صارفین اور سپلائرز کھاتہ بک' : 'Customer & Supplier Khata Book'}
            </AutoScrollText>
          </div>
          <AutoScrollText
            isUrdu={isUrdu}
            containerClassName="max-w-full mt-0.5"
            className="text-xs text-slate-500 font-medium"
          >
            {isUrdu ? 'ادھار وصولی، سپلائر واجبات اور واٹس ایپ ریمائنڈر' : 'Track credit balances & send 1-click WhatsApp payment reminders.'}
          </AutoScrollText>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className={`py-2 bg-gradient-to-r from-emerald-800 to-[#126A49] hover:from-emerald-700 hover:to-[#0f5338] text-white border border-emerald-600/30 font-bold rounded-xl shadow-xs hover:shadow-md transition-all cursor-pointer flex items-center gap-1.5 self-center sm:self-auto min-w-0 overflow-hidden ${isUrdu ? 'px-5 text-[13px]' : 'px-3.5 text-xs'}`}
        >
          <Plus className="w-4 h-4 shrink-0" />
          <AutoScrollText isUrdu={isUrdu} containerClassName="max-w-full">
            {tab === 'CUSTOMERS'
              ? isUrdu
                ? 'نیا گاہک شامل کریں'
                : 'Add Customer'
              : isUrdu
              ? 'نیا سپلائر شامل کریں'
              : 'Add Supplier'}
          </AutoScrollText>
        </button>
      </div>

      {/* Tabs with left align and uniform space */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 justify-start w-full overflow-x-auto">
        <button
          type="button"
          onClick={() => setTab('CUSTOMERS')}
          className={`font-bold rounded-full transition-all cursor-pointer flex-1 sm:flex-initial text-center justify-center flex items-center min-w-0 overflow-hidden ${
            isUrdu ? 'px-5 py-2 text-[13px]' : 'px-3 py-1.5 text-[11px]'
          } ${
            tab === 'CUSTOMERS'
              ? 'bg-[#126A49] text-white border border-[#126A49] shadow-xs'
              : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
          }`}
        >
          <AutoScrollText isUrdu={isUrdu} containerClassName="max-w-full">
            {isUrdu ? 'گاہکوں کا ادھار لیجر' : 'Customer Udhaar Ledger'}
          </AutoScrollText>
        </button>

        <button
          type="button"
          onClick={() => setTab('SUPPLIERS')}
          className={`font-bold rounded-full transition-all cursor-pointer flex-1 sm:flex-initial text-center justify-center flex items-center min-w-0 overflow-hidden ${
            isUrdu ? 'px-5 py-2 text-[13px]' : 'px-3 py-1.5 text-[11px]'
          } ${
            tab === 'SUPPLIERS'
              ? 'bg-[#126A49] text-white border border-[#126A49] shadow-xs'
              : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
          }`}
        >
          <AutoScrollText isUrdu={isUrdu} containerClassName="max-w-full">
            {isUrdu ? 'سپلائرز کا واجب الادا لیجر' : 'Supplier Payables Ledger'}
          </AutoScrollText>
        </button>
      </div>

      {/* Search Input */}
      <div className="relative">
        <input
          type="search"
          placeholder={
            tab === 'CUSTOMERS'
              ? isUrdu
                ? 'گاہک کا نام یا فون نمبر...'
                : 'Search customer by name or phone...'
              : isUrdu
              ? 'سپلائر کا نام یا فون نمبر...'
              : 'Search supplier by name or phone...'
          }
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

      {/* Show closed/archived toggle */}
      <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-2xl border border-slate-200/60">
        <span className="text-xs font-bold text-slate-700">
          {isUrdu ? 'بند شدہ اور آرکائیو کھاتے دکھائیں:' : 'Show Closed & Archived Accounts:'}
        </span>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={showClosedAndArchived}
            onChange={(e) => setShowClosedAndArchived(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
        </label>
      </div>

      {/* Customers Tab Content */}
      {tab === 'CUSTOMERS' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {displayedCustomers.map((c) => (
            <div
              key={c.id}
              onClick={() => setSelectedParty({ id: c.id, name: c.name, type: 'CUSTOMER' })}
              className="bg-white border border-slate-200/80 p-4 rounded-3xl shadow-2xs space-y-3 flex flex-col justify-between hover:border-slate-300 hover:shadow-xs transition-all cursor-pointer group"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-bold text-sm text-slate-900 group-hover:text-[#126A49] transition-colors">{c.name}</h3>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                        (c.status || 'ACTIVE') === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' :
                        (c.status || 'ACTIVE') === 'CLOSED' ? 'bg-slate-100 text-slate-600' :
                        (c.status || 'ACTIVE') === 'WRITTEN_OFF' ? 'bg-rose-100 text-rose-800' :
                        'bg-amber-100 text-amber-800'
                      }`}>
                        {c.status || 'ACTIVE'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-semibold flex items-center gap-1 mt-0.5">
                      <Phone className="w-3 h-3 text-[#126A49]" />
                      <span>{c.phone}</span>
                    </p>
                  </div>
                  <span className="px-2.5 py-1 bg-amber-100 text-amber-900 text-xs font-bold rounded-xl shrink-0">
                    {formatMoney(c.totalCredit)}
                  </span>
                </div>

                {c.notes && (
                  <p className="text-[11px] text-slate-500 italic mt-2">"{c.notes}"</p>
                )}
                <p className="text-[10px] text-slate-400 font-medium mt-1">
                  {isUrdu ? 'آخری لین دین:' : 'Last activity:'} {formatDate(c.lastTransactionDate)}
                </p>

                {/* Status select dropdown & Profile Delete option */}
                <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <span className="text-[10px] font-bold text-slate-500">{isUrdu ? 'حیثیت:' : 'Status:'}</span>
                    <select
                      value={c.status || 'ACTIVE'}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleCustomerStatusChange(c.id, e.target.value as any);
                      }}
                      className="text-[10px] font-bold bg-slate-100 border border-slate-200 rounded-lg px-2 py-0.5 text-slate-700 focus:outline-none"
                    >
                      <option value="ACTIVE">{isUrdu ? 'فعال' : 'Active'}</option>
                      <option value="CLOSED">{isUrdu ? 'بند' : 'Closed'}</option>
                      <option value="WRITTEN_OFF">{isUrdu ? 'معاف شدہ' : 'Written Off'}</option>
                      <option value="ARCHIVED">{isUrdu ? 'آرکائیو' : 'Archived'}</option>
                    </select>
                  </div>

                  {c.status && c.status !== 'ACTIVE' && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(isUrdu ? `کیا آپ واقعی ${c.name} کا پروفائل حذف کرنا چاہتے ہیں؟ اس سے ان کا اکاؤنٹ حذف ہو جائے گا لیکن لین دین کی تاریخ محفوظ رہے گی۔` : `Are you sure you want to delete the profile of ${c.name}? This removes the profile, but historical transactions remain in log.`)) {
                          onDeleteCustomer?.(c.id);
                        }
                      }}
                      className="text-[10px] font-bold text-rose-600 hover:underline"
                    >
                      {isUrdu ? 'پروفائل حذف کریں' : 'Delete Profile'}
                    </button>
                  )}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    disabled={(c.status || 'ACTIVE') !== 'ACTIVE'}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleGenerateWhatsAppMessage(c.name, c.phone, c.totalCredit);
                    }}
                    className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-40 disabled:cursor-not-allowed text-[#126A49] font-bold text-xs rounded-xl flex items-center gap-1 border border-emerald-200 transition-colors cursor-pointer"
                  >
                    <MessageCircle className="w-3.5 h-3.5 text-[#126A49]" />
                    <span>WhatsApp</span>
                  </button>

                  {c.totalCredit > 0 && (c.status || 'ACTIVE') === 'ACTIVE' && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const amount = c.totalCredit;
                        if (confirm(isUrdu ? `کیا آپ واقعی Rs. ${amount.toLocaleString()} کا ادھار معاف/خراب قرضہ کے طور پر درج کرنا چاہتے ہیں؟ اس سے ان کا بیلنس 0 ہو جائے گا اور اسٹیٹس بدل جائے گا۔` : `Are you sure you want to write off the bad debt of Rs. ${amount.toLocaleString()} for ${c.name}? This will settle their outstanding balance to 0.`)) {
                          onRecordSpecialTransaction?.('BAD_DEBT', c.name, amount);
                          handleCustomerStatusChange(c.id, 'WRITTEN_OFF');
                        }
                      }}
                      className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[10px] rounded-xl border border-rose-200 transition-colors cursor-pointer"
                    >
                      {isUrdu ? 'معاف (Write Off)' : 'Write Off'}
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  disabled={(c.status || 'ACTIVE') !== 'ACTIVE'}
                  onClick={(e) => {
                    e.stopPropagation();
                    setPayModalParty({
                      name: c.name,
                      type: 'CUSTOMER',
                      balance: c.totalCredit,
                    });
                  }}
                  className="px-3 py-1.5 bg-[#126A49] hover:bg-[#0e543a] disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  {isUrdu ? 'وصولی کیش' : 'Collect Cash'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Suppliers Tab Content */}
      {tab === 'SUPPLIERS' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {displayedSuppliers.map((s) => (
            <div
              key={s.id}
              onClick={() => setSelectedParty({ id: s.id, name: s.name, type: 'SUPPLIER' })}
              className="bg-white border border-slate-200/80 p-4 rounded-3xl shadow-2xs space-y-3 flex flex-col justify-between hover:border-slate-300 hover:shadow-xs transition-all cursor-pointer group"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-bold text-sm text-slate-900 group-hover:text-[#126A49] transition-colors">{s.name}</h3>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                        (s.status || 'ACTIVE') === 'ACTIVE' ? 'bg-[#126A49]/10 text-[#126A49]' :
                        (s.status || 'ACTIVE') === 'CLOSED' ? 'bg-slate-100 text-slate-600' :
                        'bg-amber-100 text-amber-800'
                      }`}>
                        {s.status || 'ACTIVE'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-semibold flex items-center gap-1 mt-0.5">
                      <Phone className="w-3 h-3 text-indigo-600" />
                      <span>{s.phone}</span>
                    </p>
                  </div>
                  <span className="px-2.5 py-1 bg-indigo-100 text-indigo-900 text-xs font-bold rounded-xl shrink-0">
                    {formatMoney(s.totalPayable)}
                  </span>
                </div>

                {s.dueDate && (
                  <p className="text-[11px] text-amber-700 font-semibold mt-2 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 text-amber-600" />
                    <span>
                      {isUrdu ? 'آخری تاریخ:' : 'Due Date:'} {formatDate(s.dueDate)}
                    </span>
                  </p>
                )}

                {/* Status select dropdown & Profile Delete option */}
                <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <span className="text-[10px] font-bold text-slate-500">{isUrdu ? 'حیثیت:' : 'Status:'}</span>
                    <select
                      value={s.status || 'ACTIVE'}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleSupplierStatusChange(s.id, e.target.value as any);
                      }}
                      className="text-[10px] font-bold bg-slate-100 border border-slate-200 rounded-lg px-2 py-0.5 text-slate-700 focus:outline-none"
                    >
                      <option value="ACTIVE">{isUrdu ? 'فعال' : 'Active'}</option>
                      <option value="CLOSED">{isUrdu ? 'بند' : 'Closed'}</option>
                      <option value="ARCHIVED">{isUrdu ? 'آرکائیو' : 'Archived'}</option>
                    </select>
                  </div>

                  {s.status && s.status !== 'ACTIVE' && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(isUrdu ? `کیا آپ واقعی ${s.name} کا پروفائل حذف کرنا چاہتے ہیں؟ اس سے ان کا اکاؤنٹ حذف ہو جائے گا لیکن لین دین کی تاریخ محفوظ رہے گی۔` : `Are you sure you want to delete the profile of ${s.name}? This removes the profile, but historical transactions remain in log.`)) {
                          onDeleteSupplier?.(s.id);
                        }
                      }}
                      className="text-[10px] font-bold text-rose-600 hover:underline"
                    >
                      {isUrdu ? 'پروفائل حذف کریں' : 'Delete Profile'}
                    </button>
                  )}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    disabled={(s.status || 'ACTIVE') !== 'ACTIVE'}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleGenerateWhatsAppMessage(s.name, s.phone, s.totalPayable);
                    }}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Message</span>
                  </button>

                  {s.totalPayable > 0 && (s.status || 'ACTIVE') === 'ACTIVE' && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const amount = s.totalPayable;
                        if (confirm(isUrdu ? `کیا آپ واقعی سپلائر ${s.name} کی طرف سے Rs. ${amount.toLocaleString()} کا قرضہ معافی کے طور پر درج کرنا چاہتے ہیں؟ اس سے بقایا رقم 0 ہو جائے گی۔` : `Are you sure you want to record a waiver of Rs. ${amount.toLocaleString()} from ${s.name}? This will settle your outstanding payable balance to 0.`)) {
                          onRecordSpecialTransaction?.('SUPPLIER_WAIVER', s.name, amount);
                        }
                      }}
                      className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[10px] rounded-xl border border-indigo-200 transition-colors cursor-pointer"
                    >
                      {isUrdu ? 'معافی (Waiver)' : 'Waiver'}
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  disabled={(s.status || 'ACTIVE') !== 'ACTIVE'}
                  onClick={(e) => {
                    e.stopPropagation();
                    setPayModalParty({
                      name: s.name,
                      type: 'SUPPLIER',
                      balance: s.totalPayable,
                    });
                  }}
                  className="px-3 py-1.5 bg-[#126A49] hover:bg-[#0e543a] disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  {isUrdu ? 'ادائیگی کریں' : 'Pay Bill'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add New Customer / Supplier Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-3xl max-w-md w-full space-y-4 shadow-2xl border border-slate-100">
            <h3 className="font-bold text-base text-slate-900">
              {tab === 'CUSTOMERS'
                ? isUrdu
                  ? 'نیا گاہک کھاتہ'
                  : 'New Customer Khata'
                : isUrdu
                ? 'نیا سپلائر اینٹری'
                : 'New Supplier Khata'}
            </h3>

            {tab === 'SUPPLIERS' && (
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/60 space-y-2">
                {isScanningCard ? (
                  <div className="flex flex-col items-center justify-center py-5 text-center">
                    <RefreshCw className="w-6 h-6 text-[#126A49] animate-spin mb-2" />
                    <span className="text-xs font-bold text-[#126A49]">
                      {isUrdu ? 'اے آئی کارڈ اسکین کر رہا ہے...' : 'AI reading visiting card...'}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium mt-0.5">
                      {isUrdu ? 'براہ مہربانی انتظار کریں' : 'Please wait while processing'}
                    </span>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center p-3.5 bg-emerald-50/40 hover:bg-emerald-50 border border-dashed border-emerald-300 rounded-2xl cursor-pointer transition-all active:scale-[0.985] text-center group">
                    <div className="p-2.5 bg-emerald-100/70 text-[#126A49] rounded-full relative">
                      <Camera className="w-5 h-5" />
                      <Sparkles className="w-3.5 h-3.5 text-amber-500 absolute -top-1 -right-1 animate-pulse" />
                    </div>
                    <span className="mt-2 text-xs font-bold text-slate-800">
                      {isUrdu ? 'اے آئی وزٹنگ کارڈ اسکینر (AI Scan)' : 'AI Visiting Card Scanner'}
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium mt-0.5">
                      {isUrdu ? 'کارڈ کی تصویر لیں یا گیلری سے منتخب کریں' : 'Snap a picture of the card or choose file'}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleScanCard}
                      className="hidden"
                    />
                  </label>
                )}

                {scanError && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 font-bold text-[10px] rounded-xl flex items-center gap-1.5 animate-in fade-in">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{scanError}</span>
                  </div>
                )}
              </div>
            )}

            <form onSubmit={handleCreateParty} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isUrdu ? 'نام:' : 'Full Name:'}
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Haji Saleem"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#126A49]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isUrdu ? 'موبائل نمبر:' : 'Mobile Number:'}
                </label>
                <input
                  type="text"
                  placeholder="03001234567"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#126A49]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {tab === 'CUSTOMERS'
                    ? isUrdu
                      ? 'ابتدائی ادھار (اگر پہلے سے ہے):'
                      : 'Initial Credit Balance (Rs.):'
                    : isUrdu
                    ? 'ابتدائی واجبات:'
                    : 'Initial Payable Amount (Rs.):'}
                </label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={newInitialBalance}
                  onChange={(e) => setNewInitialBalance(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#126A49]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isUrdu ? 'نوٹ:' : 'Notes:'}
                </label>
                <input
                  type="text"
                  placeholder="e.g. Neighborhood account"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#126A49]"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setNewName('');
                    setNewPhone('');
                    setNewNotes('');
                    setNewInitialBalance('');
                    setScanError(null);
                    setIsScanningCard(false);
                    setShowAddModal(false);
                  }}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                >
                  {isUrdu ? 'منسوخ' : 'Cancel'}
                </button>

                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#126A49] hover:bg-[#0e543a] text-white font-bold text-xs rounded-xl cursor-pointer"
                >
                  {isUrdu ? 'حفظ کریں' : 'Save Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pay / Collect Modal */}
      {payModalParty && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-3xl max-w-sm w-full space-y-4 shadow-2xl border border-slate-100">
            <h3 className="font-bold text-base text-slate-900">
              {payModalParty.type === 'CUSTOMER'
                ? isUrdu
                  ? `${payModalParty.name} سے ادھار وصولی`
                  : `Collect Udhaar from ${payModalParty.name}`
                : isUrdu
                ? `${payModalParty.name} کو بل ادائیگی`
                : `Pay Bill to ${payModalParty.name}`}
            </h3>

            <p className="text-xs font-bold text-slate-600">
              {isUrdu ? 'موجودہ بقایا رقم:' : 'Current Outstanding Balance:'}{' '}
              <span className="text-[#126A49] font-bold">{formatMoney(payModalParty.balance)}</span>
            </p>

            <form onSubmit={handleConfirmPayModal} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isUrdu ? 'رقم وصول/ادائی:' : 'Amount Paid/Collected (Rs.):'}
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  placeholder="0.00"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base font-bold focus:outline-none focus:ring-2 focus:ring-[#126A49]"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPayModalParty(null)}
                  className="flex-1 py-2.5 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                >
                  {isUrdu ? 'منسوخ' : 'Cancel'}
                </button>

                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#126A49] text-white font-bold text-xs rounded-xl cursor-pointer"
                >
                  {isUrdu ? 'کنفرم کریں' : 'Confirm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* WhatsApp Message Share Dialog */}
      {whatsappShareData && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-3xl max-w-md w-full space-y-4 shadow-2xl border border-slate-100">
            <div className="flex items-center gap-2 text-emerald-700">
              <MessageCircle className="w-5 h-5" />
              <h3 className="font-bold text-base">
                {isUrdu ? 'واٹس ایپ ریمائنڈر میسج' : 'WhatsApp Payment Reminder'}
              </h3>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-800 whitespace-pre-wrap">
              {whatsappShareData.message}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setWhatsappShareData(null)}
                className="flex-1 py-2.5 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                {isUrdu ? 'بند کریں' : 'Close'}
              </button>

              <a
                href={`https://wa.me/${whatsappShareData.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                  whatsappShareData.message
                )}`}
                target="_blank"
                rel="_noreferrer"
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>{isUrdu ? 'واٹس ایپ بھیجیں' : 'Open WhatsApp'}</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
