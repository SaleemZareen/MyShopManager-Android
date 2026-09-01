import React from 'react';
import { AppState } from '../types';
import { formatMoney } from '../utils/format';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { BarChart2, PieChart as PieIcon, TrendingUp } from 'lucide-react';

interface AnalyticsModuleProps {
  state: AppState;
  isUrdu: boolean;
}

export const AnalyticsModule: React.FC<AnalyticsModuleProps> = ({ state, isUrdu }) => {
  // Process real monthly data for chart dynamically
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthlyTrendMap: Record<string, { sales: number; purchases: number; profit: number }> = {};
  
  // Initialize last 6 months to ensure we always have 6 columns
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = `${months[d.getMonth()]} ${d.getFullYear().toString().slice(-2)}`;
    monthlyTrendMap[label] = { sales: 0, purchases: 0, profit: 0 };
  }

  state.transactions.forEach((t) => {
    const d = new Date(t.date);
    if (!isNaN(d.getTime())) {
      const label = `${months[d.getMonth()]} ${d.getFullYear().toString().slice(-2)}`;
      if (monthlyTrendMap[label] !== undefined) {
        if (t.type === 'SALE') {
          monthlyTrendMap[label].sales += t.amount;
          monthlyTrendMap[label].profit += t.amount;
        } else if (t.type === 'PURCHASE') {
          monthlyTrendMap[label].purchases += t.amount;
          monthlyTrendMap[label].profit -= t.amount * 0.85;
        } else if (t.type === 'EXPENSE') {
          monthlyTrendMap[label].profit -= t.amount;
        }
      }
    }
  });

  const monthlyTrendData = Object.keys(monthlyTrendMap).map((key) => {
    const data = monthlyTrendMap[key];
    return {
      month: key,
      sales: data.sales,
      purchases: data.purchases,
      profit: Math.round(data.profit),
    };
  });

  // Process real bank/wallet distribution dynamically
  const totalBalance = state.bankAccounts.reduce((sum, a) => sum + a.balance, 0);
  const paymentMethodData = totalBalance > 0 
    ? state.bankAccounts.map((acc, index) => {
        const colors = ['#126A49', '#2563eb', '#16a34a', '#dc2626', '#7c3aed', '#d97706'];
        return {
          name: acc.accountTitle,
          value: acc.balance,
          color: colors[index % colors.length]
        };
      })
    : [
        { name: isUrdu ? 'کیش بیلنس (خالی)' : 'Cash (Empty)', value: 1, color: '#126A49' }
      ];

  return (
    <div className="space-y-4 pb-20">
      <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-2xs">
        <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
          <BarChart2 className="w-5 h-5 text-[#126A49]" />
          <span>{isUrdu ? 'کاروباری تجزیہ اور گرافکس' : 'Business Analytics & Visual Charts'}</span>
        </h2>
        <p className="text-xs text-slate-500 font-medium">
          {isUrdu
            ? 'ماہانہ فروخت، اخراجات اور کیش فلو کے گرافک چارٹس'
            : 'Visual breakdown of monthly sales, expenses, net profits & wallet flows.'}
        </p>
      </div>

      {/* Bar Chart: Sales vs Purchases vs Profit */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#126A49]" />
            <span>{isUrdu ? 'ماہانہ فروخت بمقابلہ منافع' : 'Monthly Sales vs Profit Trend'}</span>
          </h3>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyTrendData}>
              <XAxis dataKey="month" stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `${v / 1000}k`} />
              <Tooltip formatter={(value: any) => [`Rs. ${Number(value || 0).toLocaleString()}`, '']} />
              <Bar dataKey="sales" fill="#126A49" name="Sales" radius={[6, 6, 0, 0]} />
              <Bar dataKey="profit" fill="#10b981" name="Profit" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Pie Chart: Cash vs Bank vs Digital Wallets */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs space-y-3">
        <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
          <PieIcon className="w-4 h-4 text-indigo-600" />
          <span>{isUrdu ? 'رقوم کی تقسیم (کیش بمقابلہ ڈیجیٹل والٹ)' : 'Liquidity & Wallet Distribution'}</span>
        </h3>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={paymentMethodData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={4}
                dataKey="value"
              >
                {paymentMethodData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(val: any) => [`Rs. ${Number(val || 0).toLocaleString()}`, '']} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
