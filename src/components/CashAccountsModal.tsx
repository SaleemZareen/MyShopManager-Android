import React, { useState } from 'react';
import { AppState, BankAccount, Transaction, PaymentMethod } from '../types';
import { 
  X, 
  ArrowRightLeft, 
  Wallet, 
  Landmark, 
  Smartphone, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  PencilLine, 
  ArrowLeft,
  PlusCircle,
  MinusCircle,
  Calendar,
  User,
  Tag,
  History,
  ArrowDownCircle,
  ArrowUpCircle,
  Plus
} from 'lucide-react';
import { formatMoney } from '../utils/format';

interface CashAccountsModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: AppState;
  onUpdateBankAccounts: (updated: BankAccount[]) => void;
  onAddTransaction: (tx: Omit<Transaction, 'id'>) => void;
  isUrdu: boolean;
}

export const CashAccountsModal: React.FC<CashAccountsModalProps> = ({
  isOpen,
  onClose,
  state,
  onUpdateBankAccounts,
  onAddTransaction,
  isUrdu,
}) => {
  const [activeTab, setActiveTab] = useState<'VIEW' | 'ENTRY' | 'TRANSFER' | 'ADJUST'>('VIEW');
  
  // Transfer State
  const [fromAccountId, setFromAccountId] = useState<string>('acc_cash');
  const [toAccountId, setToAccountId] = useState<string>('acc_meezan');
  const [transferAmount, setTransferAmount] = useState<string>('');
  const [transferNotes, setTransferNotes] = useState<string>('');
  
  // Adjustment State
  const [selectedAdjAccountId, setSelectedAdjAccountId] = useState<string>('acc_cash');
  const [newBalance, setNewBalance] = useState<string>('');
  const [adjNotes, setAdjNotes] = useState<string>('');

  // Direct Entry State
  const [entryAccountId, setEntryAccountId] = useState<string>('acc_cash');
  const [entryType, setEntryType] = useState<'RECEIPT' | 'PAYMENT'>('RECEIPT');
  const [entryAmount, setEntryAmount] = useState<string>('');
  const [entryDate, setEntryDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [entryCategory, setEntryCategory] = useState<string>('Capital Contribution');
  const [entryPartyName, setEntryPartyName] = useState<string>('');
  const [entryNotes, setEntryNotes] = useState<string>('');
  
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const getAccountIcon = (type: 'CASH' | 'BANK' | 'WALLET') => {
    switch (type) {
      case 'CASH':
        return <Wallet className="w-5 h-5 text-emerald-600" />;
      case 'BANK':
        return <Landmark className="w-5 h-5 text-blue-600" />;
      case 'WALLET':
        return <Smartphone className="w-5 h-5 text-purple-600" />;
    }
  };

  const getAccountBg = (type: 'CASH' | 'BANK' | 'WALLET') => {
    switch (type) {
      case 'CASH':
        return 'bg-emerald-50 border-emerald-100';
      case 'BANK':
        return 'bg-blue-50 border-blue-100';
      case 'WALLET':
        return 'bg-purple-50 border-purple-100';
    }
  };

  const handleTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const amountNum = parseFloat(transferAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setErrorMessage(isUrdu ? 'برائے مہربانی درست رقم درج کریں' : 'Please enter a valid transfer amount');
      return;
    }

    if (fromAccountId === toAccountId) {
      setErrorMessage(isUrdu ? 'ارسال کنندہ اور وصول کنندہ اکاؤنٹ ایک نہیں ہو سکتے' : 'Sender and receiver accounts cannot be the same');
      return;
    }

    const fromAcc = state.bankAccounts.find((a) => a.id === fromAccountId);
    const toAcc = state.bankAccounts.find((a) => a.id === toAccountId);

    if (!fromAcc || !toAcc) {
      setErrorMessage(isUrdu ? 'منتخب کردہ اکاؤنٹس نہیں ملے' : 'Selected accounts not found');
      return;
    }

    if (fromAcc.balance < amountNum) {
      setErrorMessage(
        isUrdu 
          ? `ارسال کنندہ اکاؤنٹ میں ناکافی بیلنس ہے۔ دستیاب رقم: ${formatMoney(fromAcc.balance)}` 
          : `Insufficient balance in the sender account. Available: ${formatMoney(fromAcc.balance)}`
      );
      return;
    }

    // Process balances update
    const updatedAccounts = state.bankAccounts.map((acc) => {
      if (acc.id === fromAccountId) {
        return { ...acc, balance: acc.balance - amountNum };
      }
      if (acc.id === toAccountId) {
        return { ...acc, balance: acc.balance + amountNum };
      }
      return acc;
    });

    onUpdateBankAccounts(updatedAccounts);

    // Record transfer transaction
    onAddTransaction({
      type: 'TRANSFER',
      amount: amountNum,
      category: 'Fund Transfer',
      paymentMethod: fromAcc.bankName as any,
      partyName: `${fromAcc.accountTitle} → ${toAcc.accountTitle}`,
      date: new Date().toISOString(),
      notes: transferNotes.trim() || (isUrdu ? 'رقم منتقلی (اندرونی فنڈ ٹرانسفر)' : 'Internal Fund Transfer'),
    });

    setSuccessMessage(isUrdu ? 'رقم کامیابی سے منتقل ہو گئی ہے!' : 'Funds transferred successfully!');
    setTransferAmount('');
    setTransferNotes('');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const targetBalanceNum = parseFloat(newBalance);
    if (isNaN(targetBalanceNum) || targetBalanceNum < 0) {
      setErrorMessage(isUrdu ? 'برائے مہربانی درست بیلنس درج کریں' : 'Please enter a valid balance');
      return;
    }

    const targetAcc = state.bankAccounts.find((a) => a.id === selectedAdjAccountId);
    if (!targetAcc) {
      setErrorMessage(isUrdu ? 'منتخب کردہ اکاؤنٹ نہیں ملا' : 'Selected account not found');
      return;
    }

    const diff = targetBalanceNum - targetAcc.balance;
    if (diff === 0) {
      setErrorMessage(isUrdu ? 'نیا بیلنس موجودہ بیلنس کے برابر ہے' : 'New balance matches the current balance');
      return;
    }

    // Determine target payment method
    let method: PaymentMethod = 'CASH';
    if (targetAcc.id === 'acc_cash') {
      method = 'CASH';
    } else if (targetAcc.type === 'BANK') {
      method = 'BANK';
    } else if (targetAcc.type === 'WALLET') {
      const nameUpper = targetAcc.bankName.toUpperCase();
      if (['EASYPAISA', 'JAZZCASH', 'NAYAPAY', 'SADAPAY'].includes(nameUpper)) {
        method = nameUpper as PaymentMethod;
      } else {
        method = 'BANK';
      }
    }

    // Record adjustment transaction
    onAddTransaction({
      type: diff > 0 ? 'SALE' : 'EXPENSE',
      amount: Math.abs(diff),
      category: 'Balance Reconciliation',
      paymentMethod: method,
      partyName: targetAcc.accountTitle,
      date: new Date().toISOString(),
      notes: adjNotes.trim() || (isUrdu 
        ? `اکاؤنٹ بیلنس ایڈجسٹمنٹ (فرق: ${formatMoney(diff)})` 
        : `Reconciliation adjustment (Diff: ${formatMoney(diff)})`),
    });

    setSuccessMessage(isUrdu ? 'بیلنس کامیابی سے اپ ڈیٹ کر دیا گیا ہے!' : 'Balance adjusted successfully!');
    setNewBalance('');
    setAdjNotes('');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleDirectEntry = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const amountNum = parseFloat(entryAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setErrorMessage(isUrdu ? 'برائے مہربانی درست رقم درج کریں' : 'Please enter a valid amount');
      return;
    }

    const acc = state.bankAccounts.find((a) => a.id === entryAccountId);
    if (!acc) {
      setErrorMessage(isUrdu ? 'منتخب کردہ اکاؤنٹ نہیں ملا' : 'Selected account not found');
      return;
    }

    if (entryType === 'PAYMENT' && acc.balance < amountNum) {
      setErrorMessage(
        isUrdu 
          ? `منتخب اکاؤنٹ میں ناکافی بیلنس ہے۔ دستیاب رقم: ${formatMoney(acc.balance)}` 
          : `Insufficient balance in the account. Available: ${formatMoney(acc.balance)}`
      );
      return;
    }

    // Determine target payment method
    let method: PaymentMethod = 'CASH';
    if (acc.id === 'acc_cash') {
      method = 'CASH';
    } else if (acc.type === 'BANK') {
      method = 'BANK';
    } else if (acc.type === 'WALLET') {
      const nameUpper = acc.bankName.toUpperCase();
      if (['EASYPAISA', 'JAZZCASH', 'NAYAPAY', 'SADAPAY'].includes(nameUpper)) {
        method = nameUpper as PaymentMethod;
      } else {
        method = 'BANK';
      }
    }

    // Record direct ledger transaction
    onAddTransaction({
      type: entryType,
      amount: amountNum,
      category: entryCategory,
      paymentMethod: method,
      partyName: entryPartyName.trim() || undefined,
      date: new Date(entryDate).toISOString(),
      notes: entryNotes.trim() || undefined,
    });

    setSuccessMessage(
      isUrdu 
        ? 'نیا کھاتا اندراج کامیابی سے درج کر دیا گیا ہے!' 
        : 'Direct ledger entry recorded successfully!'
    );
    
    // Reset fields
    setEntryAmount('');
    setEntryPartyName('');
    setEntryNotes('');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const totalCashAndBank = state.bankAccounts.reduce((sum, b) => sum + b.balance, 0);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex flex-col w-full h-[100dvh] overflow-hidden animate-in fade-in duration-200">
      <div className="bg-slate-50 w-full h-full flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0F8A5F] via-[#0B724E] to-[#066647] px-4 sm:px-6 py-3 text-white flex items-center justify-between shrink-0 shadow-md pt-[calc(env(safe-area-inset-top,0px)+0.75rem)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center border border-white/30 shadow-inner backdrop-blur-md">
              <Wallet className="w-5 h-5 text-emerald-100" />
            </div>
            <div>
              <h2 className="font-extrabold text-base flex items-center gap-1.5 text-white">
                <span>{isUrdu ? 'کیش اور بینک اکاؤنٹس' : 'Cash & Bank Accounts'}</span>
              </h2>
              <p className="text-[10px] text-emerald-100/90 font-medium">
                {isUrdu 
                  ? `کل کاروبار کے فنڈز: ${formatMoney(totalCashAndBank)}` 
                  : `Total Business Funds: ${formatMoney(totalCashAndBank)}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-white/10 rounded-full transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-white/10 rounded-full transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs inside Modal */}
        <div className="flex border-b border-slate-100 bg-slate-50 p-1.5 gap-1.5 overflow-x-auto">
          <button
            onClick={() => { setActiveTab('VIEW'); setErrorMessage(null); }}
            className={`flex-1 min-w-[80px] py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === 'VIEW'
                ? 'bg-white text-slate-800 shadow-2xs border border-slate-100'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/30'
            }`}
          >
            {isUrdu ? 'اکاؤنٹ سمری' : 'Balances'}
          </button>
          <button
            onClick={() => { 
              setActiveTab('ENTRY'); 
              setErrorMessage(null); 
              // Set default category
              setEntryCategory(entryType === 'RECEIPT' ? 'Capital Contribution' : 'Personal Drawings');
            }}
            className={`flex-1 min-w-[100px] py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === 'ENTRY'
                ? 'bg-white text-slate-800 shadow-2xs border border-slate-100'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/30'
            }`}
          >
            {isUrdu ? 'کیش / بینک انٹری' : 'Direct Entry'}
          </button>
          <button
            onClick={() => { setActiveTab('TRANSFER'); setErrorMessage(null); }}
            className={`flex-1 min-w-[80px] py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === 'TRANSFER'
                ? 'bg-white text-slate-800 shadow-2xs border border-slate-100'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/30'
            }`}
          >
            {isUrdu ? 'رقم منتقلی' : 'Transfer'}
          </button>
          <button
            onClick={() => { setActiveTab('ADJUST'); setErrorMessage(null); }}
            className={`flex-1 min-w-[80px] py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === 'ADJUST'
                ? 'bg-white text-slate-800 shadow-2xs border border-slate-100'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/30'
            }`}
          >
            {isUrdu ? 'ایڈجسٹمنٹ' : 'Adjust'}
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1">
          {errorMessage && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 p-2.5 rounded-xl text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-2.5 rounded-xl text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* VIEW TAB */}
          {activeTab === 'VIEW' && (
            <div className="space-y-3">
              <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">
                {isUrdu ? 'دستیاب کھاتوں کی تفصیل' : 'Available Accounts & Wallets'}
              </p>
              
              <div className="grid grid-cols-1 gap-2.5">
                {state.bankAccounts.map((acc) => (
                  <div
                    key={acc.id}
                    className={`p-3.5 rounded-2xl border flex items-center justify-between shadow-2xs transition-all ${getAccountBg(acc.type)}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center border border-slate-100 shadow-3xs shrink-0">
                        {getAccountIcon(acc.type)}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-extrabold text-slate-800 text-xs sm:text-sm truncate">
                          {isUrdu && acc.id === 'acc_cash' ? 'کیش کاؤنٹر (نقدی)' : acc.accountTitle}
                        </h4>
                        <p className="text-[10px] text-slate-500 mt-0.5 truncate">
                          {acc.bankName} {acc.accountNumber && `• ${acc.accountNumber}`}
                        </p>
                      </div>
                    </div>
                    
                    <p className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight whitespace-nowrap">
                      {formatMoney(acc.balance)}
                    </p>
                  </div>
                ))}
              </div>

              {/* Recent Ledger Transactions */}
              <div className="space-y-2.5 pt-4 border-t border-slate-200/60">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider flex items-center gap-1.5">
                    <History className="w-4 h-4 text-slate-400" />
                    <span>{isUrdu ? 'حالیہ کیش و بینک کھاتا ہسٹری' : 'Recent Cash & Bank Ledger'}</span>
                  </p>
                  <span className="text-[10px] text-slate-400 font-bold bg-slate-100 px-2 py-0.5 rounded-full">
                    {state.transactions.length} {isUrdu ? 'ٹوٹل اندراج' : 'total'}
                  </span>
                </div>

                <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                  {state.transactions.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-xs font-semibold">
                      {isUrdu ? 'کوئی لین دین درج نہیں ملا' : 'No transactions recorded yet.'}
                    </div>
                  ) : (
                    state.transactions
                      .slice()
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .map((tx) => {
                        const isIncoming = tx.type === 'SALE' || tx.type === 'RECEIPT' || tx.type === 'LOAN_TAKEN';
                        // Format date beautifully
                        let displayDate = '';
                        try {
                          const dateObj = new Date(tx.date);
                          displayDate = dateObj.toLocaleDateString(isUrdu ? 'ur-PK' : 'en-US', {
                            day: 'numeric',
                            month: 'short',
                          });
                        } catch (e) {
                          displayDate = tx.date;
                        }

                        // Translate transaction category to Urdu
                        let displayCategory = tx.category;
                        if (isUrdu) {
                          if (tx.category === 'Capital Contribution') displayCategory = 'ذاتی سرمایہ';
                          else if (tx.category === 'Personal Drawings') displayCategory = 'ذاتی استعمال / ڈرائنگز';
                          else if (tx.category === 'Balance Reconciliation') displayCategory = 'بیلنس درستگی';
                          else if (tx.category === 'Fund Transfer') displayCategory = 'رقم منتقلی';
                          else if (tx.category === 'Shop Expense') displayCategory = 'دکان کا خرچہ';
                          else if (tx.category === 'Supplier Payment') displayCategory = 'سپلائر کی ادائیگی';
                          else if (tx.category === 'Cash Received from Customer') displayCategory = 'گاہک کی وصولی';
                        }

                        return (
                          <div
                            key={tx.id}
                            className="bg-white border border-slate-100 hover:border-slate-200 p-3 rounded-2xl flex items-center justify-between gap-3 shadow-3xs hover:shadow-2xs transition-all"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              {/* Icon Indicator for Inflow / Outflow */}
                              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                                isIncoming ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                              }`}>
                                {isIncoming ? (
                                  <ArrowDownCircle className="w-4.5 h-4.5" />
                                ) : (
                                  <ArrowUpCircle className="w-4.5 h-4.5" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-extrabold text-slate-800 text-xs sm:text-sm">
                                    {displayCategory}
                                  </span>
                                  {tx.partyName && (
                                    <span className="text-[10px] text-slate-500 font-bold bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded-md truncate max-w-[120px]">
                                      {tx.partyName}
                                    </span>
                                  )}
                                  <span className="text-[9px] font-black text-slate-400 bg-slate-50 border border-slate-100 px-1 py-0.5 rounded">
                                    {tx.paymentMethod}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-1">
                                  <span className="font-medium">{displayDate}</span>
                                  {tx.notes && (
                                    <>
                                      <span>•</span>
                                      <span className="truncate italic max-w-[180px]">{tx.notes}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>

                            <p className={`font-black text-xs sm:text-sm whitespace-nowrap tracking-tight ${
                              isIncoming ? 'text-emerald-600' : 'text-slate-800'
                            }`}>
                              {isIncoming ? '+' : '-'} {formatMoney(tx.amount)}
                            </p>
                          </div>
                        );
                      })
                  )}
                </div>
              </div>
            </div>
          )}
 
          {/* DIRECT ENTRY TAB */}
          {activeTab === 'ENTRY' && (
            <form onSubmit={handleDirectEntry} className="space-y-3.5 bg-white p-4 sm:p-5 rounded-3xl border border-slate-100 shadow-2xs">
              <h3 className="font-extrabold text-xs text-[#0F8A5F] uppercase tracking-wider">
                {isUrdu ? 'براہ راست کیش / بینک اندراج' : 'Direct Manual Account Entry'}
              </h3>

              {/* Account selection */}
              <div className="space-y-1">
                <label className="text-xs font-extrabold text-slate-700 block">
                  {isUrdu ? 'کون سا اکاؤنٹ منتخب کریں؟' : 'Select Account'}
                </label>
                <select
                  value={entryAccountId}
                  onChange={(e) => setEntryAccountId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-2.5 py-2 text-xs font-semibold focus:outline-none focus:border-emerald-500"
                >
                  {state.bankAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {isUrdu && acc.id === 'acc_cash' ? 'کیش کاؤنٹر (نقدی)' : acc.accountTitle} ({formatMoney(acc.balance)})
                    </option>
                  ))}
                </select>
              </div>

              {/* Transaction Type Segmented Control */}
              <div className="space-y-1">
                <label className="text-xs font-extrabold text-slate-700 block">
                  {isUrdu ? 'اندراج کی قسم (Inflow / Outflow)' : 'Transaction Type'}
                </label>
                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-1 rounded-xl border border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setEntryType('RECEIPT');
                      setEntryCategory('Capital Contribution');
                    }}
                    className={`py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      entryType === 'RECEIPT'
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <ArrowDownCircle className="w-4 h-4" />
                    <span>{isUrdu ? 'آمد / کیش آیا (Receipt)' : 'Cash In (Receipt)'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEntryType('PAYMENT');
                      setEntryCategory('Personal Drawings');
                    }}
                    className={`py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      entryType === 'PAYMENT'
                        ? 'bg-rose-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <ArrowUpCircle className="w-4 h-4" />
                    <span>{isUrdu ? 'خرچ / کیش گیا (Payment)' : 'Cash Out (Payment)'}</span>
                  </button>
                </div>
              </div>

              {/* Amount and Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-700 block">
                    {isUrdu ? 'رقم درج کریں (روپے)' : 'Amount'}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">Rs.</span>
                    <input
                      type="number"
                      required
                      value={entryAmount}
                      onChange={(e) => setEntryAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 text-slate-800 rounded-xl text-xs font-bold focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-700 block">
                    {isUrdu ? 'تاریخ منتخب کریں' : 'Date'}
                  </label>
                  <div className="relative">
                    <Calendar className="absolute right-3 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      type="date"
                      required
                      value={entryDate}
                      onChange={(e) => setEntryDate(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 text-slate-800 rounded-xl text-xs font-semibold focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Category selector */}
              <div className="space-y-1">
                <label className="text-xs font-extrabold text-slate-700 block">
                  {isUrdu ? 'زمرہ (Category)' : 'Category'}
                </label>
                <select
                  value={entryCategory}
                  onChange={(e) => setEntryCategory(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-2.5 py-2 text-xs font-semibold focus:outline-none focus:border-emerald-500"
                >
                  {entryType === 'RECEIPT' ? (
                    <>
                      <option value="Capital Contribution">
                        {isUrdu ? 'Owner Capital / ذاتی سرمایہ یا سرمایہ کاری' : 'Capital Contribution / Owner Investment'}
                      </option>
                      <option value="Other Income">
                        {isUrdu ? 'Other Income / دیگر غیر کاروباری آمدنی' : 'Other Income'}
                      </option>
                      <option value="Cash Received from Customer">
                        {isUrdu ? 'Cash Received from Customer / گاہک سے نقدی وصولی' : 'Cash Received from Customer'}
                      </option>
                      <option value="Miscellaneous Inflow">
                        {isUrdu ? 'Miscellaneous / متفرق آمدن' : 'Miscellaneous Inflow'}
                      </option>
                    </>
                  ) : (
                    <>
                      <option value="Personal Drawings">
                        {isUrdu ? 'Personal Drawings / مالک کا ذاتی استعمال کے لیے گلے سے کیش نکالنا' : 'Personal Drawings / Owner Usage'}
                      </option>
                      <option value="Shop Expense">
                        {isUrdu ? 'Shop Expense / دکان کا خرچہ (مثلاً چائے، صفائی)' : 'Shop Expense / Direct General Expense'}
                      </option>
                      <option value="Supplier Payment">
                        {isUrdu ? 'Supplier Payment / سپلائر یا ہول سیلر کو کیش ادائیگی' : 'Supplier Payment'}
                      </option>
                      <option value="Miscellaneous Outflow">
                        {isUrdu ? 'Miscellaneous / متفرق خرچہ' : 'Miscellaneous Outflow'}
                      </option>
                    </>
                  )}
                </select>
              </div>

              {/* Optional Person / Party Name */}
              <div className="space-y-1">
                <label className="text-xs font-extrabold text-slate-700 block">
                  {isUrdu ? 'فرد / فریق کا نام (اختیاری)' : 'Party Name (Optional)'}
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={entryPartyName}
                    onChange={(e) => setEntryPartyName(e.target.value)}
                    placeholder={isUrdu ? 'مثلاً: محمد سلیم، یا پارٹنر کا نام' : 'e.g., Partner Name, Customer, Supplier'}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 text-slate-800 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1">
                <label className="text-xs font-extrabold text-slate-700 block">
                  {isUrdu ? 'تفصیل / نوٹس (اختیاری)' : 'Notes / Description (Optional)'}
                </label>
                <input
                  type="text"
                  value={entryNotes}
                  onChange={(e) => setEntryNotes(e.target.value)}
                  placeholder={isUrdu ? 'مثلاً: Rs. 50k ذاتی سرمایہ گلے میں ڈالا' : 'e.g., Added Rs. 50k owner capital cash injection'}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 text-slate-800 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className={`w-full py-2.5 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer active:scale-95 ${
                  entryType === 'RECEIPT' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                <Plus className="w-4 h-4" />
                <span>{isUrdu ? 'اندراج درج کریں' : 'Record Direct Entry'}</span>
              </button>
            </form>
          )}

          {/* TRANSFER TAB */}
          {activeTab === 'TRANSFER' && (
            <form onSubmit={handleTransfer} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                {/* From Account */}
                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-700">
                    {isUrdu ? 'کہاں سے (منتقل کریں)' : 'Transfer From'}
                  </label>
                  <select
                    value={fromAccountId}
                    onChange={(e) => setFromAccountId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-2.5 py-2 text-xs font-semibold focus:outline-none focus:border-emerald-500"
                  >
                    {state.bankAccounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.accountTitle} ({formatMoney(acc.balance)})
                      </option>
                    ))}
                  </select>
                </div>

                {/* To Account */}
                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-700">
                    {isUrdu ? 'کہاں کو (وصول کریں)' : 'Transfer To'}
                  </label>
                  <select
                    value={toAccountId}
                    onChange={(e) => setToAccountId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-2.5 py-2 text-xs font-semibold focus:outline-none focus:border-emerald-500"
                  >
                    {state.bankAccounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.accountTitle} ({formatMoney(acc.balance)})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Amount */}
              <div className="space-y-1">
                <label className="text-xs font-extrabold text-slate-700 block">
                  {isUrdu ? 'منتقل کرنے کی رقم (روپے)' : 'Amount to Transfer'}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">Rs.</span>
                  <input
                    type="number"
                    required
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 text-slate-800 rounded-xl text-xs font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1">
                <label className="text-xs font-extrabold text-slate-700 block">
                  {isUrdu ? 'اضافی نوٹس (تفصیل)' : 'Optional Notes'}
                </label>
                <input
                  type="text"
                  value={transferNotes}
                  onChange={(e) => setTransferNotes(e.target.value)}
                  placeholder={isUrdu ? 'مثلاً: کیش کو بینک میں جمع کروایا' : 'e.g., Deposited cash in bank'}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 text-slate-800 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Action Button */}
              <button
                type="submit"
                className="w-full py-2.5 bg-[#0F8A5F] hover:bg-[#0a6c4a] text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer active:scale-95"
              >
                <ArrowRightLeft className="w-4 h-4" />
                <span>{isUrdu ? 'رقم منتقل کریں' : 'Confirm Transfer'}</span>
              </button>
            </form>
          )}

          {/* ADJUST TAB */}
          {activeTab === 'ADJUST' && (
            <form onSubmit={handleAdjustment} className="space-y-3.5">
              <div className="bg-amber-50 border border-amber-200 text-amber-950 p-3 rounded-2xl text-[11px] leading-relaxed">
                <strong>{isUrdu ? 'اہم نوٹ (Important Note):' : 'Important Note:'}</strong>{' '}
                {isUrdu 
                  ? 'دکان کا ذاتی سرمایہ (Owner Capital) داخل کرنے کے لیے یا کیش رجسٹر کا بیلنس ایڈجسٹ کرنے کے لیے یہاں نیا بیلنس درج کریں۔ مثال کے طور پر، اگر آپ کے پاس 0 روپے ہیں اور آپ 50,000 روپے ذاتی سرمایہ داخل کرنا چاہتے ہیں، تو یہاں 50000 درج کریں اور نوٹس میں "ذاتی سرمایہ / Owner Capital" لکھیں۔' 
                  : 'To introduce Owner Capital or adjust your cash drawer balance, specify the target balance here. For example, if current cash is 0 and you want to invest Rs. 50,000, enter 50000 and write "Owner Capital" in notes.'}
              </div>

              {/* Account selection */}
              <div className="space-y-1">
                <label className="text-xs font-extrabold text-slate-700 block">
                  {isUrdu ? 'کون سے اکاؤنٹ کا بیلنس درست کرنا ہے؟' : 'Account to Reconcile'}
                </label>
                <select
                  value={selectedAdjAccountId}
                  onChange={(e) => setSelectedAdjAccountId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-2.5 py-2 text-xs font-semibold focus:outline-none focus:border-emerald-500"
                >
                  {state.bankAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.accountTitle} ({formatMoney(acc.balance)})
                    </option>
                  ))}
                </select>
              </div>

              {/* New Balance input */}
              <div className="space-y-1">
                <label className="text-xs font-extrabold text-slate-700 block">
                  {isUrdu ? 'نیا درست بیلنس درج کریں (روپے)' : 'Actual Current Balance'}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">Rs.</span>
                  <input
                    type="number"
                    required
                    value={newBalance}
                    onChange={(e) => setNewBalance(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 text-slate-800 rounded-xl text-xs font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Adjustment Notes */}
              <div className="space-y-1">
                <label className="text-xs font-extrabold text-slate-700 block">
                  {isUrdu ? 'درستگی کی وجہ / نوٹس' : 'Reconciliation Reason'}
                </label>
                <input
                  type="text"
                  value={adjNotes}
                  onChange={(e) => setAdjNotes(e.target.value)}
                  placeholder={isUrdu ? 'مثلاً: روزانہ کیش کی گنتی کے بعد درستگی' : 'e.g., End of day physical cash count'}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 text-slate-800 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Action Button */}
              <button
                type="submit"
                className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer active:scale-95"
              >
                <PencilLine className="w-4 h-4" />
                <span>{isUrdu ? 'بیلنس درست کریں' : 'Apply Adjustment'}</span>
              </button>
            </form>
          )}

        </div>

      </div>
    </div>
  );
};
