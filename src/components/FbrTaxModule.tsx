import React, { useState } from 'react';
import { AppState } from '../types';
import { calculateFbrSummary, TAX_YEAR_CONFIGS } from '../utils/taxEngine';
import { formatMoney, formatFinancialValue } from '../utils/format';
import { FileCheck, ShieldAlert, AlertTriangle, Layers, Calendar, CheckCircle2, ChevronRight, HelpCircle } from 'lucide-react';

interface FbrTaxModuleProps {
  state: AppState;
  isUrdu: boolean;
  onSelectTaxYear: (year: '2024' | '2025' | '2026') => void;
  onUpdateTaxRecord: (record: any) => void;
}

export const FbrTaxModule: React.FC<FbrTaxModuleProps> = ({
  state,
  isUrdu,
  onSelectTaxYear,
  onUpdateTaxRecord,
}) => {
  const summary = calculateFbrSummary(state);
  const activeYearConfig = TAX_YEAR_CONFIGS[state.taxRecord.selectedTaxYear] || TAX_YEAR_CONFIGS['2026'];

  const [activeTab, setActiveTab] = useState<'SUMMARY' | 'IRIS_MAPPINGS' | 'WEALTH_RECON' | 'WITHHOLDING_TAX'>('SUMMARY');

  return (
    <div className="space-y-4 pb-20">
      {/* Header - Premium Light Color Card */}
      <div className="bg-emerald-50/60 text-slate-950 p-5 -mx-4 -mt-4 mb-4 rounded-b-3xl border-b border-emerald-100/80 space-y-3 print:hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-[#126A49]">
              <FileCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-sm sm:text-lg font-bold tracking-tight">
                {isUrdu ? 'FBR انکم ٹیکس و ویلتھ ریکارڈ تیاری' : 'FBR IRIS Income Tax & Wealth Prep'}
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-600 font-medium">
                {isUrdu
                  ? 'سول پروپرائیٹر اور چھوٹے دکانداروں کے لیے سالانہ ٹیکس ڈیٹا میپنگ'
                  : 'Automated FBR IRIS code mapping layer for Sole Proprietors & Retailers.'}
              </p>
            </div>
          </div>

          {/* Tax Year Selector */}
          <div className="flex items-center gap-1.5 bg-white/90 p-1 rounded-2xl border border-emerald-100 shadow-3xs">
            <Calendar className="w-4 h-4 text-[#126A49] ml-2" />
            {(['2024', '2025', '2026'] as const).map((yr) => (
              <button
                key={yr}
                type="button"
                onClick={() => onSelectTaxYear(yr)}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  state.taxRecord.selectedTaxYear === yr
                    ? 'bg-[#126A49] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-950 hover:bg-slate-50'
                }`}
              >
                TY {yr}
              </button>
            ))}
          </div>
        </div>

        {/* Config Notes */}
        <p className="text-[11px] text-emerald-900 font-semibold bg-white/95 px-3 py-1.5 rounded-xl border border-emerald-100">
          {isUrdu ? activeYearConfig.notesUr : activeYearConfig.notesEn}
        </p>
      </div>

      {/* Mandatory Legal Disclaimer Banner */}
      <div className="p-4 bg-amber-50/80 border-b border-amber-200/50 flex items-start gap-3 text-amber-900 -mx-4 mb-2">
        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-xs font-medium space-y-1">
          <p className="font-bold text-amber-950">
            {isUrdu ? 'ضروری قانونی اطلاع (FBR Disclaimer):' : 'Important FBR Filing Disclaimer:'}
          </p>
          <p>
            {isUrdu
              ? 'یہ ایپلیکیشن آپ کے دکان کے ریکارڈز کو FBR IRIS کے ضروری کوڈز کی مطابق ترتیب دیتی ہے۔ یہ ایپ خودکار جمع آوری نہیں کرتی۔ FBR IRIS پورٹل پر حتمی فارم داخل کرنے سے پہلے ٹیکس وکیل یا اکاؤنٹنٹ سے تمام ارقام کی تصدیق لازمی کرائیں۔'
              : 'This app organizes your store records into standard FBR IRIS field mappings. It does not file directly with FBR IRIS. Final returns must be reviewed by the taxpayer or a tax advisor before filing.'}
          </p>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex items-center gap-4 overflow-x-auto border-b border-slate-200 pb-2 -mx-4 px-4">
        {[
          { id: 'SUMMARY', en: 'Tax Return Summary', ur: 'ریٹرن کا خلاصہ' },
          { id: 'IRIS_MAPPINGS', en: 'FBR Field Mappings', ur: 'FBR فیلڈ کوڈز' },
          { id: 'WEALTH_RECON', en: 'Wealth Reconciliation', ur: 'ویلتھ مطابقت' },
          { id: 'WITHHOLDING_TAX', en: 'Tax Credits & PSID', ur: 'کٹا ہوا ٹیکس / PSID' },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTab(t.id as any)}
            className={`pb-1 text-xs font-bold transition-all shrink-0 cursor-pointer border-b-2 ${
              activeTab === t.id
                ? 'border-[#126A49] text-[#126A49]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {isUrdu ? t.ur : t.en}
          </button>
        ))}
      </div>

      {/* Warnings & Inconsistency Alert Box */}
      {summary.warnings.length > 0 && (
        <div className="space-y-2 -mx-4">
          {summary.warnings.map((w, idx) => (
            <div
              key={idx}
              className={`p-3.5 text-xs font-semibold flex items-start gap-2.5 ${
                w.severity === 'critical'
                  ? 'bg-rose-50/80 text-rose-900'
                  : 'bg-amber-50/80 text-amber-900'
              }`}
            >
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{isUrdu ? w.ur : w.en}</span>
            </div>
          ))}
        </div>
      )}

      {/* Tab 1: Tax Return Summary */}
      {activeTab === 'SUMMARY' && (
        <div className="space-y-4">
          <div className="py-4 space-y-3">
            <h3 className="font-bold text-sm text-slate-900">
              {isUrdu ? 'کاروباری آمدن و منافع کا خلاصہ (Income Statement)' : 'Business Revenue & Profit Statement'}
            </h3>

            <div className="space-y-2 text-xs divide-y divide-slate-100">
              <div className="pt-2 flex justify-between">
                <span className="font-bold text-slate-600">{isUrdu ? 'کل سالانہ سیلز / ٹرن اوور:' : 'Gross Annual Sales / Turnover:'}</span>
                <span className="font-bold text-slate-900">{formatMoney(summary.sales)}</span>
              </div>

              <div className="pt-2 flex justify-between">
                <span className="font-bold text-slate-600">{isUrdu ? 'تجارتی لاگت (COGS):' : 'Cost of Goods Sold (COGS):'}</span>
                <span className="font-bold text-slate-900">{formatFinancialValue(summary.estimatedCogs, summary.isStockDataMissing, isUrdu)}</span>
              </div>

              <div className="pt-2 flex justify-between">
                <span className="font-bold text-slate-600">{isUrdu ? 'دکان کے دفتری اخراجات:' : 'Shop Operating Expenses:'}</span>
                <span className="font-bold text-rose-700">{formatMoney(summary.directExpenses)}</span>
              </div>

              <div className="pt-2 flex justify-between text-sm font-bold bg-emerald-50 p-2.5 rounded-xl text-[#126A49]">
                <span>{isUrdu ? 'خالص قابلِ ٹیکس منافع (Net Profit):' : 'Net Business Income / Profit:'}</span>
                <span>{formatFinancialValue(summary.netProfit, summary.isStockDataMissing, isUrdu)}</span>
              </div>
            </div>
          </div>

          <div className="py-4 space-y-3 border-t border-slate-100">
            <h3 className="font-bold text-sm text-slate-900">
              {isUrdu ? 'کل اثاثے اور واجبات (Wealth Summary)' : 'Total Net Wealth Summary'}
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 bg-slate-50 rounded-2xl">
                <span className="text-[10px] font-bold text-slate-500 uppercase">{isUrdu ? 'کل کاروباری اثاثے' : 'Total Business Assets'}</span>
                <p className="text-sm font-bold text-slate-900 mt-1">{formatMoney(summary.totalBusinessAssets)}</p>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl">
                <span className="text-[10px] font-bold text-slate-500 uppercase">{isUrdu ? 'کل ذاتی جائداد' : 'Personal Assets'}</span>
                <p className="text-sm font-bold text-slate-900 mt-1">{formatMoney(summary.personalAssetValue)}</p>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl">
                <span className="text-[10px] font-bold text-slate-500 uppercase">{isUrdu ? 'کل قرضے و واجبات' : 'Total Liabilities'}</span>
                <p className="text-sm font-bold text-rose-700 mt-1">{formatMoney(summary.totalLiabilities)}</p>
              </div>

              <div className="p-4 bg-emerald-50 rounded-2xl">
                <span className="text-[10px] font-bold text-emerald-800 uppercase">{isUrdu ? 'خالص اثاثے (Net Worth)' : 'Net Worth'}</span>
                <p className="text-sm font-bold text-[#126A49] mt-1">{formatMoney(summary.netWorth)}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: FBR Field Mappings */}
      {activeTab === 'IRIS_MAPPINGS' && (
        <div className="py-4 space-y-4">
          <h3 className="font-bold text-sm text-slate-900">
            {isUrdu ? 'FBR IRIS فارم کے کوڈز اور فارمولہ' : 'FBR IRIS Portal Code Mappings'}
          </h3>

          <div className="divide-y divide-slate-100">
            {summary.mappings.map((m) => (
              <div key={m.irisCode} className="py-3 flex items-center justify-between gap-3 text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-emerald-50 text-[#126A49] font-mono font-bold text-[11px] rounded-md border border-emerald-100">
                      Code {m.irisCode}
                    </span>
                    <span className="font-bold text-slate-900">
                      {isUrdu ? m.fieldTitleUr : m.fieldTitleEn}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">{m.sectionReference}</p>
                </div>

                <span className="font-bold text-slate-900 text-sm">{formatMoney(m.calculatedValue)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Wealth Reconciliation */}
      {activeTab === 'WEALTH_RECON' && (
        <div className="py-4 space-y-4">
          <h3 className="font-bold text-sm text-slate-900">
            {isUrdu ? 'ویلتھ اسٹیٹمنٹ مطابقت کا حساب (Wealth Reconciliation Equation)' : 'Wealth Statement Reconciliation Equation'}
          </h3>

          <div className="p-4 bg-slate-50 rounded-2xl text-xs space-y-3">
            <div className="flex justify-between">
              <span className="text-slate-600 font-semibold">{isUrdu ? 'کاروباری اور دیگر کل آمدن:' : 'Total Annual Income (Business + Other):'}</span>
              <span className="font-bold text-slate-900">{formatMoney(summary.totalIncomeForYear)}</span>
            </div>

            <div className="flex justify-between text-rose-700">
              <span className="font-semibold">{isUrdu ? 'منہا: کل ذاتی و گھریلو اخراجات:' : 'Less: Total Household Outflows:'}</span>
              <span className="font-bold">-{formatMoney(summary.totalHouseholdExpenseSum)}</span>
            </div>

            <div className="flex justify-between text-rose-700">
              <span className="font-semibold">{isUrdu ? 'منہا: کل ادا شدہ ٹیکس:' : 'Less: Total Taxes Paid:'}</span>
              <span className="font-bold">-{formatMoney(summary.totalTaxesPaid)}</span>
            </div>

            <div className="pt-2 border-t font-bold flex justify-between text-slate-900">
              <span>{isUrdu ? 'متوقع سالانہ اضافہ اثاثہ جات:' : 'Expected Net Wealth Accumulation:'}</span>
              <span>{formatMoney(summary.netWealthInflow)}</span>
            </div>
          </div>

          <div className={`p-4 rounded-2xl ${Math.abs(summary.unexplainedDifference) < 50000 ? 'bg-emerald-50 text-emerald-950' : 'bg-amber-50 text-amber-950'}`}>
            <p className="text-xs font-bold uppercase">{isUrdu ? 'مطابقت کا فرق (Unexplained Difference):' : 'Reconciliation Discrepancy:'}</p>
            <p className="text-lg font-bold mt-0.5">{formatMoney(summary.unexplainedDifference)}</p>
            <p className="text-[11px] font-medium mt-1">
              {Math.abs(summary.unexplainedDifference) < 50000
                ? isUrdu
                  ? 'مبارک ہو! آپ کا ویلتھ ریکارڈ FBR کے معیار کے بالکل نزدیک ہے۔'
                  : 'Reconciliation looks stable. Difference is within acceptable range.'
                : isUrdu
                ? 'توجہ فرمائیں: آمدن اور ذاتی خرچ کے فرق کو برابر کرنے کے لیے گھریلو اخراجات یا دیگر آمدن دوبارہ چیک کریں۔'
                : 'Adjust household expenses or verify personal drawings to eliminate the gap.'}
            </p>
          </div>
        </div>
      )}

      {/* Tab 4: Withholding Tax Credits */}
      {activeTab === 'WITHHOLDING_TAX' && (
        <div className="py-4 space-y-4">
          <h3 className="font-bold text-sm text-slate-900">
            {isUrdu ? 'ایڈوانس ٹیکس کٹوتی اور PSID ادا شدہ چالان' : 'Advance Tax Credits & PSID Payments'}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="p-4 bg-slate-50 rounded-2xl">
              <span className="font-bold text-slate-600 block">{isUrdu ? 'بجلی و فون بلوں پر کٹا ہوا ٹیکس:' : 'Utility Bills Tax Deductions:'}</span>
              <span className="text-base font-bold text-slate-900 mt-1 block">{formatMoney(state.taxRecord.utilityWithholding)}</span>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl">
              <span className="font-bold text-slate-600 block">{isUrdu ? 'بینک ٹرانزیکشنز ودیہولڈنگ ٹیکس:' : 'Bank Withholding Tax:'}</span>
              <span className="text-base font-bold text-slate-900 mt-1 block">{formatMoney(state.taxRecord.bankWithholding)}</span>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl">
              <span className="font-bold text-slate-600 block">{isUrdu ? 'گاڑی کا ٹوکن ٹیکس / پراپرٹی ٹیکس:' : 'Vehicle Token & Property Tax:'}</span>
              <span className="text-base font-bold text-slate-900 mt-1 block">{formatMoney(state.taxRecord.vehicleTax + state.taxRecord.propertyTax)}</span>
            </div>

            <div className="p-4 bg-emerald-50 rounded-2xl">
              <span className="font-bold text-emerald-900 block">{isUrdu ? 'PSID آن لائن ٹیکس چالان ادائیگی:' : 'PSID Paid Tax Receipts:'}</span>
              <span className="text-base font-bold text-[#126A49] mt-1 block">{formatMoney(state.taxRecord.psidPayments)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
