import React, { useState } from 'react';
import { AppState, BusinessAsset, PersonalAsset, HouseholdExpenses, OtherIncome, LoanRecord, Transaction, PaymentMethod } from '../types';
import { formatMoney } from '../utils/format';
import { Building2, Home, Heart, DollarSign, Plus, Trash2, Landmark, Check, History, Briefcase, Receipt, Scale, User, ShieldAlert } from 'lucide-react';
import { useBackHandler } from '../hooks/useBackHandler';
import { calculateFbrSummary } from '../utils/taxEngine';

interface AssetsAndLoansModuleProps {
  state: AppState;
  isUrdu: boolean;
  onAddBusinessAsset: (asset: Omit<BusinessAsset, 'id'>) => void;
  onAddPersonalAsset: (asset: Omit<PersonalAsset, 'id'>) => void;
  onUpdateHouseholdExpenses: (exp: HouseholdExpenses) => void;
  onUpdateOtherIncome: (income: OtherIncome) => void;
  onAddLoan: (loan: Omit<LoanRecord, 'id'>) => void;
  onAddTransaction: (tx: Omit<Transaction, 'id'>) => void;
  onDeleteBusinessAsset?: (id: string) => void;
  onDeletePersonalAsset?: (id: string) => void;
  onDeleteLoan?: (id: string) => void;
}

export const AssetsAndLoansModule: React.FC<AssetsAndLoansModuleProps> = ({
  state,
  isUrdu,
  onAddBusinessAsset,
  onAddPersonalAsset,
  onUpdateHouseholdExpenses,
  onUpdateOtherIncome,
  onAddLoan,
  onAddTransaction,
  onDeleteBusinessAsset,
  onDeletePersonalAsset,
  onDeleteLoan,
}) => {
  const [tab, setTab] = useState<'BALANCE_SHEET' | 'BUSINESS_ASSETS' | 'PERSONAL_ASSETS' | 'HOUSEHOLD_DRAWINGS' | 'LOANS'>('BALANCE_SHEET');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [balanceSheetMode, setBalanceSheetMode] = useState<'COMBINED' | 'BUSINESS_ONLY'>('COMBINED');

  // Inline Loan Transaction State
  const [selectedLoanId, setSelectedLoanId] = useState<string | null>(null);
  const [movementType, setMovementType] = useState<'TAKEN' | 'REPAYMENT'>('REPAYMENT');
  const [movementAmount, setMovementAmount] = useState('');
  const [movementPaymentMethod, setMovementPaymentMethod] = useState<PaymentMethod>('CASH');
  const [movementNotes, setMovementNotes] = useState('');

  // Register Back Handler for selected Loan ID inline collapse
  useBackHandler(Boolean(selectedLoanId), () => setSelectedLoanId(null), 'AssetLoanDetails');

  // Business Asset State
  const [bName, setBName] = useState('');
  const [bPrice, setBPrice] = useState('');
  const [bCategory, setBCategory] = useState('Furniture & Fixtures');

  // Personal Asset State
  const [pName, setPName] = useState('');
  const [pValue, setPValue] = useState('');

  // Household Expense State
  const [hh, setHh] = useState<HouseholdExpenses>(state.householdExpenses);
  const [income, setIncome] = useState<OtherIncome>(state.otherIncome);

  React.useEffect(() => {
    setHh(state.householdExpenses);
  }, [state.householdExpenses]);

  React.useEffect(() => {
    setIncome(state.otherIncome);
  }, [state.otherIncome]);

  const totalBusinessAssetVal = state.businessAssets.reduce((s, a) => s + a.currentValue, 0);
  const totalPersonalAssetVal = state.personalAssets.reduce((s, a) => s + a.value, 0);
  const totalLoansVal = state.loans.reduce((s, l) => s + l.outstandingAmount, 0);

  const cashBalance = state.bankAccounts.reduce((sum, ba) => sum + (ba.balance || 0), 0);
  const stockValue = state.inventory.reduce((sum, item) => sum + ((item.quantity || 0) * (item.purchasePrice || 0)), 0);
  const customerReceivables = state.customers.reduce((sum, c) => sum + (c.totalCredit || 0), 0);
  const supplierPayables = state.suppliers.reduce((sum, s) => sum + (s.totalPayable || 0), 0);

  // Helper for computing loan values dynamically
  const getLoanOutstanding = (loan: LoanRecord) => {
    const initialAmount = loan.amount;
    const taken = state.transactions
      .filter(t => t.type === 'LOAN_TAKEN' && t.loanAccountId === loan.id)
      .reduce((sum, t) => sum + t.amount, 0);
    const repaid = state.transactions
      .filter(t => t.type === 'PAYMENT' && t.category === 'LOAN_REPAYMENT' && t.loanAccountId === loan.id)
      .reduce((sum, t) => sum + t.amount, 0);
    return initialAmount + taken - repaid;
  };

  const businessLoansValue = state.loans
    .filter(loan => loan.classification === 'BUSINESS_LOAN' || (loan.classification !== 'PERSONAL_LOAN' && loan.type !== 'PERSONAL_LOAN'))
    .reduce((sum, loan) => sum + getLoanOutstanding(loan), 0);

  const personalLoansValue = state.loans
    .filter(loan => loan.classification === 'PERSONAL_LOAN' || loan.type === 'PERSONAL_LOAN')
    .reduce((sum, loan) => sum + getLoanOutstanding(loan), 0);

  const totalAssets = balanceSheetMode === 'COMBINED'
    ? cashBalance + stockValue + customerReceivables + totalBusinessAssetVal + totalPersonalAssetVal
    : cashBalance + stockValue + customerReceivables + totalBusinessAssetVal;

  const totalLiabilities = balanceSheetMode === 'COMBINED'
    ? supplierPayables + businessLoansValue + personalLoansValue
    : supplierPayables + businessLoansValue;

  const netWorth = totalAssets - totalLiabilities;

  const summary = calculateFbrSummary(state);
  const selectedYear = state.taxRecord.selectedTaxYear || '2026';
  const isWithinPeriod = (dateStr: string) => {
    if (!dateStr) return false;
    return dateStr.substring(0, 4) === selectedYear;
  };
  
  const expenseTransactions = state.transactions.filter(
    (t) =>
      t.type === 'EXPENSE' &&
      isWithinPeriod(t.date) &&
      t.category !== 'DRAWINGS' &&
      t.category !== 'PERSONAL_DRAWINGS' &&
      t.category !== 'LOAN_REPAYMENT'
  );

  const expenseBreakdown = expenseTransactions.reduce((acc, t) => {
    const cat = t.category || 'MISCELLANEOUS';
    acc[cat] = (acc[acc[cat] ? cat : cat] || 0) + t.amount;
    return acc;
  }, {} as Record<string, number>);

  const handleAddBusinessAsset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bName.trim()) return;
    const price = parseFloat(bPrice) || 0;

    onAddBusinessAsset({
      name: bName.trim(),
      category: bCategory,
      purchaseDate: new Date().toISOString().split('T')[0],
      purchasePrice: price,
      usefulLifeYears: 10,
      currentValue: price,
    });

    setBName('');
    setBPrice('');
  };

  const handleAddPersonalAsset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pName.trim()) return;
    const val = parseFloat(pValue) || 0;

    onAddPersonalAsset({
      name: pName.trim(),
      category: 'Property / Gold',
      value: val,
    });

    setPName('');
    setPValue('');
  };

  const handleSaveHousehold = () => {
    onUpdateHouseholdExpenses(hh);
    onUpdateOtherIncome(income);
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Header */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-2xs">
        <h2 className="text-sm sm:text-lg font-bold text-slate-900 flex items-center gap-2 overflow-hidden truncate whitespace-nowrap">
          <Building2 className="w-5 h-5 text-[#126A49] shrink-0" />
          <span className="truncate whitespace-nowrap">{isUrdu ? 'اثاثے، گھریلو اخراجات اور ویلتھ' : 'Assets, Loans & Wealth Statement'}</span>
        </h2>
        <p className="text-xs text-slate-500 font-medium">
          {isUrdu
            ? 'کاروباری و ذاتی اثاثے، گھریلو اخراجات اور ایف بی آر مطابقت کے لیے دیگر آمدن'
            : 'Track business & personal net worth required for FBR Wealth Reconciliation.'}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {[
          { id: 'BALANCE_SHEET', en: 'Balance Sheet', ur: 'بیلنس شیٹ (توازنِ مال)' },
          { id: 'BUSINESS_ASSETS', en: 'Business Assets', ur: 'دکان کے اثاثے' },
          { id: 'PERSONAL_ASSETS', en: 'Personal Assets', ur: 'ذاتی اثاثے' },
          { id: 'HOUSEHOLD_DRAWINGS', en: 'Household & Business Expenses', ur: 'گھریلو اور کاروباری اخراجات' },
          { id: 'LOANS', en: 'Loans & Borrowings', ur: 'قرضے' },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id as any)}
            className={`px-3.5 py-2 text-xs font-bold rounded-2xl transition-all shrink-0 cursor-pointer ${
              tab === t.id
                ? 'bg-[#126A49] text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {isUrdu ? t.ur : t.en}
          </button>
        ))}
      </div>

      {/* Tab 0: Balance Sheet */}
      {tab === 'BALANCE_SHEET' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Controls & Mode Switch */}
          <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
                <Scale className="w-4.5 h-4.5 text-[#126A49]" />
                <span>{isUrdu ? 'دکان کی بیلنس شیٹ (توازنِ مال)' : 'Shopkeeper’s Balance Sheet'}</span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
                {isUrdu ? 'دکان کے اثاثے، قرضہ جات اور سرمایہ کا موازنہ' : 'Statement of Financial Position: Assets, Liabilities & Capital'}
              </p>
            </div>
            
            {/* Combined vs Business Toggle */}
            <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setBalanceSheetMode('BUSINESS_ONLY')}
                className={`flex-1 sm:flex-none px-3.5 py-1.5 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                  balanceSheetMode === 'BUSINESS_ONLY'
                    ? 'bg-[#126A49] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                {isUrdu ? 'صرف دکان' : 'Business Only'}
              </button>
              <button
                type="button"
                onClick={() => setBalanceSheetMode('COMBINED')}
                className={`flex-1 sm:flex-none px-3.5 py-1.5 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                  balanceSheetMode === 'COMBINED'
                    ? 'bg-[#126A49] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                {isUrdu ? 'مجموعی (ذاتی + دکان)' : 'Combined Wealth'}
              </button>
            </div>
          </div>

          {/* Quick Stats Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block leading-tight">
                  {isUrdu ? 'کل اثاثے (Total Assets)' : 'Total Assets'}
                </span>
                <span className="text-lg font-black text-[#126A49] block">
                  {formatMoney(totalAssets)}
                </span>
              </div>
              <div className="p-3 bg-emerald-50 rounded-2xl text-[#126A49] shrink-0">
                <Scale className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block leading-tight">
                  {isUrdu ? 'کل واجبات / دینداریاں' : 'Total Liabilities'}
                </span>
                <span className="text-lg font-black text-rose-700 block">
                  {formatMoney(totalLiabilities)}
                </span>
              </div>
              <div className="p-3 bg-rose-50 rounded-2xl text-rose-600 shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block leading-tight">
                  {isUrdu ? 'خالص مالیت / سرمایہ' : 'Net Capital / Equity'}
                </span>
                <span className="text-lg font-black text-blue-800 block">
                  {formatMoney(netWorth)}
                </span>
              </div>
              <div className="p-3 bg-blue-50 rounded-2xl text-blue-600 shrink-0">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Detailed Ledger-Style Double Entry Table */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left: Assets Ledger */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs space-y-4">
              <div className="border-b border-slate-100 pb-2">
                <h4 className="font-bold text-xs text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Landmark className="w-4 h-4" />
                  <span>{isUrdu ? 'اثاثے (ASSETS)' : 'Assets'}</span>
                </h4>
              </div>

              <div className="space-y-3">
                {/* Current Assets */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block leading-none">
                    {isUrdu ? 'موجودہ کاروباری اثاثے' : 'Current Assets'}
                  </span>
                  
                  {/* Cash & Bank */}
                  <div className="bg-slate-50/50 rounded-2xl p-3 border border-slate-100 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-700">{isUrdu ? 'نقد اور بینک بیلنس' : 'Cash & Bank Balance'}</span>
                      <span className="font-bold text-slate-900">{formatMoney(cashBalance)}</span>
                    </div>
                    {/* Inline breakdown of bank accounts */}
                    {state.bankAccounts.length > 0 && (
                      <div className="pl-3.5 border-l-2 border-slate-200 space-y-1 text-[11px] text-slate-500 font-medium">
                        {state.bankAccounts.map((acct) => (
                          <div key={acct.id} className="flex justify-between">
                            <span>{acct.bankName} ({acct.accountTitle})</span>
                            <span>{formatMoney(acct.balance)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Stock/Inventory */}
                  <div className="bg-slate-50/50 rounded-2xl p-3 border border-slate-100 flex justify-between items-center text-xs">
                    <div>
                      <span className="font-bold text-slate-700">{isUrdu ? 'دکان کا مال (انوینٹری اسٹاک مالیت)' : 'Stock-in-Trade (Inventory)'}</span>
                      <span className="text-[10px] text-slate-400 block mt-0.5 leading-none font-medium">
                        {isUrdu ? `${state.inventory.length} آئٹمز اسٹاک میں` : `${state.inventory.length} items in stock`}
                      </span>
                    </div>
                    <span className="font-bold text-slate-900">{formatMoney(stockValue)}</span>
                  </div>

                  {/* Accounts Receivable / Khata */}
                  <div className="bg-slate-50/50 rounded-2xl p-3 border border-slate-100 flex justify-between items-center text-xs">
                    <div>
                      <span className="font-bold text-slate-700">{isUrdu ? 'کھاتا وصولیاں (ادھار صارفین)' : 'Accounts Receivable (Khata)'}</span>
                      <span className="text-[10px] text-slate-400 block mt-0.5 leading-none font-medium">
                        {isUrdu ? `${state.customers.filter(c => c.totalCredit > 0).length} فعال ادھار کھاتے` : `${state.customers.filter(c => c.totalCredit > 0).length} active credit accounts`}
                      </span>
                    </div>
                    <span className="font-bold text-slate-900">{formatMoney(customerReceivables)}</span>
                  </div>
                </div>

                {/* Fixed Business Assets */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block leading-none">
                    {isUrdu ? 'مستقل کاروباری اثاثے' : 'Fixed Assets (Business)'}
                  </span>
                  <div className="bg-slate-50/50 rounded-2xl p-3 border border-slate-100 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-700">{isUrdu ? 'کاروباری اثاثے (سولر، فرنیچر وغیرہ)' : 'Business Equipment & Fixtures'}</span>
                      <span className="font-bold text-slate-900">{formatMoney(totalBusinessAssetVal)}</span>
                    </div>
                    {state.businessAssets.length > 0 && (
                      <div className="pl-3.5 border-l-2 border-slate-200 space-y-1 text-[11px] text-slate-500 font-medium">
                        {state.businessAssets.map((asset) => (
                          <div key={asset.id} className="flex justify-between">
                            <span>{asset.name}</span>
                            <span>{formatMoney(asset.currentValue)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Personal Non-Business Assets (If Combined Toggled) */}
                {balanceSheetMode === 'COMBINED' && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block leading-none">
                      {isUrdu ? 'ذاتی و گھریلو اثاثے (غیر کاروباری)' : 'Personal Assets (Non-Business)'}
                    </span>
                    <div className="bg-slate-50/50 rounded-2xl p-3 border border-slate-100 space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-700">{isUrdu ? 'ذاتی جائیداد، سونا، نقدی وغیرہ' : 'Personal Property & Capital'}</span>
                        <span className="font-bold text-slate-900">{formatMoney(totalPersonalAssetVal)}</span>
                      </div>
                      {state.personalAssets.length > 0 && (
                        <div className="pl-3.5 border-l-2 border-slate-200 space-y-1 text-[11px] text-slate-500 font-medium">
                          {state.personalAssets.map((asset) => (
                            <div key={asset.id} className="flex justify-between">
                              <span>{asset.name}</span>
                              <span>{formatMoney(asset.value)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Total Assets (Classic Accounting Double Underline) */}
              <div className="pt-4 border-t border-slate-100">
                <div className="border-t border-slate-200 border-b-4 border-double border-slate-900 pt-2 pb-1 font-bold flex justify-between text-xs text-slate-900 leading-none">
                  <span>{isUrdu ? 'کل اثاثے (TOTAL ASSETS)' : 'TOTAL ASSETS'}</span>
                  <span>{formatMoney(totalAssets)}</span>
                </div>
              </div>
            </div>

            {/* Right: Liabilities & Capital Ledger */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs space-y-4">
              <div className="border-b border-slate-100 pb-2">
                <h4 className="font-bold text-xs text-rose-800 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4" />
                  <span>{isUrdu ? 'واجبات اور سرمایہ (LIABILITIES & CAPITAL)' : 'Liabilities & Capital'}</span>
                </h4>
              </div>

              <div className="space-y-3">
                {/* Current Liabilities */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block leading-none">
                    {isUrdu ? 'موجودہ کاروباری واجبات' : 'Current Liabilities'}
                  </span>

                  {/* Supplier payables */}
                  <div className="bg-slate-50/50 rounded-2xl p-3 border border-slate-100 flex justify-between items-center text-xs">
                    <div>
                      <span className="font-bold text-slate-700">{isUrdu ? 'سپلائر کھاتا ادائیگیاں' : 'Accounts Payable (Suppliers)'}</span>
                      <span className="text-[10px] text-slate-400 block mt-0.5 leading-none font-medium">
                        {isUrdu ? `${state.suppliers.filter(s => s.totalPayable > 0).length} فعال سپلائر کھاتے` : `${state.suppliers.filter(s => s.totalPayable > 0).length} active supplier accounts`}
                      </span>
                    </div>
                    <span className="font-bold text-slate-900">{formatMoney(supplierPayables)}</span>
                  </div>

                  {/* Business Loans */}
                  <div className="bg-slate-50/50 rounded-2xl p-3 border border-slate-100 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-700">{isUrdu ? 'کاروباری قرضے (Business Loans)' : 'Business Loans & Borrowings'}</span>
                      <span className="font-bold text-slate-950">{formatMoney(businessLoansValue)}</span>
                    </div>
                    {state.loans.filter(loan => loan.classification === 'BUSINESS_LOAN' || (loan.classification !== 'PERSONAL_LOAN' && loan.type !== 'PERSONAL_LOAN')).length > 0 && (
                      <div className="pl-3.5 border-l-2 border-slate-200 space-y-1 text-[11px] text-slate-500 font-medium">
                        {state.loans
                          .filter(loan => loan.classification === 'BUSINESS_LOAN' || (loan.classification !== 'PERSONAL_LOAN' && loan.type !== 'PERSONAL_LOAN'))
                          .map((loan) => (
                            <div key={loan.id} className="flex justify-between">
                              <span>{loan.lenderOrBorrower}</span>
                              <span>{formatMoney(getLoanOutstanding(loan))}</span>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Personal Loans (If Combined Mode Toggled) */}
                {balanceSheetMode === 'COMBINED' && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block leading-none">
                      {isUrdu ? 'ذاتی قرضہ جات (غیر کاروباری)' : 'Personal Liabilities'}
                    </span>
                    <div className="bg-slate-50/50 rounded-2xl p-3 border border-slate-100 space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-700">{isUrdu ? 'ذاتی قرضے و ادھاریاں' : 'Personal Loans & Borrowings'}</span>
                        <span className="font-bold text-slate-950">{formatMoney(personalLoansValue)}</span>
                      </div>
                      {state.loans.filter(loan => loan.classification === 'PERSONAL_LOAN' || loan.type === 'PERSONAL_LOAN').length > 0 && (
                        <div className="pl-3.5 border-l-2 border-slate-200 space-y-1 text-[11px] text-slate-500 font-medium">
                          {state.loans
                            .filter(loan => loan.classification === 'PERSONAL_LOAN' || loan.type === 'PERSONAL_LOAN')
                            .map((loan) => (
                              <div key={loan.id} className="flex justify-between">
                                <span>{loan.lenderOrBorrower}</span>
                                <span>{formatMoney(getLoanOutstanding(loan))}</span>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Owner's Capital / Net Worth Equity */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block leading-none">
                    {isUrdu ? 'سرمایہ (CAPITAL)' : 'Equity / Capital'}
                  </span>
                  <div className="bg-blue-50/35 rounded-2xl p-3 border border-blue-100/50 flex justify-between items-center text-xs">
                    <div>
                      <span className="font-bold text-blue-900">{isUrdu ? 'مالک کا خالص سرمایہ / نیٹ ورتھ' : 'Owner’s Net Capital'}</span>
                      <span className="text-[10px] text-blue-700 block mt-0.5 leading-none font-medium">
                        {isUrdu ? 'اثاثے منفی کل واجبات' : 'Assets minus Liabilities'}
                      </span>
                    </div>
                    <span className="font-bold text-blue-950">{formatMoney(netWorth)}</span>
                  </div>
                </div>
              </div>

              {/* Total Liabilities & Equity (Double Underline) */}
              <div className="pt-4 border-t border-slate-100">
                <div className="border-t border-slate-200 border-b-4 border-double border-slate-900 pt-2 pb-1 font-bold flex justify-between text-xs text-slate-900 leading-none">
                  <span>{isUrdu ? 'کل واجبات اور سرمایہ' : 'TOTAL LIAB & EQUITY'}</span>
                  <span>{formatMoney(totalLiabilities + netWorth)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 1: Business Assets */}
      {tab === 'BUSINESS_ASSETS' && (
        <div className="space-y-3">
          <form onSubmit={handleAddBusinessAsset} className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-2xs space-y-3">
            <h3 className="font-bold text-xs text-slate-700 uppercase">
              {isUrdu ? '+ نیا دکان کا اثاثہ شامل کریں' : '+ Add New Business Asset'}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                type="text"
                required
                placeholder={isUrdu ? 'اثاثہ کا نام (مثلاً: فرنیچر/سولر)' : 'Asset Name (e.g. Solar System)'}
                value={bName}
                onChange={(e) => setBName(e.target.value)}
                className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#126A49]"
              />

              <input
                type="number"
                required
                placeholder={isUrdu ? 'خرید قیمت (Rs.)' : 'Purchase Price (Rs.)'}
                value={bPrice}
                onChange={(e) => setBPrice(e.target.value)}
                className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#126A49]"
              />

              <button
                type="submit"
                className="py-2 px-4 bg-[#126A49] hover:bg-[#0e543a] text-white font-bold text-xs rounded-xl cursor-pointer"
              >
                {isUrdu ? 'اثاثہ حفظ کریں' : 'Save Asset'}
              </button>
            </div>
          </form>

          <div className="bg-white border border-slate-200/80 rounded-3xl p-4 shadow-2xs divide-y divide-slate-100">
            {state.businessAssets.map((asset) => (
              <div key={asset.id} className="py-3 flex items-center justify-between text-xs">
                <div>
                  <h4 className="font-bold text-slate-900">{asset.name}</h4>
                  <p className="text-[10px] text-slate-500">{asset.category} • Purchased {asset.purchaseDate}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-black text-slate-900">{formatMoney(asset.currentValue)}</span>
                  {deleteConfirmId === asset.id ? (
                    <div className="flex items-center gap-1.5 animate-in fade-in zoom-in-95 duration-150">
                      <button
                        type="button"
                        onClick={() => {
                          onDeleteBusinessAsset?.(asset.id);
                          setDeleteConfirmId(null);
                        }}
                        className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] rounded-lg transition-all"
                      >
                        {isUrdu ? 'ہاں' : 'Confirm'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmId(null)}
                        className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-[10px] rounded-lg transition-all"
                      >
                        {isUrdu ? 'نہیں' : 'Cancel'}
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmId(asset.id)}
                      className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                      title={isUrdu ? 'حذف کریں' : 'Delete'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Personal Assets */}
      {tab === 'PERSONAL_ASSETS' && (
        <div className="space-y-3">
          <form onSubmit={handleAddPersonalAsset} className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-2xs space-y-3">
            <h3 className="font-bold text-xs text-slate-700 uppercase">
              {isUrdu ? '+ نیا ذاتی اثاثہ درج کریں (گھر/پلاٹ/گاڑی/سونا)' : '+ Add Personal Property (House/Plot/Gold)'}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                type="text"
                required
                placeholder={isUrdu ? 'اثاثہ کی تفصیل (مثلاً: رہائشی مکان)' : 'Property Title (e.g. Family House)'}
                value={pName}
                onChange={(e) => setPName(e.target.value)}
                className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#126A49]"
              />

              <input
                type="number"
                required
                placeholder={isUrdu ? 'اندازاً مالیت (Rs.)' : 'Estimated Value (Rs.)'}
                value={pValue}
                onChange={(e) => setPValue(e.target.value)}
                className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#126A49]"
              />

              <button
                type="submit"
                className="py-2 px-4 bg-[#126A49] hover:bg-[#0e543a] text-white font-bold text-xs rounded-xl cursor-pointer"
              >
                {isUrdu ? 'حفظ کریں' : 'Save Property'}
              </button>
            </div>
          </form>

          <div className="bg-white border border-slate-200/80 rounded-3xl p-4 shadow-2xs divide-y divide-slate-100">
            {state.personalAssets.map((pa) => (
              <div key={pa.id} className="py-3 flex items-center justify-between text-xs">
                <div>
                  <h4 className="font-bold text-slate-900">{pa.name}</h4>
                  <p className="text-[10px] text-slate-500">{pa.category}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-black text-slate-900">{formatMoney(pa.value)}</span>
                  {deleteConfirmId === pa.id ? (
                    <div className="flex items-center gap-1.5 animate-in fade-in zoom-in-95 duration-150">
                      <button
                        type="button"
                        onClick={() => {
                          onDeletePersonalAsset?.(pa.id);
                          setDeleteConfirmId(null);
                        }}
                        className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] rounded-lg transition-all"
                      >
                        {isUrdu ? 'ہاں' : 'Confirm'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmId(null)}
                        className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-[10px] rounded-lg transition-all"
                      >
                        {isUrdu ? 'نہیں' : 'Cancel'}
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmId(pa.id)}
                      className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                      title={isUrdu ? 'حذف کریں' : 'Delete'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Household Expenses & Drawings */}
      {tab === 'HOUSEHOLD_DRAWINGS' && (
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Receipt className="w-5 h-5 text-[#126A49]" />
              <span>{isUrdu ? 'گھریلو اور کاروباری اخراجات (Wealth Outflows)' : 'Household & Business Outflows'}</span>
            </h3>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (confirm(isUrdu ? 'کیا آپ واقعی گھریلو اخراجات کے تمام شعبوں کو زیرو (0) پر سیٹ کرنا چاہتے ہیں؟' : 'Are you sure you want to clear all household expenses and drawings to 0?')) {
                    const cleared = {
                      monthlyHouseholdExpense: 0,
                      schoolFee: 0,
                      utilityBills: 0,
                      personalDrawings: 0,
                      medical: 0,
                      food: 0,
                    };
                    setHh(cleared);
                    onUpdateHouseholdExpenses(cleared);
                  }
                }}
                className="px-4 py-2 bg-rose-50 text-rose-700 font-bold text-xs rounded-xl hover:bg-rose-100 border border-rose-200 cursor-pointer flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isUrdu ? 'صاف کریں' : 'Clear All'}</span>
              </button>
              <button
                type="button"
                onClick={handleSaveHousehold}
                className="px-4 py-2 bg-[#126A49] text-white font-bold text-xs rounded-xl hover:bg-[#0e543a] cursor-pointer flex items-center gap-1"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{isUrdu ? 'تبدیلیاں محفوظ کریں' : 'Save Changes'}</span>
              </button>
            </div>
          </div>

          <p className="text-xs text-amber-800 bg-amber-50 p-3 rounded-2xl border border-amber-200 font-medium">
            {isUrdu
              ? 'ضروری اطلاع: FBR انکم ٹیکس ریٹرن اور ویلتھ اسٹیٹمنٹ کو برابر کرنے کے لیے سالانہ گھریلو خرچ درج کرنا ضروری ہے۔ کاروباری اخراجات دکان کے لیجر سے حاصل کیے جاتے ہیں۔'
              : 'Important: Accurate household expense logging is required by FBR to balance annual Wealth Reconciliation. Business expenses are automatically sourced from your shop ledger.'}
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column: Household Expenses (Manual) */}
            <div className="space-y-4">
              <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-1.5 flex items-center gap-1.5">
                <Home className="w-4 h-4 text-emerald-600" />
                <span>{isUrdu ? 'گھریلو اخراجات اور ڈرائنگز (دستی اندراج)' : 'Household Expenses & Drawings (Manual)'}</span>
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-700 mb-1 leading-tight">
                    {isUrdu ? 'ماہانہ گھریلو راشن و باورچی خانہ خرچ:' : 'Monthly Kitchen & Ration (Rs.):'}
                  </label>
                  <input
                    type="number"
                    value={hh.monthlyHouseholdExpense}
                    onChange={(e) => setHh({ ...hh, monthlyHouseholdExpense: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-[#126A49] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold text-slate-700 mb-1 leading-tight">
                    {isUrdu ? 'بچوں کی سالانہ اسکول فیس:' : 'Children School & College Fees (Rs.):'}
                  </label>
                  <input
                    type="number"
                    value={hh.schoolFee || 0}
                    onChange={(e) => setHh({ ...hh, schoolFee: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-[#126A49] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold text-slate-700 mb-1 leading-tight">
                    {isUrdu ? 'گھر کا سالانہ بجلی، گیس، پانی بل:' : 'Annual Home Utility Bills (Rs.):'}
                  </label>
                  <input
                    type="number"
                    value={hh.utilityBills || 0}
                    onChange={(e) => setHh({ ...hh, utilityBills: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-[#126A49] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold text-slate-700 mb-1 leading-tight">
                    {isUrdu ? 'علاج و ادویات کے سالانہ اخراجات:' : 'Annual Medical & Healthcare (Rs.):'}
                  </label>
                  <input
                    type="number"
                    value={hh.medical || 0}
                    onChange={(e) => setHh({ ...hh, medical: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-[#126A49] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold text-slate-700 mb-1 leading-tight">
                    {isUrdu ? 'دیگر سالانہ کھانا پینا و سفر خرچ:' : 'Annual Food & Dining Out (Rs.):'}
                  </label>
                  <input
                    type="number"
                    value={hh.food || 0}
                    onChange={(e) => setHh({ ...hh, food: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-[#126A49] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold text-slate-700 mb-1 leading-tight">
                    {isUrdu ? 'دکان سے نکالے گئے ذاتی پیسے (ڈرائنگز):' : 'Personal Drawings from Shop (Rs.):'}
                  </label>
                  <input
                    type="number"
                    value={hh.personalDrawings || 0}
                    onChange={(e) => setHh({ ...hh, personalDrawings: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-[#126A49] focus:bg-white"
                  />
                </div>
              </div>

              {/* Total Manual Household Expenses Sum */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center text-xs">
                <span className="font-bold text-slate-600">
                  {isUrdu ? 'کل گھریلو اخراجات (سالانہ تخمینہ):' : 'Total Household Outflows (Annual):'}
                </span>
                <span className="font-extrabold text-slate-900 text-sm">
                  {formatMoney(
                    (hh.monthlyHouseholdExpense || 0) * 12 +
                      (hh.schoolFee || 0) +
                      (hh.utilityBills || 0) +
                      (hh.medical || 0) +
                      (hh.food || 0) +
                      (hh.personalDrawings || 0)
                  )}
                </span>
              </div>
            </div>

            {/* Right Column: Business Expenses (Calculated) */}
            <div className="space-y-4">
              <h4 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-1.5 flex items-center gap-1.5">
                <Briefcase className="w-4 h-4 text-emerald-600" />
                <span>{isUrdu ? 'کاروباری اخراجات (دکان کے لیجر سے خودکار)' : 'Shop Business Expenses (Auto-Calculated)'}</span>
              </h4>

              <div className="p-4 bg-emerald-50/50 rounded-3xl border border-emerald-100/80 space-y-3">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
                      {isUrdu ? `کل کاروباری اخراجات (${selectedYear})` : `Total Business Expenses (${selectedYear})`}
                    </span>
                    <span className="text-xl font-black text-emerald-950 block mt-0.5">
                      {formatMoney(summary.directExpenses)}
                    </span>
                  </div>
                  <div className="p-3 bg-white rounded-2xl shadow-3xs border border-emerald-200/50 text-[#126A49]">
                    <Receipt className="w-6 h-6 stroke-[1.5]" />
                  </div>
                </div>

                <p className="text-[10.5px] leading-relaxed text-emerald-850 font-medium bg-white/70 p-2.5 rounded-xl border border-emerald-100/50">
                  {isUrdu
                    ? 'لیجر ٹرانزیکشنز کی بنیاد پر خودکار حساب۔ سالانہ ویلتھ اسٹیٹمنٹ (FBR Wealth reconciliation) کو درست طور پر مرتب کرنے میں یہ بہت اہم کردار ادا کرتے ہیں۔'
                    : 'Automatically matched from your ledger transactions. This represents your shop operational costs utilized for annual FBR tax filing.'}
                </p>
              </div>

              {/* Categorized Breakdown of Business Expenses */}
              <div className="border border-slate-100 rounded-2xl overflow-hidden text-xs">
                <div className="bg-slate-50/80 px-3.5 py-2.5 font-bold text-slate-700 border-b border-slate-100">
                  {isUrdu ? 'کاروباری اخراجات کی تفصیل (لیجر کیٹیگریز)' : 'Expense Categories Breakdown'}
                </div>

                {Object.keys(expenseBreakdown).length === 0 ? (
                  <div className="p-5 text-center text-slate-400 font-medium">
                    {isUrdu
                      ? 'اس ٹیکس سال کے لیے دکان کے لیجر میں کوئی کاروباری خرچہ ریکارڈ نہیں ہے۔'
                      : 'No business expenses recorded in the shop ledger for this period.'}
                  </div>
                ) : (
                  <div className="divide-y divide-slate-50 max-h-[175px] overflow-y-auto">
                    {Object.entries(expenseBreakdown)
                      .sort((a, b) => b[1] - a[1])
                      .map(([category, amount]) => (
                        <div key={category} className="px-3.5 py-2 flex justify-between items-center hover:bg-slate-50/50">
                          <span className="font-bold text-slate-700 capitalize">
                            {category.replace(/_/g, ' ').toLowerCase()}
                          </span>
                          <span className="font-extrabold text-slate-900">{formatMoney(amount)}</span>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Loans */}
      {tab === 'LOANS' && (
        <div className="space-y-3">
          {/* Add Loan Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const target = e.currentTarget;
              const lender = (target.elements.namedItem('lender') as HTMLInputElement).value;
              const amountVal = parseFloat((target.elements.namedItem('amount') as HTMLInputElement).value) || 0;
              const classificationVal = (target.elements.namedItem('classification') as HTMLSelectElement).value as 'BUSINESS_LOAN' | 'PERSONAL_LOAN';

              onAddLoan({
                type: classificationVal === 'BUSINESS_LOAN' ? 'BUSINESS_LOAN' : 'PERSONAL_LOAN',
                classification: classificationVal,
                lenderOrBorrower: lender.trim(),
                amount: amountVal,
                outstandingAmount: amountVal,
                repaymentDate: new Date().toISOString().split('T')[0],
                interestRate: 0,
                notes: `Registered as ${classificationVal === 'BUSINESS_LOAN' ? 'Business Loan' : 'Personal Loan'}`,
              });

              target.reset();
            }}
            className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-2xs space-y-3"
          >
            <h3 className="font-bold text-xs text-slate-700 uppercase">
              {isUrdu ? '+ نیا قرضہ اکاؤنٹ شامل کریں' : '+ Register New Loan Account'}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <input
                type="text"
                name="lender"
                required
                placeholder={isUrdu ? 'قرض دینے والے کا نام' : 'Lender Name'}
                className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#126A49]"
              />

              <input
                type="number"
                name="amount"
                required
                placeholder={isUrdu ? 'ابتدائی رقم (Rs.)' : 'Initial Amount (Rs.)'}
                className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#126A49]"
              />

              <select
                name="classification"
                required
                className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#126A49]"
              >
                <option value="BUSINESS_LOAN">{isUrdu ? 'کاروباری قرضہ (Business)' : 'Business Loan'}</option>
                <option value="PERSONAL_LOAN">{isUrdu ? 'ذاتی قرضہ (Personal)' : 'Personal Loan'}</option>
              </select>

              <button
                type="submit"
                className="py-2 px-4 bg-[#126A49] hover:bg-[#0e543a] text-white font-bold text-xs rounded-xl cursor-pointer"
              >
                {isUrdu ? 'اکاؤنٹ محفوظ کریں' : 'Register Account'}
              </button>
            </div>
          </form>

          {/* Loans List */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs space-y-3">
            <h3 className="font-bold text-sm text-slate-900">
              {isUrdu ? 'دکان و ذاتی قرضہ جات (Outstanding Loans)' : 'Loans & Borrowings Register'}
            </h3>

            <div className="divide-y divide-slate-100">
              {state.loans.map((loan) => {
                const dynamicOutstanding = (() => {
                  const initialAmount = loan.amount;
                  const taken = state.transactions
                    .filter(t => t.type === 'LOAN_TAKEN' && t.loanAccountId === loan.id)
                    .reduce((sum, t) => sum + t.amount, 0);
                  const repaid = state.transactions
                    .filter(t => t.type === 'PAYMENT' && t.category === 'LOAN_REPAYMENT' && t.loanAccountId === loan.id)
                    .reduce((sum, t) => sum + t.amount, 0);
                  return initialAmount + taken - repaid;
                })();

                const isBusiness = loan.classification === 'BUSINESS_LOAN' || (loan.classification !== 'PERSONAL_LOAN' && loan.type !== 'PERSONAL_LOAN');

                return (
                  <div key={loan.id} className="py-4 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="font-extrabold text-slate-900">{loan.lenderOrBorrower}</h4>
                          <span className={`text-[9px] px-1.5 py-0.2 rounded font-extrabold ${isBusiness ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                            {isBusiness ? (isUrdu ? 'کاروباری' : 'BUSINESS') : (isUrdu ? 'ذاتی' : 'PERSONAL')}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          {isUrdu ? 'ابتدائی رقم:' : 'Initial:'} {formatMoney(loan.amount)} • Repayment Due: {loan.repaymentDate || 'N/A'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-rose-700">{formatMoney(dynamicOutstanding)}</span>
                        <button
                          type="button"
                          onClick={() => {
                            if (selectedLoanId === loan.id) {
                              setSelectedLoanId(null);
                            } else {
                              setSelectedLoanId(loan.id);
                              setMovementType('REPAYMENT');
                            }
                          }}
                          className="text-[11px] font-black text-emerald-700 hover:text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-xl transition-all cursor-pointer"
                        >
                          {isUrdu ? 'لیجر / انٹری' : 'Log Entry'}
                        </button>

                        {deleteConfirmId === loan.id ? (
                          <div className="flex items-center gap-1.5 animate-in fade-in zoom-in-95 duration-150">
                            <button
                              type="button"
                              onClick={() => {
                                onDeleteLoan?.(loan.id);
                                setDeleteConfirmId(null);
                              }}
                              className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] rounded-lg transition-all"
                            >
                              {isUrdu ? 'ہاں' : 'Confirm'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmId(null)}
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-[10px] rounded-lg transition-all"
                            >
                              {isUrdu ? 'نہیں' : 'Cancel'}
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(loan.id)}
                            className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                            title={isUrdu ? 'حذف کریں' : 'Delete'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Inline Transaction logger and details for the specific loan */}
                    {selectedLoanId === loan.id && (
                      <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 animate-in fade-in slide-in-from-top-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-extrabold text-slate-800">
                            {isUrdu ? 'ٹرانزیکشن ریکارڈ کریں:' : 'Record Transaction:'}
                          </span>
                          <div className="flex gap-1.5">
                            <button
                              type="button"
                              onClick={() => setMovementType('TAKEN')}
                              className={`px-2 py-0.5 text-[10px] font-bold rounded-lg border transition-colors ${movementType === 'TAKEN' ? 'bg-emerald-50 border-emerald-600 text-emerald-700' : 'bg-white text-slate-600'}`}
                            >
                              {isUrdu ? 'مزید قرضہ لیا (+ Taken)' : '+ Loan Taken'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setMovementType('REPAYMENT')}
                              className={`px-2 py-0.5 text-[10px] font-bold rounded-lg border transition-colors ${movementType === 'REPAYMENT' ? 'bg-rose-50 border-rose-600 text-rose-700' : 'bg-white text-slate-600'}`}
                            >
                              {isUrdu ? 'قرض واپسی (- Repayment)' : '- Repayment'}
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <input
                            type="number"
                            placeholder={isUrdu ? 'رقم (Rs.)' : 'Amount (Rs.)'}
                            value={movementAmount}
                            onChange={(e) => setMovementAmount(e.target.value)}
                            className="px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#126A49]"
                          />

                          <select
                            value={movementPaymentMethod}
                            onChange={(e) => setMovementPaymentMethod(e.target.value as PaymentMethod)}
                            className="px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#126A49]"
                          >
                            <option value="CASH">{isUrdu ? 'نقد (Cash)' : 'Cash'}</option>
                            <option value="BANK">{isUrdu ? 'بینک (Bank)' : 'Bank'}</option>
                            <option value="EASYPAISA">EasyPaisa</option>
                            <option value="JAZZCASH">JazzCash</option>
                            <option value="NAYAPAY">NayaPay</option>
                            <option value="SADAPAY">SadaPay</option>
                          </select>

                          <button
                            type="button"
                            onClick={() => {
                              const amt = parseFloat(movementAmount);
                              if (isNaN(amt) || amt <= 0) return;

                              onAddTransaction({
                                type: movementType === 'TAKEN' ? 'LOAN_TAKEN' : 'PAYMENT',
                                amount: amt,
                                category: movementType === 'TAKEN' ? 'LOAN_TAKEN' : 'LOAN_REPAYMENT',
                                paymentMethod: movementPaymentMethod,
                                partyName: loan.lenderOrBorrower,
                                date: new Date().toISOString(),
                                notes: movementNotes.trim() || `${movementType === 'TAKEN' ? 'Additional loan taken' : 'Loan repayment'}`,
                                loanAccountId: loan.id,
                              });

                              setMovementAmount('');
                              setMovementNotes('');
                              setSelectedLoanId(null);
                            }}
                            className="py-2 px-4 bg-[#126A49] hover:bg-[#0e543a] text-white font-bold text-xs rounded-xl cursor-pointer"
                          >
                            {isUrdu ? 'انٹری محفوظ کریں' : 'Save Entry'}
                          </button>
                        </div>

                        {/* Recent linked entries */}
                        {(() => {
                          const linkedTxs = state.transactions.filter(t => t.loanAccountId === loan.id);
                          if (linkedTxs.length > 0) {
                            return (
                              <div className="pt-2 border-t border-slate-200/60">
                                <h5 className="text-[10px] font-extrabold text-slate-500 uppercase flex items-center gap-1 mb-1">
                                  <History className="w-3 h-3" />
                                  <span>{isUrdu ? 'قرضہ کی ٹرانزیکشن ہسٹری:' : 'Linked Transactions History:'}</span>
                                </h5>
                                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                                  {linkedTxs.map(t => (
                                    <div key={t.id} className="flex justify-between items-center text-[11px] bg-white px-2.5 py-1.5 rounded-lg border border-slate-100">
                                      <span className="font-bold text-slate-700">
                                        {t.notes || (t.type === 'LOAN_TAKEN' ? 'Loan Taken' : 'Loan Repayment')}
                                      </span>
                                      <span className={`font-extrabold ${t.type === 'LOAN_TAKEN' ? 'text-emerald-700' : 'text-rose-700'}`}>
                                        {t.type === 'LOAN_TAKEN' ? '+' : '-'}{formatMoney(t.amount)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
