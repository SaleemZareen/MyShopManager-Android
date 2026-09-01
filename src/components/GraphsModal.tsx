import React, { useState } from 'react';
import { AppState } from '../types';
import { formatMoney } from '../utils/format';
import {
  X,
  BarChart2,
  TrendingUp,
  ShoppingBag,
  Truck,
  Receipt,
  HandCoins,
  PieChart as PieIcon,
  Layers,
  Wallet,
  BarChart3,
  LineChart as LineChartIcon,
  Activity,
  ArrowLeft,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts';

interface GraphsModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: AppState;
  isUrdu: boolean;
}

type GraphTab = 'SALE' | 'PURCHASE' | 'EXPENSE' | 'UDHAAR' | 'SUPPLIER_PAYMENT';
type ChartType = 'area' | 'bar' | 'line' | 'pie';

export const GraphsModal: React.FC<GraphsModalProps> = ({
  isOpen,
  onClose,
  state,
  isUrdu,
}) => {
  const [activeTab, setActiveTab] = useState<GraphTab>('SALE');
  const [chartType, setChartType] = useState<ChartType>('area');

  if (!isOpen) return null;

  // Process Sales Data
  const salesTx = state.transactions.filter((t) => t.type === 'SALE');
  const totalSales = salesTx.reduce((sum, t) => sum + t.amount, 0);

  // Process Supplier Payment Data
  const paymentTx = state.transactions.filter((t) => t.type === 'PAYMENT');
  const totalSupplierPayments = paymentTx.reduce((sum, t) => sum + t.amount, 0);

  // Group transactions by date for trend
  const dateMap: Record<
    string,
    { sales: number; purchases: number; expenses: number; supplierPayments: number }
  > = {};
  state.transactions.forEach((t) => {
    const d = t.date.split('T')[0];
    if (!dateMap[d]) {
      dateMap[d] = { sales: 0, purchases: 0, expenses: 0, supplierPayments: 0 };
    }
    if (t.type === 'SALE') dateMap[d].sales += t.amount;
    if (t.type === 'PURCHASE') dateMap[d].purchases += t.amount;
    if (t.type === 'EXPENSE') dateMap[d].expenses += t.amount;
    if (t.type === 'PAYMENT') dateMap[d].supplierPayments += t.amount;
  });

  const timeSeriesData = Object.keys(dateMap)
    .sort()
    .slice(-7)
    .map((date) => ({
      date: date.substring(5),
      sales: dateMap[date].sales,
      purchases: dateMap[date].purchases,
      expenses: dateMap[date].expenses,
      supplierPayments: dateMap[date].supplierPayments,
    }));

  // Expense Category Breakdown
  const expenseCatMap: Record<string, number> = {};
  state.transactions
    .filter((t) => t.type === 'EXPENSE')
    .forEach((t) => {
      const cat = t.category || 'General';
      expenseCatMap[cat] = (expenseCatMap[cat] || 0) + t.amount;
    });

  const expensePieData = Object.keys(expenseCatMap).map((cat, i) => ({
    name: cat,
    value: expenseCatMap[cat],
    color: ['#e11d48', '#2563eb', '#d97706', '#059669', '#7c3aed'][i % 5],
  }));

  // Udhaar Data
  const totalReceivables = state.customers.reduce((s, c) => s + c.totalCredit, 0);
  const totalPayables = state.suppliers.reduce((s, sup) => s + sup.totalPayable, 0);

  const udhaarBarData = [
    { name: isUrdu ? 'گاہک بقایا (Receivables)' : 'Customer Udhaar', amount: totalReceivables, fill: '#d97706' },
    { name: isUrdu ? 'سپلائر بل (Payables)' : 'Supplier Payables', amount: totalPayables, fill: '#4f46e5' },
  ];

  const renderChartSwitcher = (allowedTypes: ChartType[] = ['area', 'bar', 'line']) => (
    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-[10px] font-bold">
      {allowedTypes.includes('area') && (
        <button
          type="button"
          onClick={() => setChartType('area')}
          className={`px-2 py-1 rounded-lg flex items-center gap-1 cursor-pointer transition-all ${
            chartType === 'area'
              ? 'bg-white text-emerald-800 font-extrabold shadow-2xs border border-slate-200'
              : 'text-slate-600 hover:text-slate-900'
          }`}
          title={isUrdu ? 'ایریا گراف' : 'Area Chart'}
        >
          <Activity className="w-3 h-3 text-emerald-600" />
          <span>{isUrdu ? 'ایریا' : 'Area'}</span>
        </button>
      )}
      {allowedTypes.includes('bar') && (
        <button
          type="button"
          onClick={() => setChartType('bar')}
          className={`px-2 py-1 rounded-lg flex items-center gap-1 cursor-pointer transition-all ${
            chartType === 'bar'
              ? 'bg-white text-indigo-800 font-extrabold shadow-2xs border border-slate-200'
              : 'text-slate-600 hover:text-slate-900'
          }`}
          title={isUrdu ? 'بار چارٹ' : 'Bar Chart'}
        >
          <BarChart3 className="w-3 h-3 text-indigo-600" />
          <span>{isUrdu ? 'بار' : 'Bar'}</span>
        </button>
      )}
      {allowedTypes.includes('line') && (
        <button
          type="button"
          onClick={() => setChartType('line')}
          className={`px-2 py-1 rounded-lg flex items-center gap-1 cursor-pointer transition-all ${
            chartType === 'line'
              ? 'bg-white text-sky-800 font-extrabold shadow-2xs border border-slate-200'
              : 'text-slate-600 hover:text-slate-900'
          }`}
          title={isUrdu ? 'لائن چارٹ' : 'Line Chart'}
        >
          <LineChartIcon className="w-3 h-3 text-sky-600" />
          <span>{isUrdu ? 'لائن' : 'Line'}</span>
        </button>
      )}
      {allowedTypes.includes('pie') && (
        <button
          type="button"
          onClick={() => setChartType('pie')}
          className={`px-2 py-1 rounded-lg flex items-center gap-1 cursor-pointer transition-all ${
            chartType === 'pie'
              ? 'bg-white text-rose-800 font-extrabold shadow-2xs border border-slate-200'
              : 'text-slate-600 hover:text-slate-900'
          }`}
          title={isUrdu ? 'پائے چارٹ' : 'Pie Chart'}
        >
          <PieIcon className="w-3 h-3 text-rose-600" />
          <span>{isUrdu ? 'پائے' : 'Pie'}</span>
        </button>
      )}
    </div>
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex flex-col w-full h-[100dvh] overflow-hidden animate-in fade-in duration-200">
      <div className="bg-slate-50 w-full h-full flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white px-4 sm:px-6 py-3 flex items-center justify-between border-b border-slate-700 shrink-0 pt-[calc(env(safe-area-inset-top,0px)+0.75rem)]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <BarChart2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-black text-base leading-tight">
                {isUrdu ? 'کاروباری چارٹس اور گراف' : 'Dukan Analytics & Graphs'}
              </h2>
              <p className="text-[11px] text-slate-300 font-medium">
                {isUrdu ? 'فروخت، خریداری، اخراجات، ادھار اور ادائیگیوں کا گرافک جائزہ' : 'Visual performance graphics for all heads'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              title={isUrdu ? 'واپس' : 'Back'}
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="bg-slate-100 p-2 grid grid-cols-5 gap-1 border-b border-slate-200">
          <button
            type="button"
            onClick={() => {
              setActiveTab('SALE');
              if (chartType === 'pie') setChartType('area');
            }}
            className={`py-2 px-1 rounded-xl font-black text-[10px] sm:text-xs flex flex-col sm:flex-row items-center justify-center gap-1 transition-all cursor-pointer text-center ${
              activeTab === 'SALE'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white text-slate-700 hover:bg-slate-200'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5 shrink-0" />
            <span className="whitespace-normal break-words leading-tight text-center">{isUrdu ? 'فروخت' : 'Sales'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('PURCHASE');
              if (chartType === 'pie') setChartType('area');
            }}
            className={`py-2 px-1 rounded-xl font-black text-[10px] sm:text-xs flex flex-col sm:flex-row items-center justify-center gap-1 transition-all cursor-pointer text-center ${
              activeTab === 'PURCHASE'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Truck className="w-3.5 h-3.5 shrink-0" />
            <span className="whitespace-normal break-words leading-tight text-center">{isUrdu ? 'خریداری' : 'Purchase'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('EXPENSE');
            }}
            className={`py-2 px-1 rounded-xl font-black text-[10px] sm:text-xs flex flex-col sm:flex-row items-center justify-center gap-1 transition-all cursor-pointer text-center ${
              activeTab === 'EXPENSE'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-white text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Receipt className="w-3.5 h-3.5 shrink-0" />
            <span className="whitespace-normal break-words leading-tight text-center">{isUrdu ? 'اخراجات' : 'Expenses'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('UDHAAR');
              if (chartType === 'pie') setChartType('bar');
            }}
            className={`py-2 px-1 rounded-xl font-black text-[10px] sm:text-xs flex flex-col sm:flex-row items-center justify-center gap-1 transition-all cursor-pointer text-center ${
              activeTab === 'UDHAAR'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-white text-slate-700 hover:bg-slate-200'
            }`}
          >
            <HandCoins className="w-3.5 h-3.5 shrink-0" />
            <span className="whitespace-normal break-words leading-tight text-center">{isUrdu ? 'ادھار' : 'Udhaar'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('SUPPLIER_PAYMENT');
              if (chartType === 'pie') setChartType('area');
            }}
            className={`py-2 px-1 rounded-xl font-black text-[10px] sm:text-xs flex flex-col sm:flex-row items-center justify-center gap-1 transition-all cursor-pointer text-center ${
              activeTab === 'SUPPLIER_PAYMENT'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-white text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Wallet className="w-3.5 h-3.5 shrink-0" />
            <span className="whitespace-normal break-words leading-tight text-center">{isUrdu ? 'سپلائر ادا' : 'Pay Supplier'}</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 overflow-y-auto space-y-4">
          {/* TAB 1: SALES GRAPH */}
          {activeTab === 'SALE' && (
            <div className="space-y-4">
              <div className="bg-emerald-50 border border-emerald-200/80 p-3 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-emerald-800 uppercase">
                    {isUrdu ? 'کل ریکارڈ شدہ فروخت' : 'Total Recorded Sales'}
                  </span>
                  <p className="text-xl font-black text-emerald-950">
                    {formatMoney(totalSales)}
                  </p>
                </div>
                <div className="p-2 rounded-xl bg-emerald-600 text-white font-bold text-xs">
                  {salesTx.length} {isUrdu ? 'فروخت اینٹریز' : 'Sales Orders'}
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200">
                <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                  <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                    <span>{isUrdu ? 'روزانہ فروخت کا گراف (Daily Sales Trend)' : 'Daily Sales Trend'}</span>
                  </h4>
                  {renderChartSwitcher(['area', 'bar', 'line'])}
                </div>

                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    {chartType === 'bar' ? (
                      <BarChart data={timeSeriesData}>
                        <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                        <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `${v / 1000}k`} />
                        <Tooltip formatter={(value: any) => [`Rs. ${Number(value || 0).toLocaleString()}`, 'Sales']} />
                        <Bar dataKey="sales" fill="#10b981" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    ) : chartType === 'line' ? (
                      <LineChart data={timeSeriesData}>
                        <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                        <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `${v / 1000}k`} />
                        <Tooltip formatter={(value: any) => [`Rs. ${Number(value || 0).toLocaleString()}`, 'Sales']} />
                        <Line type="monotone" dataKey="sales" stroke="#126A49" strokeWidth={3} dot={{ r: 4 }} />
                      </LineChart>
                    ) : (
                      <AreaChart data={timeSeriesData}>
                        <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                        <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `${v / 1000}k`} />
                        <Tooltip formatter={(value: any) => [`Rs. ${Number(value || 0).toLocaleString()}`, 'Sales']} />
                        <Area type="monotone" dataKey="sales" stroke="#126A49" fill="#10b981" fillOpacity={0.25} strokeWidth={2} />
                      </AreaChart>
                    )}
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PURCHASE GRAPH */}
          {activeTab === 'PURCHASE' && (
            <div className="space-y-4">
              <div className="bg-indigo-50 border border-indigo-200/80 p-3 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-indigo-800 uppercase">
                    {isUrdu ? 'کل ہول سیل خریداری' : 'Total Procurement'}
                  </span>
                  <p className="text-xl font-black text-indigo-950">
                    {formatMoney(state.transactions.filter((t) => t.type === 'PURCHASE').reduce((s, t) => s + t.amount, 0))}
                  </p>
                </div>
                <div className="p-2 rounded-xl bg-indigo-600 text-white font-bold text-xs">
                  {state.inventory.length} {isUrdu ? 'اسٹاک آئٹمز' : 'Inventory Items'}
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200">
                <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                  <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                    <Truck className="w-4 h-4 text-indigo-600" />
                    <span>{isUrdu ? 'روزانہ خریداری کا گراف' : 'Purchases Trend Over Time'}</span>
                  </h4>
                  {renderChartSwitcher(['area', 'bar', 'line'])}
                </div>

                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    {chartType === 'bar' ? (
                      <BarChart data={timeSeriesData}>
                        <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                        <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `${v / 1000}k`} />
                        <Tooltip formatter={(value: any) => [`Rs. ${Number(value || 0).toLocaleString()}`, 'Purchases']} />
                        <Bar dataKey="purchases" fill="#4f46e5" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    ) : chartType === 'line' ? (
                      <LineChart data={timeSeriesData}>
                        <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                        <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `${v / 1000}k`} />
                        <Tooltip formatter={(value: any) => [`Rs. ${Number(value || 0).toLocaleString()}`, 'Purchases']} />
                        <Line type="monotone" dataKey="purchases" stroke="#4338ca" strokeWidth={3} dot={{ r: 4 }} />
                      </LineChart>
                    ) : (
                      <AreaChart data={timeSeriesData}>
                        <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                        <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `${v / 1000}k`} />
                        <Tooltip formatter={(value: any) => [`Rs. ${Number(value || 0).toLocaleString()}`, 'Purchases']} />
                        <Area type="monotone" dataKey="purchases" stroke="#4338ca" fill="#6366f1" fillOpacity={0.25} strokeWidth={2} />
                      </AreaChart>
                    )}
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: EXPENSES GRAPH */}
          {activeTab === 'EXPENSE' && (
            <div className="space-y-4">
              <div className="bg-rose-50 border border-rose-200/80 p-3 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-rose-800 uppercase">
                    {isUrdu ? 'کل دکان اخراجات' : 'Total Shop Expenses'}
                  </span>
                  <p className="text-xl font-black text-rose-950">
                    {formatMoney(state.transactions.filter((t) => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0))}
                  </p>
                </div>
                <div className="p-2 rounded-xl bg-rose-600 text-white font-bold text-xs">
                  {expensePieData.length} {isUrdu ? 'کیٹگریز' : 'Categories'}
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200">
                <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                  <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                    <Receipt className="w-4 h-4 text-rose-600" />
                    <span>{isUrdu ? 'اخراجات کا چارٹ' : 'Expenses Analysis'}</span>
                  </h4>
                  {renderChartSwitcher(['pie', 'area', 'bar', 'line'])}
                </div>

                {chartType === 'pie' ? (
                  expensePieData.length > 0 ? (
                    <div className="h-56 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={expensePieData}
                            cx="50%"
                            cy="50%"
                            outerRadius={75}
                            dataKey="value"
                            label={(e) => `${e.name}: Rs.${e.value}`}
                          >
                            {expensePieData.map((entry, idx) => (
                              <Cell key={`c_${idx}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 text-center py-8">
                      {isUrdu ? 'ابھی کوئی خرچ درج نہیں ہے' : 'No expenses recorded yet.'}
                    </p>
                  )
                ) : (
                  <div className="h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      {chartType === 'bar' ? (
                        <BarChart data={timeSeriesData}>
                          <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                          <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `${v / 1000}k`} />
                          <Tooltip formatter={(value: any) => [`Rs. ${Number(value || 0).toLocaleString()}`, 'Expenses']} />
                          <Bar dataKey="expenses" fill="#e11d48" radius={[6, 6, 0, 0]} />
                        </BarChart>
                      ) : chartType === 'line' ? (
                        <LineChart data={timeSeriesData}>
                          <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                          <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `${v / 1000}k`} />
                          <Tooltip formatter={(value: any) => [`Rs. ${Number(value || 0).toLocaleString()}`, 'Expenses']} />
                          <Line type="monotone" dataKey="expenses" stroke="#be123c" strokeWidth={3} dot={{ r: 4 }} />
                        </LineChart>
                      ) : (
                        <AreaChart data={timeSeriesData}>
                          <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                          <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `${v / 1000}k`} />
                          <Tooltip formatter={(value: any) => [`Rs. ${Number(value || 0).toLocaleString()}`, 'Expenses']} />
                          <Area type="monotone" dataKey="expenses" stroke="#be123c" fill="#f43f5e" fillOpacity={0.25} strokeWidth={2} />
                        </AreaChart>
                      )}
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: UDHAAR / KHATA GRAPH */}
          {activeTab === 'UDHAAR' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-amber-50 p-3 rounded-2xl border border-amber-200">
                  <span className="text-[10px] font-bold text-amber-800 uppercase">
                    {isUrdu ? 'گاہک بقایا (Receivables)' : 'Customer Credit'}
                  </span>
                  <p className="text-base font-black text-amber-950 mt-0.5">
                    {formatMoney(totalReceivables)}
                  </p>
                </div>
                <div className="bg-indigo-50 p-3 rounded-2xl border border-indigo-200">
                  <span className="text-[10px] font-bold text-indigo-800 uppercase">
                    {isUrdu ? 'سپلائر بل (Payables)' : 'Supplier Dues'}
                  </span>
                  <p className="text-base font-black text-indigo-950 mt-0.5">
                    {formatMoney(totalPayables)}
                  </p>
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200">
                <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                  <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-amber-600" />
                    <span>{isUrdu ? 'ادھار اور سپلائر واجبات کا موازنہ' : 'Receivables vs Payables Comparison'}</span>
                  </h4>
                  {renderChartSwitcher(['bar', 'area', 'line'])}
                </div>

                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    {chartType === 'area' ? (
                      <AreaChart data={udhaarBarData}>
                        <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                        <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `${v / 1000}k`} />
                        <Tooltip formatter={(value: any) => [`Rs. ${Number(value || 0).toLocaleString()}`, 'Amount']} />
                        <Area type="monotone" dataKey="amount" stroke="#d97706" fill="#f59e0b" fillOpacity={0.3} strokeWidth={2} />
                      </AreaChart>
                    ) : chartType === 'line' ? (
                      <LineChart data={udhaarBarData}>
                        <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                        <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `${v / 1000}k`} />
                        <Tooltip formatter={(value: any) => [`Rs. ${Number(value || 0).toLocaleString()}`, 'Amount']} />
                        <Line type="monotone" dataKey="amount" stroke="#d97706" strokeWidth={3} dot={{ r: 5 }} />
                      </LineChart>
                    ) : (
                      <BarChart data={udhaarBarData}>
                        <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                        <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `${v / 1000}k`} />
                        <Tooltip formatter={(value: any) => [`Rs. ${Number(value || 0).toLocaleString()}`, 'Amount']} />
                        <Bar dataKey="amount" radius={[8, 8, 0, 0]}>
                          {udhaarBarData.map((entry, index) => (
                            <Cell key={`cell_${index}`} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    )}
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: SUPPLIER PAYMENTS GRAPH */}
          {activeTab === 'SUPPLIER_PAYMENT' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-purple-50 p-3 rounded-2xl border border-purple-200">
                  <span className="text-[10px] font-bold text-purple-800 uppercase">
                    {isUrdu ? 'کل سپلائر ادائگیاں' : 'Total Supplier Payments'}
                  </span>
                  <p className="text-base font-black text-purple-950 mt-0.5">
                    {formatMoney(totalSupplierPayments)}
                  </p>
                </div>
                <div className="bg-indigo-50 p-3 rounded-2xl border border-indigo-200">
                  <span className="text-[10px] font-bold text-indigo-800 uppercase">
                    {isUrdu ? 'بقايا سپلائر واجبات' : 'Remaining Supplier Payables'}
                  </span>
                  <p className="text-base font-black text-indigo-950 mt-0.5">
                    {formatMoney(totalPayables)}
                  </p>
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200">
                <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                  <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                    <Wallet className="w-4 h-4 text-purple-600" />
                    <span>{isUrdu ? 'سپلائر ادائیگیوں کا رجحان' : 'Supplier Payments Trend Over Time'}</span>
                  </h4>
                  {renderChartSwitcher(['area', 'bar', 'line'])}
                </div>

                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    {chartType === 'bar' ? (
                      <BarChart data={timeSeriesData}>
                        <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                        <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `${v / 1000}k`} />
                        <Tooltip formatter={(value: any) => [`Rs. ${Number(value || 0).toLocaleString()}`, 'Payments']} />
                        <Bar dataKey="supplierPayments" fill="#9333ea" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    ) : chartType === 'line' ? (
                      <LineChart data={timeSeriesData}>
                        <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                        <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `${v / 1000}k`} />
                        <Tooltip formatter={(value: any) => [`Rs. ${Number(value || 0).toLocaleString()}`, 'Payments']} />
                        <Line type="monotone" dataKey="supplierPayments" stroke="#7e22ce" strokeWidth={3} dot={{ r: 4 }} />
                      </LineChart>
                    ) : (
                      <AreaChart data={timeSeriesData}>
                        <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                        <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `${v / 1000}k`} />
                        <Tooltip formatter={(value: any) => [`Rs. ${Number(value || 0).toLocaleString()}`, 'Payments']} />
                        <Area type="monotone" dataKey="supplierPayments" stroke="#7e22ce" fill="#a855f7" fillOpacity={0.25} strokeWidth={2} />
                      </AreaChart>
                    )}
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

