import React, { useState, useEffect } from 'react';
import { AppState, Screen } from '../types';
import { formatQuantity } from '../utils/format';
import {
  Bell,
  ArrowLeft,
  X,
  CheckCircle2,
  Inbox,
  AlertTriangle,
  Coins,
  Truck,
  Building2,
  Trash2
} from 'lucide-react';

interface NotificationsScreenProps {
  state: AppState;
  isUrdu: boolean;
  onBack: () => void;
  onNavigateScreen: (screen: Screen) => void;
}

interface AppNotification {
  id: string;
  textEn: string;
  textUr: string;
  emoji: string;
  bgColor: string;
  borderColor: string;
  emojiColor: string;
  type: 'LOW_STOCK' | 'HIGH_CREDIT' | 'SUPPLIER_DUE' | 'LOAN_DUE';
}

export const NotificationsScreen: React.FC<NotificationsScreenProps> = ({
  state,
  isUrdu,
  onBack,
  onNavigateScreen,
}) => {
  const [dismissedIds, setDismissedIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('my_shop_dismissed_notifs');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  // Sync back to local storage and trigger navbar updates
  const handleDismiss = (id: string) => {
    const updated = [...dismissedIds, id];
    setDismissedIds(updated);
    localStorage.setItem('my_shop_dismissed_notifs', JSON.stringify(updated));
    // Dispatch storage event to notify other components instantly
    window.dispatchEvent(new Event('storage'));
  };

  const handleMarkAllRead = () => {
    const allIds = activeNotifications.map((n) => n.id);
    const updated = Array.from(new Set([...dismissedIds, ...allIds]));
    setDismissedIds(updated);
    localStorage.setItem('my_shop_dismissed_notifs', JSON.stringify(updated));
    window.dispatchEvent(new Event('storage'));
  };

  const handleClearDismissedHistory = () => {
    setDismissedIds([]);
    localStorage.removeItem('my_shop_dismissed_notifs');
    window.dispatchEvent(new Event('storage'));
  };

  // Generate notifications dynamically from AppState
  const { inventory, customers, suppliers, loans } = state;

  const lowStockNotifs: AppNotification[] = inventory
    .filter((item) => item.quantity <= item.minStockAlert)
    .map((item) => ({
      id: `low_stock_${item.id}`,
      textEn: `Low Stock Alert: "${item.name}" has only ${formatQuantity(item.quantity, item.unit)} ${item.unit || 'units'} left!`,
      textUr: `کم اسٹاک الرٹ: "${item.name}" کے پاس صرف ${formatQuantity(item.quantity, item.unit)} ${item.unit || 'یونٹ'} باقی ہیں!`,
      emoji: '📦',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200/60',
      emojiColor: 'text-amber-600',
      type: 'LOW_STOCK',
    }));

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
      type: 'HIGH_CREDIT',
    }));

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
        type: 'SUPPLIER_DUE',
      };
    });

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
        type: 'LOAN_DUE',
      };
    });

  const allNotifications = [
    ...lowStockNotifs,
    ...highCreditNotifs,
    ...supplierDueNotifs,
    ...loanDueNotifs,
  ];

  const activeNotifications = allNotifications.filter((n) => !dismissedIds.includes(n.id));

  return (
    <div className="space-y-4 max-w-4xl mx-auto px-2 pb-16">
      {/* Back & Heading Row */}
      <div className="flex items-center justify-between gap-3 bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-bold text-slate-800 leading-tight flex items-center gap-2">
              <Bell className="w-5 h-5 text-[#126A49] shrink-0" />
              <span>{isUrdu ? 'تمام اہم اطلاعات و الرٹس' : 'Shop Alerts & Notifications'}</span>
            </h1>
            <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
              {isUrdu ? 'اسٹاک، بقایا جات، سپلائر اور لون یاد دہانیاں' : 'Live low stock warnings, Udhaar, and payments dues'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {activeNotifications.length > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl border border-rose-200 transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span className="hidden xs:inline">{isUrdu ? 'سب پڑھ لیں' : 'Clear All'}</span>
            </button>
          )}

          {dismissedIds.length > 0 && (
            <button
              type="button"
              onClick={handleClearDismissedHistory}
              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 rounded-xl transition-colors cursor-pointer border border-slate-200"
              title={isUrdu ? 'اطلاعات کی ہسٹری بحال کریں' : 'Restore notification history'}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Alerts Feed */}
      {activeNotifications.length > 0 ? (
        <div className="space-y-2.5">
          {activeNotifications.map((notif) => (
            <div
              key={notif.id}
              className={`p-3.5 sm:p-4 bg-white rounded-2xl border ${notif.borderColor} shadow-2xs hover:shadow-xs transition-all flex items-start gap-3 relative overflow-hidden`}
            >
              {/* Vertical Color Ribbon Indicator */}
              <div className={`absolute top-0 left-0 bottom-0 w-1 ${
                notif.type === 'LOW_STOCK' ? 'bg-amber-500' :
                notif.type === 'HIGH_CREDIT' ? 'bg-emerald-500' :
                notif.type === 'SUPPLIER_DUE' ? 'bg-rose-500' : 'bg-indigo-500'
              }`} />

              <div className={`w-9 h-9 rounded-xl ${notif.bgColor} flex items-center justify-center shrink-0 border border-slate-100 shadow-2xs text-lg`}>
                {notif.emoji}
              </div>

              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${
                    notif.type === 'LOW_STOCK' ? 'bg-amber-100 text-amber-800' :
                    notif.type === 'HIGH_CREDIT' ? 'bg-emerald-100 text-emerald-800' :
                    notif.type === 'SUPPLIER_DUE' ? 'bg-rose-100 text-rose-800' : 'bg-indigo-100 text-indigo-800'
                  }`}>
                    {notif.type === 'LOW_STOCK' && (isUrdu ? 'کم اسٹاک' : 'Low Stock')}
                    {notif.type === 'HIGH_CREDIT' && (isUrdu ? 'زیادہ ادھار' : 'High Udhaar')}
                    {notif.type === 'SUPPLIER_DUE' && (isUrdu ? 'سپلائر واجب الادا' : 'Supplier Due')}
                    {notif.type === 'LOAN_DUE' && (isUrdu ? 'قرضہ الرٹ' : 'Loan Due')}
                  </span>
                </div>
                <p className="text-xs sm:text-sm font-bold text-slate-800 leading-relaxed">
                  {isUrdu ? notif.textUr : notif.textEn}
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleDismiss(notif.id)}
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer shrink-0"
                title={isUrdu ? 'خارج کریں' : 'Dismiss Alert'}
              >
                <X className="w-4 h-4 stroke-[2.2]" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-10 text-center shadow-2xs space-y-4 max-w-md mx-auto">
          <div className="w-16 h-16 rounded-full bg-emerald-50 text-[#126A49] flex items-center justify-center mx-auto shadow-2xs border border-emerald-100">
            <Inbox className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-800">
              {isUrdu ? 'کوئی نئی نوٹیفکیشن نہیں ہے!' : 'All Caught Up!'}
            </h3>
            <p className="text-xs text-slate-500 font-medium px-4">
              {isUrdu
                ? 'آپ کی دکان کا سارا کھاتہ اور اسٹاک بالکل ٹھیک اور محفوظ ہے۔'
                : 'Your shop inventory, Udhaars, and loan repayments are fully in order.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigateScreen(Screen.DASHBOARD)}
            className="px-4 py-2 bg-[#126A49] hover:bg-[#0F8A5F] text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-xs"
          >
            {isUrdu ? 'واپس ہوم پیج' : 'Back to Dashboard'}
          </button>
        </div>
      )}
    </div>
  );
};
